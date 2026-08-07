import logging

from flask import request


def get_current_user():
    """Extract and verify the caller's identity from the Authorization header.

    Two token types are accepted so the SAME identity model drives every
    authenticated endpoint:

      1. Firebase ID token  -> a normal application user (role='user')
      2. Admin JWT          -> the site admin             (role='admin')

    Accepting the admin JWT here means the admin can use the normal app
    features (analyze, history, builder) with the admin identity directly —
    no separate Firebase account is required — and analyses the admin creates
    are stored under the ADMIN account, never 'anonymous' or another user.

    Returns a dict like {'uid': ..., 'email': ..., 'full_name': ..., 'role': ...}
    for a valid token, or None when no/invalid token is supplied (callers fall
    back to the 'anonymous' user). Never raises — auth failures degrade
    gracefully.
    """
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None

    token = auth_header[len('Bearer '):].strip()
    if not token:
        return None

    # 1) Firebase ID token (normal application users)
    try:
        from firebase_admin import _apps
        if _apps:
            from firebase_admin import auth as firebase_auth
            decoded = firebase_auth.verify_id_token(token)
            return {
                'uid': decoded.get('uid'),
                'email': decoded.get('email', ''),
                'full_name': decoded.get('name', ''),
                'role': 'user',
            }
    except Exception as e:
        # Not a Firebase token (or Firebase Admin not initialized) — fall
        # through and try the admin JWT below.
        logging.debug(f"get_current_user: Firebase verification failed: {e}")

    # 2) Admin JWT (issued by /api/admin/login, signed with ADMIN_JWT_SECRET).
    #    Grants the admin identity across the normal app endpoints. Imported
    #    lazily to avoid any import cycles (this module is imported by the
    #    analyze/history/auth blueprints).
    try:
        from routes.admin import ADMIN_JWT_SECRET
        import jwt
        payload = jwt.decode(token, ADMIN_JWT_SECRET, algorithms=['HS256'])
        return {
            'uid': 'admin',
            'email': payload.get('email', 'admin@resumeai.com'),
            'full_name': 'Admin',
            'role': 'admin',
        }
    except Exception as e:
        logging.warning(f"get_current_user: token verification failed: {e}")
        return None
