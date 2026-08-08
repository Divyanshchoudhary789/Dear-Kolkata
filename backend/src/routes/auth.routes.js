const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect, restrictTo } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const Joi = require('joi');

// ─── Public Routes ───────────────────────────────────────────────────────

// Client OTP auth
router.post('/send-otp', 
  validate({
    body: Joi.object({
      phone: Joi.string().pattern(/^[6-9]\d{9}$/).required()
    })
  }),
  authController.sendOTP
);

router.post('/verify-otp',
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
  validate({
    body: Joi.object({
      pin: Joi.string().pattern(/^700\d{3}$/).required()
    })
  }),
  authController.verifyKolkataPin
);

// Vendor login
router.post('/vendor/login',
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
router.get('/me', protect, authController.getMe);
router.put('/me', protect, authController.updateProfile);

// Address management (client only)
router.post('/addresses', protect, restrictTo('client'), authController.addAddress);
router.delete('/addresses/:addressId', protect, restrictTo('client'), authController.deleteAddress);

module.exports = router;
