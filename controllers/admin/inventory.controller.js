const asyncHandler = require('../../utils/asyncHandler');
const inventoryService = require('../../services/inventory.service');
const categoryService = require('../../services/category.service');
const { logAction } = require('../../services/audit.service');
const AUDIT = require('../../utils/auditActions');

// GET /admin/inventory
exports.list = asyncHandler(async (req, res) => {
  const { q, category, page } = req.query;
  const lowStock = req.query.lowStock === '1' ? '1' : '';

  const [{ products, pagination }, categories] = await Promise.all([
    inventoryService.listInventory({ q, category, lowStockOnly: lowStock === '1', page }),
    categoryService.getAllCategories(),
  ]);

  res.render('admin/inventory/index', {
    title: 'Inventory',
    products,
    pagination,
    categories,
    q: q || '',
    category: category || '',
    lowStock,
  });
});

// GET /admin/inventory/:id/history
exports.history = asyncHandler(async (req, res) => {
  const { product, logs, pagination } = await inventoryService.getProductHistory(req.params.id, {
    page: req.query.page,
  });
  if (!product) {
    return res.status(404).render('errors/404', { title: 'Product Not Found' });
  }
  res.render('admin/inventory/history', {
    title: `Inventory History — ${product.name}`,
    product,
    logs,
    pagination,
  });
});

// POST /admin/inventory/:id/stock
exports.updateStock = asyncHandler(async (req, res) => {
  const { changeType, note } = req.body;
  const quantityChange = Number(req.body.quantityChange);

  try {
    const product = await inventoryService.adjustStock(req.params.id, { changeType, quantityChange, note }, req.user.id);
    await logAction({
      req,
      action: AUDIT.INVENTORY_STOCK_UPDATE,
      entityType: 'Product',
      entityId: product.id,
      description: `${changeType} on "${product.name}": ${quantityChange > 0 ? '+' : ''}${quantityChange} (now ${product.stockQuantity}).`,
    });
    if (res.flash) res.flash('success', `Stock updated for "${product.name}".`);
  } catch (err) {
    // A negative-resulting-stock error is a legitimate input mistake, not a
    // server bug — flash it back rather than raising a 500.
    if (res.flash) res.flash('error', err.message);
  }

  res.redirect('/admin/inventory');
});

// POST /admin/inventory/:id/availability
exports.updateAvailability = asyncHandler(async (req, res) => {
  const product = await inventoryService.setAvailability(req.params.id, req.body.availability);
  await logAction({
    req,
    action: AUDIT.INVENTORY_AVAILABILITY_UPDATE,
    entityType: 'Product',
    entityId: product.id,
    description: `Set "${product.name}" availability to ${product.availability}.`,
  });
  if (res.flash) res.flash('success', 'Availability updated.');
  res.redirect('/admin/inventory');
});
