from flask import Blueprint, request, jsonify
import logging

from services.firebase_service import firebase_service  # noqa: F401 — ensures Firebase Admin is initialized
from utils.auth import get_current_user

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/auth/register', methods=['POST'])
def register():
    """Create a new Firebase Auth user (email/password) and return its profile."""
    data = request.json or {}
    full_name = (data.get('full_name') or '').strip()
    email = (data.get('email') or '').strip()
    password = data.get('password') or ''
    confirm_password = data.get('confirm_password')

    if confirm_password is not None and confirm_password != password:
        from flask import make_response
        resp = make_response(jsonify({'error': 'Passwords do not match.'}), 400)
        return resp
    if not full_name:
        from flask import make_response
        resp = make_response(jsonify({'error': 'Full name is required.'}), 400)
        return resp
    if not email or not password:
        from flask import make_response
        resp = make_response(jsonify({'error': 'Email and password are required.'}), 400)
        return resp
    if len(password) < 6:
        from flask import make_response
        resp = make_response(jsonify({'error': 'Password must be at least 6 characters long.'}), 400)
        return resp

    try:
        from firebase_admin import _apps
        if not _apps:
            from flask import make_response
            resp = make_response(jsonify({'error': 'Firebase is not configured on the server.'}), 503)
            return resp

        from firebase_admin import auth as firebase_auth
        user = firebase_auth.create_user(
            email=email,
            password=password,
            display_name=full_name or None,
        )
        logging.info(f"New user registered: {user.uid} ({email})")
        from flask import make_response
        resp = make_response(jsonify({
            'uid': user.uid,
            'email': user.email or email,
            'full_name': full_name,
        }), 201)
        return resp
    except ValueError as e:
        # Firebase Admin raises ValueError for malformed input (bad email,
        # too-short password, ...). That is the CALLER's mistake, not a server
        # fault: answer 400 with the actual reason so the signup form can show
        # it, instead of a 500 that reads as "the site is broken" and pushes the
        # frontend into its client-SDK fallback for an input it will also reject.
        msg = str(e)
        if 'email' in msg.lower():
            friendly = 'Please enter a valid email address.'
            field = 'email'
        elif 'password' in msg.lower():
            friendly = 'Password must be at least 6 characters long.'
            field = 'password'
        else:
            friendly = msg
            field = None
        logging.info(f"Register rejected (invalid input): {msg}")
        from flask import make_response
        body = {'error': friendly}
        if field:
            body['details'] = {field: friendly}
        resp = make_response(jsonify(body), 400)
        return resp
    except Exception as e:
        msg = str(e)
        if 'EMAIL_EXISTS' in msg or 'email-already-exists' in msg:
            from flask import make_response
            resp = make_response(jsonify({'error': 'An account with this email already exists.'}), 409)
            return resp
        # Identity Toolkit rejects some input only server-side (e.g. "a@b" parses
        # as an address but is not a valid email). Those arrive as
        # InvalidArgumentError, not ValueError — still a 400, not a 500.
        REST_INPUT_ERRORS = {
            'INVALID_EMAIL': ('Please enter a valid email address.', 'email'),
            'MISSING_EMAIL': ('Email is required.', 'email'),
            'WEAK_PASSWORD': ('Password must be at least 6 characters long.', 'password'),
            'INVALID_PASSWORD': ('Password must be at least 6 characters long.', 'password'),
            'MISSING_PASSWORD': ('Password is required.', 'password'),
        }
        for token, (friendly, field) in REST_INPUT_ERRORS.items():
            if token in msg:
                logging.info(f"Register rejected (invalid input): {msg}")
                from flask import make_response
                resp = make_response(
                    jsonify({'error': friendly, 'details': {field: friendly}}), 400
                )
                return resp
        logging.error(f"Register error: {e}")
        from flask import make_response
        resp = make_response(jsonify({'error': 'Registration failed. Please try again.'}), 500)
        return resp


@auth_bp.route('/auth/me', methods=['GET'])
def me():
    """Return the profile of the currently authenticated user (from Bearer token)."""
    user = get_current_user()
    if not user:
        from flask import make_response
        resp = make_response(jsonify({'error': 'Unauthorized'}), 401)
        return resp
    from flask import make_response
    resp = make_response(jsonify(user), 200)
    return resp
