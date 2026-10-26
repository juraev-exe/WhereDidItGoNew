import { Router } from 'express';
import { healthRoutes } from './health.routes.js';
import { userRoutes } from './user.routes.js';
import { authRoutes } from './auth.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);

export const apiRoutes = router;
