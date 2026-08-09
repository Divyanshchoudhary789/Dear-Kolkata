require('dotenv').config();

const requiredInProduction = [
  'MONGO_URI',
  'JWT_SECRET',
  'FRONTEND_URL',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
];

const optionalButRecommended = [
  'TWOFACTOR_API_KEY',
  'BREVO_SENDER_EMAIL',
  'BREVO_API_KEY',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];

const validateEnv = () => {
  const missing = requiredInProduction.filter(key => !process.env[key]);

  if (process.env.NODE_ENV === 'production') {
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    if (process.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters in production');
    }

    if (!process.env.JWT_SECRET.includes('CHANGE_THIS')) {
      // ok
    } else {
      throw new Error('JWT_SECRET contains default placeholder value');
    }
  }

  const missingRecommended = optionalButRecommended.filter(key => !process.env[key]);
  if (missingRecommended.length > 0) {
    console.warn(`[Config] Missing optional but recommended env vars: ${missingRecommended.join(', ')}`);
  }

  console.log('[Config] Environment validation passed');
  console.log(`[Config] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[Config] Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
};

module.exports = validateEnv;
