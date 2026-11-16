import { Router } from 'express';
import studentController from '../controllers/student.controller.js';
import { authenticateJwt } from '../middlewares/authenticate.js';
import { authorizeRole, requireResponsibility } from '../middlewares/authorize.js';
import { verifyStudentRecordOwnership } from '../middlewares/ownershipGuards.js';
import { UserRole, AdminResponsibility } from '@prisma/client';

const router = Router();

router.use(authenticateJwt);

// List & search students (Super Admin, Admin, Management)
router.get(
  '/',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT]),
  (req, res, next) => studentController.list(req, res, next)
);

// Export students to CSV
router.get(
  '/export-csv',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT]),
  (req, res, next) => studentController.exportCSV(req, res, next)
);

// Get student by ID (Super Admin, Admin, Management, or Teacher assigned to student, or Student self)
router.get(
  '/:id',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.TEACHER, UserRole.STUDENT]),
  verifyStudentRecordOwnership,
  (req, res, next) => studentController.getById(req, res, next)
);

// Register individual student (Admin with USER_REGISTRATION_ADMIN or General Admin)
router.post(
  '/',
  authorizeRole([UserRole.ADMIN]),
  requireResponsibility(AdminResponsibility.USER_REGISTRATION_ADMIN, { allowSuperAdmin: false }),
  (req, res, next) => studentController.register(req, res, next)
);

// Edit student profile (Admin with USER_REGISTRATION_ADMIN or General Admin)
router.put(
  '/:id',
  authorizeRole([UserRole.ADMIN]),
  requireResponsibility(AdminResponsibility.USER_REGISTRATION_ADMIN, { allowSuperAdmin: false }),
  (req, res, next) => studentController.update(req, res, next)
);

// Toggle student status (Admin with USER_REGISTRATION_ADMIN or General Admin)
router.patch(
  '/:id/status',
  authorizeRole([UserRole.ADMIN]),
  requireResponsibility(AdminResponsibility.USER_REGISTRATION_ADMIN, { allowSuperAdmin: false }),
  (req, res, next) => studentController.toggleStatus(req, res, next)
);

// Promote student to new year/batch without overwriting (Admin with USER_REGISTRATION_ADMIN or General Admin)
router.post(
  '/:studentId/promote',
  authorizeRole([UserRole.ADMIN]),
  requireResponsibility(AdminResponsibility.USER_REGISTRATION_ADMIN, { allowSuperAdmin: false }),
  (req, res, next) => studentController.promote(req, res, next)
);

// Excel bulk import (Admin with USER_REGISTRATION_ADMIN or General Admin)
router.post(
  '/import-excel',
  authorizeRole([UserRole.ADMIN]),
  requireResponsibility(AdminResponsibility.USER_REGISTRATION_ADMIN, { allowSuperAdmin: false }),
  (req, res, next) => studentController.importExcel(req, res, next)
);

export default router;
