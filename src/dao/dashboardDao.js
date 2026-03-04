
const db = require('../config/db');

const dashboardDao = {
  // Get counts for dashboard
  getCounts: async (userId, isAdmin) => {
    try {
      if (isAdmin) {
        // Admin sees all counts
        const [usersCount] = await db.execute('SELECT COUNT(*) as count FROM users');
        const [projectsCount] = await db.execute('SELECT COUNT(*) as count FROM projects');
        const [tasksCount] = await db.execute('SELECT COUNT(*) as count FROM tasks');
        
        return {
          usersCount: usersCount[0]?.count || 0,
          projectsCount: projectsCount[0]?.count || 0,
          tasksCount: tasksCount[0]?.count || 0
        };
      } else {
        // Regular user sees only their data
        const [usersCount] = await db.execute('SELECT COUNT(*) as count FROM users WHERE id = ?', [userId]);
        
        const [projectsCount] = await db.execute(`
          SELECT COUNT(DISTINCT p.id) as count 
          FROM projects p
          LEFT JOIN tasks t ON p.id = t.project_id
          WHERE p.created_by = ? OR t.assigned_to = ?
        `, [userId, userId]);
        
        const [tasksCount] = await db.execute('SELECT COUNT(*) as count FROM tasks WHERE assigned_to = ?', [userId]);
        
        return {
          usersCount: usersCount[0]?.count || 0,
          projectsCount: projectsCount[0]?.count || 0,
          tasksCount: tasksCount[0]?.count || 0
        };
      }
    } catch (error) {
      throw new Error(`Error getting counts: ${error.message}`);
    }
  },

  // Get tasks by status
  // daos/dashboardDao.js - UPDATED getRecentActivities method
getRecentActivities: async (userId, isAdmin, limit = 10) => {
  try {
    let query, params;
    
    // Check if audit_logs table exists
    const [tables] = await db.execute(
      `SELECT TABLE_NAME FROM information_schema.TABLES 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'audit_logs'`,
      [process.env.DB_NAME || 'work_system']
    );
    
    // If audit_logs table doesn't exist, return empty array
    if (tables.length === 0) {
      console.log('⚠️ audit_logs table does not exist, returning empty activities');
      return [];
    }
    
    if (isAdmin) {
      query = `
        SELECT 
          al.id,
          al.action,
          al.table_name,
          al.record_id,
          al.old_value,
          al.new_value,
          al.created_at,
          u.username,
          u.email,
          u.role_id
        FROM audit_logs al 
        LEFT JOIN users u ON al.user_id = u.id 
        ORDER BY al.created_at DESC 
        LIMIT ?
      `;
      params = [limit];
    } else {
      query = `
        SELECT 
          al.id,
          al.action,
          al.table_name,
          al.record_id,
          al.old_value,
          al.new_value,
          al.created_at,
          u.username,
          u.email,
          u.role_id
        FROM audit_logs al 
        LEFT JOIN users u ON al.user_id = u.id 
        WHERE al.user_id = ? 
          OR (al.table_name = 'tasks' AND al.record_id IN (
            SELECT id FROM tasks WHERE assigned_to = ?
          ))
          OR (al.table_name = 'projects' AND al.record_id IN (
            SELECT id FROM projects WHERE created_by = ?
          ))
        ORDER BY al.created_at DESC 
        LIMIT ?
      `;
      params = [userId, userId, userId, limit];
    }
    
    const [activities] = await db.execute(query, params);
    return activities;
  } catch (error) {
    console.error('❌ Error getting recent activities:', error.message);
    // Return empty array instead of throwing to prevent dashboard crash
    return [];
  }
},

  // Get recent tasks
  getRecentTasks: async (userId, isAdmin, limit = 10) => {
    try {
      let query, params;
      
      if (isAdmin) {
        query = `
          SELECT 
            t.id,
            t.title,
            t.description,
            t.status,
            t.priority,
            t.due_date,
            t.created_at,
            t.updated_at,
            p.name as project_name,
            p.id as project_id,
            u.username as assigned_to_name,
            u.email as assigned_to_email,
            uc.username as created_by_name
          FROM tasks t
          LEFT JOIN projects p ON t.project_id = p.id
          LEFT JOIN users u ON t.assigned_to = u.id
          LEFT JOIN users uc ON t.created_by = uc.id
          ORDER BY t.created_at DESC
          LIMIT ?
        `;
        params = [limit];
      } else {
        query = `
          SELECT 
            t.id,
            t.title,
            t.description,
            t.status,
            t.priority,
            t.due_date,
            t.created_at,
            t.updated_at,
            p.name as project_name,
            p.id as project_id,
            u.username as assigned_to_name,
            u.email as assigned_to_email,
            uc.username as created_by_name
          FROM tasks t
          LEFT JOIN projects p ON t.project_id = p.id
          LEFT JOIN users u ON t.assigned_to = u.id
          LEFT JOIN users uc ON t.created_by = uc.id
          WHERE t.assigned_to = ? OR p.created_by = ?
          ORDER BY t.created_at DESC
          LIMIT ?
        `;
        params = [userId, userId, limit];
      }
      
      const [tasks] = await db.execute(query, params);
      return tasks;
    } catch (error) {
      throw new Error(`Error getting recent tasks: ${error.message}`);
    }
  },

  // Get user projects
  getUserProjects: async (userId, isAdmin, limit = 5) => {
    try {
      let query, params;
      
      if (isAdmin) {
        query = `
          SELECT 
            p.*,
            u.username as created_by_name,
            u.email as created_by_email,
            COUNT(t.id) as task_count,
            SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
            SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks
          FROM projects p
          LEFT JOIN users u ON p.created_by = u.id
          LEFT JOIN tasks t ON p.id = t.project_id
          GROUP BY p.id
          ORDER BY p.created_at DESC
          LIMIT ?
        `;
        params = [limit];
      } else {
        query = `
          SELECT 
            p.*,
            u.username as created_by_name,
            u.email as created_by_email,
            COUNT(t.id) as task_count,
            SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
            SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks
          FROM projects p
          LEFT JOIN users u ON p.created_by = u.id
          LEFT JOIN tasks t ON p.id = t.project_id
          WHERE p.created_by = ? OR p.id IN (
            SELECT DISTINCT project_id FROM tasks WHERE assigned_to = ?
          )
          GROUP BY p.id
          ORDER BY p.created_at DESC
          LIMIT ?
        `;
        params = [userId, userId, limit];
      }
      
      const [projects] = await db.execute(query, params);
      return projects;
    } catch (error) {
      throw new Error(`Error getting user projects: ${error.message}`);
    }
  },

  // Get dashboard metrics
  getDashboardMetrics: async (userId, isAdmin) => {
    try {
      const metrics = {
        completion_rate: 0,
        overdue_tasks: 0,
        active_projects: 0,
        productivity_score: 0
      };

      // Calculate completion rate
      const tasksByStatus = await dashboardDao.getTasksByStatus(userId, isAdmin);
      const totalTasks = tasksByStatus.reduce((sum, task) => sum + task.count, 0);
      const completedTasks = tasksByStatus.find(t => t.status === 'completed')?.count || 0;
      metrics.completion_rate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Calculate overdue tasks
      const today = new Date().toISOString().split('T')[0];
      if (isAdmin) {
        const [overdueResult] = await db.execute(`
          SELECT COUNT(*) as count 
          FROM tasks 
          WHERE due_date < ? AND status NOT IN ('completed', 'cancelled')
        `, [today]);
        metrics.overdue_tasks = overdueResult[0]?.count || 0;
      } else {
        const [overdueResult] = await db.execute(`
          SELECT COUNT(*) as count 
          FROM tasks 
          WHERE assigned_to = ? AND due_date < ? AND status NOT IN ('completed', 'cancelled')
        `, [userId, today]);
        metrics.overdue_tasks = overdueResult[0]?.count || 0;
      }

      // Get active projects
      if (isAdmin) {
        const [activeProjects] = await db.execute(`
          SELECT COUNT(*) as count 
          FROM projects 
          WHERE status = 'active'
        `);
        metrics.active_projects = activeProjects[0]?.count || 0;
      } else {
        const [activeProjects] = await db.execute(`
          SELECT COUNT(DISTINCT p.id) as count 
          FROM projects p
          LEFT JOIN tasks t ON p.id = t.project_id
          WHERE p.status = 'active' AND (p.created_by = ? OR t.assigned_to = ?)
        `, [userId, userId]);
        metrics.active_projects = activeProjects[0]?.count || 0;
      }

      // Calculate productivity score (simple formula)
      metrics.productivity_score = Math.min(100, Math.max(0, Math.round(
        (metrics.completion_rate * 0.6) + 
        ((100 - (metrics.overdue_tasks * 5)) * 0.4)
      )));

      return metrics;
    } catch (error) {
      throw new Error(`Error getting dashboard metrics: ${error.message}`);
    }
  },

  // Admin-specific statistics
  getAdminStats: async () => {
    try {
      // User statistics
      const [userStats] = await db.execute(`
        SELECT 
          COUNT(*) as total_users,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_users,
          SUM(CASE WHEN role = 'admin' OR role_id = 1 THEN 1 ELSE 0 END) as admin_users,
          SUM(CASE WHEN role = 'user' OR role_id = 2 THEN 1 ELSE 0 END) as regular_users
        FROM users
      `);

      // Project statistics
      const [projectStats] = await db.execute(`
        SELECT 
          COUNT(*) as total_projects,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_projects,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_projects,
          SUM(CASE WHEN status = 'on_hold' THEN 1 ELSE 0 END) as on_hold_projects
        FROM projects
      `);

      // Task statistics
      const [taskStats] = await db.execute(`
        SELECT 
          COUNT(*) as total_tasks,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_tasks,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_tasks,
          SUM(CASE WHEN due_date < CURDATE() AND status NOT IN ('completed', 'cancelled') THEN 1 ELSE 0 END) as overdue_tasks
        FROM tasks
      `);

      // Recent users
      const [recentUsers] = await db.execute(`
        SELECT 
          id, 
          username, 
          email, 
          role, 
          role_id,
          status, 
          created_at,
          (SELECT COUNT(*) FROM tasks WHERE assigned_to = users.id) as task_count,
          (SELECT COUNT(*) FROM projects WHERE created_by = users.id) as project_count
        FROM users
        ORDER BY created_at DESC
        LIMIT 5
      `);

      // System performance metrics
      const [systemMetrics] = await db.execute(`
        SELECT 
          (SELECT COUNT(*) FROM audit_logs WHERE DATE(created_at) = CURDATE()) as today_activities,
          (SELECT COUNT(*) FROM tasks WHERE DATE(created_at) = CURDATE()) as today_tasks,
          (SELECT COUNT(*) FROM projects WHERE DATE(created_at) = CURDATE()) as today_projects,
          (SELECT COUNT(*) FROM users WHERE DATE(created_at) = CURDATE()) as today_users
        FROM DUAL
      `);

      return {
        userStats: userStats[0] || {},
        projectStats: projectStats[0] || {},
        taskStats: taskStats[0] || {},
        recentUsers: recentUsers,
        systemMetrics: systemMetrics[0] || {},
        chartData: await dashboardDao.getAdminChartData()
      };
    } catch (error) {
      throw new Error(`Error getting admin stats: ${error.message}`);
    }
  },

  // Get chart data for admin dashboard
  getAdminChartData: async () => {
    try {
      // Last 30 days activity
      const [activityData] = await db.execute(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count,
          SUM(CASE WHEN action = 'CREATE' THEN 1 ELSE 0 END) as creates,
          SUM(CASE WHEN action = 'UPDATE' THEN 1 ELSE 0 END) as updates,
          SUM(CASE WHEN action = 'DELETE' THEN 1 ELSE 0 END) as deletes
        FROM audit_logs
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date
      `);

      // Task completion trend
      const [taskTrend] = await db.execute(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as total,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
        FROM tasks
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date
      `);

      // User registration trend
      const [userTrend] = await db.execute(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as registrations
        FROM users
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date
      `);

      return {
        activityData,
        taskTrend,
        userTrend
      };
    } catch (error) {
      throw new Error(`Error getting chart data: ${error.message}`);
    }
  },

  // Get quick stats (optimized for performance)
  getQuickStats: async (userId, isAdmin) => {
    try {
      let tasksQuery, tasksParams;
      
      if (isAdmin) {
        tasksQuery = `
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN due_date < CURDATE() AND status NOT IN ('completed', 'cancelled') THEN 1 ELSE 0 END) as overdue
          FROM tasks
        `;
        tasksParams = [];
      } else {
        tasksQuery = `
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN due_date < CURDATE() AND status NOT IN ('completed', 'cancelled') THEN 1 ELSE 0 END) as overdue
          FROM tasks
          WHERE assigned_to = ?
        `;
        tasksParams = [userId];
      }
      
      const [taskStats] = await db.execute(tasksQuery, tasksParams);
      
      return {
        taskStats: taskStats[0] || {},
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Error getting quick stats: ${error.message}`);
    }
  }
};

module.exports = dashboardDao;