import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'framer-motion';

/* ─── Animated Counter ─── */
const Counter = ({ end, duration = 2, suffix = '' }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let startTime = null;
    const startVal = 1;
    const totalSteps = end - startVal;
    let rafId;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(startVal + totalSteps * eased));
      if (progress < 1) rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [visible, end, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
};

/* ─── Testimonials ─── */
const testimonials = [
  { name: 'Sarah Chen', role: 'Software Engineer at Google', text: 'The AI analysis helped me identify exactly what keywords I was missing. My interview call rate tripled after implementing the suggestions. Absolutely invaluable.', initials: 'SC', rating: 5, color: 'linear-gradient(135deg, #6366f1, #8b5cf6)', result: '3x more interview calls', companyIcon: 'bi-google' },
  { name: 'James Rodriguez', role: 'Product Manager at Stripe', text: 'I was stuck in the resume black hole for months. This tool not only fixed my ATS score but the Resume Builder made my experience sound 10x more impressive.', initials: 'JR', rating: 5, color: 'linear-gradient(135deg, #10b981, #059669)', result: 'ATS score: 55 → 94', companyIcon: 'bi-stripe' },
  { name: 'Priya Patel', role: 'Data Scientist at Netflix', text: 'The job matching feature is incredible. I pasted a job description and it showed me exactly what skills to highlight. Landed my dream role in 3 weeks!', initials: 'PP', rating: 5, color: 'linear-gradient(135deg, #ef4444, #dc2626)', result: 'Landed role in 3 weeks', companyIcon: 'bi-play-btn' },
  { name: 'Michael Thompson', role: 'DevOps Engineer at AWS', text: 'From 55 to 92 ATS score in one revision. The bullet point rewriting alone is worth the price. This is the best resume tool I have ever used.', initials: 'MT', rating: 5, color: 'linear-gradient(135deg, #f59e0b, #d97706)', result: '+37 ATS points gained', companyIcon: 'bi-cloud' },
];

/* ─── Company Logos (as icons) ─── */
const companyLogos = [
  'bi-google', 'bi-microsoft', 'bi-amazon', 'bi-apple', 'bi-meta',
  'bi-linkedin', 'bi-github', 'bi-twitter-x', 'bi-slack', 'bi-zoom',
];

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
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [testimonialAuto, setTestimonialAuto] = useState(true);

  // Auto-rotate testimonials
  useEffect(() => {
    if (!testimonialAuto) return;
    const interval = setInterval(() => {
      setTestimonialIndex(prev => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonialAuto]);

  const prevTestimonial = () => {
    setTestimonialAuto(false);
    setTestimonialIndex(prev => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const nextTestimonial = () => {
    setTestimonialAuto(false);
    setTestimonialIndex(prev => (prev + 1) % testimonials.length);
  };

  const goToTestimonial = (i) => {
    setTestimonialAuto(false);
    setTestimonialIndex(i);
  };

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
            <button onClick={() => scrollTo('features')}>Features</button>
            <button onClick={() => scrollTo('testimonials')}>Testimonials</button>
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
              <button className="btn btn-outline-primary btn-hero-outline" onClick={() => scrollTo('features')}>
                <i className="bi bi-play-circle me-2"></i>See How It Works
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="landing-stats">
        <div className="landing-container">
          <div className="stats-grid">
            {[
              { end: 50000, suffix: '+', label: 'Resumes Analyzed' },
              { end: 92, suffix: '%', label: 'Average ATS Score' },
              { end: 3, suffix: 'x', label: 'More Interview Calls' },
              { end: 150, suffix: '+', label: 'Job Roles Supported' },
            ].map((s, i) => (
              <div key={i} className="stat-card">
                <div className="stat-number">
                  <Counter end={s.end} suffix={s.suffix} />
                </div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="landing-features" id="features">
        <div className="landing-container">
          <FadeInSection>
            <div className="section-label">Features</div>
            <h2 className="section-title">Everything You Need to <span className="text-gradient">Land the Job</span></h2>
            <p className="section-subtitle">From AI analysis to interview prep — your complete career toolkit</p>
          </FadeInSection>

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


      {/* ── TESTIMONIALS ── */}
      <section className="landing-testimonials" id="testimonials">
        <div className="landing-container">
          <FadeInSection>
            <div className="section-label" style={{ color: 'var(--info)' }}>Testimonials</div>
            <h2 className="section-title">Loved by <span className="text-info">Job Seekers</span></h2>
            <p className="section-subtitle">Join thousands who landed their dream roles at top companies</p>
          </FadeInSection>

          {/* Company Logo Strip */}
          <FadeInSection delay={0.1}>
            <div className="trust-bar">
              <span className="trust-label">Trusted by job seekers from</span>
              <div className="trust-logos">
                {companyLogos.map((logo, i) => (
                  <div key={i} className="trust-logo" title={logo.replace('bi-', '').charAt(0).toUpperCase() + logo.replace('bi-', '').slice(1)}>
                    <i className={`bi ${logo}`}></i>
                  </div>
                ))}
              </div>
            </div>
          </FadeInSection>

          {/* Testimonial Carousel */}
          <FadeInSection delay={0.2}>
            <div className="testimonial-carousel">
              <button className="carousel-arrow carousel-prev" onClick={prevTestimonial} aria-label="Previous testimonial">
                <i className="bi bi-chevron-left"></i>
              </button>

              <div className="carousel-track">
                {testimonials.map((t, i) => (
                  <motion.div
                    key={i}
                    className={`testimonial-card ${i === testimonialIndex ? 'active' : ''}`}
                    initial={{ opacity: 0, scale: 0.9, x: i === testimonialIndex ? 50 : 0 }}
                    animate={{
                      opacity: i === testimonialIndex ? 1 : 0,
                      scale: i === testimonialIndex ? 1 : 0.9,
                      x: i === testimonialIndex ? 0 : (i < testimonialIndex ? -50 : 50),
                    }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="testimonial-card-inner">
                      <div className="testimonial-top">
                        <div className="testimonial-avatar" style={{ background: t.color }}>
                          {t.initials}
                          <div className="verified-badge">
                            <i className="bi bi-patch-check-fill"></i>
                          </div>
                        </div>
                        <div className="testimonial-meta">
                          <div className="testimonial-name">{t.name}</div>
                          <div className="testimonial-role">{t.role}</div>
                        </div>
                        <div className="testimonial-stars">
                          {[...Array(t.rating)].map((_, j) => (
                            <motion.i
                              key={j}
                              className="bi bi-star-fill"
                              initial={{ opacity: 0, scale: 0 }}
                              animate={i === testimonialIndex ? { opacity: 1, scale: 1 } : {}}
                              transition={{ delay: 0.3 + j * 0.1, type: 'spring', stiffness: 300 }}
                            ></motion.i>
                          ))}
                        </div>
                      </div>
                      <div className="testimonial-quote-wrap">
                        <i className="bi bi-quote testimonial-quote-icon"></i>
                        <p className="testimonial-text">"{t.text}"</p>
                      </div>
                      <div className="testimonial-result">
                        <div className="result-badge">
                          <i className="bi bi-graph-up-arrow me-1"></i>
                          {t.result}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <button className="carousel-arrow carousel-next" onClick={nextTestimonial} aria-label="Next testimonial">
                <i className="bi bi-chevron-right"></i>
              </button>

              <div className="carousel-dots">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    className={`carousel-dot ${i === testimonialIndex ? 'active' : ''}`}
                    onClick={() => goToTestimonial(i)}
                    aria-label={`Go to testimonial ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </FadeInSection>

          {/* Stats Row */}
          <FadeInSection delay={0.3}>
            <div className="testimonial-stats">
              <div className="testi-stat">
                <span className="testi-stat-value">50,000+</span>
                <span className="testi-stat-label">Resumes Analyzed</span>
              </div>
              <div className="testi-stat">
                <span className="testi-stat-value">92%</span>
                <span className="testi-stat-label">Avg. ATS Score</span>
              </div>
              <div className="testi-stat">
                <span className="testi-stat-value">3x</span>
                <span className="testi-stat-label">More Interviews</span>
              </div>
              <div className="testi-stat">
                <span className="testi-stat-value">4.9★</span>
                <span className="testi-stat-label">User Rating</span>
              </div>
            </div>
          </FadeInSection>
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
              { title: 'Product', links: ['Features', 'Pricing', 'Templates', 'API'] },
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
