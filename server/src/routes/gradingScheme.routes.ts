import { Router } from 'express';
import gradingSchemeController from '../controllers/gradingScheme.controller.js';
import { authenticateJwt } from '../middlewares/authenticate.js';
import { authorizeRole, requireResponsibility } from '../middlewares/authorize.js';
import { UserRole, AdminResponsibility } from '@prisma/client';

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

// Apply scheme to courses: exclusively RESULT_MANAGEMENT_ADMIN or General Admin
router.post(
  '/courses/apply',
  authorizeRole([UserRole.ADMIN]),
  requireResponsibility(AdminResponsibility.RESULT_MANAGEMENT_ADMIN, { allowSuperAdmin: false }),
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

// Update course scheme: exclusively RESULT_MANAGEMENT_ADMIN or General Admin
router.put(
  '/courses/:courseOfferingId',
  authorizeRole([UserRole.ADMIN]),
  requireResponsibility(AdminResponsibility.RESULT_MANAGEMENT_ADMIN, { allowSuperAdmin: false }),
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

// Create reusable scheme template: exclusively RESULT_MANAGEMENT_ADMIN or General Admin
router.post(
  '/',
  authorizeRole([UserRole.ADMIN]),
  requireResponsibility(AdminResponsibility.RESULT_MANAGEMENT_ADMIN, { allowSuperAdmin: false }),
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

// Create new version: exclusively RESULT_MANAGEMENT_ADMIN or General Admin
router.post(
  '/:id/versions',
  authorizeRole([UserRole.ADMIN]),
  requireResponsibility(AdminResponsibility.RESULT_MANAGEMENT_ADMIN, { allowSuperAdmin: false }),
  (req, res) => gradingSchemeController.createNewVersion(req, res)
);

// Update scheme metadata: exclusively RESULT_MANAGEMENT_ADMIN or General Admin
router.put(
  '/:id',
  authorizeRole([UserRole.ADMIN]),
  requireResponsibility(AdminResponsibility.RESULT_MANAGEMENT_ADMIN, { allowSuperAdmin: false }),
  (req, res) => gradingSchemeController.updateSchemeMetadata(req, res)
);

// Delete scheme template: exclusively RESULT_MANAGEMENT_ADMIN or General Admin
router.delete(
  '/:id',
  authorizeRole([UserRole.ADMIN]),
  requireResponsibility(AdminResponsibility.RESULT_MANAGEMENT_ADMIN, { allowSuperAdmin: false }),
  (req, res) => gradingSchemeController.deleteScheme(req, res)
);

export default router;
