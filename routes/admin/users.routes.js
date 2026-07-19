const express = require('express');
const router = express.Router();

const validate = require('../../middleware/validate');
const { requireRole } = require('../../middleware/auth');
const { csrfProtection } = require('../../middleware/csrf');
const { createUserValidator, updateUserValidator } = require('../../validators/user.validator');
const controller = require('../../controllers/admin/users.controller');

// User management is Super Admin only, full stop — gated once here rather
// than per-route, so there's no risk of a future route being added without
// the check. Creating/editing/deactivating/deleting admin accounts (and
// resetting their passwords) is squarely "manage roles and permissions"
// territory, which the Admin role is explicitly never granted.
router.use(requireRole('SUPER_ADMIN'));

router.get('/', controller.list);
router.get('/new', controller.newForm);
router.post('/', csrfProtection, createUserValidator, validate, controller.create);
router.get('/:id/activity', controller.activity);
router.get('/:id/edit', controller.editForm);
router.post('/:id', csrfProtection, updateUserValidator, validate, controller.update);
router.post('/:id/reset-password', csrfProtection, controller.resetPassword);
router.post('/:id/delete', csrfProtection, controller.remove);

module.exports = router;
