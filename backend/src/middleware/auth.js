const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const TokenBlacklist = require('../models/TokenBlacklist');
const ApiError = require('../utils/apiError');
const catchAsync = require('../utils/catchAsync');

/**
 * Verify JWT token and attach user to req.user
 */
const protect = catchAsync(async (req, res, next) => {
  let token;

  // Get token from header or cookie
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    throw new ApiError(401, 'Not authorized to access this route. Please login.');
  }

  try {
    // Check if token is blacklisted
    const decoded = jwt.decode(token, { complete: true });
    if (decoded?.payload?.jti) {
      const blacklisted = await TokenBlacklist.findOne({ jti: decoded.payload.jti });
      if (blacklisted) {
        throw new ApiError(401, 'Token has been revoked. Please login again.');
      }
    }

    // Verify token
    const verified = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await User.findById(verified.id).select('-otp');
    if (!user || !user.isActive) {
      throw new ApiError(401, 'User no longer exists or is inactive');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new ApiError(401, 'Invalid token. Please login again.');
    }
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Token expired. Please login again.');
    }
    throw error;
  }
});

/**
 * Restrict access to specific roles
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, `Access restricted to ${roles.join(', ')} roles only`);
    }
    next();
  };
};

/**
 * Ensure request is from vendor and attach vendor to req.vendor
 */
const attachVendor = catchAsync(async (req, res, next) => {
  if (req.user.role !== 'vendor') {
    throw new ApiError(403, 'Access restricted to vendor accounts');
  }

  const vendor = await Vendor.findOne({ user: req.user._id });
  if (!vendor) {
    throw new ApiError(404, 'Vendor profile not found');
  }

  req.vendor = vendor;
  next();
});

/**
 * Restrict staff sub-accounts to allowed paths.
 * Staff members can only access the redemption terminal and their own profile.
 * Owner-level access is required for dashboard, orders, payouts, products, coupons, etc.
 */
const restrictStaff = (allowedPaths = []) => {
  return (req, res, next) => {
    if (!req.vendor) return next();

    const staffAccount = req.vendor.staffAccounts.find(
      s => s.userId?.toString() === req.user._id.toString() && s.isActive
    );

    if (!staffAccount) return next(); // Owner — full access

    const currentPath = req.route?.path || req.path || '';
    const isAllowed = allowedPaths.some(path => currentPath.includes(path));

    if (!isAllowed) {
      throw new ApiError(403, 'Staff accounts have restricted access. Contact your vendor owner for full access.');
    }

    next();
  };
};

/**
 * Verify Kolkata PIN for geo-restriction
 */
const verifyKolkataPin = (req, res, next) => {
  const pin = req.body.pin || req.query.pin;
  
  if (!pin) {
    throw new ApiError(400, 'PIN code is required');
  }

  const kolkataRegex = new RegExp(process.env.KOLKATA_PIN_REGEX || '^700\\d{3}$');
  if (!kolkataRegex.test(pin)) {
    throw new ApiError(403, 'Service is restricted to Kolkata only. Invalid PIN code.');
  }

  next();
};

/**
 * Optional auth — sets req.user if token is valid, but doesn't fail if not
 */
const optionalAuth = catchAsync(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-otp');
    if (user && user.isActive) {
      req.user = user;
    }
  } catch (error) {
    // Silently fail
  }

  next();
});

module.exports = {
  protect,
  restrictTo,
  attachVendor,
  restrictStaff,
  verifyKolkataPin,
  optionalAuth
};
