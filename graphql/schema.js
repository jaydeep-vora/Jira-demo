const { buildSchema } = require('graphql');
const { Task } = require('../models');

// GraphQL schema definition
const schema = buildSchema(`
  scalar DateTime

  type Task {
    id: ID!
    title: String!
    description: String
    status: String!
    priority: String!
    dueDate: DateTime
    userId: ID!
    assigneeId: ID
    createdAt: DateTime
    updatedAt: DateTime
  }

  input TaskFilterInput {
    status: String
    priority: String
    userId: ID
    assigneeId: ID
  }

  type Query {
    tasks(filter: TaskFilterInput): [Task!]!
  }
`);

// Root resolver
const root = {
  tasks: async ({ filter }) => {
    const where = {};

    if (filter) {
      if (filter.status) where.status = filter.status;
      if (filter.priority) where.priority = filter.priority;
      if (filter.userId) where.userId = filter.userId;
      if (filter.assigneeId) where.assigneeId = filter.assigneeId;
    }

    const tasks = await Task.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    return tasks.map((task) => task.toJSON());
  }
};

module.exports = {
  schema,
  root
};

