const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  id: {
    type: String,
    required: [true, 'Category ID is required'],
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true
  },
  commission: {
    type: Number,
    required: [true, 'Commission percentage is required'],
    min: [0, 'Commission cannot be negative'],
    max: [100, 'Commission cannot exceed 100%']
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  icon: {
    url: String,
    publicId: String
  },
  // Ordering for display
  displayOrder: {
    type: Number,
    default: 0
  },
  // Metadata
  metadata: {
    productCount: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    totalCommission: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Index
categorySchema.index({ id: 1 });
categorySchema.index({ isActive: 1, displayOrder: 1 });

// Static method to update category statistics
categorySchema.statics.updateStats = async function(categoryId, revenueChange, commissionChange) {
  await this.findOneAndUpdate(
    { id: categoryId },
    {
      $inc: {
        'metadata.totalRevenue': revenueChange,
        'metadata.totalCommission': commissionChange
      }
    }
  );
};

module.exports = mongoose.model('Category', categorySchema);
