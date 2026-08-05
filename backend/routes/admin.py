from flask import Blueprint, request, jsonify
from config.settings import Config
from services.firebase_service import firebase_service
import jwt
import datetime
import logging
import os

admin_bp = Blueprint('admin', __name__)

# Admin credentials: set ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_USERNAME in .env to override
ADMIN_EMAIL = os.getenv('ADMIN_EMAIL', 'admin@resumeai.com')
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'Admin@1234')
ADMIN_USERNAME = os.getenv('ADMIN_USERNAME', 'admin')
# Dedicated secret for signing admin JWTs. Falls back to SECRET_KEY, but a
# separate ADMIN_JWT_SECRET env var is strongly recommended because SECRET_KEY
# is committed in render.yaml and would otherwise let anyone forge an admin
# token without the password.
ADMIN_JWT_SECRET = os.getenv('ADMIN_JWT_SECRET', Config.SECRET_KEY)


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
    try:
        data = request.json
        email = data.get('email', '').strip()
        password = data.get('password', '').strip()
        username = data.get('username', '').strip()

        valid_user = (email == ADMIN_EMAIL or username == ADMIN_USERNAME)
        if not valid_user or password != ADMIN_PASSWORD:
            return jsonify({'error': 'Invalid username or password'}), 401

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
