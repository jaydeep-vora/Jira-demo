const { sequelize } = require('../config/database');
const User = require('./User');
const Task = require('./Task');

// Initialize all models
const models = {
  User,
  Task
};

// Define associations here
// User who created/reported the task
User.hasMany(Task, {
  foreignKey: 'userId',
  as: 'createdTasks'
});

Task.belongsTo(User, {
  foreignKey: 'userId',
  as: 'creator'
});

// User who is assigned to work on the task
User.hasMany(Task, {
  foreignKey: 'assigneeId',
  as: 'assignedTasks'
});

Task.belongsTo(User, {
  foreignKey: 'assigneeId',
  as: 'assignee'
});

// Sync models with database
const syncModels = async (options = {}) => {
  try {
    const { force = false, alter = false } = options;
    await sequelize.sync({ force, alter });
    console.log('✅ All models synchronized successfully.');
  } catch (error) {
    console.error('❌ Error synchronizing models:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  ...models,
  syncModels
};
