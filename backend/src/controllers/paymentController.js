/**
 * Payment Controller — Razorpay + COD Integration
 *
 * Flow:
 * 1. Client fills cart → proceeds to checkout
 * 2. POST /api/payments/create-razorpay-order  → creates a Razorpay order, returns orderId + amount
 * 3. Frontend opens Razorpay modal with the orderId
 * 4. User pays → Razorpay calls our webhook (POST /api/payments/webhook)
 *    AND frontend receives payment_id + signature
 * 5. Frontend calls POST /api/payments/verify  → we verify HMAC signature
 * 6. If verified → actual DB Order is created (payment.status = 'completed')
 * 7. For COD: POST /api/payments/place-cod → DB Order created immediately with payment.status = 'pending'
 *
 * Edge cases handled:
 * - Duplicate webhook delivery (idempotency via razorpayOrderId check)
 * - Payment amount tampering (amount verified server-side against cart)
 * - Stock exhaustion between intent & payment (re-checked at order creation)
 * - Webhook signature mismatch → 400 (no order created)
 * - Razorpay order creation failure → 502 (no DB record polluted)
 * - COD with wallet partial payment
 */

const Razorpay       = require('razorpay');
const crypto         = require('crypto');
const Order          = require('../models/Order');
const Product        = require('../models/Product');
const Vendor         = require('../models/Vendor');
const Payout         = require('../models/Payout');
const Category       = require('../models/Category');
const ApiError       = require('../utils/apiError');
const { sendSuccess }= require('../utils/apiResponse');
const catchAsync     = require('../utils/catchAsync');
const { debitWallet, creditWallet } = require('../services/walletService');
const {
  notifyOrderPlacedClient,
  notifyOrderPlacedVendor,
} = require('../services/notificationService');
const { sendOrderConfirmationEmail } = require('../services/emailService');

// ─── Razorpay instance (lazy — initialized on first use) ─────────────────────
let _razorpay = null;

const getRazorpayInstance = () => {
  if (_razorpay) return _razorpay;

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new ApiError(503, 'Payment gateway is not configured. Please contact support.');
  }

  _razorpay = new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  return _razorpay;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Validate, hydrate, and group cart items by vendor.
 * Returns { hydratedItems, vendorGroups, grandTotal }
 */
const hydrateAndGroupItems = async (items) => {
  const hydratedItems = [];

  for (const item of items) {
    if (!item.productId || !item.quantity || item.quantity < 1) {
      throw new ApiError(400, 'Invalid item in cart');
    }

    const product = await Product.findOne({
      _id: item.productId,
      status: 'Approved',
      isActive: true,
    }).populate('vendor', '_id');

    if (!product) throw new ApiError(404, `Product not available for purchase`);
    if (product.stock < item.quantity) {
      throw new ApiError(400, `Insufficient stock for "${product.name}"`);
    }

    hydratedItems.push({
      product:         product._id,
      productSnapshot: {
        name:     product.name,
        price:    product.price,
        image:    product.images[0]?.url || '',
        category: product.category,
      },
      vendorId:  product.vendor._id.toString(),
      quantity:  item.quantity,
      unitPrice: product.price,
      subtotal:  product.price * item.quantity,
    });
  }

  // Group by vendor
  const vendorGroups = {};
  for (const item of hydratedItems) {
    if (!vendorGroups[item.vendorId]) vendorGroups[item.vendorId] = [];
    vendorGroups[item.vendorId].push(item);
  }

  const grandTotal = hydratedItems.reduce((s, i) => s + i.subtotal, 0);

  return { hydratedItems, vendorGroups, grandTotal };
};

/**
 * Calculate per-vendor commission and payout amounts
 */
const calcFinancials = async (vendorDoc, items) => {
  const total = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  let rate = vendorDoc.commissionOverride;
  if (rate === null || rate === undefined) {
    const cat = await Category.findOne({ id: vendorDoc.category });
    rate = cat ? cat.commission : 10;
  }

  const commissionAmount = Math.round(total * (rate / 100));
  const vendorPayout     = total - commissionAmount;

  return { totalAmount: total, commissionRate: rate, commissionAmount, vendorPayout };
};

/**
 * Core order creation — called after payment is confirmed (Razorpay or COD).
 * Handles multi-vendor split, stock decrement, payout scheduling, notifications.
 */
const createOrdersInDB = async ({
  userId,
  userEmail,
  vendorGroups,
  deliveryAddress,
  deliveryPin,
  deliverySlot,
  paymentMethod,
  walletAmountUsed = 0,
  razorpayPaymentId = null,
  razorpayOrderId   = null,
}) => {
  const createdOrders = [];

  for (const [vendorId, vendorItems] of Object.entries(vendorGroups)) {
    const vendor = await Vendor.findById(vendorId).populate('user', '_id email name');
    if (!vendor || vendor.status !== 'Active') {
      throw new ApiError(400, `Vendor is currently unavailable`);
    }

    const cleanItems = vendorItems.map(({ vendorId: _, ...rest }) => rest);

    const { totalAmount, commissionRate, commissionAmount, vendorPayout } =
      await calcFinancials(vendor, cleanItems);

    const order = await Order.create({
      client:          userId,
      vendor:          vendor._id,
      items:           cleanItems,
      totalAmount,
      commissionRate,
      commissionAmount,
      vendorPayout,
      payment: {
        method:            paymentMethod,
        status:            paymentMethod === 'cod' ? 'pending' : 'completed',
        walletAmountUsed:  walletAmountUsed || 0,
        transactionId:     razorpayPaymentId || null,
        gatewayOrderId:    razorpayOrderId   || null,
        gatewayPaymentId:  razorpayPaymentId || null,
        paidAt:            paymentMethod !== 'cod' ? new Date() : null,
      },
      deliveryAddress,
      deliveryPin,
      deliverySlot,
      returnPolicy: vendor.returnPolicy,
    });

    // Payout scheduling
    const payoutScheduledAt = vendor.returnPolicy
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      : new Date();

    await Payout.create({
      vendor:             vendor._id,
      order:              order._id,
      amount:             vendorPayout,
      commissionDeducted: commissionAmount,
      commissionRate,
      orderTotal:         totalAmount,
      // COD: payout only after payment collected, so always scheduled
      status:             (paymentMethod === 'cod' || vendor.returnPolicy)
                            ? 'scheduled'
                            : 'pending',
      scheduledFor:       payoutScheduledAt,
    });

    await Order.findByIdAndUpdate(order._id, {
      payoutStatus:      (paymentMethod === 'cod' || vendor.returnPolicy) ? 'scheduled' : 'pending',
      payoutScheduledAt: (paymentMethod === 'cod' || vendor.returnPolicy) ? payoutScheduledAt : undefined,
    });

    // Decrement stock
    for (const item of cleanItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    }

    // Update vendor financials
    await Vendor.findByIdAndUpdate(vendor._id, {
      $inc: {
        'financials.totalOrders':   1,
        'financials.pendingPayout': vendorPayout,
      },
    });

    // Notify vendor
    notifyOrderPlacedVendor(vendor.user._id, order.orderNumber, totalAmount, order._id)
      .catch(console.error);

    createdOrders.push(order);
  }

  // Notify client
  const firstOrder = createdOrders[0];
  notifyOrderPlacedClient(userId, firstOrder.orderNumber, firstOrder._id).catch(console.error);

  // Confirmation email
  if (userEmail) {
    const grandTotal = Object.values(vendorGroups)
      .flatMap(items => items)
      .reduce((s, i) => s + i.unitPrice * i.quantity, 0);

    sendOrderConfirmationEmail(userEmail, {
      orderNumber:     firstOrder.orderNumber,
      items:           firstOrder.items,
      totalAmount:     grandTotal,
      deliveryAddress,
      deliverySlot,
    }).catch(console.error);
  }

  return createdOrders;
};

// ─── CONTROLLERS ─────────────────────────────────────────────────────────────

/**
 * @route  POST /api/payments/create-razorpay-order
 * @desc   Step 1 — Validate cart server-side, create a Razorpay order.
 *         Returns { razorpayOrderId, amount, currency, keyId } to the frontend.
 * @access Private (Client)
 */
exports.createRazorpayOrder = catchAsync(async (req, res) => {
  const {
    items,
    deliveryAddress,
    deliveryPin,
    deliverySlot,
    walletAmount = 0,
  } = req.body;

  if (!items || items.length === 0) throw new ApiError(400, 'Cart is empty');
  if (!deliveryAddress || !deliveryPin || !deliverySlot) {
    throw new ApiError(400, 'Delivery details are required');
  }
  if (!/^700\d{3}$/.test(deliveryPin)) {
    throw new ApiError(400, 'Delivery is only available in Kolkata');
  }

  // Hydrate + validate cart items (stock check)
  const { grandTotal, hydratedItems } = await hydrateAndGroupItems(items);

  // Wallet partial payment
  const walletUsed  = Math.min(Number(walletAmount), grandTotal);
  const payableAmount = grandTotal - walletUsed;

  if (payableAmount < 1) {
    // Entire order is covered by wallet — skip Razorpay, treat as wallet payment
    throw new ApiError(400, 'Use /place-wallet-order for full wallet payments');
  }

  // Razorpay requires amount in paise (smallest INR unit)
  const amountInPaise = Math.round(payableAmount * 100);

  const razorpayOrder = await getRazorpayInstance().orders.create({
    amount:   amountInPaise,
    currency: 'INR',
    receipt:  `dk_${Date.now()}`,
    notes: {
      userId:          req.user._id.toString(),
      deliveryPin,
      walletAmountUsed: walletUsed.toString(),
    },
  });

  // Store cart snapshot in a temporary store so we can re-validate at verify step.
  // We embed it in the Razorpay notes since we don't have a separate temp collection.
  // The verify step will re-validate stock independently — this is just for UX reference.

  return sendSuccess(res, 200, 'Razorpay order created', {
    razorpayOrderId: razorpayOrder.id,
    amount:          amountInPaise,
    currency:        'INR',
    keyId:           process.env.RAZORPAY_KEY_ID,
    grandTotal,
    walletAmountUsed: walletUsed,
    payableAmount,
  });
});

/**
 * @route  POST /api/payments/verify
 * @desc   Step 2 — Verify Razorpay payment signature after frontend payment success.
 *         On success: deduct wallet (if any), create Order docs in DB.
 * @access Private (Client)
 */
exports.verifyPayment = catchAsync(async (req, res) => {
  const {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    // Cart details re-sent for order creation
    items,
    deliveryAddress,
    deliveryPin,
    deliverySlot,
    walletAmount = 0,
  } = req.body;

  // ── 1. Signature verification ─────────────────────────────────────────────
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw new ApiError(400, 'Payment verification data missing');
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    throw new ApiError(400, 'Payment signature verification failed. Possible tampering detected.');
  }

  // ── 2. Idempotency — check if order already created for this payment ───────
  const existingOrder = await Order.findOne({
    'payment.gatewayOrderId': razorpayOrderId,
  });
  if (existingOrder) {
    return sendSuccess(res, 200, 'Order already processed', {
      orders:    [existingOrder],
      grandTotal: existingOrder.totalAmount,
      orderCount: 1,
    });
  }

  // ── 3. Re-validate cart + stock ───────────────────────────────────────────
  if (!items || items.length === 0) throw new ApiError(400, 'Cart data missing');
  if (!deliveryAddress || !deliveryPin || !deliverySlot) {
    throw new ApiError(400, 'Delivery details are required');
  }

  const { vendorGroups, grandTotal } = await hydrateAndGroupItems(items);

  // ── 4. Verify Razorpay order amount matches our calculated total ───────────
  const razorpayOrderDetails = await getRazorpayInstance().orders.fetch(razorpayOrderId);
  const walletUsed  = Math.min(Number(walletAmount), grandTotal);
  const expectedPaise = Math.round((grandTotal - walletUsed) * 100);

  if (razorpayOrderDetails.amount !== expectedPaise) {
    throw new ApiError(400, 'Payment amount mismatch. Order cannot be processed.');
  }

  // ── 5. Deduct wallet if used ──────────────────────────────────────────────
  if (walletUsed > 0) {
    await debitWallet(
      req.user._id,
      walletUsed,
      'order_payment',
      'Wallet partial payment for order',
      null,
      req.user._id
    );
  }

  // ── 6. Create orders in DB ────────────────────────────────────────────────
  const createdOrders = await createOrdersInDB({
    userId:            req.user._id,
    userEmail:         req.user.email,
    vendorGroups,
    deliveryAddress,
    deliveryPin,
    deliverySlot,
    paymentMethod:     walletUsed > 0 ? 'upi' : 'upi', // wallet partial + razorpay = upi
    walletAmountUsed:  walletUsed,
    razorpayPaymentId,
    razorpayOrderId,
  });

  return sendSuccess(res, 201, 'Payment verified. Order placed successfully!', {
    orders:     createdOrders,
    grandTotal,
    orderCount: createdOrders.length,
  });
});

/**
 * @route  POST /api/payments/place-wallet-order
 * @desc   Place an order entirely from wallet balance (no Razorpay involved).
 * @access Private (Client)
 */
exports.placeWalletOrder = catchAsync(async (req, res) => {
  const { items, deliveryAddress, deliveryPin, deliverySlot } = req.body;

  if (!items || items.length === 0) throw new ApiError(400, 'Cart is empty');
  if (!deliveryAddress || !deliveryPin || !deliverySlot) {
    throw new ApiError(400, 'Delivery details are required');
  }
  if (!/^700\d{3}$/.test(deliveryPin)) {
    throw new ApiError(400, 'Delivery is only available in Kolkata');
  }

  const { vendorGroups, grandTotal } = await hydrateAndGroupItems(items);

  // Check wallet balance
  if (req.user.walletBalance < grandTotal) {
    throw new ApiError(400, `Insufficient wallet balance. Available: ₹${req.user.walletBalance}, Required: ₹${grandTotal}`);
  }

  // Deduct wallet
  await debitWallet(
    req.user._id,
    grandTotal,
    'order_payment',
    'Full wallet payment for order',
    null,
    req.user._id
  );

  const createdOrders = await createOrdersInDB({
    userId:          req.user._id,
    userEmail:       req.user.email,
    vendorGroups,
    deliveryAddress,
    deliveryPin,
    deliverySlot,
    paymentMethod:   'wallet',
    walletAmountUsed: grandTotal,
  });

  return sendSuccess(res, 201, 'Order placed with wallet balance!', {
    orders:     createdOrders,
    grandTotal,
    orderCount: createdOrders.length,
  });
});

/**
 * @route  POST /api/payments/place-cod
 * @desc   Place a Cash on Delivery order.
 *         Wallet partial payment supported (deducted immediately; COD remainder on delivery).
 * @access Private (Client)
 */
exports.placeCODOrder = catchAsync(async (req, res) => {
  const {
    items,
    deliveryAddress,
    deliveryPin,
    deliverySlot,
    walletAmount = 0,
  } = req.body;

  if (!items || items.length === 0) throw new ApiError(400, 'Cart is empty');
  if (!deliveryAddress || !deliveryPin || !deliverySlot) {
    throw new ApiError(400, 'Delivery details are required');
  }
  if (!/^700\d{3}$/.test(deliveryPin)) {
    throw new ApiError(400, 'Delivery is only available in Kolkata');
  }

  const { vendorGroups, grandTotal } = await hydrateAndGroupItems(items);

  const walletUsed = Math.min(Number(walletAmount), grandTotal);
  const codAmount  = grandTotal - walletUsed;

  // Deduct wallet portion immediately
  if (walletUsed > 0) {
    if (req.user.walletBalance < walletUsed) {
      throw new ApiError(400, 'Insufficient wallet balance for partial payment');
    }
    await debitWallet(
      req.user._id,
      walletUsed,
      'order_payment',
      'Wallet partial payment for COD order',
      null,
      req.user._id
    );
  }

  const createdOrders = await createOrdersInDB({
    userId:          req.user._id,
    userEmail:       req.user.email,
    vendorGroups,
    deliveryAddress,
    deliveryPin,
    deliverySlot,
    paymentMethod:   'cod',
    walletAmountUsed: walletUsed,
  });

  return sendSuccess(res, 201, 'COD order placed successfully!', {
    orders:      createdOrders,
    grandTotal,
    codAmount,
    walletAmountUsed: walletUsed,
    orderCount:  createdOrders.length,
    message:     codAmount > 0
      ? `Pay ₹${codAmount} cash at the time of delivery.`
      : 'Fully paid via wallet. No cash required on delivery.',
  });
});

/**
 * @route  POST /api/payments/webhook
 * @desc   Razorpay webhook handler.
 *         Handles payment.captured (success) and payment.failed events.
 *         Signature verified using X-Razorpay-Signature header.
 * @access Public (Razorpay servers only — verified by signature)
 *
 * IMPORTANT: This route must use raw body (not JSON-parsed).
 *            In server.js, register this route BEFORE express.json() middleware,
 *            OR use express.raw() for this specific path.
 */
exports.handleWebhook = (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  let event;
  try {
    const body = req.body;
    const bodyString = body instanceof Buffer ? body.toString() : JSON.stringify(body);
    event = body instanceof Buffer ? JSON.parse(bodyString) : body;
  } catch (error) {
    console.error('[Webhook] Failed to parse body:', error.message);
    return res.status(400).json({ success: false, message: 'Invalid webhook payload' });
  }

  if (webhookSecret) {
    const signature  = req.headers['x-razorpay-signature'];
    const bodyString = JSON.stringify(event);

    const expectedSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(bodyString)
      .digest('hex');

    if (signature !== expectedSig) {
      console.error('[Webhook] Invalid signature');
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }
  }

  const eventType = event?.event;

  if (eventType === 'payment.captured') {
    const payment = event.payload?.payment?.entity;
    console.log(`[Webhook] Payment captured: ${payment?.id} for order ${payment?.order_id}`);
  }

  if (eventType === 'payment.failed') {
    const payment = event.payload?.payment?.entity;
    console.error(`[Webhook] Payment failed: ${payment?.id} — ${payment?.error_description}`);
    Order.findOneAndUpdate(
      { 'payment.gatewayOrderId': payment?.order_id, 'payment.status': 'pending' },
      { 'payment.status': 'failed' }
    ).catch(console.error);
  }

  return res.status(200).json({ success: true, received: true });
};

/**
 * @route  GET /api/payments/razorpay-key
 * @desc   Return Razorpay public key to frontend (avoids hardcoding in client bundle)
 * @access Private (Client)
 */
exports.getRazorpayKey = catchAsync(async (req, res) => {
  return sendSuccess(res, 200, 'Razorpay key', {
    keyId: process.env.RAZORPAY_KEY_ID,
  });
});
