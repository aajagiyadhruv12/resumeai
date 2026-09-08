from flask import Blueprint, jsonify
from services.firebase_service import firebase_service
from utils.auth import get_current_user
import logging

history_bp = Blueprint('history', __name__)

@history_bp.route('/history', methods=['GET'])
def get_user_history():
    try:
        # SECURITY: derive the user from the verified Firebase ID token.
        # The client-supplied user_id query param is intentionally ignored:
        # trusting it would let any caller read another user's analyses by
        # guessing user IDs. Only the authenticated user's own data is returned.
        current_user = get_current_user()
        if not current_user:
            from flask import make_response
            resp = make_response(jsonify({"error": "Unauthorized"}), 401)
            return resp
        user_id = current_user['uid']
        history = firebase_service.get_history(user_id)
        logging.info(f"Fetched history for user: {user_id}")
        from flask import make_response
        resp = make_response(jsonify(history), 200)
        return resp
    except Exception as e:
        logging.error(f"Route History Error: {e}")
        from flask import make_response
        resp = make_response(jsonify({"error": "Failed to fetch user history"}), 500)
        return resp


@history_bp.route('/history/<doc_id>', methods=['DELETE'])
def delete_history(doc_id):
    try:
        # SECURITY: only allow deleting an analysis that belongs to the
        # authenticated user. Ownership is verified server-side against the
        # Firebase ID token, so a user cannot delete another user's records.
        current_user = get_current_user()
        if not current_user:
            from flask import make_response
            resp = make_response(jsonify({"error": "Unauthorized"}), 401)
            return resp
        deleted = firebase_service.delete_analysis(doc_id, current_user['uid'])
        if not deleted:
            from flask import make_response
            resp = make_response(jsonify({"error": "Analysis not found or access denied"}), 404)
            return resp
        from flask import make_response
        resp = make_response(jsonify({"message": "Deleted successfully"}), 200)
        return resp
    except Exception as e:
        logging.error(f"Route Delete History Error: {e}")
        from flask import make_response
        resp = make_response(jsonify({"error": "Failed to delete"}), 500)
        return resp
