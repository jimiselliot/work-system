const auditDao = require('../dao/auditDao');

const auditController = {
  getAllAuditLogs: async (req, res) => {
    try {
      // ✅ FIXED
      if (req.user.role_id !== 1) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin only.'
        });
      }

      const logs = await auditDao.getAllAuditLogs();
      res.json({ success: true, data: logs });

    } catch (error) {
      console.error('Get audit logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching audit logs'
      });
    }
  },

  getAuditLogById: async (req, res) => {
    try {
      // ✅ FIXED
      if (req.user.role_id !== 1) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin only.'
        });
      }

      const log = await auditDao.getAuditLogById(req.params.id);
      if (!log) {
        return res.status(404).json({
          success: false,
          message: 'Audit log not found'
        });
      }

      res.json({ success: true, data: log });

    } catch (error) {
      console.error('Get audit log error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching audit log'
      });
    }
  },

  deleteAuditLog: async (req, res) => {
    try {
      // ✅ FIXED
      if (req.user.role_id !== 1) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin only.'
        });
      }

      const deleted = await auditDao.deleteAuditLog(req.params.id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Audit log not found'
        });
      }

      res.json({
        success: true,
        message: 'Audit log deleted successfully'
      });

    } catch (error) {
      console.error('Delete audit log error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting audit log'
      });
    }
  }
};

module.exports = auditController;
