import React, { useState, useCallback, useRef, useEffect } from 'react';
import { apiService } from '../services/apiService';

/* ─── Templates ─── */
const TEMPLATES = [
  { id: 'modern', name: 'Modern', icon: 'bi-layers', desc: 'Clean with accent sidebar' },
  { id: 'professional', name: 'Professional', icon: 'bi-briefcase', desc: 'Traditional corporate' },
  { id: 'creative', name: 'Creative', icon: 'bi-palette', desc: 'Bold colors & flair' },
  { id: 'ats', name: 'ATS Optimized', icon: 'bi-file-earmark-check', desc: 'Simple & scannable' },
];

/* ─── Default Resume Data ─── */
const createDefaultResume = () => ({
  name: '',
  contact: { email: '', phone: '', linkedin: '', github: '', location: '' },
  summary: '',
  skills: { technical: [], soft: [] },
  experience: [
    { id: 'exp-1', company: '', role: '', location: '', startDate: '', endDate: '', bullets: [''] }
  ],
  projects: [
    { id: 'proj-1', name: '', techStack: '', startDate: '', endDate: '', bullets: [''] }
  ],
  education: [
    { id: 'edu-1', degree: '', field: '', university: '', location: '', startYear: '', endYear: '', gpa: '' }
  ],
  certifications: [
    { id: 'cert-1', name: '', issuer: '', year: '' }
  ],
});

/* ─── Helpers ─── */
const genId = () => Math.random().toString(36).substr(2, 9);

/* ─── Section Card Wrapper ─── */
const SectionCard = ({ icon, title, color, children, onAISuggest, aiLoading }) => (
  <div className="rb-section-card">
    <div className="rb-section-header">
      <div className="d-flex align-items-center gap-2">
        <span className={`rb-section-icon bg-${color}-soft text-${color}`}>
          <i className={`bi ${icon}`}></i>
        </span>
        <h6 className="mb-0 fw-bold">{title}</h6>
      </div>
      {onAISuggest && (
        <button className="rb-ai-btn" onClick={onAISuggest} disabled={aiLoading} title="Get AI suggestion">
          {aiLoading ? <span className="spinner-border spinner-border-sm"></span> : <><i className="bi bi-stars"></i> AI</>}
        </button>
      )}
    </div>
    {children}
  </div>
);

/* ─── Tag Input ─── */
const TagInput = ({ tags = [], onChange, placeholder = 'Add item...' }) => {
  const [input, setInput] = useState('');
  const addTag = () => {
    const val = input.trim();
    if (val && !tags.includes(val)) {
      onChange([...tags, val]);
      setInput('');
    }
  };
  return (
    <div className="rb-tag-input-wrapper">
      <div className="rb-tag-list">
        {tags.map((t, i) => (
          <span key={i} className="rb-tag">
            {t}
            <button className="rb-tag-remove" onClick={() => onChange(tags.filter((_, j) => j !== i))}>
              <i className="bi bi-x"></i>
            </button>
          </span>
        ))}
      </div>
      <div className="rb-tag-add-row">
        <input
          className="form-control form-control-sm"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
          placeholder={placeholder}
        />
        <button className="btn btn-sm btn-outline-primary" onClick={addTag} type="button">+</button>
      </div>
    </div>
  );
};

/* ─── Bullet Editor ─── */
const BulletEditor = ({ bullets = [], onChange }) => {
  const addBullet = () => onChange([...bullets, '']);
  const updateBullet = (i, v) => {
    const copy = [...bullets];
    copy[i] = v;
    onChange(copy);
  };
  const removeBullet = (i) => onChange(bullets.filter((_, j) => j !== i));
  return (
    <div className="rb-bullet-editor">
      {bullets.map((b, i) => (
        <div key={i} className="rb-bullet-row">
          <span className="rb-bullet-dot">▸</span>
          <textarea
            className="form-control form-control-sm rb-bullet-input"
            value={b}
            onChange={e => updateBullet(i, e.target.value)}
            rows={1}
            placeholder="Describe your accomplishment..."
          />
          <button className="rb-remove-btn" onClick={() => removeBullet(i)} type="button">
            <i className="bi bi-x-circle"></i>
          </button>
        </div>
      ))}
      <button className="rb-add-bullet-btn" onClick={addBullet} type="button">
        <i className="bi bi-plus-circle me-1"></i> Add bullet
      </button>
    </div>
  );
};

/* ─── AI Suggestion Modal ─── */
const AISuggestionModal = ({ show, onClose, suggestion, loading, onApply, sectionType }) => {
  if (!show) return null;
  return (
    <div className="rb-modal-overlay" onClick={onClose}>
      <div className="rb-modal" onClick={e => e.stopPropagation()}>
        <div className="rb-modal-header">
          <h6 className="mb-0 fw-bold">
            <i className="bi bi-stars me-2 text-primary"></i>
            AI Suggestion {loading ? '' : 'Ready'}
          </h6>
          <button className="rb-close-btn" onClick={onClose}><i className="bi bi-x-lg"></i></button>
        </div>
        <div className="rb-modal-body">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary mb-3" role="status"></div>
              <p className="text-muted">AI is analyzing your content...</p>
            </div>
          ) : suggestion ? (
            <div>
              {suggestion.improved_version && (
                <div className="mb-3">
                  <label className="rb-suggestion-label">Improved Version</label>
                  <div className="rb-suggestion-box">{suggestion.improved_version}</div>
                </div>
              )}
              {suggestion.impact_score !== undefined && (
                <div className="mb-3">
                  <label className="rb-suggestion-label">Impact Score</label>
                  <div className="d-flex align-items-center gap-2">
                    <div className="rb-score-bar">
                      <div className="rb-score-fill" style={{ width: `${suggestion.impact_score}%` }}></div>
                    </div>
                    <span className="fw-bold" style={{ color: suggestion.impact_score >= 70 ? '#10b981' : '#f59e0b' }}>
                      {suggestion.impact_score}/100
                    </span>
                  </div>
                </div>
              )}
              {suggestion.suggestions?.length > 0 && (
                <div className="mb-3">
                  <label className="rb-suggestion-label">Tips</label>
                  <ul className="rb-tips-list">
                    {suggestion.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              {suggestion.keywords?.length > 0 && (
                <div className="mb-3">
                  <label className="rb-suggestion-label">Keywords to Include</label>
                  <div className="d-flex flex-wrap gap-1">
                    {suggestion.keywords.map((k, i) => <span key={i} className="rb-mini-tag">{k}</span>)}
                  </div>
                </div>
              )}
              {suggestion.recommended_skills?.length > 0 && (
                <div className="mb-3">
                  <label className="rb-suggestion-label">Recommended Skills</label>
                  <div className="d-flex flex-wrap gap-1">
                    {suggestion.recommended_skills.map((s, i) => <span key={i} className="rb-mini-tag rb-mini-tag-primary">{s}</span>)}
                  </div>
                </div>
              )}
              {suggestion.bullet_rewrites?.length > 0 && (
                <div className="mb-3">
                  <label className="rb-suggestion-label">Bullet Rewrites</label>
                  {suggestion.bullet_rewrites.map((br, i) => (
                    <div key={i} className="rb-bullet-rewrite">
                      <div className="rb-bullet-old"><del>{br.old}</del></div>
                      <div className="rb-bullet-new">{br.new}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted text-center py-3">No suggestion available.</p>
          )}
        </div>
        {/* Only show Apply button for section types where auto-apply works */}
        {((suggestion?.improved_version && ['summary', 'experience_bullet'].includes(sectionType)) || 
           (suggestion?.recommended_skills?.length > 0 && sectionType === 'skills')) && !loading && (
          <div className="rb-modal-footer">
            <button className="btn btn-outline-secondary btn-sm" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={() => onApply(suggestion.improved_version || '', suggestion)}>
              <i className="bi bi-check-lg me-1"></i> Apply
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Experience Editor ─── */
const ExperienceSection = ({ items, onChange }) => {
  const addItem = () => onChange([...items, { id: genId(), company: '', role: '', location: '', startDate: '', endDate: '', bullets: [''] }]);
  const updateItem = (id, field, val) => onChange(items.map(it => it.id === id ? { ...it, [field]: val } : it));
  const removeItem = (id) => onChange(items.filter(it => it.id !== id));
  const moveItem = (from, to) => {
    if (to < 0 || to >= items.length) return;
    const copy = [...items];
    const [moved] = copy.splice(from, 1);
    copy.splice(to, 0, moved);
    onChange(copy);
  };

  return (
    <div className="rb-repeater">
      {items.map((item, idx) => (
        <div key={item.id} className="rb-repeater-item" draggable="true"
          onDragStart={e => { e.dataTransfer.setData('text/plain', idx); e.currentTarget.classList.add('dragging'); }}
          onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
          onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
          onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('drag-over'); const from = parseInt(e.dataTransfer.getData('text/plain')); moveItem(from, idx); }}>
          <div className="rb-item-header">
            <span className="rb-drag-handle"><i className="bi bi-grip-vertical"></i></span>
            <span className="rb-item-num">{idx + 1}</span>
            <span className="rb-item-preview">{item.company || item.role || 'New Experience'}</span>
            <button className="rb-remove-btn-sm" onClick={() => removeItem(item.id)} type="button"><i className="bi bi-trash3"></i></button>
          </div>
          <div className="rb-item-body">
            <div className="row g-2 mb-2">
              <div className="col-6">
                <input className="form-control form-control-sm" placeholder="Company" value={item.company} onChange={e => updateItem(item.id, 'company', e.target.value)} />
              </div>
              <div className="col-6">
                <input className="form-control form-control-sm" placeholder="Role / Title" value={item.role} onChange={e => updateItem(item.id, 'role', e.target.value)} />
              </div>
            </div>
            <div className="row g-2 mb-2">
              <div className="col-4">
                <input className="form-control form-control-sm" placeholder="Location" value={item.location} onChange={e => updateItem(item.id, 'location', e.target.value)} />
              </div>
              <div className="col-4">
                <input className="form-control form-control-sm" placeholder="Start (e.g. Jan 2020)" value={item.startDate} onChange={e => updateItem(item.id, 'startDate', e.target.value)} />
              </div>
              <div className="col-4">
                <input className="form-control form-control-sm" placeholder="End (e.g. Present)" value={item.endDate} onChange={e => updateItem(item.id, 'endDate', e.target.value)} />
              </div>
            </div>
            <BulletEditor bullets={item.bullets} onChange={v => updateItem(item.id, 'bullets', v)} />
          </div>
        </div>
      ))}
      <button className="rb-add-item-btn" onClick={addItem} type="button">
        <i className="bi bi-plus-circle me-1"></i> Add Experience
      </button>
    </div>
  );
};

/* ─── Projects Editor ─── */
const ProjectsSection = ({ items, onChange }) => {
  const addItem = () => onChange([...items, { id: genId(), name: '', techStack: '', startDate: '', endDate: '', bullets: [''] }]);
  const updateItem = (id, field, val) => onChange(items.map(it => it.id === id ? { ...it, [field]: val } : it));
  const removeItem = (id) => onChange(items.filter(it => it.id !== id));
  const moveItem = (from, to) => {
    if (to < 0 || to >= items.length) return;
    const copy = [...items];
    const [moved] = copy.splice(from, 1);
    copy.splice(to, 0, moved);
    onChange(copy);
  };

  return (
    <div className="rb-repeater">
      {items.map((item, idx) => (
        <div key={item.id} className="rb-repeater-item" draggable="true"
          onDragStart={e => { e.dataTransfer.setData('text/plain', idx); e.currentTarget.classList.add('dragging'); }}
          onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
          onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
          onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('drag-over'); const from = parseInt(e.dataTransfer.getData('text/plain')); moveItem(from, idx); }}>
          <div className="rb-item-header">
            <span className="rb-drag-handle"><i className="bi bi-grip-vertical"></i></span>
            <span className="rb-item-num">{idx + 1}</span>
            <span className="rb-item-preview">{item.name || item.techStack || 'New Project'}</span>
            <button className="rb-remove-btn-sm" onClick={() => removeItem(item.id)} type="button"><i className="bi bi-trash3"></i></button>
          </div>
          <div className="rb-item-body">
            <div className="row g-2 mb-2">
              <div className="col-6">
                <input className="form-control form-control-sm" placeholder="Project Name" value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} />
              </div>
              <div className="col-6">
                <input className="form-control form-control-sm" placeholder="Tech Stack (e.g. React, Node.js)" value={item.techStack} onChange={e => updateItem(item.id, 'techStack', e.target.value)} />
              </div>
            </div>
            <div className="row g-2 mb-2">
              <div className="col-6">
                <input className="form-control form-control-sm" placeholder="Start Date" value={item.startDate} onChange={e => updateItem(item.id, 'startDate', e.target.value)} />
              </div>
              <div className="col-6">
                <input className="form-control form-control-sm" placeholder="End Date" value={item.endDate} onChange={e => updateItem(item.id, 'endDate', e.target.value)} />
              </div>
            </div>
            <BulletEditor bullets={item.bullets} onChange={v => updateItem(item.id, 'bullets', v)} />
          </div>
        </div>
      ))}
      <button className="rb-add-item-btn" onClick={addItem} type="button">
        <i className="bi bi-plus-circle me-1"></i> Add Project
      </button>
    </div>
  );
};

/* ─── Education Editor ─── */
const EducationSection = ({ items, onChange }) => {
  const addItem = () => onChange([...items, { id: genId(), degree: '', field: '', university: '', location: '', startYear: '', endYear: '', gpa: '' }]);
  const updateItem = (id, field, val) => onChange(items.map(it => it.id === id ? { ...it, [field]: val } : it));
  const removeItem = (id) => onChange(items.filter(it => it.id !== id));
  const moveItem = (from, to) => {
    if (to < 0 || to >= items.length) return;
    const copy = [...items];
    const [moved] = copy.splice(from, 1);
    copy.splice(to, 0, moved);
    onChange(copy);
  };

  return (
    <div className="rb-repeater">
      {items.map((item, idx) => (
        <div key={item.id} className="rb-repeater-item" draggable="true"
          onDragStart={e => { e.dataTransfer.setData('text/plain', idx); e.currentTarget.classList.add('dragging'); }}
          onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
          onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
          onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('drag-over'); const from = parseInt(e.dataTransfer.getData('text/plain')); moveItem(from, idx); }}>
          <div className="rb-item-header">
            <span className="rb-drag-handle"><i className="bi bi-grip-vertical"></i></span>
            <span className="rb-item-num">{idx + 1}</span>
            <span className="rb-item-preview">{item.degree || item.field || item.university || 'New Education'}</span>
            <button className="rb-remove-btn-sm" onClick={() => removeItem(item.id)} type="button"><i className="bi bi-trash3"></i></button>
          </div>
          <div className="rb-item-body">
            <div className="row g-2 mb-2">
              <div className="col-6">
                <input className="form-control form-control-sm" placeholder="Degree (e.g. B.S.)" value={item.degree} onChange={e => updateItem(item.id, 'degree', e.target.value)} />
              </div>
              <div className="col-6">
                <input className="form-control form-control-sm" placeholder="Field of Study" value={item.field} onChange={e => updateItem(item.id, 'field', e.target.value)} />
              </div>
            </div>
            <div className="row g-2 mb-2">
              <div className="col-7">
                <input className="form-control form-control-sm" placeholder="University" value={item.university} onChange={e => updateItem(item.id, 'university', e.target.value)} />
              </div>
              <div className="col-5">
                <input className="form-control form-control-sm" placeholder="Location" value={item.location} onChange={e => updateItem(item.id, 'location', e.target.value)} />
              </div>
            </div>
            <div className="row g-2">
              <div className="col-4">
                <input className="form-control form-control-sm" placeholder="Start Year" value={item.startYear} onChange={e => updateItem(item.id, 'startYear', e.target.value)} />
              </div>
              <div className="col-4">
                <input className="form-control form-control-sm" placeholder="End Year" value={item.endYear} onChange={e => updateItem(item.id, 'endYear', e.target.value)} />
              </div>
              <div className="col-4">
                <input className="form-control form-control-sm" placeholder="GPA (optional)" value={item.gpa} onChange={e => updateItem(item.id, 'gpa', e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      ))}
      <button className="rb-add-item-btn" onClick={addItem} type="button">
        <i className="bi bi-plus-circle me-1"></i> Add Education
      </button>
    </div>
  );
};

/* ─── Certifications Editor ─── */
const CertificationsSection = ({ items, onChange }) => {
  const addItem = () => onChange([...items, { id: genId(), name: '', issuer: '', year: '' }]);
  const updateItem = (id, field, val) => onChange(items.map(it => it.id === id ? { ...it, [field]: val } : it));
  const removeItem = (id) => onChange(items.filter(it => it.id !== id));

  return (
    <div className="rb-repeater">
      {items.map((item, idx) => (
        <div key={item.id} className="rb-repeater-item">
          <div className="rb-item-header">
            <span className="rb-item-num">{idx + 1}</span>
            <span className="rb-item-preview">{item.name || item.issuer || 'New Certification'}</span>
            <button className="rb-remove-btn-sm" onClick={() => removeItem(item.id)} type="button"><i className="bi bi-trash3"></i></button>
          </div>
          <div className="rb-item-body">
            <div className="row g-2">
              <div className="col-5">
                <input className="form-control form-control-sm" placeholder="Certification Name" value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} />
              </div>
              <div className="col-4">
                <input className="form-control form-control-sm" placeholder="Issuer (e.g. AWS)" value={item.issuer} onChange={e => updateItem(item.id, 'issuer', e.target.value)} />
              </div>
              <div className="col-3">
                <input className="form-control form-control-sm" placeholder="Year" value={item.year} onChange={e => updateItem(item.id, 'year', e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      ))}
      <button className="rb-add-item-btn" onClick={addItem} type="button">
        <i className="bi bi-plus-circle me-1"></i> Add Certification
      </button>
    </div>
  );
};

/* ══════════════════════════════════════════════
   RESUME PREVIEW - Template Renderers
   ══════════════════════════════════════════════ */

/* ─── Modern Template ─── */
const ModernTemplate = ({ data }) => (
  <div className="rb-preview-modern">
    <div className="rpm-header">
      <h1 className="rpm-name">{data.name || 'Your Name'}</h1>
      <div className="rpm-contact">
        {data.contact.email && <span><i className="bi bi-envelope-fill"></i>{data.contact.email}</span>}
        {data.contact.phone && <span><i className="bi bi-telephone-fill"></i>{data.contact.phone}</span>}
        {data.contact.linkedin && <span><i className="bi bi-linkedin"></i>{data.contact.linkedin}</span>}
        {data.contact.github && <span><i className="bi bi-github"></i>{data.contact.github}</span>}
        {data.contact.location && <span><i className="bi bi-geo-alt-fill"></i>{data.contact.location}</span>}
      </div>
    </div>
    <div className="rpm-body">
      <div className="rpm-sidebar">
        {data.skills.technical.length > 0 && (
          <div className="rpm-side-section">
            <h3>Skills</h3>
            <div className="rpm-skills">
              {data.skills.technical.map((s, i) => <span key={i} className="rpm-skill">{s}</span>)}
              {data.skills.soft.map((s, i) => <span key={i} className="rpm-skill rpm-skill-soft">{s}</span>)}
            </div>
          </div>
        )}
        {data.certifications.some(c => c.name) && (
          <div className="rpm-side-section">
            <h3>Certifications</h3>
            {data.certifications.filter(c => c.name).map((c, i) => (
              <div key={i} className="rpm-cert">
                <strong>{c.name}</strong>
                <span>{c.issuer}{c.year ? ` • ${c.year}` : ''}</span>
              </div>
            ))}
          </div>
        )}
        {data.education.some(e => e.degree || e.field) && (
          <div className="rpm-side-section">
            <h3>Education</h3>
            {data.education.filter(e => e.degree || e.field).map((e, i) => (
              <div key={i} className="rpm-edu-item">
                <strong>{e.degree} {e.field}</strong>
                <span>{e.university}{e.location ? `, ${e.location}` : ''}</span>
                <span className="rpm-edu-years">{e.startYear} - {e.endYear}{e.gpa ? ` | GPA: ${e.gpa}` : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="rpm-main">
        {data.summary && (
          <div className="rpm-section">
            <h3>Professional Summary</h3>
            <p className="rpm-summary-text">{data.summary}</p>
          </div>
        )}
        {data.experience.some(e => e.company || e.role) && (
          <div className="rpm-section">
            <h3>Experience</h3>
            {data.experience.filter(e => e.company || e.role).map((exp, i) => (
              <div key={i} className="rpm-exp-item">
                <div className="rpm-exp-header">
                  <div>
                    <strong>{exp.role || 'Role'}</strong>
                    {exp.company && <span className="rpm-sep"> at </span>}
                    <span className="rpm-company">{exp.company}</span>
                  </div>
                  <span className="rpm-exp-date">{exp.startDate} - {exp.endDate}</span>
                </div>
                {exp.location && <div className="rpm-exp-location"><i className="bi bi-geo-alt"></i>{exp.location}</div>}
                <ul className="rpm-bullets">
                  {exp.bullets.filter(b => b.trim()).map((b, j) => <li key={j}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
        {data.projects.some(p => p.name || p.techStack) && (
          <div className="rpm-section">
            <h3>Projects</h3>
            {data.projects.filter(p => p.name || p.techStack).map((proj, i) => (
              <div key={i} className="rpm-exp-item">
                <div className="rpm-exp-header">
                  <div>
                    <strong>{proj.name || 'Project'}</strong>
                    {proj.techStack && <span className="rpm-project-tech">{proj.techStack}</span>}
                  </div>
                  <span className="rpm-exp-date">{proj.startDate} - {proj.endDate}</span>
                </div>
                <ul className="rpm-bullets">
                  {proj.bullets.filter(b => b.trim()).map((b, j) => <li key={j}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);

/* ─── Professional Template ─── */
const ProfessionalTemplate = ({ data }) => (
  <div className="rb-preview-professional">
    <div className="rpp-header-bar">
      <h1 className="rpp-name">{data.name || 'Your Name'}</h1>
      <div className="rpp-contact-bar">
        {[data.contact.email, data.contact.phone, data.contact.linkedin, data.contact.github, data.contact.location].filter(Boolean).map((item, i) => (
          <span key={i} className="rpp-contact-item">
            {item === data.contact.email && <i className="bi bi-envelope"></i>}
            {item === data.contact.phone && <i className="bi bi-telephone"></i>}
            {item === data.contact.linkedin && <i className="bi bi-linkedin"></i>}
            {item === data.contact.github && <i className="bi bi-github"></i>}
            {item === data.contact.location && <i className="bi bi-geo-alt"></i>}
            {item}
          </span>
        ))}
      </div>
    </div>
    <div className="rpp-body">
      {data.summary && (
        <div className="rpp-section">
          <h3 className="rpp-section-title">Professional Summary</h3>
          <p className="rpp-text">{data.summary}</p>
        </div>
      )}
      {data.skills.technical.length > 0 && (
        <div className="rpp-section">
          <h3 className="rpp-section-title">Technical Skills</h3>
          <div className="rpp-skills-inline">
            <strong>Languages & Frameworks:</strong> {data.skills.technical.join(', ')}
            {data.skills.soft.length > 0 && <><br /><strong>Soft Skills:</strong> {data.skills.soft.join(', ')}</>}
          </div>
        </div>
      )}
      {data.experience.some(e => e.company || e.role) && (
        <div className="rpp-section">
          <h3 className="rpp-section-title">Experience</h3>
          {data.experience.filter(e => e.company || e.role).map((exp, i) => (
            <div key={i} className="rpp-exp-block">
              <div className="rpp-exp-header">
                <div>
                  <span className="rpp-role">{exp.role || 'Role'}</span>
                  {exp.company && <span className="rpp-at">at {exp.company}</span>}
                </div>
                <span className="rpp-date">{exp.startDate} - {exp.endDate}</span>
              </div>
              {exp.location && <div className="rpp-location">{exp.location}</div>}
              <ul className="rpp-bullets">
                {exp.bullets.filter(b => b.trim()).map((b, j) => <li key={j}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
      {data.projects.some(p => p.name || p.techStack) && (
        <div className="rpp-section">
          <h3 className="rpp-section-title">Projects</h3>
          {data.projects.filter(p => p.name || p.techStack).map((proj, i) => (
            <div key={i} className="rpp-exp-block">
              <div className="rpp-exp-header">
                <div>
                  <span className="rpp-role">{proj.name || 'Project'}</span>
                  {proj.techStack && <span className="rpp-at">[{proj.techStack}]</span>}
                </div>
                <span className="rpp-date">{proj.startDate} - {proj.endDate}</span>
              </div>
              <ul className="rpp-bullets">
                {proj.bullets.filter(b => b.trim()).map((b, j) => <li key={j}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
      {data.education.some(e => e.degree || e.field) && (
        <div className="rpp-section">
          <h3 className="rpp-section-title">Education</h3>
          {data.education.filter(e => e.degree || e.field).map((e, i) => (
            <div key={i} className="rpp-edu-item">
              <div className="rpp-exp-header">
                <span className="rpp-role">{e.degree} {e.field}</span>
                <span className="rpp-date">{e.startYear} - {e.endYear}</span>
              </div>
              <div className="rpp-location">{e.university}{e.location ? `, ${e.location}` : ''}{e.gpa ? ` | GPA: ${e.gpa}` : ''}</div>
            </div>
          ))}
        </div>
      )}
      {data.certifications.some(c => c.name) && (
        <div className="rpp-section">
          <h3 className="rpp-section-title">Certifications</h3>
          <ul className="rpp-bullets">
            {data.certifications.filter(c => c.name).map((c, i) => (
              <li key={i}>{c.name}{c.issuer ? ` - ${c.issuer}` : ''}{c.year ? ` (${c.year})` : ''}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  </div>
);

/* ─── Creative Template ─── */
const CreativeTemplate = ({ data }) => (
  <div className="rb-preview-creative">
    <div className="rpc-hero">
      <div className="rpc-hero-content">
        <h1 className="rpc-name">{data.name || 'Your Name'}</h1>
        <p className="rpc-tagline">{data.summary ? data.summary.split('.')[0] : 'Creative Professional'}</p>
        <div className="rpc-hero-contact">
          {data.contact.email && <span><i className="bi bi-envelope"></i> {data.contact.email}</span>}
          {data.contact.phone && <span><i className="bi bi-telephone"></i> {data.contact.phone}</span>}
          {data.contact.linkedin && <span><i className="bi bi-linkedin"></i> {data.contact.linkedin}</span>}
          {data.contact.github && <span><i className="bi bi-github"></i> {data.contact.github}</span>}
        </div>
      </div>
    </div>
    <div className="rpc-body">
      {data.skills.technical.length > 0 && (
        <div className="rpc-section">
          <h3 className="rpc-section-title"><span>✦ Skills</span></h3>
          <div className="rpc-skills-grid">
            {data.skills.technical.map((s, i) => <span key={i} className="rpc-skill-pill">{s}</span>)}
            {data.skills.soft.map((s, i) => <span key={i} className="rpc-skill-pill rpc-skill-soft">{s}</span>)}
          </div>
        </div>
      )}
      {data.experience.some(e => e.company || e.role) && (
        <div className="rpc-section">
          <h3 className="rpc-section-title"><span>✦ Experience</span></h3>
          {data.experience.filter(e => e.company || e.role).map((exp, i) => (
            <div key={i} className="rpc-exp-card">
              <div className="rpc-exp-header">
                <div>
                  <span className="rpc-role">{exp.role || 'Role'}</span>
                  <span className="rpc-company">{exp.company}</span>
                </div>
                <span className="rpc-date">{exp.startDate} - {exp.endDate}</span>
              </div>
              <ul className="rpc-bullets">
                {exp.bullets.filter(b => b.trim()).map((b, j) => <li key={j}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
      {data.projects.some(p => p.name || p.techStack) && (
        <div className="rpc-section">
          <h3 className="rpc-section-title"><span>✦ Projects</span></h3>
          {data.projects.filter(p => p.name || p.techStack).map((proj, i) => (
            <div key={i} className="rpc-exp-card">
              <div className="rpc-exp-header">
                <div>
                  <span className="rpc-role">{proj.name || 'Project'}</span>
                  {proj.techStack && <span className="rpc-tech-badge">{proj.techStack}</span>}
                </div>
                <span className="rpc-date">{proj.startDate} - {proj.endDate}</span>
              </div>
              <ul className="rpc-bullets">
                {proj.bullets.filter(b => b.trim()).map((b, j) => <li key={j}>{b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
      {data.education.some(e => e.degree || e.field) && (
        <div className="rpc-section">
          <h3 className="rpc-section-title"><span>✦ Education</span></h3>
          {data.education.filter(e => e.degree || e.field).map((e, i) => (
            <div key={i} className="rpc-edu-item">
              <span className="rpc-role">{e.degree} {e.field}</span>
              <span className="rpc-edu-school">{e.university} • {e.startYear} - {e.endYear}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

/* ─── ATS Optimized Template ─── */
const ATSTemplate = ({ data }) => (
  <div className="rb-preview-ats">
    <div className="rpats-header">
      <h1 className="rpats-name">{data.name || 'Your Name'}</h1>
      <div className="rpats-contact">
        {data.contact.email} {data.contact.phone ? `| ${data.contact.phone}` : ''} {data.contact.linkedin ? `| ${data.contact.linkedin}` : ''} {data.contact.github ? `| ${data.contact.github}` : ''} {data.contact.location ? `| ${data.contact.location}` : ''}
      </div>
    </div>
    <hr className="rpats-hr" />
    {data.summary && (
      <div className="rpats-section">
        <h3 className="rpats-section-title">PROFESSIONAL SUMMARY</h3>
        <p className="rpats-text">{data.summary}</p>
      </div>
    )}
    {data.skills.technical.length > 0 && (
      <div className="rpats-section">
        <h3 className="rpats-section-title">TECHNICAL SKILLS</h3>
        <p className="rpats-text">{data.skills.technical.join(', ')}{data.skills.soft.length > 0 ? ` | Soft Skills: ${data.skills.soft.join(', ')}` : ''}</p>
      </div>
    )}
    {data.experience.some(e => e.company || e.role) && (
      <div className="rpats-section">
        <h3 className="rpats-section-title">EXPERIENCE</h3>
        {data.experience.filter(e => e.company || e.role).map((exp, i) => (
          <div key={i} className="rpats-exp">
            <div className="rpats-exp-header">
              <strong>{exp.role || 'Role'}, {exp.company}</strong>
              <span>{exp.startDate} - {exp.endDate}</span>
            </div>
            <ul className="rpats-bullets">
              {exp.bullets.filter(b => b.trim()).map((b, j) => <li key={j}>{b}</li>)}
            </ul>
          </div>
        ))}
      </div>
    )}
    {data.education.some(e => e.degree || e.field) && (
      <div className="rpats-section">
        <h3 className="rpats-section-title">EDUCATION</h3>
        {data.education.filter(e => e.degree || e.field).map((e, i) => (
          <div key={i} className="rpats-exp">
            <div className="rpats-exp-header">
              <strong>{e.degree} {e.field}</strong>
              <span>{e.startYear} - {e.endYear}</span>
            </div>
            <div>{e.university}{e.location ? `, ${e.location}` : ''}{e.gpa ? ` | GPA: ${e.gpa}` : ''}</div>
          </div>
        ))}
      </div>
    )}
  </div>
);

/* ══════════════════════════════════════════════
   MAIN RESUME BUILDER COMPONENT
   ══════════════════════════════════════════════ */

const ResumeBuilder = ({ initialResumeText, targetRole = 'Software Engineer', onClose }) => {
  const [resume, setResume] = useState(createDefaultResume());
  const [template, setTemplate] = useState('modern');
  const [aiLoading, setAiLoading] = useState(null);
  const [aiModal, setAiModal] = useState({ show: false, suggestion: null, loading: false, sectionType: null, onApply: null });
  const [exporting, setExporting] = useState(false);
  const previewRef = useRef(null);

  /* ─── Parse initial resume text into the data model ─── */
  useEffect(() => {
    if (initialResumeText) {
      const lines = initialResumeText.split('\n').filter(l => l.trim());
      const parsed = createDefaultResume();

      let currentSection = 'summary';
      let currentExpIdx = -1;
      let currentProjIdx = -1;

      lines.forEach((line, idx) => {
        const t = line.trim();
        const lower = t.toLowerCase();

        // Detect section headers
        if (idx === 0 && t.length < 72 && !t.includes('@') && !t.includes('http')) {
          parsed.name = t;
          return;
        }
        if (lower.includes('summary') || lower.includes('objective') || lower.startsWith('profile')) {
          currentSection = 'summary'; return;
        }
        if (lower.includes('experience') || lower.includes('employment') || lower.includes('work history') || lower.startsWith('work ')) {
          currentSection = 'experience'; return;
        }
        if (lower.includes('project') || lower.startsWith('project')) {
          currentSection = 'projects'; return;
        }
        if (lower.includes('education') || lower.includes('academic') || lower.includes('qualification')) {
          currentSection = 'education'; return;
        }
        if (lower.includes('skill') || lower.includes('competenc') || lower.includes('technology')) {
          currentSection = 'skills'; return;
        }
        if (lower.includes('certif') || lower.includes('licens') || lower.includes('credential')) {
          currentSection = 'certifications'; return;
        }
        if (lower.includes('contact') || lower.includes('personal detail')) {
          currentSection = 'contact'; return;
        }

        // Parse contact info
        if (currentSection === 'contact') {
          if (t.includes('@')) parsed.contact.email = t;
          else if (/^\+?\d[\d\s\-().]{7,}/.test(t)) parsed.contact.phone = t;
          else if (t.toLowerCase().includes('linkedin')) parsed.contact.linkedin = t;
          else if (t.toLowerCase().includes('github')) parsed.contact.github = t;
          else if (/^[A-Za-z\s,]+$/.test(t) && t.length < 50) parsed.contact.location = t;
          // If no section header was detected but line has contact info
          if (!parsed.contact.email && t.includes('@')) parsed.contact.email = t;
          else if (!parsed.contact.phone && /^\+?\d[\d\s\-().]{7,}/.test(t)) parsed.contact.phone = t;
          else if (!parsed.contact.location && /^[A-Za-z\s,]+$/.test(t) && t.length < 60 && t.length > 3) parsed.contact.location = t;
          return;
        }

        // Parse contact from early lines
        if (idx < 5 && (t.includes('@') || t.includes('|') || t.includes('http') || /^\+?\d[\d\s\-().]{7,}/.test(t))) {
          if (t.includes('@')) parsed.contact.email = t.replace(/.*?([\w.+-]+@[\w.-]+\.\w+).*/, '$1');
          if (/^\+?\d[\d\s\-().]{7,}/.test(t)) parsed.contact.phone = t.match(/[+\d][\d\s\-().]{7,}/)?.[0] || t;
          if (t.toLowerCase().includes('linkedin')) parsed.contact.linkedin = t;
          if (t.toLowerCase().includes('github')) parsed.contact.github = t;
          return;
        }

        // Summary
        if (currentSection === 'summary' && t.length > 20) {
          parsed.summary += (parsed.summary ? ' ' : '') + t;
          return;
        }

        // Skills
        if (currentSection === 'skills') {
          const skills = t.split(',').map(s => s.trim()).filter(s => s.length > 0 && s.length < 40 && !s.includes('http'));
          const softKeywords = ['communication', 'teamwork', 'leadership', 'problem.solv', 'critical', 'collaborat', 'adaptab', 'time management', 'organiz', 'creativ', 'interpersonal'];
          skills.forEach(s => {
            const isSoft = softKeywords.some(k => s.toLowerCase().includes(k));
            if (isSoft) {
              if (!parsed.skills.soft.includes(s)) parsed.skills.soft.push(s);
            } else {
              if (!parsed.skills.technical.includes(s)) parsed.skills.technical.push(s);
            }
          });
          return;
        }

        // Experience - detect new entries by company/role patterns
        if (currentSection === 'experience') {
          if (/^[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\s*[-–|]\s*[A-Z]/.test(t) || /^[A-Z][A-Za-z\s&]+(Inc|Corp|Ltd|LLC|Technologies|Tech|Solutions|Services|Group)$/i.test(t)) {
            parsed.experience.push({ id: genId(), company: t, role: '', location: '', startDate: '', endDate: '', bullets: [] });
            currentExpIdx = parsed.experience.length - 1;
            return;
          }
          if (currentExpIdx >= 0) {
            const exp = parsed.experience[currentExpIdx];
            if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(t) || /\b(19|20)\d{2}\b/.test(t)) {
              if (t.includes('-') || t.includes('–')) {
                const parts = t.split(/[-–]/);
                exp.startDate = parts[0].trim();
                exp.endDate = parts[1]?.trim() || '';
              } else if (t.includes('present') || t.includes('current')) {
                exp.endDate = 'Present';
              }
              return;
            }
            if (/^[A-Z][a-zA-Z\s]+$/.test(t) && t.length < 40 && !t.includes('.') && currentExpIdx >= 0 && parsed.experience[currentExpIdx].role === '') {
              parsed.experience[currentExpIdx].role = t;
              return;
            }
            if (/^[-•*▪◦►▶→✓✔]/.test(t) || (t.length > 15 && !t.includes(':') && t[0] !== t[0].toUpperCase())) {
              exp.bullets.push(t.replace(/^[-•*▪◦►▶→✓✔]\s*/, ''));
              return;
            }
            if (t.length > 10 && t !== t.toUpperCase() && !t.startsWith('•')) {
              exp.bullets.push(t);
              return;
            }
          }
          return;
        }

        // Projects
        if (currentSection === 'projects') {
          if (/^[A-Z][A-Za-z0-9\s]+(?:[-–|]\s*[A-Za-z0-9\s,]+)?$/.test(t) && t.length < 60 && !t.endsWith('.')) {
            const parts = t.split(/[-–|]/);
            parsed.projects.push({ id: genId(), name: parts[0].trim(), techStack: parts[1]?.trim() || '', startDate: '', endDate: '', bullets: [] });
            currentProjIdx = parsed.projects.length - 1;
            return;
          }
          if (currentProjIdx >= 0) {
            const proj = parsed.projects[currentProjIdx];
            if (/[-–]/.test(t) && /(19|20)\d{2}/.test(t)) {
              const parts = t.split(/[-–]/);
              proj.startDate = parts[0]?.trim() || '';
              proj.endDate = parts[1]?.trim() || '';
              return;
            }
            if (/^[-•*▪◦►▶→✓✔]/.test(t) || t.length > 15) {
              proj.bullets.push(t.replace(/^[-•*▪◦►▶→✓✔]\s*/, ''));
              return;
            }
          }
          return;
        }

        // Education
        if (currentSection === 'education') {
          if (/^(B\.?[AS]\.?|M\.?[AS]\.?|PhD|Bachelor|Master|Associate|Doctorate|BBA|MBA|B\.?Tech|M\.?Tech)/i.test(t)) {
            parsed.education.push({ id: genId(), degree: t, field: '', university: '', location: '', startYear: '', endYear: '', gpa: '' });
            return;
          }
          if (parsed.education.length > 0) {
            const edu = parsed.education[parsed.education.length - 1];
            if (/^(19|20)\d{2}\s*[-–]\s*(19|20)\d{2}|present/i.test(t)) {
              const parts = t.split(/[-–]/);
              edu.startYear = parts[0]?.trim() || '';
              edu.endYear = parts[1]?.trim() || '';
              return;
            }
            if (/gpa|g.p.a|cgpa/i.test(t)) {
              edu.gpa = t.replace(/.*?(\d+\.?\d*)\s*\/?\s*\d*\.?\d*/i, '$1');
              return;
            }
            if (t.length > 5 && !edu.university) {
              edu.university = t;
              return;
            }
            if (t.includes(',') && t.length < 40) {
              edu.location = t;
              return;
            }
          }
          return;
        }

        // Certifications
        if (currentSection === 'certifications') {
          parsed.certifications.push({ id: genId(), name: t, issuer: '', year: '' });
          return;
        }
      });

      setResume(parsed);
    }
  }, [initialResumeText]);

  /* ─── Update resume sections ─── */
  const updateField = useCallback((section, value) => {
    setResume(prev => ({ ...prev, [section]: value }));
  }, []);

  const updateArrayField = useCallback((section, value) => {
    setResume(prev => ({ ...prev, [section]: value }));
  }, []);

  /* ─── AI Suggestions ─── */
  const handleAISuggest = async (sectionType, currentText, context = '') => {
    setAiModal({ show: true, suggestion: null, loading: true, sectionType, onApply: null });
    try {
      const result = await apiService.getSuggestion(sectionType, currentText, targetRole, context);
      setAiModal(prev => ({ ...prev, suggestion: result, loading: false,
        onApply: (improved, fullSuggestion) => {
          applySuggestion(sectionType, improved, fullSuggestion || result);
          setAiModal(prev => ({ ...prev, show: false }));
        }
      }));
    } catch (err) {
      console.error('AI suggestion failed:', err);
      setAiModal(prev => ({ ...prev, suggestion: { improved_version: 'Failed to get suggestion. Please try again.', suggestions: [] }, loading: false }));
    }
  };

  const applySuggestion = (sectionType, text, suggestion) => {
    if (sectionType === 'summary' && text) {
      setResume(prev => ({ ...prev, summary: text }));
    } else if (sectionType === 'skills' && suggestion?.recommended_skills?.length > 0) {
      setResume(prev => {
        const existing = new Set(prev.skills.technical);
        const newSkills = suggestion.recommended_skills.filter(s => !existing.has(s));
        return { ...prev, skills: { ...prev.skills, technical: [...prev.skills.technical, ...newSkills] } };
      });
    } else if (sectionType === 'experience_bullet' && text) {
      // Apply improved bullet to first experience's last empty bullet
      setResume(prev => {
        if (prev.experience.length === 0) return prev;
        const exp = { ...prev.experience[0] };
        exp.bullets = [...exp.bullets];
        const emptyIdx = exp.bullets.findIndex(b => !b.trim());
        if (emptyIdx >= 0) exp.bullets[emptyIdx] = text;
        else exp.bullets.push(text);
        return { ...prev, experience: [exp, ...prev.experience.slice(1)] };
      });
    } else if ((sectionType === 'experience' || sectionType === 'project' || sectionType === 'education') && text) {
      // These sections just show the suggestion for manual reference
      // Full auto-apply would require knowing which item index to target
    }
  };

  /* ─── Export Resume ─── */
  const handleExport = async (format) => {
    setExporting(true);
    try {
      if (format === 'print') {
        const content = previewRef.current?.innerHTML;
        if (!content) return;
        const win = window.open('', '_blank', 'width=960,height=750');
        const templateStyles = getTemplateStyles(template);
        win.document.write(`<!DOCTYPE html><html><head><title>Resume - ${resume.name || 'Untitled'}</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
<style>${templateStyles}</style>
</head><body>${content}</body></html>`);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); }, 500);
      } else if (format === 'txt') {
        const txt = buildPlainText(resume);
        const blob = new Blob([txt], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${resume.name || 'Resume'}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setExporting(false);
    }
  };

  const getTemplateStyles = (tmpl) => {
    const baseStyles = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Inter', 'Segoe UI', sans-serif; color: #1e293b; line-height: 1.6; padding: 0; background: #fff; }
    `;
    if (tmpl === 'modern') return baseStyles + `
      .rpm-header { background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; padding: 40px 48px 32px; }
      .rpm-name { font-size: 32px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12px; }
      .rpm-contact { display: flex; flex-wrap: wrap; gap: 8px 20px; font-size: 12px; opacity: 0.9; }
      .rpm-contact span { display: flex; align-items: center; gap: 6px; }
      .rpm-contact i { font-size: 11px; }
      .rpm-body { display: flex; }
      .rpm-sidebar { width: 240px; background: #f8fafc; padding: 28px 24px; border-right: 1px solid #e2e8f0; }
      .rpm-main { flex: 1; padding: 28px 36px; }
      .rpm-side-section { margin-bottom: 28px; }
      .rpm-side-section h3 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #6366f1; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; }
      .rpm-skills { display: flex; flex-wrap: wrap; gap: 6px; }
      .rpm-skill { background: #eef2ff; color: #3730a3; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 500; }
      .rpm-skill-soft { background: #fef3c7; color: #92400e; }
      .rpm-cert { margin-bottom: 10px; font-size: 12px; }
      .rpm-cert strong { display: block; font-size: 12px; }
      .rpm-cert span { color: #64748b; font-size: 11px; }
      .rpm-edu-item { margin-bottom: 12px; font-size: 12px; }
      .rpm-edu-item strong { display: block; }
      .rpm-edu-years { color: #64748b; font-size: 11px; }
      .rpm-section { margin-bottom: 24px; }
      .rpm-section h3 { font-size: 13px; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 2px solid #eef2ff; }
      .rpm-summary-text { font-size: 13px; line-height: 1.7; color: #334155; }
      .rpm-exp-item { margin-bottom: 18px; }
      .rpm-exp-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
      .rpm-exp-header strong { font-size: 14px; }
      .rpm-sep { color: #64748b; font-size: 13px; }
      .rpm-company { color: #6366f1; font-weight: 600; font-size: 13px; }
      .rpm-exp-date { font-size: 11px; color: #64748b; white-space: nowrap; }
      .rpm-exp-location { font-size: 11px; color: #94a3b8; margin-bottom: 4px; }
      .rpm-exp-location i { margin-right: 4px; }
      .rpm-bullets { list-style: none; padding-left: 0; margin-top: 6px; }
      .rpm-bullets li { font-size: 12.5px; color: #334155; margin-bottom: 4px; padding-left: 16px; position: relative; line-height: 1.6; }
      .rpm-bullets li::before { content: '▸'; position: absolute; left: 0; color: #6366f1; font-size: 10px; }
      .rpm-project-tech { background: #eef2ff; color: #3730a3; padding: 2px 8px; border-radius: 8px; font-size: 11px; margin-left: 8px; }
    `;
    if (tmpl === 'professional') return baseStyles + `
      .rpp-header-bar { text-align: center; padding: 36px 48px 16px; border-bottom: 3px solid #1e293b; }
      .rpp-name { font-size: 28px; font-weight: 800; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 10px; }
      .rpp-contact-bar { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px 18px; font-size: 11px; color: #64748b; }
      .rpp-contact-item { display: flex; align-items: center; gap: 4px; }
      .rpp-contact-item i { font-size: 10px; }
      .rpp-body { padding: 24px 48px 36px; }
      .rpp-section { margin-bottom: 22px; }
      .rpp-section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #1e293b; border-bottom: 2px solid #1e293b; padding-bottom: 6px; margin-bottom: 12px; }
      .rpp-text { font-size: 13px; line-height: 1.7; color: #334155; }
      .rpp-skills-inline { font-size: 13px; line-height: 1.8; color: #334155; }
      .rpp-exp-block { margin-bottom: 16px; }
      .rpp-exp-header { display: flex; justify-content: space-between; align-items: baseline; }
      .rpp-role { font-weight: 700; font-size: 14px; }
      .rpp-at { font-size: 13px; color: #64748b; margin-left: 4px; }
      .rpp-date { font-size: 11px; color: #64748b; }
      .rpp-location { font-size: 11px; color: #94a3b8; margin-bottom: 4px; }
      .rpp-bullets { margin: 4px 0 0 16px; }
      .rpp-bullets li { font-size: 12.5px; margin-bottom: 3px; color: #334155; line-height: 1.6; }
      .rpp-edu-item { margin-bottom: 12px; }
    `;
    if (tmpl === 'creative') return baseStyles + `
      .rpc-hero { background: linear-gradient(135deg, #ef4444, #db2777); color: white; padding: 48px; text-align: center; }
      .rpc-name { font-size: 36px; font-weight: 800; letter-spacing: 3px; margin-bottom: 8px; }
      .rpc-tagline { font-size: 16px; opacity: 0.85; font-style: italic; margin-bottom: 16px; }
      .rpc-hero-contact { display: flex; justify-content: center; flex-wrap: wrap; gap: 16px; font-size: 12px; opacity: 0.85; }
      .rpc-hero-contact i { margin-right: 4px; }
      .rpc-body { padding: 32px 48px; }
      .rpc-section-title { font-size: 14px; font-weight: 700; margin-bottom: 14px; color: #db2777; }
      .rpc-section-title span { border-bottom: 3px solid #ef4444; padding-bottom: 4px; }
      .rpc-skills-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
      .rpc-skill-pill { background: #fce7f3; color: #be185d; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; }
      .rpc-skill-soft { background: #fef3c7; color: #92400e; }
      .rpc-exp-card { background: #fafafa; border-left: 4px solid #ef4444; padding: 14px 18px; margin-bottom: 14px; border-radius: 0 8px 8px 0; }
      .rpc-exp-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
      .rpc-role { font-weight: 700; font-size: 14px; }
      .rpc-company { color: #64748b; font-size: 13px; margin-left: 6px; }
      .rpc-tech-badge { background: #fce7f3; color: #be185d; padding: 2px 8px; border-radius: 8px; font-size: 11px; margin-left: 8px; }
      .rpc-date { font-size: 11px; color: #94a3b8; }
      .rpc-bullets { list-style: none; padding-left: 12px; margin-top: 6px; }
      .rpc-bullets li { font-size: 12.5px; color: #334155; margin-bottom: 4px; position: relative; padding-left: 14px; line-height: 1.6; }
      .rpc-bullets li::before { content: '✦'; position: absolute; left: 0; color: #ef4444; font-size: 10px; }
      .rpc-edu-item { margin-bottom: 10px; }
      .rpc-edu-school { display: block; font-size: 12px; color: #64748b; }
    `;
    if (tmpl === 'ats') return baseStyles + `
      .rpats-header { padding: 20px 36px 8px; }
      .rpats-name { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
      .rpats-contact { font-size: 11px; color: #475569; }
      .rpats-hr { border: none; border-top: 1px solid #cbd5e1; margin: 8px 36px; }
      .rpats-section { padding: 4px 36px; margin-bottom: 8px; }
      .rpats-section-title { font-size: 11px; font-weight: 700; letter-spacing: 2px; color: #1e293b; margin-bottom: 4px; }
      .rpats-text { font-size: 12.5px; color: #334155; line-height: 1.6; }
      .rpats-exp { margin-bottom: 8px; }
      .rpats-exp-header { display: flex; justify-content: space-between; font-size: 12px; }
      .rpats-bullets { margin: 2px 0 0 14px; }
      .rpats-bullets li { font-size: 12px; color: #475569; margin-bottom: 2px; line-height: 1.5; }
    `;
    return baseStyles;
  };

  const buildPlainText = (data) => {
    const lines = [];
    lines.push(data.name || '');
    lines.push('');
    const contacts = [data.contact.email, data.contact.phone, data.contact.linkedin, data.contact.github, data.contact.location].filter(Boolean);
    if (contacts.length) lines.push(contacts.join(' | '));
    lines.push('');
    if (data.summary) { lines.push('PROFESSIONAL SUMMARY'); lines.push(data.summary); lines.push(''); }
    if (data.skills.technical.length) { lines.push('TECHNICAL SKILLS'); lines.push(data.skills.technical.join(', ')); lines.push(''); }
    if (data.experience.some(e => e.company || e.role)) {
      lines.push('EXPERIENCE');
      data.experience.filter(e => e.company || e.role).forEach(exp => {
        lines.push(`${exp.role} at ${exp.company} (${exp.startDate} - ${exp.endDate})`);
        exp.bullets.filter(b => b.trim()).forEach(b => lines.push(`  - ${b}`));
        lines.push('');
      });
    }
    if (data.education.some(e => e.degree || e.field)) {
      lines.push('EDUCATION');
      data.education.filter(e => e.degree || e.field).forEach(e => {
        lines.push(`${e.degree} ${e.field} - ${e.university} (${e.startYear}-${e.endYear})${e.gpa ? ` GPA: ${e.gpa}` : ''}`);
      });
      lines.push('');
    }
    return lines.join('\n');
  };

  /* ─── Get section context for AI ─── */
  const getSectionContext = () => {
    const parts = [];
    if (resume.experience.some(e => e.company)) parts.push('Experience: ' + resume.experience.filter(e => e.company).map(e => `${e.role} at ${e.company}`).join(', '));
    if (resume.skills.technical.length) parts.push('Skills: ' + resume.skills.technical.join(', '));
    return parts.join('. ');
  };

  /* ─── Helper to set AI suggestion handler ─── */
  const suggestSection = (sectionType, text) => {
    if (!text || text.length < 5) return;
    setAiLoading(sectionType);
    handleAISuggest(sectionType, text, getSectionContext());
  };

  return (
    <div className="resume-builder-wrapper">
      {/* Top Bar */}
      <div className="rb-topbar">
        <div className="rb-topbar-left">
          <button className="rb-back-btn" onClick={onClose}>
            <i className="bi bi-arrow-left me-2"></i> Back
          </button>
          <h5 className="mb-0 fw-bold">Resume Builder</h5>
        </div>
        <div className="rb-topbar-center">
          <div className="rb-template-selector">
            {TEMPLATES.map(t => (
              <button key={t.id}
                className={`rb-template-btn ${template === t.id ? 'active' : ''}`}
                onClick={() => setTemplate(t.id)}
                title={t.desc}>
                <i className={`bi ${t.icon} me-1`}></i> {t.name}
              </button>
            ))}
          </div>
        </div>
        <div className="rb-topbar-right">
          <button className="btn btn-outline-secondary btn-sm" onClick={() => handleExport('txt')} disabled={exporting}>
            <i className="bi bi-file-text me-1"></i> TXT
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => handleExport('print')} disabled={exporting}>
            <i className="bi bi-printer me-1"></i> Print PDF
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="rb-main-layout">
        {/* Left Panel - Editor */}
        <div className="rb-editor-panel">
          <div className="rb-editor-scroll">
            {/* Personal Info */}
            <SectionCard icon="bi-person" title="Personal Info" color="primary">
              <div className="mb-2">
                <input className="form-control form-control-sm" placeholder="Full Name"
                  value={resume.name} onChange={e => updateField('name', e.target.value)} />
              </div>
              <div className="row g-2">
                <div className="col-6">
                  <input className="form-control form-control-sm" placeholder="Email" value={resume.contact.email}
                    onChange={e => updateField('contact', { ...resume.contact, email: e.target.value })} />
                </div>
                <div className="col-6">
                  <input className="form-control form-control-sm" placeholder="Phone" value={resume.contact.phone}
                    onChange={e => updateField('contact', { ...resume.contact, phone: e.target.value })} />
                </div>
                <div className="col-6">
                  <input className="form-control form-control-sm" placeholder="LinkedIn URL" value={resume.contact.linkedin}
                    onChange={e => updateField('contact', { ...resume.contact, linkedin: e.target.value })} />
                </div>
                <div className="col-6">
                  <input className="form-control form-control-sm" placeholder="GitHub URL" value={resume.contact.github}
                    onChange={e => updateField('contact', { ...resume.contact, github: e.target.value })} />
                </div>
                <div className="col-12">
                  <input className="form-control form-control-sm" placeholder="Location (e.g. San Francisco, CA)" value={resume.contact.location}
                    onChange={e => updateField('contact', { ...resume.contact, location: e.target.value })} />
                </div>
              </div>
            </SectionCard>

            {/* Professional Summary */}
            <SectionCard icon="bi-quote" title="Professional Summary" color="success"
              onAISuggest={() => suggestSection('summary', resume.summary)}
              aiLoading={aiLoading === 'summary'}>
              <textarea className="form-control form-control-sm rb-summary-input"
                placeholder="Write a compelling professional summary..."
                value={resume.summary}
                onChange={e => updateField('summary', e.target.value)}
                rows={4} />
            </SectionCard>

            {/* Technical Skills */}
            <SectionCard icon="bi-cpu" title="Technical Skills" color="primary">
              <TagInput tags={resume.skills.technical} onChange={v => updateArrayField('skills', { ...resume.skills, technical: v })} placeholder="Add a technical skill..." />
            </SectionCard>

            {/* Soft Skills */}
            <SectionCard icon="bi-people" title="Soft Skills" color="warning">
              <TagInput tags={resume.skills.soft} onChange={v => updateArrayField('skills', { ...resume.skills, soft: v })} placeholder="Add a soft skill..." />
            </SectionCard>

            {/* Experience */}
            <SectionCard icon="bi-briefcase" title="Experience" color="primary">
              <ExperienceSection items={resume.experience} onChange={v => updateArrayField('experience', v)} />
            </SectionCard>

            {/* Projects */}
            <SectionCard icon="bi-rocket" title="Projects" color="info">
              <ProjectsSection items={resume.projects} onChange={v => updateArrayField('projects', v)} />
            </SectionCard>

            {/* Education */}
            <SectionCard icon="bi-mortarboard" title="Education" color="success">
              <EducationSection items={resume.education} onChange={v => updateArrayField('education', v)} />
            </SectionCard>

            {/* Certifications */}
            <SectionCard icon="bi-patch-check" title="Certifications" color="warning">
              <CertificationsSection items={resume.certifications} onChange={v => updateArrayField('certifications', v)} />
            </SectionCard>
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="rb-preview-panel">
          <div className="rb-preview-toolbar">
            <span><i className="bi bi-eye me-1"></i> Live Preview</span>
            <span className="rb-preview-hint">{template.charAt(0).toUpperCase() + template.slice(1)} template</span>
          </div>
          <div className="rb-preview-container" ref={previewRef}>
            {template === 'modern' && <ModernTemplate data={resume} />}
            {template === 'professional' && <ProfessionalTemplate data={resume} />}
            {template === 'creative' && <CreativeTemplate data={resume} />}
            {template === 'ats' && <ATSTemplate data={resume} />}
          </div>
        </div>
      </div>

      {/* AI Suggestion Modal */}
      <AISuggestionModal
        show={aiModal.show}
        onClose={() => setAiModal({ show: false })}
        suggestion={aiModal.suggestion}
        loading={aiModal.loading}
        onApply={aiModal.onApply || (() => {})}
        sectionType={aiModal.sectionType}
      />
    </div>
  );
};

export default ResumeBuilder;
