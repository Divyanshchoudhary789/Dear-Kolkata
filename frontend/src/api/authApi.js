import api from './axiosInstance';

/**
 * Auth API — PRD §3.1 (Client OTP), Vendor/Admin password login
 */

// Verify Kolkata PIN geo-gate
export const verifyPin = (pin) => api.post('/auth/verify-pin', { pin });

// Send OTP to phone
export const sendOTP = (phone) => api.post('/auth/send-otp', { phone });

// Verify OTP → returns token + user
export const verifyOTP = (phone, otp) => api.post('/auth/verify-otp', { phone, otp });

// Vendor login (phone + password)
export const vendorLogin = (phone, password) => api.post('/auth/vendor/login', { phone, password });

// Admin login (email + password)
export const adminLogin = (email, password) => api.post('/auth/admin/login', { email, password });

// Logout (clears cookie)
export const logout = () => api.post('/auth/logout');

// Get current user profile
export const getMe = () => api.get('/auth/me');

// Update profile (name, email)
export const updateProfile = (data) => api.put('/auth/me', data);

// Add delivery address
export const addAddress = (addressData) => api.post('/auth/addresses', addressData);

// Delete delivery address
export const deleteAddress = (addressId) => api.delete(`/auth/addresses/${addressId}`);
