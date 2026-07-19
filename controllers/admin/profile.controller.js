const asyncHandler = require('../../utils/asyncHandler');
const userService = require('../../services/user.service');
const { logAction } = require('../../services/audit.service');
const AUDIT = require('../../utils/auditActions');

// GET /admin/profile
exports.show = asyncHandler(async (req, res) => {
  const [profileUser, loginHistory] = await Promise.all([
    userService.getUserById(req.user.id),
    userService.getLoginHistory(req.user.id),
  ]);
  res.render('admin/profile', { title: 'My Profile', profileUser, loginHistory });
});

// POST /admin/profile
exports.update = asyncHandler(async (req, res) => {
  try {
    await userService.updateProfile(req.user.id, req.body);
    await logAction({
      req,
      action: AUDIT.PROFILE_UPDATE,
      entityType: 'User',
      entityId: req.user.id,
      description: `${req.user.name} updated their profile.`,
    });
    if (res.flash) res.flash('success', 'Profile updated successfully.');
  } catch (err) {
    if (err.code === 'P2002') {
      if (res.flash) res.flash('error', 'That email address is already in use.');
    } else {
      throw err;
    }
  }
  res.redirect('/admin/profile');
});

// POST /admin/profile/photo
exports.updatePhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    if (res.flash) res.flash('error', 'Please choose an image to upload.');
    return res.redirect('/admin/profile');
  }
  await userService.updateAvatar(req.user.id, req.file);
  await logAction({
    req,
    action: AUDIT.PROFILE_UPDATE,
    entityType: 'User',
    entityId: req.user.id,
    description: `${req.user.name} updated their profile photo.`,
  });
  if (res.flash) res.flash('success', 'Profile photo updated.');
  res.redirect('/admin/profile');
});

// POST /admin/profile/password
exports.changePassword = asyncHandler(async (req, res) => {
  try {
    await userService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
    await logAction({
      req,
      action: AUDIT.PASSWORD_CHANGE,
      entityType: 'User',
      entityId: req.user.id,
      description: `${req.user.name} changed their password.`,
    });
    if (res.flash) res.flash('success', 'Password changed successfully.');
  } catch (err) {
    if (err.code === 'INVALID_CURRENT_PASSWORD') {
      if (res.flash) res.flash('error', err.message);
    } else {
      throw err;
    }
  }
  res.redirect('/admin/profile');
});
