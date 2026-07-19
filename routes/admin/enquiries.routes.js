const express = require('express');
const router = express.Router();
const { csrfProtection } = require('../../middleware/csrf');
const controller = require('../../controllers/admin/enquiries.controller');

router.get('/', controller.list);
router.get('/:id', controller.show);
router.post('/:id/status', csrfProtection, controller.updateStatus);

module.exports = router;
