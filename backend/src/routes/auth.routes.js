const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect, restrictTo } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');

// ─── Strict Rate Limiter for Auth Endpoints ───────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: { success: false, message: 'Too many authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development' && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.ip)
});

const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 OTP requests per minute
  message: { success: false, message: 'Too many OTP requests. Please wait before requesting again.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development' && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.ip)
});

// ─── Public Routes ───────────────────────────────────────────────────────

// Client OTP login (existing users only)
router.post('/send-otp',
  otpLimiter,
  validate({
    body: Joi.object({
      phone: Joi.string().pattern(/^[6-9]\d{9}$/).required()
    })
  }),
  authController.sendOTP
);

// Client Registration — Step 1: send OTP (new users)
router.post('/register/send-otp',
  otpLimiter,
  validate({
    body: Joi.object({
      phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
      name:  Joi.string().min(2).max(60).required(),
      email: Joi.string().email().optional().allow('')
    })
  }),
  authController.registerSendOTP
);

// Client Registration — Step 2: verify OTP + address → activate account
router.post('/register/verify',
  authLimiter,
  validate({
    body: Joi.object({
      phone:        Joi.string().pattern(/^[6-9]\d{9}$/).required(),
      otp:          Joi.string().length(6).required(),
      addressLabel: Joi.string().min(1).max(50).required(),
      addressText:  Joi.string().min(5).max(200).required(),
      addressPin:   Joi.string().pattern(/^700\d{3}$/).required()
    })
  }),
  authController.registerVerify
);

router.post('/verify-otp',
  authLimiter,
  validate({
    body: Joi.object({
      phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
      otp: Joi.string().length(6).required()
    })
  }),
  authController.verifyOTP
);

// Kolkata PIN verification
router.post('/verify-pin',
  authLimiter,
  validate({
    body: Joi.object({
      pin: Joi.string().pattern(/^700\d{3}$/).required()
    })
  }),
  authController.verifyKolkataPin
);

// Vendor login
router.post('/vendor/login',
  authLimiter,
  validate({
    body: Joi.object({
      phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
      password: Joi.string().min(8).required()
    })
  }),
  authController.vendorLogin
);

// Admin login
router.post('/admin/login',
  authLimiter,
  validate({
    body: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(8).required()
    })
  }),
  authController.adminLogin
);

// ─── Protected Routes ────────────────────────────────────────────────────

router.post('/logout', protect, authController.logout);
router.post('/logout-all', protect, authController.logoutAll);
router.get('/me', protect, authController.getMe);
router.put('/me', protect, authController.updateProfile);

// Address management (client only)
router.post('/addresses', protect, restrictTo('client'), authController.addAddress);
router.delete('/addresses/:addressId', protect, restrictTo('client'), authController.deleteAddress);

module.exports = router;
