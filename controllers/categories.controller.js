const asyncHandler = require('../utils/asyncHandler');
const categoryService = require('../services/category.service');
const productService = require('../services/product.service');

// GET /categories
exports.listCategories = asyncHandler(async (req, res) => {
  const categories = await categoryService.getAllCategories();
  res.render('categories/index', {
    title: 'Categories',
    metaDescription: 'Explore Mequick Solutions medical equipment categories, from theatre equipment to PPE.',
    categories,
    breadcrumbs: [{ label: 'Categories' }],
  });
});

// GET /categories/:slug
exports.showCategory = asyncHandler(async (req, res) => {
  const category = await categoryService.getCategoryBySlug(req.params.slug);
  if (!category) {
    return res.status(404).render('errors/404', { title: 'Category Not Found' });
  }

  const { products, pagination } = await productService.searchProducts({
    category: category.slug,
    page: req.query.page,
  });

  res.render('categories/show', {
    title: category.name,
    metaDescription: category.description || `Browse ${category.name} products from Mequick Solutions.`,
    category,
    products,
    pagination,
    breadcrumbs: [{ label: 'Categories', url: '/categories' }, { label: category.name }],
  });
});
