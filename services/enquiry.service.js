const prisma = require('../config/db');
const { getPageParams, buildPagination } = require('../utils/pagination');

async function listEnquiries({ status, page } = {}) {
  const { skip, take, page: currentPage, size } = getPageParams(page, 20);
  const where = status ? { status } : {};

  const [enquiries, totalCount] = await Promise.all([
    prisma.enquiry.findMany({
      where,
      include: { product: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.enquiry.count({ where }),
  ]);

  return { enquiries, pagination: buildPagination(currentPage, size, totalCount) };
}

async function getEnquiryById(id) {
  return prisma.enquiry.findUnique({ where: { id }, include: { product: true } });
}

async function updateEnquiryStatus(id, status) {
  return prisma.enquiry.update({ where: { id }, data: { status } });
}

module.exports = { listEnquiries, getEnquiryById, updateEnquiryStatus };
