const express = require('express');
const router = express.Router();
const { csrfProtection } = require('../../middleware/csrf');
const controller = require('../../controllers/admin/messages.controller');

router.get('/', controller.list);
router.get('/:id', controller.show);
router.post('/:id/toggle-read', csrfProtection, controller.toggleRead);

module.exports = router;
