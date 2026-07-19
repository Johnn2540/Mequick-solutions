require('dotenv').config();
require('./config/validateEnv')();

const express = require('express');
const path = require('path');
const hbs = require('hbs');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const registerHelpers = require('./utils/hbsHelpers');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const pagesRoutes = require('./routes/pages.routes');
const productsRoutes = require('./routes/products.routes');
const categoriesRoutes = require('./routes/categories.routes');
const adminRoutes = require('./routes/admin');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// Vercel terminates TLS and sits in front of the function as a proxy, so
// Express needs to trust its forwarded headers — otherwise `req.secure`,
// rate-limiting-by-IP, and `cookie.secure` all misbehave.
app.set('trust proxy', 1);

// ── Security & logging middleware ──────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // Bootstrap/Icons are loaded from CDN until vendored locally.
        scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", 'https://cdn.jsdelivr.net', "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com', 'https://placehold.co'],
        fontSrc: ["'self'", 'https://cdn.jsdelivr.net'],
        // Contact page embeds a Google Maps iframe.
        frameSrc: ["'self'", 'https://www.google.com'],
      },
    },
  })
);
app.use(compression());
app.use(morgan(isProduction ? 'combined' : 'dev'));

// Baseline abuse protection for the whole app. NOTE: express-rate-limit's
// default store is in-memory and therefore per-instance — on Vercel that
// means the limit isn't globally consistent across concurrent invocations.
// Good enough as a general guard; the login route layers a much stricter,
// dedicated limiter on top (see middleware/rateLimiters.js).
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ── Body parsing ─────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Sessions and Passport are intentionally NOT mounted here — the public
// storefront stays fully stateless, which is cheaper on Vercel and avoids a
// session row for every anonymous visitor. They're scoped to /admin only;
// see routes/admin/index.js. The public Contact/Request-a-Quote forms still
// get real CSRF protection, just via a session-independent double-submit
// cookie (see middleware/csrf.js's `attachPublicCsrfToken`/
// `publicCsrfProtection`, wired up in routes/pages.routes.js) rather than
// the session-bound tokens the admin area uses.

// ── View engine (HBS) ───────────────────────────────────────────────
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
hbs.registerPartials(path.join(__dirname, 'views', 'partials'));
registerHelpers(hbs);

// Lightweight layout system: render the requested view to a string first,
// then render a layout file with that string as `body`. `originalRender`
// is captured once so the layout's own render call doesn't recurse back
// through this override.
//
// IMPORTANT: the `hbs` package has its OWN built-in layout auto-wrapping
// that also reads `options.layout` — using that same key for our custom
// "which layout to use" selector caused hbs to auto-wrap the view a
// second (and, combined with our own explicit wrap, a third) time,
// silently nesting the full page inside itself. Fixed by (1) naming our
// selector `layoutName` instead, and (2) explicitly passing `layout: false`
// on every render call to hard-disable hbs's own mechanism.
// Pass `layoutName: 'layouts/admin'` in a controller's render options to
// opt into the admin chrome instead of the public site layout.
app.use((req, res, next) => {
  const originalRender = res.render.bind(res);
  res.render = (view, options = {}, callback) => {
    const mergedOptions = { ...res.locals, ...options };
    const layoutName = mergedOptions.layoutName || 'layouts/main';
    app.render(view, { ...mergedOptions, layout: false }, (err, html) => {
      if (err) return next(err);
      originalRender(layoutName, { ...mergedOptions, layout: false, body: html }, callback);
    });
  };
  next();
});

// ── Static assets ───────────────────────────────────────────────────
// On Vercel, requests under /css, /js, /images are served directly from
// the `public/` directory by the platform's static CDN and never reach
// this function. This middleware is what serves them during local dev
// (and acts as a harmless fallback in production).
app.use(
  express.static(path.join(__dirname, 'public'), {
    maxAge: isProduction ? '7d' : 0,
  })
);

// ── Global template locals ──────────────────────────────────────────
app.use((req, res, next) => {
  res.locals.company = {
    name: process.env.COMPANY_NAME,
    phone: process.env.COMPANY_PHONE,
    whatsapp: process.env.COMPANY_WHATSAPP,
    email: process.env.COMPANY_EMAIL,
    address: process.env.COMPANY_ADDRESS,
    // Public social profile URLs — unlike the fields above these aren't
    // secrets or per-environment config, so they're plain constants here
    // rather than env vars the deploy could forget to set (and silently
    // ship a dead link). Update both if the business's handles change.
    social: {
      facebook: 'https://www.facebook.com/share/1EVccHRJRN/',
      instagram: 'https://www.instagram.com/mequick_solutions?igsh=MXRpcTZmbjJiZHh1dQ==',
    },
  };
  res.locals.currentPath = req.path;
  // Overwritten with the real value for /admin requests once Passport
  // deserializes the session user — see routes/admin/index.js.
  res.locals.currentUser = null;
  next();
});

// ── Routes ───────────────────────────────────────────────────────────
app.use('/admin', adminRoutes);
app.use('/products', productsRoutes);
app.use('/categories', categoriesRoutes);
app.use('/', pagesRoutes);

// ── 404 + error handling (must be registered last) ──────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
