import { Router } from 'express';
import studentController from '../controllers/student.controller.js';
import { authenticateJwt } from '../middlewares/authenticate.js';
import { authorizeRole } from '../middlewares/authorize.js';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticateJwt);

// List & search students (Super Admin, Admin, Management)
router.get(
  '/',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT]),
  (req, res, next) => studentController.list(req, res, next)
);

// Register individual student (Super Admin, Admin)
router.post(
  '/',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res, next) => studentController.register(req, res, next)
);

// Promote student to new year/batch without overwriting (Super Admin, Admin)
router.post(
  '/:studentId/promote',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res, next) => studentController.promote(req, res, next)
);

// Excel bulk import (Super Admin, Admin)
router.post(
  '/import-excel',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res, next) => studentController.importExcel(req, res, next)
);

// Export students to CSV
router.get(
  '/export-csv',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT]),
  (req, res, next) => studentController.exportCSV(req, res, next)
);

export default router;
