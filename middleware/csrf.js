const { doubleCsrf } = require('csrf-csrf');

const isProduction = process.env.NODE_ENV === 'production';

// __Host- prefixed cookies are rejected by browsers unless served over
// HTTPS with Secure set, which local HTTP dev never is — only use the
// hardened prefix once Vercel is terminating real TLS in front of us.
const baseConfig = {
  getSecret: () => process.env.CSRF_SECRET,
  cookieOptions: {
    sameSite: 'strict',
    secure: isProduction,
    path: '/',
  },
  // Plain HTML forms (no fetch/XHR) can only carry the token in a hidden
  // field, not a header — this is what the `csrf` partial renders.
  getCsrfTokenFromRequest: (req) => req.body?._csrf,
};

const sharedConfig = {
  ...baseConfig,
  // Binds each token to the visitor's session, so a token stolen out of one
  // session (e.g. via a logged XSS payload) can't be replayed in another.
  getSessionIdentifier: (req) => req.sessionID,
  cookieName: isProduction ? '__Host-qs.csrf' : 'qs.csrf',
};

// Attaches req.csrfToken() to every request (so any GET-rendered form can
// embed a token) but never itself validates anything. Safe to mount
// globally, including in front of routes that haven't parsed a multipart
// body yet — see `csrfProtection` below for the piece that actually
// enforces the token.
const { doubleCsrfProtection: attachCsrfToken } = doubleCsrf({
  ...sharedConfig,
  skipCsrfProtection: () => true,
});

// The real, validating middleware. Mount this explicitly on every
// state-changing route, AFTER any Multer middleware on that route.
// Multer is what populates req.body for multipart/form-data submissions
// (any form with a file input), and getCsrfTokenFromRequest reads the
// token from req.body._csrf — validating before Multer runs would see an
// empty body and reject every single multipart submission.
const { doubleCsrfProtection: csrfProtection, invalidCsrfTokenError } = doubleCsrf(sharedConfig);

// The public storefront (Contact, Request a Quote) has no session — it
// stays fully stateless so anonymous visitors never cost a Postgres-backed
// session row. CSRF protection there relies on the double-submit cookie
// alone (a signed cookie plus a matching hidden form field, which a
// cross-site form can't forge), so the "session identifier" is just a fixed
// constant rather than `req.sessionID`. A separate cookie name keeps this
// pool of tokens from ever colliding with the admin area's session-bound
// ones.
const publicConfig = {
  ...baseConfig,
  getSessionIdentifier: () => 'public',
  cookieName: isProduction ? '__Host-qs.csrf.pub' : 'qs.csrf.pub',
};

const { doubleCsrfProtection: attachPublicCsrfToken } = doubleCsrf({
  ...publicConfig,
  skipCsrfProtection: () => true,
});

const { doubleCsrfProtection: publicCsrfProtection } = doubleCsrf(publicConfig);

// Makes the current token available to every admin template as
// {{csrfToken}}, so forms can embed it via the `csrf` partial.
//
// `saveUninitialized: false` (config/session.js) means an untouched
// session is never persisted, so a first-time visitor's session id could
// change between the GET that renders a form and the POST that submits
// it — which would make every first login attempt fail CSRF validation.
// Touching req.session here forces it to be saved, keeping the id (and
// therefore the token binding) stable across that round trip.
function exposeCsrfToken(req, res, next) {
  req.session.csrfIssued = true;
  res.locals.csrfToken = req.csrfToken();
  next();
}

// Same idea for the public site, minus the `req.session` touch above — the
// public router never mounts express-session, and the fixed session
// identifier in `publicConfig` means there's no per-visitor id to keep
// stable across the round trip anyway.
function exposePublicCsrfToken(req, res, next) {
  res.locals.csrfToken = req.csrfToken();
  next();
}

module.exports = {
  attachCsrfToken,
  csrfProtection,
  exposeCsrfToken,
  invalidCsrfTokenError,
  attachPublicCsrfToken,
  publicCsrfProtection,
  exposePublicCsrfToken,
};
