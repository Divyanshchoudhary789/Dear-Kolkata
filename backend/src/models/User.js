const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const addressSchema = new mongoose.Schema({
  label: {
    type: String,
    required: [true, 'Address label is required'],
    trim: true
  },
  text: {
    type: String,
    required: [true, 'Address text is required'],
    trim: true
  },
  pin: {
    type: String,
    required: [true, 'PIN code is required'],
    match: [/^700\d{3}$/, 'Invalid Kolkata PIN code']
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, { _id: true });

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    match: [/^[6-9]\d{9}$/, 'Invalid Indian phone number']
  },
  name: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email address']
  },
  role: {
    type: String,
    enum: ['client', 'vendor', 'admin'],
    default: 'client'
  },
  addresses: [addressSchema],
  walletBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  isKolkataVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  staffOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    default: null,
    index: true
  },
  // OTP for authentication
  otp: {
    code: String,
    expiresAt: Date,
    attempts: { type: Number, default: 0 }
  },
  // Password for admin and vendor accounts
  password: {
    type: String,
    minlength: 8,
    select: false // Don't include in queries by default
  },
  profileImage: {
    url: String,
    publicId: String
  },
  // Notification preferences
  notifications: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: true },
    push: { type: Boolean, default: true }
  },
  // Metadata
  metadata: {
    signupSource: String,
    deviceInfo: String,
    referralCode: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1, isActive: 1 });

// Hash password before saving (for vendor/admin accounts)
userSchema.pre('save', async function() {
  if (!this.isModified('password') || !this.password) {
    return;
  }
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
userSchema.methods.generateAuthToken = function() {
  const crypto = require('crypto');
  const jti = crypto.randomBytes(16).toString('hex');
  return jwt.sign(
    {
      id: this._id,
      role: this.role,
      phone: this.phone,
      jti
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

// Generate OTP
userSchema.methods.generateOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  this.otp = {
    code: otp,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    attempts: 0
  };
  return otp;
};

// Verify OTP
userSchema.methods.verifyOTP = function(candidateOTP) {
  if (!this.otp || !this.otp.code) return false;
  if (new Date() > this.otp.expiresAt) return false;
  if (this.otp.attempts >= 3) return false;
  
  this.otp.attempts += 1;
  
  if (this.otp.code === candidateOTP) {
    this.otp = undefined; // Clear OTP after successful verification
    return true;
  }
  
  return false;
};

// Virtual for cart items (populated from Order model)
userSchema.virtual('orders', {
  ref: 'Order',
  localField: '_id',
  foreignField: 'client'
});

// Virtual for user coupons
userSchema.virtual('userCoupons', {
  ref: 'UserCoupon',
  localField: '_id',
  foreignField: 'client'
});

module.exports = mongoose.model('User', userSchema);
