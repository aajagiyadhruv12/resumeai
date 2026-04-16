import React, { useState, useEffect } from 'react';
import UploadForm from './components/UploadForm';
import AnalysisReport from './components/AnalysisReport';
import HistoryPanel from './components/HistoryPanel';
import Login from './components/Login';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resumeText, setResumeText] = useState('');
  const [targetRole, setTargetRole] = useState('Software Engineer');
  const [filename, setFilename] = useState('');
  const [appTab, setAppTab] = useState('analyze');

  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const email = localStorage.getItem('admin_email');
    if (token && email) setUser(email);
    setAuthLoading(false);
  }, []);

  const onAnalysisComplete = (data, text, role, file = '') => {
    setAnalysis(data);
    setResumeText(text);
    setTargetRole(role);
    setFilename(file);
    setError(null);
    setAppTab('analyze');
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_email');
    setUser(null);
    setAnalysis(null);
    setAppTab('analyze');
  };

  if (authLoading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
      <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status"></div>
    </div>
  );

  if (!user) return <Login onLogin={(email) => setUser(email)} />;

  return (
    <div className="container py-5">
      <header className="text-center mb-5">
        <div className="d-flex justify-content-end mb-3">
          <div style={{ position: 'relative' }}>
            <div className="header-avatar" onClick={() => setDropdownOpen(!dropdownOpen)}>
              <i className="bi bi-person-fill"></i>
            </div>
            {dropdownOpen && (
              <div className="profile-dropdown shadow-lg" onMouseLeave={() => setDropdownOpen(false)}>
                <div className="px-3 py-3 border-bottom">
                  <div className="d-flex align-items-center gap-3">
                    <div className="header-avatar" style={{ width: '40px', height: '40px', fontSize: '18px' }}>
                      <i className="bi bi-person-fill"></i>
                    </div>
                    <div className="text-start">
                      <p className="fw-bold mb-0 small text-dark">Admin</p>
                      <small className="text-muted" style={{ fontSize: '11px' }}>AI Resume Analyzer</small>
                    </div>
                  </div>
                </div>
                <div className="p-2">
                  <button className="dropdown-item rounded-3 text-danger py-2 px-3 d-flex align-items-center" onClick={handleLogout}>
                    <i className="bi bi-box-arrow-right me-2"></i>Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <h1 className="display-2 fw-bold mb-3">AI Resume Analyzer</h1>
        <p className="lead text-muted mx-auto" style={{ maxWidth: '600px' }}>
          Elevate your career with our production-ready AI analysis. 
          Optimize your profile for ATS and Recruiters in seconds.
        </p>
      </header>

      <ul className="nav nav-pills justify-content-center mb-4">
        <li className="nav-item">
          <button className={`nav-link ${appTab === 'analyze' ? 'active' : ''}`} onClick={() => setAppTab('analyze')}>
            <i className="bi bi-search me-1"></i>Analyze
          </button>
        </li>
        <li className="nav-item ms-2">
          <button className={`nav-link ${appTab === 'history' ? 'active' : ''}`} onClick={() => setAppTab('history')}>
            <i className="bi bi-clock-history me-1"></i>History
          </button>
        </li>
      </ul>

      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-10">

          {appTab === 'analyze' && (
            <>
              <UploadForm onAnalysisComplete={onAnalysisComplete} setLoading={setLoading} setError={setError} />

              {loading && (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status"></div>
                  <h4 className="mt-3 text-primary fw-bold">Processing...</h4>
                  <p className="text-muted">Our AI is working on your resume.</p>
                </div>
              )}

              {error && (
                <div className="alert alert-danger shadow-sm border-0 d-flex align-items-center" role="alert">
                  <i className="bi bi-exclamation-triangle-fill fs-4 me-3"></i>
                  <div>
                    <h5 className="mb-0 fw-bold">Failed</h5>
                    <p className="mb-0">{error}</p>
                  </div>
                </div>
              )}

              {!loading && !error && analysis && (
                <AnalysisReport
                  analysis={analysis}
                  resumeText={resumeText}
                  targetRole={targetRole}
                  filename={filename}
                  onAnalysisComplete={onAnalysisComplete}
                  setLoading={setLoading}
                  setError={setError}
                />
              )}
            </>
          )}

          {appTab === 'history' && (
            <HistoryPanel onLoadAnalysis={onAnalysisComplete} userId="anonymous" />
          )}

        </div>
      </div>

      <footer className="text-center mt-5 py-4 border-top">
        <p className="text-muted mb-0">AI Resume Analyzer &copy; 2026.</p>
      </footer>
    </div>
  );
}

export default App;
