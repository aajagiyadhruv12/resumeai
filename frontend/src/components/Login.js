import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiService } from '../services/apiService';
import { motion } from 'framer-motion';

const Login = ({ onLogin }) => {
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState(location.state?.info || '');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');
    try {
      const user = await apiService.login(email.trim(), password);
      if (onLogin) onLogin(user.email, user);
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="login-card fade-in"
      >

        <div className="text-center mb-5">
          <div className="admin-avatar mb-4">
            <i className="bi bi-shield-check"></i>
          </div>
          <h2 className="fw-bold mb-2">Welcome Back</h2>
          <p className="text-muted">Sign in to your ResumeAI account</p>
          <span className="badge bg-success-soft text-success px-3 py-2" style={{ fontSize: '12px', borderRadius: '12px' }}>
            <i className="bi bi-circle-fill me-2" style={{ fontSize: '8px' }}></i>System Online
          </span>
        </div>

        {info && (
          <div className="alert alert-success-soft text-success border-0 d-flex align-items-center py-3 mb-4 rounded-4" role="alert">
            <i className="bi bi-check-circle-fill fs-5 me-3"></i>
            <span className="fw-semibold small">{info}</span>
          </div>
        )}

        {error && (
          <div className="alert alert-danger-soft text-danger border-0 d-flex align-items-center py-3 mb-4 rounded-4" role="alert">
            <i className="bi bi-exclamation-octagon-fill fs-5 me-3"></i>
            <span className="fw-semibold small">{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} noValidate>
          <div className="mb-4">
            <label className="form-label fw-bold small text-muted text-uppercase tracking-wider">Email</label>
            <div className="input-group input-group-lg">
              <span className="input-group-text border-end-0 rounded-start-4">
                <i className="bi bi-envelope text-primary"></i>
              </span>
              <input
                type="email"
                className="form-control border-start-0 rounded-end-4 bg-light"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                disabled={loading}
                required
                autoComplete="email"
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
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                disabled={loading}
                required
                autoComplete="current-password"
              />
              <button type="button" className="input-group-text border-start-0 rounded-end-4 bg-light"
                onClick={() => setShowPassword(!showPassword)} disabled={loading}>
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
              </button>
            </div>
          </div>

          <button type="submit" className="btn-login py-3 fs-5" disabled={loading}>
            {loading
              ? <><span className="spinner-border spinner-border-sm me-2"></span>Signing In...</>
              : <><i className="bi bi-box-arrow-in-right me-2"></i>Sign In</>}
          </button>
        </form>

        <p className="text-center text-muted small mt-5 mb-0">
          Don't have an account? <Link to="/register" className="text-primary fw-bold text-decoration-none">Create Account</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
