import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { validateRequest } from '../validators/validate.js';
import {
  createUserSchema,
  updateUserSchema,
  getUserByIdSchema,
} from '../validators/user.validator.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Public routes
router.get('/', userController.listUsers);
router.get('/:id', validateRequest(getUserByIdSchema), userController.getUserById);
router.post('/', validateRequest(createUserSchema), userController.createUser);

// Protected routes (require auth token)
router.put('/:id', requireAuth, validateRequest(updateUserSchema), userController.updateUser);
router.delete('/:id', requireAuth, validateRequest(getUserByIdSchema), userController.deleteUser);

export const userRoutes = router;
