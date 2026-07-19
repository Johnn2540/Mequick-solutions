const { body } = require('express-validator');

const loginValidator = [
  body('email').trim().isEmail().withMessage('Enter a valid email address.'),
  body('password').notEmpty().withMessage('Password is required.'),
];

// At least 8 characters, one uppercase, one lowercase, one digit, one
// special character — a common baseline complexity policy.
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const PASSWORD_COMPLEXITY_MESSAGE =
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.';

const changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required.'),
  body('newPassword').matches(PASSWORD_COMPLEXITY_REGEX).withMessage(PASSWORD_COMPLEXITY_MESSAGE),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('New password and confirmation do not match.');
    }
    return true;
  }),
];

const profileValidator = [
  body('name').trim().notEmpty().withMessage('Name is required.').isLength({ max: 120 }),
  body('email').trim().isEmail().withMessage('Enter a valid email address.'),
];

module.exports = { loginValidator, changePasswordValidator, profileValidator, PASSWORD_COMPLEXITY_REGEX };
