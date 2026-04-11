const express = require('express');
const router = express.Router();

const taskController = require('../controllers/taskController');
const { authenticateToken } = require('../middleware/auth');
const { uploadCSV } = require('../middleware/upload');

// All task routes are protected
router.use(authenticateToken);

router.post('/', taskController.createTask);
router.get('/', taskController.getTasks);

// CSV bulk upload — must be defined BEFORE /:id routes to avoid being captured as a param
router.post('/upload', uploadCSV.single('file'), taskController.uploadTasks);

router.get('/:id', taskController.getTaskById);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

module.exports = router;

