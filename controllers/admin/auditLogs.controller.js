const asyncHandler = require('../../utils/asyncHandler');
const auditService = require('../../services/audit.service');
const userService = require('../../services/user.service');
const AUDIT = require('../../utils/auditActions');
const { toCsv } = require('../../utils/csv');

function readFilters(req) {
  const { action, module: moduleFilter, status, admin, from, to, q, page } = req.query;
  return { action, module: moduleFilter, status, userId: admin, from, to, q, page };
}

// GET /admin/audit-logs
exports.list = asyncHandler(async (req, res) => {
  const filters = readFilters(req);
  const [{ logs, pagination }, admins] = await Promise.all([
    auditService.listAuditLogs(filters),
    userService.listAllForSelect(),
  ]);

  const activeParams = Object.entries({
    q: filters.q,
    admin: filters.userId,
    module: filters.module,
    action: filters.action,
    status: filters.status,
    from: filters.from,
    to: filters.to,
  }).filter(([, value]) => value);

  res.render('admin/audit-logs/index', {
    title: 'Activity Logs',
    logs,
    pagination,
    admins,
    action: filters.action || '',
    module: filters.module || '',
    status: filters.status || '',
    admin: filters.userId || '',
    from: filters.from || '',
    to: filters.to || '',
    q: filters.q || '',
    actionOptions: Object.values(AUDIT),
    moduleOptions: auditService.MODULES,
    statusOptions: auditService.STATUSES,
    hasActiveFilters: activeParams.length > 0,
    queryString: new URLSearchParams(activeParams).toString(),
  });
});

// GET /admin/audit-logs/export — CSV, same filters as the current view.
// "Print" reuses this same filtered list rendered as an HTML table (see the
// index view's Print button) rather than a second export format, so there's
// one source of truth for "what's currently being looked at" either way.
exports.exportCsv = asyncHandler(async (req, res) => {
  const filters = readFilters(req);
  const logs = await auditService.getAuditLogsForExport(filters);

  const csv = toCsv(logs, [
    { label: 'Date', value: (log) => log.createdAt.toISOString() },
    { label: 'Admin', value: (log) => log.user?.name || 'System/Unknown' },
    { label: 'Email', value: (log) => log.user?.email || '' },
    { label: 'Module', value: (log) => log.module || '' },
    { label: 'Action', value: (log) => log.action },
    { label: 'Status', value: (log) => log.status },
    { label: 'Description', value: (log) => log.description },
    { label: 'Entity Type', value: (log) => log.entityType || '' },
    { label: 'Entity ID', value: (log) => log.entityId || '' },
    { label: 'IP Address', value: (log) => log.ipAddress || '' },
  ]);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
});
