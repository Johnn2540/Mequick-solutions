const asyncHandler = require('../../utils/asyncHandler');
const prisma = require('../../config/db');
const inventoryService = require('../../services/inventory.service');

// GET /admin
exports.renderDashboard = asyncHandler(async (req, res) => {
  const [
    productCount,
    categoryCount,
    brandCount,
    outOfStockCount,
    quoteCount,
    pendingQuoteCount,
    enquiryCount,
    newEnquiryCount,
    messageCount,
    unreadMessageCount,
    lowStockCount,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
    prisma.brand.count(),
    prisma.product.count({ where: { availability: 'OUT_OF_STOCK' } }),
    prisma.quoteRequest.count(),
    prisma.quoteRequest.count({ where: { status: 'PENDING' } }),
    prisma.enquiry.count(),
    prisma.enquiry.count({ where: { status: 'NEW' } }),
    prisma.message.count(),
    prisma.message.count({ where: { isRead: false } }),
    inventoryService.getLowStockCount(),
  ]);

  const [recentProducts, recentUploads, lowStockProducts] = await Promise.all([
    prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { category: true, images: { where: { isPrimary: true }, take: 1 } },
    }),
    prisma.productImage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { product: { select: { name: true, slug: true } } },
    }),
    inventoryService.getLowStockProducts(5),
  ]);

  res.render('admin/dashboard', {
    title: 'Admin Dashboard',
    stats: {
      productCount,
      categoryCount,
      brandCount,
      outOfStockCount,
      quoteCount,
      pendingQuoteCount,
      enquiryCount,
      newEnquiryCount,
      messageCount,
      unreadMessageCount,
      lowStockCount,
    },
    recentProducts,
    recentUploads,
    lowStockProducts,
  });
});
