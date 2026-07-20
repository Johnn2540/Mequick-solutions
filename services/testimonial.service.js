const prisma = require('../config/db');
const uploadService = require('./upload.service');

const TESTIMONIAL_FOLDER = 'mequick-solutions/testimonials';

/** Admin list — every testimonial regardless of active state, in display order. */
async function getAllTestimonials() {
  return prisma.testimonial.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] });
}

/** Public homepage carousel — active only, in display order. */
async function getActiveTestimonials() {
  return prisma.testimonial.findMany({ where: { isActive: true }, orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] });
}

async function getTestimonialById(id) {
  return prisma.testimonial.findUnique({ where: { id } });
}

async function createTestimonial({ customerName, customerTitle, quote, rating, order }, file) {
  let photoUrl = null;
  let photoPublicId = null;
  if (file) {
    const uploaded = await uploadService.uploadBuffer(file.buffer, { folder: TESTIMONIAL_FOLDER });
    photoUrl = uploaded.url;
    photoPublicId = uploaded.publicId;
  }

  return prisma.testimonial.create({
    data: {
      customerName,
      customerTitle: customerTitle || null,
      quote,
      rating: rating !== undefined && rating !== '' ? Number(rating) : null,
      order: Number.isFinite(Number(order)) ? Number(order) : 0,
      photoUrl,
      photoPublicId,
    },
  });
}

async function updateTestimonial(id, { customerName, customerTitle, quote, rating, order, isActive }, file) {
  const data = {
    customerName,
    customerTitle: customerTitle || null,
    quote,
    rating: rating !== undefined && rating !== '' ? Number(rating) : null,
    order: Number.isFinite(Number(order)) ? Number(order) : 0,
    isActive: isActive === true || isActive === 'on' || isActive === 'true',
  };

  if (file) {
    const existing = await prisma.testimonial.findUnique({ where: { id } });
    const uploaded = await uploadService.uploadBuffer(file.buffer, { folder: TESTIMONIAL_FOLDER });
    data.photoUrl = uploaded.url;
    data.photoPublicId = uploaded.publicId;
    // Only drop the old asset once the new one is safely uploaded and the
    // row about to reference it — never destroy-then-fail.
    if (existing?.photoPublicId) {
      await uploadService.destroy(existing.photoPublicId);
    }
  }

  return prisma.testimonial.update({ where: { id }, data });
}

async function deleteTestimonial(id) {
  const testimonial = await prisma.testimonial.findUnique({ where: { id } });
  if (!testimonial) return null;

  await prisma.testimonial.delete({ where: { id } });

  if (testimonial.photoPublicId) {
    await uploadService.destroy(testimonial.photoPublicId);
  }

  return testimonial;
}

module.exports = {
  getAllTestimonials,
  getActiveTestimonials,
  getTestimonialById,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
};
