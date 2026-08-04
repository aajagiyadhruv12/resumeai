import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiService } from '../services/apiService';
import { motion } from 'framer-motion';

const Register = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const profile = await apiService.register(fullName, email, password, confirmPassword);
      // Registration creates the Firebase user; send them to login to sign in.
      navigate('/login', {
        state: { info: `Account created${profile?.full_name ? ` for ${profile.full_name}` : ''}! Please sign in.` },
      });
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
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
        <div className="text-center mb-4">
          <div className="admin-avatar mb-4">
            <i className="bi bi-person-plus-fill"></i>
          </div>
          <h2 className="fw-bold mb-2">Create Account</h2>
          <p className="text-muted">Join ResumeAI and get AI-powered resume analysis</p>
        </div>

        {error && (
          <div className="alert alert-danger-soft text-danger border-0 d-flex align-items-center py-3 mb-4 rounded-4" role="alert">
            <i className="bi bi-exclamation-octagon-fill fs-5 me-3"></i>
            <span className="fw-semibold small">{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} noValidate>
          <div className="mb-3">
            <label className="form-label fw-bold small text-muted text-uppercase tracking-wider">Full Name</label>
            <div className="input-group input-group-lg">
              <span className="input-group-text border-end-0 rounded-start-4">
                <i className="bi bi-person text-primary"></i>
              </span>
              <input
                type="text"
                className="form-control border-start-0 rounded-end-4 bg-light"
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setError(''); }}
                disabled={loading}
                required
                autoComplete="name"
              />
            </div>
          </div>

          <div className="mb-3">
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

          <div className="mb-3">
            <label className="form-label fw-bold small text-muted text-uppercase tracking-wider">Password</label>
            <div className="input-group input-group-lg">
              <span className="input-group-text border-end-0 rounded-start-4">
                <i className="bi bi-lock text-primary"></i>
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control border-start-0 border-end-0 bg-light"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                disabled={loading}
                required
                minLength={6}
                autoComplete="new-password"
              />
              <button type="button" className="input-group-text border-start-0 rounded-end-4 bg-light"
                onClick={() => setShowPassword(!showPassword)} disabled={loading}>
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label fw-bold small text-muted text-uppercase tracking-wider">Confirm Password</label>
            <div className="input-group input-group-lg">
              <span className="input-group-text border-end-0 rounded-start-4">
                <i className="bi bi-shield-lock text-primary"></i>
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control border-start-0 rounded-end-4 bg-light"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                disabled={loading}
                required
                autoComplete="new-password"
              />
            </div>
          </div>

          <button type="submit" className="btn-login py-3 fs-5" disabled={loading}>
            {loading
              ? <><span className="spinner-border spinner-border-sm me-2"></span>Creating Account...</>
              : <><i className="bi bi-person-plus me-2"></i>Create Account</>}
          </button>
        </form>

        <p className="text-center text-muted small mt-5 mb-0">
          Already have an account? <Link to="/login" className="text-primary fw-bold text-decoration-none">Sign In</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;
