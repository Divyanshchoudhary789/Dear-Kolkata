const express  = require('express');
const router   = express.Router();
const vc       = require('../controllers/vendorController');
const { protect, attachVendor } = require('../middleware/auth');
const { vendorUpload }          = require('../config/cloudinary');

// ── Vendor dashboard & management ─────────────────────────────────────────────
router.get('/dashboard',           protect, attachVendor, vc.getDashboard);
router.get('/orders',              protect, attachVendor, vc.getOrders);
router.get('/payouts',             protect, attachVendor, vc.getPayouts);
router.get('/coupons/performance', protect, attachVendor, vc.getCouponPerformance);
router.put('/profile',             protect, attachVendor, vc.updateProfile);
router.post('/upload-kyc',         protect, attachVendor, vendorUpload.single('document'), vc.uploadKyc);

// ── Staff sub-accounts ────────────────────────────────────────────────────────
router.post('/staff',              protect, attachVendor, vc.addStaff);
router.delete('/staff/:staffId',   protect, attachVendor, vc.removeStaff);

// ── Public store profile ──────────────────────────────────────────────────────
router.get('/:vendorId/store',     vc.getStoreProfile);

module.exports = router;
