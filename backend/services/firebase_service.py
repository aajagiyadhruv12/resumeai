import firebase_admin
from firebase_admin import credentials, firestore, storage
from config.settings import Config
import logging

class FirebaseService:
    def __init__(self):
        self.db = None
        self.bucket = None
        self._initialize()

    def _initialize(self):
        try:
            if not firebase_admin._apps:
                # Use environment variables for production security
                if not Config.FIREBASE_PROJECT_ID or not Config.FIREBASE_PRIVATE_KEY:
                    logging.warning("Firebase credentials missing. Firestore/Storage disabled.")
                    return

                cred_dict = {
                    "type": "service_account",
                    "project_id": Config.FIREBASE_PROJECT_ID,
                    "private_key": Config.FIREBASE_PRIVATE_KEY,
                    "client_email": Config.FIREBASE_CLIENT_EMAIL,
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
                
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred, {
                    'storageBucket': Config.FIREBASE_STORAGE_BUCKET
                })
            
            self.db = firestore.client()
            self.bucket = storage.bucket()
            logging.info("Firebase Service Initialized Successfully")
        except Exception as e:
            logging.error(f"Firebase Initialization Error: {e}")
            self.db = None
            self.bucket = None

    def upload_file(self, file, filename):
        if not self.bucket: return None
        blob = self.bucket.blob(f"resumes/{filename}")
        blob.upload_from_file(file)
        blob.make_public()
        return blob.public_url

    def save_analysis(self, user_id, analysis_data, resume_text='', filename='', file_url=''):
        if not self.db: return None
        doc_ref = self.db.collection('analyses').document()
        data = {
            **analysis_data,
            'user_id': user_id,
            'resume_text': resume_text,
            'filename': filename,
            'file_url': file_url,
            'timestamp': firestore.SERVER_TIMESTAMP
        }
        doc_ref.set(data)
        return doc_ref.id

    def get_history(self, user_id):
        if not self.db: return []
        docs = self.db.collection('analyses')\
            .where('user_id', '==', user_id)\
            .order_by('timestamp', direction=firestore.Query.DESCENDING)\
            .stream()
        results = []
        for doc in docs:
            d = doc.to_dict()
            d['id'] = doc.id
            # Convert Firestore timestamp to string
            if d.get('timestamp'):
                d['timestamp'] = d['timestamp'].isoformat()
            results.append(d)
        return results

    def delete_analysis(self, doc_id):
        if not self.db: return
        self.db.collection('analyses').document(doc_id).delete()

# Singleton instance
firebase_service = FirebaseService()
