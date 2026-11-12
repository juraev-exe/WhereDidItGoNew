import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env.js';
import { apiRoutes } from './routes/index.js';
import { requestLogger, errorHandler } from './middleware/index.js';
import { AppError } from './utils/appError.js';

function createAuthRateLimiter(maxRequests = 30, windowMs = 60_000) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, _res: Response, next: NextFunction): void => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    entry.count += 1;
    if (entry.count > maxRequests) {
      next(new AppError('Too many authentication attempts. Please try again later.', 429));
      return;
    }
    next();
  };
}

export function createApp(): Application {
  const app = express();

  // 1. Security & Parsing Middlewares
  app.use(helmet());
  app.use(
    cors({
      origin: config.CORS_ORIGIN === '*' ? false : config.CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  // 2. Request Logging Middleware
  app.use(requestLogger);

  // 3. Rate limit auth endpoints & mount API routes
  app.use(`${config.API_PREFIX}/auth`, createAuthRateLimiter());
  app.use(config.API_PREFIX, apiRoutes);

  // 4. Catch-all for undefined routes
  app.all('*', (req, _res, next) => {
    next(new AppError(`Cannot ${req.method} ${req.originalUrl} - Route not found`, 404));
  });

  // 5. Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}
