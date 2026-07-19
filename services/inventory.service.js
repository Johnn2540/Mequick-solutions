const prisma = require('../config/db');
const { getPageParams, buildPagination } = require('../utils/pagination');

/**
 * Search/filter/paginate products for the admin Inventory screen.
 *
 * `lowStockOnly` needs stockQuantity <= lowStockThreshold — a comparison
 * between two columns on the same row, which Prisma's query builder can't
 * express directly (no field-to-field operators). Rather than reach for raw
 * SQL for one filter, this does a cheap first pass (id + both columns only)
 * to work out which products qualify, then re-queries normally with those
 * ids folded into the where clause so pagination/counts stay correct. Fine
 * at this catalog's scale; revisit with a raw query if the catalog grows
 * into the tens of thousands of products.
 */
async function listInventory({ q, category, lowStockOnly, page } = {}) {
  const { skip, take, page: currentPage, size } = getPageParams(page, 20);

  const baseWhere = {
    AND: [
      q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { sku: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {},
      category ? { category: { slug: category } } : {},
    ],
  };

  let where = baseWhere;
  if (lowStockOnly) {
    const candidates = await prisma.product.findMany({
      where: baseWhere,
      select: { id: true, stockQuantity: true, lowStockThreshold: true },
    });
    const lowStockIds = candidates
      .filter((p) => p.stockQuantity <= p.lowStockThreshold)
      .map((p) => p.id);
    where = { AND: [baseWhere, { id: { in: lowStockIds } }] };
  }

  const [products, totalCount] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true, images: { where: { isPrimary: true }, take: 1 } },
      orderBy: { stockQuantity: 'asc' },
      skip,
      take,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products: products.map((p) => ({ ...p, isLowStock: p.stockQuantity <= p.lowStockThreshold })),
    pagination: buildPagination(currentPage, size, totalCount),
  };
}

/** Dashboard widget support — see the same scale caveat as listInventory. */
async function getLowStockProducts(limit = 5) {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, stockQuantity: true, lowStockThreshold: true, category: { select: { name: true } } },
    orderBy: { stockQuantity: 'asc' },
  });
  return products.filter((p) => p.stockQuantity <= p.lowStockThreshold).slice(0, limit);
}

async function getLowStockCount() {
  const products = await prisma.product.findMany({ select: { stockQuantity: true, lowStockThreshold: true } });
  return products.filter((p) => p.stockQuantity <= p.lowStockThreshold).length;
}

/**
 * Applies a signed stock change and writes the matching InventoryLog row in
 * one transaction. Also auto-syncs Availability (IN_STOCK/OUT_OF_STOCK)
 * based on the resulting quantity — unless the product is currently
 * PREORDER, which is a deliberate separate state this doesn't override.
 * Throws (caller flashes the message) rather than clamping at zero, so a
 * mistaken oversized deduction surfaces immediately instead of silently
 * under-counting stock.
 */
async function adjustStock(productId, { changeType, quantityChange, note }, userId) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error('Product not found.');

    const quantityAfter = product.stockQuantity + quantityChange;
    if (quantityAfter < 0) {
      throw new Error(
        `That change would leave stock at ${quantityAfter}. Current stock for "${product.name}" is ${product.stockQuantity}.`
      );
    }

    const availabilityUpdate =
      product.availability !== 'PREORDER' ? { availability: quantityAfter === 0 ? 'OUT_OF_STOCK' : 'IN_STOCK' } : {};

    const updatedProduct = await tx.product.update({
      where: { id: productId },
      data: { stockQuantity: quantityAfter, ...availabilityUpdate },
    });

    await tx.inventoryLog.create({
      data: { productId, userId: userId || null, changeType, quantityChange, quantityAfter, note: note || null },
    });

    return updatedProduct;
  });
}

/** Manual availability override, independent of stock quantity (e.g. a recalled batch). */
async function setAvailability(productId, availability) {
  return prisma.product.update({ where: { id: productId }, data: { availability } });
}

async function getProductHistory(productId, { page } = {}) {
  const { skip, take, page: currentPage, size } = getPageParams(page, 20);

  const [product, logs, totalCount] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId } }),
    prisma.inventoryLog.findMany({
      where: { productId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.inventoryLog.count({ where: { productId } }),
  ]);

  return { product, logs, pagination: buildPagination(currentPage, size, totalCount) };
}

module.exports = {
  listInventory,
  getLowStockProducts,
  getLowStockCount,
  adjustStock,
  setAvailability,
  getProductHistory,
};
