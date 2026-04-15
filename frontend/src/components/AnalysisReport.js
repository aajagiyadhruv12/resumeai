import React, { useState } from 'react';
import { apiService } from '../services/apiService';

// Parses plain text resume into structured professional HTML
const ResumeRenderer = ({ text }) => {
  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  const isSectionHeader = (line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    const headers = [
      'experience', 'education', 'skills', 'projects', 'summary', 'objective',
      'certifications', 'awards', 'publications', 'languages', 'interests',
      'volunteer', 'references', 'achievements', 'profile', 'work experience',
      'technical skills', 'professional experience', 'contact', 'about'
    ];
    const lower = trimmed.toLowerCase().replace(/[:\-_*#]+/g, '').trim();
    return headers.some(h => lower === h || lower.startsWith(h)) && trimmed.length < 50;
  };

  const isNameLine = (line, index) => index === 0 && line.trim().length > 0 && line.trim().length < 60 && !line.includes('@') && !line.includes('|');

  const isContactLine = (line) => {
    const l = line.toLowerCase();
    return l.includes('@') || l.includes('linkedin') || l.includes('github') || l.includes('phone') || /\d{3}[\s.-]\d{3}/.test(l) || l.includes('|');
  };

  const isBullet = (line) => /^[\s]*[-•*▪◦>]\s/.test(line) || /^\s{2,}\S/.test(line);

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { i++; continue; }

    if (isNameLine(trimmed, i)) {
      elements.push(<div key={i} className="resume-name">{trimmed}</div>);
    } else if (isContactLine(trimmed)) {
      elements.push(
        <div key={i} className="resume-contact">
          {trimmed.split(/[|•]/).map((part, j) => (
            <span key={j} className="resume-contact-item">{part.trim()}</span>
          ))}
        </div>
      );
    } else if (isSectionHeader(trimmed)) {
      elements.push(<div key={i} className="resume-section-header">{trimmed.replace(/[:#*_]/g, '').trim()}</div>);
    } else if (isBullet(trimmed)) {
      const bulletLines = [];
      while (i < lines.length && (isBullet(lines[i]) || (lines[i].trim() && !isSectionHeader(lines[i]) && !isContactLine(lines[i])))) {
        if (lines[i].trim()) bulletLines.push(lines[i].trim().replace(/^[-•*▪◦>]\s*/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="resume-bullets">
          {bulletLines.map((b, j) => <li key={j}>{b}</li>)}
        </ul>
      );
      continue;
    } else {
      // Could be a job title / company / date line
      const isDateLine = /\d{4}|present|current|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(trimmed);
      elements.push(
        <div key={i} className={isDateLine ? 'resume-meta' : 'resume-entry-title'}>{trimmed}</div>
      );
    }
    i++;
  }

  return <div className="resume-body">{elements}</div>;
};

const ScoreCircle = ({ score, label, color }) => (
  <div className={`card text-white p-3 text-center bg-${color}`}>
    <h5 className="mb-1">{label}</h5>
    <h1 className="display-4 fw-bold mb-0">{score}</h1>
    <small>/ 100</small>
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
      setGeneratedResume(result.generated_resume);
      setActiveTab('generated');
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setError(null);
    try {
      const result = await apiService.regenerateAnalysis(resumeText, targetRole, customImprovements);
      onAnalysisComplete(result, resumeText, targetRole);
      setCustomImprovements('');
      setActiveTab('analysis');
    } catch (err) {
      setError(err.message);
    } finally {
      setRegenerating(false);
    }
  };

  const handlePrint = () => {
    const printArea = document.getElementById('resume-print-area');
    if (!printArea) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Resume</title>
          <style>
            @page { size: A4; margin: 15mm 18mm; }
            body { font-family: 'Georgia', 'Times New Roman', serif; color: #1a1a1a; line-height: 1.6; margin: 0; padding: 0; }
            .resume-name { font-size: 24px; font-weight: 700; letter-spacing: 1px; text-align: center; color: #0d1b2a; margin-bottom: 6px; text-transform: uppercase; }
            .resume-contact { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px 16px; font-size: 12px; color: #444; margin-bottom: 18px; padding-bottom: 12px; border-bottom: 2px solid #0d1b2a; }
            .resume-contact-item { white-space: nowrap; }
            .resume-section-header { font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #0d1b2a; border-bottom: 1.5px solid #0d1b2a; padding-bottom: 3px; margin-top: 18px; margin-bottom: 8px; }
            .resume-entry-title { font-size: 13.5px; font-weight: 600; color: #1a1a1a; margin-top: 8px; margin-bottom: 2px; }
            .resume-meta { font-size: 12px; color: #555; font-style: italic; margin-bottom: 3px; }
            .resume-bullets { margin: 3px 0 7px 0; padding-left: 18px; }
            .resume-bullets li { font-size: 12.5px; color: #2c2c2c; margin-bottom: 3px; line-height: 1.5; }
          </style>
        </head>
        <body>${printArea.innerHTML}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedResume);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const verdictClass = analysis.final_verdict?.toLowerCase().includes('strong') ? 'alert-success' : 'alert-warning';

  return (
    <div className="card shadow-sm mb-4">
      {/* Tabs */}
      <div className="card-header p-0">
        <ul className="nav nav-tabs border-0">
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'analysis' ? 'active' : ''}`} onClick={() => setActiveTab('analysis')}>
              <i className="bi bi-bar-chart-fill me-1"></i> Analysis Report
            </button>
          </li>
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'generated' ? 'active' : ''}`} onClick={() => setActiveTab('generated')}>
              <i className="bi bi-file-earmark-text-fill me-1"></i> Generated Resume
              {generatedResume && <span className="badge bg-success ms-1">Ready</span>}
            </button>
          </li>
          <li className="nav-item">
            <button className={`nav-link ${activeTab === 'regenerate' ? 'active' : ''}`} onClick={() => setActiveTab('regenerate')}>
              <i className="bi bi-arrow-repeat me-1"></i> Regenerate
            </button>
          </li>
        </ul>
      </div>

      <div className="card-body p-4">

        {/* ── ANALYSIS TAB ── */}
        {activeTab === 'analysis' && (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h4 className="mb-0 fw-bold">Resume Analysis Report</h4>
              <button className="btn btn-success" onClick={handleGenerate} disabled={generating}>
                {generating
                  ? <><span className="spinner-border spinner-border-sm me-2"></span>Generating...</>
                  : <><i className="bi bi-magic me-2"></i>Generate Improved Resume</>}
              </button>
            </div>

            <div className="row g-3 mb-4">
              <div className="col-md-6"><ScoreCircle score={analysis.overall_score} label="Overall Score" color="primary" /></div>
              <div className="col-md-6"><ScoreCircle score={analysis.ats_score} label="ATS Compatibility" color="info" /></div>
            </div>

            {/* Professional Summary */}
            <div className="card p-3 bg-light mb-3">
              <h6 className="fw-bold">Professional Summary</h6>
              <p className="fst-italic mb-0">"{analysis.professional_summary}"</p>
            </div>

            {/* Skills */}
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <div className="card p-3 h-100">
                  <h6 className="fw-bold text-success"><i className="bi bi-check-circle me-1"></i>Technical Skills</h6>
                  {analysis.skills_extraction?.technical_skills?.map((s, i) => (
                    <span key={i} className="badge bg-secondary me-1 mb-1">{s}</span>
                  ))}
                </div>
              </div>
              <div className="col-md-6">
                <div className="card p-3 h-100">
                  <h6 className="fw-bold text-warning"><i className="bi bi-person-check me-1"></i>Soft Skills</h6>
                  {analysis.skills_extraction?.soft_skills?.map((s, i) => (
                    <span key={i} className="badge bg-warning text-dark me-1 mb-1">{s}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <div className="card p-3 h-100 border-success">
                  <h6 className="fw-bold text-success"><i className="bi bi-hand-thumbs-up me-1"></i>Strengths</h6>
                  <ul className="ps-3 mb-0">
                    {analysis.strengths?.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card p-3 h-100 border-danger">
                  <h6 className="fw-bold text-danger"><i className="bi bi-hand-thumbs-down me-1"></i>Weaknesses</h6>
                  <ul className="ps-3 mb-0">
                    {analysis.weaknesses?.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              </div>
            </div>

            {/* Skill Gaps */}
            <div className="card p-3 mb-3 border-warning">
              <h6 className="fw-bold text-warning"><i className="bi bi-exclamation-triangle me-1"></i>Skill Gaps</h6>
              <ul className="ps-3 mb-0">
                {analysis.skill_gap_analysis?.map((g, i) => <li key={i} className="text-danger">{g}</li>)}
              </ul>
            </div>

            {/* Missing Keywords */}
            <div className="card p-3 mb-3">
              <h6 className="fw-bold"><i className="bi bi-key me-1"></i>Missing ATS Keywords</h6>
              <div>
                {analysis.keyword_ats_optimization?.missing_keywords?.map((k, i) => (
                  <span key={i} className="badge bg-danger me-1 mb-1">{k}</span>
                ))}
              </div>
              <h6 className="fw-bold mt-2">Suggested Keywords</h6>
              <div>
                {analysis.keyword_ats_optimization?.suggested_keywords?.map((k, i) => (
                  <span key={i} className="badge bg-success me-1 mb-1">{k}</span>
                ))}
              </div>
            </div>

            {/* Actionable Improvements */}
            <div className="card p-3 mb-3 border-success">
              <h6 className="fw-bold text-success"><i className="bi bi-lightbulb me-1"></i>Actionable Improvements</h6>
              <ol className="ps-3 mb-0">
                {analysis.actionable_improvements?.map((item, i) => <li key={i} className="mb-1">{item}</li>)}
              </ol>
            </div>

            {/* Bullet Point Rewriting */}
            <div className="card p-3 mb-3 border-info">
              <h6 className="fw-bold text-info"><i className="bi bi-pencil-square me-1"></i>Bullet Point Optimization</h6>
              {analysis.bullet_point_rewriting?.map((b, i) => (
                <div key={i} className="mb-3 ps-3 border-start border-3 border-info">
                  <p className="mb-1 text-muted small"><del>{b.old}</del></p>
                  <p className="mb-0 text-success fw-semibold">{b.new}</p>
                </div>
              ))}
            </div>

            {/* Job Role Matching */}
            {analysis.job_role_matching?.length > 0 && (
              <div className="card p-3 mb-3">
                <h6 className="fw-bold"><i className="bi bi-briefcase me-1"></i>Job Role Matching</h6>
                {analysis.job_role_matching.map((j, i) => (
                  <div key={i} className="mb-2">
                    <div className="d-flex justify-content-between">
                      <span>{j.role}</span>
                      <span className="fw-bold">{j.match_percentage}%</span>
                    </div>
                    <div className="progress" style={{ height: '8px' }}>
                      <div
                        className={`progress-bar ${j.match_percentage >= 70 ? 'bg-success' : j.match_percentage >= 40 ? 'bg-warning' : 'bg-danger'}`}
                        style={{ width: `${j.match_percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Final Verdict */}
            <div className={`alert ${verdictClass} text-center`}>
              <h5 className="mb-0">Final Verdict: <strong>{analysis.final_verdict}</strong></h5>
            </div>

            <button className="btn btn-success w-100 mt-2" onClick={handleGenerate} disabled={generating}>
              {generating
                ? <><span className="spinner-border spinner-border-sm me-2"></span>Generating Improved Resume...</>
                : <><i className="bi bi-magic me-2"></i>Generate Improved Resume</>}
            </button>
          </div>
        )}

        {/* ── GENERATED RESUME TAB ── */}
        {activeTab === 'generated' && (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0"><i className="bi bi-file-earmark-text me-2"></i>AI-Generated Improved Resume</h5>
              <div className="d-flex gap-2">
                <button className="btn btn-outline-secondary btn-sm" onClick={handleGenerate} disabled={generating}>
                  {generating ? <span className="spinner-border spinner-border-sm"></span> : <><i className="bi bi-arrow-clockwise me-1"></i>Regenerate</>}
                </button>
                {generatedResume && (
                  <>
                    <button className="btn btn-outline-success btn-sm" onClick={handleCopy}>
                      <i className={`bi ${copied ? 'bi-check-lg' : 'bi-clipboard'} me-1`}></i>
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button className="btn btn-outline-primary btn-sm" onClick={handlePrint}>
                      <i className="bi bi-printer me-1"></i>Print / Save PDF
                    </button>
                  </>
                )}
              </div>
            </div>

            {!generatedResume ? (
              <div className="text-center py-5">
                <i className="bi bi-file-earmark-plus display-1 text-muted"></i>
                <p className="text-muted mt-3">No generated resume yet. Click the button below to generate one.</p>
                <button className="btn btn-success btn-lg" onClick={handleGenerate} disabled={generating}>
                  {generating
                    ? <><span className="spinner-border spinner-border-sm me-2"></span>Generating...</>
                    : <><i className="bi bi-magic me-2"></i>Generate Improved Resume</>}
                </button>
              </div>
            ) : (
              <div className="resume-preview-wrapper">
                <div className="resume-paper" id="resume-print-area">
                  <ResumeRenderer text={generatedResume} />
                </div>
                <div className="mt-3">
                  <details>
                    <summary className="text-muted small" style={{ cursor: 'pointer' }}>Edit raw text</summary>
                    <textarea
                      className="form-control font-monospace mt-2"
                      style={{ minHeight: '300px', fontSize: '12px' }}
                      value={generatedResume}
                      onChange={(e) => setGeneratedResume(e.target.value)}
                    />
                  </details>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── REGENERATE TAB ── */}
        {activeTab === 'regenerate' && (
          <div>
            <h5 className="fw-bold mb-1"><i className="bi bi-arrow-repeat me-2"></i>Regenerate Analysis</h5>
            <p className="text-muted small mb-3">Add your own improvements or notes and re-run the AI analysis with them applied.</p>

            <div className="mb-3">
              <label className="form-label fw-semibold">Custom Improvements / Notes</label>
              <textarea
                className="form-control"
                rows={5}
                placeholder={`e.g.\n- Add Docker and Kubernetes to skills\n- Emphasize leadership experience\n- Include more quantified achievements\n- Target a senior-level position`}
                value={customImprovements}
                onChange={(e) => setCustomImprovements(e.target.value)}
              />
              <div className="form-text">These notes will be sent to the AI along with your resume for a fresh analysis.</div>
            </div>

            {/* Current scores for reference */}
            <div className="row g-2 mb-3">
              <div className="col-6">
                <div className="card p-2 text-center bg-light">
                  <small className="text-muted">Current Overall Score</small>
                  <h4 className="fw-bold text-primary mb-0">{analysis.overall_score}/100</h4>
                </div>
              </div>
              <div className="col-6">
                <div className="card p-2 text-center bg-light">
                  <small className="text-muted">Current ATS Score</small>
                  <h4 className="fw-bold text-info mb-0">{analysis.ats_score}/100</h4>
                </div>
              </div>
            </div>

            <button className="btn btn-primary w-100" onClick={handleRegenerate} disabled={regenerating}>
              {regenerating
                ? <><span className="spinner-border spinner-border-sm me-2"></span>Re-analyzing...</>
                : <><i className="bi bi-arrow-repeat me-2"></i>Regenerate Analysis</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisReport;
