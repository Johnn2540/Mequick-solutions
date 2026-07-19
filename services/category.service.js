const prisma = require('../config/db');
const generateUniqueSlug = require('../utils/uniqueSlug');
const uploadService = require('./upload.service');

const CATEGORY_FOLDER = 'mequick-solutions/categories';
const MAX_IMAGES = 10;

const WITH_IMAGES = { images: { orderBy: { isPrimary: 'desc' } } };

// Cards/listings only ever need one image — this maps a category's `images`
// array down to a flat `image` (the primary one, or the first upload if
// none is marked primary) so every existing template that reads
// `category.image` keeps working unchanged. `images` is still exposed in
// full for the category detail page's gallery.
function withPrimaryImage(category) {
  const primary = category.images.find((img) => img.isPrimary) || category.images[0] || null;
  return { ...category, image: primary?.url || null };
}

/** All categories with a live product count, ordered alphabetically. */
async function getAllCategories() {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { ...WITH_IMAGES, _count: { select: { products: true } } },
  });
  return categories.map((c) => withPrimaryImage({ ...c, productCount: c._count.products }));
}

async function getCategoryById(id) {
  const category = await prisma.category.findUnique({ where: { id }, include: WITH_IMAGES });
  return category ? withPrimaryImage(category) : null;
}

async function getCategoryBySlug(slug) {
  const category = await prisma.category.findUnique({ where: { slug }, include: WITH_IMAGES });
  if (!category) return null;
  const productCount = await prisma.product.count({ where: { categoryId: category.id } });
  return withPrimaryImage({ ...category, productCount });
}

async function createCategory({ name, description }, files = []) {
  const slug = await generateUniqueSlug(prisma.category, name);
  const uploaded = files.length ? await uploadService.uploadMany(files.slice(0, MAX_IMAGES), { folder: CATEGORY_FOLDER }) : [];

  return prisma.category.create({
    data: {
      name,
      slug,
      description,
      images: {
        create: uploaded.map((img, index) => ({
          url: img.url,
          publicId: img.publicId,
          isPrimary: index === 0,
        })),
      },
    },
    include: WITH_IMAGES,
  });
}

async function updateCategory(id, { name, description }, newFiles = [], removeImageIds = []) {
  if (removeImageIds.length) {
    const imagesToRemove = await prisma.categoryImage.findMany({
      where: { id: { in: removeImageIds }, categoryId: id },
    });
    await Promise.all(imagesToRemove.map((img) => uploadService.destroy(img.publicId)));
    await prisma.categoryImage.deleteMany({ where: { id: { in: removeImageIds }, categoryId: id } });
  }

  const data = { description };
  if (name) {
    data.name = name;
    data.slug = await generateUniqueSlug(prisma.category, name, id);
  }

  if (newFiles.length) {
    const existingCount = await prisma.categoryImage.count({ where: { categoryId: id } });
    const room = Math.max(MAX_IMAGES - existingCount, 0);
    const uploaded = room > 0 ? await uploadService.uploadMany(newFiles.slice(0, room), { folder: CATEGORY_FOLDER }) : [];
    if (uploaded.length) {
      // Only ever auto-primary the very first image a category gets — once
      // one exists, primary status changes explicitly via setPrimaryImage,
      // never silently as a side effect of adding more photos.
      const makeFirstPrimary = existingCount === 0;
      data.images = {
        create: uploaded.map((img, index) => ({
          url: img.url,
          publicId: img.publicId,
          isPrimary: makeFirstPrimary && index === 0,
        })),
      };
    }
  }

  return prisma.category.update({ where: { id }, data, include: WITH_IMAGES });
}

async function setPrimaryImage(categoryId, imageId) {
  await prisma.$transaction([
    prisma.categoryImage.updateMany({ where: { categoryId }, data: { isPrimary: false } }),
    prisma.categoryImage.update({ where: { id: imageId, categoryId }, data: { isPrimary: true } }),
  ]);
}

async function deleteCategory(id) {
  const category = await prisma.category.findUnique({ where: { id }, include: WITH_IMAGES });
  if (!category) return null;

  // Products reference categories with onDelete: Restrict, so this throws
  // (P2003) if any product still belongs to this category — the caller
  // already handles that. Deleting the DB row FIRST (CategoryImage rows
  // cascade with it) means a blocked delete never destroys Cloudinary
  // assets out from under a category that still exists.
  await prisma.category.delete({ where: { id } });

  await Promise.all(category.images.map((img) => uploadService.destroy(img.publicId)));

  return category;
}

module.exports = {
  getAllCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  setPrimaryImage,
  deleteCategory,
  MAX_IMAGES,
};
