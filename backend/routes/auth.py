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
        return jsonify({'error': 'Passwords do not match.'}), 400
    if not full_name:
        return jsonify({'error': 'Full name is required.'}), 400
    if not email or not password:
        return jsonify({'error': 'Email and password are required.'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters long.'}), 400

    try:
        from firebase_admin import _apps
        if not _apps:
            return jsonify({'error': 'Firebase is not configured on the server.'}), 503

        from firebase_admin import auth as firebase_auth
        user = firebase_auth.create_user(
            email=email,
            password=password,
            display_name=full_name or None,
        )
        logging.info(f"New user registered: {user.uid} ({email})")
        return jsonify({
            'uid': user.uid,
            'email': user.email or email,
            'full_name': full_name,
        }), 201
    except Exception as e:
        msg = str(e)
        if 'EMAIL_EXISTS' in msg or 'email-already-exists' in msg:
            return jsonify({'error': 'An account with this email already exists.'}), 409
        logging.error(f"Register error: {e}")
        return jsonify({'error': 'Registration failed. Please try again.'}), 500


@auth_bp.route('/auth/me', methods=['GET'])
def me():
    """Return the profile of the currently authenticated user (from Bearer token)."""
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    return jsonify(user), 200
