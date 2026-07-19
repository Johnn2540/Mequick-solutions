const { body } = require('express-validator');

const quoteValidator = [
  body('customerName').trim().notEmpty().withMessage('Your name is required.').isLength({ max: 150 }),
  body('phone').trim().notEmpty().withMessage('A phone number is required.').isLength({ max: 30 }),
  body('email').optional({ checkFalsy: true }).trim().isEmail().withMessage('Enter a valid email address.'),
  body('hospital').optional({ checkFalsy: true }).trim().isLength({ max: 200 }),
  body('company').optional({ checkFalsy: true }).trim().isLength({ max: 200 }),
  body('notes').optional({ checkFalsy: true }).trim().isLength({ max: 3000 }),
  body('items')
    .custom((items) => {
      if (!Array.isArray(items) || items.length === 0) {
        throw new Error('Please add at least one product to your quote request.');
      }
      const invalid = items.some((item) => !item.productId && !(item.customName && item.customName.trim()));
      if (invalid) {
        throw new Error('Each item needs a product selected from the list, or a name typed in for "Other".');
      }
      return true;
    }),
  body('items.*.quantity').isInt({ min: 1, max: 100000 }).withMessage('Quantity must be a positive whole number.'),
];

module.exports = quoteValidator;
