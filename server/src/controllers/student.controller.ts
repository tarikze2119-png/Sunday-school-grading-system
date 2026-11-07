import { Request, Response, NextFunction } from 'express';
import studentService from '../services/student.service.js';

export class StudentController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const student = await studentService.registerStudent(req.body, req.user!.id);
      res.status(201).json({
        success: true,
        message: `ተማሪ '${student.user.firstName} ${student.user.lastName}' (መ.ቁ: ${student.admissionNumber}) በተሳካ ሁኔታ ተመዝግቧል።`,
        data: student,
      });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { academicYearId, batchId, search, isActive, page, limit } = req.query;
      const result = await studentService.listStudents({
        academicYearId: academicYearId as string,
        batchId: batchId as string,
        search: search as string,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 25,
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async promote(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId } = req.params;
      const { newAcademicYearId, newBatchId } = req.body;
      const result = await studentService.promoteStudent(
        studentId,
        newAcademicYearId,
        newBatchId,
        req.user!.id
      );
      res.status(200).json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }

  async importExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const { academicYearId, batchId, rows } = req.body;
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ success: false, message: 'የተማሪዎች መረጃ ዝርዝር አልተገኘም።' });
      }

      const result = await studentService.bulkImportStudents(
        academicYearId,
        batchId,
        rows,
        req.user!.id
      );

      res.status(200).json({
        success: true,
        message: `${result.successCount} ተማሪዎች በተሳካ ሁኔታ ተመዝግበዋል። (${result.failedCount} አልተመዘገቡም)`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async exportCSV(req: Request, res: Response, next: NextFunction) {
    try {
      const { academicYearId, batchId } = req.query;
      const csv = await studentService.exportStudentsCSV(
        academicYearId as string,
        batchId as string
      );

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="students_list.csv"');
      res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  }
}

export const studentController = new StudentController();
export default studentController;
