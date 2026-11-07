import { Router } from 'express';
import gradingSchemeController from '../controllers/gradingScheme.controller.js';
import { authenticateJwt } from '../middlewares/authenticate.js';
import { authorizeRole } from '../middlewares/authorize.js';
import { UserRole } from '@prisma/client';

const router = Router();

// All grading scheme endpoints require authentication
router.use(authenticateJwt);

// ==========================================
// COURSE SCHEMES ASSIGNMENT & COURSE CONFIG
// (Placed before parameterized /:id routes to avoid path collisions)
// ==========================================
router.get(
  '/courses/assignable',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT]),
  (req, res) => gradingSchemeController.getCoursesForAssignment(req, res)
);

router.post(
  '/courses/apply',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res) => gradingSchemeController.applySchemeToCourses(req, res)
);

router.get(
  '/courses/:courseOfferingId',
  authorizeRole([
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGEMENT,
    UserRole.TEACHER,
  ]),
  (req, res) => gradingSchemeController.getCourseSchemeDetails(req, res)
);

router.put(
  '/courses/:courseOfferingId',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res) => gradingSchemeController.updateCourseGradingScheme(req, res)
);

// ==========================================
// REUSABLE TEMPLATES CRUD & VERSIONS
// ==========================================
router.get(
  '/',
  authorizeRole([
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGEMENT,
    UserRole.TEACHER,
  ]),
  (req, res) => gradingSchemeController.getSchemes(req, res)
);

router.post(
  '/',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res) => gradingSchemeController.createScheme(req, res)
);

router.get(
  '/:id',
  authorizeRole([
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGEMENT,
    UserRole.TEACHER,
  ]),
  (req, res) => gradingSchemeController.getSchemeById(req, res)
);

router.post(
  '/:id/versions',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res) => gradingSchemeController.createNewVersion(req, res)
);

router.put(
  '/:id',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res) => gradingSchemeController.updateSchemeMetadata(req, res)
);

router.delete(
  '/:id',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res) => gradingSchemeController.deleteScheme(req, res)
);

export default router;
