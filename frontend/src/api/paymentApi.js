import api from './axiosInstance';

/**
 * Payment API — Razorpay + COD + Wallet
 */

/**
 * Step 1: Create a Razorpay order on the server.
 * Returns { razorpayOrderId, amount, currency, keyId, grandTotal, walletAmountUsed, payableAmount }
 */
export const createRazorpayOrder = (payload) =>
  api.post('/payments/create-razorpay-order', payload);

/**
 * Step 2: Verify payment after Razorpay modal success.
 * Sends payment IDs + cart data → server creates DB order.
 */
export const verifyPayment = (payload) =>
  api.post('/payments/verify', payload);

/**
 * Place a full wallet-payment order (no Razorpay).
 */
export const placeWalletOrder = (payload) =>
  api.post('/payments/place-wallet-order', payload);

/**
 * Place a Cash on Delivery order.
 * Optional walletAmount for partial wallet deduction.
 */
export const placeCODOrder = (payload) =>
  api.post('/payments/place-cod', payload);

/**
 * Get the Razorpay public key from server (avoids hardcoding in bundle).
 */
export const getRazorpayKey = () =>
  api.get('/payments/razorpay-key');
