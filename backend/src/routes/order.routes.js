const express = require('express');
const router  = express.Router();
const oc      = require('../controllers/orderController');
const { protect, restrictTo, attachVendor } = require('../middleware/auth');

// ── Static/prefixed routes FIRST ─────────────────────────────────────────────

// ── Client ────────────────────────────────────────────────────────────────────
router.post('/create',              protect, restrictTo('client'), oc.createOrder);
router.get('/my-orders',            protect, restrictTo('client'), oc.getMyOrders);
router.post('/:id/return',          protect, restrictTo('client'), oc.requestReturn);

// ── Vendor ────────────────────────────────────────────────────────────────────
router.get('/vendor/orders',        protect, attachVendor, oc.getVendorOrders);
router.put('/:id/status',           protect, attachVendor, oc.updateOrderStatus);
router.put('/:id/return-decision',  protect, attachVendor, oc.handleReturnDecision);

// ── Admin ─────────────────────────────────────────────────────────────────────
router.get('/admin/orders',         protect, restrictTo('admin'), oc.getAllOrders);
router.put('/:id/resolve-dispute',  protect, restrictTo('admin'), oc.resolveDispute);

// ── Common (LAST) ─────────────────────────────────────────────────────────────
router.get('/:id',                  protect, oc.getOrderById);

module.exports = router;
