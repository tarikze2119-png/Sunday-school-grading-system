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

// Get teacher assignments
router.get(
  '/:teacherId/assignments',
  (req, res, next) => teacherController.getAssignments(req, res, next)
);

// Get teacher by ID
router.get(
  '/:id',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT, UserRole.TEACHER]),
  (req, res, next) => teacherController.getById(req, res, next)
);

// Register teacher (Admin with COURSE_TEACHER_ADMIN, or General Admin)
router.post(
  '/',
  authorizeRole([UserRole.ADMIN]),
  requireResponsibility(AdminResponsibility.COURSE_TEACHER_ADMIN, { allowSuperAdmin: false }),
  (req, res, next) => teacherController.register(req, res, next)
);

// Edit teacher profile (Admin with COURSE_TEACHER_ADMIN, or General Admin)
router.put(
  '/:id',
  authorizeRole([UserRole.ADMIN]),
  requireResponsibility(AdminResponsibility.COURSE_TEACHER_ADMIN, { allowSuperAdmin: false }),
  (req, res, next) => teacherController.update(req, res, next)
);

// Toggle teacher status (Admin with COURSE_TEACHER_ADMIN, or General Admin)
router.patch(
  '/:id/status',
  authorizeRole([UserRole.ADMIN]),
  requireResponsibility(AdminResponsibility.COURSE_TEACHER_ADMIN, { allowSuperAdmin: false }),
  (req, res, next) => teacherController.toggleStatus(req, res, next)
);

export default router;
