const express = require('express');
const router = express.Router();

const upload = require('../../middleware/upload');
const validate = require('../../middleware/validate');
const { requireRole } = require('../../middleware/auth');
const { csrfProtection } = require('../../middleware/csrf');
const testimonialValidator = require('../../validators/testimonial.validator');
const controller = require('../../controllers/admin/testimonials.controller');

router.get('/', controller.list);
router.get('/new', controller.newForm);
// csrfProtection runs AFTER Multer — see routes/admin/products.routes.js.
router.post('/', upload.single('photo'), csrfProtection, testimonialValidator, validate, controller.create);
router.get('/:id/edit', controller.editForm);
router.post('/:id', upload.single('photo'), csrfProtection, testimonialValidator, validate, controller.update);
router.post('/:id/delete', csrfProtection, requireRole('SUPER_ADMIN', 'ADMIN'), controller.remove);

module.exports = router;
