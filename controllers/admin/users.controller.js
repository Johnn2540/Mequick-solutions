const asyncHandler = require('../../utils/asyncHandler');
const userService = require('../../services/user.service');
const { logAction } = require('../../services/audit.service');
const AUDIT = require('../../utils/auditActions');
const { VALID_ROLES } = require('../../validators/user.validator');

// GET /admin/users
exports.list = asyncHandler(async (req, res) => {
  const { q, role, page } = req.query;
  const { users, pagination } = await userService.listUsers({ q, role, page });
  res.render('admin/users/index', {
    title: 'Manage Users',
    users,
    pagination,
    q: q || '',
    role: role || '',
    roles: VALID_ROLES,
  });
});

// GET /admin/users/new
exports.newForm = asyncHandler(async (req, res) => {
  res.render('admin/users/form', { title: 'New User', formAction: '/admin/users', targetUser: null, roles: VALID_ROLES });
});

// POST /admin/users
exports.create = asyncHandler(async (req, res) => {
  try {
    const user = await userService.createUser(req.body);
    await logAction({
      req,
      action: AUDIT.USER_CREATE,
      entityType: 'User',
      entityId: user.id,
      description: `Created ${user.role} account for "${user.name}" (${user.email}).`,
    });
    if (res.flash) res.flash('success', `User "${user.name}" created successfully.`);
    return res.redirect('/admin/users');
  } catch (err) {
    if (err.code === 'P2002') {
      if (res.flash) res.flash('error', 'That email address is already in use.');
      return res.redirect('/admin/users/new');
    }
    throw err;
  }
});

// GET /admin/users/:id/activity
exports.activity = asyncHandler(async (req, res) => {
  const profile = await userService.getAdminActivityProfile(req.params.id, { page: req.query.page });
  if (!profile) {
    return res.status(404).render('errors/404', { title: 'User Not Found' });
  }
  res.render('admin/users/activity', { title: `Activity — ${profile.user.name}`, ...profile });
});

// GET /admin/users/:id/edit
exports.editForm = asyncHandler(async (req, res) => {
  const targetUser = await userService.getUserById(req.params.id);
  if (!targetUser) {
    return res.status(404).render('errors/404', { title: 'User Not Found' });
  }
  res.render('admin/users/form', {
    title: 'Edit User',
    formAction: `/admin/users/${targetUser.id}`,
    targetUser,
    roles: VALID_ROLES,
    isSelf: targetUser.id === req.user.id,
  });
});

// POST /admin/users/:id
exports.update = asyncHandler(async (req, res) => {
  // Safety guard: never let a Super Admin demote or deactivate their own
  // account through this screen — this is the only place that grants
  // access to it, so either change is a self-lockout. (Self name/email/
  // password changes belong on /admin/profile, not here.)
  const isSelf = req.params.id === req.user.id;
  const isActive = req.body.isActive === true || req.body.isActive === 'on' || req.body.isActive === 'true';
  if (isSelf && (req.body.role !== req.user.role || !isActive)) {
    if (res.flash) res.flash('error', 'You cannot change your own role or deactivate your own account.');
    return res.redirect(`/admin/users/${req.params.id}/edit`);
  }

  try {
    const result = await userService.updateUser(req.params.id, req.body);
    if (!result) {
      return res.status(404).render('errors/404', { title: 'User Not Found' });
    }
    const { before, after } = result;

    // Log the specific thing that actually changed — a role change and an
    // activate/deactivate are each their own audit action (per the "every
    // role change must be recorded" / "every promotion or demotion" rules),
    // not folded into one generic "updated" entry. A single request can
    // legitimately trigger more than one of these at once (e.g. promoting
    // someone AND reactivating them in the same save).
    if (before.role !== after.role) {
      await logAction({
        req,
        action: AUDIT.USER_ROLE_CHANGE,
        entityType: 'User',
        entityId: after.id,
        description: `Changed "${after.name}"'s role from ${before.role} to ${after.role}.`,
      });
    }
    if (before.isActive !== after.isActive) {
      await logAction({
        req,
        action: after.isActive ? AUDIT.USER_ACTIVATE : AUDIT.USER_DEACTIVATE,
        entityType: 'User',
        entityId: after.id,
        description: `${after.isActive ? 'Activated' : 'Deactivated'} the account for "${after.name}".`,
      });
    }
    if (before.name !== after.name || before.email !== after.email) {
      await logAction({
        req,
        action: AUDIT.USER_UPDATE,
        entityType: 'User',
        entityId: after.id,
        description: `Updated name/email for "${after.name}" (${after.email}).`,
      });
    }

    if (res.flash) res.flash('success', 'User updated successfully.');
  } catch (err) {
    if (err.code === 'P2002') {
      if (res.flash) res.flash('error', 'That email address is already in use.');
      return res.redirect(`/admin/users/${req.params.id}/edit`);
    }
    if (err.code === 'LAST_SUPER_ADMIN') {
      if (res.flash) res.flash('error', err.message);
      return res.redirect(`/admin/users/${req.params.id}/edit`);
    }
    throw err;
  }
  res.redirect('/admin/users');
});

// POST /admin/users/:id/reset-password
exports.resetPassword = asyncHandler(async (req, res) => {
  const { user, newPassword } = await userService.adminResetPassword(req.params.id);
  await logAction({
    req,
    action: AUDIT.USER_PASSWORD_RESET,
    entityType: 'User',
    entityId: user.id,
    description: `Reset the password for "${user.name}".`,
  });
  if (res.flash) {
    res.flash(
      'success',
      `Password reset for "${user.name}". New temporary password (copy it now — it will not be shown again): ${newPassword}`
    );
  }
  res.redirect(`/admin/users/${user.id}/edit`);
});

// POST /admin/users/:id/delete
exports.remove = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) {
    if (res.flash) res.flash('error', 'You cannot delete your own account.');
    return res.redirect('/admin/users');
  }
  try {
    const user = await userService.deleteUser(req.params.id);
    if (!user) {
      if (res.flash) res.flash('error', 'User not found.');
      return res.redirect('/admin/users');
    }
    await logAction({
      req,
      action: AUDIT.USER_DELETE,
      entityType: 'User',
      entityId: user.id,
      description: `Deleted the account for "${user.name}" (${user.email}).`,
    });
    if (res.flash) res.flash('success', 'User deleted.');
  } catch (err) {
    if (err.code === 'LAST_SUPER_ADMIN') {
      if (res.flash) res.flash('error', err.message);
      return res.redirect('/admin/users');
    }
    throw err;
  }
  res.redirect('/admin/users');
});
