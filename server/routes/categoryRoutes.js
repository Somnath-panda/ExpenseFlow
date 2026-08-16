const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// GET /api/categories
router.get('/', categoryController.getCategories);

module.exports = router;
