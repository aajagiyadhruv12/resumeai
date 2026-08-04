from flask import Blueprint, request, jsonify
from services.firebase_service import firebase_service
from utils.helpers import validate_file_extension, extract_text_from_file
from utils.auth import get_current_user
import logging
import os

upload_bp = Blueprint('upload', __name__)

# Reject oversized uploads before any parsing work (10 MB is generous for resumes)
MAX_FILE_SIZE = 10 * 1024 * 1024


@upload_bp.route('/upload', methods=['POST'])
def upload_resume():
    """
    Upload resume to Firebase Storage and extract its text.
    """
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file = request.files['file']
        current_user = get_current_user()
        user_id = current_user['uid'] if current_user else (request.form.get('user_id') or 'anonymous')

        if file.filename == '':
            return jsonify({"error": "Empty filename"}), 400

        if not validate_file_extension(file.filename):
            return jsonify({"error": "Only PDF and DOCX files are allowed"}), 400

        # Size checks — measure the stream so we never parse huge or empty files
        file.stream.seek(0, os.SEEK_END)
        size = file.stream.tell()
        file.stream.seek(0)
        if size > MAX_FILE_SIZE:
            return jsonify({"error": "File is too large. Maximum allowed size is 10 MB."}), 400
        if size == 0:
            return jsonify({"error": "The uploaded file is empty."}), 400

        # 1. Extract text first (More reliable stream state)
        resume_text = extract_text_from_file(file)

        if not resume_text:
            logging.error(f"Text extraction failed or returned empty for {file.filename}")
            return jsonify({"error": "Failed to extract text from resume. Please ensure the file contains selectable text and is not an image."}), 500

        # 2. Upload to Storage (Optional - don't crash if bucket is missing)
        # Sanitize the filename so it cannot escape the storage prefix (no path
        # separators or traversal sequences from a client-supplied name).
        safe_filename = os.path.basename(file.filename.replace('\\', '/'))
        public_url = None
        try:
            # Reset file pointer to beginning for upload
            file.seek(0)
            public_url = firebase_service.upload_file(file, f"{user_id}/{safe_filename}")
        except Exception as e:
            logging.warning(f"Firebase Storage Upload Failed (Analysis will still proceed): {e}")

        logging.info(f"Resume uploaded and text extracted for user: {user_id}")
        return jsonify({
            "message": "Upload successful",
            "url": public_url,
            "file_url": public_url,
            "resume_text": resume_text
        }), 200

    except Exception as e:
        logging.error(f"Route Upload Error: {e}")
        return jsonify({"error": "Failed to upload and parse resume"}), 500
