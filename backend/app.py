from flask import Flask, jsonify
from flask_cors import CORS
from config.settings import Config
from routes.analyze import analyze_bp
from routes.upload import upload_bp
from routes.history import history_bp
from routes.admin import admin_bp
import os
import logging

# Basic Logging Config
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Enable CORS for all origins
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # Register Blueprints
    app.register_blueprint(analyze_bp, url_prefix='/api')
    app.register_blueprint(upload_bp, url_prefix='/api')
    app.register_blueprint(history_bp, url_prefix='/api')
    app.register_blueprint(admin_bp, url_prefix='/api')
    
    # Root Redirect/Message
    @app.route('/', methods=['GET'])
    def index():
        return jsonify({
            "status": "online",
            "message": "AI Resume Analyzer Backend is running!",
            "endpoints": ["/api/analyze", "/api/upload", "/api/history", "/health"]
        }), 200

    # Basic Health Check
    @app.route('/health', methods=['GET'])
    def health():
        return jsonify({"status": "healthy"}), 200

    # Global Error Handler
    @app.errorhandler(Exception)
    def handle_error(e):
        import traceback
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
