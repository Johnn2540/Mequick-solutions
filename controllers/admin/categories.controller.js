const asyncHandler = require('../../utils/asyncHandler');
const categoryService = require('../../services/category.service');
const { logAction } = require('../../services/audit.service');
const AUDIT = require('../../utils/auditActions');

// GET /admin/categories
exports.list = asyncHandler(async (req, res) => {
  const categories = await categoryService.getAllCategories();
  res.render('admin/categories/index', { title: 'Manage Categories', categories });
});

// GET /admin/categories/new
exports.newForm = asyncHandler(async (req, res) => {
  res.render('admin/categories/form', { title: 'New Category', formAction: '/admin/categories', category: null });
});

// POST /admin/categories
exports.create = asyncHandler(async (req, res) => {
  const files = req.files || [];
  const category = await categoryService.createCategory(req.body, files);
  await logAction({
    req,
    action: AUDIT.CATEGORY_CREATE,
    entityType: 'Category',
    entityId: category.id,
    description: `Created category "${category.name}".`,
  });
  if (res.flash) res.flash('success', 'Category created successfully.');
  res.redirect('/admin/categories');
});

// GET /admin/categories/:id/edit
exports.editForm = asyncHandler(async (req, res) => {
  const category = await categoryService.getCategoryById(req.params.id);
  if (!category) {
    return res.status(404).render('errors/404', { title: 'Category Not Found' });
  }
  res.render('admin/categories/form', {
    title: 'Edit Category',
    formAction: `/admin/categories/${category.id}`,
    category,
  });
});

// POST /admin/categories/:id
exports.update = asyncHandler(async (req, res) => {
  const files = req.files || [];
  const removeImageIds = [].concat(req.body.removeImageIds || []).filter(Boolean);
  const category = await categoryService.updateCategory(req.params.id, req.body, files, removeImageIds);
  await logAction({
    req,
    action: AUDIT.CATEGORY_UPDATE,
    entityType: 'Category',
    entityId: category.id,
    description: `Updated category "${category.name}".`,
  });
  if (res.flash) res.flash('success', 'Category updated successfully.');
  res.redirect('/admin/categories');
});

// POST /admin/categories/:id/images/:imageId/primary
exports.setPrimaryImage = asyncHandler(async (req, res) => {
  await categoryService.setPrimaryImage(req.params.id, req.params.imageId);
  if (res.flash) res.flash('success', 'Primary image updated.');
  res.redirect(`/admin/categories/${req.params.id}/edit`);
});

// POST /admin/categories/:id/delete
exports.remove = asyncHandler(async (req, res) => {
  try {
    const category = await categoryService.deleteCategory(req.params.id);
    await logAction({
      req,
      action: AUDIT.CATEGORY_DELETE,
      entityType: 'Category',
      entityId: category.id,
      description: `Deleted category "${category.name}".`,
    });
    if (res.flash) res.flash('success', 'Category deleted.');
  } catch (err) {
    if (err.code === 'P2003') {
      if (res.flash) res.flash('error', 'Cannot delete a category that still has products assigned to it.');
    } else {
      throw err;
    }
  }
  res.redirect('/admin/categories');
});
