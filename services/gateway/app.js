const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth:3001';
const TASK_SERVICE_URL = process.env.TASK_SERVICE_URL || 'http://task:3002';

app.use(cors());

const authProxy = createProxyMiddleware({
  target: AUTH_SERVICE_URL,
  changeOrigin: true,
  ws: true,
  logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn'
});

const taskProxy = createProxyMiddleware({
  target: TASK_SERVICE_URL,
  changeOrigin: true,
  ws: true,
  logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn'
});

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    service: 'gateway',
    routes: {
      auth: AUTH_SERVICE_URL,
      task: TASK_SERVICE_URL
    },
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authProxy);
app.use('/api/tasks', taskProxy);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Gateway route not found'
  });
});

module.exports = app;
