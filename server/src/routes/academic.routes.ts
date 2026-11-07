import { Router } from 'express';
import academicController from '../controllers/academic.controller.js';
import { authenticateJwt } from '../middlewares/authenticate.js';
import { authorizeRole } from '../middlewares/authorize.js';
import { UserRole } from '@prisma/client';

const router = Router();

// Read operations: Accessible by all authenticated users
router.use(authenticateJwt);

router.get('/years', (req, res, next) => academicController.listYears(req, res, next));
router.get('/years/:id', (req, res, next) => academicController.getYearById(req, res, next));
router.get('/batches', (req, res, next) => academicController.listBatches(req, res, next));

// Mutations: Guarded by SUPER_ADMIN and ADMIN
router.post(
  '/years',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res, next) => academicController.createYear(req, res, next)
);

router.patch(
  '/years/:id/set-current',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res, next) => academicController.setCurrentYear(req, res, next)
);

router.patch(
  '/years/:id/status',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res, next) => academicController.updateYearStatus(req, res, next)
);

router.delete(
  '/years/:id',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res, next) => academicController.deleteYear(req, res, next)
);

router.post(
  '/batches',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res, next) => academicController.createBatch(req, res, next)
);

router.put(
  '/batches/:id',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res, next) => academicController.updateBatch(req, res, next)
);

router.patch(
  '/batches/:id/toggle-status',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res, next) => academicController.toggleBatch(req, res, next)
);

router.delete(
  '/batches/:id',
  authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  (req, res, next) => academicController.deleteBatch(req, res, next)
);

export default router;
