const userDao = require('../dao/userDao');
const { hashPassword } = require('../utils/hash');

const userController = {

  // ✅ GET ALL USERS (FIXED & INSERTED)
  getAllUsers: async (req, res) => {
    try {
      // Get users with role names
      const users = await userDao.getAllUsers();

      // Get roles for dropdown
      const roles = await userDao.getAllRoles();

      // Calculate statistics
      const totalUsers = users.length;
      const adminCount = users.filter(user => user.role_id === 1).length;
      const userCount = users.filter(user => user.role_id === 2).length;

      res.json({
        success: true,
        data: {
          users,
          roles,
          stats: {
            total: totalUsers,
            administrators: adminCount,
            regular_users: userCount
          }
        }
      });

    } catch (error) {
      console.error('Error in getAllUsers controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to load users',
        error: process.env.NODE_ENV === 'development'
          ? error.message
          : undefined
      });
    }
  },

  // ✅ CREATE USER
  createUser: async (req, res) => {
    try {
      console.log('➕ Creating user with data:', req.body);

      const { username, email, password, role_id = 2 } = req.body;

      // Validate required fields
      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username, email, and password are required'
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }

      // Check if user already exists
      const existingUser = await userDao.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const user = await userDao.create({
        username,
        email,
        password: passwordHash,
        role_id
      });

      console.log('✅ User created:', user);

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: user
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating user'
      });
    }
  },

  // ✅ UPDATE USER
  updateUser: async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      console.log('✏️ Updating user', id, 'with data:', updateData);

      // Check if user exists
      const existingUser = await userDao.findById(id);
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Email uniqueness check
      if (updateData.email && updateData.email !== existingUser.email) {
        const userWithEmail = await userDao.findByEmail(updateData.email);
        if (userWithEmail && userWithEmail.id !== parseInt(id)) {
          return res.status(400).json({
            success: false,
            message: 'Email already in use by another user'
          });
        }
      }

      // Email format validation
      if (updateData.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(updateData.email)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid email format'
          });
        }
      }

      // Hash password if present
      if (updateData.password) {
        updateData.password = await hashPassword(updateData.password);
      }

      // Update user
      const updated = await userDao.update(id, updateData);
      if (!updated) {
        return res.status(500).json({
          success: false,
          message: 'Failed to update user'
        });
      }

      const user = await userDao.findById(id);

      console.log('✅ User updated:', user);

      res.json({
        success: true,
        message: 'User updated successfully',
        data: user
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating user'
      });
    }
  },

  // ✅ DELETE USER
  deleteUser: async (req, res) => {
    try {
      const { id } = req.params;

      console.log('🗑️ Deleting user:', id);

      const user = await userDao.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Prevent self deletion
      if (req.user && req.user.id === parseInt(id)) {
        return res.status(400).json({
          success: false,
          message: 'You cannot delete your own account'
        });
      }

      await userDao.delete(id);

      console.log('✅ User deleted:', id);

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting user'
      });
    }
  },

  // ✅ BULK DELETE USERS
  bulkDeleteUsers: async (req, res) => {
    try {
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No users selected'
        });
      }

      if (req.user && ids.includes(req.user.id.toString())) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete your own account in bulk operation'
        });
      }

      const deletedCount = await userDao.bulkDelete(ids);

      console.log(`✅ ${deletedCount} users deleted`);

      res.json({
        success: true,
        message: `${deletedCount} user(s) deleted successfully`,
        count: deletedCount
      });
    } catch (error) {
      console.error('Bulk delete error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting users'
      });
    }
  },

  // ✅ EXPORT USERS
  exportUsers: async (req, res) => {
    try {
      const users = await userDao.getAllUsers();

      const csvData = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role_id === 1 ? 'Administrator' : 'Regular User',
        status: user.status || 'active',
        created_at: user.created_at,
        last_login: user.last_login || 'Never'
      }));

      res.json({
        success: true,
        data: csvData
      });
    } catch (error) {
      console.error('Export users error:', error);
      res.status(500).json({
        success: false,
        message: 'Error exporting users'
      });
    }
  }
};

module.exports = userController;
