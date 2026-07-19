const rateLimit = require('express-rate-limit');

// Stricter limiter for the login endpoint — basic brute-force protection.
// NOTE: express-rate-limit's default store is in-memory and therefore
// per-instance; on Vercel that means the count isn't shared across
// concurrent invocations, so this isn't a hard guarantee. It's still a
// meaningful first line of defense, and every failed attempt against a
// real account is also durably recorded in LoginHistory for review.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many login attempts from this address. Please try again in 15 minutes.',
});

// Guards the public Contact and Request-a-Quote forms — no auth/session
// exists on the public site to rely on, so this is the only thing standing
// between these forms and a spam bot. Same in-memory-store caveat as above.
const publicFormLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many submissions from this address. Please try again later.',
});

module.exports = { loginLimiter, publicFormLimiter };
