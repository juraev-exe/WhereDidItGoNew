import type { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { AppError } from '../utils/appError.js';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';

function assertOwnerOrAdmin(req: AuthenticatedRequest, targetId: string) {
  if (!req.user) {
    throw new AppError('Authentication required.', 401);
  }
  if (req.user.role !== 'admin' && req.user.userId !== targetId) {
    throw new AppError('Forbidden. Insufficient permissions for this user resource.', 403);
  }
}

export class UserController {
  async listUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await userService.listUsers();
      sendSuccess(res, users, 'Users retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      assertOwnerOrAdmin(req, id);
      const user = await userService.getUserById(id);
      sendSuccess(res, user, 'User retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const newUser = await userService.createUser(req.body);
      sendSuccess(res, newUser, 'User created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      assertOwnerOrAdmin(req, id);
      const updatedUser = await userService.updateUser(id, req.body);
      sendSuccess(res, updatedUser, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      assertOwnerOrAdmin(req, id);
      await userService.deleteUser(id);
      sendSuccess(res, null, 'User deleted successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
