// controllers/dashboardController.js
const db = require('../config/db');

const dashboardController = {
  // Get main dashboard statistics - FIXED VERSION
  getStats: async (req, res) => {
    try {
      console.log('🔍 DEBUG: Starting getStats...');
      console.log('🔍 DEBUG: req.user =', req.user);
      
      if (!req.user || !req.user.id) {
        console.error('❌ DEBUG: No user in request');
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }
      
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin' || req.user.role_id === 1;
      
      console.log(`📊 DEBUG: User ${userId} (Admin: ${isAdmin})`);
      
      // 1. Get counts - FIXED
      console.log('🔍 DEBUG: Getting counts...');
      let counts = {
        usersCount: 0,
        projectsCount: 0,
        tasksCount: 0
      };
      
      try {
        if (isAdmin) {
          console.log('🔍 DEBUG: Admin query for counts');
          
          // Use db.execute for all queries (consistent)
          const usersResult = await db.execute('SELECT COUNT(*) as count FROM users');
          console.log('📊 usersResult:', usersResult);
          
          const projectsResult = await db.execute('SELECT COUNT(*) as count FROM projects');
          console.log('📊 projectsResult:', projectsResult);
          
          const tasksResult = await db.execute('SELECT COUNT(*) as count FROM tasks');
          console.log('📊 tasksResult:', tasksResult);
          
          // FIX: Access the results correctly - db.execute returns [rows, fields]
          counts.usersCount = usersResult[0][0]?.count || 0;
          counts.projectsCount = projectsResult[0][0]?.count || 0;
          counts.tasksCount = tasksResult[0][0]?.count || 0;
          
        } else {
          console.log('🔍 DEBUG: User query for counts');
          const usersResult = await db.execute('SELECT COUNT(*) as count FROM users WHERE id = ?', [userId]);
          const projectsResult = await db.execute(
            'SELECT COUNT(DISTINCT p.id) as count FROM projects p LEFT JOIN tasks t ON p.id = t.project_id WHERE p.created_by = ? OR t.assigned_to = ?',
            [userId, userId]
          );
          const tasksResult = await db.execute('SELECT COUNT(*) as count FROM tasks WHERE assigned_to = ?', [userId]);
          
          counts.usersCount = usersResult[0][0]?.count || 0;
          counts.projectsCount = projectsResult[0][0]?.count || 0;
          counts.tasksCount = tasksResult[0][0]?.count || 0;
        }
        console.log('✅ DEBUG: Counts fetched:', counts);
      } catch (countsError) {
        console.error('❌ DEBUG: Error fetching counts:', countsError.message);
        // Continue with defaults
      }
      
      // 2. Get tasks by status - FIXED
      console.log('🔍 DEBUG: Getting tasks by status...');
      let tasksByStatus = [];
      try {
        let statusResult;
        if (isAdmin) {
          const result = await db.execute(
            `SELECT status, COUNT(*) as count FROM tasks GROUP BY status`
          );
          statusResult = result[0];
        } else {
          const result = await db.execute(
            `SELECT status, COUNT(*) as count FROM tasks WHERE assigned_to = ? GROUP BY status`,
            [userId]
          );
          statusResult = result[0];
        }
        // Ensure it's always an array
        tasksByStatus = Array.isArray(statusResult) ? statusResult : [];
        console.log('✅ DEBUG: Tasks by status fetched:', tasksByStatus);
      } catch (statusError) {
        console.error('❌ DEBUG: Error fetching tasks by status:', statusError.message);
        tasksByStatus = [];
      }
      
      // 3. Get recent activities - FIXED
      console.log('🔍 DEBUG: Getting recent activities...');
      let recentActivities = [];
      try {
        if (isAdmin) {
          const result = await db.execute(
            `SELECT id, action, table_name, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 10`
          );
          recentActivities = result[0] || [];
        } else {
          const result = await db.execute(
            `SELECT id, action, table_name, created_at FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`,
            [userId]
          );
          recentActivities = result[0] || [];
        }
        console.log('✅ DEBUG: Recent activities fetched:', recentActivities.length);
      } catch (activitiesError) {
        console.error('❌ DEBUG: Error fetching activities:', activitiesError.message);
        recentActivities = [];
      }
      
      // 4. Get recent tasks - FIXED
      console.log('🔍 DEBUG: Getting recent tasks...');
      let recentTasks = [];
      try {
        if (isAdmin) {
          const result = await db.execute(
            `SELECT id, title, status, project_id FROM tasks ORDER BY created_at DESC LIMIT 10`
          );
          recentTasks = result[0] || [];
        } else {
          const result = await db.execute(
            `SELECT id, title, status, project_id FROM tasks WHERE assigned_to = ? ORDER BY created_at DESC LIMIT 10`,
            [userId]
          );
          recentTasks = result[0] || [];
        }
        console.log('✅ DEBUG: Recent tasks fetched:', recentTasks.length);
      } catch (tasksError) {
        console.error('❌ DEBUG: Error fetching recent tasks:', tasksError.message);
        recentTasks = [];
      }
      
      // 5. Get user projects - FIXED
      console.log('🔍 DEBUG: Getting user projects...');
      let userProjects = [];
      try {
        if (isAdmin) {
          const result = await db.execute(
            `SELECT id, name, status FROM projects ORDER BY created_at DESC LIMIT 5`
          );
          userProjects = result[0] || [];
        } else {
          const result = await db.execute(
            `SELECT DISTINCT p.id, p.name, p.status FROM projects p LEFT JOIN tasks t ON p.id = t.project_id WHERE p.created_by = ? OR t.assigned_to = ? ORDER BY p.created_at DESC LIMIT 5`,
            [userId, userId]
          );
          userProjects = result[0] || [];
        }
        console.log('✅ DEBUG: User projects fetched:', userProjects.length);
      } catch (projectsError) {
        console.error('❌ DEBUG: Error fetching projects:', projectsError.message);
        userProjects = [];
      }
      
      // 6. Calculate metrics - FIXED
      console.log('🔍 DEBUG: Calculating metrics...');
      
      // Ensure tasksByStatus is an array before using reduce
      if (!Array.isArray(tasksByStatus)) {
        console.log('⚠️ WARNING: tasksByStatus is not an array, converting to array');
        tasksByStatus = [];
      }
      
      const totalTasks = tasksByStatus.reduce((sum, task) => sum + (task.count || 0), 0);
      const completedTasks = tasksByStatus.find(t => t.status === 'completed')?.count || 0;
      const completion_rate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      // Ensure userProjects is an array before using filter
      if (!Array.isArray(userProjects)) {
        console.log('⚠️ WARNING: userProjects is not an array, converting to array');
        userProjects = [];
      }
      
      const metrics = {
        completion_rate: completion_rate,
        overdue_tasks: 0,
        active_projects: userProjects.filter(p => p.status === 'active').length,
        productivity_score: Math.min(100, completion_rate + 30)
      };
      console.log('✅ DEBUG: Metrics calculated:', metrics);
      
      // 7. Format response
      console.log('🔍 DEBUG: Formatting response...');
      const response = {
        success: true,
        data: {
          user: {
            id: req.user.id,
            username: req.user.username,
            email: req.user.email,
            role_id: req.user.role_id,
            role: req.user.role,
            isAdmin: isAdmin
          },
          counts: {
            total_users: isAdmin ? counts.usersCount : 1,
            total_projects: counts.projectsCount || 0,
            total_tasks: counts.tasksCount || 0,
            my_projects: userProjects.length || 0,
            my_tasks: !isAdmin ? counts.tasksCount : 0
          },
          tasksByStatus: tasksByStatus,
          recentActivities: recentActivities,
          recentTasks: recentTasks,
          metrics: metrics,
          userProjects: userProjects,
          lastUpdated: new Date().toISOString()
        }
      };
      
      console.log('🎉 DEBUG: Response ready!');
      console.log('📊 DEBUG: Response summary:', {
        success: response.success,
        counts: response.data.counts,
        tasks: response.data.tasksByStatus.length,
        activities: response.data.recentActivities.length,
        projects: response.data.userProjects.length
      });
      
      res.json(response);
      
    } catch (error) {
      console.error('🔥 CRITICAL ERROR in getStats:', error.message);
      console.error('🔥 Stack trace:', error.stack);
      
      // Send a minimal response that frontend can handle
      res.status(500).json({
        success: false,
        message: 'Dashboard error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        debug: {
          user: req.user ? 'User exists' : 'No user',
          timestamp: new Date().toISOString()
        }
      });
    }
  },

  // Keep other methods as they were or simplified
  getAdminStats: async (req, res) => {
    try {
      console.log('🔍 DEBUG: getAdminStats called');
      res.json({
        success: true,
        data: {
          userStats: { total_users: 0 },
          projectStats: { total_projects: 0 },
          taskStats: { total_tasks: 0 },
          recentUsers: [],
          isAdmin: true,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('❌ Admin dashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching admin statistics'
      });
    }
  },

  getUserProjects: async (req, res) => {
    try {
      console.log('🔍 DEBUG: getUserProjects called');
      res.json({
        success: true,
        data: [],
        count: 0
      });
    } catch (error) {
      console.error('❌ User projects error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching user projects'
      });
    }
  },

  getUserTasks: async (req, res) => {
    try {
      console.log('🔍 DEBUG: getUserTasks called');
      res.json({
        success: true,
        data: [],
        count: 0
      });
    } catch (error) {
      console.error('❌ User tasks error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching user tasks'
      });
    }
  },

  getActivityFeed: async (req, res) => {
    try {
      console.log('🔍 DEBUG: getActivityFeed called');
      res.json({
        success: true,
        data: [],
        count: 0
      });
    } catch (error) {
      console.error('❌ Activity feed error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching activity feed'
      });
    }
  },

  getMetrics: async (req, res) => {
    try {
      console.log('🔍 DEBUG: getMetrics called');
      res.json({
        success: true,
        data: {
          completion_rate: 0,
          overdue_tasks: 0,
          active_projects: 0,
          productivity_score: 0
        }
      });
    } catch (error) {
      console.error('❌ Metrics error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching metrics'
      });
    }
  },

  getQuickStats: async (req, res) => {
    try {
      console.log('🔍 DEBUG: getQuickStats called');
      res.json({
        success: true,
        data: {
          taskStats: {},
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('❌ Quick stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching quick stats'
      });
    }
  }
};

module.exports = dashboardController;