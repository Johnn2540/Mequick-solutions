const { body } = require('express-validator');

const contactValidator = [
  body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 150 }),
  body('email').trim().isEmail().withMessage('Enter a valid email address.'),
  body('phone').optional({ checkFalsy: true }).trim().isLength({ max: 30 }),
  body('subject').optional({ checkFalsy: true }).trim().isLength({ max: 200 }),
  body('message').trim().notEmpty().withMessage('Message is required.').isLength({ max: 5000 }),
];

module.exports = contactValidator;
