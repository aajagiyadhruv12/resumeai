import React, { useState } from 'react';
import { apiService } from '../services/apiService';

const UploadForm = ({ onAnalysisComplete, setLoading, setError }) => {
  const [file, setFile] = useState(null);
  const [targetRole, setTargetRole] = useState('Software Engineer');
  const [uploadStatus, setUploadStatus] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    setIsSuccess(false);
    setUploadStatus('Uploading resume...');

    try {
      const uploadRes = await apiService.uploadResume(file);
      setUploadStatus('Upload successful! Done.');
      setIsSuccess(true);
      
      // Short delay for the "Done" message to be visible
      await new Promise(r => setTimeout(r, 800));
      
      setUploadStatus('Starting AI analysis...');
      const analysisRes = await apiService.analyzeResume(uploadRes.resume_text, targetRole, 'anonymous', file.name, uploadRes.file_url || '');
      
      onAnalysisComplete(analysisRes, uploadRes.resume_text, targetRole, file.name);
      setUploadStatus('');
      setIsSuccess(false);
    } catch (err) {
      setError(err.message);
      setUploadStatus('');
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-5 shadow-lg mb-5 fade-in">
      <h3 className="text-center mb-4">Start Your Analysis</h3>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="form-label text-uppercase small fw-bold text-muted">Target Job Role</label>
          <input 
            type="text" 
            className="form-control form-control-lg border-0 bg-light" 
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="e.g. Senior Product Manager"
            required
          />
        </div>
        <div className="mb-4">
          <label className="form-label text-uppercase small fw-bold text-muted">Resume Document</label>
          <div className={`upload-zone ${isSuccess ? 'border-success' : ''}`} onClick={() => document.getElementById('file-input').click()}>
            <i className={`bi ${isSuccess ? 'bi-check-circle-fill text-success' : 'bi-cloud-arrow-up text-primary'} display-4 mb-3 d-block`}></i>
            <span className={`fw-semibold ${isSuccess ? 'text-success' : ''}`}>
              {isSuccess ? "Upload Done!" : (file ? file.name : "Drag & drop or click to upload PDF/DOCX")}
            </span>
            <input 
              id="file-input"
              type="file" 
              className="d-none" 
              accept=".pdf,.docx"
              onChange={(e) => {
                setFile(e.target.files[0]);
                setIsSuccess(false);
              }}
            />
          </div>
        </div>
        <button type="submit" className={`btn ${isSuccess ? 'btn-success' : 'btn-primary'} w-100 btn-lg shadow-sm`} disabled={isSuccess}>
          {isSuccess ? "Upload Finished!" : "Analyze Profile"}
        </button>
        {uploadStatus && (
          <div className={`mt-3 text-center small fw-bold ${isSuccess ? 'text-success' : 'text-muted'}`}>
            <i className={`bi ${isSuccess ? 'bi-patch-check-fill' : 'bi-info-circle'} me-1`}></i> {uploadStatus}
          </div>
        )}
      </form>
    </div>
  );
};

export default UploadForm;
