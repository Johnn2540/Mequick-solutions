const prisma = require('../config/db');
const generateUniqueSlug = require('../utils/uniqueSlug');
const uploadService = require('./upload.service');

const BRAND_FOLDER = 'mequick-solutions/brands';

async function getAllBrands() {
  const brands = await prisma.brand.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  });
  return brands.map((b) => ({ ...b, productCount: b._count.products }));
}

async function getBrandById(id) {
  return prisma.brand.findUnique({ where: { id } });
}

async function createBrand({ name }, file) {
  const slug = await generateUniqueSlug(prisma.brand, name);
  const data = { name, slug };

  if (file) {
    const uploaded = await uploadService.uploadBuffer(file.buffer, { folder: BRAND_FOLDER });
    data.logo = uploaded.url;
    data.logoPublicId = uploaded.publicId;
  }

  return prisma.brand.create({ data });
}

async function updateBrand(id, { name }, file) {
  const data = {};
  if (name) {
    data.name = name;
    data.slug = await generateUniqueSlug(prisma.brand, name, id);
  }

  if (file) {
    const existing = await prisma.brand.findUnique({ where: { id } });
    const uploaded = await uploadService.uploadBuffer(file.buffer, { folder: BRAND_FOLDER });
    data.logo = uploaded.url;
    data.logoPublicId = uploaded.publicId;
    if (existing?.logoPublicId) {
      await uploadService.destroy(existing.logoPublicId);
    }
  }

  return prisma.brand.update({ where: { id }, data });
}

async function deleteBrand(id) {
  const brand = await prisma.brand.findUnique({ where: { id } });
  if (!brand) return null;

  // Products reference brands with onDelete: SetNull, so this never
  // fails the way category delete can — but delete-then-destroy is kept
  // for consistency with category.service.js.
  await prisma.brand.delete({ where: { id } });

  if (brand.logoPublicId) {
    await uploadService.destroy(brand.logoPublicId);
  }

  return brand;
}

module.exports = { getAllBrands, getBrandById, createBrand, updateBrand, deleteBrand };
