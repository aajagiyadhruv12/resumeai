from flask import Blueprint, request, jsonify
from services.firebase_service import firebase_service
from utils.helpers import validate_file_extension, extract_text_from_file
import logging

upload_bp = Blueprint('upload', __name__)

@upload_bp.route('/upload', methods=['POST'])
def upload_resume():
    """
    Upload resume to Firebase Storage and extract its text.
    """
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
            
        file = request.files['file']
        user_id = request.form.get('user_id', 'anonymous')
        
        if file.filename == '':
            return jsonify({"error": "Empty filename"}), 400
            
        if not validate_file_extension(file.filename):
            return jsonify({"error": "Only PDF and DOCX files are allowed"}), 400

        # 1. Extract text first (More reliable stream state)
        resume_text = extract_text_from_file(file)
        
        if not resume_text:
            logging.error(f"Text extraction failed or returned empty for {file.filename}")
            return jsonify({"error": "Failed to extract text from resume. Please ensure the file contains selectable text and is not an image."}), 500

        # 2. Upload to Storage (Optional - don't crash if bucket is missing)
        public_url = None
        try:
            # Reset file pointer to beginning for upload
            file.seek(0)
            public_url = firebase_service.upload_file(file, f"{user_id}/{file.filename}")
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
