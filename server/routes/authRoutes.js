const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Public authentication routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected authentication route
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
