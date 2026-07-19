const { body } = require('express-validator');

const CHANGE_TYPES = ['RESTOCK', 'SALE', 'ADJUSTMENT', 'CORRECTION'];
const AVAILABILITY_VALUES = ['IN_STOCK', 'OUT_OF_STOCK', 'PREORDER'];

const stockUpdateValidator = [
  body('changeType').isIn(CHANGE_TYPES).withMessage('Select a valid change type.'),
  body('quantityChange')
    .isInt({ min: -100000, max: 100000 })
    .withMessage('Quantity change must be a whole number.')
    .bail()
    .custom((value) => Number(value) !== 0)
    .withMessage('Quantity change cannot be zero.'),
  body('note').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
];

const availabilityValidator = [
  body('availability').isIn(AVAILABILITY_VALUES).withMessage('Select a valid availability status.'),
];

module.exports = { stockUpdateValidator, availabilityValidator, CHANGE_TYPES, AVAILABILITY_VALUES };
