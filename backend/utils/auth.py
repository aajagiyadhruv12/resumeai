import logging

from flask import request


def get_current_user():
    """Extract and verify the Firebase ID token from the Authorization header.

    Returns a dict like {'uid': ..., 'email': ..., 'full_name': ...} for a valid
    token, or None when no/invalid token is supplied (callers fall back to the
    'anonymous' user). Never raises — auth failures degrade gracefully.
    """
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None

    token = auth_header[len('Bearer '):].strip()
    if not token:
        return None

    try:
        from firebase_admin import _apps
        if not _apps:
            logging.warning("get_current_user: Firebase Admin SDK not initialized")
            return None

        from firebase_admin import auth as firebase_auth
        decoded = firebase_auth.verify_id_token(token)
        return {
            'uid': decoded.get('uid'),
            'email': decoded.get('email', ''),
            'full_name': decoded.get('name', ''),
        }
    except Exception as e:
        logging.warning(f"get_current_user: token verification failed: {e}")
        return None
