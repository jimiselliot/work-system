const pool = require('../config/db');

const logAction = async (userId, action, tableName = null, recordId = null) => {
  try {
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)',
      [userId, action, tableName, recordId]
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};

const audit = (action, tableName = null) => {
  return async (req, res, next) => {
    if (req.user) {
      const recordId = req.params.id || null;
      await logAction(req.user.id, action, tableName, recordId);
    }
    next();
  };
};

module.exports = { logAction, audit };