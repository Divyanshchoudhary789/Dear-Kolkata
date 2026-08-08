const Coupon     = require('../models/Coupon');
const UserCoupon = require('../models/UserCoupon');
const Vendor     = require('../models/Vendor');
const User       = require('../models/User');
const Config     = require('../models/Config');
const ApiError   = require('../utils/apiError');
const { sendSuccess } = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');
const { debitWallet, creditWallet } = require('../services/walletService');
const {
  notifyCouponSubmitted,
  notifyCouponApproved,
  notifyCouponRejected,
  notifyCouponPurchased,
  notifyCodeGenerated,
  notifyCouponRedeemedClient,
  notifyCouponRedeemedVendor,
  notifyCashbackCredited
} = require('../services/notificationService');
const { sendCouponPurchaseEmail } = require('../services/emailService');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a unique, readable redemption code  e.g. "DK-SENJ-4821" */
const buildCode = (vendorName) => {
  const prefix = (vendorName || 'DEAR').substring(0, 4).toUpperCase().replace(/\s+/g, '');
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `DK-${prefix}-${suffix}`;
};

/** Get admin user(s) for coupon-submitted notification */
const getAdminIds = async () => {
  const admins = await User.find({ role: 'admin', isActive: true }).select('_id').lean();
  return admins.map(a => a._id);
};

// ─── PUBLIC ───────────────────────────────────────────────────────────────────

/**
 * @route  GET /api/coupons
 * @desc   Coupon marketplace (approved, non-expired, active)
 * @access Public
 */
exports.getAllCoupons = catchAsync(async (req, res) => {
  const { vendor, tags, category, type, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  const now = new Date();

  const query = {
    status: 'Approved',
    isActive: true,
    validityEnd: { $gte: now }
  };
  if (vendor)   query.vendor   = vendor;
  if (tags)     query.tags     = { $in: Array.isArray(tags) ? tags : [tags] };
  if (category) query.category = category;
  if (type)     query.type     = type;

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  const skip = (Number(page) - 1) * Number(limit);

  const [coupons, total] = await Promise.all([
    Coupon.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .populate('vendor', 'name location pin')
      .lean(),
    Coupon.countDocuments(query)
  ]);

  return sendSuccess(res, 200, 'Coupons fetched', {
    coupons,
    pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)), limit: Number(limit) }
  });
});

/**
 * @route  GET /api/coupons/:id
 * @access Public
 */
exports.getCouponById = catchAsync(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id).populate('vendor', 'name location pin storeDetails');
  if (!coupon) throw new ApiError(404, 'Coupon not found');
  return sendSuccess(res, 200, 'Coupon fetched', { coupon });
});

// ─── CLIENT ───────────────────────────────────────────────────────────────────

/**
 * @route  POST /api/coupons/:id/purchase
 * @desc   Purchase a coupon (PRD §5.3 — Model A fixed price or Model B free)
 * @access Private (Client)
 */
exports.purchaseCoupon = catchAsync(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id).populate('vendor', 'name');
  if (!coupon) throw new ApiError(404, 'Coupon not found');

  const now = new Date();
  if (coupon.status !== 'Approved') throw new ApiError(400, 'Coupon is not available');
  if (!coupon.isActive)             throw new ApiError(400, 'Coupon is not active');
  if (now > coupon.validityEnd)     throw new ApiError(400, 'Coupon has expired');
  if (now < coupon.validityStart)   throw new ApiError(400, 'Coupon is not yet available');
  if (coupon.redemptionCap !== null && coupon.soldCount >= coupon.redemptionCap) {
    throw new ApiError(400, 'This coupon is sold out');
  }

  // Deduct price if paid coupon (Model A)
  if (coupon.price > 0) {
    await debitWallet(
      req.user._id,
      coupon.price,
      'coupon_purchase',
      `Purchased coupon: ${coupon.name}`,
      { type: 'Coupon', id: coupon._id }
    );
  }

  const userCoupon = await UserCoupon.create({
    client: req.user._id,
    coupon: coupon._id,
    sourcePurchase: 'direct',
    purchasePayment: {
      amount:  coupon.price,
      paidAt:  coupon.price > 0 ? new Date() : null,
      method:  coupon.price > 0 ? 'wallet' : 'free'
    }
  });

  // Increment sold count & revenue
  await Coupon.findByIdAndUpdate(coupon._id, {
    $inc: {
      soldCount: 1,
      revenue: coupon.price
    }
  });

  notifyCouponPurchased(req.user._id, coupon.name, userCoupon._id).catch(console.error);

  if (req.user.email) {
    sendCouponPurchaseEmail(req.user.email, req.user.name, coupon.name, coupon.validityEnd).catch(console.error);
  }

  return sendSuccess(res, 200, 'Coupon added to your locker', { userCoupon });
});

/**
 * @route  POST /api/coupons/:userCouponId/generate-code
 * @desc   Generate a redemption code — starts the countdown timer (PRD §5.4)
 * @access Private (Client)
 */
exports.generateCode = catchAsync(async (req, res) => {
  const uc = await UserCoupon.findOne({ _id: req.params.userCouponId, client: req.user._id })
    .populate({ path: 'coupon', populate: { path: 'vendor', select: 'name' } });

  if (!uc) throw new ApiError(404, 'Coupon not found in your locker');
  if (uc.status === 'Redeemed')  throw new ApiError(400, 'This coupon has already been redeemed');
  if (uc.status === 'Expired')   throw new ApiError(400, 'This coupon has expired');

  const coupon = uc.coupon;
  const now    = new Date();

  // Check overall coupon validity
  if (now > coupon.validityEnd) throw new ApiError(400, 'The coupon validity period has ended');

  // If a code is already live, return it
  if (uc.status === 'CodeGenerated' && uc.code?.expiresAt && new Date(uc.code.expiresAt) > now) {
    return sendSuccess(res, 200, 'Active code already exists', {
      code:          uc.code.value,
      expiresAt:     uc.code.expiresAt,
      timerSeconds:  Math.floor((new Date(uc.code.expiresAt) - now) / 1000)
    });
  }

  // Generate fresh code
  const code          = buildCode(coupon.vendor?.name);
  const timerMs       = coupon.codeTimerHours * 60 * 60 * 1000;
  const expiresAt     = new Date(now.getTime() + timerMs);
  const isRegen       = uc.status === 'CodeGenerated';

  // Use separate update objects: can't mix $set and $inc at top level in same object
  const updateData = {
    $set: {
      status:            'CodeGenerated',
      'code.value':       code,
      'code.generatedAt': now,
      'code.expiresAt':   expiresAt,
    }
  };
  if (isRegen) updateData.$inc = { 'code.regenerationCount': 1 };

  await UserCoupon.findByIdAndUpdate(uc._id, updateData);

  notifyCodeGenerated(req.user._id, coupon.name, coupon.codeTimerHours, uc._id).catch(console.error);

  return sendSuccess(res, 200, 'Redemption code generated', {
    code,
    expiresAt,
    timerSeconds: Math.floor(timerMs / 1000)
  });
});

/**
 * @route  GET /api/coupons/my-coupons
 * @access Private (Client)
 */
exports.getMyCoupons = catchAsync(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const query = { client: req.user._id };
  if (status) query.status = status;

  const [userCoupons, total] = await Promise.all([
    UserCoupon.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate({ path: 'coupon', populate: { path: 'vendor', select: 'name location pin' } })
      .lean(),
    UserCoupon.countDocuments(query)
  ]);

  return sendSuccess(res, 200, 'My coupons fetched', {
    userCoupons,
    pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)), limit: Number(limit) }
  });
});

// ─── VENDOR ───────────────────────────────────────────────────────────────────

/**
 * @route  POST /api/coupons
 * @desc   Vendor creates a coupon (→ goes to admin approval queue)
 * @access Private (Vendor)
 */
exports.createCoupon = catchAsync(async (req, res) => {
  const {
    name, description, type, value, validityStart, validityEnd,
    codeTimerHours, price, redemptionCap, tags, category, termsAndConditions
  } = req.body;

  if (!name || !type || value === undefined || !validityEnd) {
    throw new ApiError(400, 'name, type, value, and validityEnd are required');
  }

  const coupon = await Coupon.create({
    vendor:   req.vendor._id,
    isAdminAuthored: false,
    name, description, type, value,
    validityStart: validityStart ? new Date(validityStart) : new Date(),
    validityEnd:   new Date(validityEnd),
    codeTimerHours: codeTimerHours || 2,
    price:          Number(price) || 0,
    redemptionCap:  redemptionCap ? Number(redemptionCap) : null,
    tags:           tags || [],
    category,
    termsAndConditions,
    status: 'Pending'
  });

  // Notify all admins
  const adminIds = await getAdminIds();
  for (const adminId of adminIds) {
    notifyCouponSubmitted(adminId, name, req.vendor.name, coupon._id).catch(console.error);
  }

  return sendSuccess(res, 201, 'Coupon submitted for admin approval', { coupon });
});

/**
 * @route  PUT /api/coupons/:id
 * @access Private (Vendor)
 */
exports.updateCoupon = catchAsync(async (req, res) => {
  const coupon = await Coupon.findOne({ _id: req.params.id, vendor: req.vendor._id });
  if (!coupon) throw new ApiError(404, 'Coupon not found');
  if (coupon.status === 'Approved') {
    throw new ApiError(400, 'Approved coupons cannot be edited. Please contact admin.');
  }

  const allowed = ['name', 'description', 'type', 'value', 'validityStart', 'validityEnd',
    'codeTimerHours', 'price', 'redemptionCap', 'tags', 'category', 'termsAndConditions'];

  const updates = {};
  allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  const updated = await Coupon.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });

  return sendSuccess(res, 200, 'Coupon updated', { coupon: updated });
});

/**
 * @route  GET /api/coupons/vendor/my-coupons
 * @access Private (Vendor)
 */
exports.getVendorCoupons = catchAsync(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const query = { vendor: req.vendor._id };
  if (status) query.status = status;

  const [coupons, total] = await Promise.all([
    Coupon.find(query).sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit)).limit(Number(limit)).lean(),
    Coupon.countDocuments(query)
  ]);

  return sendSuccess(res, 200, 'Your coupons fetched', {
    coupons,
    pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)), limit: Number(limit) }
  });
});

/**
 * @route  POST /api/coupons/redeem
 * @desc   Vendor redemption terminal — validate code, apply discount, credit cashback (PRD §5.5)
 * @access Private (Vendor)
 */
exports.redeemCoupon = catchAsync(async (req, res) => {
  const { code, billAmount } = req.body;
  if (!code || !billAmount) throw new ApiError(400, 'code and billAmount are required');

  const bill = Number(billAmount);
  if (isNaN(bill) || bill <= 0) throw new ApiError(400, 'billAmount must be a positive number');

  const cleanCode = code.trim().toUpperCase();
  const now       = new Date();

  // ── Find the UserCoupon by code ────────────────────────────────────────────
  const uc = await UserCoupon.findOne({ 'code.value': cleanCode, status: 'CodeGenerated' })
    .populate({ path: 'coupon', populate: { path: 'vendor', select: '_id name' } })
    .populate('client', '_id name phone email');

  if (!uc) throw new ApiError(400, 'Invalid or expired code. No matching active code found.');

  const coupon = uc.coupon;

  // ── Verify vendor ownership ────────────────────────────────────────────────
  if (!coupon.vendor || coupon.vendor._id.toString() !== req.vendor._id.toString()) {
    throw new ApiError(403, 'This code belongs to a different store.');
  }

  // ── Check code expiry ──────────────────────────────────────────────────────
  if (new Date(uc.code.expiresAt) < now) {
    throw new ApiError(400, 'This code has expired. Ask the customer to generate a new code.');
  }

  // ── Check coupon overall validity ──────────────────────────────────────────
  if (now > coupon.validityEnd) {
    throw new ApiError(400, 'The coupon itself has expired.');
  }

  // ── Apply discount logic (PRD §8.3) ───────────────────────────────────────
  let discountAmount = 0;
  if (coupon.type === 'percentage') {
    discountAmount = Math.round(bill * (Number(coupon.value) / 100));
  } else if (coupon.type === 'flat') {
    discountAmount = Math.min(Number(coupon.value), bill); // can't discount more than bill
  } else if (coupon.type === 'bogo') {
    discountAmount = 0; // BOGO applied manually at register; we just log the redemption
  }

  const finalBill = Math.max(0, bill - discountAmount);

  // ── Cashback to client (PRD §5.6 — default 5%, configurable via admin panel) ────
  const configRate      = await Config.getValue('cashback_percent', null);
  const cashbackRate    = (configRate !== null ? Number(configRate) : parseFloat(process.env.DEFAULT_CASHBACK_PERCENT || 5)) / 100;
  const cashbackAmount  = Math.round(bill * cashbackRate);

  await creditWallet(
    uc.client._id,
    cashbackAmount,
    'cashback',
    `Cashback from coupon redemption at ${coupon.vendor.name}`,
    { type: 'UserCoupon', id: uc._id }
  );

  // ── Mark UserCoupon as Redeemed ────────────────────────────────────────────
  await UserCoupon.findByIdAndUpdate(uc._id, {
    status: 'Redeemed',
    'redemption.billAmount':      bill,
    'redemption.discountApplied': discountAmount,
    'redemption.finalBill':       finalBill,
    'redemption.cashbackCredited': cashbackAmount,
    'redemption.redeemedAt':       now,
    'redemption.verifiedBy':       req.user._id
  });

  // ── Update coupon counters ─────────────────────────────────────────────────
  await Coupon.findByIdAndUpdate(coupon._id, { $inc: { redeemedCount: 1 } });

  // ── Update vendor coupon stats ─────────────────────────────────────────────
  await Vendor.findByIdAndUpdate(req.vendor._id, {
    $inc: { 'financials.totalCouponsRedeemed': 1 }
  });

  // ── Notifications ──────────────────────────────────────────────────────────
  notifyCouponRedeemedClient(uc.client._id, coupon.name, cashbackAmount, uc._id).catch(console.error);
  notifyCouponRedeemedVendor(req.user._id, cleanCode, bill, uc._id).catch(console.error);
  notifyCashbackCredited(uc.client._id, cashbackAmount, coupon.vendor.name).catch(console.error);

  return sendSuccess(res, 200, 'Coupon redeemed successfully', {
    couponName:    coupon.name,
    originalBill:  bill,
    discountAmount,
    finalBill,
    cashbackCredited: cashbackAmount,
    isBogo: coupon.type === 'bogo'
  });
});

// ─── ADMIN ────────────────────────────────────────────────────────────────────

/**
 * @route  GET /api/admin/coupons/pending
 * @access Private (Admin)
 */
exports.getPendingCoupons = catchAsync(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const [coupons, total] = await Promise.all([
    Coupon.find({ status: 'Pending' })
      .sort({ createdAt: 1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('vendor', 'name category location')
      .lean(),
    Coupon.countDocuments({ status: 'Pending' })
  ]);

  return sendSuccess(res, 200, 'Pending coupons fetched', {
    coupons,
    pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)), limit: Number(limit) }
  });
});

/**
 * @route  PUT /api/admin/coupons/:id/approve
 * @access Private (Admin)
 */
exports.approveCoupon = catchAsync(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id).populate({
    path: 'vendor',
    populate: { path: 'user', select: '_id' }
  });
  if (!coupon) throw new ApiError(404, 'Coupon not found');

  coupon.status = 'Approved';
  coupon.moderation = { reviewedBy: req.user._id, reviewedAt: new Date(), notes: req.body.notes || '' };
  await coupon.save();

  if (coupon.vendor?.user?._id) {
    notifyCouponApproved(coupon.vendor.user._id, coupon.name, coupon._id).catch(console.error);
  }

  return sendSuccess(res, 200, 'Coupon approved', { coupon });
});

/**
 * @route  PUT /api/admin/coupons/:id/reject
 * @access Private (Admin)
 */
exports.rejectCoupon = catchAsync(async (req, res) => {
  const { reason } = req.body;
  if (!reason) throw new ApiError(400, 'Rejection reason is required');

  const coupon = await Coupon.findById(req.params.id).populate({
    path: 'vendor',
    populate: { path: 'user', select: '_id' }
  });
  if (!coupon) throw new ApiError(404, 'Coupon not found');

  coupon.status = 'Rejected';
  coupon.moderation = { reviewedBy: req.user._id, reviewedAt: new Date(), notes: reason, rejectionReason: reason };
  await coupon.save();

  if (coupon.vendor?.user?._id) {
    notifyCouponRejected(coupon.vendor.user._id, coupon.name, reason, coupon._id).catch(console.error);
  }

  return sendSuccess(res, 200, 'Coupon rejected', { coupon });
});
