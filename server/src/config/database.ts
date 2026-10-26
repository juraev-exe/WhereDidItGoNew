import { config } from './env.js';
import { logger } from '../utils/logger.js';

/**
 * Database client abstraction.
 * Replace with your ORM client (e.g. PrismaClient, Drizzle db, or Supabase client).
 */
export const db = {
  isConnected: false,

  async connect(): Promise<void> {
    if (!config.DATABASE_URL) {
      logger.warn('⚠️ No DATABASE_URL provided. Running with in-memory fallback store.');
      this.isConnected = true;
      return;
    }

    try {
      // Example ORM connection:
      // await prisma.$connect();
      this.isConnected = true;
      logger.info('📦 Database connected successfully.');
    } catch (error) {
      logger.error('❌ Failed to connect to the database:', error);
      throw error;
    }
  },

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      // Example: await prisma.$disconnect();
      this.isConnected = false;
      logger.info('📦 Database disconnected.');
    }
  },
};
