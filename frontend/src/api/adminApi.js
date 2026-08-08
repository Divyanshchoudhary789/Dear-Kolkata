import api from './axiosInstance';

/**
 * Admin API — PRD §3.3
 */

// ── VENDOR MANAGEMENT ────────────────────────────────────────────────────────
export const onboardVendor       = (data)    => api.post('/admin/vendors',             data);
export const getAllVendors        = (p = {})  => api.get('/admin/vendors',              { params: p });
export const getVendorById       = (id)      => api.get(`/admin/vendors/${id}`);
export const updateVendor        = (id, d)   => api.put(`/admin/vendors/${id}`,        d);
export const updateVendorStatus  = (id, status) => api.put(`/admin/vendors/${id}/status`, { status });

// ── CATEGORY & COMMISSION ────────────────────────────────────────────────────
export const getCategories       = ()        => api.get('/admin/categories');
export const updateCategory      = (id, d)   => api.put(`/admin/categories/${id}`,     d);

// ── PAYOUTS ──────────────────────────────────────────────────────────────────
export const getPendingPayouts   = (p = {})  => api.get('/admin/payouts/pending',      { params: p });
export const getAllPayouts        = (p = {})  => api.get('/admin/payouts',              { params: p });
export const releasePayout       = (id, adminNotes = '') => api.post(`/admin/payouts/${id}/release`, { adminNotes });
export const holdPayout          = (id, reason)          => api.post(`/admin/payouts/${id}/hold`,    { reason });

// ── ANALYTICS ────────────────────────────────────────────────────────────────
export const getAnalytics        = (p = {})  => api.get('/admin/analytics',            { params: p });
export const getAnalyticsOverview= ()        => api.get('/admin/analytics/overview');

// ── CLIENTS ──────────────────────────────────────────────────────────────────
export const getAllClients        = (p = {})  => api.get('/admin/clients',              { params: p });
export const getClientById       = (id)      => api.get(`/admin/clients/${id}`);

// ── WALLET & CASHBACK ────────────────────────────────────────────────────────
export const getWalletLedger     = ()        => api.get('/admin/wallet/ledger');
export const updateCashbackConfig= (pct)     => api.put('/admin/wallet/cashback-config', { cashbackPercent: pct });
