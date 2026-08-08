const User = require('../models/User');
const Vendor = require('../models/Vendor');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');
const { creditWallet } = require('../services/walletService');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');

/**
 * Utility: attach JWT to cookie and send token response
 */
const sendTokenResponse = (user, statusCode, res, message) => {
  const token = user.generateAuthToken();

  const cookieOptions = {
    expires: new Date(Date.now() + (parseInt(process.env.JWT_COOKIE_EXPIRE) || 30) * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production'
      ? (process.env.JWT_COOKIE_SAMESITE || 'none')
      : (process.env.JWT_COOKIE_SAMESITE || 'strict')
  };

  // Remove password and OTP from output
  user.password = undefined;
  user.otp = undefined;

  return res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      message,
      data: {
        user: {
          id: user._id,
          phone: user.phone,
          name: user.name,
          email: user.email,
          role: user.role,
          walletBalance: user.walletBalance,
          isKolkataVerified: user.isKolkataVerified
        }
      }
    });
};

// ─── Client Auth (Phone OTP based) ─────────────────────────────────────────

/**
 * @route  POST /api/auth/send-otp
 * @desc   Send OTP to phone number (client sign up / login)
 * @access Public
 */
exports.sendOTP = catchAsync(async (req, res, next) => {
  const { phone } = req.body;

  if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
    throw new ApiError(400, 'Valid Indian phone number required');
  }

  // Find or create user
  let user = await User.findOne({ phone });
  if (!user) {
    user = await User.create({ phone, role: 'client' });
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Account is suspended. Please contact support.');
  }

  // Generate OTP
  const otp = user.generateOTP();
  await user.save({ validateBeforeSave: false });

  // Development: return OTP directly (never expose in production)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV] OTP for ${phone}: ${otp}`);
    return sendSuccess(res, 200, 'OTP sent successfully', {
      devOtp: otp,
      expiresInMinutes: 10
    });
  }

  // Production: send OTP via 2Factor SMS
  const smsResult = await smsService.sendOTPViaSMS(phone, otp);

  if (!smsResult.success) {
    // SMS failed → fallback to email if user has one registered
    console.error(`[AUTH] SMS delivery failed for ${phone}:`, smsResult.error);

    const hasEmail = user.email && user.email.trim().length > 0;
    if (hasEmail) {
      const emailResult = await emailService.sendOTPEmail(user.email, otp, user.name);
      if (!emailResult.success) {
        // Both channels failed — abort
        throw new ApiError(503, 'Unable to deliver OTP. Please try again in a moment.');
      }
      return sendSuccess(res, 200, 'OTP sent to your registered email (SMS unavailable)', {
        expiresInMinutes: 10
      });
    }

    throw new ApiError(503, 'Unable to send OTP via SMS. Please try again.');
  }

  return sendSuccess(res, 200, 'OTP sent successfully to your phone', {
    expiresInMinutes: 10
  });
});

/**
 * @route  POST /api/auth/verify-otp
 * @desc   Verify OTP and log in client
 * @access Public
 */
exports.verifyOTP = catchAsync(async (req, res, next) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    throw new ApiError(400, 'Phone number and OTP are required');
  }

  const user = await User.findOne({ phone }).select('+otp');
  if (!user) {
    throw new ApiError(404, 'User not found. Please send OTP first.');
  }

  const isValid = user.verifyOTP(otp);
  if (!isValid) {
    await user.save({ validateBeforeSave: false }); // Save attempt count
    throw new ApiError(400, 'Invalid or expired OTP');
  }

  // First login check → grant welcome bonus
  const isFirstLogin = !user.lastLogin;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  if (isFirstLogin && user.role === 'client') {
    const welcomeBonus = parseFloat(process.env.WELCOME_BONUS_AMOUNT) || 350;
    await creditWallet(
      user._id,
      welcomeBonus,
      'welcome_bonus',
      'Welcome to Dear Kolkata! Sign-up bonus'
    );
  }

  sendTokenResponse(user, 200, res, isFirstLogin ? 'Welcome to Dear Kolkata!' : 'Login successful');
});

/**
 * @route  POST /api/auth/verify-pin
 * @desc   Verify Kolkata PIN code geo-gate
 * @access Public
 */
exports.verifyKolkataPin = catchAsync(async (req, res, next) => {
  const { pin } = req.body;

  if (!pin) {
    throw new ApiError(400, 'PIN code is required');
  }

  const kolkataRegex = /^700\d{3}$/;
  if (!kolkataRegex.test(pin.trim())) {
    throw new ApiError(403, 'Dear Kolkata is currently available in Kolkata only. Invalid PIN code.');
  }

  return sendSuccess(res, 200, 'Kolkata location verified', { isKolkataVerified: true });
});

// ─── Vendor & Admin Auth (Password based) ───────────────────────────────────

/**
 * @route  POST /api/auth/vendor/login
 * @desc   Vendor login with phone + password (credentials issued by Navrasa)
 * @access Public
 */
exports.vendorLogin = catchAsync(async (req, res, next) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    throw new ApiError(400, 'Phone and password are required');
  }

  const user = await User.findOne({ phone, role: 'vendor' }).select('+password');
  if (!user || !user.isActive) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // Get vendor profile
  const vendor = await Vendor.findOne({ user: user._id });
  if (!vendor || vendor.status !== 'Active') {
    throw new ApiError(403, 'Vendor account is not active. Please contact your account manager.');
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  sendTokenResponse(user, 200, res, 'Vendor login successful');
});

/**
 * @route  POST /api/auth/admin/login
 * @desc   Admin login with email + password
 * @access Public
 */
exports.adminLogin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const user = await User.findOne({ email: email.toLowerCase(), role: 'admin' }).select('+password');
  if (!user || !user.isActive) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid credentials');
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  sendTokenResponse(user, 200, res, 'Admin login successful');
});

/**
 * @route  POST /api/auth/logout
 * @desc   Logout - clear cookie
 * @access Private
 */
exports.logout = catchAsync(async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production'
      ? (process.env.JWT_COOKIE_SAMESITE || 'none')
      : (process.env.JWT_COOKIE_SAMESITE || 'strict')
  });

  return sendSuccess(res, 200, 'Logged out successfully');
});

/**
 * @route  GET /api/auth/me
 * @desc   Get current logged in user profile
 * @access Private
 */
exports.getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  let vendorProfile = null;
  if (user.role === 'vendor') {
    vendorProfile = await Vendor.findOne({ user: user._id }).select('-bankDetails.accountNumber -kycDocuments');
  }

  return sendSuccess(res, 200, 'Profile fetched successfully', {
    user,
    vendorProfile
  });
});

/**
 * @route  PUT /api/auth/me
 * @desc   Update current user profile
 * @access Private
 */
exports.updateProfile = catchAsync(async (req, res, next) => {
  const { name, email } = req.body;
  const allowedFields = { name, email };

  // Remove undefined fields
  Object.keys(allowedFields).forEach(key => {
    if (allowedFields[key] === undefined) delete allowedFields[key];
  });

  const user = await User.findByIdAndUpdate(
    req.user._id,
    allowedFields,
    { new: true, runValidators: true }
  );

  return sendSuccess(res, 200, 'Profile updated successfully', { user });
});

/**
 * @route  POST /api/auth/addresses
 * @desc   Add a new delivery address
 * @access Private (Client)
 */
exports.addAddress = catchAsync(async (req, res, next) => {
  const { label, text, pin, isDefault } = req.body;

  const user = await User.findById(req.user._id);

  // If setting as default, unset others
  if (isDefault) {
    user.addresses.forEach(addr => { addr.isDefault = false; });
  }

  user.addresses.push({ label, text, pin, isDefault: isDefault || user.addresses.length === 0 });
  await user.save();

  return sendSuccess(res, 201, 'Address added successfully', { addresses: user.addresses });
});

/**
 * @route  DELETE /api/auth/addresses/:addressId
 * @desc   Delete a delivery address
 * @access Private (Client)
 */
exports.deleteAddress = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  user.addresses = user.addresses.filter(a => a._id.toString() !== req.params.addressId);
  await user.save();

  return sendSuccess(res, 200, 'Address removed', { addresses: user.addresses });
});
