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
            {/* Score Section */}
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

            {/* Summary */}
            <div className="summary-card">
              <p className="summary-text">{analysis.professional_summary}</p>
            </div>

            {/* Skills */}
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

            {/* Strengths & Weaknesses */}
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

            {/* Skill Gaps */}
            <SectionCard icon="bi-exclamation-triangle-fill" title="Skill Gaps" color="warning">
              <div className="tag-cloud">
                {analysis.skill_gap_analysis?.map((g, i) => <span key={i} className="tag tag-danger">{g}</span>)}
              </div>
            </SectionCard>

            {/* Keywords */}
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

            {/* Improvements */}
            <SectionCard icon="bi-lightbulb-fill" title="Actionable Improvements" color="success">
              <ol className="improvement-list">
                {analysis.actionable_improvements?.map((item, i) => (
                  <li key={i}><span className="improvement-num">{i + 1}</span>{item}</li>
                ))}
              </ol>
            </SectionCard>

            {/* Bullet Rewrites */}
            <SectionCard icon="bi-pencil-fill" title="Bullet Point Optimization" color="info">
              {analysis.bullet_point_rewriting?.map((b, i) => (
                <div key={i} className="bullet-rewrite">
                  <div className="bullet-old"><i className="bi bi-x-lg me-2 text-danger"></i><del>{b.old}</del></div>
                  <div className="bullet-new"><i className="bi bi-check-lg me-2 text-success"></i>{b.new}</div>
                </div>
              ))}
            </SectionCard>

            {/* Job Role Matching */}
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
                  </div>
                ))}
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
