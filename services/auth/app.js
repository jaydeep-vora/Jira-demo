const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('../../routes/authRoutes');
const errorHandler = require('../../middleware/errorHandler');
const { decryptRequestBody, encryptResponseBody } = require('../../middleware/encryption');
const { apiLimiter } = require('../../middleware/rateLimiter');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Jira Auth API',
    version: '1.0.0'
  });
});

app.use(decryptRequestBody);
app.use(encryptResponseBody);

if (process.env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    // Keep logs terse but useful in dev
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

app.use('/api', apiLimiter);
app.use('/api/auth', authRoutes);

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    service: 'auth',
    timestamp: new Date().toISOString()
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.use(errorHandler);

module.exports = app;
