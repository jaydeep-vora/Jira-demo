const express = require('express');
const cors = require('cors');
require('dotenv').config();

const taskRoutes = require('../../routes/taskRoutes');
const errorHandler = require('../../middleware/errorHandler');
const { decryptRequestBody, encryptResponseBody } = require('../../middleware/encryption');
const { apiLimiter } = require('../../middleware/rateLimiter');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Jira Task API',
    version: '1.0.0'
  });
});

app.get('/api/health', (_req, res) => {
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

app.use('/api', apiLimiter);
app.use('/api/tasks', taskRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.use(errorHandler);

module.exports = app;
