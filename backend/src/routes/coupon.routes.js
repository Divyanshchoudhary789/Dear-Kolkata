const express = require('express');
const router  = express.Router();
const cc      = require('../controllers/couponController');
const { protect, restrictTo, attachVendor } = require('../middleware/auth');

// ── CRITICAL: Static / prefixed routes MUST come before /:id param routes ──

// ── Client ────────────────────────────────────────────────────────────────────
router.get('/my-coupons',                   protect, restrictTo('client'), cc.getMyCoupons);
router.post('/:id/purchase',                protect, restrictTo('client'), cc.purchaseCoupon);
router.post('/:userCouponId/generate-code', protect, restrictTo('client'), cc.generateCode);

// ── Vendor ────────────────────────────────────────────────────────────────────
router.get('/vendor/my-coupons',  protect, attachVendor, cc.getVendorCoupons);
router.post('/redeem',            protect, attachVendor, cc.redeemCoupon);
router.post('/',                  protect, attachVendor, cc.createCoupon);
router.put('/:id',                protect, attachVendor, cc.updateCoupon);

// ── Admin ─────────────────────────────────────────────────────────────────────
router.get('/admin/pending',      protect, restrictTo('admin'), cc.getPendingCoupons);
router.put('/:id/approve',        protect, restrictTo('admin'), cc.approveCoupon);
router.put('/:id/reject',         protect, restrictTo('admin'), cc.rejectCoupon);

// ── Public (LAST — so static paths above are matched first) ───────────────────
router.get('/',    cc.getAllCoupons);
router.get('/:id', cc.getCouponById);

module.exports = router;
