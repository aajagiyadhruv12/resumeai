from flask import Blueprint, request, jsonify
from config.settings import Config
from services.firebase_service import firebase_service
import jwt
import datetime
import logging
import os
import time

admin_bp = Blueprint('admin', __name__)

# Simple in-memory brute-force protection for the admin login, keyed by client
# IP. Adequate for Render's single-instance free tier; resets on success.
_LOGIN_ATTEMPTS = {}
LOGIN_MAX_ATTEMPTS = 5
LOGIN_LOCKOUT_SECONDS = 900  # 15 minutes

# Admin credentials: set ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_USERNAME in .env to override
ADMIN_EMAIL = os.getenv('ADMIN_EMAIL', 'admin@resumeai.com')
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'Admin@1234')
ADMIN_USERNAME = os.getenv('ADMIN_USERNAME', 'admin')
# Dedicated secret for signing admin JWTs. Falls back to SECRET_KEY, but a
# separate ADMIN_JWT_SECRET env var is strongly recommended because SECRET_KEY
# is committed in render.yaml and would otherwise let anyone forge an admin
# token without the password.
ADMIN_JWT_SECRET = os.getenv('ADMIN_JWT_SECRET', Config.SECRET_KEY)


def _client_ip():
    """Best-effort client IP, honoring Render's X-Forwarded-For header."""
    forwarded = request.headers.get('X-Forwarded-For', '')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.remote_addr or 'unknown'


def _login_rate_limited(ip):
    entry = _LOGIN_ATTEMPTS.get(ip)
    if not entry:
        return False
    if entry.get('locked_until') and time.time() < entry['locked_until']:
        return True
    if entry.get('locked_until'):
        del _LOGIN_ATTEMPTS[ip]
    return False


def _record_login_failure(ip):
    now = time.time()
    entry = _LOGIN_ATTEMPTS.setdefault(ip, {'count': 0, 'locked_until': 0})
    entry['count'] = entry.get('count', 0) + 1
    if entry['count'] >= LOGIN_MAX_ATTEMPTS:
        entry['locked_until'] = now + LOGIN_LOCKOUT_SECONDS
        entry['count'] = 0


def _clear_login_attempts(ip):
    _LOGIN_ATTEMPTS.pop(ip, None)


def _require_admin():
    """Verify the admin JWT from the Authorization header.

    Returns (admin_email, None) on success, or (None, (payload, status)) on
    failure so callers can short-circuit with a consistent 401 response.
    """
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None, (jsonify({'error': 'Unauthorized'}), 401)

    token = auth_header[len('Bearer '):].strip()
    if not token:
        return None, (jsonify({'error': 'Unauthorized'}), 401)

    try:
        payload = jwt.decode(token, ADMIN_JWT_SECRET, algorithms=['HS256'])
        return payload.get('email'), None
    except jwt.ExpiredSignatureError:
        return None, (jsonify({'error': 'Session expired. Please sign in again.'}), 401)
    except Exception as e:
        logging.warning(f"Admin token verification failed: {e}")
        return None, (jsonify({'error': 'Unauthorized'}), 401)


@admin_bp.route('/admin/login', methods=['POST'])
def admin_login():
    client_ip = _client_ip()
    if _login_rate_limited(client_ip):
        return jsonify({'error': 'Too many login attempts. Please wait 15 minutes and try again.'}), 429

    try:
        data = request.get_json(silent=True) or {}
        email = data.get('email', '').strip()
        password = data.get('password', '').strip()
        username = data.get('username', '').strip()

        valid_user = (email == ADMIN_EMAIL or username == ADMIN_USERNAME)
        if not valid_user or password != ADMIN_PASSWORD:
            _record_login_failure(client_ip)
            return jsonify({'error': 'Invalid username or password'}), 401

        _clear_login_attempts(client_ip)
        token = jwt.encode({
            'email': email,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, ADMIN_JWT_SECRET, algorithm='HS256')

        logging.info(f'Admin login successful: {email}')
        return jsonify({'token': token, 'email': email}), 200

    except Exception as e:
        logging.error(f'Admin login error: {e}')
        return jsonify({'error': 'Login failed'}), 500


@admin_bp.route('/admin/users', methods=['GET'])
def admin_users():
    """Admin only: overview of every user with their analysis stats."""
    admin_email, err = _require_admin()
    if err:
        return err

    analyses = firebase_service.get_all_analyses()

    # Group analyses per user and compute lightweight stats
    users = {}
    for a in analyses:
        uid = a.get('user_id') or 'anonymous'
        u = users.setdefault(uid, {
            'user_id': uid,
            'count': 0,
            'scores': [],
            'ats': [],
            'last_activity': None,
        })
        u['count'] += 1
        if isinstance(a.get('overall_score'), (int, float)):
            u['scores'].append(a['overall_score'])
        if isinstance(a.get('ats_score'), (int, float)):
            u['ats'].append(a['ats_score'])
        ts = a.get('timestamp')
        if ts and (u['last_activity'] is None or ts > u['last_activity']):
            u['last_activity'] = ts

    result = []
    for uid, u in users.items():
        result.append({
            'user_id': uid,
            'count': u['count'],
            'avg_overall': round(sum(u['scores']) / len(u['scores'])) if u['scores'] else None,
            'avg_ats': round(sum(u['ats']) / len(u['ats'])) if u['ats'] else None,
            'last_activity': u['last_activity'],
        })
    result.sort(key=lambda x: x['count'], reverse=True)

    logging.info(f"Admin {admin_email} fetched user overview ({len(result)} users)")
    return jsonify({'users': result}), 200


@admin_bp.route('/admin/analyses', methods=['GET'])
def admin_analyses():
    """Admin only: every analysis document across all users, full details."""
    admin_email, err = _require_admin()
    if err:
        return err

    analyses = firebase_service.get_all_analyses()
    logging.info(f"Admin {admin_email} fetched all analyses ({len(analyses)} docs)")
    return jsonify({'analyses': analyses}), 200
