const prisma = require('../config/db');
const { getPageParams, buildPagination } = require('../utils/pagination');

async function listQuotes({ status, page } = {}) {
  const { skip, take, page: currentPage, size } = getPageParams(page, 20);
  const where = status ? { status } : {};

  const [quotes, totalCount] = await Promise.all([
    prisma.quoteRequest.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.quoteRequest.count({ where }),
  ]);

  return { quotes, pagination: buildPagination(currentPage, size, totalCount) };
}

async function getQuoteById(id) {
  return prisma.quoteRequest.findUnique({
    where: { id },
    include: { items: { include: { product: true } } },
  });
}

async function updateQuoteStatus(id, status) {
  return prisma.quoteRequest.update({ where: { id }, data: { status } });
}

// Public "Request a Quote" form submission. `items` is
// [{ productId?, customName?, quantity }] — a catalog product's name is
// snapshotted from the DB (authoritative, not trusted from the client);
// a custom/"not listed" item uses the client-supplied name as-is.
async function createQuoteRequest({ customerName, hospital, company, phone, email, notes, items }) {
  const productIds = items.filter((item) => item.productId).map((item) => item.productId);
  const products = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })
    : [];
  const productNameById = new Map(products.map((p) => [p.id, p.name]));

  const itemsData = items.map((item) => ({
    productId: item.productId && productNameById.has(item.productId) ? item.productId : null,
    productName: item.productId && productNameById.has(item.productId) ? productNameById.get(item.productId) : item.customName,
    quantity: item.quantity,
  }));

  return prisma.quoteRequest.create({
    data: {
      customerName,
      hospital: hospital || null,
      company: company || null,
      phone,
      email: email || null,
      notes: notes || null,
      items: { create: itemsData },
    },
    include: { items: true },
  });
}

module.exports = { listQuotes, getQuoteById, updateQuoteStatus, createQuoteRequest };
