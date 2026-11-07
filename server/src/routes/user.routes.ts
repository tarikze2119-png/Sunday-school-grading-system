import { Router } from 'express';
import userController from '../controllers/user.controller.js';
import { authenticateJwt } from '../middlewares/authenticate.js';
import { authorizeRole } from '../middlewares/authorize.js';
import { UserRole } from '@prisma/client';

const router = Router();

// Apply authentication to all user routes
router.use(authenticateJwt);

// List users (Super Admin, Admin, Management)
router.get(
  '/',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT]),
  (req, res, next) => userController.listUsers(req, res, next)
);

// Create user (Super Admin and Admin with role constraints)
router.post(
  '/',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res, next) => userController.createUser(req, res, next)
);

// Toggle user status (Activate / Deactivate)
router.patch(
  '/:id/status',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res, next) => userController.toggleStatus(req, res, next)
);

// Audit logs (Super Admin only)
router.get(
  '/audit-logs',
  authorizeRole([UserRole.SUPER_ADMIN]),
  (req, res, next) => userController.getAuditLogs(req, res, next)
);

export default router;
