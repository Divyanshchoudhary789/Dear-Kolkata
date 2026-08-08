const mongoose = require('mongoose');

const userCouponSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Client is required']
  },
  coupon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
    required: [true, 'Coupon is required']
  },
  // Source of acquisition
  sourcePurchase: {
    type: String,
    enum: ['direct', 'package'],
    default: 'direct'
  },
  sourcePackage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Package',
    default: null
  },
  // Lifecycle status
  status: {
    type: String,
    enum: ['Available', 'CodeGenerated', 'Redeemed', 'Expired'],
    default: 'Available'
  },
  // Generated redemption code
  code: {
    value: String,  // e.g. "DK-SENJ-4821"
    generatedAt: Date,
    expiresAt: Date,
    regenerationCount: { type: Number, default: 0 }
  },
  // Redemption data
  redemption: {
    billAmount: Number,
    discountApplied: Number,
    finalBill: Number,
    cashbackCredited: Number,
    redeemedAt: Date,
    verifiedBy: { // Vendor/staff who confirmed the redemption
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  // Purchase payment
  purchasePayment: {
    amount: { type: Number, default: 0 },
    transactionId: String,
    paidAt: Date,
    method: String
  },
  // Expiry tracking
  expiredAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
userCouponSchema.index({ client: 1, status: 1 });
userCouponSchema.index({ client: 1, coupon: 1 });
userCouponSchema.index({ 'code.value': 1 }); // Fast lookup by code during redemption
userCouponSchema.index({ 'code.expiresAt': 1, status: 1 }); // For cron job expiry checks
userCouponSchema.index({ coupon: 1, status: 1 });

// Virtual: check if redemption code is currently valid
userCouponSchema.virtual('isCodeValid').get(function() {
  if (this.status !== 'CodeGenerated') return false;
  if (!this.code || !this.code.expiresAt) return false;
  return new Date() < new Date(this.code.expiresAt);
});

// Virtual: seconds remaining on code
userCouponSchema.virtual('codeSecondsRemaining').get(function() {
  if (!this.isCodeValid) return 0;
  return Math.max(0, Math.floor((new Date(this.code.expiresAt) - new Date()) / 1000));
});

module.exports = mongoose.model('UserCoupon', userCouponSchema);
