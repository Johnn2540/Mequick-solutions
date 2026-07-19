const prisma = require('../config/db');
const generateUniqueSlug = require('../utils/uniqueSlug');
const uploadService = require('./upload.service');
const { getPageParams, buildPagination } = require('../utils/pagination');

const PRODUCT_FOLDER = 'mequick-solutions/products';

const PUBLIC_INCLUDE = {
  category: true,
  brand: true,
  images: { orderBy: { isPrimary: 'desc' } },
};

/**
 * Search/filter/paginate products for both the public catalog and the
 * admin product list. All filters are optional and combine with AND.
 */
async function searchProducts({ q, category, brand, availability, page, pageSize } = {}) {
  const { skip, take, page: currentPage, size } = getPageParams(page, pageSize);

  const where = {
    AND: [
      q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
              { sku: { contains: q, mode: 'insensitive' } },
              { brand: { name: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {},
      category ? { category: { slug: category } } : {},
      brand ? { brand: { slug: brand } } : {},
      availability ? { availability } : {},
    ],
  };

  const [products, totalCount] = await Promise.all([
    prisma.product.findMany({
      where,
      include: PUBLIC_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.product.count({ where }),
  ]);

  return { products, pagination: buildPagination(currentPage, size, totalCount) };
}

async function getFeaturedProducts(limit = 8) {
  return prisma.product.findMany({
    where: { featured: true },
    include: PUBLIC_INCLUDE,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

async function getProductBySlug(slug) {
  return prisma.product.findUnique({ where: { slug }, include: PUBLIC_INCLUDE });
}

async function getProductById(id) {
  return prisma.product.findUnique({ where: { id }, include: PUBLIC_INCLUDE });
}

async function getRelatedProducts(product, limit = 4) {
  return prisma.product.findMany({
    where: { categoryId: product.categoryId, id: { not: product.id } },
    include: PUBLIC_INCLUDE,
    take: limit,
  });
}

/** Lightweight, unpaginated list for the "Request a Quote" product picker. */
async function getAllForSelect() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, category: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });
  return products.map((p) => ({ id: p.id, name: p.name, categoryName: p.category?.name || '' }));
}

function toProductData(data) {
  return {
    sku: data.sku || null,
    description: data.description || null,
    specifications: data.specifications || null,
    price: data.price !== undefined && data.price !== '' ? Number(data.price) : null,
    availability: data.availability,
    featured: data.featured === true || data.featured === 'on' || data.featured === 'true',
    categoryId: data.categoryId,
    brandId: data.brandId || null,
  };
}

async function createProduct(data, files = []) {
  const slug = await generateUniqueSlug(prisma.product, data.name);
  const uploaded = files.length ? await uploadService.uploadMany(files, { folder: PRODUCT_FOLDER }) : [];

  return prisma.product.create({
    data: {
      ...toProductData(data),
      name: data.name,
      slug,
      images: {
        create: uploaded.map((img, index) => ({
          url: img.url,
          publicId: img.publicId,
          isPrimary: index === 0,
        })),
      },
    },
    include: PUBLIC_INCLUDE,
  });
}

async function updateProduct(id, data, newFiles = [], removeImageIds = []) {
  if (removeImageIds.length) {
    const imagesToRemove = await prisma.productImage.findMany({
      where: { id: { in: removeImageIds }, productId: id },
    });
    await Promise.all(imagesToRemove.map((img) => uploadService.destroy(img.publicId)));
    await prisma.productImage.deleteMany({ where: { id: { in: removeImageIds }, productId: id } });
  }

  const uploaded = newFiles.length ? await uploadService.uploadMany(newFiles, { folder: PRODUCT_FOLDER }) : [];

  const updateData = toProductData(data);
  if (data.name) {
    updateData.name = data.name;
    updateData.slug = await generateUniqueSlug(prisma.product, data.name, id);
  }
  if (uploaded.length) {
    updateData.images = { create: uploaded.map((img) => ({ url: img.url, publicId: img.publicId })) };
  }

  return prisma.product.update({ where: { id }, data: updateData, include: PUBLIC_INCLUDE });
}

async function deleteProduct(id) {
  const product = await prisma.product.findUnique({ where: { id }, include: { images: true } });
  if (!product) return null;
  await Promise.all(product.images.map((img) => uploadService.destroy(img.publicId)));
  // ProductImage rows cascade-delete at the DB level (onDelete: Cascade).
  await prisma.product.delete({ where: { id } });
  return product;
}

async function setPrimaryImage(productId, imageId) {
  await prisma.$transaction([
    prisma.productImage.updateMany({ where: { productId }, data: { isPrimary: false } }),
    prisma.productImage.update({ where: { id: imageId, productId }, data: { isPrimary: true } }),
  ]);
}

module.exports = {
  searchProducts,
  getFeaturedProducts,
  getProductBySlug,
  getProductById,
  getRelatedProducts,
  getAllForSelect,
  createProduct,
  updateProduct,
  deleteProduct,
  setPrimaryImage,
};
