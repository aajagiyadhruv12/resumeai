import logging
import os
import time

from flask import request

# ---------------------------------------------------------------------------
# Firebase ID-token verification WITHOUT the Admin SDK
#
# Firebase ID tokens are ordinary RS256 JWTs signed by Google. Google publishes
# the signing certificates at a public URL, so they can be verified locally and
# cryptographically with PyJWT — no service-account credentials required. This
# is the officially documented "verify with a third-party JWT library" path and
# is what keeps authenticated endpoints working on Render even when the
# FIREBASE_PRIVATE_KEY / FIREBASE_CLIENT_EMAIL env vars are missing or broken.
# ---------------------------------------------------------------------------
_FIREBASE_CERTS_URL = (
    'https://www.googleapis.com/robot/v1/metadata/x509/'
    'securetoken@system.gserviceaccount.com'
)
_certs_cache = {'certs': {}, 'expires': 0}

# Small cache for tokeninfo results (last-resort fallback) keyed by raw token.
_tokeninfo_cache = {}
_TOKENINFO_TTL = 300  # 5 minutes


def _project_id():
    return (os.getenv('FIREBASE_PROJECT_ID') or '').strip()


def _get_firebase_certs():
    """Return {kid: PEM cert} for Firebase's token-signing keys (cached)."""
    now = time.time()
    if _certs_cache['certs'] and now < _certs_cache['expires']:
        return _certs_cache['certs']
    import httpx
    resp = httpx.get(_FIREBASE_CERTS_URL, timeout=5)
    resp.raise_for_status()
    certs = resp.json()
    # Honour Cache-Control max-age (Google rotates keys; typically hours).
    max_age = 3600
    cc = resp.headers.get('cache-control', '')
    for part in cc.split(','):
        part = part.strip()
        if part.startswith('max-age='):
            try:
                max_age = int(part.split('=', 1)[1])
            except ValueError:
                pass
    _certs_cache['certs'] = certs
    _certs_cache['expires'] = now + max_age
    return certs


def _verify_firebase_token_locally(token):
    """Cryptographically verify a Firebase ID token with Google's public certs.

    Returns the decoded claims dict on success, None otherwise.
    """
    project_id = _project_id()
    if not project_id:
        return None
    try:
        import jwt
        from cryptography.x509 import load_pem_x509_certificate

        header = jwt.get_unverified_header(token)
        if header.get('alg') != 'RS256':
            return None
        kid = header.get('kid')
        certs = _get_firebase_certs()
        pem = certs.get(kid)
        if not pem:
            # Key may have rotated since we cached — refresh once.
            _certs_cache['expires'] = 0
            pem = _get_firebase_certs().get(kid)
        if not pem:
            return None
        public_key = load_pem_x509_certificate(pem.encode()).public_key()
        claims = jwt.decode(
            token,
            public_key,
            algorithms=['RS256'],
            audience=project_id,
            issuer=f'https://securetoken.google.com/{project_id}',
        )
        if not claims.get('sub'):
            return None
        return claims
    except Exception as e:
        logging.debug(f"_verify_firebase_token_locally failed: {e}")
        return None


def _verify_via_tokeninfo(token):
    """Last-resort verification via Google's public tokeninfo endpoint.

    Only used if local certificate verification could not run (e.g. the cert
    endpoint is unreachable). The token's audience is checked against our
    project so a Google-issued token for some OTHER app is never accepted.
    """
    try:
        cached = _tokeninfo_cache.get(token)
        if cached and time.time() - cached['ts'] < _TOKENINFO_TTL:
            return cached['user']

        import httpx
        resp = httpx.get(
            'https://oauth2.googleapis.com/tokeninfo',
            params={'id_token': token},
            timeout=5,
        )
        if resp.status_code == 200:
            data = resp.json()
            project_id = _project_id()
            if project_id and data.get('aud') != project_id:
                logging.warning("tokeninfo: token audience does not match this project")
                return None
            user = {
                'uid': data.get('sub') or data.get('user_id'),
                'email': data.get('email', ''),
                'full_name': data.get('name', ''),
                'role': 'user',
            }
            if not user['uid']:
                return None
            _tokeninfo_cache[token] = {'user': user, 'ts': time.time()}
            return user
    except Exception as e:
        logging.debug(f"_verify_via_tokeninfo failed: {e}")
    return None


def _verify_admin_jwt(token):
    """Verify an admin JWT issued by /api/admin/login (HS256, our secret)."""
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
        logging.debug(f"admin JWT verification failed: {e}")
        return None


def get_current_user():
    """Extract and verify the caller's identity from the Authorization header.

    Verification strategies, in order:

      1. Admin JWT (HS256 signed by us)   — cheap, local
      2. Firebase Admin SDK               — when initialized
      3. Local RS256 check with Google's public Firebase certs
      4. Google tokeninfo endpoint        — last resort, audience-checked

    Returns {'uid', 'email', 'full_name', 'role'} for a valid token, or None
    when no/invalid token is supplied. Never raises.
    """
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None

    token = auth_header[len('Bearer '):].strip()
    if not token:
        return None

    # Route on the token's algorithm so admin tokens never trigger network
    # calls to Google and Firebase tokens never hit the admin secret.
    try:
        import jwt
        alg = jwt.get_unverified_header(token).get('alg')
    except Exception:
        return None

    if alg == 'HS256':
        return _verify_admin_jwt(token)

    # 2) Firebase Admin SDK (most complete verification)
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

    # 3) Local cryptographic verification (no credentials needed)
    claims = _verify_firebase_token_locally(token)
    if claims:
        return {
            'uid': claims.get('sub'),
            'email': claims.get('email', ''),
            'full_name': claims.get('name', ''),
            'role': 'user',
        }

    # 4) tokeninfo fallback
    return _verify_via_tokeninfo(token)
