import { Request, Response, NextFunction } from 'express';
import academicService from '../services/academic.service.js';

export class AcademicController {
  // ACADEMIC YEARS
  async listYears(_req: Request, res: Response, next: NextFunction) {
    try {
      const years = await academicService.listAcademicYears();
      res.status(200).json({ success: true, data: years });
    } catch (error) {
      next(error);
    }
  }

  async getYearById(req: Request, res: Response, next: NextFunction) {
    try {
      const year = await academicService.getAcademicYearById(req.params.id);
      res.status(200).json({ success: true, data: year });
    } catch (error) {
      next(error);
    }
  }

  async createYear(req: Request, res: Response, next: NextFunction) {
    try {
      const year = await academicService.createAcademicYear(req.body, req.user!.id);
      res.status(201).json({
        success: true,
        message: `የትምህርት ዘመን '${year.name}' በተሳካ ሁኔታ ተፈጥሯል።`,
        data: year,
      });
    } catch (error) {
      next(error);
    }
  }

  async setCurrentYear(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await academicService.setCurrentAcademicYear(req.params.id, req.user!.id);
      res.status(200).json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }

  async updateYearStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await academicService.updateAcademicYearStatus(
        req.params.id,
        req.body.status,
        req.user!.id
      );
      res.status(200).json({
        success: true,
        message: `የትምህርት ዘመን ሁኔታ ወደ '${updated.status}' ተቀይሯል።`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteYear(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await academicService.deleteAcademicYear(req.params.id, req.user!.id);
      res.status(200).json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }

  // BATCHES
  async listBatches(req: Request, res: Response, next: NextFunction) {
    try {
      const { academicYearId } = req.query;
      const batches = await academicService.listBatches(academicYearId as string);
      res.status(200).json({ success: true, data: batches });
    } catch (error) {
      next(error);
    }
  }

  async createBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const batch = await academicService.createBatch(req.body, req.user!.id);
      res.status(201).json({
        success: true,
        message: `የተማሪዎች ምድብ '${batch.name}' በተሳካ ሁኔታ ተፈጥሯል።`,
        data: batch,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await academicService.updateBatch(req.params.id, req.body, req.user!.id);
      res.status(200).json({
        success: true,
        message: `የምድብ '${updated.name}' መረጃ ተሻሽሏል።`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async toggleBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await academicService.toggleBatchStatus(
        req.params.id,
        Boolean(req.body.isActive),
        req.user!.id
      );
      res.status(200).json({
        success: true,
        message: updated.isActive ? 'ምድቡ ነቅቷል (Activated)' : 'ምድቡ እንዲዘጋ ተደርጓል (Deactivated)',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await academicService.deleteBatch(req.params.id, req.user!.id);
      res.status(200).json({ success: true, message: result.message });
    } catch (error) {
      next(error);
    }
  }
}

export const academicController = new AcademicController();
export default academicController;
