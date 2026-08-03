import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from './contexts/ThemeContext';
import { apiService } from './services/apiService';
import Landing from './components/Landing';
import UploadForm from './components/UploadForm';
import AnalysisReport from './components/AnalysisReport';
import HistoryPanel from './components/HistoryPanel';
import Login from './components/Login';
import ResumeBuilder from './components/ResumeBuilder';
import './App.css';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resumeText, setResumeText] = useState('');
  const [targetRole, setTargetRole] = useState('Software Engineer');
  const [filename, setFilename] = useState('');
  const [appTab, setAppTab] = useState('analyze');
  const [builderTargetRole, setBuilderTargetRole] = useState('Software Engineer');
  const [builderResumeText, setBuilderResumeText] = useState('');

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [stats, setStats] = useState(null);

  // Lightweight dashboard stats from saved analyses
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    apiService.getHistory('anonymous')
      .then(data => {
        const list = Array.isArray(data) ? data : (data?.history || data?.data || []);
        if (cancelled || !Array.isArray(list)) return;
        const scores = list.map(e => e.overall_score).filter(s => typeof s === 'number');
        const ats = list.map(e => e.ats_score).filter(s => typeof s === 'number');
        setStats({
          total: list.length,
          best: scores.length ? Math.max(...scores) : null,
          avgAts: ats.length ? Math.round(ats.reduce((a, b) => a + b, 0) / ats.length) : null,
          last: list[0]?.timestamp ? new Date(list[0].timestamp).toLocaleDateString() : null,
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user, analysis]);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const email = localStorage.getItem('admin_email');
    if (token && email) setUser(email);
    setAuthLoading(false);

    // Keep the backend alive while the tab is open (ping every 10 minutes).
    // Health endpoint lives at the server root, not under /api.
    const healthUrl = `${(process.env.REACT_APP_API_URL || "https://resumeai-fj7h.onrender.com/api").replace(/\/api\/?$/, '')}/health`;
    const keepAlive = setInterval(() => {
      fetch(healthUrl).catch(() => {});
    }, 10 * 60 * 1000);

    return () => clearInterval(keepAlive);
  }, []);

  const onAnalysisComplete = (data, text, role, file = '') => {
    setAnalysis(data);
    setResumeText(text);
    setTargetRole(role);
    setFilename(file);
    setError(null);
    setAppTab('analyze');
  };

  const openBuilder = (resumeText, targetRole) => {
    setBuilderResumeText(resumeText || '');
    setBuilderTargetRole(targetRole || 'Software Engineer');
    setAppTab('builder');
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_email');
    setUser(null);
    setAnalysis(null);
    setAppTab('analyze');
    navigate('/');
  };

  const isLanding = location.pathname === '/' && !user;

  if (authLoading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
      <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status"></div>
    </div>
  );

  // Show Landing page for non-authenticated users on home route
  if (!user && isLanding) {
    return <Landing onGetStarted={() => navigate('/login')} />;
  }

  // Show Login for non-authenticated users on any route
  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login onLogin={(email) => { setUser(email); navigate('/', { replace: true }); }} />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={
        <div className="app-shell">
          {/* ── Top bar ── */}
          <nav className="app-topbar">
            <div className="app-topbar-inner">
              <div className="app-brand" onClick={() => { setAppTab('analyze'); navigate('/'); }}>
                <i className="bi bi-stars"></i>
                <span>Resume<span className="text-primary">AI</span></span>
              </div>

              <div className="app-tabs">
                {[
                  { key: 'analyze', icon: 'bi-search', label: 'Analyze' },
                  { key: 'history', icon: 'bi-clock-history', label: 'History' },
                  { key: 'builder', icon: 'bi-layout-text-window-reverse', label: 'Builder' },
                ].map(t => (
                  <button
                    key={t.key}
                    className={`app-tab ${appTab === t.key ? 'active' : ''}`}
                    onClick={() => { setAppTab(t.key); if (t.key === 'analyze') navigate('/'); }}
                  >
                    <i className={`bi ${t.icon}`}></i><span>{t.label}</span>
                  </button>
                ))}
              </div>

              <div className="app-topbar-actions">
                <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle theme">
                  <i className={`bi ${theme === 'dark' ? 'bi-sun-fill text-warning' : 'bi-moon-fill text-primary'}`}></i>
                </button>
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
                            <p className="fw-bold mb-0 small">Admin</p>
                            <small className="text-muted" style={{ fontSize: '11px' }}>AI Resume Analyzer</small>
                          </div>
                        </div>
                      </div>
                      <div className="p-2">
                        <button className="dropdown-item rounded-3 py-2 px-3 d-flex align-items-center" onClick={() => { setAppTab('analyze'); navigate('/'); setDropdownOpen(false); }}>
                          <i className="bi bi-speedometer2 me-2"></i>Dashboard
                        </button>
                        <button className="dropdown-item rounded-3 text-danger py-2 px-3 d-flex align-items-center" onClick={handleLogout}>
                          <i className="bi bi-box-arrow-right me-2"></i>Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </nav>

          <main className={`app-main ${appTab === 'builder' ? 'wide' : ''}`}>
            {/* ── Welcome + stats (dashboard home) ── */}
            {appTab === 'analyze' && !analysis && !loading && (
              <>
                <div className="dash-hero">
                  <div>
                    <h1 className="dash-title">Welcome back, Admin</h1>
                    <p className="dash-subtitle">Upload a resume for a full AI analysis, or continue building in the editor.</p>
                  </div>
                  <button className="btn btn-primary d-none d-md-inline-flex align-items-center" onClick={() => setAppTab('builder')}>
                    <i className="bi bi-layout-text-window-reverse me-2"></i>Open Builder
                  </button>
                </div>

                {stats && stats.total > 0 && (
                  <div className="dash-stats">
                    <div className="dash-stat-card">
                      <div className="dash-stat-icon" style={{ background: 'var(--primary-subtle)', color: 'var(--primary)' }}>
                        <i className="bi bi-file-earmark-text"></i>
                      </div>
                      <div>
                        <div className="dash-stat-value">{stats.total}</div>
                        <div className="dash-stat-label">Analyses Saved</div>
                      </div>
                    </div>
                    <div className="dash-stat-card">
                      <div className="dash-stat-icon" style={{ background: 'var(--success-glow)', color: 'var(--success)' }}>
                        <i className="bi bi-trophy"></i>
                      </div>
                      <div>
                        <div className="dash-stat-value">{stats.best !== null ? `${stats.best}/100` : '—'}</div>
                        <div className="dash-stat-label">Best Overall Score</div>
                      </div>
                    </div>
                    <div className="dash-stat-card">
                      <div className="dash-stat-icon" style={{ background: 'var(--secondary-glow)', color: 'var(--secondary)' }}>
                        <i className="bi bi-funnel"></i>
                      </div>
                      <div>
                        <div className="dash-stat-value">{stats.avgAts !== null ? `${stats.avgAts}/100` : '—'}</div>
                        <div className="dash-stat-label">Average ATS Score</div>
                      </div>
                    </div>
                    <div className="dash-stat-card">
                      <div className="dash-stat-icon" style={{ background: 'var(--warning-glow)', color: 'var(--warning)' }}>
                        <i className="bi bi-calendar-check"></i>
                      </div>
                      <div>
                        <div className="dash-stat-value">{stats.last || '—'}</div>
                        <div className="dash-stat-label">Last Activity</div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

          <div className="row justify-content-center">
            <div className="col-12">

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
                      openBuilder={openBuilder}
                    />
                  )}
                </>
              )}

              {appTab === 'history' && (
                <HistoryPanel onLoadAnalysis={(entry, text, role, file) => {
                  onAnalysisComplete(entry, text, role, file);
                }} userId="anonymous" />
              )}

              {appTab === 'builder' && (
                <ResumeBuilder
                  initialResumeText={builderResumeText}
                  targetRole={builderTargetRole}
                  onClose={() => setAppTab('analyze')}
                />
              )}

            </div>
          </div>
          </main>

          <footer className="app-footer">
            <p className="mb-0">AI Resume Analyzer &copy; 2026 — Built with AI, for your career.</p>
          </footer>
        </div>
      } />
      {/* Any unknown URL (including /login after signing in) lands on the dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
