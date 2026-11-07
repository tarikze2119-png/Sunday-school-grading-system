import { Router } from 'express';
import reportController from '../controllers/report.controller.js';
import { authenticateJwt } from '../middlewares/authenticate.js';
import { authorizeRole } from '../middlewares/authorize.js';
import { UserRole } from '@prisma/client';

const router = Router();

router.use(authenticateJwt);

// Student Academic History (Accessible to Student for self, and Admin/Management for any student)
router.get(
  '/student-history/:studentId',
  (req, res) => reportController.getStudentAcademicHistory(req, res)
);

// All Management & Academic Reports require SUPER_ADMIN, ADMIN, or MANAGEMENT
router.use(authorizeRole([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGEMENT]));

router.get('/students-by-year', (req, res) => reportController.getStudentsByAcademicYear(req, res));
router.get('/students-by-batch', (req, res) => reportController.getStudentsByBatch(req, res));
router.get('/students-by-course', (req, res) => reportController.getStudentsByCourse(req, res));
router.get('/teacher-assignments', (req, res) => reportController.getTeacherAssignments(req, res));
router.get('/course-performance', (req, res) => reportController.getCoursePerformance(req, res));
router.get('/batch-performance', (req, res) => reportController.getBatchPerformance(req, res));
router.get('/student-performance', (req, res) => reportController.getStudentPerformance(req, res));
router.get('/submission-progress', (req, res) => reportController.getGradeSubmissionProgress(req, res));
router.get('/approvals-log', (req, res) => reportController.getApprovedAndRejectedGrades(req, res));
router.get('/export/:reportType', (req, res) => reportController.exportReportCsv(req, res));

export default router;
