const { body } = require('express-validator');

const brandValidator = [body('name').trim().notEmpty().withMessage('Brand name is required.').isLength({ max: 120 })];

module.exports = brandValidator;
