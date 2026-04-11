const { Task, sequelize } = require('../models');
const { emit } = require('../socket');
const { parseTasksCSV } = require('../utils/csvParser');

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

/**
 * POST /api/tasks/upload
 * Accepts a multipart/form-data request with a single .csv file (field name: "file").
 * Parses the CSV, validates each row, and bulk-creates tasks inside a transaction.
 */
const uploadTasks = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please attach a .csv file with field name "file"'
      });
    }

    // Parse and validate CSV rows
    const { tasks, errors } = parseTasksCSV(req.file.buffer);
    
    console.log('Total Task parsed:', tasks.length);

    if (tasks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid tasks found in the CSV file',
        errors
      });
    }

    // Stamp every task with the authenticated user as creator
    const taskRecords = tasks.map((t) => ({
      ...t,
      userId: req.user.id,
      assigneeId: t.assigneeId || req.user.id
    }));

    // Bulk insert inside a transaction so it's all-or-nothing
    const createdTasks = await sequelize.transaction(async (t) => {
      return Task.bulkCreate(taskRecords, { transaction: t, validate: true });
    });

    console.log("Total task inserted:", createdTasks.length);

    // Emit socket events for each created task
    createdTasks.forEach((task) => {
      emit('task:created', { task: task.toJSON() });
    });

    res.status(201).json({
      success: true,
      message: `${createdTasks.length} task(s) created successfully`,
      data: {
        created: createdTasks.length,
        tasks: createdTasks.map((task) => task.toJSON()),
        ...(errors.length > 0 && { skippedErrors: errors })
      }
    });
  } catch (error) {
    console.error('Upload tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing CSV upload',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  uploadTasks
};

