import { Router } from 'express';
import transcriptController from '../controllers/transcript.controller.js';
import { authenticateJwt } from '../middlewares/authenticate.js';
import { authorizeRole } from '../middlewares/authorize.js';
import { UserRole } from '@prisma/client';

const router = Router();

// All official transcript endpoints require authentication
router.use(authenticateJwt);

// Official transcripts are institutional documents managed exclusively by authorized administrators.
// Students and Teachers must NOT have access to official transcripts.

// 1. View Official Transcript (Admin, Super Admin, Management)
// Returns latest published version (preserving sealed snapshot), with activeDraft and availableVersions metadata
router.get(
  '/student/:studentId',
  authorizeRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGEMENT]),
  (req, res) => transcriptController.getOfficialTranscript(req, res)
);

// 2. View Current Working Draft separately (Admin, Super Admin, Management)
router.get(
  '/student/:studentId/draft',
  authorizeRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGEMENT]),
  (req, res) => transcriptController.getTranscriptDraft(req, res)
);

// 3. View Specific Historical Version by versionNumber (Admin, Super Admin, Management)
router.get(
  '/student/:studentId/version/:versionNumber',
  authorizeRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGEMENT]),
  (req, res) => transcriptController.getTranscriptVersion(req, res)
);

// 4. Prepare Official Transcript Draft for Review (Admin, Super Admin only)
// Preparing a draft never replaces or hides previously published versions
router.post(
  '/student/:studentId/prepare',
  authorizeRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  (req, res) => transcriptController.prepareOfficialTranscript(req, res)
);

// 5. Publish Official Transcript (Admin, Super Admin only)
// Concurrency-safe atomic publishing with sequential version numbers (Version 1, Version 2, etc.)
router.post(
  '/student/:studentId/publish',
  authorizeRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  (req, res) => transcriptController.publishOfficialTranscript(req, res)
);

// 6. Discard/Cancel Active Working Draft (Admin, Super Admin only)
// Safely cancels draft without affecting published versions or snapshots
router.post(
  '/student/:studentId/draft/discard',
  authorizeRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  (req, res) => transcriptController.discardTranscriptDraft(req, res)
);

router.delete(
  '/student/:studentId/draft',
  authorizeRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  (req, res) => transcriptController.discardTranscriptDraft(req, res)
);

// 7. View Publication and Draft Audit History (Admin, Super Admin, Management)
router.get(
  '/student/:studentId/history',
  authorizeRole([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGEMENT]),
  (req, res) => transcriptController.getPublicationHistory(req, res)
);

export default router;
