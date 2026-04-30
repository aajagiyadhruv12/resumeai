const API_URL = process.env.REACT_APP_API_URL || "https://resumeai-fj7h.onrender.com/api";
const USE_MOCK_MODE = process.env.NODE_ENV === 'production' ? false : false;

class ApiService {
  async _handleFetch(url, options = {}) {
    // Force mock mode if enabled
    if (USE_MOCK_MODE) {
      console.log('Using mock mode for:', url);
      return this._getMockResponse(url, options);
    }
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for AI analysis
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      let data;
      try {
        data = await response.json();
      } catch (e) {
        throw new Error('Server returned an invalid response (not JSON).');
      }
      if (!response.ok) {
        throw new Error(data.message || data.error || `HTTP Error ${response.status}`);
      }
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. The AI is taking too long. Please try again.');
      }
      throw new Error(error.message || 'Failed to connect to backend.');
    }
  }

  async _getMockResponse(url, options) {
    if (url.includes('/admin/login')) {
      return {
        token: 'mock-token-12345',
        message: 'Login successful (Demo Mode)',
        user: {
          email: 'admin@resumeai.com',
          username: 'admin'
        }
      };
    }
    
    if (url.includes('/analyze') || url.includes('/regenerate')) {
      return {
        overall_score: 85,
        ats_score: 78,
        final_verdict: 'Strong candidate for this role.',
        professional_summary: 'Highly experienced Software Engineer with a strong background in full-stack development and cloud architecture.',
        skills_extraction: {
          technical_skills: ['React', 'Node.js', 'Python', 'AWS', 'Docker', 'SQL'],
          soft_skills: ['Leadership', 'Communication', 'Problem Solving', 'Agile']
        },
        strengths: [
          'Strong technical foundation in modern web technologies',
          'Proven track record of delivering scalable solutions',
          'Excellent understanding of cloud infrastructure'
        ],
        weaknesses: [
          'Limited exposure to mobile development',
          'Could benefit from more quantifiable metrics in experience section'
        ],
        skill_gap_analysis: ['Kubernetes', 'GraphQL', 'TensorFlow'],
        keyword_ats_optimization: {
          missing_keywords: ['Microservices', 'CI/CD', 'Unit Testing'],
          suggested_keywords: ['System Design', 'Scalability', 'Mentorship']
        },
        actionable_improvements: [
          'Add specific metrics to your work experience bullets',
          'Highlight your contributions to open-source projects',
          'Include a section for certifications and continuous learning'
        ],
        bullet_point_rewriting: [
          {
            old: 'Worked on the backend API.',
            new: 'Architected and implemented a high-performance RESTful API using Node.js, reducing latency by 40%.'
          }
        ],
        job_role_matching: [
          { role: 'Senior Software Engineer', match_percentage: 92 },
          { role: 'Full Stack Developer', match_percentage: 88 }
        ],
        message: 'Resume analyzed successfully (Demo Mode)'
      };
    }

    if (url.includes('/generate')) {
      return {
        generated_resume: `JOHN DOE
john.doe@example.com | +1-555-0123 | linkedin.com/in/johndoe | github.com/johndoe | New York, NY

PROFESSIONAL SUMMARY
Dynamic Software Engineer with 5+ years of experience in building scalable web applications. Proven track record of optimizing system performance and leading cross-functional teams to deliver high-quality software solutions.

TECHNICAL SKILLS
Languages: JavaScript, TypeScript, Python, Java, SQL, HTML/CSS
Frameworks: React, Node.js, Express, Flask, Django, Spring Boot
Tools: AWS, Docker, Kubernetes, Git, Jenkins, Terraform, Redis

EXPERIENCE
Senior Software Engineer at TechCorp
New York, NY | Jan 2020 - Present
- Architected a microservices-based platform using Node.js and AWS, improving system reliability by 35%.
- Led a team of 8 developers in migrating a legacy monolith to a modern cloud-native architecture.
- Optimized database queries in PostgreSQL, reducing API response times by 50% for over 1M monthly users.

Software Engineer at WebSolutions
Boston, MA | June 2017 - Dec 2019
- Developed and maintained 15+ RESTful APIs using Python/Django, serving as the backbone for the company's mobile app.
- Implemented CI/CD pipelines with GitLab CI, reducing deployment time from 2 hours to 15 minutes.
- Collaborated with UX designers to build responsive front-end components using React and Redux.

PROJECTS
E-Commerce Platform | React, Node.js, MongoDB
Jan 2021 - June 2021
- Built a full-featured e-commerce site with user authentication, product search, and Stripe payment integration.
- Implemented server-side rendering with Next.js, improving SEO and initial page load speed by 25%.

EDUCATION
B.S. in Computer Science
State University | 2013 - 2017 | GPA: 3.8/4.0`,
        message: 'Resume generated successfully (Demo Mode)'
      };
    }
    
    if (url.includes('/upload')) {
      return {
        message: 'File uploaded successfully (Demo Mode)',
        resume_text: 'Sample resume text from mock upload...',
        filename: 'resume.pdf',
        file_id: 'mock-file-id-123'
      };
    }
    
    if (url.includes('/history')) {
      return [
        {
          id: '1',
          filename: 'resume_software_eng.pdf',
          timestamp: new Date().toISOString(),
          overall_score: 85,
          ats_score: 78,
          target_role: 'Software Engineer',
          final_verdict: 'Strong candidate for this role.',
          resume_text: 'Sample resume text for software engineer...',
          professional_summary: 'Highly experienced Software Engineer...'
        },
        {
          id: '2',
          filename: 'resume_product_manager.pdf',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          overall_score: 72,
          ats_score: 65,
          target_role: 'Product Manager',
          final_verdict: 'Solid candidate, needs more technical depth.',
          resume_text: 'Sample resume text for product manager...',
          professional_summary: 'Experienced Product Manager...'
        }
      ];
    }
    
    return { message: 'Mock response for demo mode' };
  }

  async analyzeResume(resumeText, targetRole = 'Software Engineer', userId = 'anonymous', filename = 'resume', fileUrl = '') {
    return this._handleFetch(`${API_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_text: resumeText, target_role: targetRole, user_id: userId, filename, file_url: fileUrl }),
    });
  }

  async uploadResume(file, userId = 'anonymous') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId);
    return this._handleFetch(`${API_URL}/upload`, { method: 'POST', body: formData });
  }

  async generateResume(resumeText, analysis, targetRole = 'Software Engineer') {
    return this._handleFetch(`${API_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_text: resumeText, analysis, target_role: targetRole }),
    });
  }

  async regenerateAnalysis(resumeText, targetRole = 'Software Engineer', customImprovements = '') {
    return this._handleFetch(`${API_URL}/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_text: resumeText, target_role: targetRole, custom_improvements: customImprovements }),
    });
  }

  async getHistory(userId) {
    return this._handleFetch(`${API_URL}/history?user_id=${userId}`);
  }

  async deleteHistory(docId) {
    return this._handleFetch(`${API_URL}/history/${docId}`, { method: 'DELETE' });
  }

  async login(username, password, email) {
    return this._handleFetch(`${API_URL}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, username }),
    });
  }
}

export const apiService = new ApiService();
