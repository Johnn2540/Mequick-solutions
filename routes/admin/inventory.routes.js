const express = require('express');
const router = express.Router();

const validate = require('../../middleware/validate');
const { requireRole } = require('../../middleware/auth');
const { csrfProtection } = require('../../middleware/csrf');
const { stockUpdateValidator, availabilityValidator } = require('../../validators/inventory.validator');
const controller = require('../../controllers/admin/inventory.controller');

// Viewing inventory is open to any authenticated admin-side role, same as
// Products/Categories. Only the two mutating actions below are restricted —
// mirrors the existing requireRole('SUPER_ADMIN', 'ADMIN') precedent on
// product delete, with INVENTORY_MANAGER added since that role exists
// specifically for this.
router.get('/', controller.list);
router.get('/:id/history', controller.history);

router.post(
  '/:id/stock',
  csrfProtection,
  requireRole('SUPER_ADMIN', 'ADMIN', 'INVENTORY_MANAGER'),
  stockUpdateValidator,
  validate,
  controller.updateStock
);

router.post(
  '/:id/availability',
  csrfProtection,
  requireRole('SUPER_ADMIN', 'ADMIN', 'INVENTORY_MANAGER'),
  availabilityValidator,
  validate,
  controller.updateAvailability
);

module.exports = router;
