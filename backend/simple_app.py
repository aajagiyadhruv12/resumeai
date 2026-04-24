from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import logging

# Basic Logging Config
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

def create_app():
    app = Flask(__name__)
    
    # Enable CORS for all origins
    CORS(app, resources={
        r"/api/*": {
            "origins": "*",
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
            "supports_credentials": False
        }
    })
    
    # Root endpoint
    @app.route('/', methods=['GET'])
    def index():
        return jsonify({
            "status": "online",
            "message": "AI Resume Analyzer Backend is running!",
            "endpoints": ["/api/analyze", "/api/upload", "/api/history", "/health"]
        }), 200

    # Health Check
    @app.route('/health', methods=['GET'])
    def health():
        return jsonify({"status": "healthy"}), 200

    # Mock Admin Login
    @app.route('/api/admin/login', methods=['POST'])
    def admin_login():
        try:
            data = request.get_json()
            email = data.get('email', '')
            password = data.get('password', '')
            
            # Simple mock authentication
            if email == 'admin@resumeai.com' and password == 'admin123':
                return jsonify({
                    "token": "mock-token-12345",
                    "message": "Login successful",
                    "user": {
                        "email": email,
                        "username": data.get('username', 'admin')
                    }
                }), 200
            else:
                return jsonify({"error": "Invalid credentials"}), 401
                
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    # Mock Analyze Resume
    @app.route('/api/analyze', methods=['POST'])
    def analyze_resume():
        try:
            data = request.get_json()
            return jsonify({
                "analysis": {
                    "overall_score": 85,
                    "strengths": ["Good structure", "Relevant experience"],
                    "improvements": ["Add more quantifiable achievements", "Include skills section"],
                    "recommendations": ["Consider adding a summary section"]
                },
                "message": "Resume analyzed successfully"
            }), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    # Mock Upload Resume
    @app.route('/api/upload', methods=['POST'])
    def upload_resume():
        try:
            return jsonify({
                "message": "File uploaded successfully",
                "filename": "resume.pdf",
                "file_id": "mock-file-id-123"
            }), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    # Mock History
    @app.route('/api/history', methods=['GET'])
    def get_history():
        try:
            user_id = request.args.get('user_id', 'anonymous')
            return jsonify({
                "history": [
                    {
                        "id": "1",
                        "filename": "resume.pdf",
                        "date": "2024-01-15",
                        "score": 85
                    }
                ]
            }), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    return app

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
