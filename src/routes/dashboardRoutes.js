// routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Apply authentication middleware to all dashboard routes
router.use(authenticate);

// Main dashboard stats endpoint (accessible to all authenticated users)
router.get('/stats', dashboardController.getStats);

// Admin-only dashboard endpoint
router.get('/admin-stats', authorize(['admin']), dashboardController.getAdminStats);

// Additional dashboard endpoints
router.get('/user-projects', dashboardController.getUserProjects);
router.get('/user-tasks', dashboardController.getUserTasks);
router.get('/activity-feed', dashboardController.getActivityFeed);
router.get('/metrics', dashboardController.getMetrics);

// Quick stats endpoint (lightweight)
router.get('/quick-stats', dashboardController.getQuickStats);

module.exports = router;