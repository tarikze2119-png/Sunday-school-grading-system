import { Request, Response } from 'express';
import gradeService from '../services/grade.service.js';
import transcriptService from '../services/transcript.service.js';
import prisma from '../config/prisma.client.js';

function sendGradeError(res: Response, error: any, defaultStatusCode = 400): void {
  const statusCode = error.statusCode || defaultStatusCode;
  res.status(statusCode).json({
    success: false,
    message: error.message || 'ስህተት ተከስቷል።',
    code: error.code || (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST'),
  });
}

export class GradeController {
  // ==========================================
  // A. ASSESSMENTS
  // ==========================================

  async getAssessments(req: Request, res: Response): Promise<void> {
    try {
      const { offeringId } = req.params;
      const assessments = await gradeService.getAssessments(offeringId);
      res.status(200).json({ success: true, data: assessments });
    } catch (error: any) {
      sendGradeError(res, error);
    }
  }

  async createAssessment(req: Request, res: Response): Promise<void> {
    try {
      const { offeringId } = req.params;
      const adminUserId = req.user!.id;
      const assessment = await gradeService.createAssessment(offeringId, req.body, adminUserId);
      res.status(201).json({
        success: true,
        message: 'የምዘና መስፈርቱ በተሳካ ሁኔታ ተመዝግቧል።',
        data: assessment,
      });
    } catch (error: any) {
      sendGradeError(res, error);
    }
  }

  async updateAssessment(req: Request, res: Response): Promise<void> {
    try {
      const { assessmentId } = req.params;
      const adminUserId = req.user!.id;
      const updated = await gradeService.updateAssessment(assessmentId, req.body, adminUserId);
      res.status(200).json({
        success: true,
        message: 'የምዘና መስፈርቱ በተሳካ ሁኔታ ተሻሽሏል።',
        data: updated,
      });
    } catch (error: any) {
      sendGradeError(res, error);
    }
  }

  async deleteAssessment(req: Request, res: Response): Promise<void> {
    try {
      const { assessmentId } = req.params;
      const adminUserId = req.user!.id;
      const result = await gradeService.deleteAssessment(assessmentId, adminUserId);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      sendGradeError(res, error);
    }
  }

  async applyStandardTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { offeringId } = req.params;
      const adminUserId = req.user!.id;
      const assessments = await gradeService.applyStandardTemplate(offeringId, adminUserId);
      res.status(201).json({
        success: true,
        message: 'መደበኛ የሰንበት ት/ቤት የምዘና መዋቅር (100%) በተሳካ ሁኔታ ተተግብሯል።',
        data: assessments,
      });
    } catch (error: any) {
      sendGradeError(res, error);
    }
  }

  async getGradingScales(_req: Request, res: Response): Promise<void> {
    try {
      const scales = await gradeService.getGradingScales();
      res.status(200).json({ success: true, data: scales });
    } catch (error: any) {
      sendGradeError(res, error);
    }
  }

  // ==========================================
  // B. TEACHER COURSE DASHBOARD
  // ==========================================

  async getTeacherAssignedCourses(req: Request, res: Response): Promise<void> {
    try {
      const teacherUserId = req.user!.id;
      const courses = await gradeService.getTeacherAssignedCourses(teacherUserId);
      res.status(200).json({ success: true, data: courses });
    } catch (error: any) {
      sendGradeError(res, error);
    }
  }

  // ==========================================
  // C. GRADE ENTRY & SHEET
  // ==========================================

  async getOfferingGradesSheet(req: Request, res: Response): Promise<void> {
    try {
      const { offeringId } = req.params;
      const requestingUserId = req.user!.id;
      const requestingUserRole = req.user!.role;

      const sheet = await gradeService.getOfferingGradesSheet(
        offeringId,
        requestingUserId,
        requestingUserRole
      );
      res.status(200).json({ success: true, data: sheet });
    } catch (error: any) {
      sendGradeError(res, error);
    }
  }

  async saveDraftGrades(req: Request, res: Response): Promise<void> {
    try {
      const { offeringId } = req.params;
      const teacherUserId = req.user!.id;
      const { grades } = req.body;

      if (!Array.isArray(grades)) {
        res.status(400).json({ success: false, message: 'የተማሪዎች ውጤት ዝርዝር በስርዓቱ አልተላከም።' });
        return;
      }

      const result = await gradeService.saveDraftGrades(offeringId, teacherUserId, grades);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      sendGradeError(res, error);
    }
  }

  async submitGradesForApproval(req: Request, res: Response): Promise<void> {
    try {
      const { offeringId } = req.params;
      const teacherUserId = req.user!.id;
      const { notes } = req.body;

      const result = await gradeService.submitGradesForApproval(offeringId, teacherUserId, notes);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      sendGradeError(res, error);
    }
  }

  // ==========================================
  // D. DEADLINE MANAGEMENT
  // ==========================================

  async setOfferingDeadline(req: Request, res: Response): Promise<void> {
    try {
      const { offeringId } = req.params;
      const adminUserId = req.user!.id;
      const { gradeDeadline, isSubmissionOpen } = req.body;

      const updated = await gradeService.setOfferingDeadline(offeringId, adminUserId, {
        gradeDeadline,
        isSubmissionOpen: isSubmissionOpen ?? true,
      });

      res.status(200).json({
        success: true,
        message: 'የውጤት ማስረከቢያ ጊዜ በተሳካ ሁኔታ ተስተካክሏል።',
        data: updated,
      });
    } catch (error: any) {
      sendGradeError(res, error);
    }
  }

  async getDeadlinesOverview(req: Request, res: Response): Promise<void> {
    try {
      const { academicYearId } = req.query as { academicYearId?: string };
      const deadlines = await gradeService.getDeadlinesOverview(academicYearId);
      res.status(200).json({ success: true, data: deadlines });
    } catch (error: any) {
      sendGradeError(res, error);
    }
  }

  // ==========================================
  // E. GRADE APPROVAL WORKFLOW
  // ==========================================

  async getSubmissionsForReview(req: Request, res: Response): Promise<void> {
    try {
      const { status, academicYearId } = req.query as {
        status?: any;
        academicYearId?: string;
      };

      const submissions = await gradeService.getSubmissionsForReview({
        status,
        academicYearId,
      });

      res.status(200).json({ success: true, data: submissions });
    } catch (error: any) {
      sendGradeError(res, error);
    }
  }

  async approveSubmission(req: Request, res: Response): Promise<void> {
    try {
      const { submissionId } = req.params;
      const adminUserId = req.user!.id;
      const { comments } = req.body;

      const result = await gradeService.approveSubmission(submissionId, adminUserId, comments);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      sendGradeError(res, error);
    }
  }

  async rejectSubmission(req: Request, res: Response): Promise<void> {
    try {
      const { submissionId } = req.params;
      const adminUserId = req.user!.id;
      const { rejectionReason, comments } = req.body;

      const result = await gradeService.rejectSubmission(
        submissionId,
        adminUserId,
        rejectionReason,
        comments
      );
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      sendGradeError(res, error);
    }
  }

  async publishSubmission(req: Request, res: Response): Promise<void> {
    try {
      const { submissionId } = req.params;
      const adminUserId = req.user!.id;

      const result = await gradeService.publishSubmission(submissionId, adminUserId);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      sendGradeError(res, error);
    }
  }

  async reopenSubmission(req: Request, res: Response): Promise<void> {
    try {
      const { submissionId } = req.params;
      const adminUserId = req.user!.id;
      const { reason } = req.body;

      const result = await gradeService.reopenSubmission(submissionId, adminUserId, reason);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      sendGradeError(res, error);
    }
  }

  // ==========================================
  // F. STUDENT RESULT VIEW
  // ==========================================

  async getStudentPublishedResults(req: Request, res: Response): Promise<void> {
    try {
      const studentUserId = req.user!.id;
      const { academicYearId } = req.query as { academicYearId?: string };

      const results = await gradeService.getStudentPublishedResults(studentUserId, academicYearId);
      res.status(200).json({ success: true, data: results });
    } catch (error: any) {
      sendGradeError(res, error);
    }
  }

  // ==========================================
  // G. REPORTS & TRANSCRIPTS
  // ==========================================

  async getCourseReport(req: Request, res: Response): Promise<void> {
    try {
      const { offeringId } = req.params;
      const requestingUserId = req.user!.id;
      const requestingUserRole = req.user!.role;
      const report = await gradeService.getCourseReport(offeringId, requestingUserId, requestingUserRole);
      res.status(200).json({ success: true, data: report });
    } catch (error: any) {
      const statusCode = error.message?.includes('ፈቃድ የለዎትም') ? 403 : 400;
      res.status(statusCode).json({ success: false, message: error.message });
    }
  }

  async getBatchReport(req: Request, res: Response): Promise<void> {
    try {
      const { batchId } = req.params;
      const report = await gradeService.getBatchReport(batchId);
      res.status(200).json({ success: true, data: report });
    } catch (error: any) {
      sendGradeError(res, error);
    }
  }

  async getStudentTranscript(req: Request, res: Response): Promise<void> {
    try {
      const { studentId } = req.params;
      const requestingUserRole = req.user!.role;
      const requestingUserId = req.user!.id;

      // Official transcripts are institutional documents managed exclusively by authorized administrators.
      // Students and Teachers must NOT have access to official transcripts.
      // Teachers must access course-specific reports (/reports/course/:offeringId) rather than transcripts.
      if (requestingUserRole === 'STUDENT' || requestingUserRole === 'TEACHER') {
        res.status(403).json({
          success: false,
          message: 'ይፋዊ የትምህርት ማስረጃ (Official Transcript) የመመልከት ፈቃድ የለዎትም። ሰነዱ በአስተዳዳሪዎች ብቻ የሚዘጋጅ እና የሚተዳደር ነው።',
        });
        return;
      }

      const transcript = await transcriptService.getOfficialTranscript(
        studentId,
        requestingUserId,
        requestingUserRole
      );
      res.status(200).json({ success: true, data: transcript });
    } catch (error: any) {
      const statusCode = error.message?.includes('ፈቃድ የለዎትም') ? 403 : 400;
      res.status(statusCode).json({ success: false, message: error.message });
    }
  }
}

export const gradeController = new GradeController();
export default gradeController;
