from flask import Blueprint, request, jsonify
from services.ai_service import ai_service
from services.firebase_service import firebase_service
import logging
import hashlib
import time

analyze_bp = Blueprint('analyze', __name__)

# Simple in-memory cache for resume analysis (cache for 1 hour)
# Format: {cache_key: {"result": data, "timestamp": time}}
analysis_cache = {}
CACHE_TTL = 3600  # 1 hour

def _get_cache_key(resume_text, target_role):
    """Generate a cache key from resume text and target role."""
    combined = f"{resume_text[:500]}:{target_role}"  # Use first 500 chars for speed
    return hashlib.md5(combined.encode()).hexdigest()

def _get_cached_result(cache_key):
    """Get cached result if still valid."""
    if cache_key in analysis_cache:
        cached = analysis_cache[cache_key]
        if time.time() - cached["timestamp"] < CACHE_TTL:
            return cached["result"]
        else:
            del analysis_cache[cache_key]
    return None

def _set_cached_result(cache_key, result):
    """Cache the result."""
    analysis_cache[cache_key] = {"result": result, "timestamp": time.time()}

@analyze_bp.route('/status', methods=['GET'])
def ai_status():
    """Report which AI providers are configured (no secrets) — for debugging deployments."""
    return jsonify({
        "gemini_configured": ai_service._gemini_ready,
        "openai_configured": ai_service._openai_ready,
        "sambanova_configured": ai_service._sambanova_ready,
        "version": "2026-07-24"
    }), 200


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
        use_cache = data.get('use_cache', True)  # Cache by default

        if not resume_text:
            return jsonify({"error": "Resume text is required"}), 400

        # Check cache first
        cache_key = _get_cache_key(resume_text, target_role)
        if use_cache:
            cached_result = _get_cached_result(cache_key)
            if cached_result:
                logging.info(f"Returning cached analysis for key: {cache_key[:8]}...")
                return jsonify(cached_result), 200

        analysis_result = ai_service.analyze_resume(resume_text, target_role)
        # Only return 422 if there's an actual error string (not None/empty)
        if analysis_result.get("error"):
            return jsonify(analysis_result), 422

        # Cache the successful result
        if use_cache:
            _set_cached_result(cache_key, analysis_result)

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

        if not resume_text:
            return jsonify({"error": "resume_text is required"}), 400
        if analysis is None:
            analysis = {}

        result = ai_service.generate_improved_resume(resume_text, analysis, target_role)
        if result.get("error"):
            return jsonify(result), 422
        return jsonify(result), 200
    except Exception as e:
        logging.error(f"Route Generate Error: {e}")
        return jsonify({"error": "Internal server error"}), 500


@analyze_bp.route('/suggest', methods=['POST'])
def suggest():
    """Get AI suggestions for a specific resume section."""
    try:
        data = request.json
        section_type = data.get('section_type', 'summary')
        current_text = data.get('current_text', '')
        target_role = data.get('target_role', 'Software Engineer')
        resume_context = data.get('resume_context', '')

        if not current_text:
            return jsonify({"error": "current_text is required"}), 400

        result = ai_service.suggest_improvement(section_type, current_text, target_role, resume_context)
        if "error" in result and "improved_version" not in result:
            return jsonify(result), 422
        return jsonify(result), 200
    except Exception as e:
        logging.error(f"Route Suggest Error: {e}")
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
        if analysis_result.get("error"):
            return jsonify(analysis_result), 422

        firebase_service.save_analysis(user_id, analysis_result)
        return jsonify(analysis_result), 200
    except Exception as e:
        logging.error(f"Route Regenerate Error: {e}")
        return jsonify({"error": "Internal server error"}), 500
