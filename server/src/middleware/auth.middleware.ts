import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError.js';
import { verifyAccessToken, type TokenPayload } from '../utils/jwt.js';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

/**
 * Middleware to enforce authentication via Authorization: Bearer <token>.
 */
export function requireAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Authentication required. Missing Bearer token in Authorization header.', 401);
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new AppError('Authentication token is missing.', 401);
  }

  // Verifies signature, expiration, and extracts payload
  const decoded = verifyAccessToken(token);
  req.user = decoded;

  next();
}

/**
 * Role-based access control middleware factory.
 */
export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('Authentication required.', 401);
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError('Forbidden. Insufficient permissions for this resource.', 403);
    }

    next();
  };
}
