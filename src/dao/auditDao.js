const db = require('../config/db');

const auditDao = {
  /**
   * Get all audit logs
   * @returns {Promise<Array>} Array of audit logs
   */
  getAllAuditLogs: async () => {
    try {
      const result = await db.execute(`
        SELECT al.*, u.username 
        FROM audit_logs al 
        LEFT JOIN users u ON al.user_id = u.id 
        ORDER BY al.created_at DESC
      `);
      return result[0] || [];
    } catch (error) {
      console.error('Error getting all audit logs:', error);
      return []; // Return empty array on error
    }
  },

  /**
   * Get audit log by ID
   * @param {number} id - Audit log ID
   * @returns {Promise<Object>} Audit log object or null
   */
  getAuditLogById: async (id) => {
    try {
      const result = await db.execute(
        'SELECT al.*, u.username FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id WHERE al.id = ?',
        [id]
      );
      return result[0]?.[0] || null;
    } catch (error) {
      console.error('Error getting audit log by id:', error);
      return null;
    }
  },

  /**
   * Create a new audit log
   * @param {Object} auditData - Audit log data
   * @param {number} auditData.user_id - User ID
   * @param {string} auditData.action - Action description
   * @param {string} auditData.table_name - Table name
   * @param {number} auditData.record_id - Record ID
   * @returns {Promise<number>} Inserted audit log ID (0 if failed)
   */
  createAuditLog: async (auditData) => {
    try {
      const { user_id, action, table_name, record_id } = auditData;
      const result = await db.execute(
        'INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)',
        [user_id, action, table_name, record_id]
      );
      return result.insertId || 0;
    } catch (error) {
      console.error('Error creating audit log:', error);
      return 0;
    }
  },

  /**
   * Delete an audit log
   * @param {number} id - Audit log ID
   * @returns {Promise<boolean>} True if deleted
   */
  deleteAuditLog: async (id) => {
    try {
      const result = await db.execute('DELETE FROM audit_logs WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting audit log:', error);
      return false;
    }
  },

  /**
   * Get audit logs by user ID
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Array of audit logs
   */
  getAuditLogsByUserId: async (userId) => {
    try {
      const result = await db.execute(
        'SELECT * FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
      return result[0] || [];
    } catch (error) {
      console.error('Error getting audit logs by user id:', error);
      return [];
    }
  },

  /**
   * Get audit logs by table name
   * @param {string} tableName - Table name
   * @returns {Promise<Array>} Array of audit logs
   */
  getAuditLogsByTableName: async (tableName) => {
    try {
      const result = await db.execute(
        'SELECT al.*, u.username FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id WHERE al.table_name = ? ORDER BY al.created_at DESC',
        [tableName]
      );
      return result[0] || [];
    } catch (error) {
      console.error('Error getting audit logs by table name:', error);
      return [];
    }
  },

  /**
   * Get paginated audit logs
   * @param {number} page - Page number (1-based)
   * @param {number} limit - Items per page
   * @returns {Promise<Object>} Paginated audit logs
   */
  getPaginatedAuditLogs: async (page = 1, limit = 20) => {
    try {
      const offset = (page - 1) * limit;
      
      // Get logs for current page
      const logsResult = await db.execute(`
        SELECT al.*, u.username 
        FROM audit_logs al 
        LEFT JOIN users u ON al.user_id = u.id 
        ORDER BY al.created_at DESC
        LIMIT ? OFFSET ?
      `, [limit, offset]);
      
      // Get total count
      const countResult = await db.execute('SELECT COUNT(*) as total FROM audit_logs');
      const total = countResult[0]?.[0]?.total || 0;
      const totalPages = Math.ceil(total / limit);
      
      return {
        logs: logsResult[0] || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      console.error('Error getting paginated audit logs:', error);
      return {
        logs: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      };
    }
  },

  /**
   * Get recent audit logs
   * @param {number} limit - Maximum number of logs to return
   * @returns {Promise<Array>} Array of recent audit logs
   */
  getRecentAuditLogs: async (limit = 50) => {
    try {
      const result = await db.execute(`
        SELECT al.*, u.username 
        FROM audit_logs al 
        LEFT JOIN users u ON al.user_id = u.id 
        ORDER BY al.created_at DESC 
        LIMIT ?
      `, [limit]);
      return result[0] || [];
    } catch (error) {
      console.error('Error getting recent audit logs:', error);
      return [];
    }
  },

  /**
   * Clear old audit logs (older than specified days)
   * @param {number} daysOld - Delete logs older than this many days
   * @returns {Promise<number>} Number of logs deleted
   */
  clearOldAuditLogs: async (daysOld = 90) => {
    try {
      const result = await db.execute(
        'DELETE FROM audit_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
        [daysOld]
      );
      return result.affectedRows || 0;
    } catch (error) {
      console.error('Error clearing old audit logs:', error);
      return 0;
    }
  },

  /**
   * Search audit logs with filters
   * @param {Object} filters - Search filters
   * @param {number} filters.user_id - Optional user ID filter
   * @param {string} filters.table_name - Optional table name filter
   * @param {string} filters.action - Optional action filter
   * @param {Date} filters.startDate - Optional start date
   * @param {Date} filters.endDate - Optional end date
   * @returns {Promise<Array>} Filtered audit logs
   */
  searchAuditLogs: async (filters = {}) => {
    try {
      const { user_id, table_name, action, startDate, endDate } = filters;
      let query = `
        SELECT al.*, u.username 
        FROM audit_logs al 
        LEFT JOIN users u ON al.user_id = u.id 
        WHERE 1=1
      `;
      const params = [];
      
      if (user_id) {
        query += ' AND al.user_id = ?';
        params.push(user_id);
      }
      
      if (table_name) {
        query += ' AND al.table_name = ?';
        params.push(table_name);
      }
      
      if (action) {
        query += ' AND al.action LIKE ?';
        params.push(`%${action}%`);
      }
      
      if (startDate) {
        query += ' AND al.created_at >= ?';
        params.push(startDate);
      }
      
      if (endDate) {
        query += ' AND al.created_at <= ?';
        params.push(endDate);
      }
      
      query += ' ORDER BY al.created_at DESC';
      
      const result = await db.execute(query, params);
      return result[0] || [];
    } catch (error) {
      console.error('Error searching audit logs:', error);
      return [];
    }
  }
};

module.exports = auditDao;
