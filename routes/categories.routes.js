const express = require('express');
const router = express.Router();
const categoriesController = require('../controllers/categories.controller');

router.get('/', categoriesController.listCategories);
router.get('/:slug', categoriesController.showCategory);

module.exports = router;
