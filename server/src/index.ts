import { createApp } from './app.js';
import { config } from './config/env.js';
import { db } from './config/database.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  try {
    // Initialize database connection
    await db.connect();

    // Create Express application
    const app = createApp();

    // Start HTTP server
    const server = app.listen(config.PORT, () => {
      logger.info(`🚀 Server running in ${config.NODE_ENV} mode`);
      logger.info(`📡 Listening on http://localhost:${config.PORT}${config.API_PREFIX}`);
      logger.info(`🩺 Health check at http://localhost:${config.PORT}${config.API_PREFIX}/health`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      logger.info(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
      server.close(async () => {
        logger.info('🔒 HTTP server closed.');
        await db.disconnect();
        logger.info('👋 Graceful shutdown complete. Exiting process.');
        process.exit(0);
      });

      // Force close if graceful shutdown hangs
      setTimeout(() => {
        logger.error('⚠️ Force shutdown timed out after 10s. Exiting immediately.');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    process.on('unhandledRejection', (reason) => {
      logger.error('💥 Unhandled Promise Rejection:', reason);
    });

    process.on('uncaughtException', (error) => {
      logger.error('💥 Uncaught Exception:', error);
      process.exit(1);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
