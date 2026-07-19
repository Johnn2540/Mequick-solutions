const express = require('express');
const router = express.Router();
const pagesController = require('../controllers/pages.controller');
const { publicFormLimiter } = require('../middleware/rateLimiters');
const contactValidator = require('../validators/contact.validator');
const quoteValidator = require('../validators/quote.validator');
const { attachPublicCsrfToken, publicCsrfProtection, exposePublicCsrfToken } = require('../middleware/csrf');

// Every page on this router can render a CSRF-protected form (Contact,
// Request a Quote), so the token is attached/exposed globally here rather
// than per-route.
router.use(attachPublicCsrfToken);
router.use(exposePublicCsrfToken);

router.get('/', pagesController.renderHome);
router.get('/about', pagesController.renderAbout);
router.get('/services', pagesController.renderServices);

router.get('/contact', pagesController.renderContact);
router.post('/contact', publicFormLimiter, publicCsrfProtection, contactValidator, pagesController.submitContact);

router.get('/request-quote', pagesController.renderRequestQuote);
router.post(
  '/request-quote',
  publicFormLimiter,
  publicCsrfProtection,
  quoteValidator,
  pagesController.submitRequestQuote
);

module.exports = router;
