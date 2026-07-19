const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const uploadService = require('./upload.service');

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

module.exports = { getUserById, updateProfile, updateAvatar, changePassword, getLoginHistory };
