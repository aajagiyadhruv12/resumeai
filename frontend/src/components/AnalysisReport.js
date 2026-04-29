import React, { useState } from 'react';
import { apiService } from '../services/apiService';

/* ─── Resume Parser Helpers ─── */
const SECTION_KEYWORDS = [
  'experience','education','skills','projects','summary','objective',
  'certifications','awards','publications','languages','interests',
  'volunteer','references','achievements','profile','work experience',
  'technical skills','professional experience','contact','about',
  'core competencies','key skills','career objective','professional summary',
  'internship','internships','training','extracurricular','activities',
  'hobbies','declaration','personal details','personal information',
  'work history','employment','qualifications','accomplishments'
];

const isSectionHeader = (line) => {
  const t = line.trim();
  if (!t || t.length > 65) return false;
  const lower = t.toLowerCase().replace(/[:\-_*#=~•]+/g, '').trim();
  if (SECTION_KEYWORDS.some(h => lower === h || lower.startsWith(h + ' '))) return true;
  if (t === t.toUpperCase() && t.length > 3 && t.length < 55 && /[A-Z]{2}/.test(t) && !/\d{4}/.test(t)) return true;
  return false;
};

const isNameLine = (line, idx) => {
  const t = line.trim();
  return idx === 0 && t.length > 1 && t.length < 72
    && !t.includes('@') && !t.includes('|') && !t.includes('http') && !/^\d/.test(t);
};

const isContactLine = (line) => {
  const l = line.toLowerCase();
  return l.includes('@') || l.includes('linkedin') || l.includes('github')
    || l.includes('phone') || l.includes('mobile') || l.includes('email')
    || /\+?\d[\d\s\-().]{7,}/.test(l) || l.includes('|') || l.includes('•')
    || /^https?:\/\//i.test(line.trim());
};

const isBullet = (line) => /^\s*[-•*▪◦►▶→✓✔]\s/.test(line);

const isSkillsLine = (line) => {
  const t = line.trim();
  return (t.includes(',') && t.split(',').length >= 3 && t.length < 300 && !isBullet(t));
};

const isDateOrMeta = (line) => {
  const l = line.toLowerCase().trim();
  return /\b(19|20)\d{2}\b/.test(l)
    || /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(l)
    || /\b(present|current|ongoing|till date)\b/i.test(l)
    || /^(gpa|cgpa|percentage|grade|batch|duration|location|city|state):/i.test(l);
};

/* contact icon map */
const contactIcon = (part) => {
  const l = part.toLowerCase();
  if (l.includes('linkedin')) return 'bi-linkedin';
  if (l.includes('github')) return 'bi-github';
  if (l.includes('@')) return 'bi-envelope-fill';
  if (/\+?\d[\d\s\-().]{6,}/.test(l)) return 'bi-telephone-fill';
  if (l.includes('http') || l.includes('www')) return 'bi-globe2';
  return 'bi-geo-alt-fill';
};

const ResumeRenderer = ({ text }) => {
  const lines = text.split('\n');
  const elements = [];
  let i = 0;
  let nameFound = false;
  let contactBlock = [];
  let inContactZone = true;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { i++; continue; }

    /* ── Name ── */
    if (!nameFound && isNameLine(trimmed, i)) {
      elements.push(<div key={`name-${i}`} className="rv-name">{trimmed}</div>);
      nameFound = true; i++; continue;
    }

    /* ── Contact zone ── */
    if (nameFound && inContactZone && isContactLine(trimmed) && !isSectionHeader(trimmed)) {
      contactBlock.push(trimmed); i++; continue;
    }
    if (contactBlock.length > 0) {
      const parts = contactBlock.join(' | ').split(/[|•]/).map(p => p.trim()).filter(Boolean);
      elements.push(
        <div key={`contact-${i}`} className="rv-contact">
          {parts.map((p, j) => (
            <span key={j} className="rv-contact-item">
              <i className={`bi ${contactIcon(p)}`}></i>{p}
            </span>
          ))}
        </div>
      );
      contactBlock = [];
    }
    inContactZone = false;

    /* ── Section header ── */
    if (isSectionHeader(trimmed)) {
      const label = trimmed.replace(/[:#*_=~]+/g, '').trim();
      elements.push(<div key={`sec-${i}`} className="rv-section-header"><span>{label}</span></div>);
      i++; continue;
    }

    /* ── Skills as pill tags ── */
    if (isSkillsLine(trimmed)) {
      const pills = trimmed.split(',').map(s => s.trim()).filter(Boolean);
      elements.push(
        <div key={`skills-${i}`} className="rv-skills-row">
          {pills.map((p, j) => <span key={j} className="rv-skill-pill">{p}</span>)}
        </div>
      );
      i++; continue;
    }

    /* ── Bullet list ── */
    if (isBullet(trimmed)) {
      const bullets = [];
      while (i < lines.length) {
        const bl = lines[i].trim();
        if (!bl) { i++; break; }
        if (isSectionHeader(bl)) break;
        if (isBullet(lines[i]) || (bullets.length > 0 && !isSectionHeader(bl) && !isContactLine(bl))) {
          bullets.push(bl.replace(/^[-•*▪◦►▶→✓✔]\s*/, ''));
          i++;
        } else break;
      }
      if (bullets.length)
        elements.push(
          <ul key={`ul-${i}`} className="rv-bullets">
            {bullets.map((b, j) => <li key={j}>{b}</li>)}
          </ul>
        );
      continue;
    }

    /* ── Date / meta line ── */
    if (isDateOrMeta(trimmed)) {
      elements.push(<div key={`meta-${i}`} className="rv-meta">{trimmed}</div>);
      i++; continue;
    }

    /* ── Entry title ── */
    elements.push(<div key={`title-${i}`} className="rv-entry-title">{trimmed}</div>);
    i++;
  }

  /* flush leftover contact */
  if (contactBlock.length > 0) {
    const parts = contactBlock.join(' | ').split(/[|•]/).map(p => p.trim()).filter(Boolean);
    elements.push(
      <div key="contact-end" className="rv-contact">
        {parts.map((p, j) => (
          <span key={j} className="rv-contact-item">
            <i className={`bi ${contactIcon(p)}`}></i>{p}
          </span>
        ))}
      </div>
    );
  }

  return <div className="rv-body">{elements}</div>;
};

const ScoreRing = ({ score, label, color }) => {
  const radius = 36; const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="score-ring-card">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8"/>
        <circle cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}/>
        <text x="50" y="46" textAnchor="middle" fontSize="18" fontWeight="800" fill={color}>{score}</text>
        <text x="50" y="60" textAnchor="middle" fontSize="9" fill="#94a3b8">/100</text>
      </svg>
      <p className="score-label">{label}</p>
    </div>
  );
};

const SectionCard = ({ icon, title, color, children }) => (
  <div className={`report-section-card border-${color}`}>
    <div className="report-section-title">
      <span className={`section-icon bg-${color}-soft text-${color}`}><i className={`bi ${icon}`}></i></span>
      <h6 className="mb-0 fw-bold">{title}</h6>
    </div>
    {children}
  </div>
);

const AnalysisReport = ({ analysis, resumeText, targetRole, onAnalysisComplete, setLoading, setError }) => {
  const [generatedResume, setGeneratedResume] = useState('');
  const [generating, setGenerating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [customImprovements, setCustomImprovements] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('analysis');

  if (!analysis) return null;

  const handleGenerate = async () => {
    setGenerating(true); 
    setError(null);
    try { 
      const result = await apiService.generateResume(resumeText, analysis, targetRole); 
      if (result && result.generated_resume) {
        setGeneratedResume(result.generated_resume); 
        setActiveTab('generated'); 
      } else {
        throw new Error('No resume content was generated. Please try again.');
      }
    }
    catch (err) { 
      setError(err.message || 'Failed to generate resume.'); 
    } finally { 
      setGenerating(false); 
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true); 
    setError(null);
    try { 
      const result = await apiService.regenerateAnalysis(resumeText, targetRole, customImprovements); 
      if (result) {
        onAnalysisComplete(result, resumeText, targetRole); 
        setCustomImprovements(''); 
        setActiveTab('analysis'); 
      } else {
        throw new Error('Re-analysis failed to return results.');
      }
    }
    catch (err) { 
      setError(err.message || 'Failed to regenerate analysis.'); 
    } finally { 
      setRegenerating(false); 
    }
  };

  const handlePrint = () => {
    const printArea = document.getElementById('resume-print-area');
    if (!printArea) return;
    const win = window.open('', '_blank', 'width=960,height=750');
    win.document.write(`<!DOCTYPE html><html><head><title>Resume</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Lora:wght@400;500;600;700&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
<style>
  @page { size: A4; margin: 0; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 210mm; min-height: 297mm; background: #fff; }

  /* ── NAME ── */
  .rv-name {
    background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
    color: #fff;
    font-family: 'Inter', sans-serif;
    font-size: 28px;
    font-weight: 800;
    letter-spacing: 5px;
    text-align: center;
    padding: 34px 56px 8px;
    text-transform: uppercase;
  }

  /* ── CONTACT ── */
  .rv-contact {
    background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0;
    padding: 6px 56px 26px;
    border-bottom: 3px solid #4f46e5;
  }
  .rv-contact-item {
    display: flex;
    align-items: center;
    gap: 5px;
    font-family: 'Inter', sans-serif;
    font-size: 10.5px;
    color: rgba(255,255,255,0.75);
    padding: 0 14px;
    border-right: 1px solid rgba(255,255,255,0.15);
    white-space: nowrap;
  }
  .rv-contact-item:last-child { border-right: none; }
  .rv-contact-item .bi { font-size: 9px; color: #818cf8; }

  /* ── BODY ── */
  .rv-body {
    font-family: 'Lora', Georgia, serif;
    font-size: 13px;
    color: #1e293b;
    line-height: 1.7;
    padding-bottom: 36px;
  }
  .rv-body > *:not(.rv-name):not(.rv-contact) {
    padding-left: 44px;
    padding-right: 44px;
  }

  /* ── SECTION HEADER ── */
  .rv-section-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 20px 44px 6px;
    page-break-after: avoid;
  }
  .rv-section-header span {
    font-family: 'Inter', sans-serif;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: #4f46e5;
    white-space: nowrap;
  }
  .rv-section-header::after {
    content: '';
    flex: 1;
    height: 2px;
    background: linear-gradient(90deg, #4f46e5 0%, #c7d2fe 60%, transparent 100%);
    border-radius: 2px;
  }

  /* ── ENTRY TITLE ── */
  .rv-entry-title {
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
    margin-top: 10px;
    margin-bottom: 1px;
    padding-left: 44px;
    padding-right: 44px;
    page-break-after: avoid;
  }

  /* ── META ── */
  .rv-meta {
    font-family: 'Inter', sans-serif;
    font-size: 11px;
    color: #64748b;
    font-style: italic;
    margin-bottom: 3px;
    padding-left: 44px;
    padding-right: 44px;
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .rv-meta::before {
    content: '';
    width: 5px;
    height: 5px;
    background: #4f46e5;
    border-radius: 50%;
    flex-shrink: 0;
  }

  /* ── BULLETS ── */
  .rv-bullets {
    list-style: none;
    margin: 4px 0 10px 0;
    padding-left: 58px;
    padding-right: 44px;
    page-break-inside: avoid;
  }
  .rv-bullets li {
    font-size: 12.5px;
    color: #334155;
    margin-bottom: 4px;
    line-height: 1.65;
    position: relative;
    padding-left: 14px;
  }
  .rv-bullets li::before {
    content: '\u25B8';
    position: absolute;
    left: 0;
    color: #4f46e5;
    font-size: 10px;
    top: 3px;
  }

  /* ── SKILL PILLS ── */
  .rv-skills-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 6px 44px 10px;
  }
  .rv-skill-pill {
    background: #eef2ff;
    color: #3730a3;
    border: 1px solid #c7d2fe;
    border-radius: 20px;
    padding: 3px 11px;
    font-family: 'Inter', sans-serif;
    font-size: 11px;
    font-weight: 500;
  }
</style>
</head><body>${printArea.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 700);
  };

  const handleCopy = () => { navigator.clipboard.writeText(generatedResume); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([generatedResume], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = "Improved_Resume.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const isStrong = analysis.final_verdict?.toLowerCase().includes('strong');

  return (
    <div className="report-wrapper">
      {/* Tab Bar */}
      <div className="report-tab-bar">
        {[
          { id: 'analysis', icon: 'bi-bar-chart-fill', label: 'Analysis' },
          { id: 'generated', icon: 'bi-file-earmark-text-fill', label: 'Generated Resume', badge: generatedResume ? 'Ready' : null },
          { id: 'regenerate', icon: 'bi-arrow-repeat', label: 'Regenerate' },
        ].map(tab => (
          <button key={tab.id} className={`report-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
            <i className={`bi ${tab.icon} me-2`}></i>{tab.label}
            {tab.badge && <span className="tab-badge">{tab.badge}</span>}
          </button>
        ))}
      </div>

      <div className="report-body">

        {/* ── ANALYSIS TAB ── */}
        {activeTab === 'analysis' && (
          <div>
            {/* 1. Overall Score & 2. ATS Score */}
            <div className="scores-section">
              <div className="scores-grid">
                <ScoreRing score={analysis.overall_score} label="Overall Score" color="#4f46e5" />
                <ScoreRing score={analysis.ats_score} label="ATS Score" color="#06b6d4" />
              </div>
              <div className="verdict-pill" style={isStrong ? { background: '#f0fdf4', borderColor: '#10b981', color: '#065f46' } : { background: '#fffbeb', borderColor: '#f59e0b', color: '#92400e' }}>
                <i className={`bi ${isStrong ? 'bi-patch-check-fill' : 'bi-info-circle-fill'} me-2`}></i>
                <strong>Verdict:</strong>&nbsp;{analysis.final_verdict}
              </div>
            </div>

            {/* 15. Professional Summary */}
            <div className="summary-card" style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}>
              <div className="d-flex align-items-center gap-2 mb-3">
                <i className="bi bi-person-badge"></i>
                <span className="text-white-50 text-uppercase small fw-bold" style={{ letterSpacing: '1px' }}>Professional Summary</span>
              </div>
              <p className="summary-text">{analysis.professional_summary}</p>
            </div>

            {/* 3. Skills Extraction */}
            <div className="two-col-grid">
              <SectionCard icon="bi-cpu" title="Technical Skills" color="primary">
                <div className="tag-cloud">
                  {analysis.skills_extraction?.technical_skills?.map((s, i) => <span key={i} className="tag tag-primary">{s}</span>)}
                </div>
              </SectionCard>
              <SectionCard icon="bi-people" title="Soft Skills" color="warning">
                <div className="tag-cloud">
                  {analysis.skills_extraction?.soft_skills?.map((s, i) => <span key={i} className="tag tag-warning">{s}</span>)}
                </div>
              </SectionCard>
            </div>

            {/* 4. Skill Gap Analysis */}
            <SectionCard icon="bi-exclamation-triangle-fill" title="Skill Gaps" color="warning">
              <div className="tag-cloud">
                {analysis.skill_gap_analysis?.map((g, i) => <span key={i} className="tag tag-danger">{g}</span>)}
              </div>
            </SectionCard>

            {/* 5. Experience Evaluation */}
            <SectionCard icon="bi-briefcase-fill" title="Experience" color="primary">
              <div className="analysis-mini-card">
                <p><strong>Level:</strong> {analysis.experience_evaluation?.career_level}</p>
                <p><strong>Experience:</strong> {analysis.experience_evaluation?.years_of_experience} years</p>
                <p><strong>Impact:</strong> {analysis.experience_evaluation?.impact}</p>
              </div>
              {analysis.experience_evaluation?.weak_bullets?.length > 0 && (
                <div className="mt-3">
                  <p className="text-danger fw-semibold small">Weak Points:</p>
                  <ul className="check-list">
                    {analysis.experience_evaluation?.weak_bullets?.map((b, i) => <li key={i}><i className="bi bi-x-circle-fill text-danger me-2"></i>{b}</li>)}
                  </ul>
                </div>
              )}
              {analysis.experience_evaluation?.suggestions?.length > 0 && (
                <div className="mt-3">
                  <p className="text-success fw-semibold small">Suggestions:</p>
                  <ul className="check-list">
                    {analysis.experience_evaluation?.suggestions?.map((s, i) => <li key={i}><i className="bi bi-check-circle-fill text-success me-2"></i>{s}</li>)}
                  </ul>
                </div>
              )}
            </SectionCard>

            {/* 6. Projects Evaluation */}
            <SectionCard icon="bi-rocket-takeoff" title="Projects" color="info">
              <div className="analysis-mini-card">
                <p><strong>Project Count:</strong> {analysis.projects_evaluation?.project_count}</p>
                <p><strong>Technical Depth:</strong> {analysis.projects_evaluation?.technical_depth}</p>
              </div>
              {analysis.projects_evaluation?.suggestions?.length > 0 && (
                <div className="mt-3">
                  <ul className="check-list">
                    {analysis.projects_evaluation?.suggestions?.map((s, i) => <li key={i}><i className="bi bi-lightbulb-fill text-warning me-2"></i>{s}</li>)}
                  </ul>
                </div>
              )}
            </SectionCard>

            {/* 7. Education Evaluation */}
            <SectionCard icon="bi-graduation-cap" title="Education" color="success">
              <p>{analysis.education_evaluation}</p>
            </SectionCard>

            {/* 8. Resume Structure & Formatting */}
            <SectionCard icon="bi-layout-text-sidebar-reverse" title="Structure & Formatting" color="info">
              <p>{analysis.structure_formatting}</p>
            </SectionCard>

            {/* 9. Keyword & ATS Optimization */}
            <SectionCard icon="bi-key-fill" title="ATS Keywords" color="info">
              <p className="section-sublabel">Missing Keywords</p>
              <div className="tag-cloud mb-2">
                {analysis.keyword_ats_optimization?.missing_keywords?.map((k, i) => <span key={i} className="tag tag-danger">{k}</span>)}
              </div>
              <p className="section-sublabel">Suggested Keywords</p>
              <div className="tag-cloud">
                {analysis.keyword_ats_optimization?.suggested_keywords?.map((k, i) => <span key={i} className="tag tag-success">{k}</span>)}
              </div>
            </SectionCard>

            {/* 10. Strengths & 11. Weaknesses */}
            <div className="two-col-grid">
              <SectionCard icon="bi-hand-thumbs-up-fill" title="Strengths" color="success">
                <ul className="check-list">
                  {analysis.strengths?.map((s, i) => <li key={i}><i className="bi bi-check-circle-fill text-success me-2"></i>{s}</li>)}
                </ul>
              </SectionCard>
              <SectionCard icon="bi-hand-thumbs-down-fill" title="Weaknesses" color="danger">
                <ul className="check-list">
                  {analysis.weaknesses?.map((w, i) => <li key={i}><i className="bi bi-x-circle-fill text-danger me-2"></i>{w}</li>)}
                </ul>
              </SectionCard>
            </div>

            {/* 12. Actionable Improvements */}
            <SectionCard icon="bi-lightbulb-fill" title="Actionable Improvements" color="success">
              <ol className="improvement-list">
                {analysis.actionable_improvements?.map((item, i) => (
                  <li key={i}><span className="improvement-num">{i + 1}</span>{item}</li>
                ))}
              </ol>
            </SectionCard>

            {/* 13. Job Role Matching */}
            {analysis.job_role_matching?.length > 0 && (
              <SectionCard icon="bi-briefcase-fill" title="Job Role Matching" color="primary">
                {analysis.job_role_matching.map((j, i) => (
                  <div key={i} className="role-match-item">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="fw-semibold small">{j.role}</span>
                      <span className="fw-bold small" style={{ color: j.match_percentage >= 70 ? '#10b981' : j.match_percentage >= 40 ? '#f59e0b' : '#ef4444' }}>{j.match_percentage}%</span>
                    </div>
                    <div className="match-bar">
                      <div className="match-fill" style={{ width: `${j.match_percentage}%`, background: j.match_percentage >= 70 ? '#10b981' : j.match_percentage >= 40 ? '#f59e0b' : '#ef4444' }}></div>
                    </div>
                    {j.reason && <p className="text-muted small mt-2 mb-0">{j.reason}</p>}
                  </div>
                ))}
              </SectionCard>
            )}

            {/* 14. Bullet Point Rewriting */}
            <SectionCard icon="bi-pencil-fill" title="Bullet Rewriting" color="info">
              {analysis.bullet_point_rewriting?.map((b, i) => (
                <div key={i} className="bullet-rewrite">
                  <div className="bullet-old"><i className="bi bi-x-lg me-2 text-danger"></i><del>{b.old}</del></div>
                  <div className="bullet-new"><i className="bi bi-check-lg me-2 text-success"></i>{b.new}</div>
                </div>
              ))}
            </SectionCard>

            {/* Enhanced Projects */}
            {analysis.enhanced_projects?.project_improvements?.length > 0 && (
              <SectionCard icon="bi-rocket-takeoff" title="Project Improvements" color="primary">
                {analysis.enhanced_projects.project_improvements.map((proj, i) => (
                  <div key={i} className="bullet-rewrite">
                    <div className="bullet-old"><i className="bi bi-x-lg me-2 text-danger"></i><strong>{proj.project_name}:</strong> {proj.current_description}</div>
                    <div className="bullet-new"><i className="bi bi-check-lg me-2 text-success"></i><strong>Improved:</strong> {proj.improved_description}</div>
                  </div>
                ))}
                {analysis.enhanced_projects.project_suggestions?.length > 0 && (
                  <div className="mt-3">
                    <p className="fw-semibold small mb-2">Suggested Projects:</p>
                    {analysis.enhanced_projects.project_suggestions.map((proj, i) => (
                      <div key={i} className="analysis-mini-card mb-2">
                        <strong>{proj.suggested_project}</strong>
                        <p className="small mb-1 text-muted">{proj.tech_stack}</p>
                        <span className="badge bg-success">{proj.impact}</span>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            )}

            {/* ── ENHANCED ANALYSIS SECTIONS ── */}

            {/* Quantified Achievements */}
            {analysis.quantified_achievements && (
              <SectionCard icon="bi-graph-up-arrow" title="Quantified Achievements Analysis" color="success">
                <div className="analysis-mini-card">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="text-muted small">Achievement Score</span>
                    <span className="score-badge">{analysis.quantified_achievements.score}/100</span>
                  </div>
                  <p className="mb-0">{analysis.quantified_achievements.analysis}</p>
                </div>
                {analysis.quantified_achievements.issues?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-danger fw-semibold small mb-2">Issues Found:</p>
                    <ul className="check-list">
                      {analysis.quantified_achievements.issues.map((issue, i) => (
                        <li key={i}><i className="bi bi-x-circle-fill text-danger me-2"></i>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.quantified_achievements.examples_of_good_quantification?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-success fw-semibold small mb-2">Good Examples:</p>
                    <ul className="check-list">
                      {analysis.quantified_achievements.examples_of_good_quantification.map((ex, i) => (
                        <li key={i}><i className="bi bi-check-circle-fill text-success me-2"></i>{ex}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </SectionCard>
            )}

            {/* Action Verbs Analysis */}
            {analysis.action_verbs_analysis && (
              <SectionCard icon="bi-chat-quote" title="Action Verbs Analysis" color="info">
                <div className="analysis-mini-card">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="text-muted small">Verbs Score</span>
                    <span className="score-badge">{analysis.action_verbs_analysis.score}/100</span>
                  </div>
                </div>
                <div className="two-col-grid">
                  <div>
                    <p className="text-success fw-semibold small mb-2">Strong Verbs Used:</p>
                    <div className="tag-cloud">
                      {analysis.action_verbs_analysis.strong_verbs?.slice(0, 8).map((v, i) => (
                        <span key={i} className="tag tag-success">{v}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-warning fw-semibold small mb-2">Weak Verbs to Avoid:</p>
                    <div className="tag-cloud">
                      {analysis.action_verbs_analysis.weak_verbs?.slice(0, 8).map((v, i) => (
                        <span key={i} className="tag tag-warning">{v}</span>
                      ))}
                    </div>
                  </div>
                </div>
                {analysis.action_verbs_analysis.suggestions?.length > 0 && (
                  <div className="mt-3">
                    <p className="fw-semibold small mb-2">Suggestions:</p>
                    <ul className="check-list">
                      {analysis.action_verbs_analysis.suggestions.map((s, i) => (
                        <li key={i}><i className="bi bi-lightbulb-fill text-info me-2"></i>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </SectionCard>
            )}

            {/* Contact Info Check */}
            {analysis.contact_info_check && (
              <SectionCard icon="bi-person-badge" title="Contact Information" color="primary">
                <div className={`alert ${analysis.contact_info_check.complete ? 'alert-success' : 'alert-warning'}`} style={{ borderRadius: '12px' }}>
                  <i className={`bi ${analysis.contact_info_check.complete ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2`}></i>
                  {analysis.contact_info_check.complete ? 'Complete' : 'Incomplete'}
                </div>
                {analysis.contact_info_check.missing?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-danger fw-semibold small mb-2">Missing:</p>
                    <div className="tag-cloud">
                      {analysis.contact_info_check.missing.map((m, i) => (
                        <span key={i} className="tag tag-danger">{m}</span>
                      ))}
                    </div>
                  </div>
                )}
                {analysis.contact_info_check.issues?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-warning fw-semibold small mb-2">Issues:</p>
                    <ul className="check-list">
                      {analysis.contact_info_check.issues.map((issue, i) => (
                        <li key={i}><i className="bi bi-exclamation-circle-fill text-warning me-2"></i>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </SectionCard>
            )}

            {/* Resume Length Analysis */}
            {analysis.resume_length_analysis && (
              <SectionCard icon="bi-file-earmark-text" title="Resume Length Optimization" color="warning">
                <div className="analysis-mini-card">
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted small">Current Length</span>
                    <span className="fw-bold">{analysis.resume_length_analysis.current_length}</span>
                  </div>
                  <div className={`mt-3 badge ${analysis.resume_length_analysis.status === 'Optimal' ? 'bg-success' : analysis.resume_length_analysis.status === 'Too Short' ? 'bg-warning' : 'bg-danger'}`}
                       style={{ padding: '8px 16px', borderRadius: '20px', fontSize: '0.9rem' }}>
                    {analysis.resume_length_analysis.status}
                  </div>
                </div>
                {analysis.resume_length_analysis.recommendations?.length > 0 && (
                  <div className="mt-3">
                    <ul className="check-list">
                      {analysis.resume_length_analysis.recommendations.map((rec, i) => (
                        <li key={i}><i className="bi bi-info-circle-fill text-info me-2"></i>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </SectionCard>
            )}

            {/* Section Organization */}
            {analysis.section_organization && (
              <SectionCard icon="bi-layout-split" title="Section Organization" color="info">
                <div className="analysis-mini-card">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="text-muted small">Organization Score</span>
                    <span className="score-badge">{analysis.section_organization.score}/100</span>
                  </div>
                </div>
                {analysis.section_organization.issues?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-danger fw-semibold small mb-2">Issues:</p>
                    <ul className="check-list">
                      {analysis.section_organization.issues.map((issue, i) => (
                        <li key={i}><i className="bi bi-x-circle-fill text-danger me-2"></i>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.section_organization.recommended_order?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-success fw-semibold small mb-2">Recommended Order:</p>
                    <ol style={{ paddingLeft: '20px' }}>
                      {analysis.section_organization.recommended_order.map((section, i) => (
                        <li key={i} className="mb-1">{section}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </SectionCard>
            )}

            {/* Keyword Density Analysis */}
            {analysis.keyword_density_analysis && (
              <SectionCard icon="bi-funnel" title="Keyword Density Analysis" color="primary">
                <div className="two-col-grid">
                  <div>
                    <p className="text-success fw-semibold small mb-2">Top Keywords:</p>
                    <div className="tag-cloud">
                      {analysis.keyword_density_analysis.top_keywords?.slice(0, 6).map((k, i) => (
                        <span key={i} className="tag tag-success">{k}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-warning fw-semibold small mb-2">Overused Keywords:</p>
                    <div className="tag-cloud">
                      {analysis.keyword_density_analysis.overused_keywords?.slice(0, 6).map((k, i) => (
                        <span key={i} className="tag tag-warning">{k}</span>
                      ))}
                    </div>
                  </div>
                </div>
                {analysis.keyword_density_analysis.missing_industry_terms?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-danger fw-semibold small mb-2">Missing Industry Terms:</p>
                    <div className="tag-cloud">
                      {analysis.keyword_density_analysis.missing_industry_terms.map((k, i) => (
                        <span key={i} className="tag tag-danger">{k}</span>
                      ))}
                    </div>
                  </div>
                )}
              </SectionCard>
            )}

            {/* Career Trajectory */}
            {analysis.career_trajectory && (
              <SectionCard icon="bi-graph-up" title="Career Trajectory" color="success">
                <div className="analysis-mini-card">
                  <div className="d-flex align-items-center gap-3">
                    <div className={`score-badge ${analysis.career_trajectory.trend === 'Improving' ? 'text-success' : analysis.career_trajectory.trend === 'Declining' ? 'text-danger' : 'text-warning'}`}
                         style={{ fontSize: '1.3rem' }}>
                      <i className={`bi ${analysis.career_trajectory.trend === 'Improving' ? 'bi-arrow-up-circle-fill' : analysis.career_trajectory.trend === 'Declining' ? 'bi-arrow-down-circle-fill' : 'bi-dash-circle-fill'}`}></i>
                    </div>
                    <span className="fw-bold">{analysis.career_trajectory.trend}</span>
                  </div>
                </div>
                <p className="mt-3">{analysis.career_trajectory.analysis}</p>
                {analysis.career_trajectory.red_flags?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-danger fw-semibold small mb-2">Red Flags:</p>
                    <ul className="check-list">
                      {analysis.career_trajectory.red_flags.map((flag, i) => (
                        <li key={i}><i className="bi bi-exclamation-triangle-fill text-danger me-2"></i>{flag}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </SectionCard>
            )}

            {/* Industry Keywords */}
            {analysis.industry_keywords && (
              <SectionCard icon="bi-bookmark-star" title="Industry Keywords" color="info">
                <div className="analysis-mini-card">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="text-muted small">Industry Score</span>
                    <span className="score-badge">{analysis.industry_keywords.score}/100</span>
                  </div>
                </div>
                <div className="two-col-grid">
                  <div>
                    <p className="text-success fw-semibold small mb-2">Detected:</p>
                    <div className="tag-cloud">
                      {analysis.industry_keywords.detected?.slice(0, 6).map((k, i) => (
                        <span key={i} className="tag tag-success">{k}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-danger fw-semibold small mb-2">Missing:</p>
                    <div className="tag-cloud">
                      {analysis.industry_keywords.missing?.slice(0, 6).map((k, i) => (
                        <span key={i} className="tag tag-danger">{k}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}

            {/* Remote Readiness */}
            {analysis.remote_readiness && (
              <SectionCard icon="bi-house-door" title="Remote Work Readiness" color="success">
                <div className="analysis-mini-card">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="text-muted small">Remote Score</span>
                    <span className="score-badge">{analysis.remote_readiness.score}/100</span>
                  </div>
                </div>
                {analysis.remote_readiness.indicators?.length > 0 && (
                  <div>
                    <p className="text-success fw-semibold small mb-2">Remote Indicators:</p>
                    <div className="tag-cloud">
                      {analysis.remote_readiness.indicators.map((ind, i) => (
                        <span key={i} className="tag tag-success">{ind}</span>
                      ))}
                    </div>
                  </div>
                )}
                {analysis.remote_readiness.missing_remote_skills?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-warning fw-semibold small mb-2">Missing Remote Skills:</p>
                    <div className="tag-cloud">
                      {analysis.remote_readiness.missing_remote_skills.map((skill, i) => (
                        <span key={i} className="tag tag-warning">{skill}</span>
                      ))}
                    </div>
                  </div>
                )}
              </SectionCard>
            )}

            {/* Leadership Indicators */}
            {analysis.leadership_indicators && (
              <SectionCard icon="bi-person-check" title="Leadership Indicators" color="primary">
                <div className="analysis-mini-card">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="text-muted small">Leadership Score</span>
                    <span className="score-badge">{analysis.leadership_indicators.score}/100</span>
                  </div>
                </div>
                {analysis.leadership_indicators.detected?.length > 0 && (
                  <div>
                    <p className="text-success fw-semibold small mb-2">Detected:</p>
                    <div className="tag-cloud">
                      {analysis.leadership_indicators.detected.map((ind, i) => (
                        <span key={i} className="tag tag-success">{ind}</span>
                      ))}
                    </div>
                  </div>
                )}
                {analysis.leadership_indicators.missing?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-warning fw-semibold small mb-2">Missing:</p>
                    <div className="tag-cloud">
                      {analysis.leadership_indicators.missing.map((miss, i) => (
                        <span key={i} className="tag tag-warning">{miss}</span>
                      ))}
                    </div>
                  </div>
                )}
              </SectionCard>
            )}

            {/* Problem Solving Evidence */}
            {analysis.problem_solving_evidence && (
              <SectionCard icon="bi-lightbulb" title="Problem Solving Evidence" color="warning">
                <div className="analysis-mini-card">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="text-muted small">Problem Solving Score</span>
                    <span className="score-badge">{analysis.problem_solving_evidence.score}/100</span>
                  </div>
                </div>
                {analysis.problem_solving_evidence.examples_found?.length > 0 && (
                  <div>
                    <p className="text-success fw-semibold small mb-2">Examples Found:</p>
                    <ul className="check-list">
                      {analysis.problem_solving_evidence.examples_found.map((ex, i) => (
                        <li key={i}><i className="bi bi-check-circle-fill text-success me-2"></i>{ex}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.problem_solving_evidence.missing_patterns?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-warning fw-semibold small mb-2">Missing Patterns:</p>
                    <ul className="check-list">
                      {analysis.problem_solving_evidence.missing_patterns.map((pat, i) => (
                        <li key={i}><i className="bi bi-exclamation-circle-fill text-warning me-2"></i>{pat}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </SectionCard>
            )}

            {/* Communication Skills */}
            {analysis.communication_skills && (
              <SectionCard icon="bi-chat-dots" title="Communication Skills" color="info">
                <div className="analysis-mini-card">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="text-muted small">Communication Score</span>
                    <span className="score-badge">{analysis.communication_skills.score}/100</span>
                  </div>
                </div>
                {analysis.communication_skills.indicators?.length > 0 && (
                  <div>
                    <p className="text-success fw-semibold small mb-2">Indicators:</p>
                    <div className="tag-cloud">
                      {analysis.communication_skills.indicators.map((ind, i) => (
                        <span key={i} className="tag tag-success">{ind}</span>
                      ))}
                    </div>
                  </div>
                )}
                {analysis.communication_skills.weaknesses?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-danger fw-semibold small mb-2">Weaknesses:</p>
                    <div className="tag-cloud">
                      {analysis.communication_skills.weaknesses.map((w, i) => (
                        <span key={i} className="tag tag-danger">{w}</span>
                      ))}
                    </div>
                  </div>
                )}
              </SectionCard>
            )}

            {/* Impact and Results */}
            {analysis.impact_and_results && (
              <SectionCard icon="bi-trophy" title="Impact & Results" color="success">
                <div className="analysis-mini-card">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="text-muted small">Impact Score</span>
                    <span className="score-badge">{analysis.impact_and_results.score}/100</span>
                  </div>
                </div>
                {analysis.impact_and_results.strong_impact_statements?.length > 0 && (
                  <div>
                    <p className="text-success fw-semibold small mb-2">Strong Impact Statements:</p>
                    <ul className="check-list">
                      {analysis.impact_and_results.strong_impact_statements.slice(0, 3).map((stmt, i) => (
                        <li key={i}><i className="bi bi-check-circle-fill text-success me-2"></i>{stmt}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.impact_and_results.weak_impact_statements?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-warning fw-semibold small mb-2">Weak Statements to Improve:</p>
                    <ul className="check-list">
                      {analysis.impact_and_results.weak_impact_statements.slice(0, 3).map((stmt, i) => (
                        <li key={i}><i className="bi bi-arrow-right-circle-fill text-warning me-2"></i>{stmt}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </SectionCard>
            )}

            {/* ATS Formatting Check */}
            {analysis.ats_formatting_check && (
              <SectionCard icon="bi-check2-square" title="ATS Formatting Check" color="info">
                <div className="analysis-mini-card">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="text-muted small">ATS Score</span>
                    <span className="score-badge">{analysis.ats_formatting_check.score}/100</span>
                  </div>
                </div>
                {analysis.ats_formatting_check.issues?.length > 0 && (
                  <div>
                    <p className="text-danger fw-semibold small mb-2">Issues:</p>
                    <ul className="check-list">
                      {analysis.ats_formatting_check.issues.map((issue, i) => (
                        <li key={i}><i className="bi bi-x-circle-fill text-danger me-2"></i>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.ats_formatting_check.recommendations?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-success fw-semibold small mb-2">Recommendations:</p>
                    <ul className="check-list">
                      {analysis.ats_formatting_check.recommendations.map((rec, i) => (
                        <li key={i}><i className="bi bi-check-circle-fill text-success me-2"></i>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </SectionCard>
            )}

            {/* Specificity Analysis */}
            {analysis.specificity_analysis && (
              <SectionCard icon="bi-disc" title="Specificity Analysis" color="warning">
                <div className="analysis-mini-card">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="text-muted small">Specificity Score</span>
                    <span className="score-badge">{analysis.specificity_analysis.score}/100</span>
                  </div>
                </div>
                {analysis.specificity_analysis.vague_statements?.length > 0 && (
                  <div>
                    <p className="text-warning fw-semibold small mb-2">Vague Statements:</p>
                    <ul className="check-list">
                      {analysis.specificity_analysis.vague_statements.slice(0, 3).map((stmt, i) => (
                        <li key={i}><i className="bi bi-exclamation-circle-fill text-warning me-2"></i>{stmt}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.specificity_analysis.specific_alternatives?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-success fw-semibold small mb-2">Specific Alternatives:</p>
                    <ul className="check-list">
                      {analysis.specificity_analysis.specific_alternatives.slice(0, 3).map((alt, i) => (
                        <li key={i}><i className="bi bi-check-circle-fill text-success me-2"></i>{alt}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </SectionCard>
            )}

            {/* Competitive Analysis */}
            {analysis.competitive_analysis && (
              <SectionCard icon="bi-bar-chart-steps" title="Competitive Analysis" color="primary">
                <div className="analysis-mini-card">
                  <p className="text-muted small mb-2">Market Position</p>
                  <p className="fw-semibold mb-0">{analysis.competitive_analysis.market_position}</p>
                </div>
                <div className="analysis-mini-card mt-3">
                  <p className="text-muted small mb-2">Unique Value Proposition</p>
                  <p className="fw-semibold mb-0">{analysis.competitive_analysis.unique_value_proposition}</p>
                </div>
                {analysis.competitive_analysis.differentiation_opportunities?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-success fw-semibold small mb-2">Differentiation Opportunities:</p>
                    <ul className="check-list">
                      {analysis.competitive_analysis.differentiation_opportunities.map((opp, i) => (
                        <li key={i}><i className="bi bi-star-fill text-warning me-2"></i>{opp}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </SectionCard>
            )}

            {/* Interview Readiness */}
            {analysis.interview_readiness && (
              <SectionCard icon="bi-chat-square-quote" title="Interview Readiness" color="success">
                <div className="analysis-mini-card">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="text-muted small">Interview Readiness Score</span>
                    <span className="score-badge">{analysis.interview_readiness.score}/100</span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="text-muted small">Coding Challenge Likelihood:</span>
                    <span className={`badge ${analysis.interview_readiness.coding_challenge_likelihood === 'High' ? 'bg-danger' : analysis.interview_readiness.coding_challenge_likelihood === 'Medium' ? 'bg-warning' : 'bg-success'}`}>
                      {analysis.interview_readiness.coding_challenge_likelihood}
                    </span>
                  </div>
                </div>
                {analysis.interview_readiness.technical_areas_strong?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-success fw-semibold small mb-2">Technical Areas Strong:</p>
                    <div className="tag-cloud">
                      {analysis.interview_readiness.technical_areas_strong.map((area, i) => (
                        <span key={i} className="tag tag-success">{area}</span>
                      ))}
                    </div>
                  </div>
                )}
                {analysis.interview_readiness.technical_areas_weak?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-warning fw-semibold small mb-2">Technical Areas to Strengthen:</p>
                    <div className="tag-cloud">
                      {analysis.interview_readiness.technical_areas_weak.map((area, i) => (
                        <span key={i} className="tag tag-warning">{area}</span>
                      ))}
                    </div>
                  </div>
                )}
                {analysis.interview_readiness.behavioral_questions_likely?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-info fw-semibold small mb-2">Likely Behavioral Questions:</p>
                    <ul className="check-list">
                      {analysis.interview_readiness.behavioral_questions_likely.map((q, i) => (
                        <li key={i}><i className="bi bi-question-circle text-info me-2"></i>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </SectionCard>
            )}

            {/* Resume Brand Assessment */}
            {analysis.resume_brand_assessment && (
              <SectionCard icon="bi-briefcase" title="Resume Brand Assessment" color="info">
                <div className="alert" style={{ borderRadius: '12px', background: analysis.resume_brand_assessment.consistent_message ? 'var(--success-soft)' : 'var(--warning-soft)' }}>
                  <i className={`bi ${analysis.resume_brand_assessment.consistent_message ? 'bi-check-circle-fill text-success' : 'bi-exclamation-triangle-fill text-warning'} me-2`}></i>
                  {analysis.resume_brand_assessment.consistent_message ? 'Consistent Message' : 'Inconsistent Message'}
                </div>
                <div className="analysis-mini-card mt-3">
                  <p className="text-muted small mb-2">Career Narrative</p>
                  <p className="mb-0">{analysis.resume_brand_assessment.career_narrative}</p>
                </div>
                {analysis.resume_brand_assessment.brand_gaps?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-danger fw-semibold small mb-2">Brand Gaps to Address:</p>
                    <ul className="check-list">
                      {analysis.resume_brand_assessment.brand_gaps.map((gap, i) => (
                        <li key={i}><i className="bi bi-x-circle-fill text-danger me-2"></i>{gap}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </SectionCard>
            )}

            <button className="btn-generate w-100 mt-3" onClick={handleGenerate} disabled={generating}>
              {generating ? <><span className="spinner-border spinner-border-sm me-2"></span>Generating...</> : <><i className="bi bi-stars me-2"></i>Generate Improved Resume</>}
            </button>
          </div>
        )}

        {/* ── GENERATED RESUME TAB ── */}
        {activeTab === 'generated' && (
          <div>
            <div className="generated-header">
              <h5 className="fw-bold mb-0"><i className="bi bi-file-earmark-person me-2 text-primary"></i>AI-Generated Resume</h5>
              <div className="d-flex gap-2">
                <button className="btn-icon" onClick={handleGenerate} disabled={generating} title="Regenerate">
                  {generating ? <span className="spinner-border spinner-border-sm"></span> : <i className="bi bi-arrow-clockwise"></i>}
                </button>
                {generatedResume && <>
                  <button className="btn-icon success" onClick={handleCopy} title="Copy">
                    <i className={`bi ${copied ? 'bi-check-lg' : 'bi-clipboard'}`}></i>
                  </button>
                  <button className="btn-icon info" onClick={handleDownload} title="Download TXT">
                    <i className="bi bi-download"></i>
                  </button>
                  <button className="btn-icon primary" onClick={handlePrint} title="Print / Save PDF">
                    <i className="bi bi-printer"></i>
                  </button>
                </>}
              </div>
            </div>

            {!generatedResume ? (
              <div className="empty-state">
                <div className="empty-icon"><i className="bi bi-file-earmark-plus"></i></div>
                <h5>No Resume Generated Yet</h5>
                <p className="text-muted">Click below to generate an AI-improved version of your resume</p>
                <button className="btn-generate" onClick={handleGenerate} disabled={generating}>
                  {generating ? <><span className="spinner-border spinner-border-sm me-2"></span>Generating...</> : <><i className="bi bi-stars me-2"></i>Generate Improved Resume</>}
                </button>
              </div>
            ) : (
              <div className="resume-preview-wrapper">
                <div className="resume-preview-toolbar">
                  <span className="resume-preview-label"><i className="bi bi-file-earmark-text me-2"></i>Resume Preview</span>
                  <span className="resume-preview-hint"><i className="bi bi-printer me-1"></i>Use Print button to save as PDF</span>
                </div>
                <div className="resume-paper" id="resume-print-area">
                  <ResumeRenderer text={generatedResume} />
                </div>
                <details className="mt-3">
                  <summary className="edit-raw-toggle"><i className="bi bi-pencil-square me-1"></i>Edit raw text</summary>
                  <textarea className="form-control font-monospace mt-2" style={{ minHeight: '300px', fontSize: '12px' }}
                    value={generatedResume} onChange={(e) => setGeneratedResume(e.target.value)} />
                </details>
              </div>
            )}
          </div>
        )}

        {/* ── REGENERATE TAB ── */}
        {activeTab === 'regenerate' && (
          <div>
            <div className="regenerate-header">
              <div className="regen-icon"><i className="bi bi-arrow-repeat"></i></div>
              <div>
                <h5 className="fw-bold mb-1">Regenerate Analysis</h5>
                <p className="text-muted small mb-0">Add custom notes and re-run AI analysis with your improvements applied.</p>
              </div>
            </div>

            <div className="current-scores-bar">
              <div className="current-score-item">
                <span>Overall Score</span>
                <strong style={{ color: '#4f46e5' }}>{analysis.overall_score}/100</strong>
              </div>
              <div className="score-divider"></div>
              <div className="current-score-item">
                <span>ATS Score</span>
                <strong style={{ color: '#06b6d4' }}>{analysis.ats_score}/100</strong>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">Custom Improvements / Notes</label>
              <textarea className="form-control" rows={6}
                placeholder={`e.g.\n- Add Docker and Kubernetes to skills\n- Emphasize leadership experience\n- Include more quantified achievements\n- Target a senior-level position`}
                value={customImprovements} onChange={(e) => setCustomImprovements(e.target.value)} />
              <div className="form-text mt-1"><i className="bi bi-info-circle me-1"></i>These notes will be sent to the AI for a fresh analysis.</div>
            </div>

            <button className="btn-generate w-100" onClick={handleRegenerate} disabled={regenerating}>
              {regenerating ? <><span className="spinner-border spinner-border-sm me-2"></span>Re-analyzing...</> : <><i className="bi bi-arrow-repeat me-2"></i>Regenerate Analysis</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisReport;
