const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productSnapshot: {
    // Snapshot of product details at time of order to prevent data drift
    name: { type: String, required: true },
    price: { type: Number, required: true },
    image: String,
    category: String
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  unitPrice: {
    type: Number,
    required: true
  },
  subtotal: {
    type: Number,
    required: true
  }
}, { _id: true });

const returnRequestSchema = new mongoose.Schema({
  reason: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  images: [{
    url: String,
    publicId: String
  }],
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Disputed'],
    default: 'Pending'
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  decidedAt: Date,
  rejectReason: String,
  adminNotes: String,
  refundAmount: Number
}, { _id: false });

const Counter = require('./Counter');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Client is required']
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: [true, 'Vendor is required']
  },
  items: [orderItemSchema],
  // Financial breakdown
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  commissionRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  commissionAmount: {
    type: Number,
    required: true,
    min: 0
  },
  vendorPayout: {
    type: Number,
    required: true,
    min: 0
  },
  // Payment details
  payment: {
    method: {
      type: String,
      enum: ['wallet', 'upi', 'card', 'netbanking', 'cod'],
      default: 'upi'
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: String,
    gatewayOrderId: String,
    gatewayPaymentId: String,
    paidAt: Date,
    walletAmountUsed: { type: Number, default: 0 }
  },
  // Delivery
  deliveryAddress: {
    type: String,
    required: [true, 'Delivery address is required']
  },
  deliveryPin: {
    type: String,
    required: [true, 'Delivery PIN is required'],
    match: [/^700\d{3}$/, 'Invalid Kolkata PIN code']
  },
  deliverySlot: {
    type: String,
    required: [true, 'Delivery slot is required']
  },
  // Order status
  status: {
    type: String,
    enum: ['Placed', 'Packed', 'Shipped', 'Delivered', 'ReturnRequested', 'Refunded', 'Disputed', 'Cancelled'],
    default: 'Placed'
  },
  // Return policy snapshot at order time
  returnPolicy: {
    type: Boolean,
    default: false
  },
  // Status timestamps
  statusTimeline: [{
    status: String,
    timestamp: Date,
    note: String
  }],
  // Delivery timestamps
  deliveredAt: Date,
  // Payout
  payoutStatus: {
    type: String,
    enum: ['pending', 'scheduled', 'released', 'held', 'cancelled'],
    default: 'pending'
  },
  payoutScheduledAt: Date,
  payoutReleasedAt: Date,
  payoutHeldReason: String,
  // Return
  returnRequest: returnRequestSchema,
  // Cancellation
  cancellationReason: String,
  cancelledAt: Date,
  // Dispatch details
  dispatch: {
    trackingId: String,
    courierName: String,
    courierUrl: String,
    packedAt: Date,
    shippedAt: Date
  },
  // Notes
  vendorNotes: String,
  clientNotes: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
orderSchema.index({ client: 1, createdAt: -1 });
orderSchema.index({ vendor: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ payoutStatus: 1, payoutScheduledAt: 1 });
orderSchema.index({ 'returnRequest.status': 1 });

// Mongoose 8/9 compatible pre-save hook (no next() — return Promise)
orderSchema.pre('save', async function() {
  if (this.isNew) {
    const counter = await Counter.findOneAndUpdate(
      { _id: 'orderNumber' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const timestamp = Date.now().toString().slice(-6);
    this.orderNumber = `DK-${timestamp}-${String(counter.seq).padStart(4, '0')}`;

    // Initialize status timeline
    this.statusTimeline = [{
      status: 'Placed',
      timestamp: new Date(),
      note: 'Order placed by client'
    }];
  }
});

// Method to add status to timeline
orderSchema.methods.addStatusUpdate = function(status, note = '') {
  this.statusTimeline.push({ status, timestamp: new Date(), note });
  this.status = status;
};

// Method to check if return window is open (7 days from delivery)
orderSchema.virtual('isReturnWindowOpen').get(function() {
  if (!this.returnPolicy || !this.deliveredAt) return false;
  if (this.status !== 'Delivered') return false;
  
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return (Date.now() - this.deliveredAt.getTime()) < sevenDays;
});

// Method to calculate payout schedule date
orderSchema.virtual('payoutDueDate').get(function() {
  if (!this.returnPolicy) {
    return this.deliveredAt;
  }
  if (this.deliveredAt) {
    return new Date(this.deliveredAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
  return null;
});

module.exports = mongoose.model('Order', orderSchema);
