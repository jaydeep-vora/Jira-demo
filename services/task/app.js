const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { graphqlHTTP } = require('express-graphql');

const taskRoutes = require('../../routes/taskRoutes');
const errorHandler = require('../../middleware/errorHandler');
const { decryptRequestBody, encryptResponseBody } = require('../../middleware/encryption');
const { apiLimiter } = require('../../middleware/rateLimiter');
const { schema, root } = require('../../graphql/schema');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    service: 'task',
    timestamp: new Date().toISOString()
  });
});

app.use(decryptRequestBody);
app.use(encryptResponseBody);

if (process.env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

app.use(apiLimiter);

app.use(
  '/graphql',
  graphqlHTTP({
    schema,
    rootValue: root,
    graphiql: true
  })
);

app.use('/', taskRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.use(errorHandler);

module.exports = app;
