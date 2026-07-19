const asyncHandler = require('../utils/asyncHandler');
const productService = require('../services/product.service');
const categoryService = require('../services/category.service');
const brandService = require('../services/brand.service');

const AVAILABILITY_OPTIONS = [
  { value: 'IN_STOCK', label: 'In Stock' },
  { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
  { value: 'PREORDER', label: 'Pre-order' },
];

// GET /products
exports.listProducts = asyncHandler(async (req, res) => {
  const { q, category, brand, availability, page } = req.query;

  const [{ products, pagination }, categories, brands] = await Promise.all([
    productService.searchProducts({ q, category, brand, availability, page }),
    categoryService.getAllCategories(),
    brandService.getAllBrands(),
  ]);

  res.render('products/index', {
    title: 'Products',
    metaDescription:
      'Browse Mequick Solutions medical equipment, laboratory products, hospital furniture, and healthcare consumables.',
    products,
    pagination,
    categories,
    brands,
    availabilityOptions: AVAILABILITY_OPTIONS,
    filters: { q: q || '', category: category || '', brand: brand || '', availability: availability || '' },
    breadcrumbs: [{ label: 'Products' }],
  });
});

// GET /products/:slug
exports.showProduct = asyncHandler(async (req, res) => {
  const product = await productService.getProductBySlug(req.params.slug);
  if (!product) {
    return res.status(404).render('errors/404', { title: 'Product Not Found' });
  }

  const relatedProducts = await productService.getRelatedProducts(product);

  res.render('products/show', {
    title: product.name,
    metaDescription: product.description ? product.description.slice(0, 160) : undefined,
    product,
    relatedProducts,
    breadcrumbs: [{ label: 'Products', url: '/products' }, { label: product.name }],
  });
});
