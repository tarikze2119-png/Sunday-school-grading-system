import { Request, Response } from 'express';
import gradingSchemeService from '../services/gradingScheme.service.js';

export class GradingSchemeController {
  /**
   * POST /api/v1/grading-schemes
   * Create reusable grading scheme template
   */
  async createScheme(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { name, description, components } = req.body;

      if (!name || !components) {
        return res.status(400).json({
          status: 'fail',
          message: 'እባክዎ የመመዘኛውን ስም እና የምዘና መስፈርቶችን ያስገቡ።',
        });
      }

      const scheme = await gradingSchemeService.createScheme(
        { name, description, components },
        userId
      );

      return res.status(201).json({
        status: 'success',
        message: 'አዲስ የመመዘኛ ቅጽ በተሳካ ሁኔታ ተፈጥሯል።',
        data: scheme,
      });
    } catch (error: any) {
      return res.status(400).json({
        status: 'fail',
        message: error.message || 'መመዘኛውን መፍጠር አልተቻለም።',
      });
    }
  }

  /**
   * GET /api/v1/grading-schemes
   * Get all reusable scheme templates
   */
  async getSchemes(req: Request, res: Response) {
    try {
      const { status } = req.query;
      const schemes = await gradingSchemeService.getSchemes(status as string);

      return res.status(200).json({
        status: 'success',
        results: schemes.length,
        data: schemes,
      });
    } catch (error: any) {
      return res.status(500).json({
        status: 'error',
        message: error.message || 'የመመዘኛዎችን ዝርዝር መጫን አልተቻለም።',
      });
    }
  }

  /**
   * GET /api/v1/grading-schemes/:id
   * Get single scheme by ID with all versions
   */
  async getSchemeById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const scheme = await gradingSchemeService.getSchemeById(id);

      return res.status(200).json({
        status: 'success',
        data: scheme,
      });
    } catch (error: any) {
      return res.status(404).json({
        status: 'fail',
        message: error.message || 'መመዘኛው አልተገኘም።',
      });
    }
  }

  /**
   * POST /api/v1/grading-schemes/:id/versions
   * Create a new version of existing template
   */
  async createNewVersion(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;
      const { description, components } = req.body;

      if (!components) {
        return res.status(400).json({
          status: 'fail',
          message: 'እባክዎ አዲሶቹን የምዘና መስፈርቶች ያስገቡ።',
        });
      }

      const version = await gradingSchemeService.createNewVersion(
        id,
        { description, components },
        userId
      );

      return res.status(201).json({
        status: 'success',
        message: 'አዲስ የመመዘኛ ቅጂ (Version) በተሳካ ሁኔታ ተፈጥሯል።',
        data: version,
      });
    } catch (error: any) {
      return res.status(400).json({
        status: 'fail',
        message: error.message || 'አዲስ ቅጂ መፍጠር አልተቻለም።',
      });
    }
  }

  /**
   * PUT /api/v1/grading-schemes/:id
   * Update scheme metadata (name, description, status)
   */
  async updateSchemeMetadata(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;
      const { name, description, status } = req.body;

      const updated = await gradingSchemeService.updateSchemeMetadata(
        id,
        { name, description, status },
        userId
      );

      return res.status(200).json({
        status: 'success',
        message: 'የመመዘኛው መረጃ በተሳካ ሁኔታ ተሻሽሏል።',
        data: updated,
      });
    } catch (error: any) {
      return res.status(400).json({
        status: 'fail',
        message: error.message || 'የመመዘኛውን መረጃ ማሻሻል አልተቻለም።',
      });
    }
  }

  /**
   * DELETE /api/v1/grading-schemes/:id
   * Delete scheme if not used in applied courses
   */
  async deleteScheme(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      const result = await gradingSchemeService.deleteScheme(id, userId);

      return res.status(200).json({
        status: 'success',
        message: result.message,
      });
    } catch (error: any) {
      return res.status(400).json({
        status: 'fail',
        message: error.message || 'መመዘኛውን መሰረዝ አልተቻለም።',
      });
    }
  }

  /**
   * GET /api/v1/grading-schemes/courses/assignable
   * Get courses list for scheme assignment
   */
  async getCoursesForAssignment(req: Request, res: Response) {
    try {
      const { academicYearId, batchId, teacherId, search } = req.query;

      const courses = await gradingSchemeService.getCoursesForAssignment({
        academicYearId: academicYearId as string,
        batchId: batchId as string,
        teacherId: teacherId as string,
        search: search as string,
      });

      return res.status(200).json({
        status: 'success',
        results: courses.length,
        data: courses,
      });
    } catch (error: any) {
      return res.status(500).json({
        status: 'error',
        message: error.message || 'የኮርሶችን ዝርዝር መጫን አልተቻለም።',
      });
    }
  }

  /**
   * POST /api/v1/grading-schemes/courses/apply
   * Apply scheme to courses (Batch, Year, or Specific Courses)
   */
  async applySchemeToCourses(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const {
        schemeId,
        versionId,
        applicationOption,
        academicYearId,
        batchId,
        courseOfferingIds,
      } = req.body;

      if (!schemeId || !applicationOption) {
        return res.status(400).json({
          status: 'fail',
          message: 'እባክዎ መመዘኛውን እና የምደባ አማራጩን ይምረጡ።',
        });
      }

      const result = await gradingSchemeService.applySchemeToCourses(
        {
          schemeId,
          versionId,
          applicationOption,
          academicYearId,
          batchId,
          courseOfferingIds,
        },
        userId
      );

      return res.status(200).json({
        status: 'success',
        message: result.message,
        data: result,
      });
    } catch (error: any) {
      return res.status(400).json({
        status: 'fail',
        message: error.message || 'መመዘኛውን ለኮርሶች መመደብ አልተቻለም።',
      });
    }
  }

  /**
   * GET /api/v1/grading-schemes/courses/:courseOfferingId
   * Get course-specific scheme details, history and snapshots
   */
  async getCourseSchemeDetails(req: Request, res: Response) {
    try {
      const { courseOfferingId } = req.params;

      const details = await gradingSchemeService.getCourseSchemeDetails(courseOfferingId);

      return res.status(200).json({
        status: 'success',
        data: details,
      });
    } catch (error: any) {
      return res.status(404).json({
        status: 'fail',
        message: error.message || 'የኮርሱን መመዘኛ ዝርዝር ማግኘት አልተቻለም።',
      });
    }
  }

  /**
   * PUT /api/v1/grading-schemes/courses/:courseOfferingId
   * Edit course-specific applied scheme (independent copy & versioning)
   */
  async updateCourseGradingScheme(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { courseOfferingId } = req.params;
      const { name, changeReason, components, confirmRecalculation } = req.body;

      if (!components || components.length === 0) {
        return res.status(400).json({
          status: 'fail',
          message: 'እባክዎ የምዘና መስፈርቶችን ያስገቡ።',
        });
      }

      const updated = await gradingSchemeService.updateCourseGradingScheme(
        courseOfferingId,
        { name, changeReason, components, confirmRecalculation },
        userId
      );

      return res.status(200).json({
        status: 'success',
        message: 'የኮርሱ መመዘኛ በተሳካ ሁኔታ ተሻሽሏል። አዲስ ቅጂ (Version) ተፈጥሯል።',
        data: updated,
      });
    } catch (error: any) {
      return res.status(400).json({
        status: 'fail',
        message: error.message || 'የኮርሱን መመዘኛ ማሻሻል አልተቻለም።',
      });
    }
  }
}

export const gradingSchemeController = new GradingSchemeController();
export default gradingSchemeController;
