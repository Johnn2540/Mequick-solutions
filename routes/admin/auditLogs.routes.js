const express = require('express');
const router = express.Router();

const { requireRole } = require('../../middleware/auth');
const controller = require('../../controllers/admin/auditLogs.controller');

// Activity log review is restricted to Super Admins.
router.get('/', requireRole('SUPER_ADMIN'), controller.list);
router.get('/export', requireRole('SUPER_ADMIN'), controller.exportCsv);

module.exports = router;
