import pypdf
import pdfplumber
import pypdfium2 as pdfium
import docx2txt
import io
import os
import tempfile
import logging
from pdfminer.high_level import extract_text as pdfminer_extract

def extract_text_from_file(file):
    """
    Extracts text from a PDF or DOCX file with a multi-engine fallback system.
    Handles stream isolation to ensure all libraries get a fresh look at the data.
    """
    filename = file.filename.lower()
    try:
        # 1. Capture file into memory once (most reliable approach)
        file.seek(0, os.SEEK_END)
        size = file.tell()
        file.seek(0)
        
        if size == 0:
            logging.error(f"Zero byte file detected: {filename}")
            return None
            
        logging.info(f"Extracting {filename} ({size} bytes)")
        raw_data = file.read()
        
        if filename.endswith('.pdf'):
            text = ""
            
            MIN_CHARS = 20

            # Engine 1: pypdfium2
            try:
                logging.info(f"Attempting Engine 1 (pypdfium2) for {filename}")
                pdf = pdfium.PdfDocument(raw_data)
                for page in pdf:
                    tp = page.get_textpage()
                    text += tp.get_text_bounded() + "\n"
                if len(text.strip()) > MIN_CHARS:
                    logging.info(f"Engine 1 success: {len(text.strip())} chars found.")
                    return text.strip()
            except Exception as e:
                logging.warning(f"Engine 1 failed: {e}")

            # Engine 2: pdfplumber
            try:
                logging.info(f"Attempting Engine 2 (pdfplumber) for {filename}")
                with pdfplumber.open(io.BytesIO(raw_data)) as pdf:
                    plumber_text = ""
                    for page in pdf.pages:
                        extracted = page.extract_text()
                        if extracted:
                            plumber_text += extracted + "\n"
                    if len(plumber_text.strip()) > MIN_CHARS:
                        logging.info(f"Engine 2 success: {len(plumber_text.strip())} chars found.")
                        return plumber_text.strip()
            except Exception as e:
                logging.warning(f"Engine 2 failed: {e}")

            # Engine 3: pypdf
            try:
                logging.info(f"Attempting Engine 3 (pypdf) for {filename}")
                reader = pypdf.PdfReader(io.BytesIO(raw_data))
                pypdf_text = ""
                for page in reader.pages:
                    extracted = page.extract_text()
                    if extracted:
                        pypdf_text += extracted + "\n"
                if len(pypdf_text.strip()) > MIN_CHARS:
                    logging.info(f"Engine 3 success: {len(pypdf_text.strip())} chars found.")
                    return pypdf_text.strip()
            except Exception as e:
                logging.warning(f"Engine 3 failed: {e}")

            # Engine 4: pdfminer.six (best for complex encodings and font-embedded PDFs)
            try:
                logging.info(f"Attempting Engine 4 (pdfminer) for {filename}")
                miner_text = pdfminer_extract(io.BytesIO(raw_data))
                if miner_text and len(miner_text.strip()) > MIN_CHARS:
                    logging.info(f"Engine 4 success: {len(miner_text.strip())} chars found.")
                    return miner_text.strip()
            except Exception as e:
                logging.warning(f"Engine 4 failed: {e}")

            final_text = text.strip()
            if not final_text:
                logging.error(f"All engines failed for {filename}. Likely a scanned image PDF with no text layer.")
            return final_text if final_text else None
            
        elif filename.endswith('.docx'):
            logging.info(f"Extracting DOCX: {filename}")
            # Use temp file for docx2txt (it's more reliable with binary file streams)
            fd, tmp_path = tempfile.mkstemp(suffix='.docx')
            try:
                with os.fdopen(fd, 'wb') as tmp:
                    tmp.write(raw_data)
                
                text = docx2txt.process(tmp_path)
                final_text = text.strip() if text else ""
                
                if final_text:
                    logging.info(f"DOCX Success: {len(final_text)} chars.")
                return final_text if final_text else None
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
            
        return None
    except Exception as e:
        logging.error(f"Critical Extraction Error ({filename}): {str(e)}")
        return None

def validate_file_extension(filename):
    """Validates if the file is a supported resume format."""
    ALLOWED_EXTENSIONS = {'pdf', 'docx'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
