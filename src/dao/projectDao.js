const db = require('../config/db');

const projectDao = {
  getAllProjects: async () => {
    try {
      console.log('Fetching all projects...');
      
      const rows = await db.query(`
        SELECT 
          p.*, 
          u.username as creator_name,
          u.email as creator_email
        FROM projects p 
        LEFT JOIN users u ON p.created_by = u.id 
        ORDER BY p.created_at DESC
      `);
      
      console.log(`Retrieved ${rows.length} projects`);
      return rows;
    } catch (error) {
      console.error('Error getting all projects:', error);
      throw error;
    }
  },

  getProjectById: async (id) => {
    try {
      console.log(`Fetching project by ID: ${id}`);
      
      const rows = await db.query(
        `SELECT 
          p.*, 
          u.username as creator_name,
          u.email as creator_email 
        FROM projects p 
        LEFT JOIN users u ON p.created_by = u.id 
        WHERE p.id = ?`,
        [id]
      );
      
      return rows[0] || null;
    } catch (error) {
      console.error(`Error getting project by id ${id}:`, error);
      throw error;
    }
  },

  createProject: async (projectData) => {
    try {
      console.log('Creating project with data:', projectData);
      
      const { name, description, status, created_by } = projectData;
      const result = await db.query(
        'INSERT INTO projects (name, description, status, created_by) VALUES (?, ?, ?, ?)',
        [name, description, status, created_by]
      );
      
      console.log(`Project created with ID: ${result.insertId}`);
      return result.insertId;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  },

  updateProject: async (id, projectData) => {
    try {
      console.log(`Updating project ${id} with data:`, projectData);
      
      const { name, description, status } = projectData;
      const result = await db.query(
        'UPDATE projects SET name = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, description, status, id]
      );
      
      console.log(`Project ${id} updated, affected rows: ${result.affectedRows}`);
      return result.affectedRows > 0;
    } catch (error) {
      console.error(`Error updating project ${id}:`, error);
      throw error;
    }
  },

  deleteProject: async (id) => {
    try {
      console.log(`Deleting project ${id}`);
      
      const result = await db.query('DELETE FROM projects WHERE id = ?', [id]);
      
      console.log(`Project ${id} deleted, affected rows: ${result.affectedRows}`);
      return result.affectedRows > 0;
    } catch (error) {
      console.error(`Error deleting project ${id}:`, error);
      throw error;
    }
  },

  getProjectsByUserId: async (userId) => {
    try {
      console.log(`Fetching projects for user ${userId}`);
      
      const rows = await db.query(
        `SELECT 
          p.*, 
          u.username as creator_name,
          u.email as creator_email 
        FROM projects p 
        LEFT JOIN users u ON p.created_by = u.id 
        WHERE p.created_by = ? 
        ORDER BY p.created_at DESC`,
        [userId]
      );
      
      console.log(`Retrieved ${rows.length} projects for user ${userId}`);
      return rows;
    } catch (error) {
      console.error(`Error getting projects by user id ${userId}:`, error);
      throw error;
    }
  },

  checkUserExists: async (userId) => {
    try {
      const rows = await db.query(
        'SELECT id FROM users WHERE id = ? AND status = "active"',
        [userId]
      );
      return rows.length > 0;
    } catch (error) {
      console.error(`Error checking if user ${userId} exists:`, error);
      throw error;
    }
  }
};

module.exports = projectDao;