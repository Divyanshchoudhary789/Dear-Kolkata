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

// In-memory token store keyed by the token value itself.
// Used to validate requests from Safari/ITP where the cookie is blocked,
// but the token was delivered via JSON body and sent back as a header.
const _validTokens = new Map();
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Prune expired server-side tokens periodically to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [token, expiresAt] of _validTokens) {
    if (now > expiresAt) _validTokens.delete(token);
  }
}, 60 * 60 * 1000); // every hour

// ── Generate and set CSRF token ───────────────────────────────────────────────
const setCsrfToken = (req, res) => {
  const token = crypto.randomBytes(32).toString('hex');

  // Register the token server-side so we can validate cookie-less requests
  // (Safari ITP blocks SameSite=None cross-site cookies)
  _validTokens.set(token, Date.now() + TOKEN_TTL_MS);

  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,     // JS must be able to read it for the double-submit pattern
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: TOKEN_TTL_MS,
    path: '/',
  });

  // Return token in body as well — primary source for Safari/ITP where the
  // cookie may be blocked. Frontend caches this in memory and sends it via
  // x-csrf-token header on every mutating request.
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

  if (!headerToken) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token missing — please refresh the page and try again',
    });
  }

  // ── Double-submit cookie validation (standard browsers) ──────────────────
  if (cookieToken) {
    if (cookieToken !== headerToken) {
      return res.status(403).json({
        success: false,
        message: 'CSRF token mismatch',
      });
    }
    return next();
  }

  // ── Cookie-less validation (Safari / ITP / cross-site cookie blocking) ───
  // Safari ITP often blocks SameSite=None cookies from cross-origin backends.
  // When the cookie is absent we fall back to checking the header token
  // against our server-side registry of tokens issued via /csrf-token.
  // This is safe because: (a) the token was issued by us, (b) it is still
  // within its TTL, and (c) CSRF attacks cannot read the token from a
  // different origin — so a valid header token proves same-origin intent.
  const isKnownToken = _validTokens.has(headerToken) &&
    Date.now() < _validTokens.get(headerToken);

  if (!isKnownToken) {
    return res.status(403).json({
      success: false,
      message: 'CSRF session expired — please refresh the page',
    });
  }

  next();
};

module.exports = { setCsrfToken, validateCsrfToken, CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
