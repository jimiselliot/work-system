const { pool } = require('../config/db');

const userDao = {
  // ==============================
  // GET ALL USERS (WITH ROLE NAMES)
  // ==============================
  getAllUsers: async () => {
    try {
      const [rows] = await pool.execute(
        `SELECT 
           u.id, 
           u.username, 
           u.email, 
           u.role_id,
           r.name as role_name,
           u.status, 
           u.created_at, 
           u.updated_at, 
           u.last_login
         FROM users u
         LEFT JOIN roles r ON u.role_id = r.id
         ORDER BY u.created_at DESC`
      );
      return rows;
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  },

  // ==============================
  // GET ALL ROLES (FOR DROPDOWN)
  // ==============================
  getAllRoles: async () => {
    try {
      const [rows] = await pool.execute(
        `SELECT id, name 
         FROM roles 
         ORDER BY id`
      );
      return rows;
    } catch (error) {
      console.error('Error getting all roles:', error);
      return [];
    }
  },

  // ==============================
  // GET USER BY EMAIL (AUTH)
  // ==============================
  getUserByEmail: async (email) => {
    try {
      const [rows] = await pool.execute(
        `SELECT 
           id, username, email, password, role_id, status, created_at, last_login
         FROM users 
         WHERE email = ?`,
        [email]
      );
      return rows[0];
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  },

  // ==============================
  // GET USER BY ID
  // ==============================
  getUserById: async (id) => {
    try {
      const [rows] = await pool.execute(
        `SELECT 
           id, username, email, role_id, status, created_at, last_login
         FROM users 
         WHERE id = ?`,
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error('Error getting user by id:', error);
      return null;
    }
  },

  // ==============================
  // CREATE USER (AUTH / ADMIN)
  // ==============================
  createUser: async (userData) => {
    try {
      const { username, email, password, role_id = 2, status = 'active' } = userData;

      const [result] = await pool.execute(
        `INSERT INTO users (username, email, password, role_id, status)
         VALUES (?, ?, ?, ?, ?)`,
        [username, email, password, role_id, status]
      );

      return result.insertId;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  // ==============================
  // REQUIRED BY 
  // ==============================
  findByEmail: async (email) => {
    return userDao.getUserByEmail(email);
  },

  findById: async (id) => {
    return userDao.getUserById(id);
  },

  create: async (userData) => {
    try {
      let username, email, password, role_id, status;
      
      if (userData.name && userData.passwordHash) {
        username = userData.name;
        email = userData.email;
        password = userData.passwordHash;
        role_id = userData.role === 'admin' ? 1 : 2;
        status = userData.status || 'active';
      } else {
        username = userData.username;
        email = userData.email;
        password = userData.password;
        role_id = userData.role_id || (userData.role === 'admin' ? 1 : 2);
        status = userData.status || 'active';
      }

      const [result] = await pool.execute(
        `INSERT INTO users (username, email, password, role_id, status)
         VALUES (?, ?, ?, ?, ?)`,
        [username, email, password, role_id, status]
      );

      return {
        id: result.insertId,
        username: username,
        email: email,
        role_id: role_id,
        status: status,
        created_at: new Date()
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  // ==============================
  // UPDATE USER userController
  // ==============================
  update: async (id, userData) => {
    try {
      const fields = [];
      const values = [];

      Object.keys(userData).forEach(key => {
        let dbField = key;
        let dbValue = userData[key];

        if (key === 'name') {
          dbField = 'username';
        }

        if (key === 'role') {
          dbField = 'role_id';
          dbValue = userData[key] === 'admin' ? 1 : 2;
        }

        if (key === 'role_id') {
          dbValue = parseInt(dbValue) || 2;
        }

        fields.push(`${dbField} = ?`);
        values.push(dbValue);
      });

      if (!fields.includes('updated_at = ?')) {
        fields.push('updated_at = ?');
        values.push(new Date());
      }

      values.push(id);

      const [result] = await pool.execute(
        `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
        values
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },

  // ==============================
  // DELETE SINGLE USER
  // ==============================
  delete: async (id) => {
    try {
      const [result] = await pool.execute(
        'DELETE FROM users WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },

  // ==============================
  // BULK DELETE USERS
  // ==============================
  bulkDelete: async (ids) => {
    try {
      if (!ids || ids.length === 0) return 0;

      const placeholders = ids.map(() => '?').join(',');

      const [result] = await pool.execute(
        `DELETE FROM users WHERE id IN (${placeholders})`,
        ids
      );

      return result.affectedRows;
    } catch (error) {
      console.error('Error bulk deleting users:', error);
      throw error;
    }
  }
};

module.exports = userDao;