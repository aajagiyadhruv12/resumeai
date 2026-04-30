const API_URL = process.env.REACT_APP_API_URL || "https://resumeai-fj7h.onrender.com/api";

class ApiService {
  async _handleFetch(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      let data;
      try {
        data = await response.json();
      } catch (e) {
        throw new Error('Server returned an invalid response.');
      }
      if (!response.ok) {
        throw new Error(data.error || data.message || `Server error ${response.status}`);
      }
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out after 2 minutes. Please try again.');
      }
      throw new Error(error.message || 'Failed to connect to backend.');
    }
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
