import { Router } from 'express';
import teacherController from '../controllers/teacher.controller.js';
import { authenticateJwt } from '../middlewares/authenticate.js';
import { authorizeRole, requireResponsibility } from '../middlewares/authorize.js';
import { UserRole, AdminResponsibility } from '@prisma/client';

const router = Router();

router.use(authenticateJwt);

// List teachers (Super Admin, Admin, Management)
router.get(
  '/',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT]),
  (req, res, next) => teacherController.list(req, res, next)
);

// Register teacher (Super Admin, Admin with USER_REGISTRATION_ADMIN)
router.post(
  '/',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  requireResponsibility(AdminResponsibility.USER_REGISTRATION_ADMIN),
  (req, res, next) => teacherController.register(req, res, next)
);

// Get teacher assignments
router.get(
  '/:teacherId/assignments',
  (req, res, next) => teacherController.getAssignments(req, res, next)
);

export default router;
