const Vendor     = require('../models/Vendor');
const Order      = require('../models/Order');
const Payout     = require('../models/Payout');
const Coupon     = require('../models/Coupon');
const UserCoupon = require('../models/UserCoupon');
const User       = require('../models/User');
const ApiError   = require('../utils/apiError');
const { sendSuccess } = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');
const { deleteFromCloudinary } = require('../config/cloudinary');
const bcrypt     = require('bcryptjs');

/**
 * @route  GET /api/vendor/dashboard
 * @desc   Vendor dashboard summary
 * @access Private (Vendor)
 */
exports.getDashboard = catchAsync(async (req, res) => {
  const vendor  = req.vendor;
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);

  const Product = require('../models/Product');

  const [todayOrders, pendingOrders, activeCoupons] = await Promise.all([
    Order.countDocuments({ vendor: vendor._id, createdAt: { $gte: todayStart, $lte: todayEnd } }),
    Order.countDocuments({ vendor: vendor._id, status: { $in: ['Placed', 'Packed', 'Shipped'] } }),
    Coupon.countDocuments({ vendor: vendor._id, status: 'Approved', isActive: true })
  ]);

  const activeProducts = await Product.countDocuments({ vendor: vendor._id, status: 'Approved', isActive: true });

  const recentOrders = await Order.find({ vendor: vendor._id })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('client', 'phone name')
    .lean();

  return sendSuccess(res, 200, 'Dashboard data fetched', {
    summary: {
      activeProducts,
      skuCapUsage:    `${activeProducts}/${vendor.skuCap}`,
      skuCap:         vendor.skuCap,
      todayOrders,
      pendingOrders,
      activeCoupons,
      totalRevenue:   vendor.financials.revenue,
      pendingPayout:  vendor.financials.pendingPayout,
      commissionPaid: vendor.financials.commissionPaid,
      totalOrders:    vendor.financials.totalOrders,
      couponsSold:    vendor.financials.totalCouponsSold,
      couponsRedeemed: vendor.financials.totalCouponsRedeemed
    },
    recentOrders
  });
});

/**
 * @route  GET /api/vendor/orders
 * @access Private (Vendor)
 */
exports.getOrders = catchAsync(async (req, res) => {
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

  return sendSuccess(res, 200, 'Orders fetched', {
    orders,
    pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)), limit: Number(limit) }
  });
});

/**
 * @route  GET /api/vendor/payouts
 * @access Private (Vendor)
 */
exports.getPayouts = catchAsync(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const query = { vendor: req.vendor._id };
  if (status) query.status = status;

  const [payouts, total] = await Promise.all([
    Payout.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('order', 'orderNumber totalAmount')
      .lean(),
    Payout.countDocuments(query)
  ]);

  // Summary
  const summary = await Payout.aggregate([
    { $match: { vendor: req.vendor._id } },
    { $group: {
      _id: '$status',
      total: { $sum: '$amount' },
      count: { $sum: 1 }
    }}
  ]);

  return sendSuccess(res, 200, 'Payouts fetched', {
    payouts,
    summary,
    pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)), limit: Number(limit) }
  });
});

/**
 * @route  GET /api/vendor/coupons/performance
 * @access Private (Vendor)
 */
exports.getCouponPerformance = catchAsync(async (req, res) => {
  const vendorId = req.vendor._id;

  const coupons = await Coupon.find({ vendor: vendorId }).lean();

  const stats = coupons.map(c => ({
    id:             c._id,
    name:           c.name,
    type:           c.type,
    status:         c.status,
    soldCount:      c.soldCount,
    redeemedCount:  c.redeemedCount,
    expiredCount:   c.expiredCount,
    revenue:        c.revenue,
    conversionRate: c.soldCount > 0 ? ((c.redeemedCount / c.soldCount) * 100).toFixed(1) + '%' : '0%'
  }));

  const totals = {
    totalCoupons:     coupons.length,
    totalSold:        coupons.reduce((s, c) => s + c.soldCount, 0),
    totalRedeemed:    coupons.reduce((s, c) => s + c.redeemedCount, 0),
    totalRevenue:     coupons.reduce((s, c) => s + c.revenue, 0)
  };

  return sendSuccess(res, 200, 'Coupon performance fetched', { stats, totals });
});

/**
 * @route  PUT /api/vendor/profile
 * @access Private (Vendor)
 */
exports.updateProfile = catchAsync(async (req, res) => {
  const allowed = ['storeDetails', 'contactPerson', 'returnPolicy'];
  const updates = {};
  allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  const updated = await Vendor.findByIdAndUpdate(req.vendor._id, updates, { returnDocument: 'after', runValidators: true })
    .select('-bankDetails.accountNumber -kycDocuments');

  return sendSuccess(res, 200, 'Store profile updated', { vendor: updated });
});

/**
 * @route  POST /api/vendor/upload-kyc
 * @desc   Upload a KYC document to Cloudinary
 * @access Private (Vendor)
 */
exports.uploadKyc = catchAsync(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Please upload a document');

  const { docType = 'Other' } = req.body;

  await Vendor.findByIdAndUpdate(req.vendor._id, {
    $push: {
      kycDocuments: {
        type:     docType,
        url:      req.file.path,
        publicId: req.file.filename,
        verified: false
      }
    }
  });

  return sendSuccess(res, 200, 'KYC document uploaded. Pending verification by admin.');
});

/**
 * @route  POST /api/vendor/staff
 * @desc   Add a staff sub-account (limited to redemption terminal access)
 * @access Private (Vendor)
 */
exports.addStaff = catchAsync(async (req, res) => {
  const { name, phone, password } = req.body;
  if (!name || !phone || !password) throw new ApiError(400, 'name, phone, and password are required');

  // Create User with role 'vendor' but limited
  const existing = await User.findOne({ phone });
  if (existing) throw new ApiError(400, 'A user with this phone number already exists');

  const staffUser = await User.create({
    phone,
    name,
    role:     'vendor',
    password,
    isActive: true,
    staffOf: req.vendor._id
  });

  const updatedVendor = await Vendor.findByIdAndUpdate(req.vendor._id, {
    $push: {
      staffAccounts: {
        name,
        phone,
        userId: staffUser._id,
        accessLevel: 'redemption-only',
        isActive: true
      }
    }
  }, {
    returnDocument: 'after'
  });

  const staff = updatedVendor.staffAccounts[updatedVendor.staffAccounts.length - 1];

  return sendSuccess(res, 201, 'Staff account created', {
    staff
  });
});

/**
 * @route  DELETE /api/vendor/staff/:staffId
 * @access Private (Vendor)
 */
exports.removeStaff = catchAsync(async (req, res) => {
  await Vendor.findByIdAndUpdate(req.vendor._id, {
    $set: { 'staffAccounts.$[elem].isActive': false }
  }, {
    arrayFilters: [{ 'elem._id': req.params.staffId }]
  });

  return sendSuccess(res, 200, 'Staff account deactivated');
});

/**
 * @route  GET /api/vendor/:vendorId/store
 * @desc   Public-facing store profile (for client discovery)
 * @access Public
 */
exports.getStoreProfile = catchAsync(async (req, res) => {
  const vendor = await Vendor.findById(req.params.vendorId)
    .select('name category location pin returnPolicy storeDetails rating financials.totalOrders')
    .lean();

  if (!vendor || vendor.status === 'Suspended') throw new ApiError(404, 'Vendor not found');

  const Product = require('../models/Product');
  const products = await Product.find({ vendor: req.params.vendorId, status: 'Approved', isActive: true })
    .limit(10)
    .select('name price images tags')
    .lean();

  const coupons = await Coupon.find({
    vendor: req.params.vendorId,
    status: 'Approved',
    isActive: true,
    validityEnd: { $gte: new Date() }
  }).limit(5).lean();

  return sendSuccess(res, 200, 'Store profile fetched', { vendor, products, coupons });
});
