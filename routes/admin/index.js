const express = require('express');
const cookieParser = require('cookie-parser');
const router = express.Router();

const passport = require('../../config/passport');
const { sessionMiddleware } = require('../../config/session');
const flash = require('../../middleware/flash');
const { attachCsrfToken, csrfProtection, exposeCsrfToken } = require('../../middleware/csrf');
const { requireAuth, requireGuest } = require('../../middleware/auth');
const { loginLimiter } = require('../../middleware/rateLimiters');

const authController = require('../../controllers/admin/auth.controller');
const dashboardController = require('../../controllers/admin/dashboard.controller');
const productsRoutes = require('./products.routes');
const categoriesRoutes = require('./categories.routes');
const brandsRoutes = require('./brands.routes');
const inventoryRoutes = require('./inventory.routes');
const quotesRoutes = require('./quotes.routes');
const enquiriesRoutes = require('./enquiries.routes');
const messagesRoutes = require('./messages.routes');
const profileRoutes = require('./profile.routes');
const auditLogsRoutes = require('./auditLogs.routes');

// Everything under /admin gets its own request pipeline: a PG-backed
// session, Passport, CSRF protection, and flash messages. This is
// deliberately scoped here rather than mounted globally in app.js — the
// public storefront has no forms yet and stays fully session-free, which
// keeps it cheap on Vercel and avoids writing a session row for every
// anonymous visitor.
router.use(cookieParser());
router.use(sessionMiddleware);
router.use(passport.initialize());
router.use(passport.session());
router.use(flash);
router.use(attachCsrfToken);
router.use(exposeCsrfToken);

router.use((req, res, next) => {
  res.locals.layoutName = 'layouts/admin';
  res.locals.currentUser = req.user || null;
  next();
});

router.get('/login', requireGuest, authController.loginForm);
router.post('/login', requireGuest, loginLimiter, csrfProtection, authController.login);
router.post('/logout', requireAuth, csrfProtection, authController.logout);

// Everything below requires an authenticated session.
router.use(requireAuth);

router.get('/', dashboardController.renderDashboard);
router.use('/products', productsRoutes);
router.use('/categories', categoriesRoutes);
router.use('/brands', brandsRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/quotes', quotesRoutes);
router.use('/enquiries', enquiriesRoutes);
router.use('/messages', messagesRoutes);
router.use('/profile', profileRoutes);
router.use('/audit-logs', auditLogsRoutes);

module.exports = router;
