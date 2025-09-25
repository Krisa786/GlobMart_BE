const dotenv = require('dotenv');
const app = require('./server.js');
const db = require('./database/models');
const { logger } = require('./middleware/errorHandler');
const CleanupService = require('./services/CleanupService');

dotenv.config();

const port = process.env.PORT || 3001;

// Database connection and server startup
const startServer = async () => {
  try {
    // Test database connection
    await db.sequelize.authenticate();
    logger.info('Database connection established successfully');

    // Sync database (in development only)
    // Temporarily disabled to avoid conflicts with manual migrations
    // if (process.env.NODE_ENV === 'development') {
    //   await db.sequelize.sync({ alter: true });
    //   logger.info('Database synchronized');
    // }

    // Start server
    app.listen(port, () => {
      logger.info(`GlobeMart Backend API listening at http://localhost:${port}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

      // Start cleanup service (only in production or when explicitly enabled)
      if (process.env.NODE_ENV === 'production' || process.env.ENABLE_CLEANUP === 'true') {
        CleanupService.start();
        logger.info('Cleanup service started');
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  CleanupService.stop();
  await db.sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  CleanupService.stop();
  await db.sequelize.close();
  process.exit(0);
});

startServer();
