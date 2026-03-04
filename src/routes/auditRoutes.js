const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authenticate } = require('../middleware/authMiddleware');

// @route   GET /api/audit
// @desc    Get all audit logs
// @access  Private (Admin only)
router.get('/', authenticate, auditController.getAllAuditLogs);

// @route   GET /api/audit/:id
// @desc    Get audit log by ID
// @access  Private (Admin only)
router.get('/:id', authenticate, auditController.getAuditLogById);

// @route   DELETE /api/audit/:id
// @desc    Delete audit log
// @access  Private (Admin only)
router.delete('/:id', authenticate, auditController.deleteAuditLog);

module.exports = router;