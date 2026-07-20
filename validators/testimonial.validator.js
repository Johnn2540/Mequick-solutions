const { body } = require('express-validator');

const testimonialValidator = [
  body('customerName').trim().notEmpty().withMessage('Customer name is required.').isLength({ max: 120 }),
  body('customerTitle').optional({ checkFalsy: true }).trim().isLength({ max: 150 }),
  body('quote').trim().notEmpty().withMessage('Testimonial quote is required.').isLength({ max: 1000 }),
  body('rating')
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5.'),
  body('order').optional({ checkFalsy: true }).isInt().withMessage('Display order must be a whole number.'),
];

module.exports = testimonialValidator;
