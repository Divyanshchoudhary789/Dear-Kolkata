const mongoose = require('mongoose');

const GIFTING_TAGS = [
  'For Your Loved One',
  'For Your Girlfriend',
  'For Your Wife',
  'For Your Colleagues'
];

const packageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Package name is required'],
    trim: true,
    maxlength: [200, 'Package name cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Package price is required'],
    min: [0, 'Price cannot be negative']
  },
  // Constituent coupons
  couponIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon'
  }],
  // Gifting tags
  tags: [{
    type: String,
    enum: GIFTING_TAGS
  }],
  status: {
    type: String,
    enum: ['Draft', 'Active', 'Paused', 'Expired'],
    default: 'Draft'
  },
  images: [{
    url: String,
    publicId: String
  }],
  // Package validity
  validityStart: {
    type: Date,
    default: Date.now
  },
  validityEnd: Date,
  // Stats
  soldCount: {
    type: Number,
    default: 0,
    min: 0
  },
  revenue: {
    type: Number,
    default: 0
  },
  // Redemption cap
  redemptionCap: {
    type: Number,
    default: null
  },
  // Author (always admin)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  termsAndConditions: String,
  displayOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
packageSchema.index({ status: 1, isActive: 1 });
packageSchema.index({ tags: 1, status: 1 });
packageSchema.index({ displayOrder: 1 });

// Virtual: is available for purchase
packageSchema.virtual('isAvailableForPurchase').get(function() {
  const now = new Date();
  if (this.status !== 'Active') return false;
  if (!this.isActive) return false;
  if (this.validityEnd && now > this.validityEnd) return false;
  if (this.redemptionCap !== null && this.soldCount >= this.redemptionCap) return false;
  return true;
});

module.exports = mongoose.model('Package', packageSchema);
