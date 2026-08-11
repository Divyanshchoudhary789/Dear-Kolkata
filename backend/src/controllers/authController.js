const User = require('../models/User');
const Vendor = require('../models/Vendor');
const TokenBlacklist = require('../models/TokenBlacklist');
const jwt = require('jsonwebtoken');
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
      : 'lax'
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
 * @desc   Send OTP to phone number (login only — for existing users)
 * @access Public
 */
exports.sendOTP = catchAsync(async (req, res, next) => {
  const { phone } = req.body;

  if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
    throw new ApiError(400, 'Valid Indian phone number required');
  }

  // Find existing user only (login flow — no auto-create)
  const user = await User.findOne({ phone });
  if (!user) {
    throw new ApiError(404, 'No account found with this phone number. Please register first.');
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
 * @route  POST /api/auth/register/send-otp
 * @desc   Send OTP for new client registration (phone must NOT already exist)
 * @access Public
 */
exports.registerSendOTP = catchAsync(async (req, res, next) => {
  const { phone, name, email } = req.body;

  if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
    throw new ApiError(400, 'Valid Indian phone number required');
  }
  if (!name || name.trim().length < 2) {
    throw new ApiError(400, 'Name must be at least 2 characters');
  }

  // Check if phone already registered
  const existing = await User.findOne({ phone });
  if (existing && existing.isActive) {
    throw new ApiError(409, 'An account already exists with this phone number. Please login instead.');
  }

  // Check email uniqueness if provided
  if (email) {
    const emailExists = await User.findOne({ email: email.toLowerCase() });
    if (emailExists) {
      throw new ApiError(409, 'This email is already registered with another account.');
    }
  }

  // Create or reuse incomplete/inactive account for OTP
  let user = existing;
  if (!user) {
    user = await User.create({
      phone,
      name: name.trim(),
      email: email ? email.toLowerCase().trim() : undefined,
      role: 'client',
      isActive: false // stays inactive until OTP verified
    });
  } else {
    // Reuse inactive record — update name/email
    user.name = name.trim();
    if (email) user.email = email.toLowerCase().trim();
  }

  // Generate OTP
  const otp = user.generateOTP();
  await user.save({ validateBeforeSave: false });

  // Development: return OTP directly
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV] Register OTP for ${phone}: ${otp}`);
    return sendSuccess(res, 200, 'OTP sent for registration', {
      devOtp: otp,
      expiresInMinutes: 10
    });
  }

  // Production: send via SMS
  const smsResult = await smsService.sendOTPViaSMS(phone, otp);

  if (!smsResult.success) {
    if (email) {
      const emailResult = await emailService.sendOTPEmail(email, otp, name);
      if (emailResult.success) {
        return sendSuccess(res, 200, 'OTP sent to your email (SMS unavailable)', { expiresInMinutes: 10 });
      }
    }
    throw new ApiError(503, 'Unable to send OTP. Please try again.');
  }

  return sendSuccess(res, 200, 'OTP sent to your phone for verification', { expiresInMinutes: 10 });
});

/**
 * @route  POST /api/auth/register/verify
 * @desc   Verify OTP, save address, activate account, issue token
 * @access Public
 */
exports.registerVerify = catchAsync(async (req, res, next) => {
  const { phone, otp, addressLabel, addressText, addressPin } = req.body;

  if (!phone || !otp) {
    throw new ApiError(400, 'Phone and OTP are required');
  }
  if (!addressLabel || !addressText || !addressPin) {
    throw new ApiError(400, 'Delivery address details are required for registration');
  }
  if (!/^700\d{3}$/.test(addressPin)) {
    throw new ApiError(400, 'A valid Kolkata PIN code (700xxx) is required');
  }

  const user = await User.findOne({ phone }).select('+otp');
  if (!user) {
    throw new ApiError(404, 'No pending registration found. Please start again.');
  }

  const isValid = user.verifyOTP(otp);
  if (!isValid) {
    await user.save({ validateBeforeSave: false });
    throw new ApiError(400, 'Invalid or expired OTP');
  }

  // Activate account and save address
  user.isActive = true;
  user.lastLogin = new Date();

  // Add the initial address
  user.addresses.push({
    label: addressLabel.trim(),
    text: addressText.trim(),
    pin: addressPin.trim(),
    isDefault: true
  });

  await user.save({ validateBeforeSave: false });

  // Grant welcome bonus
  const welcomeBonus = parseFloat(process.env.WELCOME_BONUS_AMOUNT) || 350;
  await creditWallet(
    user._id,
    welcomeBonus,
    'welcome_bonus',
    'Welcome to Dear Kolkata! Sign-up bonus'
  );

  sendTokenResponse(user, 201, res, 'Account created successfully! Welcome to Dear Kolkata!');
});

/**
 * @route  POST /api/auth/verify-otp
 * @desc   Verify OTP and log in existing client
 * @access Public
 */
exports.verifyOTP = catchAsync(async (req, res, next) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    throw new ApiError(400, 'Phone number and OTP are required');
  }

  const user = await User.findOne({ phone }).select('+otp');
  if (!user) {
    throw new ApiError(404, 'No account found with this number. Please register first.');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Account is not active. Please complete registration or contact support.');
  }

  const isValid = user.verifyOTP(otp);
  if (!isValid) {
    await user.save({ validateBeforeSave: false }); // Save attempt count
    throw new ApiError(400, 'Invalid or expired OTP');
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  sendTokenResponse(user, 200, res, 'Login successful');
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
 * @desc   Logout - clear cookie and blacklist current token
 * @access Private
 */
exports.logout = catchAsync(async (req, res, next) => {
  const token = req.cookies?.token || req.headers?.authorization?.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.decode(token, { complete: true });
      if (decoded?.payload?.jti) {
        await TokenBlacklist.create({
          jti: decoded.payload.jti,
          userId: req.user._id,
          expiresAt: new Date(decoded.payload.exp * 1000)
        });
      }
    } catch (e) {
      // Ignore blacklist errors - cookie will still be cleared
    }
  }

  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production'
      ? (process.env.JWT_COOKIE_SAMESITE || 'none')
      : 'lax'
  });

  return sendSuccess(res, 200, 'Logged out successfully');
});

/**
 * @route  POST /api/auth/logout-all
 * @desc   Logout from all devices - blacklist all tokens for this user
 * @access Private
 */
exports.logoutAll = catchAsync(async (req, res, next) => {
  // Blacklist current token
  const token = req.cookies?.token || req.headers?.authorization?.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.decode(token, { complete: true });
      if (decoded?.payload?.jti) {
        await TokenBlacklist.create({
          jti: decoded.payload.jti,
          userId: req.user._id,
          expiresAt: new Date(decoded.payload.exp * 1000)
        });
      }
    } catch (e) {
      // Ignore
    }
  }

  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production'
      ? (process.env.JWT_COOKIE_SAMESITE || 'none')
      : 'lax'
  });

  return sendSuccess(res, 200, 'Logged out from all devices successfully');
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
