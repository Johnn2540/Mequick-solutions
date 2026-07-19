const asyncHandler = require('../../utils/asyncHandler');
const brandService = require('../../services/brand.service');
const { logAction } = require('../../services/audit.service');
const AUDIT = require('../../utils/auditActions');

// GET /admin/brands
exports.list = asyncHandler(async (req, res) => {
  const brands = await brandService.getAllBrands();
  res.render('admin/brands/index', { title: 'Manage Brands', brands });
});

// GET /admin/brands/new
exports.newForm = asyncHandler(async (req, res) => {
  res.render('admin/brands/form', { title: 'New Brand', formAction: '/admin/brands', brand: null });
});

// POST /admin/brands
exports.create = asyncHandler(async (req, res) => {
  const brand = await brandService.createBrand(req.body, req.file);
  await logAction({
    req,
    action: AUDIT.BRAND_CREATE,
    entityType: 'Brand',
    entityId: brand.id,
    description: `Created brand "${brand.name}".`,
  });
  if (res.flash) res.flash('success', 'Brand created successfully.');
  res.redirect('/admin/brands');
});

// GET /admin/brands/:id/edit
exports.editForm = asyncHandler(async (req, res) => {
  const brand = await brandService.getBrandById(req.params.id);
  if (!brand) {
    return res.status(404).render('errors/404', { title: 'Brand Not Found' });
  }
  res.render('admin/brands/form', { title: 'Edit Brand', formAction: `/admin/brands/${brand.id}`, brand });
});

// POST /admin/brands/:id
exports.update = asyncHandler(async (req, res) => {
  const brand = await brandService.updateBrand(req.params.id, req.body, req.file);
  await logAction({
    req,
    action: AUDIT.BRAND_UPDATE,
    entityType: 'Brand',
    entityId: brand.id,
    description: `Updated brand "${brand.name}".`,
  });
  if (res.flash) res.flash('success', 'Brand updated successfully.');
  res.redirect('/admin/brands');
});

// POST /admin/brands/:id/delete
exports.remove = asyncHandler(async (req, res) => {
  try {
    const brand = await brandService.deleteBrand(req.params.id);
    await logAction({
      req,
      action: AUDIT.BRAND_DELETE,
      entityType: 'Brand',
      entityId: brand.id,
      description: `Deleted brand "${brand.name}".`,
    });
    if (res.flash) res.flash('success', 'Brand deleted.');
  } catch (err) {
    if (err.code === 'P2003') {
      if (res.flash) res.flash('error', 'Cannot delete a brand that still has products assigned to it.');
    } else {
      throw err;
    }
  }
  res.redirect('/admin/brands');
});
