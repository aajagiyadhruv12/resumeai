import { auth } from '../firebase';
import { signInWithEmailAndPassword, signOut, getIdToken } from 'firebase/auth';

const API_URL = process.env.REACT_APP_API_URL || "https://resumeai-fj7h.onrender.com/api";

// Wake up the backend before making real requests (Render free tier sleeps)
const wakeUpBackend = async () => {
  try {
    await fetch(`${API_URL.replace('/api', '')}/health`, { method: 'GET' });
  } catch (e) {
    // ignore - just a warm-up ping
  }
};

// Safely get the Firebase ID token of the currently signed-in user (returns null if signed out)
async function fetchIdToken() {
  try {
    const user = auth.currentUser;
    if (!user) return null;
    return await getIdToken(user, true);
  } catch (e) {
    return null;
  }
}

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

    // Inject Firebase Auth ID token if present + default Accept JSON header
    const idToken = await fetchIdToken();
    const headers = new Headers(options.headers || {});
    if (idToken) headers.set('Authorization', `Bearer ${idToken}`);
    if (!headers.has('Accept')) headers.set('Accept', 'application/json');
    const nextOptions = { ...options, headers };

    // Render free tier sleeps after inactivity; requests during wake-up fail
    // with 502/503/504/522 or network errors, so retry those with a delay.
    const MAX_ATTEMPTS = 3;
    const RETRY_DELAY_MS = 15000;
    let lastError;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, { ...nextOptions, signal: controller.signal });
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
          const err = new Error(data?.error || data?.message || `Server error ${response.status}`);
          if (data?.details && typeof data.details === 'object') err.details = data.details;
          throw err;
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

  async login(emailOrUsername, password, maybeEmail) {
    // New API: login(email, password) -> Firebase Email/Password auth
    // Legacy API: login(username, password, email) -> backend admin endpoint
    if (maybeEmail && typeof maybeEmail === 'string') {
      // Legacy 3-arg call: keep backward compatibility
      await wakeUpBackend();
      return this._handleFetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: maybeEmail, password, username: emailOrUsername }),
      }, 30000, false);
    }
    // NEW: Firebase Client SDK auth flow
    // Legacy username support: if the input has no '@', treat it as the old
    // admin username and resolve it to the Firebase account email.
    const rawInput = (emailOrUsername || '').trim();
    const USERNAME_TO_EMAIL = { admin: 'admin@resumeai.com' };
    const email = rawInput.includes('@') ? rawInput : (USERNAME_TO_EMAIL[rawInput.toLowerCase()] || rawInput);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const fbUser = cred.user;
    let profile = {
      uid: fbUser.uid,
      email: fbUser.email || email,
      full_name: fbUser.displayName || '',
    };
    try {
      await wakeUpBackend();
      const serverProfile = await this._handleFetch(`${API_URL}/auth/me`, { method: 'GET' }, 30000, false);
      if (serverProfile && serverProfile.uid) profile = serverProfile;
    } catch (_) {
      // Backend unreachable: still proceed with client-side profile
    }
    return profile;
  }

  async register(fullName, email, password, confirmPassword) {
    if (confirmPassword !== undefined && confirmPassword !== password) {
      const e = new Error('Passwords do not match.');
      e.details = { confirmPassword: 'Passwords do not match.' };
      throw e;
    }
    await wakeUpBackend();
    return this._handleFetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: fullName,
        email: (email || '').trim(),
        password,
        confirm_password: confirmPassword ?? password,
      }),
    }, 30000, false);
  }

  async logout() {
    // Real Firebase sign-out — terminates the auth session. Errors are NOT
    // swallowed: if signOut fails the user is still signed in, so the caller
    // must not pretend logout succeeded.
    await signOut(auth);
    // Remove legacy auth keys only — NEVER touch unrelated preferences like theme.
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_email');
    this.clearCache();
  }

  async getCurrentUser() {
    // Firebase Auth is the single source of truth — no cached user fallback.
    if (!auth.currentUser) return null;
    try {
      return await this._handleFetch(`${API_URL}/auth/me`, { method: 'GET' }, 20000, false);
    } catch (e) {
      const u = auth.currentUser;
      if (!u) return null;
      return { uid: u.uid, email: u.email || '', full_name: u.displayName || '' };
    }
  }
}

export const apiService = new ApiService();
