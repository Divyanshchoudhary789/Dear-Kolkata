const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be positive']
  },
  type: {
    type: String,
    enum: ['Credit', 'Debit'],
    required: [true, 'Transaction type is required']
  },
  category: {
    type: String,
    enum: [
      'cashback',       // Coupon redemption cashback
      'order_payment',  // Wallet used to pay for order
      'coupon_purchase', // Wallet used to buy coupon/package
      'refund',         // Order refund
      'welcome_bonus',  // Sign-up bonus
      'admin_credit',   // Manual admin credit
      'admin_debit',    // Manual admin debit
      'withdrawal'      // Future: bank withdrawal
    ],
    required: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  // Reference to related entity
  reference: {
    type: {
      type: String,
      enum: ['Order', 'UserCoupon', 'Coupon', 'Package', 'manual']
    },
    id: mongoose.Schema.Types.ObjectId
  },
  // Balance snapshot after this transaction
  balanceAfter: {
    type: Number,
    required: true
  },
  // Transaction status
  status: {
    type: String,
    enum: ['completed', 'pending', 'failed', 'reversed'],
    default: 'completed'
  },
  // Metadata
  initiatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Admin or system
  },
  notes: String
}, {
  timestamps: true
});

// Indexes
walletTransactionSchema.index({ user: 1, createdAt: -1 });
walletTransactionSchema.index({ 'reference.id': 1 });
walletTransactionSchema.index({ category: 1 });
walletTransactionSchema.index({ status: 1 });

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
