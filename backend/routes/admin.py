from flask import Blueprint, request, jsonify
from config.settings import Config
import jwt
import datetime
import logging

admin_bp = Blueprint('admin', __name__)

# Admin credentials stored in .env
ADMIN_EMAIL = 'admin@resumeai.com'
ADMIN_PASSWORD = 'Admin@1234'

@admin_bp.route('/admin/login', methods=['POST'])
def admin_login():
    try:
        data = request.json
        email = data.get('email', '').strip()
        password = data.get('password', '').strip()

        if email != ADMIN_EMAIL or password != ADMIN_PASSWORD:
            return jsonify({'error': 'Invalid email or password'}), 401

        token = jwt.encode({
            'email': email,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, Config.SECRET_KEY, algorithm='HS256')

        logging.info(f'Admin login successful: {email}')
        return jsonify({'token': token, 'email': email}), 200

    except Exception as e:
        logging.error(f'Admin login error: {e}')
        return jsonify({'error': 'Login failed'}), 500
