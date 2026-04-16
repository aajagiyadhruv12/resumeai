import React, { useState } from 'react';
import { apiService } from '../services/apiService';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const ADMIN_EMAIL = 'admin@resumeai.com';

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await apiService.login(username, password, ADMIN_EMAIL);
      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_email', ADMIN_EMAIL);
      onLogin(ADMIN_EMAIL);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card fade-in">

        {/* Profile */}
        <div className="text-center mb-5">
          <div className="admin-avatar mb-4">
            <i className="bi bi-shield-check"></i>
          </div>
          <h2 className="fw-bold mb-2">Welcome Back</h2>
          <p className="text-muted">Secure access to ResumeAI Portal</p>
          <span className="badge bg-success-soft text-success px-3 py-2" style={{ fontSize: '12px', borderRadius: '12px' }}>
            <i className="bi bi-circle-fill me-2" style={{ fontSize: '8px' }}></i>System Online
          </span>
        </div>

        {error && (
          <div className="alert alert-danger-soft text-danger border-0 d-flex align-items-center py-3 mb-4 rounded-4" role="alert">
            <i className="bi bi-exclamation-octagon-fill fs-5 me-3"></i>
            <span className="fw-semibold small">{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="form-label fw-bold small text-muted text-uppercase tracking-wider">Username</label>
            <div className="input-group input-group-lg">
              <span className="input-group-text border-end-0 rounded-start-4">
                <i className="bi bi-person text-primary"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0 rounded-end-4 bg-light"
                placeholder="Admin username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="mb-5">
            <label className="form-label fw-bold small text-muted text-uppercase tracking-wider">Password</label>
            <div className="input-group input-group-lg">
              <span className="input-group-text border-end-0 rounded-start-4">
                <i className="bi bi-lock text-primary"></i>
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control border-start-0 border-end-0 bg-light"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="button" className="input-group-text border-start-0 rounded-end-4 bg-light"
                onClick={() => setShowPassword(!showPassword)}>
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
              </button>
            </div>
          </div>

          <button type="submit" className="btn-login py-3 fs-5" disabled={loading}>
            {loading
              ? <><span className="spinner-border spinner-border-sm me-2"></span>Authenticating...</>
              : <><i className="bi bi-shield-lock-fill me-2"></i>Access Portal</>}
          </button>
        </form>

        <p className="text-center text-muted small mt-5 mb-0">
          <i className="bi bi-incognito me-1"></i> Restricted Access Area
        </p>
      </div>
    </div>
  );
};

export default Login;
