import api from './axiosInstance';

/**
 * Coupons + UserCoupons + Packages API — PRD §5
 */

// ── PUBLIC MARKETPLACE ───────────────────────────────────────────────────────
export const getCoupons  = (params = {}) => api.get('/coupons',   { params });
export const getCouponById = (id)        => api.get(`/coupons/${id}`);
export const getPackages   = (params = {}) => api.get('/packages', { params });
export const getPackageById = (id)       => api.get(`/packages/${id}`);

// Exclusive home-banner coupons (isExclusive: true)
export const getExclusiveCoupons = () => api.get('/coupons/exclusive');

// ── CLIENT ───────────────────────────────────────────────────────────────────
// Get client's purchased coupons (status filter: Available | CodeGenerated | Redeemed | Expired)
export const getMyCoupons = (params = {}) => api.get('/coupons/my-coupons', { params });

// Purchase a coupon (Model A fixed-price or Model B free)
export const purchaseCoupon  = (couponId)   => api.post(`/coupons/${couponId}/purchase`);
export const purchasePackage = (packageId)  => api.post(`/packages/${packageId}/purchase`);

// Generate redemption code — starts the countdown timer (PRD §5.4)
export const generateCouponCode = (userCouponId) =>
  api.post(`/coupons/${userCouponId}/generate-code`);

// ── VENDOR ───────────────────────────────────────────────────────────────────
export const getVendorCoupons  = (params = {}) => api.get('/coupons/vendor/my-coupons', { params });
export const createCoupon      = (data)        => api.post('/coupons', data);
export const updateCoupon      = (id, data)    => api.put(`/coupons/${id}`, data);

// Vendor redemption terminal — verify code + bill amount, apply discount, credit cashback
export const redeemCoupon = (code, billAmount) =>
  api.post('/coupons/redeem', { code, billAmount });

// ── ADMIN ────────────────────────────────────────────────────────────────────
export const getPendingCoupons = (params = {}) => api.get('/admin/coupons/pending', { params });
export const approveCoupon     = (id, notes = '') => api.put(`/admin/coupons/${id}/approve`, { notes });
export const rejectCoupon      = (id, reason)    => api.put(`/admin/coupons/${id}/reject`,  { reason });

// Admin package authoring (PRD §5.7)
export const createPackage        = (data)     => api.post('/packages',     data);
export const updatePackage        = (id, data) => api.put(`/packages/${id}`, data);
export const getAllPackagesAdmin   = (params = {}) => api.get('/packages/admin/all', { params });
