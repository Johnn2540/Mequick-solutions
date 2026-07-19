const prisma = require('../config/db');
const generateUniqueSlug = require('../utils/uniqueSlug');
const uploadService = require('./upload.service');

const CATEGORY_FOLDER = 'mequick-solutions/categories';

/** All categories with a live product count, ordered alphabetically. */
async function getAllCategories() {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  });
  return categories.map((c) => ({ ...c, productCount: c._count.products }));
}

async function getCategoryById(id) {
  return prisma.category.findUnique({ where: { id } });
}

async function getCategoryBySlug(slug) {
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) return null;
  const productCount = await prisma.product.count({ where: { categoryId: category.id } });
  return { ...category, productCount };
}

async function createCategory({ name, description }, file) {
  const slug = await generateUniqueSlug(prisma.category, name);
  const data = { name, slug, description };

  if (file) {
    const uploaded = await uploadService.uploadBuffer(file.buffer, { folder: CATEGORY_FOLDER });
    data.image = uploaded.url;
    data.imagePublicId = uploaded.publicId;
  }

  return prisma.category.create({ data });
}

async function updateCategory(id, { name, description }, file) {
  const data = { description };
  if (name) {
    data.name = name;
    data.slug = await generateUniqueSlug(prisma.category, name, id);
  }

  if (file) {
    const existing = await prisma.category.findUnique({ where: { id } });
    const uploaded = await uploadService.uploadBuffer(file.buffer, { folder: CATEGORY_FOLDER });
    data.image = uploaded.url;
    data.imagePublicId = uploaded.publicId;
    // Only drop the old asset once the new one is safely uploaded and the
    // row about to reference it — never destroy-then-fail.
    if (existing?.imagePublicId) {
      await uploadService.destroy(existing.imagePublicId);
    }
  }

  return prisma.category.update({ where: { id }, data });
}

async function deleteCategory(id) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) return null;

  // Products reference categories with onDelete: Restrict, so this throws
  // (P2003) if any product still belongs to this category — the caller
  // already handles that. Deleting the DB row FIRST means a blocked delete
  // never destroys the Cloudinary asset out from under a category that
  // still exists.
  await prisma.category.delete({ where: { id } });

  if (category.imagePublicId) {
    await uploadService.destroy(category.imagePublicId);
  }

  return category;
}

module.exports = {
  getAllCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
};
