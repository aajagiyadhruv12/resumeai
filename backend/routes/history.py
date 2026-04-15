from flask import Blueprint, request, jsonify
from services.firebase_service import firebase_service
import logging

history_bp = Blueprint('history', __name__)

@history_bp.route('/history', methods=['GET'])
def get_user_history():
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({"error": "user_id is required"}), 400
        history = firebase_service.get_history(user_id)
        logging.info(f"Fetched history for user: {user_id}")
        return jsonify(history), 200
    except Exception as e:
        logging.error(f"Route History Error: {e}")
        return jsonify({"error": "Failed to fetch user history"}), 500


@history_bp.route('/history/<doc_id>', methods=['DELETE'])
def delete_history(doc_id):
    try:
        firebase_service.delete_analysis(doc_id)
        return jsonify({"message": "Deleted successfully"}), 200
    except Exception as e:
        logging.error(f"Route Delete History Error: {e}")
        return jsonify({"error": "Failed to delete"}), 500
