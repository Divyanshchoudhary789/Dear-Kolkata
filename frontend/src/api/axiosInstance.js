import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

let authClearLock = false;

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message || 'Network error';
    const url = error.config?.url || '';

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
