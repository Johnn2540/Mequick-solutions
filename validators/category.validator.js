const { body } = require('express-validator');

const categoryValidator = [
  body('name').trim().notEmpty().withMessage('Category name is required.').isLength({ max: 120 }),
  body('description').optional({ checkFalsy: true }).trim().isLength({ max: 1000 }),
];

module.exports = categoryValidator;
