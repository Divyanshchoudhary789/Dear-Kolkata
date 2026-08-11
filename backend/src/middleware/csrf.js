const crypto = require('crypto');

/**
 * CSRF protection — double-submit cookie pattern.
 *
 * Production (cross-origin) flow:
 * 1. GET /api/csrf-token
 *      → sets dk_csrf_token cookie (SameSite=None; Secure; HttpOnly=false)
 *      → also returns { csrfToken } in the JSON body so the frontend can
 *        cache it in memory (cookie may be blocked by some browsers/proxies)
 * 2. Frontend attaches token as x-csrf-token header on every POST/PUT/DELETE
 * 3. This middleware checks header === cookie (or header === cached body value)
 *
 * Skipped for:
 *   - Safe methods: GET, HEAD, OPTIONS
 *   - Razorpay webhook: has its own HMAC signature auth
 */

const CSRF_COOKIE_NAME = 'dk_csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';   // lowercase — Express normalises all headers to lowercase

// ── Generate and set CSRF token ───────────────────────────────────────────────
const setCsrfToken = (req, res) => {
  const token = crypto.randomBytes(32).toString('hex');

  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,     // JS must be able to read it for the double-submit pattern
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,  // 24 hours
    path: '/',
  });

  // Return token in body as well — reliable fallback for cross-origin
  // setups where the cookie is readable but the JS cookie API may lag,
  // or where browser cookie policies (ITP, SameSite) cause issues.
  return res.status(200).json({ success: true, csrfToken: token });
};

// ── Validate CSRF token middleware ────────────────────────────────────────────
const validateCsrfToken = (req, res, next) => {
  // Safe methods never mutate state — skip validation
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Razorpay webhook uses HMAC signature — CSRF not applicable
  if (req.path === '/payments/webhook') {
    return next();
  }

  // Express normalises header names to lowercase
  const headerToken = req.headers[CSRF_HEADER_NAME];
  const cookieToken = req.cookies[CSRF_COOKIE_NAME];

  // We accept if either the cookie or the header is present and they match,
  // OR if only the header is present and the cookie hasn't arrived yet
  // (e.g. first request race-condition). The strict check is header===cookie.
  if (!headerToken) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token missing — please refresh the page and try again',
    });
  }

  if (!cookieToken) {
    // Cookie not set yet (first visit race) — trust the header alone is
    // insufficient for strict CSRF; reject and ask frontend to re-fetch token.
    return res.status(403).json({
      success: false,
      message: 'CSRF session expired — please refresh the page',
    });
  }

  if (cookieToken !== headerToken) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token mismatch',
    });
  }

  next();
};

module.exports = { setCsrfToken, validateCsrfToken, CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
