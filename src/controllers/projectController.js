const projectDao = require('../dao/projectDao');

const projectController = {
  // In projectController.js, update getAllProjects function:
getAllProjects: async (req, res) => {
  try {
    console.log('=== GET ALL PROJECTS ===');
    console.log('User making request:', req.user);
    
    const projects = await projectDao.getAllProjects();
    
    console.log(`Found ${projects ? projects.length : 0} projects`);
    
    res.json({
      success: true,
      data: projects || [] // Ensure we always return an array
    });
  } catch (error) {
    console.error('❌ Get projects error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching projects',
      error: error.message 
    });
  }
},

  createProject: async (req, res) => {
    try {
      console.log('=== CREATE PROJECT REQUEST ===');
      console.log('Request body:', req.body);
      console.log('Authenticated user:', req.user);
      
      const { name, description, status = 'active', created_by } = req.body;
      
      // Validate required fields
      if (!name || name.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Project name is required'
        });
      }
      
      // Use either provided created_by or the authenticated user's ID
      const creatorId = created_by || req.user?.id;
      
      console.log('Using creator ID:', creatorId);
      
      if (!creatorId) {
        console.error('No creator ID found!');
        return res.status(400).json({ 
          success: false, 
          message: 'User ID is required to create a project' 
        });
      }
      
      // Validate creator exists
      const userExists = await projectDao.checkUserExists(creatorId);
      if (!userExists) {
        return res.status(400).json({
          success: false,
          message: 'User does not exist'
        });
      }
      
      const projectData = {
        name: name.trim(),
        description: description ? description.trim() : '',
        status: status,
        created_by: creatorId
      };
      
      console.log('Creating project with data:', projectData);
      
      const projectId = await projectDao.createProject(projectData);
      
      console.log('✅ Project created with ID:', projectId);
      
      // Get the newly created project with creator details
      const newProject = await projectDao.getProjectById(projectId);
      
      res.json({
        success: true,
        message: 'Project created successfully',
        projectId: projectId,
        project: newProject
      });
    } catch (error) {
      console.error('❌ Create project error:', error);
      
      // Handle specific database errors
      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({
          success: false,
          message: 'User does not exist'
        });
      }
      
      res.status(500).json({ 
        success: false, 
        message: 'Error creating project',
        error: error.message 
      });
    }
  },

  updateProject: async (req, res) => {
    try {
      console.log('=== UPDATE PROJECT REQUEST ===');
      console.log('Project ID:', req.params.id);
      console.log('Request body:', req.body);
      console.log('Authenticated user:', req.user);
      
      const { id } = req.params;
      const { name, description, status } = req.body;
      
      // Check if project exists
      const existingProject = await projectDao.getProjectById(id);
      if (!existingProject) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      // Validate required fields
      if (!name || name.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Project name is required'
        });
      }
      
      const updateData = {
        name: name.trim(),
        description: description ? description.trim() : existingProject.description,
        status: status || existingProject.status
      };
      
      console.log('Updating project with data:', updateData);
      
      await projectDao.updateProject(id, updateData);
      
      // Get the updated project
      const updatedProject = await projectDao.getProjectById(id);
      
      res.json({
        success: true,
        message: 'Project updated successfully',
        project: updatedProject
      });
    } catch (error) {
      console.error('❌ Update project error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error updating project',
        error: error.message 
      });
    }
  },

  deleteProject: async (req, res) => {
    try {
      console.log('=== DELETE PROJECT REQUEST ===');
      console.log('Project ID:', req.params.id);
      console.log('Authenticated user:', req.user);
      
      const { id } = req.params;
      
      // Check if project exists
      const existingProject = await projectDao.getProjectById(id);
      if (!existingProject) {
        return res.status(404).json({
          success: false,
          message: 'Project not found'
        });
      }
      
      await projectDao.deleteProject(id);
      
      console.log('✅ Project deleted successfully');
      
      res.json({
        success: true,
        message: 'Project deleted successfully'
      });
    } catch (error) {
      console.error('❌ Delete project error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error deleting project',
        error: error.message 
      });
    }
  }
};

module.exports = projectController;