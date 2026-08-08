const express = require('express');
const router  = express.Router();
const pc      = require('../controllers/paymentController');
const { protect, restrictTo } = require('../middleware/auth');

/**
 * Payment Routes
 *
 * All client-facing payment routes require authentication.
 * Webhook is public but verified via Razorpay signature.
 */

// ── Razorpay flow ─────────────────────────────────────────────────────────────

// Step 1: Create a Razorpay order (get orderId + amount for frontend modal)
router.post('/create-razorpay-order', protect, restrictTo('client'), pc.createRazorpayOrder);

// Step 2: Verify payment after Razorpay modal success → create DB order
router.post('/verify', protect, restrictTo('client'), pc.verifyPayment);

// Full wallet payment (bypasses Razorpay entirely)
router.post('/place-wallet-order', protect, restrictTo('client'), pc.placeWalletOrder);

// Cash on Delivery
router.post('/place-cod', protect, restrictTo('client'), pc.placeCODOrder);

// Webhook from Razorpay servers
router.post('/webhook', pc.handleWebhook);

// Get Razorpay public key
router.get('/razorpay-key', protect, pc.getRazorpayKey);

module.exports = router;
