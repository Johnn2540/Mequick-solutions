const prisma = require('../config/db');
const { getPageParams, buildPagination } = require('../utils/pagination');

/**
 * Fire-and-forget audit trail write. Failures are logged but never thrown —
 * a broken audit insert must never break the actual CRUD action it's
 * describing.
 */
async function logAction({ req, userId, action, entityType, entityId, description }) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || req?.user?.id || null,
        action,
        entityType: entityType || null,
        entityId: entityId || null,
        description,
        ipAddress: req?.ip || null,
        userAgent: (req?.get && req.get('user-agent')) || null,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

async function listAuditLogs({ action, page } = {}) {
  const { skip, take, page: currentPage, size } = getPageParams(page, 30);
  const where = action ? { action } : {};

  const [logs, totalCount] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, pagination: buildPagination(currentPage, size, totalCount) };
}

module.exports = { logAction, listAuditLogs };
