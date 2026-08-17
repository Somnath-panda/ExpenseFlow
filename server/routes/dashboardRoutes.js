const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');

// All dashboard endpoints require authentication
router.use(authMiddleware);

// Dashboard Endpoints
router.get('/summary', dashboardController.getSummary);
router.get('/category-summary', dashboardController.getCategorySummary);
router.get('/monthly-summary', dashboardController.getMonthlySummary);

module.exports = router;
