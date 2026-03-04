const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// Apply authentication to all routes
router.use(authenticate);

// Only admins can manage users
router.get('/', authorize(['admin']), userController.getAllUsers);
router.post('/', authorize(['admin']), userController.createUser);
router.put('/:id', authorize(['admin']), userController.updateUser);
router.delete('/:id', authorize(['admin']), userController.deleteUser);
router.post('/bulk-delete', authorize(['admin']), userController.bulkDeleteUsers);
router.get('/export', authorize(['admin']), userController.exportUsers);

module.exports = router;