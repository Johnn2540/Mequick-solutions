const express = require('express');
const router = express.Router();

const upload = require('../../middleware/upload');
const validate = require('../../middleware/validate');
const { requireRole } = require('../../middleware/auth');
const { csrfProtection } = require('../../middleware/csrf');
const brandValidator = require('../../validators/brand.validator');
const controller = require('../../controllers/admin/brands.controller');

router.get('/', controller.list);
router.get('/new', controller.newForm);
// csrfProtection runs AFTER Multer — see routes/admin/products.routes.js.
router.post('/', upload.single('logo'), csrfProtection, brandValidator, validate, controller.create);
router.get('/:id/edit', controller.editForm);
router.post('/:id', upload.single('logo'), csrfProtection, brandValidator, validate, controller.update);
router.post('/:id/delete', csrfProtection, requireRole('SUPER_ADMIN', 'ADMIN'), controller.remove);

module.exports = router;
