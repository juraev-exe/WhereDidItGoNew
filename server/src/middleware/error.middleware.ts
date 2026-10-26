import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

interface HttpError extends Error {
  statusCode?: number;
  status?: number;
  type?: string;
  body?: unknown;
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const isAppError = err instanceof AppError;
  const httpErr = err as HttpError;
  const isSyntaxOrBodyError =
    httpErr.type === 'entity.parse.failed' || (err instanceof SyntaxError && 'body' in httpErr);

  const statusCode = isAppError
    ? err.statusCode
    : isSyntaxOrBodyError
      ? 400
      : httpErr.statusCode || httpErr.status || 500;

  const message = isAppError
    ? err.message
    : isSyntaxOrBodyError
      ? 'Malformed JSON body in request'
      : 'Internal Server Error';

  if (!isAppError && !isSyntaxOrBodyError) {
    logger.error('💥 Unhandled Unexpected Error:', err);
  } else {
    logger.warn(`Operational Error (${statusCode}): ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(config.NODE_ENV === 'development' && {
      stack: err.stack,
    }),
  });
}
