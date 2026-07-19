const { body } = require('express-validator');

const productValidator = [
  body('name').trim().notEmpty().withMessage('Product name is required.').isLength({ max: 150 }),
  body('categoryId').trim().notEmpty().withMessage('Category is required.'),
  body('brandId').optional({ checkFalsy: true }).trim(),
  body('sku').optional({ checkFalsy: true }).trim().isLength({ max: 60 }),
  body('description').optional({ checkFalsy: true }).trim().isLength({ max: 5000 }),
  body('specifications').optional({ checkFalsy: true }).trim().isLength({ max: 5000 }),
  body('price').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
  body('availability')
    .isIn(['IN_STOCK', 'OUT_OF_STOCK', 'PREORDER'])
    .withMessage('Please select a valid availability status.'),
];

module.exports = productValidator;
