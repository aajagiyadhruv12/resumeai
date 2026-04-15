import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

const USER_ID = 'anonymous';

const HistoryPanel = ({ onLoadAnalysis }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiService.getHistory(USER_ID);
      setHistory(data);
    } catch (err) {
      setError('Backend is offline. Please start the backend server and refresh.');
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (docId) => {
    setDeletingId(docId);
    try {
      await apiService.deleteHistory(docId);
      setHistory(prev => prev.filter(h => h.id !== docId));
    } catch (err) {
      setError('Failed to delete entry.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleLoad = (entry) => {
    onLoadAnalysis(entry, entry.resume_text || '', entry.target_role || 'Software Engineer', entry.filename || '');
  };

  const formatDate = (ts) => {
    if (!ts) return 'Unknown date';
    try { return new Date(ts).toLocaleString(); } catch { return ts; }
  };

  const getScoreColor = (score) => {
    if (score >= 75) return 'success';
    if (score >= 50) return 'warning';
    return 'danger';
  };

  if (loading) return (
    <div className="text-center py-5">
      <div className="spinner-border text-primary" role="status"></div>
      <p className="mt-3 text-muted">Loading history...</p>
    </div>
  );

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="fw-bold mb-0"><i className="bi bi-clock-history me-2"></i>Resume History</h4>
        <button className="btn btn-outline-secondary btn-sm" onClick={fetchHistory}>
          <i className="bi bi-arrow-clockwise me-1"></i>Refresh
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {history.length === 0 ? (
        <div className="text-center py-5 card">
          <i className="bi bi-inbox display-1 text-muted"></i>
          <p className="text-muted mt-3">No saved resumes yet. Analyze a resume to save it here.</p>
        </div>
      ) : (
        <div className="row g-3">
          {history.map((entry) => (
            <div key={entry.id} className="col-12">
              <div className="card shadow-sm p-3">
                <div className="d-flex justify-content-between align-items-start">
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <i className="bi bi-file-earmark-text text-primary fs-5"></i>
                      <span className="fw-semibold">{entry.filename || 'Resume'}</span>
                      <span className="badge bg-secondary">{entry.target_role || 'General'}</span>
                      {entry.file_url && (
                        <a href={entry.file_url} target="_blank" rel="noreferrer" className="badge bg-info text-decoration-none">
                          <i className="bi bi-download me-1"></i>Download PDF
                        </a>
                      )}
                    </div>
                    <div className="d-flex gap-3 mb-2">
                      <span className={`badge bg-${getScoreColor(entry.overall_score)}`}>
                        Overall: {entry.overall_score}/100
                      </span>
                      <span className={`badge bg-${getScoreColor(entry.ats_score)}`}>
                        ATS: {entry.ats_score}/100
                      </span>
                    </div>
                    <small className="text-muted">
                      <i className="bi bi-calendar3 me-1"></i>{formatDate(entry.timestamp)}
                    </small>
                    {entry.final_verdict && (
                      <p className="mb-0 mt-1 text-muted small fst-italic">"{entry.final_verdict}"</p>
                    )}
                  </div>
                  <div className="d-flex flex-column gap-2 ms-3">
                    <button className="btn btn-primary btn-sm" onClick={() => handleLoad(entry)}>
                      <i className="bi bi-eye me-1"></i>View
                    </button>
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => handleDelete(entry.id)}
                      disabled={deletingId === entry.id}
                    >
                      {deletingId === entry.id
                        ? <span className="spinner-border spinner-border-sm"></span>
                        : <><i className="bi bi-trash me-1"></i>Delete</>}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPanel;
