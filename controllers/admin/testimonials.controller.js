const asyncHandler = require('../../utils/asyncHandler');
const testimonialService = require('../../services/testimonial.service');
const { logAction } = require('../../services/audit.service');
const AUDIT = require('../../utils/auditActions');

// GET /admin/testimonials
exports.list = asyncHandler(async (req, res) => {
  const testimonials = await testimonialService.getAllTestimonials();
  res.render('admin/testimonials/index', { title: 'Manage Testimonials', testimonials });
});

// GET /admin/testimonials/new
exports.newForm = asyncHandler(async (req, res) => {
  res.render('admin/testimonials/form', {
    title: 'New Testimonial',
    formAction: '/admin/testimonials',
    testimonial: null,
  });
});

// POST /admin/testimonials
exports.create = asyncHandler(async (req, res) => {
  const testimonial = await testimonialService.createTestimonial(req.body, req.file);
  await logAction({
    req,
    action: AUDIT.TESTIMONIAL_CREATE,
    entityType: 'Testimonial',
    entityId: testimonial.id,
    description: `Added testimonial from "${testimonial.customerName}".`,
  });
  if (res.flash) res.flash('success', 'Testimonial added successfully.');
  res.redirect('/admin/testimonials');
});

// GET /admin/testimonials/:id/edit
exports.editForm = asyncHandler(async (req, res) => {
  const testimonial = await testimonialService.getTestimonialById(req.params.id);
  if (!testimonial) {
    return res.status(404).render('errors/404', { title: 'Testimonial Not Found' });
  }
  res.render('admin/testimonials/form', {
    title: 'Edit Testimonial',
    formAction: `/admin/testimonials/${testimonial.id}`,
    testimonial,
  });
});

// POST /admin/testimonials/:id
exports.update = asyncHandler(async (req, res) => {
  const testimonial = await testimonialService.updateTestimonial(req.params.id, req.body, req.file);
  await logAction({
    req,
    action: AUDIT.TESTIMONIAL_UPDATE,
    entityType: 'Testimonial',
    entityId: testimonial.id,
    description: `Updated testimonial from "${testimonial.customerName}".`,
  });
  if (res.flash) res.flash('success', 'Testimonial updated successfully.');
  res.redirect('/admin/testimonials');
});

// POST /admin/testimonials/:id/delete
exports.remove = asyncHandler(async (req, res) => {
  const testimonial = await testimonialService.deleteTestimonial(req.params.id);
  if (testimonial) {
    await logAction({
      req,
      action: AUDIT.TESTIMONIAL_DELETE,
      entityType: 'Testimonial',
      entityId: testimonial.id,
      description: `Deleted testimonial from "${testimonial.customerName}".`,
    });
  }
  if (res.flash) res.flash('success', 'Testimonial deleted.');
  res.redirect('/admin/testimonials');
});
