const asyncHandler = require('../../utils/asyncHandler');
const messageService = require('../../services/message.service');

exports.list = asyncHandler(async (req, res) => {
  const { page } = req.query;
  const { messages, pagination } = await messageService.listMessages({ page });
  res.render('admin/messages/index', { title: 'Messages', messages, pagination });
});

exports.show = asyncHandler(async (req, res) => {
  const message = await messageService.getMessageById(req.params.id);
  if (!message) {
    return res.status(404).render('errors/404', { title: 'Message Not Found' });
  }
  if (!message.isRead) {
    await messageService.markRead(message.id, true);
  }
  res.render('admin/messages/show', { title: `Message — ${message.name}`, message });
});

exports.toggleRead = asyncHandler(async (req, res) => {
  const message = await messageService.getMessageById(req.params.id);
  if (message) {
    await messageService.markRead(message.id, !message.isRead);
  }
  res.redirect('/admin/messages');
});
