const prisma = require('../config/db');
const uploadService = require('./upload.service');

const PARTNER_FOLDER = 'mequick-solutions/partners';

/** Admin list — every partner regardless of active state, in display order. */
async function getAllPartners() {
  return prisma.partner.findMany({ orderBy: [{ order: 'asc' }, { name: 'asc' }] });
}

/** Public "Brands We Work With" strip — active only, in display order. */
async function getActivePartners() {
  return prisma.partner.findMany({ where: { isActive: true }, orderBy: [{ order: 'asc' }, { name: 'asc' }] });
}

async function getPartnerById(id) {
  return prisma.partner.findUnique({ where: { id } });
}

async function createPartner({ name, websiteUrl, order }, file) {
  const uploaded = await uploadService.uploadBuffer(file.buffer, { folder: PARTNER_FOLDER });

  return prisma.partner.create({
    data: {
      name,
      websiteUrl: websiteUrl || null,
      order: Number.isFinite(Number(order)) ? Number(order) : 0,
      logoUrl: uploaded.url,
      logoPublicId: uploaded.publicId,
    },
  });
}

async function updatePartner(id, { name, websiteUrl, order, isActive }, file) {
  const data = {
    name,
    websiteUrl: websiteUrl || null,
    order: Number.isFinite(Number(order)) ? Number(order) : 0,
    isActive: isActive === true || isActive === 'on' || isActive === 'true',
  };

  if (file) {
    const existing = await prisma.partner.findUnique({ where: { id } });
    const uploaded = await uploadService.uploadBuffer(file.buffer, { folder: PARTNER_FOLDER });
    data.logoUrl = uploaded.url;
    data.logoPublicId = uploaded.publicId;
    // Only drop the old asset once the new one is safely uploaded and the
    // row about to reference it — never destroy-then-fail.
    if (existing?.logoPublicId) {
      await uploadService.destroy(existing.logoPublicId);
    }
  }

  return prisma.partner.update({ where: { id }, data });
}

async function deletePartner(id) {
  const partner = await prisma.partner.findUnique({ where: { id } });
  if (!partner) return null;

  await prisma.partner.delete({ where: { id } });

  if (partner.logoPublicId) {
    await uploadService.destroy(partner.logoPublicId);
  }

  return partner;
}

module.exports = { getAllPartners, getActivePartners, getPartnerById, createPartner, updatePartner, deletePartner };
