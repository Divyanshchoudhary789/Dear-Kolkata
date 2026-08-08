const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: [true, 'Vendor is required']
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: 0
  },
  commissionDeducted: {
    type: Number,
    required: true,
    min: 0
  },
  commissionRate: {
    type: Number,
    required: true
  },
  orderTotal: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'scheduled', 'released', 'held', 'cancelled'],
    default: 'pending'
  },
  // Payout timing
  scheduledFor: Date,
  releasedAt: Date,
  heldAt: Date,
  heldReason: String,
  cancelledAt: Date,
  cancelReason: String,
  // Bank transfer details
  bankTransfer: {
    bankName: String,
    accountNumber: String,
    ifscCode: String,
    transferId: String,
    transferredAt: Date
  },
  // Admin who processed
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: Date,
  adminNotes: String
}, {
  timestamps: true
});

// Indexes
payoutSchema.index({ vendor: 1, status: 1 });
payoutSchema.index({ status: 1, scheduledFor: 1 });
payoutSchema.index({ order: 1 });
payoutSchema.index({ releasedAt: -1 });

module.exports = mongoose.model('Payout', payoutSchema);
