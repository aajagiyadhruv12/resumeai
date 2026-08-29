import logging
import os
import time

from flask import request

# In-memory cache for tokeninfo results to avoid hitting Google's endpoint
# on every single request.  Keyed by the raw token string.
_tokeninfo_cache = {}
_TOKENINFO_TTL = 300  # 5 minutes


def _verify_via_tokeninfo(token):
    """Verify a Firebase ID token via Google's public tokeninfo endpoint.

    Used as a FALLBACK when the Firebase Admin SDK is not initialized
    (e.g. missing env vars on Render).  This is less secure than Admin SDK
    verification (the token is checked against Google's public endpoint
    rather than being cryptographically verified with the project's service
    account), but it is far better than returning 401 for every authenticated
    user.

    Returns a dict with uid/email/full_name on success, or None.
    """
    try:
        # Check cache first
        cached = _tokeninfo_cache.get(token)
        if cached and time.time() - cached['ts'] < _TOKENINFO_TTL:
            return cached['user']

        import httpx as _httpx
        resp = _httpx.get(
            f'https://oauth2.googleapis.com/tokeninfo?id_token={token}',
            timeout=5,
        )
        if resp.status_code == 200:
            data = resp.json()
            # tokeninfo returns 'sub' (the Firebase UID), 'email', 'name', etc.
            user = {
                'uid': data.get('sub', 'anonymous'),
                'email': data.get('email', ''),
                'full_name': data.get('name', ''),
                'role': 'user',
            }
            _tokeninfo_cache[token] = {'user': user, 'ts': time.time()}
            return user
    except Exception as e:
        logging.debug(f"_verify_via_tokeninfo failed: {e}")
    return None


def get_current_user():
    """Extract and verify the caller's identity from the Authorization header.

    Three verification strategies are tried in order so that the app works
    even when the Firebase Admin SDK is not configured:

      1. Firebase Admin SDK   (most secure — cryptographic verification)
      2. Google tokeninfo API (fallback when Admin SDK is unavailable)
      3. Admin JWT            (admin panel login)

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

    # 1) Firebase ID token via Admin SDK (most secure)
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
        logging.debug(f"get_current_user: Firebase Admin verification failed: {e}")

    # 2) Firebase ID token via Google tokeninfo (fallback when Admin SDK
    #    is not initialized — still validated by Google's public endpoint)
    fb_user = _verify_via_tokeninfo(token)
    if fb_user:
        return fb_user

    # 3) Admin JWT (issued by /api/admin/login, signed with ADMIN_JWT_SECRET).
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
        logging.debug(f"get_current_user: admin JWT verification failed: {e}")
        return None
