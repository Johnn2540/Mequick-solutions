const asyncHandler = require('../../utils/asyncHandler');
const quoteService = require('../../services/quote.service');
const { logAction } = require('../../services/audit.service');
const AUDIT = require('../../utils/auditActions');

const STATUS_OPTIONS = ['NEW', 'PENDING', 'QUOTATION_SENT', 'APPROVED', 'DECLINED', 'CLOSED'];

exports.list = asyncHandler(async (req, res) => {
  const { status, page } = req.query;
  const { quotes, pagination } = await quoteService.listQuotes({ status, page });
  res.render('admin/quotes/index', {
    title: 'Quote Requests',
    quotes,
    pagination,
    status: status || '',
    statusOptions: STATUS_OPTIONS,
  });
});

exports.show = asyncHandler(async (req, res) => {
  const quote = await quoteService.getQuoteById(req.params.id);
  if (!quote) {
    return res.status(404).render('errors/404', { title: 'Quote Not Found' });
  }
  res.render('admin/quotes/show', {
    title: `Quote — ${quote.customerName}`,
    quote,
    statusOptions: STATUS_OPTIONS,
  });
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const quote = await quoteService.updateQuoteStatus(req.params.id, req.body.status);
  await logAction({
    req,
    action: AUDIT.QUOTE_STATUS_UPDATE,
    entityType: 'QuoteRequest',
    entityId: quote.id,
    description: `Set quote from "${quote.customerName}" to ${quote.status}.`,
  });
  if (res.flash) res.flash('success', 'Quote status updated.');
  res.redirect(`/admin/quotes/${req.params.id}`);
});
