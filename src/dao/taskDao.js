const db = require('../config/db');

const taskDao = {
  getAllTasks: async () => {
    try {
      console.log('Fetching all tasks...');
      
      const rows = await db.query(`
        SELECT t.*, 
               p.name as project_name, 
               u1.username as assigned_to_name,
               u1.email as assigned_to_email,
               u2.username as created_by_name,
               u2.email as created_by_email
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN users u1 ON t.assigned_to = u1.id
        LEFT JOIN users u2 ON t.created_by = u2.id
        ORDER BY t.created_at DESC
      `);
      
      console.log(`Retrieved ${rows.length} tasks`);
      return rows;
    } catch (error) {
      console.error('Error getting all tasks:', error);
      throw error;
    }
  },

  getTaskById: async (id) => {
    try {
      console.log(`Fetching task by ID: ${id}`);
      
      const rows = await db.query(`
        SELECT t.*, 
               p.name as project_name, 
               u1.username as assigned_to_name,
               u1.email as assigned_to_email,
               u2.username as created_by_name,
               u2.email as created_by_email
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN users u1 ON t.assigned_to = u1.id
        LEFT JOIN users u2 ON t.created_by = u2.id
        WHERE t.id = ?
      `, [id]);
      
      return rows[0] || null;
    } catch (error) {
      console.error(`Error getting task by id ${id}:`, error);
      throw error;
    }
  },

  createTask: async (taskData) => {
    try {
      console.log('Creating task with data:', taskData);
      
      const { project_id, title, description, status, priority, assigned_to, due_date, created_by } = taskData;
      
      const result = await db.query(
        'INSERT INTO tasks (project_id, title, description, status, priority, assigned_to, due_date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [project_id || null, title, description || '', status, priority, assigned_to || null, due_date || null, created_by]
      );
      
      console.log(`Task created with ID: ${result.insertId}`);
      return result.insertId;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  },

  updateTask: async (id, taskData) => {
    try {
      console.log(`Updating task ${id} with data:`, taskData);
      
      const { project_id, title, description, status, priority, assigned_to, due_date } = taskData;
      
      const result = await db.query(
        'UPDATE tasks SET project_id = ?, title = ?, description = ?, status = ?, priority = ?, assigned_to = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [project_id || null, title, description || '', status, priority, assigned_to || null, due_date || null, id]
      );
      
      console.log(`Task ${id} updated, affected rows: ${result.affectedRows}`);
      return result.affectedRows > 0;
    } catch (error) {
      console.error(`Error updating task ${id}:`, error);
      throw error;
    }
  },

  deleteTask: async (id) => {
    try {
      console.log(`Deleting task ${id}`);
      
      const result = await db.query('DELETE FROM tasks WHERE id = ?', [id]);
      
      console.log(`Task ${id} deleted, affected rows: ${result.affectedRows}`);
      return result.affectedRows > 0;
    } catch (error) {
      console.error(`Error deleting task ${id}:`, error);
      throw error;
    }
  },

  getTasksByProjectId: async (projectId) => {
    try {
      console.log(`Fetching tasks for project ${projectId}`);
      
      const rows = await db.query(
        'SELECT t.*, u.username as assigned_to_name, u.email as assigned_to_email FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.project_id = ? ORDER BY t.created_at DESC',
        [projectId]
      );
      
      console.log(`Retrieved ${rows.length} tasks for project ${projectId}`);
      return rows;
    } catch (error) {
      console.error(`Error getting tasks by project id ${projectId}:`, error);
      throw error;
    }
  },

  getTasksByUserId: async (userId) => {
    try {
      console.log(`Fetching tasks for user ${userId}`);
      
      const rows = await db.query(
        'SELECT t.*, p.name as project_name FROM tasks t LEFT JOIN projects p ON t.project_id = p.id WHERE t.assigned_to = ? ORDER BY t.created_at DESC',
        [userId]
      );
      
      console.log(`Retrieved ${rows.length} tasks for user ${userId}`);
      return rows;
    } catch (error) {
      console.error(`Error getting tasks by user id ${userId}:`, error);
      throw error;
    }
  },

  getTasksByStatus: async (status) => {
    try {
      console.log(`Fetching tasks with status: ${status}`);
      
      const rows = await db.query(
        `SELECT t.*, 
                p.name as project_name, 
                u.username as assigned_to_name 
         FROM tasks t 
         LEFT JOIN projects p ON t.project_id = p.id 
         LEFT JOIN users u ON t.assigned_to = u.id 
         WHERE t.status = ? 
         ORDER BY t.created_at DESC`,
        [status]
      );
      
      console.log(`Retrieved ${rows.length} tasks with status ${status}`);
      return rows;
    } catch (error) {
      console.error(`Error getting tasks by status ${status}:`, error);
      throw error;
    }
  }
};

module.exports = taskDao;