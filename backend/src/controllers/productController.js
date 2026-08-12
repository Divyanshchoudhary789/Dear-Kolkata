const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const Category = require('../models/Category');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');
const { notifyProductApproved, notifyProductRejected, notifySkuCapReached } = require('../services/notificationService');
const { deleteFromCloudinary } = require('../config/cloudinary');

/**
 * @route  GET /api/products
 * @desc   Get all approved & active products (public, with filters + pagination)
 * @access Public
 */
exports.getAllProducts = catchAsync(async (req, res) => {
  const {
    category, tags, vendor, minPrice, maxPrice,
    search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc'
  } = req.query;

  const query = { status: 'Approved', isActive: true };

  if (category) query.category = category;
  if (vendor)   query.vendor   = vendor;
  if (tags)     query.tags     = { $in: Array.isArray(tags) ? tags : [tags] };

  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  if (search) {
    query.$text = { $search: search };
  }

  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
  const skip = (Number(page) - 1) * Number(limit);

  const [products, total] = await Promise.all([
    Product.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .populate('vendor', 'name location pin returnPolicy rating')
      .lean(),
    Product.countDocuments(query)
  ]);

  // Cache public product listings for 60 seconds in browser and CDN.
  // stale-while-revalidate allows serving stale content while re-fetching
  // in the background — eliminates blank flash on first paint.
  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');

  return sendSuccess(res, 200, 'Products fetched', {
    products,
    pagination: {
      total,
      page:  Number(page),
      pages: Math.ceil(total / Number(limit)),
      limit: Number(limit)
    }
  });
});

/**
 * @route  GET /api/products/vendor/my-products
 * @desc   Get vendor's own product list
 * @access Private (Vendor)
 */
exports.getVendorProducts = catchAsync(async (req, res) => {
  const vendor = req.vendor;
  const { status, page = 1, limit = 20 } = req.query;

  const query = { vendor: vendor._id };
  if (status) query.status = status;

  const [products, total, activeCount] = await Promise.all([
    Product.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean(),
    Product.countDocuments(query),
    Product.countDocuments({ vendor: vendor._id, status: 'Approved', isActive: true })
  ]);

  return sendSuccess(res, 200, 'Your products fetched', {
    products,
    skuUsage: `${activeCount}/${vendor.skuCap}`,
    activeCount,
    skuCap: vendor.skuCap,
    pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)), limit: Number(limit) }
  });
});

/**
 * @route  GET /api/products/:id
 * @desc   Get single product by MongoDB _id or slug
 * @access Public
 */
exports.getProductById = catchAsync(async (req, res) => {
  const idParam = req.params.id;
  const isObjectId = /^[a-fA-F0-9]{24}$/.test(idParam);

  const query = {
    status: 'Approved',
    isActive: true,
    $or: isObjectId
      ? [{ _id: idParam }, { slug: idParam }]
      : [{ slug: idParam }]
  };

  const product = await Product.findOne(query)
    .populate('vendor', 'name location pin returnPolicy rating storeDetails');

  if (!product) throw new ApiError(404, 'Product not found');

  // Increment view count
  await Product.findByIdAndUpdate(product._id, { $inc: { 'metrics.views': 1 } });

  return sendSuccess(res, 200, 'Product fetched', { product });
});

/**
 * @route  POST /api/products
 * @desc   Create a new product (vendor, enforces 20-SKU cap)
 * @access Private (Vendor)
 */
exports.createProduct = catchAsync(async (req, res) => {
  const vendor = req.vendor;

  // Enforce SKU cap — count only Approved+Active
  const activeCount = await Product.countDocuments({
    vendor: vendor._id,
    status: 'Approved',
    isActive: true
  });

  if (activeCount >= vendor.skuCap) {
    // Notify vendor that cap is reached
    await notifySkuCapReached(req.user._id, vendor.skuCap);
    throw new ApiError(400, `SKU limit reached (${activeCount}/${vendor.skuCap}). Deactivate an existing product first.`);
  }

  const {
    name, description, price, stock, category,
    tags, returnPolicy, deliveryEstimate
  } = req.body;

  // Validate that category exists
  const cat = await Category.findOne({ id: category });
  if (!cat) throw new ApiError(400, 'Invalid category');

  const product = await Product.create({
    vendor: vendor._id,
    category,
    name,
    description,
    price: Number(price),
    stock: Number(stock),
    tags: tags || [],
    returnPolicy: returnPolicy === true || returnPolicy === 'true',
    deliveryEstimate: deliveryEstimate || '2-3 business days',
    status: 'Pending' // Goes to admin moderation
  });

  const newActive = activeCount + 1;
  if (newActive >= vendor.skuCap) {
    // Warn vendor they're at cap
    notifySkuCapReached(req.user._id, vendor.skuCap).catch(console.error);
  }

  // Update category product count
  await Category.findOneAndUpdate({ id: category }, { $inc: { 'metadata.productCount': 1 } });

  return sendSuccess(res, 201, 'Product submitted for review', {
    product,
    skuUsage: `${newActive}/${vendor.skuCap}`
  });
});

/**
 * @route  PUT /api/products/:id
 * @desc   Update product (vendor owns it, or admin)
 * @access Private (Vendor / Admin)
 */
exports.updateProduct = catchAsync(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');

  // Vendor can only edit their own products; admin can edit any
  if (req.user.role === 'vendor') {
    const vendorDoc = req.vendor || await Vendor.findOne({ user: req.user._id });
    if (!vendorDoc || product.vendor.toString() !== vendorDoc._id.toString()) {
      throw new ApiError(403, 'You can only edit your own products');
    }
  }

  const allowedFields = [
    'name', 'description', 'price', 'stock',
    'tags', 'returnPolicy', 'deliveryEstimate'
  ];

  const updates = {};
  allowedFields.forEach(f => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });

  // If vendor edits an approved product, re-submit for approval
  if (req.user.role === 'vendor' && product.status === 'Approved') {
    updates.status = 'Pending';
  }

  const updated = await Product.findByIdAndUpdate(req.params.id, updates, { returnDocument: 'after', runValidators: true });

  return sendSuccess(res, 200, 'Product updated', { product: updated });
});

/**
 * @route  DELETE /api/products/:id
 * @desc   Deactivate (soft-delete) a product
 * @access Private (Vendor / Admin)
 */
exports.deleteProduct = catchAsync(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');

  if (req.user.role === 'vendor') {
    const vendorDoc = req.vendor || await Vendor.findOne({ user: req.user._id });
    if (!vendorDoc || product.vendor.toString() !== vendorDoc._id.toString()) {
      throw new ApiError(403, 'You can only delete your own products');
    }
  }

  await Product.findByIdAndUpdate(req.params.id, { isActive: false, status: 'Inactive' });

  return sendSuccess(res, 200, 'Product deactivated successfully');
});

/**
 * @route  POST /api/products/:id/upload-images
 * @desc   Upload product images via Cloudinary (multer handles upload)
 * @access Private (Vendor)
 */
exports.uploadImages = catchAsync(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');

  if (product.vendor.toString() !== req.vendor._id.toString()) {
    throw new ApiError(403, 'You can only upload images for your own products');
  }

  if (!req.files || req.files.length === 0) {
    throw new ApiError(400, 'Please upload at least one image');
  }

  const newImages = req.files.map((file, idx) => ({
    url:      file.path,        // Cloudinary URL
    publicId: file.filename,    // Cloudinary public_id
    isMain:   idx === 0 && product.images.length === 0 // First upload = main image
  }));

  const updated = await Product.findByIdAndUpdate(
    req.params.id,
    { $push: { images: { $each: newImages } } },
    { returnDocument: 'after' }
  );

  return sendSuccess(res, 200, 'Images uploaded successfully', { product: updated });
});

/**
 * @route  DELETE /api/products/:id/images/:publicId
 * @desc   Remove a specific product image
 * @access Private (Vendor)
 */
exports.deleteImage = catchAsync(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');

  if (product.vendor.toString() !== req.vendor._id.toString()) {
    throw new ApiError(403, 'Forbidden');
  }

  const publicId = decodeURIComponent(req.params.publicId);
  await deleteFromCloudinary(publicId);

  product.images = product.images.filter(img => img.publicId !== publicId);
  await product.save();

  return sendSuccess(res, 200, 'Image removed', { product });
});

// ─── Admin moderation actions ─────────────────────────────────────────────────

/**
 * @route  PUT /api/admin/products/:id/approve
 * @access Private (Admin)
 */
exports.approveProduct = catchAsync(async (req, res) => {
  const product = await Product.findById(req.params.id).populate({
    path: 'vendor',
    populate: { path: 'user', select: '_id' }
  });
  if (!product) throw new ApiError(404, 'Product not found');

  product.status = 'Approved';
  product.isActive = true;
  product.moderation = {
    reviewedBy: req.user._id,
    reviewedAt: new Date(),
    notes: req.body.notes || ''
  };
  await product.save();

  notifyProductApproved(product.vendor.user._id, product.name, product._id).catch(console.error);

  return sendSuccess(res, 200, 'Product approved', { product });
});

/**
 * @route  PUT /api/admin/products/:id/reject
 * @access Private (Admin)
 */
exports.rejectProduct = catchAsync(async (req, res) => {
  const { reason } = req.body;
  if (!reason) throw new ApiError(400, 'Rejection reason is required');

  const product = await Product.findById(req.params.id).populate({
    path: 'vendor',
    populate: { path: 'user', select: '_id' }
  });
  if (!product) throw new ApiError(404, 'Product not found');

  product.status = 'Rejected';
  product.isActive = false;
  product.moderation = {
    reviewedBy: req.user._id,
    reviewedAt: new Date(),
    notes: reason
  };
  await product.save();

  notifyProductRejected(product.vendor.user._id, product.name, reason, product._id).catch(console.error);

  return sendSuccess(res, 200, 'Product rejected', { product });
});

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
