import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Flask Settings
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-key-123')
    DEBUG = os.getenv('FLASK_DEBUG', 'False') == 'True'
    
    # Firebase Settings
    FIREBASE_PROJECT_ID = os.getenv('FIREBASE_PROJECT_ID')
    FIREBASE_PRIVATE_KEY = os.getenv('FIREBASE_PRIVATE_KEY', '').replace('\\n', '\n')
    FIREBASE_CLIENT_EMAIL = os.getenv('FIREBASE_CLIENT_EMAIL')
    FIREBASE_STORAGE_BUCKET = os.getenv('FIREBASE_STORAGE_BUCKET', '')
    
    # Gemini Settings (primary AI provider)
    GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
    # Optional comma-separated override for the Gemini model ladder, e.g.
    # "gemini-3.6-flash,gemini-3.5-flash". Defaults are set in AIService.
    GEMINI_MODEL = os.getenv('GEMINI_MODEL', '')
    
    # Groq API key (fallback AI provider)
    GROQ_API_KEY = os.getenv('GROQ_API_KEY')
