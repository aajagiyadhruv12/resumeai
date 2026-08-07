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

// Convert raw Firebase auth error codes into user-friendly messages
function friendlyAuthError(err) {
  const code = err?.code || '';

  // Map of standard Firebase Web SDK error codes -> user-facing message
  const map = {
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/too-many-requests': 'Too many login attempts. Please wait a moment and try again.',
    'auth/network-request-failed': 'Network error. Please check your connection and try again.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password should be at least 6 characters.',
  };

  // Map of raw Identity Toolkit REST error messages -> user-facing message.
  // The Web SDK surfaces these on err.customData._tokenResponse.error.message
  // (or, for non-token calls, in the caught error's message string).
  const REST_MAP = {
    API_KEY_HTTP_REFERRER_BLOCKED:
      'This site is not authorized to use the Firebase API key. ' +
      'Please contact the site administrator to add this domain to the API key allowlist.',
    OPERATION_NOT_ALLOWED:
      'Email/password sign-in is currently disabled for this project. ' +
      'Please contact the site administrator.',
    API_KEY_INVALID:
      'The Firebase API key configured for this site is invalid. ' +
      'Please contact the site administrator.',
    INVALID_API_KEY:
      'The Firebase API key configured for this site is invalid. ' +
      'Please contact the site administrator.',
  };

  // Detect "blocked by client" — happens when an ad-blocker / privacy extension
  // (uBlock Origin, Brave Shields, AdBlock, ...) blocks identitytoolkit.googleapis.com.
  // The browser surfaces this as ERR_BLOCKED_BY_CLIENT (Chrome/Edge) or as a
  // generic "Failed to load resource" (Firefox/Safari). The Web SDK propagates
  // it as auth/network-request-failed or, more often, a thrown error with the
  // raw browser message still attached.
  const rawMessage = String(err?.message || '');
  const isBlockedByClient =
    rawMessage.includes('ERR_BLOCKED_BY_CLIENT') ||
    rawMessage.includes('Failed to load resource') ||
    rawMessage.includes('net::ERR_BLOCKED');

  // Identity Toolkit REST error message: check the SDK's structured error payload first,
  // then fall back to the raw message text.
  const tokenErrMsg = err?.customData?._tokenResponse?.error?.message;
  const restMessage = tokenErrMsg || rawMessage;
  const restMatch = Object.keys(REST_MAP).find((k) => restMessage.includes(k));

  let resolved = null;
  if (map[code]) {
    resolved = { message: map[code], code };
  } else if (isBlockedByClient) {
    resolved = {
      message:
        'Sign-in was blocked by your browser or an extension (ad blocker / privacy tool). ' +
        'Please disable it for this site and try again.',
      code: 'auth/blocked-by-client',
    };
  } else if (restMatch) {
    resolved = { message: REST_MAP[restMatch], code: restMatch };
  }

  if (resolved) {
    const friendly = new Error(resolved.message);
    friendly.code = resolved.code;
    // Preserve the original so console.debug can still show what the SDK reported
    friendly.originalError = err;
    return friendly;
  }
  return err;
}

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

  async _handleFetch(url, options = {}, timeoutMs = 180000, useCache = false, useAdminToken = false) {
    const cacheKey = `${url}-${JSON.stringify(options)}`;
    if (useCache && this.cache.has(cacheKey)) {
      console.log('Returning cached data for:', url);
      return this.cache.get(cacheKey);
    }

    // Inject the right auth token + default Accept JSON header.
    // - Admin-only endpoints (users/analyses overview) use the admin JWT.
    // - Normal app endpoints use the ADMIN JWT whenever an admin session is
    //   active (the admin stays the admin — the backend attributes history and
    //   saved analyses to the ADMIN account), otherwise the Firebase ID token
    //   of the signed-in user. Admin and user identities never mix.
    const idToken = await fetchIdToken();
    const headers = new Headers(options.headers || {});
    if (useAdminToken) {
      const adminToken = localStorage.getItem('admin_token');
      if (adminToken) headers.set('Authorization', `Bearer ${adminToken}`);
    } else {
      const token = localStorage.getItem('admin_token') || idToken;
      if (token) headers.set('Authorization', `Bearer ${token}`);
    }
    if (!headers.has('Accept')) headers.set('Accept', 'application/json');
    const nextOptions = { ...options, headers };

    // Render's free tier sleeps after ~15 min of inactivity, so the first
    // request after a sleep can fail with 502/503/504/522, a network error, or
    // a timeout while the instance boots. Retry those with a short backoff
    // (2s, 4s, 6s) per the deployment guidance. Real HTTP errors (401/403/
    // 404/500/...) are NEVER retried or masked — they surface immediately with
    // the backend's actual message.
    const MAX_ATTEMPTS = 4;
    const RETRY_DELAYS_MS = [2000, 4000, 6000];
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
          // Real backend error (401/403/404/500/...) — never hide or retry it.
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
        const isNetworkError =
          error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError') ||
          error.message.includes('Network request failed') ||
          error.message.includes('Load failed') ||
          error.message.includes('ERR_BLOCKED_BY_CLIENT');
        const isAbort = error.name === 'AbortError';
        // Retry aborts only on short-timeout calls (admin/history at 20-60s)
        // that can hang while a Render instance cold-boots. Long-running AI
        // calls (180s) that time out surface immediately instead of silently
        // re-running expensive backend work up to 4 times.
        const abortRetryable = isAbort && timeoutMs <= 60000;
        const shouldRetry = error.retryable || isNetworkError || abortRetryable;
        if (shouldRetry && attempt < MAX_ATTEMPTS) {
          const delay = RETRY_DELAYS_MS[attempt - 1] ?? 6000;
          console.log(`Server not ready (attempt ${attempt}/${MAX_ATTEMPTS}), retrying in ${delay / 1000}s...`);
          lastError = error;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        // All retries exhausted — report the actual cause instead of guessing.
        if (error.retryable) {
          throw new Error('The server is waking up from a cold start and did not respond in time. Please wait a moment and try again.');
        }
        if (isAbort) {
          throw new Error('Request timed out. The server may still be starting up — please wait a moment and try again.');
        }
        if (isNetworkError) {
          // Could be a cold start, a CORS problem, or an ad-blocker/extension
          // blocking the request (ERR_BLOCKED_BY_CLIENT) — say so.
          throw new Error(
            'Could not reach the server. This is usually the server waking up after being idle ' +
            '(Render free tier), but can also be caused by a network issue, CORS, or a browser ' +
            'extension/ad-blocker (ERR_BLOCKED_BY_CLIENT) blocking the request. Please wait a moment and try again.'
          );
        }
        throw error; // 401/403/404/500/... surface with their real message
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
    await wakeUpBackend();
    return this._handleFetch(`${API_URL}/history?user_id=${userId}`, {}, 30000, true);
  }

  async deleteHistory(docId) {
    const result = await this._handleFetch(`${API_URL}/history/${docId}`, { method: 'DELETE' }, 30000);
    this.clearCache(); // Clear history cache after deletion
    return result;
  }

  // ── Admin panel ──────────────────────────────────────────────
  async adminLogin(emailOrUsername, password) {
    await wakeUpBackend();
    const result = await this._handleFetch(`${API_URL}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailOrUsername, password, username: emailOrUsername }),
    }, 30000, false);
    if (result && result.token) {
      localStorage.setItem('admin_token', result.token);
      localStorage.setItem('admin_email', result.email || emailOrUsername);
    }
    return result;
  }

  async getAdminUsers() {
    await wakeUpBackend();
    return this._handleFetch(`${API_URL}/admin/users`, { method: 'GET' }, 30000, false, true);
  }

  async getAdminAnalyses() {
    await wakeUpBackend();
    return this._handleFetch(`${API_URL}/admin/analyses`, { method: 'GET' }, 60000, false, true);
  }

  async adminLogout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_email');
    this.clearCache();
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
    let cred;
    try {
      cred = await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      throw friendlyAuthError(err);
    }
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
    // Clear the admin session FIRST (synchronous) so a Firebase sign-out
    // failure can never leave a stale admin token behind — the complete
    // session must be wiped, not just the user half.
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_email');
    this.clearCache();
    // Real Firebase sign-out — terminates the user auth session. Errors are NOT
    // swallowed: if signOut fails the user is still signed in, so the caller
    // must not pretend logout succeeded.
    await signOut(auth);
  }

  async getCurrentUser() {
    // Firebase Auth is the single source of truth — no cached user fallback.
    if (!auth.currentUser) return null;
    try {
      await wakeUpBackend();
      return await this._handleFetch(`${API_URL}/auth/me`, { method: 'GET' }, 20000, false);
    } catch (e) {
      const u = auth.currentUser;
      if (!u) return null;
      return { uid: u.uid, email: u.email || '', full_name: u.displayName || '' };
    }
  }
}

export const apiService = new ApiService();
