const crypto = require('crypto');

/**
 * Simple CSRF protection using double-submit cookie pattern.
 * 
 * Flow:
 * 1. GET /api/csrf-token → sets a non-httpOnly cookie with a random token
 * 2. Frontend reads the cookie and sends X-CSRF-Token header on state-changing requests
 * 3. Middleware validates header matches cookie
 */

const CSRF_COOKIE_NAME = 'dk_csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

// Generate and set CSRF token
const setCsrfToken = (req, res) => {
  const token = crypto.randomBytes(32).toString('hex');
  
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Frontend needs to read this
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  });
  
  res.json({ csrfToken: token });
};

// Validate CSRF token middleware
const validateCsrfToken = (req, res, next) => {
  // Skip for safe methods and token endpoint
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Skip for webhook (has its own auth)
  if (req.path === '/payments/webhook') {
    return next();
  }
  
  const cookieToken = req.cookies[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME];
  
  if (!cookieToken || !headerToken) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token missing'
    });
  }
  
  if (cookieToken !== headerToken) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token mismatch'
    });
  }
  
  next();
};

module.exports = {
  setCsrfToken,
  validateCsrfToken,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME
};
