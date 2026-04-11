require('dotenv').config();
const http = require('http');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = require('./app');

const PORT = process.env.PORT || 3000;
const TASK_SERVICE_URL = process.env.TASK_SERVICE_URL || 'http://task:3002';

const server = http.createServer(app);

// Create a dedicated WebSocket proxy for handling upgrade requests
// This ensures only ONE proxy handles WebSocket upgrades, preventing
// the connect/disconnect loop that occurs when multiple proxies compete.
const wsProxy = createProxyMiddleware({
  target: TASK_SERVICE_URL,
  changeOrigin: true,
  ws: true,
  logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
  
});

// Explicitly handle WebSocket upgrade events on the server
// Only proxy upgrades for Socket.IO paths to the task service
server.on('upgrade', (req, socket, head) => {
  if (req.url && req.url.startsWith('/socket.io')) {
    wsProxy.upgrade(req, socket, head);
  } else {
    // Reject non-Socket.IO WebSocket connections
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Gateway service running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

const shutdown = (signal) => {
  console.log(`${signal} signal received: closing gateway HTTP server`);
  server.close(() => {
    console.log('Gateway HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
