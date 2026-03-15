const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { graphqlHTTP } = require('express-graphql');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { decryptRequestBody, encryptResponseBody } = require('./middleware/encryption');
const { apiLimiter } = require('./middleware/rateLimiter');
const { schema, root } = require('./graphql/schema');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Encryption layer: decrypt incoming payloads, encrypt JSON responses
app.use(decryptRequestBody);
app.use(encryptResponseBody);

// Request logging middleware (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log('req.body', req.body);
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Routes
app.use('/api', apiLimiter);
app.use('/api', routes);

// GraphQL endpoint
app.use(
  '/graphql',
  graphqlHTTP({
    schema,
    rootValue: root,
    graphiql: process.env.NODE_ENV !== 'production'
  })
);

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Jira API',
    version: '1.0.0'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;
