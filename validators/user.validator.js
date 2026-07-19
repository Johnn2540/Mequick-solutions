const { body } = require('express-validator');
const { PASSWORD_COMPLEXITY_REGEX, PASSWORD_COMPLEXITY_MESSAGE } = require('./auth.validator');

const VALID_ROLES = ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'SALES_STAFF', 'INVENTORY_MANAGER', 'CONTENT_MANAGER'];

const createUserValidator = [
  body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 120 }),
  body('email').trim().isEmail().withMessage('Enter a valid email address.'),
  body('password').matches(PASSWORD_COMPLEXITY_REGEX).withMessage(PASSWORD_COMPLEXITY_MESSAGE),
  body('role').isIn(VALID_ROLES).withMessage('Select a valid role.'),
];

const updateUserValidator = [
  body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 120 }),
  body('email').trim().isEmail().withMessage('Enter a valid email address.'),
  body('role').isIn(VALID_ROLES).withMessage('Select a valid role.'),
];

module.exports = { createUserValidator, updateUserValidator, VALID_ROLES };
