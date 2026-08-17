const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const authMiddleware = require('../middleware/authMiddleware');

// All budget endpoints require authentication
router.use(authMiddleware);

// Budget Endpoints
router.get('/', budgetController.getBudget);
router.post('/', budgetController.setBudget);
router.put('/', budgetController.updateBudget);

module.exports = router;
