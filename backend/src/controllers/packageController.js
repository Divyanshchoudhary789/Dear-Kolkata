const Package    = require('../models/Package');
const Coupon     = require('../models/Coupon');
const UserCoupon = require('../models/UserCoupon');
const Vendor     = require('../models/Vendor');
const ApiError   = require('../utils/apiError');
const { sendSuccess } = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');
const { debitWallet } = require('../services/walletService');
const {
  notifyCouponPurchased,
  notifyPackageIncludesVendorCoupon
} = require('../services/notificationService');

// ─── PUBLIC ───────────────────────────────────────────────────────────────────

/**
 * @route  GET /api/packages
 * @desc   Get all active packages on the marketplace
 * @access Public
 */
exports.getAllPackages = catchAsync(async (req, res) => {
  const { tags, page = 1, limit = 20 } = req.query;
  const now = new Date();

  const query = {
    status: 'Active',
    isActive: true,
    $or: [{ validityEnd: null }, { validityEnd: { $gte: now } }]
  };
  if (tags) query.tags = { $in: Array.isArray(tags) ? tags : [tags] };

  const [packages, total] = await Promise.all([
    Package.find(query)
      .sort({ displayOrder: 1, createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate({ path: 'couponIds', populate: { path: 'vendor', select: 'name location' } })
      .lean(),
    Package.countDocuments(query)
  ]);

  return sendSuccess(res, 200, 'Packages fetched', {
    packages,
    pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)), limit: Number(limit) }
  });
});

/**
 * @route  GET /api/packages/:id
 * @access Public
 */
exports.getPackageById = catchAsync(async (req, res) => {
  const pkg = await Package.findById(req.params.id)
    .populate({ path: 'couponIds', populate: { path: 'vendor', select: 'name location pin' } })
    .populate('createdBy', 'name');

  if (!pkg) throw new ApiError(404, 'Package not found');

  return sendSuccess(res, 200, 'Package fetched', { package: pkg });
});

// ─── CLIENT ───────────────────────────────────────────────────────────────────

/**
 * @route  POST /api/packages/:id/purchase
 * @desc   Purchase a package — deduct wallet, distribute constituent coupons (PRD §5.7)
 * @access Private (Client)
 */
exports.purchasePackage = catchAsync(async (req, res) => {
  const pkg = await Package.findById(req.params.id)
    .populate({ path: 'couponIds', populate: { path: 'vendor', select: '_id name user' } });

  if (!pkg) throw new ApiError(404, 'Package not found');

  const now = new Date();
  if (pkg.status !== 'Active') throw new ApiError(400, 'This package is not available');
  if (!pkg.isActive)           throw new ApiError(400, 'Package is inactive');
  if (pkg.validityEnd && now > pkg.validityEnd) throw new ApiError(400, 'Package has expired');
  if (pkg.redemptionCap !== null && pkg.soldCount >= pkg.redemptionCap) {
    throw new ApiError(400, 'Package is sold out');
  }
  if (pkg.couponIds.length === 0) throw new ApiError(400, 'Package has no coupons');

  // ── Deduct wallet ──────────────────────────────────────────────────────────
  if (pkg.price > 0) {
    await debitWallet(
      req.user._id,
      pkg.price,
      'coupon_purchase',
      `Purchased package: ${pkg.name}`,
      { type: 'Package', id: pkg._id }
    );
  }

  // ── Create one UserCoupon per constituent coupon ───────────────────────────
  const userCoupons = [];

  for (const coupon of pkg.couponIds) {
    const uc = await UserCoupon.create({
      client:        req.user._id,
      coupon:        coupon._id,
      sourcePurchase: 'package',
      sourcePackage: pkg._id,
      purchasePayment: { amount: 0, method: 'package' } // cost absorbed in package price
    });
    userCoupons.push(uc);

    // Increment coupon soldCount
    await Coupon.findByIdAndUpdate(coupon._id, { $inc: { soldCount: 1 } });

    // Notify constituent vendor (PRD §6 item 26)
    if (coupon.vendor) {
      const vendorDoc = await Vendor.findById(coupon.vendor._id).populate('user', '_id');
      if (vendorDoc?.user?._id) {
        notifyPackageIncludesVendorCoupon(
          vendorDoc.user._id,
          pkg.name,
          coupon.name,
          pkg._id
        ).catch(console.error);
      }
      // Update vendor coupon stats
      await Vendor.findByIdAndUpdate(coupon.vendor._id, {
        $inc: { 'financials.totalCouponsSold': 1 }
      });
    }
  }

  // ── Update package stats ───────────────────────────────────────────────────
  await Package.findByIdAndUpdate(pkg._id, {
    $inc: { soldCount: 1, revenue: pkg.price }
  });

  // ── Notify client ──────────────────────────────────────────────────────────
  notifyCouponPurchased(
    req.user._id,
    `${pkg.name} (${pkg.couponIds.length} coupons)`,
    userCoupons[0]?._id
  ).catch(console.error);

  return sendSuccess(res, 201, `Package purchased! ${userCoupons.length} coupon(s) added to your locker.`, {
    package:    { name: pkg.name, price: pkg.price },
    couponsAdded: userCoupons.length,
    userCoupons
  });
});

// ─── ADMIN ────────────────────────────────────────────────────────────────────

/**
 * @route  POST /api/packages
 * @desc   Admin creates a curated package from the live coupon catalogue (PRD §5.7)
 * @access Private (Admin)
 */
exports.createPackage = catchAsync(async (req, res) => {
  const {
    name, description, price, couponIds = [], exclusiveOffers = [], tags,
    validityStart, validityEnd, redemptionCap,
    displayOrder, termsAndConditions
  } = req.body;

  const hasCoupons = (couponIds && couponIds.length > 0) || (exclusiveOffers && exclusiveOffers.length > 0);
  if (!name || !description || price === undefined || !hasCoupons) {
    throw new ApiError(400, 'name, description, price, and at least one coupon or exclusive offer are required');
  }

  // Validate all coupons exist and are approved
  let validatedCouponIds = [];
  if (couponIds && couponIds.length > 0) {
    const coupons = await Coupon.find({ _id: { $in: couponIds }, status: 'Approved', isActive: true });
    if (coupons.length !== couponIds.length) {
      throw new ApiError(400, 'One or more coupons are not found, not approved, or inactive');
    }
    validatedCouponIds = coupons.map(c => c._id);
  }

  // Create exclusive coupons
  const createdExclusiveIds = [];
  if (exclusiveOffers && exclusiveOffers.length > 0) {
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 10); // 10 years later

    for (const offer of exclusiveOffers) {
      if (!offer.name || !offer.type || offer.value === undefined) {
        throw new ApiError(400, 'Exclusive offer name, type, and value are required');
      }

      const expDate = offer.validityEnd ? new Date(offer.validityEnd) : (validityEnd ? new Date(validityEnd) : farFuture);

      const ec = await Coupon.create({
        vendor: null, // Admin-authored exclusive offer
        isAdminAuthored: true,
        isExclusive: true,
        name: offer.name,
        description: offer.description || '',
        type: offer.type,
        value: offer.value,
        validityStart: validityStart ? new Date(validityStart) : new Date(),
        validityEnd: expDate,
        codeTimerHours: offer.codeTimerHours || 2,
        price: 0, // cost is absorbed in package price
        status: 'Approved', // pre-approved by admin
        isActive: true,
        category: offer.category || undefined,
        tags: tags || []
      });
      createdExclusiveIds.push(ec._id);
    }
  }

  const allCouponIds = [...validatedCouponIds, ...createdExclusiveIds];

  const pkg = await Package.create({
    name,
    description,
    price:          Number(price),
    couponIds:      allCouponIds,
    tags:           tags || [],
    validityStart:  validityStart ? new Date(validityStart) : new Date(),
    validityEnd:    validityEnd   ? new Date(validityEnd)   : undefined,
    redemptionCap:  redemptionCap ? Number(redemptionCap) : null,
    displayOrder:   displayOrder  ? Number(displayOrder)   : 0,
    termsAndConditions,
    createdBy:      req.user._id,
    status:         'Active'
  });

  return sendSuccess(res, 201, 'Package created successfully', { package: pkg });
});

/**
 * @route  PUT /api/packages/:id
 * @access Private (Admin)
 */
exports.updatePackage = catchAsync(async (req, res) => {
  const pkg = await Package.findById(req.params.id);
  if (!pkg) throw new ApiError(404, 'Package not found');

  const allowed = ['name', 'description', 'price', 'couponIds', 'tags',
    'validityEnd', 'redemptionCap', 'displayOrder', 'status', 'isActive', 'termsAndConditions'];
  const updates = {};
  allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  const updated = await Package.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });

  return sendSuccess(res, 200, 'Package updated', { package: updated });
});

/**
 * @route  GET /api/packages/admin/all
 * @desc   Admin sees all packages (including drafts)
 * @access Private (Admin)
 */
exports.getAllPackagesAdmin = catchAsync(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const query = {};
  if (status) query.status = status;

  const [packages, total] = await Promise.all([
    Package.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate({ path: 'couponIds', select: 'name type value vendor' })
      .lean(),
    Package.countDocuments(query)
  ]);

  return sendSuccess(res, 200, 'Packages fetched', {
    packages,
    pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)), limit: Number(limit) }
  });
});
