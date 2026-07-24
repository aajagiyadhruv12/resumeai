import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'framer-motion';



/* ─── Fade In Section Wrapper ─── */
const FadeInSection = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-80px' }}
    transition={{ duration: 0.6, delay }}
  >
    {children}
  </motion.div>
);

/* ════════════════════════════════════════════════
   LANDING PAGE
   ════════════════════════════════════════════════ */
const Landing = ({ onGetStarted }) => {
  const { theme, toggleTheme } = useTheme();
  const [mobileMenu, setMobileMenu] = useState(false);
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenu(false);
  };

  const features = [
    { icon: 'bi-robot', title: 'AI-Powered Analysis', desc: 'Deep analysis across 20+ dimensions using GPT-4o & Gemini AI. Get scores for ATS, skills, experience, and more.', color: '#6366f1' },
    { icon: 'bi-file-earmark-check', title: 'ATS Optimization', desc: 'Score your resume against real ATS algorithms. Get keyword suggestions, formatting fixes, and section recommendations.', color: '#10b981' },
    { icon: 'bi-layout-text-window-reverse', title: 'Visual Resume Builder', desc: 'Drag-drop editor with 4 professional templates. Real-time preview, AI suggestions, and one-click improvements.', color: '#f59e0b' },
    { icon: 'bi-briefcase', title: 'Job Match Scoring', desc: 'Paste any job description and get an instant match score. See missing keywords, skills gaps, and improvement roadmap.', color: '#ef4444' },
    { icon: 'bi-chat-dots', title: 'Interview Preparation', desc: 'Generate tailored interview questions based on your resume. Practice with HR, technical, and behavioral questions.', color: '#06b6d4' },
    { icon: 'bi-envelope-paper', title: 'Cover Letter Generator', desc: 'AI generates personalized cover letters that match your resume and target role. Editable and exportable to PDF.', color: '#8b5cf6' },
    { icon: 'bi-graph-up-arrow', title: 'Analytics Dashboard', desc: 'Track your resume scores over time. See improvement trends, compare versions, and get weekly progress reports.', color: '#ec4899' },
    { icon: 'bi-person-check', title: 'Recruiter Insights', desc: 'See your resume through a recruiter\'s eyes. Get a hiring recommendation, risk indicators, and competitive analysis.', color: '#14b8a6' },
  ];



  return (
    <div className="landing-page">
      {/* ── NAVBAR ── */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <i className="bi bi-stars text-primary"></i>
            <span>Resume<span className="text-primary">AI</span></span>
          </div>
          <div className={`landing-nav-links ${mobileMenu ? 'open' : ''}`}>
            <button onClick={toggleTheme} className="theme-toggle-btn" title="Toggle theme">
              <i className={`bi ${theme === 'dark' ? 'bi-sun-fill' : 'bi-moon-fill'}`}></i>
            </button>
          </div>
          <div className="landing-nav-actions">
            <button className="btn btn-primary btn-sm px-4" onClick={onGetStarted}>
              <i className="bi bi-box-arrow-in-right me-2"></i>Sign In
            </button>
            <button className="landing-mobile-btn" onClick={() => setMobileMenu(!mobileMenu)}>
              <i className={`bi ${mobileMenu ? 'bi-x-lg' : 'bi-list'}`}></i>
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="landing-hero" id="hero">
        <div className="landing-hero-bg">
          <div className="hero-orb orb-1"></div>
          <div className="hero-orb orb-2"></div>
          <div className="hero-orb orb-3"></div>
        </div>
        <div className="landing-hero-content">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="hero-badge">
              <i className="bi bi-lightning-charge-fill me-2"></i>
              AI-Powered Resume Optimization
            </div>
            <h1 className="hero-title">
              Land More Interviews<br />
              with <span className="text-gradient">AI Precision</span>
            </h1>
            <p className="hero-subtitle">
              The most advanced AI resume analyzer that optimizes your resume for ATS systems,
              recruiters, and your dream job — all in seconds.
            </p>
            <div className="hero-actions">
              <button className="btn btn-primary btn-hero" onClick={onGetStarted}>
                <i className="bi bi-stars me-2"></i>Analyze Your Resume Free
              </button>
              <button className="btn btn-outline-primary btn-hero-outline" onClick={() => scrollTo('how')}>
                <i className="bi bi-play-circle me-2"></i>See How It Works
              </button>
            </div>
          </motion.div>
        </div>
      </section>


      {/* ── FEATURES ── */}
      <section className="landing-features" id="features">
        <div className="landing-container">
          <div className="features-grid">
            {features.map((f, i) => (
              <FadeInSection key={i} delay={i * 0.05}>
                <div className="feature-card">
                  <div className="feature-icon" style={{ background: `${f.color}15`, color: f.color }}>
                    <i className={`bi ${f.icon}`}></i>
                  </div>
                  <h3 className="feature-title">{f.title}</h3>
                  <p className="feature-desc">{f.desc}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="landing-how" id="how">
        <div className="landing-container">
          <FadeInSection>
            <div className="section-label" style={{ color: 'var(--success)' }}>How It Works</div>
            <h2 className="section-title">Three Simple Steps to a <span className="text-success">Better Resume</span></h2>
          </FadeInSection>
          <div className="steps-grid">
            {[
              { num: '01', icon: 'bi-cloud-upload', title: 'Upload Your Resume', desc: 'Drag & drop your PDF or DOCX. Our parser instantly extracts text with 99% accuracy across any format.' },
              { num: '02', icon: 'bi-cpu', title: 'AI Deep Analysis', desc: 'Our AI analyzes 20+ dimensions including ATS compatibility, skills gaps, experience impact, and keyword density.' },
              { num: '03', icon: 'bi-stars', title: 'Get Optimized & Apply', desc: 'Use our visual builder to apply AI suggestions, generate a cover letter, practice interviews, and track your progress.' },
            ].map((s, i) => (
              <FadeInSection key={i} delay={i * 0.15}>
                <div className="step-card">
                  <div className="step-number">{s.num}</div>
                  <div className="step-icon"><i className={`bi ${s.icon}`}></i></div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>



      {/* ── CTA ── */}
      <section className="landing-cta">
        <div className="landing-cta-bg"></div>
        <FadeInSection>
          <div className="text-center position-relative" style={{ zIndex: 1 }}>
            <h2 className="cta-title">Ready to Land Your Dream Job?</h2>
            <p className="cta-subtitle">Join 50,000+ job seekers who optimized their resumes with AI. Start free, no credit card required.</p>
            <button className="btn btn-primary btn-hero btn-lg" onClick={onGetStarted}>
              <i className="bi bi-stars me-2"></i>Analyze Your Resume Free
            </button>
          </div>
        </FadeInSection>
      </section>

      {/* ── FOOTER ── */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="landing-logo mb-3">
                <i className="bi bi-stars text-primary"></i>
                <span>Resume<span className="text-primary">AI</span></span>
              </div>
              <p>The most advanced AI-powered resume optimization platform. Land more interviews with data-driven insights.</p>
              <div className="footer-rating">
                <i className="bi bi-star-fill text-warning"></i>
                <i className="bi bi-star-fill text-warning"></i>
                <i className="bi bi-star-fill text-warning"></i>
                <i className="bi bi-star-fill text-warning"></i>
                <i className="bi bi-star-fill text-warning"></i>
                <span>4.9 (2,500+ reviews)</span>
              </div>
            </div>
            {[
              { title: 'Product', links: ['Pricing', 'Templates', 'API'] },
              { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
              { title: 'Support', links: ['Help Center', 'Documentation', 'Status', 'Community'] },
              { title: 'Legal', links: ['Privacy', 'Terms', 'Security', 'Cookies'] },
            ].map((col, i) => (
              <div key={i} className="footer-col">
                <h4>{col.title}</h4>
                {col.links.map((link, j) => <a key={j} href="#!">{link}</a>)}
              </div>
            ))}
          </div>
          <div className="footer-bottom">
            <p>&copy; 2026 ResumeAI. All rights reserved.</p>
            <div className="footer-social">
              <a href="#!"><i className="bi bi-twitter-x"></i></a>
              <a href="#!"><i className="bi bi-linkedin"></i></a>
              <a href="#!"><i className="bi bi-github"></i></a>
              <a href="#!"><i className="bi bi-youtube"></i></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
