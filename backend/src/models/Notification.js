const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Recipient - can be a User ID (ObjectId) or a special system target
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Notification type maps to PRD Section 6 matrix
  type: {
    type: String,
    enum: [
      'vendor_account_created',
      'product_approved',
      'product_rejected',
      'order_placed_client',
      'order_placed_vendor',
      'order_packed',
      'order_shipped',
      'order_delivered_client',
      'order_delivered_vendor_return_on',
      'order_delivered_vendor_return_off',
      'return_requested',
      'return_decision',
      'refund_processed',
      'payout_released',
      'coupon_submitted',
      'coupon_approved',
      'coupon_rejected',
      'coupon_purchased',
      'code_generated',
      'code_expiring_soon',
      'code_expired',
      'coupon_redeemed_client',
      'coupon_redeemed_vendor',
      'cashback_credited',
      'dispute_raised',
      'sku_cap_reached',
      'package_includes_vendor_coupon',
      'system',
      'promotional'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  // Reference to the related entity
  reference: {
    type: {
      type: String,
      enum: ['Order', 'Product', 'Coupon', 'Package', 'UserCoupon', 'Vendor', 'WalletTransaction', null]
    },
    id: mongoose.Schema.Types.ObjectId
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  // Delivery channels
  channels: {
    inApp: { type: Boolean, default: true },
    push: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
    email: { type: Boolean, default: false }
  },
  // Delivery status
  delivery: {
    push: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      error: String
    },
    sms: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      error: String
    },
    email: {
      sent: { type: Boolean, default: false },
      sentAt: Date,
      error: String
    }
  },
  // Expiry (auto-delete old notifications)
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
  }
}, {
  timestamps: true
});

// Indexes
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-cleanup

module.exports = mongoose.model('Notification', notificationSchema);
