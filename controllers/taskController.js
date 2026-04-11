const { Task } = require('../models');
const { emit } = require('../socket');

const createTask = async (req, res) => {
  try {

    console.log('req.body', req.body);

    const { title, description, status, priority, dueDate, assigneeId } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    const task = await Task.create({
      title,
      description,
      status,
      priority,
      dueDate,
      userId: req.user.id,
      assigneeId: assigneeId || req.user.id
    });

    emit('task:created', { task: task.toJSON() });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: { task: task.toJSON() }
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating task',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getTasks = async (req, res) => {
  try {
    const tasks = await Task.findAll({
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: { tasks: tasks.map((task) => task.toJSON()) }
    });
  } catch (error) {
    console.error('Get tasks error:', error); 
    res.status(500).json({
      success: false,
      message: 'Error fetching tasks',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findOne({
      where: {
        id
      }
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      data: { task: task.toJSON() }
    });
  } catch (error) {
    console.error('Get task by id error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching task',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, dueDate, assigneeId } = req.body;

    const task = await Task.findByPk(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    await task.update({
      title: title !== undefined ? title : task.title,
      description: description !== undefined ? description : task.description,
      status: status !== undefined ? status : task.status,
      priority: priority !== undefined ? priority : task.priority,
      dueDate: dueDate !== undefined ? dueDate : task.dueDate,
      assigneeId: assigneeId !== undefined ? assigneeId : task.assigneeId
    });

    emit('task:updated', { task: task.toJSON() });

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: { task: task.toJSON() }
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating task',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findOne({
      where: {
        id
      }
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    await task.destroy();

    emit('task:deleted', { id });

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting task',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask
};

