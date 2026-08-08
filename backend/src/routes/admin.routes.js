const express = require('express');
const router  = express.Router();
const ac      = require('../controllers/adminController');
const pc      = require('../controllers/productController');   // product moderation lives here
const { protect, restrictTo } = require('../middleware/auth');

// ── Vendor management ─────────────────────────────────────────────────────────
router.post('/vendors',            protect, restrictTo('admin'), ac.onboardVendor);
router.get('/vendors',             protect, restrictTo('admin'), ac.getAllVendors);
router.get('/vendors/:id',         protect, restrictTo('admin'), ac.getVendorById);
router.put('/vendors/:id',         protect, restrictTo('admin'), ac.updateVendor);
router.put('/vendors/:id/status',  protect, restrictTo('admin'), ac.updateVendorStatus);

// ── Category management ───────────────────────────────────────────────────────
// Public endpoint — categories needed on homepage without auth
router.get('/categories/public',   ac.getCategories);
router.get('/categories',          protect, restrictTo('admin'), ac.getCategories);
router.put('/categories/:id',      protect, restrictTo('admin'), ac.updateCategory);

// ── Product moderation ────────────────────────────────────────────────────────
router.get('/products/pending',    protect, restrictTo('admin'), pc.getPendingProducts);
router.put('/products/:id/approve',protect, restrictTo('admin'), pc.approveProduct);
router.put('/products/:id/reject', protect, restrictTo('admin'), pc.rejectProduct);

// ── Coupon moderation (same endpoints as /api/coupons but centralised here) ───
const cc = require('../controllers/couponController');
router.get('/coupons/pending',     protect, restrictTo('admin'), cc.getPendingCoupons);
router.put('/coupons/:id/approve', protect, restrictTo('admin'), cc.approveCoupon);
router.put('/coupons/:id/reject',  protect, restrictTo('admin'), cc.rejectCoupon);

// ── Payout management ─────────────────────────────────────────────────────────
router.get('/payouts/pending',     protect, restrictTo('admin'), ac.getPendingPayouts);
router.get('/payouts',             protect, restrictTo('admin'), ac.getAllPayouts);
router.post('/payouts/:id/release',protect, restrictTo('admin'), ac.releasePayout);
router.post('/payouts/:id/hold',   protect, restrictTo('admin'), ac.holdPayout);

// ── Analytics ─────────────────────────────────────────────────────────────────
router.get('/analytics/overview',  protect, restrictTo('admin'), ac.getAnalyticsOverview);
router.get('/analytics',           protect, restrictTo('admin'), ac.getAnalytics);

// ── Client management ─────────────────────────────────────────────────────────
router.get('/clients',             protect, restrictTo('admin'), ac.getAllClients);
router.get('/clients/:id',         protect, restrictTo('admin'), ac.getClientById);

// ── Wallet / cashback config ──────────────────────────────────────────────────
router.get('/wallet/ledger',             protect, restrictTo('admin'), ac.getWalletLedger);
router.put('/wallet/cashback-config',    protect, restrictTo('admin'), ac.updateCashbackConfig);

module.exports = router;
