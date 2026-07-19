const prisma = require('../config/db');
const { getPageParams, buildPagination } = require('../utils/pagination');

async function listMessages({ page } = {}) {
  const { skip, take, page: currentPage, size } = getPageParams(page, 20);

  const [messages, totalCount] = await Promise.all([
    prisma.message.findMany({ orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.message.count(),
  ]);

  return { messages, pagination: buildPagination(currentPage, size, totalCount) };
}

async function getMessageById(id) {
  return prisma.message.findUnique({ where: { id } });
}

async function markRead(id, isRead) {
  return prisma.message.update({ where: { id }, data: { isRead } });
}

// Public "Contact Us" form submission.
async function createMessage({ name, email, phone, subject, message }) {
  return prisma.message.create({ data: { name, email, phone: phone || null, subject: subject || null, message } });
}

module.exports = { listMessages, getMessageById, markRead, createMessage };
