const asyncHandler = require('../../utils/asyncHandler');
const partnerService = require('../../services/partner.service');
const { logAction } = require('../../services/audit.service');
const AUDIT = require('../../utils/auditActions');

// GET /admin/partners
exports.list = asyncHandler(async (req, res) => {
  const partners = await partnerService.getAllPartners();
  res.render('admin/partners/index', { title: 'Manage Partners', partners });
});

// GET /admin/partners/new
exports.newForm = asyncHandler(async (req, res) => {
  res.render('admin/partners/form', { title: 'New Partner', formAction: '/admin/partners', partner: null });
});

// POST /admin/partners
exports.create = asyncHandler(async (req, res) => {
  if (!req.file) {
    if (res.flash) res.flash('error', 'A logo image is required.');
    return res.redirect('/admin/partners/new');
  }
  const partner = await partnerService.createPartner(req.body, req.file);
  await logAction({
    req,
    action: AUDIT.PARTNER_CREATE,
    entityType: 'Partner',
    entityId: partner.id,
    description: `Added partner "${partner.name}".`,
  });
  if (res.flash) res.flash('success', 'Partner added successfully.');
  res.redirect('/admin/partners');
});

// GET /admin/partners/:id/edit
exports.editForm = asyncHandler(async (req, res) => {
  const partner = await partnerService.getPartnerById(req.params.id);
  if (!partner) {
    return res.status(404).render('errors/404', { title: 'Partner Not Found' });
  }
  res.render('admin/partners/form', { title: 'Edit Partner', formAction: `/admin/partners/${partner.id}`, partner });
});

// POST /admin/partners/:id
exports.update = asyncHandler(async (req, res) => {
  const partner = await partnerService.updatePartner(req.params.id, req.body, req.file);
  await logAction({
    req,
    action: AUDIT.PARTNER_UPDATE,
    entityType: 'Partner',
    entityId: partner.id,
    description: `Updated partner "${partner.name}".`,
  });
  if (res.flash) res.flash('success', 'Partner updated successfully.');
  res.redirect('/admin/partners');
});

// POST /admin/partners/:id/delete
exports.remove = asyncHandler(async (req, res) => {
  const partner = await partnerService.deletePartner(req.params.id);
  if (partner) {
    await logAction({
      req,
      action: AUDIT.PARTNER_DELETE,
      entityType: 'Partner',
      entityId: partner.id,
      description: `Deleted partner "${partner.name}".`,
    });
  }
  if (res.flash) res.flash('success', 'Partner deleted.');
  res.redirect('/admin/partners');
});
