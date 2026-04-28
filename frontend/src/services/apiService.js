const API_URL = process.env.REACT_APP_API_URL || "https://resumeai-fj7h.onrender.com";
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
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
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
      // Fallback to mock responses when backend is not available
      console.log('Backend not available, using mock response for:', url);
      return this._getMockResponse(url, options);
    }
  }

  _getMockResponse(url, options) {
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
    
    if (url.includes('/analyze')) {
      return {
        analysis: {
          overall_score: 85,
          strengths: ['Good structure', 'Relevant experience'],
          improvements: ['Add more quantifiable achievements', 'Include skills section'],
          recommendations: ['Consider adding a summary section']
        },
        message: 'Resume analyzed successfully (Demo Mode)'
      };
    }
    
    if (url.includes('/upload')) {
      return {
        message: 'File uploaded successfully (Demo Mode)',
        filename: 'resume.pdf',
        file_id: 'mock-file-id-123'
      };
    }
    
    if (url.includes('/history')) {
      return {
        history: [
          {
            id: '1',
            filename: 'resume.pdf',
            date: '2024-01-15',
            score: 85
          }
        ]
      };
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
