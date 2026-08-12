import axios from 'axios';

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

// ── Fetch & cache CSRF token ──────────────────────────────────────────────────
let _csrfToken = null;

export const fetchCsrfToken = async () => {
  try {
    const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';
    const res = await fetch(`${baseURL}/csrf-token`, {
      method: 'GET',
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.csrfToken) {
        _csrfToken = data.csrfToken;
      }
    }
  } catch (e) {
    console.warn('[CSRF] Token fetch failed:', e.message);
  }
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  // 30s timeout — handles cold-start delays on free-tier hosting (Render/Railway
  // can take up to 15s to spin up from idle). Default 15s was too short.
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

let authClearLock = false;

// ── Attach CSRF token to every mutating request ───────────────────────────────
api.interceptors.request.use((config) => {
  const token = getCookie('dk_csrf_token') || _csrfToken;
  if (token) {
    config.headers['x-csrf-token'] = token;
  }
  return config;
});

// ── Response interceptor — handles CSRF expiry + auth expiry ─────────────────
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const status  = error.response?.status;
    const message = error.response?.data?.message || error.message || 'Network error';

    // CSRF token expired — refresh and retry the original request once
    if (status === 403 && error.response?.data?.message?.toLowerCase().includes('csrf')) {
      if (!error.config._csrfRetried) {
        error.config._csrfRetried = true;
        await fetchCsrfToken();
        const newToken = getCookie('dk_csrf_token') || _csrfToken;
        if (newToken) {
          error.config.headers['x-csrf-token'] = newToken;
          return api(error.config);
        }
      }
    }

    if (status === 401) {
      if (!authClearLock) {
        authClearLock = true;
        localStorage.removeItem('dk_session');
        localStorage.removeItem('dk_user');
        window.dispatchEvent(new CustomEvent('dk:auth:expired'));
        setTimeout(() => { authClearLock = false; }, 2000);
      }
    }

    return Promise.reject({ message, status, errors: error.response?.data?.errors || [] });
  }
);

export default api;
