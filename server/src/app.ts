import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env.js';
import { apiRoutes } from './routes/index.js';
import { requestLogger, errorHandler } from './middleware/index.js';
import { AppError } from './utils/appError.js';

export function createApp(): Application {
  const app = express();

  // 1. Security & Parsing Middlewares
  app.use(helmet());
  app.use(
    cors({
      origin: config.CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 2. Request Logging Middleware
  app.use(requestLogger);

  // 3. API Routes
  app.use(config.API_PREFIX, apiRoutes);

  // 4. Catch-all for undefined routes
  app.all('*', (req, _res, next) => {
    next(new AppError(`Cannot ${req.method} ${req.originalUrl} - Route not found`, 404));
  });

  // 5. Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}
