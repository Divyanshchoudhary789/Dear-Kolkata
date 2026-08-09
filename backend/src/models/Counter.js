const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

counterSchema.index({ _id: 1 }, { unique: true });

module.exports = mongoose.model('Counter', counterSchema);
