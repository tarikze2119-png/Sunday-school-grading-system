import api from './api';
import {
  GradingScheme,
  GradingSchemeVersion,
  AssignableCourse,
  CourseSchemeDetailsResponse,
  CreateGradingSchemePayload,
  ApplySchemePayload,
  UpdateCourseSchemePayload,
} from '../types/gradingScheme.types';

export const gradingSchemeService = {
  /**
   * Get all reusable scheme templates
   */
  async getSchemes(status?: string): Promise<GradingScheme[]> {
    const params = status ? { status } : {};
    const res = await api.get('/grading-schemes', { params });
    return res.data.data;
  },

  /**
   * Get scheme by ID with all versions
   */
  async getSchemeById(id: string): Promise<GradingScheme> {
    const res = await api.get(`/grading-schemes/${id}`);
    return res.data.data;
  },

  /**
   * Create new scheme template
   */
  async createScheme(payload: CreateGradingSchemePayload): Promise<GradingScheme> {
    const res = await api.post('/grading-schemes', payload);
    return res.data.data;
  },

  /**
   * Create new version of existing scheme template
   */
  async createNewVersion(
    schemeId: string,
    payload: { description?: string; components: any[] }
  ): Promise<GradingSchemeVersion> {
    const res = await api.post(`/grading-schemes/${schemeId}/versions`, payload);
    return res.data.data;
  },

  /**
   * Update scheme metadata (name, description, status)
   */
  async updateSchemeMetadata(
    schemeId: string,
    payload: { name?: string; description?: string; status?: string }
  ): Promise<GradingScheme> {
    const res = await api.put(`/grading-schemes/${schemeId}`, payload);
    return res.data.data;
  },

  /**
   * Delete scheme template
   */
  async deleteScheme(schemeId: string): Promise<{ success: boolean; message: string }> {
    const res = await api.delete(`/grading-schemes/${schemeId}`);
    return res.data;
  },

  /**
   * Get courses list for scheme assignment
   */
  async getCoursesForAssignment(filters: {
    academicYearId?: string;
    batchId?: string;
    teacherId?: string;
    search?: string;
  }): Promise<AssignableCourse[]> {
    const res = await api.get('/grading-schemes/courses/assignable', { params: filters });
    return res.data.data;
  },

  /**
   * Apply scheme to courses
   */
  async applySchemeToCourses(payload: ApplySchemePayload): Promise<{
    success: boolean;
    message: string;
    assignedCount: number;
    assignedCourses: any[];
  }> {
    const res = await api.post('/grading-schemes/courses/apply', payload);
    return res.data;
  },

  /**
   * Get course-specific applied scheme details, history and snapshots
   */
  async getCourseSchemeDetails(courseOfferingId: string): Promise<CourseSchemeDetailsResponse> {
    const res = await api.get(`/grading-schemes/courses/${courseOfferingId}`);
    return res.data.data;
  },

  /**
   * Update course-specific applied scheme (independent copy & versioning)
   */
  async updateCourseGradingScheme(
    courseOfferingId: string,
    payload: UpdateCourseSchemePayload
  ): Promise<any> {
    const res = await api.put(`/grading-schemes/courses/${courseOfferingId}`, payload);
    return res.data.data;
  },
};

export default gradingSchemeService;
