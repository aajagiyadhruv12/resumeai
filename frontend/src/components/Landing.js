import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

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

/* ─── FAQ Data ─── */
const faqs = [
  { q: 'How does the AI analyze my resume?', a: 'Our AI uses advanced language models (GPT-4o / Gemini) to analyze your resume against industry standards, target job roles, and ATS requirements. It evaluates over 20 dimensions including skills, experience, formatting, keywords, and impact.' },
  { q: 'Is my resume data secure?', a: 'Absolutely. All resumes are encrypted in transit and at rest. We use Firebase Cloud Firestore with strict security rules. Your data is never shared with third parties and you can delete it anytime.' },
  { q: 'What file formats are supported?', a: 'We support PDF, DOCX, and plain text files. Our multi-engine parser extracts text even from complex PDF layouts. For best results, use a text-based PDF (not scanned images).' },
  { q: 'Can I customize my resume after AI analysis?', a: 'Yes! Our visual Resume Builder lets you edit every section, drag-reorder entries, choose from 4 professional templates, and get AI suggestions in real-time.' },
  { q: 'How accurate is the ATS score?', a: 'Our ATS scoring simulates real applicant tracking systems used by Fortune 500 companies. It checks keyword density, formatting compatibility, section headers, and bullet point structure for maximum accuracy.' },
  { q: 'Is there a free plan available?', a: 'Yes! Our Free plan includes 3 full resume analyses, basic ATS scoring, and the Resume Builder. Upgrade to Pro for unlimited analyses, interview prep, and cover letter generation.' },
];

/* ─── Testimonials ─── */
const testimonials = [
  { name: 'Sarah Chen', role: 'Software Engineer at Google', text: 'The AI analysis helped me identify exactly what keywords I was missing. My interview call rate tripled after implementing the suggestions. Absolutely invaluable.', avatar: 'SC', rating: 5 },
  { name: 'James Rodriguez', role: 'Product Manager at Stripe', text: 'I was stuck in the resume black hole for months. This tool not only fixed my ATS score but the Resume Builder made my experience sound 10x more impressive.', avatar: 'JR', rating: 5 },
  { name: 'Priya Patel', role: 'Data Scientist at Netflix', text: 'The job matching feature is incredible. I pasted a job description and it showed me exactly what skills to highlight. Landed my dream role in 3 weeks!', avatar: 'PP', rating: 5 },
  { name: 'Michael Thompson', role: 'DevOps Engineer at AWS', text: 'From 55 to 92 ATS score in one revision. The bullet point rewriting alone is worth the price. This is the best resume tool I have ever used.', avatar: 'MT', rating: 5 },
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
  const [openFaq, setOpenFaq] = useState(null);
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

  const plans = [
    { name: 'Free', price: '$0', period: 'forever', desc: 'Perfect for getting started', features: ['3 Resume Analyses', 'Basic ATS Scoring', 'Resume Builder Access', '1 Template'], cta: 'Get Started', popular: false },
    { name: 'Pro', price: '$12', period: '/month', desc: 'For serious job seekers', features: ['Unlimited Analyses', 'Advanced ATS Scoring', 'All 4 Templates', 'Job Match Scoring', 'Cover Letter Generator', 'Interview Prep', 'Priority Support'], cta: 'Start Free Trial', popular: true },
    { name: 'Enterprise', price: '$29', period: '/month', desc: 'For career growth & teams', features: ['Everything in Pro', 'Analytics Dashboard', 'Resume Comparison', 'Recruiter View', 'AI Chat Assistant', 'API Access', 'Team Collaboration'], cta: 'Contact Sales', popular: false },
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
            <button onClick={() => scrollTo('pricing')}>Pricing</button>
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

      {/* ── PRICING ── */}
      <section className="landing-pricing" id="pricing">
        <div className="landing-container">
          <FadeInSection>
            <div className="section-label" style={{ color: 'var(--warning)' }}>Pricing</div>
            <h2 className="section-title">Simple, Transparent <span className="text-warning">Pricing</span></h2>
            <p className="section-subtitle">Start free, upgrade when you need more power</p>
          </FadeInSection>

          <div className="pricing-grid">
            {plans.map((p, i) => (
              <FadeInSection key={i} delay={i * 0.1}>
                <div className={`pricing-card ${p.popular ? 'popular' : ''}`}>
                  {p.popular && <div className="popular-badge">Most Popular</div>}
                  <h3 className="pricing-name">{p.name}</h3>
                  <div className="pricing-price">
                    <span className="price-amount">{p.price}</span>
                    <span className="price-period">{p.period}</span>
                  </div>
                  <p className="pricing-desc">{p.desc}</p>
                  <ul className="pricing-features">
                    {p.features.map((f, j) => (
                      <li key={j}><i className="bi bi-check-circle-fill text-success me-2"></i>{f}</li>
                    ))}
                  </ul>
                  <button className={`btn ${p.popular ? 'btn-primary' : 'btn-secondary'} w-100`} onClick={onGetStarted}>
                    {p.cta}
                  </button>
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
            <p className="section-subtitle">Join thousands who landed their dream roles</p>
          </FadeInSection>

          <div className="testimonials-grid">
            {testimonials.map((t, i) => (
              <FadeInSection key={i} delay={i * 0.1}>
                <div className="testimonial-card">
                  <div className="testimonial-stars">
                    {[...Array(t.rating)].map((_, j) => <i key={j} className="bi bi-star-fill text-warning"></i>)}
                  </div>
                  <p className="testimonial-text">"{t.text}"</p>
                  <div className="testimonial-author">
                    <div className="testimonial-avatar">{t.avatar}</div>
                    <div>
                      <div className="testimonial-name">{t.name}</div>
                      <div className="testimonial-role">{t.role}</div>
                    </div>
                  </div>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="landing-faq" id="faq">
        <div className="landing-container">
          <FadeInSection>
            <div className="section-label" style={{ color: 'var(--accent)' }}>FAQ</div>
            <h2 className="section-title">Frequently Asked <span className="text-danger">Questions</span></h2>
          </FadeInSection>

          <div className="faq-list">
            {faqs.map((faq, i) => (
              <FadeInSection key={i} delay={i * 0.05}>
                <div className={`faq-item ${openFaq === i ? 'open' : ''}`}>
                  <button className="faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                    <span>{faq.q}</span>
                    <i className={`bi ${openFaq === i ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                  </button>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="faq-answer-wrapper"
                      >
                        <p className="faq-answer">{faq.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
