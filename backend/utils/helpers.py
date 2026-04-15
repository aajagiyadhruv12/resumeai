import PyPDF2
import docx2txt
import io
import logging

def extract_text_from_file(file):
    """
    Extracts text from a PDF or DOCX file.
    """
    filename = file.filename.lower()
    try:
        if filename.endswith('.pdf'):
            reader = PyPDF2.PdfReader(file)
            text = ""
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
            return text.strip()
            
        elif filename.endswith('.docx'):
            # Save temporary file for docx2txt as it works better with paths
            import tempfile
            import os
            
            with tempfile.NamedTemporaryFile(delete=False, suffix='.docx') as tmp:
                file.save(tmp.name)
                text = docx2txt.process(tmp.name)
                tmp_path = tmp.name
            
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
            return text.strip()
            
        else:
            return None
    except Exception as e:
        logging.error(f"Text Extraction Error ({filename}): {e}")
        return None

def validate_file_extension(filename):
    """Validates if the file is a supported resume format."""
    ALLOWED_EXTENSIONS = {'pdf', 'docx'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
