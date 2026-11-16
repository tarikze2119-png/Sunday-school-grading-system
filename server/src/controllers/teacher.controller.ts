import { Request, Response, NextFunction } from 'express';
import teacherService from '../services/teacher.service.js';

export class TeacherController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const teacher = await teacherService.registerTeacher(req.body, req.user!.id);
      res.status(201).json({
        success: true,
        message: `መምህር '${teacher.user.firstName} ${teacher.user.lastName}' (ኮድ፡ ${teacher.teacherCode}) በተሳካ ሁኔታ ተመዝግቧል።`,
        data: teacher,
      });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, page, limit } = req.query;
      const result = await teacherService.listTeachers({
        search: search as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 30,
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const { teacherId } = req.params;
      const assignments = await teacherService.getTeacherAssignments(teacherId);
      res.status(200).json({ success: true, data: assignments });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const teacher = await teacherService.getTeacherById(id);
      res.status(200).json({ success: true, data: teacher });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updated = await teacherService.updateTeacherProfile(id, req.body, req.user!.id);
      res.status(200).json({
        success: true,
        message: `የመምህር '${updated.user.firstName} ${updated.user.lastName}' መረጃ በተሳካ ሁኔታ ተሻሽሏል።`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async toggleStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const result = await teacherService.toggleTeacherStatus(id, isActive === true, req.user!.id);
      res.status(200).json({
        success: true,
        message: result.message,
        data: { isActive: result.isActive },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const teacherController = new TeacherController();
export default teacherController;
