import { Router } from 'express';
import systemAdminController from '../controllers/systemAdmin.controller.js';
import { authenticateJwt } from '../middlewares/authenticate.js';
import { authorizeRole } from '../middlewares/authorize.js';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticateJwt);

// View current General Admin status
router.get(
  '/general-admin/status',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT]),
  (req, res, next) => systemAdminController.getStatus(req, res, next)
);

// Appoint General Admin (Super Admin only)
router.post(
  '/general-admin/appoint',
  authorizeRole([UserRole.SUPER_ADMIN]),
  (req, res, next) => systemAdminController.appointGeneralAdmin(req, res, next)
);

// Revoke General Admin (Super Admin only)
router.post(
  '/general-admin/revoke',
  authorizeRole([UserRole.SUPER_ADMIN]),
  (req, res, next) => systemAdminController.revokeGeneralAdmin(req, res, next)
);

// Transfer General Admin (Super Admin only)
router.post(
  '/general-admin/transfer',
  authorizeRole([UserRole.SUPER_ADMIN]),
  (req, res, next) => systemAdminController.transferGeneralAdmin(req, res, next)
);

export default router;
