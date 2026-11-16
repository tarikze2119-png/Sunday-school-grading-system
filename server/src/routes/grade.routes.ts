import { Router } from 'express';
import gradeController from '../controllers/grade.controller.js';
import { authenticateJwt } from '../middlewares/authenticate.js';
import { authorizeRole, requireResponsibility, requireGeneralAdmin } from '../middlewares/authorize.js';
import {
  verifyTeacherCourseAssignment,
  verifyStudentRecordOwnership,
} from '../middlewares/ownershipGuards.js';
import { UserRole, AdminResponsibility } from '@prisma/client';

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

// Offering Grade Sheet: Assigned Teacher and reviewing Admins (Super Admin, Admin)
// Management is NOT permitted to view unpublished individual grade-entry sheets
router.get(
  '/offerings/:offeringId/sheet',
  authorizeRole([UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  verifyTeacherCourseAssignment,
  (req, res) => gradeController.getOfferingGradesSheet(req, res)
);

// Save Grade Draft: Exclusively Assigned Teacher
router.put(
  '/offerings/:offeringId/draft',
  authorizeRole([UserRole.TEACHER]),
  verifyTeacherCourseAssignment,
  (req, res) => gradeController.saveDraftGrades(req, res)
);

// Submit Grade Draft for Review: Exclusively Assigned Teacher
router.post(
  '/offerings/:offeringId/submit',
  authorizeRole([UserRole.TEACHER]),
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

// Final Approval (General Admin exclusively)
router.post(
  '/submissions/:submissionId/approve',
  requireGeneralAdmin(),
  (req, res) => gradeController.approveSubmission(req, res)
);

// Review & Rejection (Result Management Admin or General Admin)
router.post(
  '/submissions/:submissionId/reject',
  authorizeRole([UserRole.ADMIN]),
  requireResponsibility(AdminResponsibility.RESULT_MANAGEMENT_ADMIN, { allowSuperAdmin: false }),
  (req, res) => gradeController.rejectSubmission(req, res)
);

// Publication (General Admin exclusively)
router.post(
  '/submissions/:submissionId/publish',
  requireGeneralAdmin(),
  (req, res) => gradeController.publishSubmission(req, res)
);

// Reopen Submission (General Admin exclusively)
router.post(
  '/submissions/:submissionId/reopen',
  requireGeneralAdmin(),
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
