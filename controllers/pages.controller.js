const { validationResult } = require('express-validator');
const asyncHandler = require('../utils/asyncHandler');
const categoryService = require('../services/category.service');
const productService = require('../services/product.service');
const messageService = require('../services/message.service');
const quoteService = require('../services/quote.service');
const partnerService = require('../services/partner.service');
const testimonialService = require('../services/testimonial.service');

// Bootstrap Icons keyed by category slug, purely cosmetic for the homepage
// grid. Any category without a match here falls back to a generic icon.
const CATEGORY_ICONS = {
  'theatre-icu-equipment': 'bi-heart-pulse',
  'maternity-equipment': 'bi-heart',
  'laboratory-equipment-reagents': 'bi-clipboard2-pulse',
  'dental-equipment': 'bi-emoji-smile',
  'imaging-equipment': 'bi-radioactive',
  'surgical-instruments': 'bi-scissors',
  'medical-consumables': 'bi-box-seam',
  'laboratory-consumables': 'bi-droplet-half',
  'medical-gloves': 'bi-hand-index-thumb',
  'medical-safety-products': 'bi-shield-check',
  'personal-protective-equipment-ppe': 'bi-shield-plus',
  'hospital-furniture': 'bi-hospital',
  'emergency-equipment': 'bi-truck',
};

const WHY_CHOOSE_US = [
  { icon: 'bi-award', title: 'Quality Assured', text: 'Genuine, certified equipment sourced from trusted manufacturers.' },
  { icon: 'bi-truck', title: 'Nationwide Delivery', text: 'Reliable delivery to hospitals and clinics across Kenya.' },
  { icon: 'bi-headset', title: 'Expert Support', text: 'Knowledgeable staff to help you choose the right equipment.' },
  { icon: 'bi-cash-coin', title: 'Competitive Pricing', text: 'Transparent quotes with no hidden costs.' },
];

const SERVICES = [
  { icon: 'bi-box-seam', title: 'Equipment Supply', text: 'A wide range of genuine, certified medical equipment sourced from trusted manufacturers.' },
  { icon: 'bi-tools', title: 'Installation & Setup', text: 'Professional installation and commissioning of equipment at your facility.' },
  { icon: 'bi-wrench-adjustable', title: 'Maintenance & Repair', text: 'Scheduled maintenance and responsive repair services to keep your equipment running.' },
  { icon: 'bi-mortarboard', title: 'Staff Training', text: 'Hands-on training for your clinical and technical staff on proper equipment use.' },
  { icon: 'bi-clipboard2-pulse', title: 'Consultation', text: 'Needs assessment and expert guidance to help you choose the right equipment.' },
  { icon: 'bi-truck', title: 'Nationwide Delivery', text: 'Reliable, timely delivery to hospitals and clinics across Kenya.' },
];

// GET /
exports.renderHome = asyncHandler(async (req, res) => {
  const [categories, featuredProducts, partners, testimonials] = await Promise.all([
    categoryService.getAllCategories(),
    productService.getFeaturedProducts(8),
    partnerService.getActivePartners(),
    testimonialService.getActiveTestimonials(),
  ]);

  const categoriesWithIcons = categories.map((category) => ({
    ...category,
    icon: CATEGORY_ICONS[category.slug] || 'bi-box-seam',
  }));

  res.render('pages/home', {
    title: 'Home',
    metaDescription:
      'Mequick Solutions supplies quality medical equipment, laboratory products, hospital furniture, surgical instruments, and healthcare consumables across Kenya.',
    categories: categoriesWithIcons,
    featuredProducts,
    whyChooseUs: WHY_CHOOSE_US,
    partners,
    testimonials,
  });
});

// GET /about
exports.renderAbout = asyncHandler(async (req, res) => {
  const partners = await partnerService.getActivePartners();
  res.render('pages/about', {
    title: 'About Us',
    metaDescription: `Learn about ${res.locals.company.name}, a trusted medical equipment supplier serving hospitals and clinics across Kenya.`,
    whyChooseUs: WHY_CHOOSE_US,
    partners,
    breadcrumbs: [{ label: 'About Us' }],
  });
});

// GET /services
exports.renderServices = asyncHandler(async (req, res) => {
  res.render('pages/services', {
    title: 'Services',
    metaDescription: `Services offered by ${res.locals.company.name} — equipment supply, installation, maintenance, training, and consultation.`,
    services: SERVICES,
    breadcrumbs: [{ label: 'Services' }],
  });
});

// GET /contact
exports.renderContact = asyncHandler(async (req, res) => {
  res.render('pages/contact', {
    title: 'Contact Us',
    metaDescription: `Get in touch with ${res.locals.company.name} — visit us, call, WhatsApp, or send a message.`,
    sent: req.query.sent === '1',
    csrfError: req.query.csrfError === '1',
    breadcrumbs: [{ label: 'Contact' }],
  });
});

// POST /contact
exports.submitContact = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render('pages/contact', {
      title: 'Contact Us',
      metaDescription: `Get in touch with ${res.locals.company.name} — visit us, call, WhatsApp, or send a message.`,
      breadcrumbs: [{ label: 'Contact' }],
      errors: errors.array(),
      formData: req.body,
    });
  }

  await messageService.createMessage(req.body);
  res.redirect('/contact?sent=1');
});

// GET /request-quote
exports.renderRequestQuote = asyncHandler(async (req, res) => {
  const products = await productService.getAllForSelect();
  const preselected = req.query.product ? await productService.getProductBySlug(req.query.product) : null;
  const items = [{ productId: preselected ? preselected.id : '', customName: '', quantity: 1 }];

  res.render('pages/request-quote', {
    title: 'Request a Quote',
    metaDescription: `Request a quote for medical equipment from ${res.locals.company.name}.`,
    sent: req.query.sent === '1',
    csrfError: req.query.csrfError === '1',
    products,
    items,
    breadcrumbs: [{ label: 'Request a Quote' }],
  });
});

// Top-level quote fields with a simple express-validator `path` — rendered
// as inline field errors. Anything else (the items array checks, which have
// index-qualified paths like "items[0].quantity") is shown in a summary
// alert instead, so a validation failure there is never silently dropped.
const QUOTE_SIMPLE_FIELDS = ['customerName', 'phone', 'email', 'hospital', 'company', 'notes'];

// POST /request-quote
exports.submitRequestQuote = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const products = await productService.getAllForSelect();
    const items = [].concat(req.body.items || []).length
      ? [].concat(req.body.items || [])
      : [{ productId: '', customName: '', quantity: 1 }];
    const allErrors = errors.array();
    return res.status(422).render('pages/request-quote', {
      title: 'Request a Quote',
      metaDescription: `Request a quote for medical equipment from ${res.locals.company.name}.`,
      breadcrumbs: [{ label: 'Request a Quote' }],
      errors: allErrors,
      generalErrors: allErrors.filter((e) => !QUOTE_SIMPLE_FIELDS.includes(e.path)),
      formData: req.body,
      products,
      items,
    });
  }

  const items = [].concat(req.body.items || []).map((item) => ({
    productId: item.productId && item.productId !== 'custom' ? item.productId : null,
    customName: item.customName,
    quantity: Number(item.quantity) || 1,
  }));

  await quoteService.createQuoteRequest({ ...req.body, items });
  res.redirect('/request-quote?sent=1');
});
