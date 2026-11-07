import { Request, Response, NextFunction } from 'express';
import enrollmentService from '../services/enrollment.service.js';

export class EnrollmentController {
  async enrollIndividual(req: Request, res: Response, next: NextFunction) {
    try {
      const { courseOfferingId, studentId } = req.body;
      const enrollment = await enrollmentService.enrollStudent(
        courseOfferingId,
        studentId,
        req.user!.id
      );
      res.status(201).json({
        success: true,
        message: 'ተማሪው በኮርሱ ውስጥ በተሳካ ሁኔታ ተመዝግቧል።',
        data: enrollment,
      });
    } catch (error) {
      next(error);
    }
  }

  async bulkEnroll(req: Request, res: Response, next: NextFunction) {
    try {
      const { courseOfferingId } = req.params;
      const result = await enrollmentService.bulkEnrollBatchStudents(
        courseOfferingId,
        req.user!.id
      );
      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async listOfferingEnrollments(req: Request, res: Response, next: NextFunction) {
    try {
      const { offeringId } = req.params;
      const enrollments = await enrollmentService.getOfferingEnrollments(offeringId);
      res.status(200).json({ success: true, data: enrollments });
    } catch (error) {
      next(error);
    }
  }

  async transfer(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId, fromOfferingId, toOfferingId } = req.body;
      const result = await enrollmentService.transferStudent(
        studentId,
        fromOfferingId,
        toOfferingId,
        req.user!.id
      );
      res.status(200).json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }

  async unenroll(req: Request, res: Response, next: NextFunction) {
    try {
      const { enrollmentId } = req.params;
      const result = await enrollmentService.unenrollStudent(enrollmentId, req.user!.id);
      res.status(200).json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }
}

export const enrollmentController = new EnrollmentController();
export default enrollmentController;
