from flask import Flask, jsonify
from flask_cors import CORS
from config.settings import Config
from routes.analyze import analyze_bp
from routes.upload import upload_bp
from routes.history import history_bp
from routes.admin import admin_bp
from routes.auth import auth_bp
import os
import logging

# Basic Logging Config
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Enable CORS for all routes and allow common headers/methods
    CORS(app, resources={
        r"/*": {
            "origins": ["https://airesumer.qzz.io", "http://localhost:3000", "https://resumeai-fj7h.onrender.com"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
            "supports_credentials": False
        }
    })
    
    # Register Blueprints
    app.register_blueprint(analyze_bp, url_prefix='/api')
    app.register_blueprint(upload_bp, url_prefix='/api')
    app.register_blueprint(history_bp, url_prefix='/api')
    app.register_blueprint(admin_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/api')
    
    # Root Redirect/Message
    @app.route('/', methods=['GET'])
    def index():
        # List every registered API rule so the root endpoint reflects what's
        # actually live in this build (the auth blueprint, for example, was
        # missing from earlier deployments because this list was hardcoded).
        api_rules = sorted(
            rule.rule
            for rule in app.url_map.iter_rules()
            if rule.rule.startswith('/api/') and 'GET' in (rule.methods or set())
        )
        return jsonify({
            "status": "online",
            "message": "AI Resume Analyzer Backend is running!",
            "endpoints": api_rules + ["/health"],
            "commit": os.environ.get("RENDER_GIT_COMMIT", "local")[:7]
        }), 200

    # Basic Health Check
    @app.route('/health', methods=['GET'])
    def health():
        return jsonify({"status": "healthy"}), 200

    # Global Error Handler
    @app.errorhandler(Exception)
    def handle_error(e):
        import traceback
        from werkzeug.exceptions import HTTPException

        # Handle HTTP exceptions (like 404, 405) specially
        if isinstance(e, HTTPException):
            payload = {
                "error": e.name,
                "message": e.description,
                "code": e.code,
            }
            # flask-cors adds the ACAO header on regular responses, but for
            # HTTP errors raised by the router (404, 405) the response object
            # bypasses the after_request hook in some setups. Build the JSON
            # response and then let flask-cors inject the headers via
            # make_response so the browser never sees a confusing CORS error
            # when the URL is wrong.
            from flask import make_response
            resp = make_response(jsonify(payload), e.code)
            return resp

        error_details = traceback.format_exc()
        logging.error(f"Unhandled Exception:\n{error_details}")
        return jsonify({
            "error": "Internal server error",
            "message": str(e),
            "traceback": error_details if Config.DEBUG else "Set FLASK_DEBUG=True in .env for details"
        }), 500

    return app

# Singleton app instance
try:
    app = create_app()
except Exception as e:
    import traceback
    logging.error(f"FATAL: Failed to create app: {e}")
    logging.error(traceback.format_exc())
    raise e

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
