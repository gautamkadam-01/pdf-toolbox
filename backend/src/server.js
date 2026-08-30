/**
 * Server Entry Point
 * Starts HTTP listener and handles graceful process termination.
 */

const http = require('http');
const app = require('./app');
const { port, nodeEnv } = require('./config/env');
const storageService = require('./services/storageService');
const logger = require('./utils/logger');

// Ensure temporary file directories are created
storageService.ensureDirectories();

// Create HTTP server
const server = http.createServer(app);

server.listen(port, () => {
  logger.info(`=========================================`);
  logger.info(`PDF Toolbox API Service Started`);
  logger.info(`Environment : ${nodeEnv}`);
  logger.info(`Port        : ${port}`);
  logger.info(`Health Check: http://localhost:${port}/api/health`);
  logger.info(`API Base    : http://localhost:${port}/api/v1`);
  logger.info(`=========================================`);
});

// Periodic cleanup of stale temporary files (runs every 30 minutes)
const cleanupInterval = setInterval(() => {
  storageService.cleanupOldFiles().catch((err) => {
    logger.warn(`Stale file cleanup encountered an error: ${err.message}`);
  });
}, 30 * 60 * 1000);

// Graceful Shutdown Handling
const handleShutdown = (signal) => {
  logger.info(`Received ${signal}. Gracefully shutting down PDF Toolbox API...`);
  clearInterval(cleanupInterval);

  server.close((err) => {
    if (err) {
      logger.error('Error during server shutdown:', { error: err.message });
      process.exit(1);
    }
    logger.info('HTTP server closed cleanly. Process exiting.');
    process.exit(0);
  });

  // Force close after 10 seconds if hanging connections persist
  setTimeout(() => {
    logger.error('Forcing process exit after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', {
    reason: reason instanceof Error ? reason.message : reason,
  });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception thrown:', { error: err.message, stack: err.stack });
  handleShutdown('UNCAUGHT_EXCEPTION');
});
