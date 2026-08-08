const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Vendor name is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    ref: 'Category'
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true
  },
  pin: {
    type: String,
    required: [true, 'PIN code is required'],
    match: [/^700\d{3}$/, 'Invalid Kolkata PIN code']
  },
  status: {
    type: String,
    enum: ['Pending', 'Active', 'Suspended', 'Rejected'],
    default: 'Pending'
  },
  // Commission configuration
  commissionOverride: {
    type: Number,
    min: 0,
    max: 100,
    default: null // If null, use category default
  },
  skuCap: {
    type: Number,
    default: 20,
    min: 1
  },
  // Return policy
  returnPolicy: {
    type: Boolean,
    default: false // false = no return, true = 7-day return
  },
  // Bank details for payout
  bankDetails: {
    bankName: {
      type: String,
      required: [true, 'Bank name is required']
    },
    accountNumber: {
      type: String,
      required: [true, 'Account number is required']
    },
    ifscCode: {
      type: String,
      required: [true, 'IFSC code is required'],
      match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code']
    },
    accountHolderName: {
      type: String,
      required: [true, 'Account holder name is required']
    },
    panNumber: {
      type: String,
      match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN number']
    }
  },
  // KYC documents
  kycDocuments: [{
    type: {
      type: String,
      enum: ['PAN', 'GSTIN', 'License', 'Other']
    },
    url: String,
    publicId: String,
    verified: { type: Boolean, default: false }
  }],
  // Contact details
  contactPerson: {
    name: String,
    phone: String,
    email: String,
    designation: String
  },
  // Store details
  storeDetails: {
    description: String,
    operatingHours: String,
    images: [{
      url: String,
      publicId: String
    }],
    googleMapsUrl: String
  },
  // Financial metrics
  financials: {
    revenue: { type: Number, default: 0 },
    commissionPaid: { type: Number, default: 0 },
    pendingPayout: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    totalCouponsSold: { type: Number, default: 0 },
    totalCouponsRedeemed: { type: Number, default: 0 }
  },
  // Staff accounts (sub-logins for redemption terminal)
  staffAccounts: [{
    name: String,
    phone: String,
    accessLevel: {
      type: String,
      enum: ['full', 'redemption-only'],
      default: 'redemption-only'
    },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
  }],
  // Onboarding metadata
  onboardedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Sales team member
  },
  onboardingNotes: {
    type: String
  },
  // Rating and reviews (future feature)
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
vendorSchema.index({ user: 1 });
vendorSchema.index({ category: 1, status: 1 });
vendorSchema.index({ pin: 1 });
vendorSchema.index({ status: 1, isActive: 1 });

// Virtual for active products count
vendorSchema.virtual('activeProductsCount', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'vendor',
  count: true,
  match: { status: 'Approved', isActive: true }
});

// Virtual for products
vendorSchema.virtual('products', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'vendor'
});

// Virtual for coupons
vendorSchema.virtual('coupons', {
  ref: 'Coupon',
  localField: '_id',
  foreignField: 'vendor'
});

// Method to check SKU availability
vendorSchema.methods.canAddProduct = async function() {
  const Product = mongoose.model('Product');
  const activeCount = await Product.countDocuments({
    vendor: this._id,
    status: 'Approved',
    isActive: true
  });
  return activeCount < this.skuCap;
};

// Method to get effective commission rate
vendorSchema.methods.getCommissionRate = async function() {
  if (this.commissionOverride !== null && this.commissionOverride !== undefined) {
    return this.commissionOverride;
  }
  
  const Category = mongoose.model('Category');
  const category = await Category.findOne({ id: this.category });
  return category ? category.commission : 10; // Default 10% if not found
};

// Method to update financials
vendorSchema.methods.updateFinancials = async function(updates) {
  Object.keys(updates).forEach(key => {
    if (this.financials[key] !== undefined) {
      this.financials[key] += updates[key];
    }
  });
  await this.save();
};

module.exports = mongoose.model('Vendor', vendorSchema);
