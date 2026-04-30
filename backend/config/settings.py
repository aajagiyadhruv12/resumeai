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
    
    # OpenAI Settings
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    
    # Gemini Settings (Keeping as fallback or primary if requested)
    GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
    
    # SambaNova Settings
    SAMBANOVA_API_KEY = os.getenv('SAMBANOVA_API_KEY')
    SAMBANOVA_BASE_URL = os.getenv('SAMBANOVA_BASE_URL', 'https://api.sambanova.ai/v1')
