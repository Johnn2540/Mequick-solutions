const express = require('express');
const router = express.Router();

const upload = require('../../middleware/upload');
const validate = require('../../middleware/validate');
const { requireRole } = require('../../middleware/auth');
const { csrfProtection } = require('../../middleware/csrf');
const productValidator = require('../../validators/product.validator');
const controller = require('../../controllers/admin/products.controller');

router.get('/', controller.list);
router.get('/new', controller.newForm);
// csrfProtection runs AFTER Multer on every route below — Multer is what
// populates req.body for these multipart/form-data submissions, and CSRF
// validation reads its token from req.body._csrf (see middleware/csrf.js).
router.post('/', upload.array('images', 8), csrfProtection, productValidator, validate, controller.create);
router.get('/:id/edit', controller.editForm);
router.post('/:id', upload.array('images', 8), csrfProtection, productValidator, validate, controller.update);
router.post('/:id/delete', csrfProtection, requireRole('SUPER_ADMIN', 'ADMIN'), controller.remove);
router.post('/:id/images/:imageId/primary', csrfProtection, controller.setPrimaryImage);

module.exports = router;
