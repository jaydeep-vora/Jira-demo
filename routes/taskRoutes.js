const express = require('express');
const router = express.Router();

const taskController = require('../controllers/taskController');
const { authenticateToken } = require('../middleware/auth');

// All task routes are protected
router.use(authenticateToken);

router.post('/', taskController.createTask);
router.get('/', taskController.getTasks);
router.get('/:id', taskController.getTaskById);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

module.exports = router;

