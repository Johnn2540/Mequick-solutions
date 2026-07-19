const express = require('express');
const router = express.Router();

const upload = require('../../middleware/upload');
const validate = require('../../middleware/validate');
const { requireRole } = require('../../middleware/auth');
const { csrfProtection } = require('../../middleware/csrf');
const categoryValidator = require('../../validators/category.validator');
const controller = require('../../controllers/admin/categories.controller');

router.get('/', controller.list);
router.get('/new', controller.newForm);
// csrfProtection runs AFTER Multer — see routes/admin/products.routes.js.
router.post('/', upload.array('images', 10), csrfProtection, categoryValidator, validate, controller.create);
router.get('/:id/edit', controller.editForm);
router.post('/:id', upload.array('images', 10), csrfProtection, categoryValidator, validate, controller.update);
router.post('/:id/delete', csrfProtection, requireRole('SUPER_ADMIN', 'ADMIN'), controller.remove);
router.post('/:id/images/:imageId/primary', csrfProtection, controller.setPrimaryImage);

module.exports = router;
