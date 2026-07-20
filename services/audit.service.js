const prisma = require('../config/db');
const { getPageParams, buildPagination } = require('../utils/pagination');

// Derives `module` from the action name's existing prefix convention
// (utils/auditActions.js already groups actions this way — PRODUCT_*,
// USER_*, etc.) rather than requiring every one of the dozen call sites
// across the app to pass it explicitly. A future action just needs to
// follow the same naming convention to be categorized correctly for free.
const MODULE_BY_ACTION_PATTERN = [
  [/^LOGIN_|^LOGOUT$/, 'AUTH'],
  [/^PRODUCT_/, 'PRODUCTS'],
  [/^CATEGORY_/, 'CATEGORIES'],
  [/^BRAND_/, 'BRANDS'],
  [/^INVENTORY_/, 'INVENTORY'],
  [/^QUOTE_/, 'QUOTES'],
  [/^ENQUIRY_/, 'ENQUIRIES'],
  [/^PARTNER_/, 'PARTNERS'],
  [/^TESTIMONIAL_/, 'TESTIMONIALS'],
  [/^USER_/, 'USERS'],
  [/^PROFILE_|^PASSWORD_CHANGE$/, 'PROFILE'],
];

function deriveModule(action) {
  const match = MODULE_BY_ACTION_PATTERN.find(([pattern]) => pattern.test(action));
  return match ? match[1] : null;
}

// Exported so the Activity Logs filter dropdown's option list can never
// drift out of sync with what deriveModule() actually produces.
const MODULES = [...new Set(MODULE_BY_ACTION_PATTERN.map(([, moduleName]) => moduleName))];
const STATUSES = ['SUCCESS', 'FAILED'];

// Same idea for `status`: anything named *_FAILURE is a failed action by
// convention (see LOGIN_FAILURE) — everything else that gets logged at all
// completed successfully. An explicit `status` argument still overrides
// this for the rare case that doesn't fit the naming convention.
function deriveStatus(action) {
  return action.endsWith('_FAILURE') ? 'FAILED' : 'SUCCESS';
}

/**
 * Fire-and-forget audit trail write. Failures are logged but never thrown —
 * a broken audit insert must never break the actual CRUD action it's
 * describing.
 */
async function logAction({ req, userId, action, module: explicitModule, status: explicitStatus, entityType, entityId, description }) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || req?.user?.id || null,
        action,
        module: explicitModule || deriveModule(action),
        status: explicitStatus || deriveStatus(action),
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

/** Shared by listAuditLogs and getAuditLogsForExport so the two can never drift apart. */
function buildAuditLogWhere({ action, module: moduleFilter, status, userId, from, to, q } = {}) {
  return {
    AND: [
      action ? { action } : {},
      moduleFilter ? { module: moduleFilter } : {},
      status ? { status } : {},
      userId ? { userId } : {},
      from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
              ...(to ? { lte: new Date(`${to}T23:59:59.999`) } : {}),
            },
          }
        : {},
      q
        ? {
            OR: [
              { description: { contains: q, mode: 'insensitive' } },
              { user: { name: { contains: q, mode: 'insensitive' } } },
              { user: { email: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {},
    ],
  };
}

async function listAuditLogs(filters = {}) {
  const { skip, take, page: currentPage, size } = getPageParams(filters.page, 30);
  const where = buildAuditLogWhere(filters);

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

/** Same filtering as listAuditLogs, unpaginated, capped at a sane export size. */
async function getAuditLogsForExport(filters = {}, limit = 5000) {
  return prisma.auditLog.findMany({
    where: buildAuditLogWhere(filters),
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

module.exports = { logAction, listAuditLogs, getAuditLogsForExport, MODULES, STATUSES };
