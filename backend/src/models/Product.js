const mongoose = require('mongoose');

const GIFTING_TAGS = [
  'For Your Loved One',
  'For Your Girlfriend',
  'For Your Wife',
  'For Your Colleagues'
];

const productSchema = new mongoose.Schema({
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: [true, 'Vendor is required']
  },
  category: {
    type: String,
    required: [true, 'Category is required']
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  stock: {
    type: Number,
    required: [true, 'Stock is required'],
    min: [0, 'Stock cannot be negative']
  },
  images: [{
    url:      { type: String, required: true },
    publicId: String,
    isMain:   { type: Boolean, default: false }
  }],
  tags: [{
    type: String,
    enum: GIFTING_TAGS
  }],
  returnPolicy: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Inactive'],
    default: 'Pending'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  moderation: {
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    notes: String
  },
  // slug: removed unique constraint to avoid pre-save next() issues in Mongoose 8
  slug: {
    type: String,
    sparse: true,  // allows multiple null values
    lowercase: true,
    trim: true
  },
  metrics: {
    views:   { type: Number, default: 0 },
    orders:  { type: Number, default: 0 },
    revenue: { type: Number, default: 0 }
  },
  deliveryEstimate: {
    type: String,
    default: '2-3 business days'
  }
}, {
  timestamps: true,
  toJSON:   { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
productSchema.index({ vendor: 1, status: 1, isActive: 1 });
productSchema.index({ category: 1, status: 1, isActive: 1 });
productSchema.index({ tags: 1, status: 1 });
productSchema.index({ price: 1 });
productSchema.index({ name: 'text', description: 'text' });

// Mongoose 8 compatible pre-save hook (no next() — return Promise)
productSchema.pre('save', async function() {
  if (!this.isModified('name') && this.slug) return;

  const base = this.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  let slug  = base;
  let count = 1;
  // Ensure uniqueness without next()
  while (await mongoose.model('Product').findOne({ slug, _id: { $ne: this._id } }).lean()) {
    slug = `${base}-${count++}`;
  }
  this.slug = slug;
});

productSchema.statics.getGiftingTags = () => GIFTING_TAGS;

productSchema.virtual('displayStock').get(function() {
  return this.isActive && this.status === 'Approved' ? this.stock : 0;
});

module.exports = mongoose.model('Product', productSchema);
