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
  // Auth service does NOT need WebSocket support
  ws: false,
  logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn'
});

// HTTP-only proxy for task REST API routes
const taskProxy = createProxyMiddleware({
  target: TASK_SERVICE_URL,
  changeOrigin: true,
  // Disable ws here — we handle WebSocket upgrades separately below
  ws: false,
  logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn'
});

// Dedicated WebSocket proxy for Socket.IO
// Setting ws: true ONLY on this proxy avoids conflicts with other proxies
const socketProxy = createProxyMiddleware({
  target: TASK_SERVICE_URL,
  changeOrigin: true,
  ws: true,
  logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn'
});

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    service: 'gateway',
    timestamp: new Date().toISOString()
  });
});

// Socket.IO proxy must be registered BEFORE other routes
// This handles the HTTP handshake portion of Socket.IO
app.use('/socket.io', socketProxy);
app.use('/api/auth', authProxy);
app.use('/api/tasks', taskProxy);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Gateway route not found'
  });
});

module.exports = app;
