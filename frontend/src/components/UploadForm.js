import React, { useState } from 'react';
import { apiService } from '../services/apiService';

const UploadForm = ({ onAnalysisComplete, setLoading, setError }) => {
  const [file, setFile] = useState(null);
  const [targetRole, setTargetRole] = useState('Software Engineer');
  const [uploadStatus, setUploadStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    setUploadStatus('Uploading resume...');

    try {
      const uploadRes = await apiService.uploadResume(file);
      setUploadStatus('Extracting text and starting AI analysis...');
      const analysisRes = await apiService.analyzeResume(uploadRes.resume_text, targetRole, 'anonymous', file.name, uploadRes.file_url || '');
      onAnalysisComplete(analysisRes, uploadRes.resume_text, targetRole, file.name);
      setUploadStatus('');
    } catch (err) {
      setError(err.message);
      setUploadStatus('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-4 shadow-sm mb-4">
      <h3>Analyze Your Resume</h3>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Target Job Role</label>
          <input
            type="text"
            className="form-control"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="e.g. Senior Frontend Developer"
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Upload Resume (PDF/DOCX)</label>
          <input
            type="file"
            className="form-control"
            accept=".pdf,.docx"
            onChange={(e) => setFile(e.target.files[0])}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary w-100">
          <i className="bi bi-search me-2"></i>Start Analysis
        </button>
        {uploadStatus && (
          <div className="mt-2 text-center text-muted small">
            <i className="bi bi-info-circle me-1"></i> {uploadStatus}
          </div>
        )}
      </form>
    </div>
  );
};

export default UploadForm;
