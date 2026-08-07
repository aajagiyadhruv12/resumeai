import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/apiService';

const AdminPanel = () => {
  const navigate = useNavigate();
  const [adminEmail, setAdminEmail] = useState(() => localStorage.getItem('admin_email') || '');
  const [authed, setAuthed] = useState(() => !!localStorage.getItem('admin_token'));

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Dashboard data
  const [users, setUsers] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [tab, setTab] = useState('overview');
  const [filter, setFilter] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [usersRes, analysesRes] = await Promise.all([
        apiService.getAdminUsers(),
        apiService.getAdminAnalyses(),
      ]);
      setUsers(usersRes?.users || []);
      setAnalyses(analysesRes?.analyses || []);
    } catch (err) {
      const msg = err?.message || '';
      if (msg.includes('Unauthorized') || msg.includes('Session expired')) {
        // Token no longer valid — drop back to the admin login screen
        await apiService.adminLogout();
        setAuthed(false);
        setAdminEmail('');
        setError('');
      } else {
        setError(`Failed to load admin data: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) loadData();
  }, [authed, loadData]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loginLoading) return;
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await apiService.adminLogin(loginEmail.trim(), loginPassword);
      if (!res || !res.token) {
        setLoginError(res?.error || 'Login failed. Check your admin credentials.');
        return;
      }
      setAdminEmail(res?.email || loginEmail.trim());
      setAuthed(true);
      setLoginPassword('');
    } catch (err) {
      setLoginError(err?.message || 'Login failed. Check your admin credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    // Clear the COMPLETE authenticated session (admin JWT + any Firebase
    // session) so no stale tokens remain, then land on the Sign In page.
    // apiService.logout() wipes the admin token synchronously BEFORE the
    // fallible Firebase sign-out, so even a signOut failure can't leave a
    // stale admin session behind.
    try {
      await apiService.logout();
    } catch (e) {
      window.alert('Your admin session was cleared, but the app sign-out failed. Please refresh the page.');
    }
    setAuthed(false);
    setAdminEmail('');
    setUsers([]);
    setAnalyses([]);
    setExpandedId(null);
    navigate('/login');
  };

  const formatDate = (ts) => {
    if (!ts) return '—';
    try { return new Date(ts).toLocaleString(); } catch { return ts; }
  };

  const scoreColor = (score) => {
    if (score == null) return 'secondary';
    if (score >= 75) return 'success';
    if (score >= 50) return 'warning';
    return 'danger';
  };

  const filteredAnalyses = filter.trim()
    ? analyses.filter((a) =>
        String(a.user_id || '').toLowerCase().includes(filter.toLowerCase()) ||
        String(a.filename || '').toLowerCase().includes(filter.toLowerCase()) ||
        String(a.target_role || '').toLowerCase().includes(filter.toLowerCase())
      )
    : analyses;

  const totalUsers = users.length;
  const totalAnalyses = analyses.length;
  const avgOverall = users.length
    ? Math.round(users.reduce((s, u) => s + (u.avg_overall || 0), 0) / users.length)
    : null;
  const avgAts = users.length
    ? Math.round(users.reduce((s, u) => s + (u.avg_ats || 0), 0) / users.length)
    : null;

  /* ── Admin login screen ─────────────────────────────────── */
  if (!authed) {
    return (
      <div className="admin-login-page">
        <div className="admin-login-card glass-card">
          <div className="admin-login-icon">
            <i className="bi bi-shield-lock-fill"></i>
          </div>
          <h2 className="fw-bold mb-1">Admin Panel</h2>
          <p className="text-muted mb-4">Restricted area — sign in with admin credentials.</p>

          {loginError && <div className="alert alert-danger py-2">{loginError}</div>}

          <form onSubmit={handleLogin}>
            <div className="mb-3 text-start">
              <label className="form-label small fw-semibold text-muted">Username or Email</label>
              <input
                type="text"
                className="form-control"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                required
              />
            </div>
            <div className="mb-4 text-start">
              <label className="form-label small fw-semibold text-muted">Password</label>
              <input
                type="password"
                className="form-control"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary w-100 py-2 fw-semibold" disabled={loginLoading}>
              {loginLoading ? (
                <><span className="spinner-border spinner-border-sm me-2"></span>Signing in...</>
              ) : (
                <><i className="bi bi-box-arrow-in-right me-2"></i>Sign In</>
              )}
            </button>
          </form>

          <button className="btn btn-link text-muted mt-3" onClick={() => navigate('/login')}>
            <i className="bi bi-arrow-left me-1"></i>Back to app
          </button>
        </div>
      </div>
    );
  }

  /* ── Admin dashboard ────────────────────────────────────── */
  return (
    <div className="admin-page">
      <div className="admin-header">
        <div className="admin-header-inner">
          <div className="admin-brand">
            <i className="bi bi-shield-lock-fill"></i>
            <span>Admin Panel</span>
          </div>
          <div className="admin-header-actions">
            <span className="admin-email-badge">
              <i className="bi bi-person-fill me-1"></i>{adminEmail}
            </span>
            {/* "App" opens the main ResumeAI application. The admin session is
                preserved (never logged out or replaced), and the app recognizes
                the admin via the admin JWT — so the admin lands on the main
                page, still authenticated as ADMIN, and can analyze resumes,
                view history, and use the builder. */}
            <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/')}>
              <i className="bi bi-arrow-left me-1"></i>App
            </button>
            <button className="btn btn-outline-danger btn-sm" onClick={handleLogout}>
              <i className="bi bi-box-arrow-right me-1"></i>Logout
            </button>
          </div>
        </div>
      </div>

      <div className="admin-body container-xl py-4">
        {error && (
          <div className="alert alert-danger d-flex align-items-center justify-content-between gap-3">
            <span className="flex-grow-1">{error}</span>
            <button className="btn btn-sm btn-outline-danger text-nowrap" onClick={loadData}>
              <i className="bi bi-arrow-clockwise me-1"></i>Try again
            </button>
          </div>
        )}

        <div className="dash-stats mb-4">
          <div className="dash-stat-card">
            <div className="dash-stat-icon" style={{ background: 'var(--primary-subtle)', color: 'var(--primary)' }}>
              <i className="bi bi-people-fill"></i>
            </div>
            <div>
              <div className="dash-stat-value">{totalUsers}</div>
              <div className="dash-stat-label">Total Users</div>
            </div>
          </div>
          <div className="dash-stat-card">
            <div className="dash-stat-icon" style={{ background: 'var(--secondary-glow)', color: 'var(--secondary)' }}>
              <i className="bi bi-file-earmark-text-fill"></i>
            </div>
            <div>
              <div className="dash-stat-value">{totalAnalyses}</div>
              <div className="dash-stat-label">Total Analyses</div>
            </div>
          </div>
          <div className="dash-stat-card">
            <div className="dash-stat-icon" style={{ background: 'var(--success-glow)', color: 'var(--success)' }}>
              <i className="bi bi-trophy-fill"></i>
            </div>
            <div>
              <div className="dash-stat-value">{avgOverall !== null ? `${avgOverall}/100` : '—'}</div>
              <div className="dash-stat-label">Avg Overall</div>
            </div>
          </div>
          <div className="dash-stat-card">
            <div className="dash-stat-icon" style={{ background: 'var(--warning-glow)', color: 'var(--warning)' }}>
              <i className="bi bi-funnel-fill"></i>
            </div>
            <div>
              <div className="dash-stat-value">{avgAts !== null ? `${avgAts}/100` : '—'}</div>
              <div className="dash-stat-label">Avg ATS Score</div>
            </div>
          </div>
        </div>

        <div className="admin-tabs mb-3">
          <button className={`admin-tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>
            <i className="bi bi-people me-1"></i>Users ({users.length})
          </button>
          <button className={`admin-tab ${tab === 'analyses' ? 'active' : ''}`} onClick={() => setTab('analyses')}>
            <i className="bi bi-file-earmark-text me-1"></i>Analyses ({analyses.length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="mt-3 text-muted">Loading admin data...</p>
          </div>
        ) : tab === 'overview' ? (
          <div className="glass-card p-0 overflow-hidden">
            <div className="table-responsive">
              <table className="table admin-table mb-0">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Analyses</th>
                    <th>Avg Overall</th>
                    <th>Avg ATS</th>
                    <th>Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 && (
                    <tr><td colSpan="5" className="text-center text-muted py-4">No users with analyses yet.</td></tr>
                  )}
                  {users.map((u) => (
                    <tr key={u.user_id}>
                      <td className="fw-semibold">
                        <i className="bi bi-person-circle me-2 text-primary"></i>
                        <span className="font-monospace" style={{ fontSize: '0.85rem' }}>{u.user_id}</span>
                      </td>
                      <td><span className="badge bg-primary-soft text-primary">{u.count}</span></td>
                      <td>
                        <span className={`tag tag-${scoreColor(u.avg_overall)}`}>
                          {u.avg_overall != null ? `${u.avg_overall}/100` : '—'}
                        </span>
                      </td>
                      <td>
                        <span className={`tag tag-${scoreColor(u.avg_ats)}`}>
                          {u.avg_ats != null ? `${u.avg_ats}/100` : '—'}
                        </span>
                      </td>
                      <td className="text-muted small">{formatDate(u.last_activity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-3">
              <input
                type="text"
                className="form-control"
                placeholder="Filter by user, filename, or target role..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
            <div className="d-flex flex-column gap-3">
              {filteredAnalyses.length === 0 && (
                <div className="text-center py-4 text-muted">No analyses match the filter.</div>
              )}
              {filteredAnalyses.map((a) => {
                const isOpen = expandedId === a.id;
                return (
                  <div key={a.id} className={`glass-card admin-analysis ${isOpen ? 'open' : ''}`}>
                    <div
                      className="admin-analysis-header"
                      onClick={() => setExpandedId(isOpen ? null : a.id)}
                    >
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2 flex-wrap">
                          <i className="bi bi-file-earmark-text text-primary"></i>
                          <span className="fw-bold text-dark">{a.filename || 'Resume'}</span>
                          <span className="badge bg-primary-soft text-primary">{a.target_role || 'General'}</span>
                        </div>
                        <div className="d-flex align-items-center gap-3 flex-wrap mt-1 small text-muted">
                          <span><i className="bi bi-person me-1"></i><span className="font-monospace">{a.user_id || 'anonymous'}</span></span>
                          <span><i className="bi bi-calendar3 me-1"></i>{formatDate(a.timestamp)}</span>
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <span className={`tag tag-${scoreColor(a.overall_score)}`}>Overall: {a.overall_score ?? '—'}/100</span>
                        <span className={`tag tag-${scoreColor(a.ats_score)}`}>ATS: {a.ats_score ?? '—'}/100</span>
                        <i className={`bi ${isOpen ? 'bi-chevron-up' : 'bi-chevron-down'} text-muted`}></i>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="admin-analysis-detail">
                        {a.final_verdict && (
                          <p className="mb-2"><i className="bi bi-quote me-1 text-primary"></i><em>{a.final_verdict}</em></p>
                        )}
                        {a.professional_summary && (
                          <p className="mb-2 text-muted small">{a.professional_summary}</p>
                        )}
                        {a.resume_text && (
                          <>
                            <div className="small fw-semibold text-muted mb-1"><i className="bi bi-file-text me-1"></i>Resume text</div>
                            <pre className="admin-resume-text">{a.resume_text}</pre>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
