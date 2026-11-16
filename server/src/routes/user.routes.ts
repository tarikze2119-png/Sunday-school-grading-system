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

// Soft delete user (Super Admin only)
router.delete(
  '/:id',
  authorizeRole([UserRole.SUPER_ADMIN]),
  (req, res, next) => userController.deleteUser(req, res, next)
);

// Restore soft-deleted user (Super Admin only)
router.patch(
  '/:id/restore',
  authorizeRole([UserRole.SUPER_ADMIN]),
  (req, res, next) => userController.restoreUser(req, res, next)
);

// Update admin responsibilities (General Admin only)
router.patch(
  '/:id/responsibilities',
  authorizeRole([UserRole.ADMIN]),
  (req, res, next) => userController.updateResponsibilities(req, res, next)
);

// Audit logs (Super Admin only)
router.get(
  '/audit-logs',
  authorizeRole([UserRole.SUPER_ADMIN]),
  (req, res, next) => userController.getAuditLogs(req, res, next)
);

export default router;
