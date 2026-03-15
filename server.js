require('dotenv').config();
const http = require('http');

const app = require('./app');
const { testConnection, sequelize } = require('./config/database');
const { syncModels } = require('./models');
const { initSocket } = require('./socket');

const PORT = process.env.PORT || 3000;

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();

    // Sync models with database (creates tables if they don't exist)
    // In production, use migrations instead of sync
    if (process.env.NODE_ENV !== 'production') {
      // `alter: true` updates existing tables to match models (dev only).
      // If you ever need a clean reset, set `force: true` (drops tables).
      await syncModels({ force: false, alter: true });
    }

    // Create HTTP server and attach Socket.IO
    const server = http.createServer(app);
    initSocket(server);

    // Start HTTP + Socket.IO server
    server.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API endpoint: http://localhost:${PORT}/api`);
    });

    // Handle graceful shutdown
    const shutdown = async (signal) => {
      console.log(`${signal} signal received: closing HTTP server and database connection`);
      server.close(() => {
        console.log('HTTP server closed');
      });
      await sequelize.close();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
