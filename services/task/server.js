require('dotenv').config();
const http = require('http');

const app = require('./app');
const { testConnection, sequelize } = require('../../config/database');
const { syncModels } = require('../../models');

const PORT = process.env.PORT || 3002;

const startServer = async () => {
  try {
    await testConnection();

    // Avoid auto-altering the DB in Docker: existing schemas can differ and `alter: true`
    // may fail on missing constraints. Opt-in explicitly via `DB_SYNC=true`.
    if (process.env.DB_SYNC === 'true') {
      const alter = process.env.DB_SYNC_ALTER === 'true';
      await syncModels({ force: false, alter });
    }

    const server = http.createServer(app);

    server.listen(PORT, () => {
      console.log(`🚀 Task service running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    const shutdown = async (signal) => {
      console.log(`${signal} signal received: closing HTTP server and database connection`);
      server.close(() => console.log('HTTP server closed'));
      await sequelize.close();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Failed to start task service:', error);
    process.exit(1);
  }
};

startServer();
