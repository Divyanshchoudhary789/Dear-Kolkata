const mongoose = require('mongoose');

/**
 * Simple key-value config store for runtime-configurable platform settings.
 * Admin can update values without redeploying.
 */
const configSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

configSchema.index({ key: 1 });

/**
 * Get a config value by key, with a fallback default
 */
configSchema.statics.getValue = async function(key, defaultValue = null) {
  const doc = await this.findOne({ key }).lean();
  return doc ? doc.value : defaultValue;
};

/**
 * Set a config value (upsert)
 */
configSchema.statics.setValue = async function(key, value, description = '', updatedBy = null) {
  return this.findOneAndUpdate(
    { key },
    { value, description, updatedBy },
    { upsert: true, returnDocument: 'after' }
  );
};

module.exports = mongoose.model('Config', configSchema);
