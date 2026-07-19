const express = require('express');
const router = express.Router();

const upload = require('../../middleware/upload');
const validate = require('../../middleware/validate');
const { csrfProtection } = require('../../middleware/csrf');
const { changePasswordValidator, profileValidator } = require('../../validators/auth.validator');
const controller = require('../../controllers/admin/profile.controller');

router.get('/', controller.show);
router.post('/', csrfProtection, profileValidator, validate, controller.update);
// csrfProtection runs AFTER Multer — see routes/admin/products.routes.js.
router.post('/photo', upload.single('photo'), csrfProtection, controller.updatePhoto);
router.post('/password', csrfProtection, changePasswordValidator, validate, controller.changePassword);

module.exports = router;
