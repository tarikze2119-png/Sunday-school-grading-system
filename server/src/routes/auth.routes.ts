import { Router } from 'express';
import authController from '../controllers/auth.controller.js';
import { authenticateJwt } from '../middlewares/authenticate.js';
import { authorizeRole } from '../middlewares/authorize.js';
import { UserRole } from '@prisma/client';

const router = Router();

// Public routes
router.post('/login', (req, res, next) => authController.login(req, res, next));
router.post('/refresh', (req, res, next) => authController.refresh(req, res, next));
router.post('/logout', (req, res, next) => authController.logout(req, res, next));

// Authenticated routes
router.get('/me', authenticateJwt, (req, res, next) => authController.me(req, res, next));
router.put('/change-password', authenticateJwt, (req, res, next) => authController.changePassword(req, res, next));

// Admin password reset route (Guarded by SUPER_ADMIN and ADMIN)
router.post(
  '/admin-reset-password/:targetUserId',
  authenticateJwt,
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res, next) => authController.adminResetPassword(req, res, next)
);

export default router;
