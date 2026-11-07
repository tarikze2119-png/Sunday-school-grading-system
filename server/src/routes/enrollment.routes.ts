import { Router } from 'express';
import enrollmentController from '../controllers/enrollment.controller.js';
import { authenticateJwt } from '../middlewares/authenticate.js';
import { authorizeRole } from '../middlewares/authorize.js';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticateJwt);

// Enroll individual student
router.post(
  '/individual',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res, next) => enrollmentController.enrollIndividual(req, res, next)
);

// Bulk enroll all batch students into offering
router.post(
  '/offerings/:courseOfferingId/bulk-enroll',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res, next) => enrollmentController.bulkEnroll(req, res, next)
);

// View enrolled students for offering
router.get(
  '/offerings/:offeringId/students',
  (req, res, next) => enrollmentController.listOfferingEnrollments(req, res, next)
);

// Transfer student
router.post(
  '/transfer',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res, next) => enrollmentController.transfer(req, res, next)
);

// Unenroll student
router.delete(
  '/:enrollmentId',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res, next) => enrollmentController.unenroll(req, res, next)
);

export default router;
