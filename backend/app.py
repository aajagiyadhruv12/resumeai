from flask import Flask, jsonify, request, make_response
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

# CORS configuration — one source of truth shared by flask-cors and the
# explicit preflight handler below, so the two can never drift apart.
ALLOWED_ORIGINS = [
    "https://airesumer.qzz.io",       # production frontend
    "http://localhost:3000",           # local dev
    "https://resumeai-fj7h.onrender.com",  # Render preview URL (also a valid origin)
]
ALLOWED_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
ALLOWED_HEADERS = ["Content-Type", "Authorization", "X-Requested-With", "Accept"]


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Enable CORS for all routes and allow common headers/methods.
    # supports_credentials stays False on purpose: authentication uses Bearer
    # JWTs in the Authorization header, NOT cookies, so no credentialed CORS is
    # needed (and combining credentials with wildcard origins is forbidden).
    CORS(app, resources={
        r"/*": {
            "origins": ALLOWED_ORIGINS,
            "methods": ALLOWED_METHODS,
            "allow_headers": ALLOWED_HEADERS,
            "supports_credentials": False,
            "expose_headers": ["Content-Type", "Authorization"],
        }
    }, supports_credentials=False)

    # Answer browser CORS preflight (OPTIONS) requests BEFORE routing.
    # This handles preflight requests for all routes, ensuring browsers can
    # make cross-origin requests from allowed origins.
    @app.before_request
    def handle_preflight():
        if request.method == 'OPTIONS':
            origin = request.headers.get('Origin', '')
            if origin in ALLOWED_ORIGINS:
                resp = make_response('', 204)
                resp.headers['Access-Control-Allow-Origin'] = origin
                resp.headers['Vary'] = 'Origin'
                resp.headers['Access-Control-Allow-Methods'] = ', '.join(ALLOWED_METHODS)
                resp.headers['Access-Control-Allow-Headers'] = ', '.join(ALLOWED_HEADERS)
                resp.headers['Access-Control-Max-Age'] = '86400'
                return resp
        return None

    # Belt-and-braces: force the CORS header onto EVERY app-level response
    # (including error-handler 500s, 404/405 responses, etc.) for allowed
    # origins. flask-cors normally adds this via its after_request hook, but
    # this guarantees no response the app itself produces can ever be
    # misreported by the browser as a "CORS policy" error.
    #
    # IMPORTANT: This must run for ALL responses, including those from error
    # handlers and exception-catching route code. We use a high priority (-1) to
    # ensure this runs AFTER flask-cors but BEFORE any other after_request
    # handlers that might modify the response.
    @app.after_request
    def add_cors_headers(resp):
        origin = request.headers.get('Origin', '')
        if origin in ALLOWED_ORIGINS:
            # Always set the exact origin (never wildcard) for credentialed requests
            resp.headers['Access-Control-Allow-Origin'] = origin
            resp.headers['Vary'] = 'Origin'
            # Also ensure the allowed methods and headers are present on preflight
            if request.method == 'OPTIONS':
                resp.headers['Access-Control-Allow-Methods'] = ', '.join(ALLOWED_METHODS)
                resp.headers['Access-Control-Allow-Headers'] = ', '.join(ALLOWED_HEADERS)
                resp.headers['Access-Control-Max-Age'] = '86400'
        return resp
    
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

    # Basic Health Check (server root — used by the frontend warm-up ping and
    # the keep-alive workflow)
    @app.route('/health', methods=['GET'])
    def health():
        return jsonify({"status": "healthy"}), 200

    # Lightweight health check under the API prefix too. Cheap: no AI calls,
    # no DB queries — just a liveness signal for load balancers / monitors.
    @app.route('/api/health', methods=['GET'])
    def api_health():
        return jsonify({"status": "ok"}), 200

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
            # Use make_response to ensure the after_request hook runs and adds CORS headers
            from flask import make_response
            resp = make_response(jsonify(payload), e.code)
            # Explicitly add CORS headers here as a fallback in case after_request doesn't run
            origin = request.headers.get('Origin', '')
            if origin in ALLOWED_ORIGINS:
                resp.headers['Access-Control-Allow-Origin'] = origin
                resp.headers['Vary'] = 'Origin'
            return resp

        error_details = traceback.format_exc()
        logging.error(f"Unhandled Exception:\n{error_details}")
        # Use make_response to ensure the after_request hook runs and adds CORS headers
        from flask import make_response
        resp = make_response(jsonify({
            "error": "Internal server error",
            "message": str(e),
            "traceback": error_details if Config.DEBUG else "Set FLASK_DEBUG=True in .env for details"
        }), 500)
        # Explicitly add CORS headers here as a fallback in case after_request doesn't run
        origin = request.headers.get('Origin', '')
        if origin in ALLOWED_ORIGINS:
            resp.headers['Access-Control-Allow-Origin'] = origin
            resp.headers['Vary'] = 'Origin'
        return resp

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
