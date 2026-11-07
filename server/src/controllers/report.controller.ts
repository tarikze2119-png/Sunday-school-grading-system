import { Request, Response } from 'express';
import reportService from '../services/report.service.js';
import prisma from '../config/prisma.client.js';

export class ReportController {
  private extractFilters(req: Request) {
    return {
      academicYearId: req.query.academicYearId as string | undefined,
      batchId: req.query.batchId as string | undefined,
      courseId: req.query.courseId as string | undefined,
      teacherId: req.query.teacherId as string | undefined,
      studentId: req.query.studentId as string | undefined,
      search: req.query.search as string | undefined,
    };
  }

  async getStudentsByAcademicYear(req: Request, res: Response) {
    try {
      const filters = this.extractFilters(req);
      const data = await reportService.getStudentsByAcademicYear(filters);
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'ሪፖርቱን ማውጣት አልተቻለም።' });
    }
  }

  async getStudentsByBatch(req: Request, res: Response) {
    try {
      const filters = this.extractFilters(req);
      const data = await reportService.getStudentsByBatch(filters);
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'ሪፖርቱን ማውጣት አልተቻለም።' });
    }
  }

  async getStudentsByCourse(req: Request, res: Response) {
    try {
      const filters = this.extractFilters(req);
      const data = await reportService.getStudentsByCourse(filters);
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'ሪፖርቱን ማውጣት አልተቻለም።' });
    }
  }

  async getTeacherAssignments(req: Request, res: Response) {
    try {
      const filters = this.extractFilters(req);
      const data = await reportService.getTeacherAssignments(filters);
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'ሪፖርቱን ማውጣት አልተቻለም።' });
    }
  }

  async getCoursePerformance(req: Request, res: Response) {
    try {
      const filters = this.extractFilters(req);
      const data = await reportService.getCourseWisePerformance(filters);
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'ሪፖርቱን ማውጣት አልተቻለም።' });
    }
  }

  async getBatchPerformance(req: Request, res: Response) {
    try {
      const filters = this.extractFilters(req);
      const data = await reportService.getBatchWisePerformance(filters);
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'ሪፖርቱን ማውጣት አልተቻለም።' });
    }
  }

  async getStudentPerformance(req: Request, res: Response) {
    try {
      const filters = this.extractFilters(req);
      const data = await reportService.getStudentPerformance(filters);
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'ሪፖርቱን ማውጣት አልተቻለም።' });
    }
  }

  async getGradeSubmissionProgress(req: Request, res: Response) {
    try {
      const filters = this.extractFilters(req);
      const data = await reportService.getGradeSubmissionProgress(filters);
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'ሪፖርቱን ማውጣት አልተቻለም።' });
    }
  }

  async getApprovedAndRejectedGrades(req: Request, res: Response) {
    try {
      const filters = this.extractFilters(req);
      const data = await reportService.getApprovedAndRejectedGrades(filters);
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'ሪፖርቱን ማውጣት አልተቻለም።' });
    }
  }

  async getStudentAcademicHistory(req: Request, res: Response) {
    try {
      let studentId = req.params.studentId;
      const requestingUserRole = (req as any).user?.role;
      const userId = (req as any).user?.id;

      // Security Guard: Students can ONLY access their own academic history
      if (requestingUserRole === 'STUDENT') {
        const student = await prisma.student.findUnique({
          where: { userId },
        });
        if (!student) {
          return res.status(404).json({ success: false, message: 'የተማሪ መለያ አልተገኘም።' });
        }
        if (studentId && studentId !== 'me' && studentId !== student.id) {
          return res.status(403).json({
            success: false,
            message: 'የሌላ ተማሪን የትምህርት ታሪክ የመመልከት ፈቃድ የለዎትም።',
          });
        }
        studentId = student.id;
      } else if (!studentId || studentId === 'me') {
        // Fallback for Admin/Management testing with 'me'
        const student = await prisma.student.findUnique({
          where: { userId },
        });
        if (!student) {
          return res.status(404).json({ success: false, message: 'የተማሪ መለያ አልተገኘም።' });
        }
        studentId = student.id;
      }

      const data = await reportService.getStudentAcademicHistory(studentId);
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'የትምህርት ታሪክን ማውጣት አልተቻለም።' });
    }
  }

  async exportReportCsv(req: Request, res: Response) {
    try {
      const { reportType } = req.params;
      const filters = this.extractFilters(req);

      let csvData = '';
      let filename = `report_${reportType}_${Date.now()}.csv`;

      if (reportType === 'students-by-year') {
        const data = await reportService.getStudentsByAcademicYear(filters);
        const headers = ['የትምህርት ዘመን', 'ኮድ', 'ሁኔታ', 'ጠቅላላ ተማሪዎች', 'ወንድ', 'ሴት', 'ንቁ', 'የተዛወሩ'];
        const rows = data.map((d) => [
          d.academicYearName,
          d.code,
          d.status,
          d.totalStudents,
          d.maleStudents,
          d.femaleStudents,
          d.activeStudents,
          d.promotedStudents,
        ]);
        csvData = reportService.generateExcelCsv(headers, rows);
        filename = `students_by_year_${Date.now()}.csv`;
      } else if (reportType === 'students-by-batch') {
        const data = await reportService.getStudentsByBatch(filters);
        const headers = ['ምድብ', 'ኮድ', 'ደረጃ', 'የትምህርት ዘመን', 'ጠቅላላ ተማሪዎች', 'ወንድ', 'ሴት', 'ኮርሶች'];
        const rows = data.map((d) => [
          d.batchName,
          d.code,
          d.stageLevel,
          d.academicYearName,
          d.totalStudents,
          d.maleStudents,
          d.femaleStudents,
          d.totalCourses,
        ]);
        csvData = reportService.generateExcelCsv(headers, rows);
        filename = `students_by_batch_${Date.now()}.csv`;
      } else if (reportType === 'course-performance') {
        const data = await reportService.getCourseWisePerformance(filters);
        const headers = ['የኮርስ ስም', 'ኮድ', 'የትምህርት ዘመን', 'ምድብ', 'የተመዘገቡ', 'የተገመገሙ', 'አማካይ ውጤት', 'ከፍተኛ', 'ዝቅተኛ', 'የማለፍ ምጣኔ', 'ሁኔታ'];
        const rows = data.map((d) => [
          d.courseName,
          d.courseCode,
          d.academicYearName,
          d.batchName,
          d.totalEnrolled,
          d.totalGraded,
          d.averageScore,
          d.highestScore,
          d.lowestScore,
          d.passRate,
          d.submissionStatus,
        ]);
        csvData = reportService.generateExcelCsv(headers, rows);
        filename = `course_performance_${Date.now()}.csv`;
      } else if (reportType === 'submission-progress') {
        const resData = await reportService.getGradeSubmissionProgress(filters);
        const headers = ['የኮርስ ስም', 'ኮድ', 'የትምህርት ዘመን', 'ምድብ', 'መምህራን', 'የውጤት ሁኔታ', 'ቀነ-ገደብ', 'ያለፈበት'];
        const rows = resData.items.map((i) => [
          i.courseName,
          i.courseCode,
          i.academicYear,
          i.batchName,
          i.teachers.join('; '),
          i.submissionStatus,
          i.gradeDeadline ? new Date(i.gradeDeadline).toLocaleDateString() : 'አልተወሰነም',
          i.isOverdue ? 'አዎ' : 'አይደለም',
        ]);
        csvData = reportService.generateExcelCsv(headers, rows);
        filename = `submission_progress_${Date.now()}.csv`;
      } else {
        return res.status(400).json({ success: false, message: 'ያልታወቀ የሪፖርት አይነት።' });
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csvData);
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'ሪፖርቱን ወደ Excel ማውረድ አልተቻለም።' });
    }
  }
}

export default new ReportController();
