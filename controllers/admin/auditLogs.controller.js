const asyncHandler = require('../../utils/asyncHandler');
const auditService = require('../../services/audit.service');
const AUDIT = require('../../utils/auditActions');

// GET /admin/audit-logs
exports.list = asyncHandler(async (req, res) => {
  const { action, page } = req.query;
  const { logs, pagination } = await auditService.listAuditLogs({ action, page });
  res.render('admin/audit-logs/index', {
    title: 'Activity Logs',
    logs,
    pagination,
    action: action || '',
    actionOptions: Object.values(AUDIT),
  });
});
