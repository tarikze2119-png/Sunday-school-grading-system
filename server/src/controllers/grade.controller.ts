import { Request, Response } from 'express';
import gradeService from '../services/grade.service.js';
import prisma from '../config/prisma.client.js';

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
      res.status(400).json({ success: false, message: error.message });
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
      res.status(400).json({ success: false, message: error.message });
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
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async deleteAssessment(req: Request, res: Response): Promise<void> {
    try {
      const { assessmentId } = req.params;
      const adminUserId = req.user!.id;
      const result = await gradeService.deleteAssessment(assessmentId, adminUserId);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
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
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getGradingScales(_req: Request, res: Response): Promise<void> {
    try {
      const scales = await gradeService.getGradingScales();
      res.status(200).json({ success: true, data: scales });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
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
      res.status(400).json({ success: false, message: error.message });
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
      res.status(400).json({ success: false, message: error.message });
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
      res.status(400).json({ success: false, message: error.message });
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
      res.status(400).json({ success: false, message: error.message });
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
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getDeadlinesOverview(req: Request, res: Response): Promise<void> {
    try {
      const { academicYearId } = req.query as { academicYearId?: string };
      const deadlines = await gradeService.getDeadlinesOverview(academicYearId);
      res.status(200).json({ success: true, data: deadlines });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
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
      res.status(400).json({ success: false, message: error.message });
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
      res.status(400).json({ success: false, message: error.message });
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
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async publishSubmission(req: Request, res: Response): Promise<void> {
    try {
      const { submissionId } = req.params;
      const adminUserId = req.user!.id;

      const result = await gradeService.publishSubmission(submissionId, adminUserId);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
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
      res.status(400).json({ success: false, message: error.message });
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
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // ==========================================
  // G. REPORTS & TRANSCRIPTS
  // ==========================================

  async getCourseReport(req: Request, res: Response): Promise<void> {
    try {
      const { offeringId } = req.params;
      const report = await gradeService.getCourseReport(offeringId);
      res.status(200).json({ success: true, data: report });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getBatchReport(req: Request, res: Response): Promise<void> {
    try {
      const { batchId } = req.params;
      const report = await gradeService.getBatchReport(batchId);
      res.status(200).json({ success: true, data: report });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getStudentTranscript(req: Request, res: Response): Promise<void> {
    try {
      const { studentId } = req.params;
      const requestingUserRole = req.user!.role;
      const requestingUserId = req.user!.id;

      // If student is requesting, enforce they only request their own transcript
      if (requestingUserRole === 'STUDENT') {
        const studentProfile = await prisma.student.findUnique({
          where: { userId: requestingUserId },
        });
        if (!studentProfile || studentProfile.id !== studentId) {
          res.status(403).json({
            success: false,
            message: 'የሌላ ተማሪን የውጤት ካርድ የመመልከት ፈቃድ የለዎትም።',
          });
          return;
        }
      }

      const transcript = await gradeService.getStudentTranscript(studentId);
      res.status(200).json({ success: true, data: transcript });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

export const gradeController = new GradeController();
export default gradeController;
