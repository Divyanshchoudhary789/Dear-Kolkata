const express  = require('express');
const router   = express.Router();
const vc       = require('../controllers/vendorController');
const { protect, attachVendor, restrictStaff } = require('../middleware/auth');
const { vendorUpload }          = require('../config/cloudinary');

// Staff members are restricted to profile, KYC upload, and staff management
const vendorOwnerOnly = restrictStaff(['/profile', '/upload-kyc', '/staff']);

// ── Vendor dashboard & management (owner only) ─────────────────────────────
router.get('/dashboard',           protect, attachVendor, vendorOwnerOnly, vc.getDashboard);
router.get('/orders',              protect, attachVendor, vendorOwnerOnly, vc.getOrders);
router.get('/payouts',             protect, attachVendor, vendorOwnerOnly, vc.getPayouts);
router.get('/coupons/performance', protect, attachVendor, vendorOwnerOnly, vc.getCouponPerformance);
router.put('/profile',             protect, attachVendor, vc.updateProfile);
router.post('/upload-kyc',         protect, attachVendor, vendorUpload.single('document'), vc.uploadKyc);

// ── Staff sub-accounts (owner only) ─────────────────────────────────────────
router.post('/staff',              protect, attachVendor, vendorOwnerOnly, vc.addStaff);
router.delete('/staff/:staffId',   protect, attachVendor, vendorOwnerOnly, vc.removeStaff);

// ── Public store profile ────────────────────────────────────────────────────
router.get('/:vendorId/store',     vc.getStoreProfile);

module.exports = router;
