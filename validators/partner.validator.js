const { body } = require('express-validator');

const partnerValidator = [
  body('name').trim().notEmpty().withMessage('Partner name is required.').isLength({ max: 120 }),
  body('websiteUrl')
    .optional({ checkFalsy: true })
    .trim()
    .isURL({ require_protocol: true })
    .withMessage('Enter a full website URL, e.g. https://example.com.'),
  body('order').optional({ checkFalsy: true }).isInt().withMessage('Display order must be a whole number.'),
];

module.exports = partnerValidator;
