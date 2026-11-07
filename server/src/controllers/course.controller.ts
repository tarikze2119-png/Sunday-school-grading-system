import { Request, Response, NextFunction } from 'express';
import courseService from '../services/course.service.js';

export class CourseController {
  // COURSES
  async listCourses(req: Request, res: Response, next: NextFunction) {
    try {
      const { search } = req.query;
      const courses = await courseService.listCourses(search as string);
      res.status(200).json({ success: true, data: courses });
    } catch (error) {
      next(error);
    }
  }

  async createCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const course = await courseService.createCourse(req.body, req.user!.id);
      res.status(201).json({
        success: true,
        message: `ኮርስ '${course.amharicTitle}' በተሳካ ሁኔታ ተፈጥሯል።`,
        data: course,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await courseService.updateCourse(req.params.id, req.body, req.user!.id);
      res.status(200).json({
        success: true,
        message: `የኮርስ '${updated.amharicTitle}' መረጃ ተሻሽሏል።`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  // OFFERINGS
  async listOfferings(req: Request, res: Response, next: NextFunction) {
    try {
      const { academicYearId, batchId, teacherId } = req.query;
      const offerings = await courseService.listOfferings({
        academicYearId: academicYearId as string,
        batchId: batchId as string,
        teacherId: teacherId as string,
      });
      res.status(200).json({ success: true, data: offerings });
    } catch (error) {
      next(error);
    }
  }

  async getOfferingById(req: Request, res: Response, next: NextFunction) {
    try {
      const offering = await courseService.getOfferingById(req.params.id);
      res.status(200).json({ success: true, data: offering });
    } catch (error) {
      next(error);
    }
  }

  async createOffering(req: Request, res: Response, next: NextFunction) {
    try {
      const offering = await courseService.createOffering(req.body, req.user!.id);
      res.status(201).json({
        success: true,
        message: `የኮርስ ምደባ ለ '${offering.course.amharicTitle}' በተሳካ ሁኔታ ተፈጥሯል።`,
        data: offering,
      });
    } catch (error) {
      next(error);
    }
  }

  async assignTeacher(req: Request, res: Response, next: NextFunction) {
    try {
      const { offeringId } = req.params;
      const { teacherId, isPrimary } = req.body;
      const assignment = await courseService.assignTeacherToOffering(
        offeringId,
        teacherId,
        isPrimary,
        req.user!.id
      );
      res.status(201).json({
        success: true,
        message: 'መምህሩ ለኮርሱ በተሳካ ሁኔታ ተመድቧል።',
        data: assignment,
      });
    } catch (error) {
      next(error);
    }
  }

  async removeTeacher(req: Request, res: Response, next: NextFunction) {
    try {
      const { assignmentId } = req.params;
      const result = await courseService.removeTeacherAssignment(assignmentId, req.user!.id);
      res.status(200).json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }
}

export const courseController = new CourseController();
export default courseController;
