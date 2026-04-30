const API_URL = process.env.REACT_APP_API_URL || "https://resumeai-fj7h.onrender.com/api";

// Wake up the backend before making real requests (Render free tier sleeps)
const wakeUpBackend = async () => {
  try {
    await fetch(`${API_URL.replace('/api', '')}/health`, { method: 'GET' });
  } catch (e) {
    // ignore - just a warm-up ping
  }
};

class ApiService {
  async _handleFetch(url, options = {}, timeoutMs = 180000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      let data;
      const responseText = await response.text();
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Server returned invalid response: ${responseText.substring(0, 100)}`);
      }
      if (!response.ok) {
        throw new Error(data.error || data.message || `Server error ${response.status}`);
      }
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. The server may be starting up — please wait 30 seconds and try again.');
      }
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('Network request failed')) {
        throw new Error('Cannot connect to server. Please check your internet connection and try again.');
      }
      throw error;
    }
  }

  async analyzeResume(resumeText, targetRole = 'Software Engineer', userId = 'anonymous', filename = 'resume', fileUrl = '') {
    await wakeUpBackend();
    return this._handleFetch(`${API_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_text: resumeText, target_role: targetRole, user_id: userId, filename, file_url: fileUrl }),
    }, 180000);
  }

  async uploadResume(file, userId = 'anonymous') {
    await wakeUpBackend();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId);
    return this._handleFetch(`${API_URL}/upload`, { method: 'POST', body: formData }, 180000);
  }

  async generateResume(resumeText, analysis, targetRole = 'Software Engineer') {
    return this._handleFetch(`${API_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_text: resumeText, analysis, target_role: targetRole }),
    }, 180000);
  }

  async regenerateAnalysis(resumeText, targetRole = 'Software Engineer', customImprovements = '') {
    return this._handleFetch(`${API_URL}/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_text: resumeText, target_role: targetRole, custom_improvements: customImprovements }),
    }, 180000);
  }

  async getHistory(userId) {
    return this._handleFetch(`${API_URL}/history?user_id=${userId}`, {}, 30000);
  }

  async deleteHistory(docId) {
    return this._handleFetch(`${API_URL}/history/${docId}`, { method: 'DELETE' }, 30000);
  }

  async login(username, password, email) {
    await wakeUpBackend();
    return this._handleFetch(`${API_URL}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, username }),
    }, 30000);
  }
}

export const apiService = new ApiService();
