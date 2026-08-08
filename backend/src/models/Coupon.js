const mongoose = require('mongoose');

const GIFTING_TAGS = [
  'For Your Loved One',
  'For Your Girlfriend',
  'For Your Wife',
  'For Your Colleagues'
];

const couponSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    default: null // null means Admin-authored coupon
  },
  isAdminAuthored: {
    type: Boolean,
    default: false
  },
  name: {
    type: String,
    required: [true, 'Coupon name is required'],
    trim: true,
    maxlength: [200, 'Coupon name cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  // Offer type: percentage, flat, bogo
  type: {
    type: String,
    enum: ['percentage', 'flat', 'bogo'],
    required: [true, 'Offer type is required']
  },
  // Value: percentage = number(%), flat = number(₹), bogo = string description
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Offer value is required']
  },
  // Coupon validity window (purchase window)
  validityStart: {
    type: Date,
    default: Date.now
  },
  validityEnd: {
    type: Date,
    required: [true, 'Validity end date is required']
  },
  // Redemption code timer (hours the generated code stays active)
  codeTimerHours: {
    type: Number,
    enum: [1, 2, 7, 24],
    default: 2,
    required: true
  },
  // Pricing model (PRD Section 5.2)
  price: {
    type: Number,
    default: 0, // 0 = free (Model B), >0 = fixed price (Model A)
    min: 0
  },
  // Usage caps
  redemptionCap: {
    type: Number,
    default: null, // null = unlimited
    min: 1
  },
  // Stats
  soldCount: {
    type: Number,
    default: 0,
    min: 0
  },
  redeemedCount: {
    type: Number,
    default: 0,
    min: 0
  },
  expiredCount: {
    type: Number,
    default: 0,
    min: 0
  },
  // Revenue from this coupon
  revenue: {
    type: Number,
    default: 0
  },
  // Gifting tags
  tags: [{
    type: String,
    enum: GIFTING_TAGS
  }],
  // Category reference
  category: {
    type: String,
    ref: 'Category'
  },
  // Status lifecycle
  status: {
    type: String,
    enum: ['Draft', 'Pending', 'Approved', 'Rejected', 'Paused', 'Expired'],
    default: 'Pending'
  },
  // Admin moderation
  moderation: {
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    notes: String,
    rejectionReason: String
  },
  // Coupon images
  images: [{
    url: String,
    publicId: String
  }],
  // Terms and conditions
  termsAndConditions: String,
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
couponSchema.index({ vendor: 1, status: 1 });
couponSchema.index({ status: 1, validityEnd: 1 });
couponSchema.index({ tags: 1, status: 1 });
couponSchema.index({ isAdminAuthored: 1, status: 1 });

// Virtual: check if coupon is available for purchase
couponSchema.virtual('isAvailableForPurchase').get(function() {
  const now = new Date();
  if (this.status !== 'Approved') return false;
  if (!this.isActive) return false;
  if (now < this.validityStart) return false;
  if (now > this.validityEnd) return false;
  if (this.redemptionCap !== null && this.soldCount >= this.redemptionCap) return false;
  return true;
});

// Virtual for vendor coupons: available slots
couponSchema.virtual('slotsRemaining').get(function() {
  if (this.redemptionCap === null) return null;
  return Math.max(0, this.redemptionCap - this.soldCount);
});

module.exports = mongoose.model('Coupon', couponSchema);
