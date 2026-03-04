const taskDao = require('../dao/taskDao');
const db = require('../config/db'); // ✅ added (needed for email lookup)

const taskController = {
  getAllTasks: async (req, res) => {
    try {
      console.log('=== GET ALL TASKS ===');
      console.log('User making request:', req.user);
      
      const tasks = await taskDao.getAllTasks();
      
      console.log(`Found ${tasks ? tasks.length : 0} tasks`);
      
      res.json({
        success: true,
        data: tasks || []
      });
    } catch (error) {
      console.error('❌ Get tasks error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching tasks',
        error: error.message 
      });
    }
  },

  getTaskById: async (req, res) => {
    try {
      const { id } = req.params;
      const task = await taskDao.getTaskById(id);
      
      if (!task) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }
      
      res.json({
        success: true,
        data: task
      });
    } catch (error) {
      console.error('❌ Get task by id error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching task',
        error: error.message 
      });
    }
  },

  // ✅ ONLY THIS FUNCTION IS MODIFIED (email → user id mapping)
  createTask: async (req, res) => {
    try {
      console.log('=== CREATE TASK REQUEST ===');
      console.log('Request body:', req.body);
      console.log('Authenticated user:', req.user);
      
      const {
        project_id,
        title,
        description,
        status = 'pending',
        priority = 'medium',
        assignee_email,   // ✅ new
        assigned_to,      // existing support kept
        due_date
      } = req.body;
      
      // Validate required fields
      if (!title || title.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Task title is required'
        });
      }

      let finalAssignedTo = assigned_to || null;

      // ✅ If assignee_email is provided, resolve user ID
      if (assignee_email && assignee_email.trim() !== '') {
        const users = await db.query(
          'SELECT id FROM users WHERE email = ?',
          [assignee_email.trim()]
        );

        if (users.length > 0) {
          finalAssignedTo = users[0].id;
          console.log(`Found user for email ${assignee_email}: ID ${finalAssignedTo}`);
        } else {
          console.log(`No user found with email: ${assignee_email}`);
          // intentionally NOT throwing error (same behavior you wanted)
        }
      }
      
      const taskId = await taskDao.createTask({
        project_id: project_id || null,
        title: title.trim(),
        description: description ? description.trim() : '',
        status,
        priority,
        assigned_to: finalAssignedTo,
        due_date: due_date || null,
        created_by: req.user.id
      });
      
      console.log('✅ Task created with ID:', taskId);
      
      const newTask = await taskDao.getTaskById(taskId);
      
      res.status(201).json({
        success: true,
        message: 'Task created successfully',
        taskId,
        task: newTask
      });
    } catch (error) {
      console.error('❌ Create task error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error creating task',
        error: error.message 
      });
    }
  },

  updateTask: async (req, res) => {
    try {
      console.log('=== UPDATE TASK REQUEST ===');
      console.log('Task ID:', req.params.id);
      console.log('Request body:', req.body);
      
      const { id } = req.params;
      const { project_id, title, description, status, priority, assigned_to, due_date } = req.body;
      
      const existingTask = await taskDao.getTaskById(id);
      if (!existingTask) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }
      
      if (!title || title.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Task title is required'
        });
      }
      
      await taskDao.updateTask(id, {
        project_id,
        title: title.trim(),
        description: description ? description.trim() : existingTask.description,
        status: status || existingTask.status,
        priority: priority || existingTask.priority,
        assigned_to: assigned_to || existingTask.assigned_to,
        due_date: due_date || existingTask.due_date
      });
      
      const updatedTask = await taskDao.getTaskById(id);
      
      res.json({
        success: true,
        message: 'Task updated successfully',
        task: updatedTask
      });
    } catch (error) {
      console.error('❌ Update task error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error updating task',
        error: error.message 
      });
    }
  },

  deleteTask: async (req, res) => {
    try {
      console.log('=== DELETE TASK REQUEST ===');
      console.log('Task ID:', req.params.id);
      
      const { id } = req.params;
      
      const existingTask = await taskDao.getTaskById(id);
      if (!existingTask) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }
      
      await taskDao.deleteTask(id);
      
      console.log('✅ Task deleted successfully');
      
      res.json({
        success: true,
        message: 'Task deleted successfully'
      });
    } catch (error) {
      console.error('❌ Delete task error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error deleting task',
        error: error.message 
      });
    }
  },

  getTasksByProjectId: async (req, res) => {
    try {
      const { projectId } = req.params;
      const tasks = await taskDao.getTasksByProjectId(projectId);
      
      res.json({
        success: true,
        data: tasks
      });
    } catch (error) {
      console.error('❌ Get tasks by project error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching tasks by project',
        error: error.message 
      });
    }
  },

  getTasksByUserId: async (req, res) => {
    try {
      const { userId } = req.params;
      const tasks = await taskDao.getTasksByUserId(userId);
      
      res.json({
        success: true,
        data: tasks
      });
    } catch (error) {
      console.error('❌ Get tasks by user error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching tasks by user',
        error: error.message 
      });
    }
  },

  getTasksByStatus: async (req, res) => {
    try {
      const { status } = req.params;
      const tasks = await taskDao.getTasksByStatus(status);
      
      res.json({
        success: true,
        data: tasks
      });
    } catch (error) {
      console.error('❌ Get tasks by status error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching tasks by status',
        error: error.message 
      });
    }
  }
};

module.exports = taskController;
/*const taskDao = require('../dao/taskDao');

const taskController = {
  getAllTasks: async (req, res) => {
    try {
      console.log('=== GET ALL TASKS ===');
      console.log('User making request:', req.user);
      
      const tasks = await taskDao.getAllTasks();
      
      console.log(`Found ${tasks ? tasks.length : 0} tasks`);
      
      res.json({
        success: true,
        data: tasks || []
      });
    } catch (error) {
      console.error('❌ Get tasks error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching tasks',
        error: error.message 
      });
    }
  },

  getTaskById: async (req, res) => {
    try {
      const { id } = req.params;
      const task = await taskDao.getTaskById(id);
      
      if (!task) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }
      
      res.json({
        success: true,
        data: task
      });
    } catch (error) {
      console.error('❌ Get task by id error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching task',
        error: error.message 
      });
    }
  },

  createTask: async (req, res) => {
    try {
      console.log('=== CREATE TASK REQUEST ===');
      console.log('Request body:', req.body);
      console.log('Authenticated user:', req.user);
      
      const { project_id, title, description, status = 'pending', priority = 'medium', assigned_to, due_date } = req.body;
      
      // Validate required fields
      if (!title || title.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Task title is required'
        });
      }
      
      const taskId = await taskDao.createTask({
        project_id,
        title: title.trim(),
        description: description ? description.trim() : '',
        status,
        priority,
        assigned_to: assigned_to || null,
        due_date: due_date || null,
        created_by: req.user.id
      });
      
      console.log('✅ Task created with ID:', taskId);
      
      // Get the newly created task
      const newTask = await taskDao.getTaskById(taskId);
      
      res.status(201).json({
        success: true,
        message: 'Task created successfully',
        taskId,
        task: newTask
      });
    } catch (error) {
      console.error('❌ Create task error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error creating task',
        error: error.message 
      });
    }
  },

  updateTask: async (req, res) => {
    try {
      console.log('=== UPDATE TASK REQUEST ===');
      console.log('Task ID:', req.params.id);
      console.log('Request body:', req.body);
      
      const { id } = req.params;
      const { project_id, title, description, status, priority, assigned_to, due_date } = req.body;
      
      // Check if task exists
      const existingTask = await taskDao.getTaskById(id);
      if (!existingTask) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }
      
      // Validate required fields
      if (!title || title.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Task title is required'
        });
      }
      
      await taskDao.updateTask(id, {
        project_id,
        title: title.trim(),
        description: description ? description.trim() : existingTask.description,
        status: status || existingTask.status,
        priority: priority || existingTask.priority,
        assigned_to: assigned_to || existingTask.assigned_to,
        due_date: due_date || existingTask.due_date
      });
      
      // Get the updated task
      const updatedTask = await taskDao.getTaskById(id);
      
      res.json({
        success: true,
        message: 'Task updated successfully',
        task: updatedTask
      });
    } catch (error) {
      console.error('❌ Update task error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error updating task',
        error: error.message 
      });
    }
  },

  deleteTask: async (req, res) => {
    try {
      console.log('=== DELETE TASK REQUEST ===');
      console.log('Task ID:', req.params.id);
      
      const { id } = req.params;
      
      // Check if task exists
      const existingTask = await taskDao.getTaskById(id);
      if (!existingTask) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }
      
      await taskDao.deleteTask(id);
      
      console.log('✅ Task deleted successfully');
      
      res.json({
        success: true,
        message: 'Task deleted successfully'
      });
    } catch (error) {
      console.error('❌ Delete task error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error deleting task',
        error: error.message 
      });
    }
  },

  getTasksByProjectId: async (req, res) => {
    try {
      const { projectId } = req.params;
      const tasks = await taskDao.getTasksByProjectId(projectId);
      
      res.json({
        success: true,
        data: tasks
      });
    } catch (error) {
      console.error('❌ Get tasks by project error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching tasks by project',
        error: error.message 
      });
    }
  },

  getTasksByUserId: async (req, res) => {
    try {
      const { userId } = req.params;
      const tasks = await taskDao.getTasksByUserId(userId);
      
      res.json({
        success: true,
        data: tasks
      });
    } catch (error) {
      console.error('❌ Get tasks by user error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching tasks by user',
        error: error.message 
      });
    }
  },

  getTasksByStatus: async (req, res) => {
    try {
      const { status } = req.params;
      const tasks = await taskDao.getTasksByStatus(status);
      
      res.json({
        success: true,
        data: tasks
      });
    } catch (error) {
      console.error('❌ Get tasks by status error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching tasks by status',
        error: error.message 
      });
    }
  }
};

module.exports = taskController;*/
