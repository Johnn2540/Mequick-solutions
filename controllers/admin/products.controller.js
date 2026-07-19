const asyncHandler = require('../../utils/asyncHandler');
const productService = require('../../services/product.service');
const categoryService = require('../../services/category.service');
const brandService = require('../../services/brand.service');
const { logAction } = require('../../services/audit.service');
const AUDIT = require('../../utils/auditActions');

const AVAILABILITY_OPTIONS = [
  { value: 'IN_STOCK', label: 'In Stock' },
  { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
  { value: 'PREORDER', label: 'Pre-order' },
];

// GET /admin/products
exports.list = asyncHandler(async (req, res) => {
  const { q, page } = req.query;
  const { products, pagination } = await productService.searchProducts({ q, page, pageSize: 20 });
  res.render('admin/products/index', { title: 'Manage Products', products, pagination, q: q || '' });
});

// GET /admin/products/new
exports.newForm = asyncHandler(async (req, res) => {
  const [categories, brands] = await Promise.all([categoryService.getAllCategories(), brandService.getAllBrands()]);
  res.render('admin/products/form', {
    title: 'New Product',
    formAction: '/admin/products',
    categories,
    brands,
    availabilityOptions: AVAILABILITY_OPTIONS,
    product: null,
  });
});

// POST /admin/products
exports.create = asyncHandler(async (req, res) => {
  const files = req.files || [];
  const product = await productService.createProduct(req.body, files);
  await logAction({
    req,
    action: AUDIT.PRODUCT_CREATE,
    entityType: 'Product',
    entityId: product.id,
    description: `Created product "${product.name}".`,
  });
  if (res.flash) res.flash('success', 'Product created successfully.');
  res.redirect('/admin/products');
});

// GET /admin/products/:id/edit
exports.editForm = asyncHandler(async (req, res) => {
  const [product, categories, brands] = await Promise.all([
    productService.getProductById(req.params.id),
    categoryService.getAllCategories(),
    brandService.getAllBrands(),
  ]);
  if (!product) {
    return res.status(404).render('errors/404', { title: 'Product Not Found' });
  }
  res.render('admin/products/form', {
    title: 'Edit Product',
    formAction: `/admin/products/${product.id}`,
    categories,
    brands,
    availabilityOptions: AVAILABILITY_OPTIONS,
    product,
  });
});

// POST /admin/products/:id
exports.update = asyncHandler(async (req, res) => {
  const files = req.files || [];
  const removeImageIds = [].concat(req.body.removeImageIds || []).filter(Boolean);
  const product = await productService.updateProduct(req.params.id, req.body, files, removeImageIds);
  await logAction({
    req,
    action: AUDIT.PRODUCT_UPDATE,
    entityType: 'Product',
    entityId: product.id,
    description: `Updated product "${product.name}".`,
  });
  if (res.flash) res.flash('success', 'Product updated successfully.');
  res.redirect('/admin/products');
});

// POST /admin/products/:id/delete
exports.remove = asyncHandler(async (req, res) => {
  const product = await productService.deleteProduct(req.params.id);
  if (product) {
    await logAction({
      req,
      action: AUDIT.PRODUCT_DELETE,
      entityType: 'Product',
      entityId: product.id,
      description: `Deleted product "${product.name}".`,
    });
  }
  if (res.flash) res.flash('success', 'Product deleted.');
  res.redirect('/admin/products');
});

// POST /admin/products/:id/images/:imageId/primary
exports.setPrimaryImage = asyncHandler(async (req, res) => {
  await productService.setPrimaryImage(req.params.id, req.params.imageId);
  if (res.flash) res.flash('success', 'Primary image updated.');
  res.redirect(`/admin/products/${req.params.id}/edit`);
});
