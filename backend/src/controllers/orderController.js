const Order  = require('../models/Order');
const Payout = require('../models/Payout');
const Product = require('../models/Product');
const Vendor  = require('../models/Vendor');
const Category = require('../models/Category');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');
const { debitWallet, creditWallet } = require('../services/walletService');
const {
  notifyOrderPlacedClient,
  notifyOrderPlacedVendor,
  notifyOrderPacked,
  notifyOrderShipped,
  notifyOrderDeliveredClient,
  notifyOrderDeliveredVendor,
  notifyReturnRequested,
  notifyReturnDecision,
  notifyRefundProcessed,
  notifyDisputeRaised,
  notifyPayoutReleased
} = require('../services/notificationService');
const { sendOrderConfirmationEmail, sendPayoutNotificationEmail } = require('../services/emailService');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Calculate per-vendor commission and payout amounts
 */
const calcFinancials = async (vendorDoc, items) => {
  const total = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  // Use vendor commissionOverride if set, else fetch category default
  let rate = vendorDoc.commissionOverride;
  if (rate === null || rate === undefined) {
    const cat = await Category.findOne({ id: vendorDoc.category });
    rate = cat ? cat.commission : 10;
  }

  const commissionAmount = Math.round(total * (rate / 100));
  const vendorPayout     = total - commissionAmount;

  return { totalAmount: total, commissionRate: rate, commissionAmount, vendorPayout };
};

// ─── CLIENT ───────────────────────────────────────────────────────────────────

/**
 * @route  POST /api/orders/create
 * @desc   Place an order (PRD §4.4). Splits cart by vendor — one Order doc per vendor.
 * @access Private (Client)
 */
exports.createOrder = catchAsync(async (req, res) => {
  const { items, deliveryAddress, deliveryPin, deliverySlot, paymentMethod = 'upi', walletAmount = 0 } = req.body;

  if (!items || items.length === 0) throw new ApiError(400, 'Cart is empty');
  if (!deliveryAddress || !deliveryPin || !deliverySlot) throw new ApiError(400, 'Delivery details are required');
  if (!/^700\d{3}$/.test(deliveryPin)) throw new ApiError(400, 'Delivery is only available in Kolkata');

  // ── Validate & hydrate items ──────────────────────────────────────────────
  const hydratedItems = [];
  for (const item of items) {
    // Allow Approved products; also allow Pending for vendor self-test
    const product = await Product.findOne({
      _id: item.productId,
      status: 'Approved',
      isActive: true
    }).populate('vendor', '_id');
    if (!product) throw new ApiError(404, `Product not available for purchase`);
    if (product.stock < item.quantity) throw new ApiError(400, `Insufficient stock for "${product.name}"`);

    hydratedItems.push({
      product: product._id,
      productSnapshot: {
        name: product.name,
        price: product.price,
        image: product.images[0]?.url || '',
        category: product.category
      },
      vendorId: product.vendor.toString(),
      quantity: item.quantity,
      unitPrice: product.price,
      subtotal: product.price * item.quantity
    });
  }

  // ── Group by vendor ────────────────────────────────────────────────────────
  const vendorGroups = {};
  for (const item of hydratedItems) {
    if (!vendorGroups[item.vendorId]) vendorGroups[item.vendorId] = [];
    vendorGroups[item.vendorId].push(item);
  }

  const grandTotal = hydratedItems.reduce((s, i) => s + i.subtotal, 0);

  // ── Handle wallet payment ──────────────────────────────────────────────────
  const walletUsed = Math.min(Number(walletAmount), grandTotal);
  if (walletUsed > 0) {
    await debitWallet(
      req.user._id, walletUsed, 'order_payment',
      'Wallet payment for order',
      null, req.user._id
    );
  }

  // ── Create one Order per vendor ────────────────────────────────────────────
  const createdOrders = [];

  for (const [vendorId, vendorItems] of Object.entries(vendorGroups)) {
    const vendor = await Vendor.findById(vendorId).populate('user', '_id email name');
    if (!vendor || vendor.status !== 'Active') throw new ApiError(400, `Vendor is currently unavailable`);

    // Strip vendorId helper field before saving
    const cleanItems = vendorItems.map(({ vendorId: _, ...rest }) => rest);

    const { totalAmount, commissionRate, commissionAmount, vendorPayout } = await calcFinancials(vendor, cleanItems);

    const order = await Order.create({
      client:          req.user._id,
      vendor:          vendor._id,
      items:           cleanItems,
      totalAmount,
      commissionRate,
      commissionAmount,
      vendorPayout,
      payment: {
        method:         paymentMethod,
        // Legacy route: wallet payments are immediate; UPI/card should go through /payments/verify
        status:         (paymentMethod === 'wallet') ? 'completed' : 'pending',
        walletAmountUsed: walletUsed > 0 ? walletUsed : 0,
        paidAt:         paymentMethod === 'wallet' ? new Date() : null
      },
      deliveryAddress,
      deliveryPin,
      deliverySlot,
      returnPolicy:   vendor.returnPolicy
    });

    // Payout entry — scheduled or immediate depending on return policy
    const payoutScheduledAt = vendor.returnPolicy
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      : new Date();

    await Payout.create({
      vendor:    vendor._id,
      order:     order._id,
      amount:    vendorPayout,
      commissionDeducted: commissionAmount,
      commissionRate,
      orderTotal: totalAmount,
      status:    vendor.returnPolicy ? 'scheduled' : 'pending',
      scheduledFor: payoutScheduledAt
    });

    // Update Order payoutStatus
    await Order.findByIdAndUpdate(order._id, {
      payoutStatus:      vendor.returnPolicy ? 'scheduled' : 'pending',
      payoutScheduledAt: vendor.returnPolicy ? payoutScheduledAt : undefined
    });

    // Decrement stock
    for (const item of cleanItems) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
    }

    // Update vendor pending payout
    await Vendor.findByIdAndUpdate(vendor._id, {
      $inc: {
        'financials.totalOrders': 1,
        'financials.pendingPayout': vendorPayout
      }
    });

    // Notifications
    notifyOrderPlacedVendor(vendor.user._id, order.orderNumber, totalAmount, order._id).catch(console.error);

    createdOrders.push(order);
  }

  // ── Notify client ──────────────────────────────────────────────────────────
  const firstOrder = createdOrders[0];
  notifyOrderPlacedClient(req.user._id, firstOrder.orderNumber, firstOrder._id).catch(console.error);

  // Send confirmation email if available
  if (req.user.email) {
    sendOrderConfirmationEmail(req.user.email, {
      orderNumber:     firstOrder.orderNumber,
      items:           firstOrder.items,
      totalAmount:     grandTotal,
      deliveryAddress,
      deliverySlot
    }).catch(console.error);
  }

  return sendSuccess(res, 201, 'Order placed successfully', {
    orders:     createdOrders,
    grandTotal,
    orderCount: createdOrders.length
  });
});

/**
 * @route  GET /api/orders/my-orders
 * @access Private (Client)
 */
exports.getMyOrders = catchAsync(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const query = { client: req.user._id };
  if (status) query.status = status;

  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('vendor', 'name location pin storeDetails')
      .lean(),
    Order.countDocuments(query)
  ]);

  return sendSuccess(res, 200, 'Orders fetched', {
    orders,
    pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)), limit: Number(limit) }
  });
});

/**
 * @route  GET /api/orders/:id
 * @access Private (Client / Vendor / Admin)
 */
exports.getOrderById = catchAsync(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('client', 'phone name email')
    .populate({ path: 'vendor', populate: { path: 'user', select: 'phone name' } })
    .lean();

  if (!order) throw new ApiError(404, 'Order not found');

  // Access control
  const userId   = req.user._id.toString();
  const clientId = order.client?._id?.toString();
  const vendorUserId = order.vendor?.user?._id?.toString();

  if (req.user.role === 'client'  && clientId    !== userId) throw new ApiError(403, 'Access denied');
  if (req.user.role === 'vendor'  && vendorUserId !== userId) throw new ApiError(403, 'Access denied');

  // Compute live return-window flag
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const returnWindowOpen = order.returnPolicy
    && order.status === 'Delivered'
    && order.deliveredAt
    && (Date.now() - new Date(order.deliveredAt).getTime()) < sevenDays;

  return sendSuccess(res, 200, 'Order fetched', { order: { ...order, returnWindowOpen } });
});

// ─── VENDOR ───────────────────────────────────────────────────────────────────

/**
 * @route  GET /api/orders/vendor/orders
 * @access Private (Vendor)
 */
exports.getVendorOrders = catchAsync(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const query = { vendor: req.vendor._id };
  if (status) query.status = status;

  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('client', 'phone name')
      .lean(),
    Order.countDocuments(query)
  ]);

  return sendSuccess(res, 200, 'Vendor orders fetched', {
    orders,
    pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)), limit: Number(limit) }
  });
});

/**
 * @route  PUT /api/orders/:id/status
 * @desc   Vendor updates: Placed→Packed, Packed→Shipped, Shipped→Delivered
 * @access Private (Vendor)
 */
exports.updateOrderStatus = catchAsync(async (req, res) => {
  const { status, note, trackingId, courierName } = req.body;
  const allowed = ['Packed', 'Shipped', 'Delivered'];

  if (!allowed.includes(status)) throw new ApiError(400, `Invalid status. Allowed: ${allowed.join(', ')}`);

  const order = await Order.findOne({ _id: req.params.id, vendor: req.vendor._id });
  if (!order) throw new ApiError(404, 'Order not found');

  // Status transition guard
  const transitions = { Placed: 'Packed', Packed: 'Shipped', Shipped: 'Delivered' };
  if (transitions[order.status] !== status) {
    throw new ApiError(400, `Cannot move order from "${order.status}" to "${status}"`);
  }

  order.addStatusUpdate(status, note || '');

  if (status === 'Packed') {
    order.dispatch = { ...order.dispatch, packedAt: new Date(), trackingId, courierName };
    notifyOrderPacked(order.client, order.orderNumber, order._id).catch(console.error);
  }

  if (status === 'Shipped') {
    order.dispatch = { ...order.dispatch, shippedAt: new Date(), trackingId, courierName };
    notifyOrderShipped(order.client, order.orderNumber, order._id).catch(console.error);
  }

  if (status === 'Delivered') {
    order.deliveredAt = new Date();

    if (!order.returnPolicy) {
      // Immediate payout — update payout doc to 'released'
      await Payout.findOneAndUpdate({ order: order._id }, {
        status: 'released',
        releasedAt: new Date()
      });
      order.payoutStatus = 'released';
      order.payoutReleasedAt = new Date();

      // Update vendor financials
      await Vendor.findByIdAndUpdate(order.vendor, {
        $inc: {
          'financials.revenue': order.totalAmount,
          'financials.commissionPaid': order.commissionAmount,
          'financials.pendingPayout': -order.vendorPayout
        }
      });

      notifyPayoutReleased(req.user._id, order.vendorPayout, order.orderNumber, order._id).catch(console.error);
    } else {
      // T+7 payout — already scheduled in Payout doc at order creation
      order.payoutStatus = 'scheduled';
    }

    notifyOrderDeliveredClient(order.client, order.orderNumber, order.returnPolicy, order._id).catch(console.error);
    notifyOrderDeliveredVendor(req.user._id, order.orderNumber, order.vendorPayout, order.returnPolicy, order._id).catch(console.error);
  }

  await order.save();

  return sendSuccess(res, 200, `Order status updated to ${status}`, { order });
});

// ─── RETURNS & DISPUTES ───────────────────────────────────────────────────────

/**
 * @route  POST /api/orders/:id/return
 * @desc   Client raises a return request (within 7-day window if returnPolicy=true)
 * @access Private (Client)
 */
exports.requestReturn = catchAsync(async (req, res) => {
  const { reason, description } = req.body;
  if (!reason) throw new ApiError(400, 'Return reason is required');

  const order = await Order.findOne({ _id: req.params.id, client: req.user._id }).populate({
    path: 'vendor',
    populate: { path: 'user', select: '_id' }
  });

  if (!order) throw new ApiError(404, 'Order not found');
  if (!order.returnPolicy) throw new ApiError(400, 'This order has no return policy');
  if (order.status !== 'Delivered') throw new ApiError(400, 'Can only return delivered orders');

  // Check 7-day window
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const elapsed   = Date.now() - new Date(order.deliveredAt).getTime();
  if (elapsed > sevenDays) throw new ApiError(400, 'Return window of 7 days has expired');

  // Check for existing return request
  if (order.returnRequest && order.returnRequest.status !== 'Rejected') {
    throw new ApiError(400, 'A return request already exists for this order');
  }

  order.status = 'ReturnRequested';
  order.returnRequest = {
    reason,
    description: description || '',
    status: 'Pending',
    requestedAt: new Date()
  };

  // Hold payout if scheduled
  await Payout.findOneAndUpdate(
    { order: order._id, status: { $in: ['scheduled', 'pending'] } },
    { status: 'held', heldAt: new Date(), heldReason: 'Return request raised' }
  );
  order.payoutStatus = 'held';

  await order.save();

  notifyReturnRequested(order.vendor.user._id, order.orderNumber, reason, order._id).catch(console.error);

  return sendSuccess(res, 200, 'Return request submitted', { order });
});

/**
 * @route  PUT /api/orders/:id/return-decision
 * @desc   Vendor approves or rejects the return request
 * @access Private (Vendor)
 */
exports.handleReturnDecision = catchAsync(async (req, res) => {
  const { approved, rejectReason } = req.body;
  if (approved === undefined) throw new ApiError(400, '"approved" boolean is required');

  const order = await Order.findOne({ _id: req.params.id, vendor: req.vendor._id })
    .populate('client', '_id email');

  if (!order) throw new ApiError(404, 'Order not found');
  if (order.status !== 'ReturnRequested') throw new ApiError(400, 'No pending return request');

  if (approved) {
    // Refund to client wallet
    await creditWallet(
      order.client._id,
      order.totalAmount,
      'refund',
      `Refund for return on order ${order.orderNumber}`,
      { type: 'Order', id: order._id }
    );

    // Cancel payout
    await Payout.findOneAndUpdate(
      { order: order._id },
      { status: 'cancelled', cancelledAt: new Date(), cancelReason: 'Return approved' }
    );

    order.status = 'Refunded';
    order.returnRequest.status = 'Approved';
    order.returnRequest.decidedAt = new Date();
    order.payoutStatus = 'cancelled';

    notifyRefundProcessed(order.client._id, order.totalAmount, order._id).catch(console.error);
    notifyReturnDecision(order.client._id, order.orderNumber, true, order._id).catch(console.error);

  } else {
    // Vendor rejects → escalate to admin
    if (!rejectReason) throw new ApiError(400, 'Rejection reason is required');

    order.status = 'Disputed';
    order.returnRequest.status = 'Rejected';
    order.returnRequest.rejectReason = rejectReason;
    order.returnRequest.decidedAt = new Date();

    // Notify all admins about the dispute
    const User = require('../models/User');
    const adminUsers = await User.find({ role: 'admin', isActive: true }).select('_id').lean();
    for (const admin of adminUsers) {
      notifyDisputeRaised(admin._id, order.orderNumber, order._id).catch(console.error);
    }
    notifyReturnDecision(order.client._id, order.orderNumber, false, order._id).catch(console.error);
  }

  await order.save();

  return sendSuccess(res, 200, `Return ${approved ? 'approved' : 'rejected'}`, { order });
});

/**
 * @route  PUT /api/orders/:id/resolve-dispute
 * @desc   Admin resolves the dispute — favor client (refund) or vendor (release payout)
 * @access Private (Admin)
 */
exports.resolveDispute = catchAsync(async (req, res) => {
  const { favorClient, adminNotes } = req.body;
  if (favorClient === undefined) throw new ApiError(400, '"favorClient" boolean is required');

  const order = await Order.findById(req.params.id)
    .populate('client', '_id email')
    .populate({ path: 'vendor', populate: { path: 'user', select: '_id email name' } });

  if (!order) throw new ApiError(404, 'Order not found');
  if (order.status !== 'Disputed') throw new ApiError(400, 'Order is not in Disputed state');

  if (favorClient) {
    await creditWallet(
      order.client._id,
      order.totalAmount,
      'refund',
      `Admin dispute resolution — refund for order ${order.orderNumber}`,
      { type: 'Order', id: order._id }
    );
    await Payout.findOneAndUpdate(
      { order: order._id },
      { status: 'cancelled', cancelledAt: new Date(), cancelReason: 'Admin ruled in favour of client' }
    );
    order.status = 'Refunded';
    order.returnRequest.status = 'Approved';
    order.returnRequest.adminNotes = adminNotes || 'Resolved in client favour';
    order.payoutStatus = 'cancelled';

    notifyRefundProcessed(order.client._id, order.totalAmount, order._id).catch(console.error);

  } else {
    // Release payout to vendor
    const payout = await Payout.findOneAndUpdate(
      { order: order._id },
      { status: 'released', releasedAt: new Date() },
      { returnDocument: 'after' }
    );
    await Vendor.findByIdAndUpdate(order.vendor._id, {
      $inc: {
        'financials.revenue': order.totalAmount,
        'financials.commissionPaid': order.commissionAmount,
        'financials.pendingPayout': -order.vendorPayout
      }
    });
    order.status = 'Delivered';
    order.payoutStatus = 'released';
    order.payoutReleasedAt = new Date();
    order.returnRequest.status = 'Rejected';
    order.returnRequest.adminNotes = adminNotes || 'Resolved in vendor favour';

    if (order.vendor.user?._id) {
      notifyPayoutReleased(order.vendor.user._id, order.vendorPayout, order.orderNumber, payout?._id).catch(console.error);
      if (order.vendor.user?.email) {
        sendPayoutNotificationEmail(order.vendor.user.email, order.vendor.name, order.vendorPayout, order.orderNumber).catch(console.error);
      }
    }
  }

  await order.save();

  return sendSuccess(res, 200, 'Dispute resolved', { order });
});

// ─── ADMIN ────────────────────────────────────────────────────────────────────

/**
 * @route  GET /api/admin/orders
 * @access Private (Admin)
 */
exports.getAllOrders = catchAsync(async (req, res) => {
  const { status, vendor, client, page = 1, limit = 20, from, to } = req.query;
  const query = {};

  if (status) query.status = status;
  if (vendor) query.vendor = vendor;
  if (client) query.client = client;
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to)   query.createdAt.$lte = new Date(to);
  }

  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('client', 'phone name')
      .populate('vendor', 'name category')
      .lean(),
    Order.countDocuments(query)
  ]);

  return sendSuccess(res, 200, 'All orders fetched', {
    orders,
    pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)), limit: Number(limit) }
  });
});
