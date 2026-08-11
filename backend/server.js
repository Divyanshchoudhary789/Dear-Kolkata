require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const connectDatabase = require('./src/config/database');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');
const validateEnv = require('./src/config/validateEnv');

const app = express();

validateEnv();

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

if (process.env.NODE_ENV === 'production') {
  const requiredInProduction = ['MONGO_URI', 'JWT_SECRET', 'FRONTEND_URL'];
  for (const key of requiredInProduction) {
    if (!process.env[key]) throw new Error(`${key} is required in production`);
  }
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }
}

app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  // Expose CSRF token header so browsers can read it in cross-origin responses
  exposedHeaders: ['X-CSRF-Token', 'x-csrf-token'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token', 'X-CSRF-Token'],
}));

// ── Webhook must receive raw body BEFORE express.json() ──────────────────────
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.JSON_BODY_LIMIT || '10mb' }));
app.use(cookieParser());

const sanitizeMongoOperators = (value) => {
  if (!value || typeof value !== 'object') return;
  for (const key of Object.keys(value)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete value[key];
      continue;
    }
    sanitizeMongoOperators(value[key]);
  }
};

app.use((req, _res, next) => {
  sanitizeMongoOperators(req.body);
  sanitizeMongoOperators(req.query);
  sanitizeMongoOperators(req.params);
  next();
});

const { setCsrfToken, validateCsrfToken } = require('./src/middleware/csrf');

// ── CSRF token endpoint — MUST be before validateCsrfToken middleware ─────────
// This route sets the cookie AND returns the token in JSON body.
// Frontend calls this once on app startup.
app.get('/api/csrf-token', setCsrfToken);

// All other /api/ routes go through CSRF validation
app.use('/api/', validateCsrfToken);

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development'
    ? 1000
    : (parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development'
    && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.ip)
});
app.use('/api/', limiter);

connectDatabase();

const { initScheduledJobs } = require('./src/jobs/payoutScheduler');
setTimeout(() => initScheduledJobs(), 5000);

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Dear Kolkata Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Dear Kolkata Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/client', require('./src/routes/client.routes'));
app.use('/api/vendor', require('./src/routes/vendor.routes'));
app.use('/api/admin', require('./src/routes/admin.routes'));
app.use('/api/products', require('./src/routes/product.routes'));
app.use('/api/orders', require('./src/routes/order.routes'));
app.use('/api/payments', require('./src/routes/payment.routes'));
app.use('/api/coupons', require('./src/routes/coupon.routes'));
app.use('/api/packages', require('./src/routes/package.routes'));
app.use('/api/wallet', require('./src/routes/wallet.routes'));
app.use('/api/notifications', require('./src/routes/notification.routes'));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  console.error(err.stack);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error(`Uncaught Exception: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

module.exports = app;
