import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { validateRequest } from '../validators/validate.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from '../validators/auth.validator.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Public auth routes
router.post('/register', validateRequest(registerSchema), authController.register);
router.post('/login', validateRequest(loginSchema), authController.login);
router.post('/refresh', validateRequest(refreshTokenSchema), authController.refresh);

// Protected routes (require valid JWT)
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.getMe);

export const authRoutes = router;
