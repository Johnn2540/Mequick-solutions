const asyncHandler = require('../../utils/asyncHandler');
const enquiryService = require('../../services/enquiry.service');
const { logAction } = require('../../services/audit.service');
const AUDIT = require('../../utils/auditActions');

const STATUS_OPTIONS = ['NEW', 'IN_PROGRESS', 'RESOLVED'];

exports.list = asyncHandler(async (req, res) => {
  const { status, page } = req.query;
  const { enquiries, pagination } = await enquiryService.listEnquiries({ status, page });
  res.render('admin/enquiries/index', {
    title: 'Customer Enquiries',
    enquiries,
    pagination,
    status: status || '',
    statusOptions: STATUS_OPTIONS,
  });
});

exports.show = asyncHandler(async (req, res) => {
  const enquiry = await enquiryService.getEnquiryById(req.params.id);
  if (!enquiry) {
    return res.status(404).render('errors/404', { title: 'Enquiry Not Found' });
  }
  res.render('admin/enquiries/show', {
    title: `Enquiry — ${enquiry.name}`,
    enquiry,
    statusOptions: STATUS_OPTIONS,
  });
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const enquiry = await enquiryService.updateEnquiryStatus(req.params.id, req.body.status);
  await logAction({
    req,
    action: AUDIT.ENQUIRY_STATUS_UPDATE,
    entityType: 'Enquiry',
    entityId: enquiry.id,
    description: `Set enquiry from "${enquiry.name}" to ${enquiry.status}.`,
  });
  if (res.flash) res.flash('success', 'Enquiry status updated.');
  res.redirect(`/admin/enquiries/${req.params.id}`);
});
