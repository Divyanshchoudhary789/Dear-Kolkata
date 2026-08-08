const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const { getBalance, getTransactionHistory } = require('../services/walletService');
const { sendSuccess } = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');

// ── GET /api/wallet/balance ───────────────────────────────────────────────────
router.get('/balance', protect, catchAsync(async (req, res) => {
  const balance = await getBalance(req.user._id);
  return sendSuccess(res, 200, 'Wallet balance fetched', { walletBalance: balance });
}));

// ── GET /api/wallet/transactions ─────────────────────────────────────────────
router.get('/transactions', protect, catchAsync(async (req, res) => {
  const { page = 1, limit = 20, type } = req.query;
  const result = await getTransactionHistory(req.user._id, {
    page: parseInt(page),
    limit: parseInt(limit),
    type
  });
  return sendSuccess(res, 200, 'Transactions fetched', result);
}));

// ── Admin manual wallet operations ────────────────────────────────────────────
const { creditWallet, debitWallet } = require('../services/walletService');
const User = require('../models/User');
const ApiError = require('../utils/apiError');

router.post('/admin/credit', protect, restrictTo('admin'), catchAsync(async (req, res) => {
  const { userId, amount, description } = req.body;
  if (!userId || !amount || !description) {
    throw new ApiError(400, 'userId, amount, and description are required');
  }
  const result = await creditWallet(userId, amount, 'admin_credit', description, null, req.user._id);
  return sendSuccess(res, 200, 'Wallet credited successfully', result);
}));

router.post('/admin/debit', protect, restrictTo('admin'), catchAsync(async (req, res) => {
  const { userId, amount, description } = req.body;
  if (!userId || !amount || !description) {
    throw new ApiError(400, 'userId, amount, and description are required');
  }
  const result = await debitWallet(userId, amount, 'admin_debit', description, null, req.user._id);
  return sendSuccess(res, 200, 'Wallet debited successfully', result);
}));

module.exports = router;
