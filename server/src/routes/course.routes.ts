import { Router } from 'express';
import courseController from '../controllers/course.controller.js';
import { authenticateJwt } from '../middlewares/authenticate.js';
import { authorizeRole } from '../middlewares/authorize.js';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticateJwt);

// Catalog routes
router.get('/', (req, res, next) => courseController.listCourses(req, res, next));
router.post(
  '/',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res, next) => courseController.createCourse(req, res, next)
);
router.put(
  '/:id',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res, next) => courseController.updateCourse(req, res, next)
);

// Course Offerings routes
router.get('/offerings/list', (req, res, next) => courseController.listOfferings(req, res, next));
router.get('/offerings/:id', (req, res, next) => courseController.getOfferingById(req, res, next));
router.post(
  '/offerings',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res, next) => courseController.createOffering(req, res, next)
);

// Teacher assignment to offering
router.post(
  '/offerings/:offeringId/assign-teacher',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res, next) => courseController.assignTeacher(req, res, next)
);

router.delete(
  '/offerings/teacher-assignments/:assignmentId',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res, next) => courseController.removeTeacher(req, res, next)
);

export default router;
