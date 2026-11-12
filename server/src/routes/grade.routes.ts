import { Router } from 'express';
import gradeController from '../controllers/grade.controller.js';
import { authenticateJwt } from '../middlewares/authenticate.js';
import { authorizeRole } from '../middlewares/authorize.js';
import {
  verifyTeacherCourseAssignment,
  verifyStudentRecordOwnership,
} from '../middlewares/ownershipGuards.js';
import { UserRole } from '@prisma/client';

const router = Router();

// All grade endpoints require authentication
router.use(authenticateJwt);

// ==========================================
// A. SCALES & CONFIGURATION
// ==========================================
router.get('/scales', (req, res) => gradeController.getGradingScales(req, res));

// Assessment Components CRUD
router.get('/offerings/:offeringId/assessments', (req, res) =>
  gradeController.getAssessments(req, res)
);
router.post(
  '/offerings/:offeringId/assessments',
  authorizeRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER]),
  (req, res) => gradeController.createAssessment(req, res)
);
router.put(
  '/assessments/:assessmentId',
  authorizeRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER]),
  (req, res) => gradeController.updateAssessment(req, res)
);
router.delete(
  '/assessments/:assessmentId',
  authorizeRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER]),
  (req, res) => gradeController.deleteAssessment(req, res)
);
router.post(
  '/offerings/:offeringId/assessments/standard-template',
  authorizeRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEACHER]),
  (req, res) => gradeController.applyStandardTemplate(req, res)
);

// ==========================================
// B. TEACHER COURSE DASHBOARD & GRADE ENTRY
// ==========================================
router.get(
  '/teacher/courses',
  authorizeRole([UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  (req, res) => gradeController.getTeacherAssignedCourses(req, res)
);

router.get(
  '/offerings/:offeringId/sheet',
  authorizeRole([UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGEMENT]),
  verifyTeacherCourseAssignment,
  (req, res) => gradeController.getOfferingGradesSheet(req, res)
);

router.put(
  '/offerings/:offeringId/draft',
  authorizeRole([UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  verifyTeacherCourseAssignment,
  (req, res) => gradeController.saveDraftGrades(req, res)
);

router.post(
  '/offerings/:offeringId/submit',
  authorizeRole([UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  verifyTeacherCourseAssignment,
  (req, res) => gradeController.submitGradesForApproval(req, res)
);

// ==========================================
// D. DEADLINE MANAGEMENT
// ==========================================
router.get(
  '/deadlines/overview',
  authorizeRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGEMENT]),
  (req, res) => gradeController.getDeadlinesOverview(req, res)
);

router.put(
  '/offerings/:offeringId/deadline',
  authorizeRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  (req, res) => gradeController.setOfferingDeadline(req, res)
);

// ==========================================
// E. GRADE APPROVAL WORKFLOW
// ==========================================
router.get(
  '/submissions/review',
  authorizeRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGEMENT]),
  (req, res) => gradeController.getSubmissionsForReview(req, res)
);

router.post(
  '/submissions/:submissionId/approve',
  authorizeRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  (req, res) => gradeController.approveSubmission(req, res)
);

router.post(
  '/submissions/:submissionId/reject',
  authorizeRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  (req, res) => gradeController.rejectSubmission(req, res)
);

router.post(
  '/submissions/:submissionId/publish',
  authorizeRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  (req, res) => gradeController.publishSubmission(req, res)
);

router.post(
  '/submissions/:submissionId/reopen',
  authorizeRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  (req, res) => gradeController.reopenSubmission(req, res)
);

// ==========================================
// F. STUDENT RESULT VIEW
// ==========================================
router.get(
  '/student/my-results',
  authorizeRole([UserRole.STUDENT]),
  (req, res) => gradeController.getStudentPublishedResults(req, res)
);

// ==========================================
// G. REPORTS & TRANSCRIPTS
// ==========================================
router.get(
  '/reports/course/:offeringId',
  authorizeRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGEMENT, UserRole.TEACHER]),
  verifyTeacherCourseAssignment,
  (req, res) => gradeController.getCourseReport(req, res)
);

router.get(
  '/reports/batch/:batchId',
  authorizeRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGEMENT]),
  (req, res) => gradeController.getBatchReport(req, res)
);

router.get(
  '/reports/transcript/:studentId',
  authorizeRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGEMENT]),
  (req, res) => gradeController.getStudentTranscript(req, res)
);

export default router;
