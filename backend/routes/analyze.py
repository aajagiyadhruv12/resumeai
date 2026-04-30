from flask import Blueprint, request, jsonify
from services.ai_service import ai_service
from services.firebase_service import firebase_service
import logging

analyze_bp = Blueprint('analyze', __name__)

@analyze_bp.route('/analyze', methods=['GET', 'POST'])
def analyze():
    if request.method == 'GET':
        return jsonify({
            "message": "The AI Analyze endpoint is active. Please use POST to submit your resume.",
            "example_payload": {
                "resume_text": "Your resume content here...",
                "target_role": "Software Engineer"
            }
        }), 200
    
    try:
        data = request.json
        resume_text = data.get('resume_text')
        target_role = data.get('target_role', 'Software Engineer')
        user_id = data.get('user_id', 'anonymous')
        filename = data.get('filename', 'resume')
        file_url = data.get('file_url', '')

        if not resume_text:
            return jsonify({"error": "Resume text is required"}), 400

        analysis_result = ai_service.analyze_resume(resume_text, target_role)
        if "error" in analysis_result:
            # Return 422 (Unprocessable Entity) for AI failures instead of 500
            return jsonify(analysis_result), 422

        try:
            firebase_service.save_analysis(user_id, analysis_result, resume_text, filename, file_url)
        except Exception as fe:
            logging.error(f"Failed to save analysis to Firebase (Analysis still returned): {fe}")

        logging.info(f"Analysis successful for user: {user_id}")
        return jsonify(analysis_result), 200
    except Exception as e:
        logging.error(f"Route Analyze Error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@analyze_bp.route('/generate', methods=['POST'])
def generate():
    """Generate an improved resume based on analysis."""
    try:
        data = request.json
        resume_text = data.get('resume_text')
        analysis = data.get('analysis')
        target_role = data.get('target_role', 'Software Engineer')

        if not resume_text or not analysis:
            return jsonify({"error": "resume_text and analysis are required"}), 400

        result = ai_service.generate_improved_resume(resume_text, analysis, target_role)
        if "error" in result:
            return jsonify(result), 422
        return jsonify(result), 200
    except Exception as e:
        logging.error(f"Route Generate Error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@analyze_bp.route('/regenerate', methods=['POST'])
def regenerate():
    """Re-analyze resume with custom user improvements applied."""
    try:
        data = request.json
        resume_text = data.get('resume_text')
        target_role = data.get('target_role', 'Software Engineer')
        custom_improvements = data.get('custom_improvements', '')
        user_id = data.get('user_id', 'anonymous')

        if not resume_text:
            return jsonify({"error": "resume_text is required"}), 400

        combined_text = f"{resume_text}\n\nUser Custom Improvements to apply:\n{custom_improvements}" if custom_improvements else resume_text
        analysis_result = ai_service.analyze_resume(combined_text, target_role)
        if "error" in analysis_result:
            return jsonify(analysis_result), 422

        firebase_service.save_analysis(user_id, analysis_result)
        return jsonify(analysis_result), 200
    except Exception as e:
        logging.error(f"Route Regenerate Error: {e}")
        return jsonify({"error": "Internal server error"}), 500
