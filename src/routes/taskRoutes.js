const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticate } = require('../middleware/authMiddleware');

router.get('/', authenticate, taskController.getAllTasks);
router.post('/', authenticate, taskController.createTask);
router.put('/:id', authenticate, taskController.updateTask);
router.delete('/:id', authenticate, taskController.deleteTask);
// Add this route for user-specific tasks
module.exports = router;