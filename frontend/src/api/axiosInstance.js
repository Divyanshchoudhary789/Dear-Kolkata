import axios from 'axios';

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

// ── Fetch & cache CSRF token ──────────────────────────────────────────────────
// In production (cross-origin), the cookie may not be readable by JS if the
// backend ever sets HttpOnly=true, so we also cache the token from the JSON
// response body as a reliable fallback.
let _csrfToken = null;

export const fetchCsrfToken = async () => {
  try {
    const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';
    const res = await fetch(`${baseURL}/csrf-token`, {
      method: 'GET',
      credentials: 'include',  // send/receive cookies cross-origin
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.csrfToken) {
        _csrfToken = data.csrfToken;   // cache from response body
      }
    }
  } catch (e) {
    console.warn('[CSRF] Token fetch failed — cross-origin requests may fail:', e.message);
  }
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,   // required for cross-origin cookie + CSRF
});

let authClearLock = false;

// ── Attach CSRF token to every mutating request ───────────────────────────────
api.interceptors.request.use((config) => {
  // Try cookie first (works on same-origin / Vite proxy in dev),
  // fall back to in-memory cache (reliable for cross-origin production).
  const token = getCookie('dk_csrf_token') || _csrfToken;
  if (token) {
    // Use lowercase — consistent with what the backend reads via req.headers[name]
    config.headers['x-csrf-token'] = token;
  }
  return config;
});

// ── Auto-retry once on CSRF failure (token may have expired) ─────────────────
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const status  = error.response?.status;
    const message = error.response?.data?.message || error.message || 'Network error';

    // CSRF token expired / missing — refresh and retry once
    if (status === 403 && error.response?.data?.message?.toLowerCase().includes('csrf')) {
      if (!error.config._csrfRetried) {
        error.config._csrfRetried = true;
        await fetchCsrfToken();
        const newToken = getCookie('dk_csrf_token') || _csrfToken;
        if (newToken) {
          error.config.headers['x-csrf-token'] = newToken;
          return api(error.config);   // retry original request
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
