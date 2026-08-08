import api from './axiosInstance';

/**
 * Wallet API — PRD §5.6
 */

export const getWalletBalance      = ()           => api.get('/wallet/balance');
export const getWalletTransactions = (params = {}) => api.get('/wallet/transactions', { params });

// Admin manual credit / debit
export const adminCreditWallet = (userId, amount, description) =>
  api.post('/wallet/admin/credit', { userId, amount, description });
export const adminDebitWallet  = (userId, amount, description) =>
  api.post('/wallet/admin/debit',  { userId, amount, description });
