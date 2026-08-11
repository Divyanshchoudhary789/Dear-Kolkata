import api from './axiosInstance';

/**
 * Auth API — PRD §3.1 (Client OTP), Vendor/Admin password login
 */

// Verify Kolkata PIN geo-gate
export const verifyPin = (pin) => api.post('/auth/verify-pin', { pin });

// Send OTP to phone (LOGIN — existing users only)
export const sendOTP = (phone) => api.post('/auth/send-otp', { phone });

// Verify OTP → login existing client
export const verifyOTP = (phone, otp) => api.post('/auth/verify-otp', { phone, otp });

// ── Registration flow ──────────────────────────────────────────────────────

// Step 1: send OTP for new client registration
export const registerSendOTP = (phone, name, email = '') =>
  api.post('/auth/register/send-otp', { phone, name, email });

// Step 2: verify OTP + provide address → activate account + get token
export const registerVerify = (data) =>
  api.post('/auth/register/verify', data);

// ── Vendor / Admin ─────────────────────────────────────────────────────────

// Vendor login (phone + password)
export const vendorLogin = (phone, password) => api.post('/auth/vendor/login', { phone, password });

// Admin login (email + password)
export const adminLogin = (email, password) => api.post('/auth/admin/login', { email, password });

// Logout (clears cookie)
export const logout = () => api.post('/auth/logout');

// Logout from all devices (blacklists all tokens)
export const logoutAll = () => api.post('/auth/logout-all');

// Get current user profile
export const getMe = () => api.get('/auth/me');

// Update profile (name, email)
export const updateProfile = (data) => api.put('/auth/me', data);

// Add delivery address
export const addAddress = (addressData) => api.post('/auth/addresses', addressData);

// Delete delivery address
export const deleteAddress = (addressId) => api.delete(`/auth/addresses/${addressId}`);
