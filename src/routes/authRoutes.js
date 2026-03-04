const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
router.post('/signup', authController.signup);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', authController.login);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticate, authController.getCurrentUser);

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', authenticate, (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

module.exports = router;