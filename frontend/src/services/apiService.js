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
  constructor() {
    this.cache = new Map();
  }

  async _handleFetch(url, options = {}, timeoutMs = 180000, useCache = false) {
    const cacheKey = `${url}-${JSON.stringify(options)}`;
    if (useCache && this.cache.has(cacheKey)) {
      console.log('Returning cached data for:', url);
      return this.cache.get(cacheKey);
    }

    // Render free tier sleeps after inactivity; requests during wake-up fail
    // with 502/503/504/522 or network errors, so retry those with a delay.
    const MAX_ATTEMPTS = 3;
    const RETRY_DELAY_MS = 15000;
    let lastError;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        if ([502, 503, 504, 522].includes(response.status)) {
          throw Object.assign(new Error(`Server waking up (${response.status})`), { retryable: true });
        }
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
        if (useCache) {
          this.cache.set(cacheKey, data);
        }
        return data;
      } catch (error) {
        clearTimeout(timeoutId);
        const isNetworkError = error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('Network request failed');
        if ((error.retryable || isNetworkError) && attempt < MAX_ATTEMPTS) {
          console.log(`Server not ready (attempt ${attempt}/${MAX_ATTEMPTS}), retrying in ${RETRY_DELAY_MS / 1000}s...`);
          lastError = error;
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          continue;
        }
        if (error.name === 'AbortError') {
          throw new Error('Request timed out. The server may be starting up — please wait 30 seconds and try again.');
        }
        if (error.retryable || isNetworkError) {
          throw new Error('The server is starting up and did not respond in time. Please wait a moment and try again.');
        }
        throw error;
      }
    }
    throw lastError || new Error('Request failed after multiple attempts.');
  }

  clearCache() {
    this.cache.clear();
  }

  async analyzeResume(resumeText, targetRole = 'Software Engineer', userId = 'anonymous', filename = 'resume', fileUrl = '') {
    await wakeUpBackend();
    const result = await this._handleFetch(`${API_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_text: resumeText, target_role: targetRole, user_id: userId, filename, file_url: fileUrl }),
    }, 180000);
    this.clearCache(); // Clear history cache after new analysis
    return result;
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
    return this._handleFetch(`${API_URL}/history?user_id=${userId}`, {}, 30000, true);
  }

  async deleteHistory(docId) {
    const result = await this._handleFetch(`${API_URL}/history/${docId}`, { method: 'DELETE' }, 30000);
    this.clearCache(); // Clear history cache after deletion
    return result;
  }

  async getSuggestion(sectionType, currentText, targetRole = 'Software Engineer', resumeContext = '') {
    await wakeUpBackend();
    return this._handleFetch(`${API_URL}/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        section_type: sectionType,
        current_text: currentText,
        target_role: targetRole,
        resume_context: resumeContext
      }),
    }, 60000);
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
