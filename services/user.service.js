const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const uploadService = require('./upload.service');
const { getPageParams, buildPagination } = require('../utils/pagination');

const SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  avatarUrl: true,
  avatarPublicId: true,
  lastLogin: true,
  createdAt: true,
};

async function getUserById(id) {
  return prisma.user.findUnique({ where: { id }, select: SAFE_SELECT });
}

async function updateProfile(id, { name, email }) {
  return prisma.user.update({
    where: { id },
    data: { name, email: email.toLowerCase().trim() },
    select: SAFE_SELECT,
  });
}

async function updateAvatar(id, file) {
  const user = await prisma.user.findUnique({ where: { id } });
  const uploaded = await uploadService.uploadBuffer(file.buffer, { folder: 'mequick-solutions/avatars' });

  if (user.avatarPublicId) {
    await uploadService.destroy(user.avatarPublicId);
  }

  return prisma.user.update({
    where: { id },
    data: { avatarUrl: uploaded.url, avatarPublicId: uploaded.publicId },
    select: SAFE_SELECT,
  });
}

async function changePassword(id, currentPassword, newPassword) {
  const user = await prisma.user.findUnique({ where: { id } });
  const matches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!matches) {
    const err = new Error('Current password is incorrect.');
    err.code = 'INVALID_CURRENT_PASSWORD';
    throw err;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id }, data: { passwordHash } });
}

async function getLoginHistory(userId, limit = 20) {
  return prisma.loginHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

// ── Super Admin user management ─────────────────────────────────────────
// Everything below is admin-managing-other-users, distinct from the
// self-service functions above (updateProfile/changePassword act on the
// logged-in user only, via req.user.id — these take an explicit target id).

/** Lightweight, unpaginated list for the Activity Logs "Admin" filter dropdown. */
async function listAllForSelect() {
  return prisma.user.findMany({ select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } });
}

async function listUsers({ q, role, page } = {}) {
  const { skip, take, page: currentPage, size } = getPageParams(page, 20);

  const where = {
    AND: [
      q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {},
      role ? { role } : {},
    ],
  };

  const [users, totalCount] = await Promise.all([
    prisma.user.findMany({ where, select: SAFE_SELECT, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.user.count({ where }),
  ]);

  return { users, pagination: buildPagination(currentPage, size, totalCount) };
}

async function createUser({ name, email, password, role }) {
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.create({
    data: { name, email: email.toLowerCase().trim(), passwordHash, role },
    select: SAFE_SELECT,
  });
}

/**
 * Independent, explicit safety net for "there must always be at least one
 * active Super Admin" — deliberately NOT derived from the self-protection
 * guards in controllers/admin/users.controller.js. Those only stop a Super
 * Admin from touching their *own* account; this stops the last active
 * Super Admin from being demoted/deactivated/deleted by anyone at all, so
 * the invariant holds even if that other guard is ever changed or a new
 * mutation path (bulk actions, a future API) is added later without it.
 */
async function assertNotLastActiveSuperAdmin(excludeUserId) {
  const otherActiveSuperAdmins = await prisma.user.count({
    where: { role: 'SUPER_ADMIN', isActive: true, id: { not: excludeUserId } },
  });
  if (otherActiveSuperAdmins === 0) {
    const err = new Error('This is the last active Super Admin account — the system must always have at least one.');
    err.code = 'LAST_SUPER_ADMIN';
    throw err;
  }
}

/**
 * Admin editing another user's core account fields — name, email, role,
 * active state. Returns { before, after } so the caller (the audit log)
 * can tell exactly what changed — a plain name edit, a role change, or an
 * activate/deactivate — instead of one generic "updated" entry for all of
 * them.
 */
async function updateUser(id, { name, email, role, isActive }) {
  const before = await prisma.user.findUnique({ where: { id }, select: SAFE_SELECT });
  if (!before) return null;

  const nextIsActive = isActive === true || isActive === 'on' || isActive === 'true';
  const losingSuperAdminStatus = before.role === 'SUPER_ADMIN' && before.isActive && (role !== 'SUPER_ADMIN' || !nextIsActive);
  if (losingSuperAdminStatus) {
    await assertNotLastActiveSuperAdmin(id);
  }

  const after = await prisma.user.update({
    where: { id },
    data: { name, email: email.toLowerCase().trim(), role, isActive: nextIsActive },
    select: SAFE_SELECT,
  });

  return { before, after };
}

/**
 * Generates a strong random password, sets it for the given user, and
 * returns the plaintext ONCE so the caller can display it to the admin —
 * it is never stored or logged anywhere. Random generation (rather than an
 * admin-typed value) means no weak/guessable reset password and no need
 * for the admin to invent one.
 */
async function adminResetPassword(id) {
  const newPassword = crypto.randomBytes(9).toString('base64url'); // 12 chars, URL-safe
  const passwordHash = await bcrypt.hash(newPassword, 12);
  const user = await prisma.user.update({ where: { id }, data: { passwordHash }, select: SAFE_SELECT });
  return { user, newPassword };
}

async function deleteUser(id) {
  const target = await prisma.user.findUnique({ where: { id }, select: SAFE_SELECT });
  if (!target) return null;
  if (target.role === 'SUPER_ADMIN' && target.isActive) {
    await assertNotLastActiveSuperAdmin(id);
  }
  return prisma.user.delete({ where: { id }, select: SAFE_SELECT });
}

/**
 * Everything the Super Admin's "view any admin's activity" screen needs:
 * profile fields, login/logout/last-active timestamps, totals, and a
 * paginated activity timeline — one call instead of the page assembling it
 * from four separate service modules.
 */
async function getAdminActivityProfile(userId, { page } = {}) {
  const user = await getUserById(userId);
  if (!user) return null;

  const [lastLogoutEntry, lastActivityEntry, totalLoginCount, totalActions, timeline] = await Promise.all([
    prisma.auditLog.findFirst({ where: { userId, action: 'LOGOUT' }, orderBy: { createdAt: 'desc' } }),
    prisma.auditLog.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.loginHistory.count({ where: { userId, success: true } }),
    prisma.auditLog.count({ where: { userId } }),
    (() => {
      const { skip, take, page: currentPage, size } = getPageParams(page, 20);
      return Promise.all([
        prisma.auditLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip, take }),
        prisma.auditLog.count({ where: { userId } }),
      ]).then(([logs, totalCount]) => ({ logs, pagination: buildPagination(currentPage, size, totalCount) }));
    })(),
  ]);

  return {
    user,
    lastLogout: lastLogoutEntry?.createdAt || null,
    // "Last active" = most recent audit entry of any kind, falling back to
    // lastLogin for an account that's logged in but hasn't triggered any
    // other logged action yet.
    lastActive: lastActivityEntry?.createdAt || user.lastLogin,
    totalLoginCount,
    totalActions,
    // Named to match every other paginated service in this app (logs +
    // pagination) so the `pagination` partial — which reads a bare
    // `pagination` local, not a hash-passed one — works without the
    // controller having to rename anything when spreading this object.
    logs: timeline.logs,
    pagination: timeline.pagination,
  };
}

module.exports = {
  getUserById,
  updateProfile,
  updateAvatar,
  changePassword,
  getLoginHistory,
  listUsers,
  listAllForSelect,
  createUser,
  updateUser,
  adminResetPassword,
  deleteUser,
  getAdminActivityProfile,
};
