const Vendor   = require('../models/Vendor');
const User     = require('../models/User');
const Category = require('../models/Category');
const Product  = require('../models/Product');
const Order    = require('../models/Order');
const Coupon   = require('../models/Coupon');
const Payout   = require('../models/Payout');
const Config   = require('../models/Config');
const WalletTransaction = require('../models/WalletTransaction');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');
const { notifyVendorAccountCreated, notifyPayoutReleased } = require('../services/notificationService');
const { sendVendorWelcomeEmail, sendPayoutNotificationEmail } = require('../services/emailService');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');

// ── VENDOR MANAGEMENT ─────────────────────────────────────────────────────────

/**
 * @route  POST /api/admin/vendors
 * @desc   Onboard a new vendor (PRD §4.1 — sales-assisted, not self-serve)
 * @access Private (Admin)
 */
exports.onboardVendor = catchAsync(async (req, res) => {
  const {
    phone, name, email, category, location, pin,
    bankName, accountNumber, ifscCode, accountHolderName, panNumber,
    returnPolicy, commissionOverride, skuCap, onboardingNotes,
    contactPerson
  } = req.body;

  if (!phone || !name || !category || !location || !pin || !bankName || !accountNumber || !ifscCode || !accountHolderName) {
    throw new ApiError(400, 'Required fields: phone, name, category, location, pin, and full bank details');
  }

  // Check category exists
  const cat = await Category.findOne({ id: category });
  if (!cat) throw new ApiError(400, 'Invalid category');

  // Check if user already exists
  let user = await User.findOne({ phone });
  if (user && user.role === 'vendor') {
    throw new ApiError(400, 'A vendor account with this phone already exists');
  }

  // Create User for vendor
  const tempPassword = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8-char temp password
  if (!user) {
    user = await User.create({
      phone,
      name,
      email: email || undefined,
      role:  'vendor',
      password: tempPassword,
      isActive: true
    });
  } else {
    // Convert existing user to vendor
    user.role = 'vendor';
    user.password = tempPassword;
    await user.save();
  }

  // Create Vendor profile
  const vendor = await Vendor.create({
    user:       user._id,
    name,
    category,
    location,
    pin,
    status:     'Active',
    returnPolicy: returnPolicy === true || returnPolicy === 'true',
    commissionOverride: commissionOverride ? Number(commissionOverride) : null,
    skuCap:     skuCap ? Number(skuCap) : 20,
    bankDetails: { bankName, accountNumber, ifscCode, accountHolderName, panNumber: panNumber || undefined },
    contactPerson: contactPerson || undefined,
    onboardedBy: req.user._id,
    onboardingNotes: onboardingNotes || ''
  });

  // Send notification
  notifyVendorAccountCreated(user._id, name).catch(console.error);

  // Send email with credentials
  if (email) {
    sendVendorWelcomeEmail(email, name, phone, tempPassword).catch(console.error);
  }

  return sendSuccess(res, 201, 'Vendor onboarded successfully', {
    vendor,
    credentials: { phone, tempPassword },
    message: 'Vendor should change password on first login'
  });
});

/**
 * @route  GET /api/admin/vendors
 * @access Private (Admin)
 */
exports.getAllVendors = catchAsync(async (req, res) => {
  const { status, category, page = 1, limit = 20 } = req.query;
  const query = {};
  if (status)   query.status   = status;
  if (category) query.category = category;

  const [vendors, total] = await Promise.all([
    Vendor.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('user', 'phone name email')
      .select('-bankDetails.accountNumber -kycDocuments')
      .lean(),
    Vendor.countDocuments(query)
  ]);

  return sendSuccess(res, 200, 'Vendors fetched', {
    vendors,
    pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)), limit: Number(limit) }
  });
});

/**
 * @route  GET /api/admin/vendors/:id
 * @access Private (Admin)
 */
exports.getVendorById = catchAsync(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id)
    .populate('user', 'phone name email lastLogin')
    .populate('onboardedBy', 'name');

  if (!vendor) throw new ApiError(404, 'Vendor not found');

  return sendSuccess(res, 200, 'Vendor fetched', { vendor });
});

/**
 * @route  PUT /api/admin/vendors/:id
 * @access Private (Admin)
 */
exports.updateVendor = catchAsync(async (req, res) => {
  const allowed = ['name', 'category', 'location', 'pin', 'returnPolicy', 'commissionOverride',
    'skuCap', 'contactPerson', 'bankDetails', 'onboardingNotes'];
  const updates = {};
  allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  const vendor = await Vendor.findByIdAndUpdate(req.params.id, updates, { returnDocument: 'after', runValidators: true });
  if (!vendor) throw new ApiError(404, 'Vendor not found');

  return sendSuccess(res, 200, 'Vendor updated', { vendor });
});

/**
 * @route  PUT /api/admin/vendors/:id/status
 * @access Private (Admin)
 */
exports.updateVendorStatus = catchAsync(async (req, res) => {
  const { status } = req.body;
  const allowed = ['Active', 'Suspended', 'Rejected'];
  if (!allowed.includes(status)) throw new ApiError(400, `Invalid status. Allowed: ${allowed.join(', ')}`);

  const vendor = await Vendor.findByIdAndUpdate(req.params.id, { status }, { returnDocument: 'after' });
  if (!vendor) throw new ApiError(404, 'Vendor not found');

  // Optionally suspend user account too
  if (status === 'Suspended') {
    await User.findByIdAndUpdate(vendor.user, { isActive: false });
  } else if (status === 'Active') {
    await User.findByIdAndUpdate(vendor.user, { isActive: true });
  }

  return sendSuccess(res, 200, 'Vendor status updated', { vendor });
});

// ── CATEGORY MANAGEMENT ───────────────────────────────────────────────────────

/**
 * @route  GET /api/admin/categories
 * @access Private (Admin)
 */
exports.getCategories = catchAsync(async (req, res) => {
  const categories = await Category.find().sort({ displayOrder: 1, name: 1 }).lean();
  return sendSuccess(res, 200, 'Categories fetched', { categories });
});

/**
 * @route  PUT /api/admin/categories/:id
 * @desc   Update category commission %
 * @access Private (Admin)
 */
exports.updateCategory = catchAsync(async (req, res) => {
  const { commission, name, description, displayOrder, isActive } = req.body;
  const updates = {};
  if (commission !== undefined) updates.commission = Number(commission);
  if (name !== undefined)        updates.name        = name;
  if (description !== undefined) updates.description = description;
  if (displayOrder !== undefined) updates.displayOrder = Number(displayOrder);
  if (isActive !== undefined)    updates.isActive    = isActive;

  const category = await Category.findOneAndUpdate(
    { id: req.params.id },
    updates,
    { returnDocument: 'after', runValidators: true }
  );
  if (!category) throw new ApiError(404, 'Category not found');

  return sendSuccess(res, 200, 'Category updated', { category });
});

// ── PRODUCT MODERATION ────────────────────────────────────────────────────────

/**
 * @route  GET /api/admin/products/pending
 * @access Private (Admin)
 */
exports.getPendingProducts = catchAsync(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const [products, total] = await Promise.all([
    Product.find({ status: 'Pending' })
      .sort({ createdAt: 1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('vendor', 'name category location')
      .lean(),
    Product.countDocuments({ status: 'Pending' })
  ]);

  return sendSuccess(res, 200, 'Pending products fetched', {
    products,
    pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)), limit: Number(limit) }
  });
});

// ─── Already implemented in productController: approveProduct, rejectProduct

// ── PAYOUT MANAGEMENT ─────────────────────────────────────────────────────────

/**
 * @route  GET /api/admin/payouts/pending
 * @access Private (Admin)
 */
exports.getPendingPayouts = catchAsync(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const now = new Date();

  const [payouts, total] = await Promise.all([
    Payout.find({ status: 'scheduled', scheduledFor: { $lte: now } })
      .sort({ scheduledFor: 1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('vendor', 'name')
      .populate('order', 'orderNumber totalAmount')
      .lean(),
    Payout.countDocuments({ status: 'scheduled', scheduledFor: { $lte: now } })
  ]);

  return sendSuccess(res, 200, 'Pending payouts fetched', {
    payouts,
    pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)), limit: Number(limit) }
  });
});

/**
 * @route  POST /api/admin/payouts/:id/release
 * @desc   Manually release a payout
 * @access Private (Admin)
 */
exports.releasePayout = catchAsync(async (req, res) => {
  const payout = await Payout.findById(req.params.id)
    .populate({ path: 'vendor', populate: { path: 'user', select: '_id name email' } })
    .populate('order', 'orderNumber');

  if (!payout) throw new ApiError(404, 'Payout not found');
  if (payout.status === 'released') throw new ApiError(400, 'Payout already released');
  if (payout.status === 'cancelled') throw new ApiError(400, 'Payout is cancelled');

  payout.status        = 'released';
  payout.releasedAt    = new Date();
  payout.processedBy   = req.user._id;
  payout.processedAt   = new Date();
  payout.adminNotes    = req.body.adminNotes || '';
  await payout.save();

  // Update Order
  await Order.findByIdAndUpdate(payout.order._id, {
    payoutStatus: 'released',
    payoutReleasedAt: new Date()
  });

  // Update Vendor financials
  await Vendor.findByIdAndUpdate(payout.vendor._id, {
    $inc: {
      'financials.revenue':        payout.orderTotal,
      'financials.commissionPaid': payout.commissionDeducted,
      'financials.pendingPayout':  -payout.amount
    }
  });

  // Notify vendor
  if (payout.vendor.user?._id) {
    notifyPayoutReleased(
      payout.vendor.user._id,
      payout.amount,
      payout.order.orderNumber,
      payout._id
    ).catch(console.error);

    if (payout.vendor.user?.email) {
      sendPayoutNotificationEmail(
        payout.vendor.user.email,
        payout.vendor.name,
        payout.amount,
        payout.order.orderNumber
      ).catch(console.error);
    }
  }

  return sendSuccess(res, 200, 'Payout released successfully', { payout });
});

/**
 * @route  POST /api/admin/payouts/:id/hold
 * @desc   Hold a payout
 * @access Private (Admin)
 */
exports.holdPayout = catchAsync(async (req, res) => {
  const { reason } = req.body;
  if (!reason) throw new ApiError(400, 'Hold reason is required');

  const payout = await Payout.findById(req.params.id);
  if (!payout) throw new ApiError(404, 'Payout not found');
  if (['released', 'cancelled'].includes(payout.status)) {
    throw new ApiError(400, `Cannot hold a ${payout.status} payout`);
  }

  payout.status      = 'held';
  payout.heldAt      = new Date();
  payout.heldReason  = reason;
  payout.processedBy = req.user._id;
  await payout.save();

  return sendSuccess(res, 200, 'Payout held', { payout });
});

/**
 * @route  GET /api/admin/payouts
 * @desc   Get all payouts with filters
 * @access Private (Admin)
 */
exports.getAllPayouts = catchAsync(async (req, res) => {
  const { status, vendor, page = 1, limit = 20, from, to } = req.query;
  const query = {};
  if (status) query.status = status;
  if (vendor) query.vendor = vendor;
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to)   query.createdAt.$lte = new Date(to);
  }

  const [payouts, total] = await Promise.all([
    Payout.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('vendor', 'name')
      .populate('order', 'orderNumber totalAmount')
      .lean(),
    Payout.countDocuments(query)
  ]);

  return sendSuccess(res, 200, 'Payouts fetched', {
    payouts,
    pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)), limit: Number(limit) }
  });
});

// ── ANALYTICS ─────────────────────────────────────────────────────────────────

/**
 * @route  GET /api/admin/analytics
 * @desc   Platform-wide analytics
 * @access Private (Admin)
 */
exports.getAnalytics = catchAsync(async (req, res) => {
  const { from, to } = req.query;
  const dateFilter = {};
  if (from || to) {
    dateFilter.createdAt = {};
    if (from) dateFilter.createdAt.$gte = new Date(from);
    if (to)   dateFilter.createdAt.$lte = new Date(to);
  }

  // GMV (Gross Merchandise Value)
  const gmv = await Order.aggregate([
    { $match: { ...dateFilter, status: { $in: ['Delivered', 'Shipped', 'Packed', 'Placed'] } } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
  ]);

  // Commission earned
  const commission = await Order.aggregate([
    { $match: { ...dateFilter, status: { $in: ['Delivered', 'Shipped', 'Packed', 'Placed'] } } },
    { $group: { _id: null, total: { $sum: '$commissionAmount' } } }
  ]);

  // Coupon revenue
  const couponRevenue = await Coupon.aggregate([
    { $match: dateFilter },
    { $group: { _id: null, total: { $sum: '$revenue' } } }
  ]);

  // Category breakdown
  const categoryBreakdown = await Order.aggregate([
    { $match: { ...dateFilter, status: { $in: ['Delivered', 'Shipped', 'Packed', 'Placed'] } } },
    { $unwind: '$items' },
    { $group: {
      _id: '$items.productSnapshot.category',
      totalRevenue: { $sum: { $multiply: ['$items.unitPrice', '$items.quantity'] } },
      orderCount:   { $sum: 1 }
    }},
    { $sort: { totalRevenue: -1 } }
  ]);

  // Active users
  const [totalClients, totalVendors, activeOrders] = await Promise.all([
    User.countDocuments({ role: 'client', isActive: true }),
    Vendor.countDocuments({ status: 'Active' }),
    Order.countDocuments({ status: { $in: ['Placed', 'Packed', 'Shipped'] } })
  ]);

  return sendSuccess(res, 200, 'Analytics fetched', {
    gmv:             gmv[0]?.total || 0,
    commission:      commission[0]?.total || 0,
    couponRevenue:   couponRevenue[0]?.total || 0,
    totalClients,
    totalVendors,
    activeOrders,
    categoryBreakdown
  });
});

/**
 * @route  GET /api/admin/analytics/overview
 * @desc   High-level dashboard summary
 * @access Private (Admin)
 */
exports.getAnalyticsOverview = catchAsync(async (req, res) => {
  const [
    totalOrders, totalRevenue, totalCommission,
    activeVendors, totalClients, pendingPayouts
  ] = await Promise.all([
    Order.countDocuments(),
    Order.aggregate([{ $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
    Order.aggregate([{ $group: { _id: null, total: { $sum: '$commissionAmount' } } }]),
    Vendor.countDocuments({ status: 'Active' }),
    User.countDocuments({ role: 'client', isActive: true }),
    Payout.aggregate([
      { $match: { status: { $in: ['scheduled', 'pending'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])
  ]);

  return sendSuccess(res, 200, 'Overview fetched', {
    totalOrders,
    totalRevenue:     totalRevenue[0]?.total || 0,
    totalCommission:  totalCommission[0]?.total || 0,
    activeVendors,
    totalClients,
    pendingPayouts:   pendingPayouts[0]?.total || 0
  });
});

// ── CLIENT MANAGEMENT ─────────────────────────────────────────────────────────

/**
 * @route  GET /api/admin/clients
 * @access Private (Admin)
 */
exports.getAllClients = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const query = { role: 'client' };
  if (search) {
    query.$or = [
      { phone: { $regex: search, $options: 'i' } },
      { name:  { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const [clients, total] = await Promise.all([
    User.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .select('phone name email walletBalance isActive lastLogin createdAt')
      .lean(),
    User.countDocuments(query)
  ]);

  return sendSuccess(res, 200, 'Clients fetched', {
    clients,
    pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)), limit: Number(limit) }
  });
});

/**
 * @route  GET /api/admin/clients/:id
 * @access Private (Admin)
 */
exports.getClientById = catchAsync(async (req, res) => {
  const client = await User.findOne({ _id: req.params.id, role: 'client' }).lean();
  if (!client) throw new ApiError(404, 'Client not found');

  const [orders, userCoupons, walletTxns] = await Promise.all([
    Order.find({ client: client._id }).sort({ createdAt: -1 }).limit(10).lean(),
    require('../models/UserCoupon').find({ client: client._id }).limit(10).lean(),
    WalletTransaction.find({ user: client._id }).sort({ createdAt: -1 }).limit(10).lean()
  ]);

  return sendSuccess(res, 200, 'Client details fetched', { client, orders, userCoupons, walletTxns });
});

// ── WALLET & CASHBACK CONFIG ──────────────────────────────────────────────────

/**
 * @route  GET /api/admin/wallet/ledger
 * @desc   Platform wallet liability (total of all client balances)
 * @access Private (Admin)
 */
exports.getWalletLedger = catchAsync(async (req, res) => {
  const ledger = await User.aggregate([
    { $match: { role: 'client' } },
    { $group: { _id: null, totalLiability: { $sum: '$walletBalance' } } }
  ]);

  const topClients = await User.find({ role: 'client' })
    .sort({ walletBalance: -1 })
    .limit(10)
    .select('phone name walletBalance')
    .lean();

  return sendSuccess(res, 200, 'Wallet ledger fetched', {
    totalLiability: ledger[0]?.totalLiability || 0,
    topClients
  });
});

/**
 * @route  PUT /api/admin/wallet/cashback-config
 * @desc   Update cashback percentage — persisted in DB Config collection
 * @access Private (Admin)
 */
exports.updateCashbackConfig = catchAsync(async (req, res) => {
  const { cashbackPercent } = req.body;
  if (cashbackPercent === undefined || cashbackPercent < 0 || cashbackPercent > 100) {
    throw new ApiError(400, 'Valid cashback percentage (0-100) required');
  }

  await Config.setValue(
    'cashback_percent',
    Number(cashbackPercent),
    'Platform default cashback % credited to client on coupon redemption',
    req.user._id
  );

  return sendSuccess(res, 200, `Cashback updated to ${cashbackPercent}%`, {
    cashbackPercent: Number(cashbackPercent)
  });
});
