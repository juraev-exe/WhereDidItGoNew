import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { validateRequest } from '../validators/validate.js';
import {
  createUserSchema,
  updateUserSchema,
  getUserByIdSchema,
} from '../validators/user.validator.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();

// Admin-only routes
router.get('/', requireAuth, requireRole('admin'), userController.listUsers);
router.post('/', requireAuth, requireRole('admin'), validateRequest(createUserSchema), userController.createUser);

// Self-or-admin protected routes (ownership enforced in controller)
router.get('/:id', requireAuth, validateRequest(getUserByIdSchema), userController.getUserById);
router.put('/:id', requireAuth, validateRequest(updateUserSchema), userController.updateUser);
router.delete('/:id', requireAuth, validateRequest(getUserByIdSchema), userController.deleteUser);

export const userRoutes = router;
