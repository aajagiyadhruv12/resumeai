const API_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000/api';

class ApiService {
  async analyzeResume(resumeText, targetRole = 'Software Engineer', userId = 'anonymous', filename = 'resume', fileUrl = '') {
    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_text: resumeText, target_role: targetRole, user_id: userId, filename, file_url: fileUrl }),
      });
      let data;
      try { data = await response.json(); } catch (e) { throw new Error('Server returned an invalid response.'); }
      if (!response.ok) throw new Error(data.message || data.error || 'Failed to analyze resume');
      return data;
    } catch (error) {
      console.error('ApiService Analyze Error:', error);
      throw error;
    }
  }

  async uploadResume(file, userId = 'anonymous') {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user_id', userId);
      const response = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
      let data;
      try { data = await response.json(); } catch (e) { throw new Error('Server returned an invalid response.'); }
      if (!response.ok) throw new Error(data.message || data.error || 'Failed to upload resume');
      return data;
    } catch (error) {
      console.error('ApiService Upload Error:', error);
      throw error;
    }
  }

  async generateResume(resumeText, analysis, targetRole = 'Software Engineer') {
    try {
      const response = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_text: resumeText, analysis, target_role: targetRole }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate resume');
      return data;
    } catch (error) {
      console.error('ApiService Generate Error:', error);
      throw error;
    }
  }

  async regenerateAnalysis(resumeText, targetRole = 'Software Engineer', customImprovements = '') {
    try {
      const response = await fetch(`${API_URL}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_text: resumeText, target_role: targetRole, custom_improvements: customImprovements }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to regenerate analysis');
      return data;
    } catch (error) {
      console.error('ApiService Regenerate Error:', error);
      throw error;
    }
  }

  async getHistory(userId) {
    try {
      const response = await fetch(`${API_URL}/history?user_id=${userId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch history');
      return data;
    } catch (error) {
      console.error('ApiService History Error:', error);
      throw error;
    }
  }

  async deleteHistory(docId) {
    try {
      const response = await fetch(`${API_URL}/history/${docId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete');
      return data;
    } catch (error) {
      console.error('ApiService Delete History Error:', error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
