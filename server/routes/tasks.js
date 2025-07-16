const express = require('express');
const router = express.Router();
const tasksController = require('../controllers/tasksController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, tasksController.getTasks);
router.get('/:id', authenticateToken, tasksController.getTask);
router.post('/', authenticateToken, tasksController.createTask);
router.put('/:id', authenticateToken, tasksController.updateTask);
router.delete('/:id', authenticateToken, tasksController.deleteTask);

module.exports = router;