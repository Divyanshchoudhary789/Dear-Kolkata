import api from './axiosInstance';

/**
 * Vendor API — PRD §3.2
 */

export const getVendorDashboard     = ()           => api.get('/vendor/dashboard');
export const getVendorOrders        = (params = {}) => api.get('/vendor/orders',             { params });
export const getVendorPayouts       = (params = {}) => api.get('/vendor/payouts',             { params });
export const getVendorCouponPerf    = ()           => api.get('/vendor/coupons/performance');
export const updateVendorProfile    = (data)       => api.put('/vendor/profile',              data);
export const uploadVendorKyc        = (formData)   =>
  api.post('/vendor/upload-kyc', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const addVendorStaff         = (data)       => api.post('/vendor/staff',               data);
export const removeVendorStaff      = (staffId)    => api.delete(`/vendor/staff/${staffId}`);
export const getStoreProfile        = (vendorId)   => api.get(`/vendor/${vendorId}/store`);
