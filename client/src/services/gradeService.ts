import api from './api';
import {
  GradingScaleItem,
  AssessmentItem,
  TeacherCourseCard,
  CourseOfferingGradeSheet,
  DeadlineOverviewItem,
  SubmissionReviewItem,
  StudentPublishedResultsResponse,
  StudentTranscript,
} from '../types/grade.types';

export const gradeService = {
  // Scales & Config
  getScales: async (): Promise<GradingScaleItem[]> => {
    const res = await api.get('/grades/scales');
    return res.data.data;
  },

  getAssessments: async (offeringId: string): Promise<AssessmentItem[]> => {
    const res = await api.get(`/grades/offerings/${offeringId}/assessments`);
    return res.data.data;
  },

  createAssessment: async (
    offeringId: string,
    data: {
      name: string;
      type: string;
      maxScore: number;
      weightPercentage: number;
      description?: string;
      displayOrder?: number;
    }
  ): Promise<AssessmentItem> => {
    const res = await api.post(`/grades/offerings/${offeringId}/assessments`, data);
    return res.data.data;
  },

  updateAssessment: async (
    assessmentId: string,
    data: Partial<{
      name: string;
      type: string;
      maxScore: number;
      weightPercentage: number;
      description?: string;
      displayOrder?: number;
    }>
  ): Promise<AssessmentItem> => {
    const res = await api.put(`/grades/assessments/${assessmentId}`, data);
    return res.data.data;
  },

  deleteAssessment: async (assessmentId: string): Promise<void> => {
    await api.delete(`/grades/assessments/${assessmentId}`);
  },

  applyStandardTemplate: async (offeringId: string): Promise<AssessmentItem[]> => {
    const res = await api.post(`/grades/offerings/${offeringId}/assessments/standard-template`);
    return res.data.data;
  },

  // Teacher Course Dashboard & Grade Entry
  getTeacherCourses: async (): Promise<TeacherCourseCard[]> => {
    const res = await api.get('/grades/teacher/courses');
    return res.data.data;
  },

  getOfferingGradeSheet: async (offeringId: string): Promise<CourseOfferingGradeSheet> => {
    const res = await api.get(`/grades/offerings/${offeringId}/sheet`);
    return res.data.data;
  },

  saveDraftGrades: async (
    offeringId: string,
    grades: Array<{
      enrollmentId: string;
      assessmentId: string;
      scoreObtained: number;
      feedback?: string;
      isExempt?: boolean;
    }>
  ): Promise<{ message: string }> => {
    const res = await api.put(`/grades/offerings/${offeringId}/draft`, { grades });
    return res.data;
  },

  submitGradesForApproval: async (
    offeringId: string,
    notes?: string
  ): Promise<{ message: string }> => {
    const res = await api.post(`/grades/offerings/${offeringId}/submit`, { notes });
    return res.data;
  },

  // Deadline Management
  getDeadlinesOverview: async (academicYearId?: string): Promise<DeadlineOverviewItem[]> => {
    const res = await api.get('/grades/deadlines/overview', {
      params: academicYearId ? { academicYearId } : {},
    });
    return res.data.data;
  },

  setOfferingDeadline: async (
    offeringId: string,
    data: { gradeDeadline?: string | null; isSubmissionOpen: boolean }
  ): Promise<any> => {
    const res = await api.put(`/grades/offerings/${offeringId}/deadline`, data);
    return res.data;
  },

  // Approval Workflow
  getSubmissionsForReview: async (params?: {
    status?: string;
    academicYearId?: string;
  }): Promise<SubmissionReviewItem[]> => {
    const res = await api.get('/grades/submissions/review', { params });
    return res.data.data;
  },

  approveSubmission: async (
    submissionId: string,
    comments?: string
  ): Promise<{ message: string }> => {
    const res = await api.post(`/grades/submissions/${submissionId}/approve`, { comments });
    return res.data;
  },

  rejectSubmission: async (
    submissionId: string,
    rejectionReason: string,
    comments?: string
  ): Promise<{ message: string }> => {
    const res = await api.post(`/grades/submissions/${submissionId}/reject`, {
      rejectionReason,
      comments,
    });
    return res.data;
  },

  publishSubmission: async (submissionId: string): Promise<{ message: string }> => {
    const res = await api.post(`/grades/submissions/${submissionId}/publish`);
    return res.data;
  },

  reopenSubmission: async (
    submissionId: string,
    reason: string
  ): Promise<{ message: string }> => {
    const res = await api.post(`/grades/submissions/${submissionId}/reopen`, { reason });
    return res.data;
  },

  // Student Results
  getStudentPublishedResults: async (
    academicYearId?: string
  ): Promise<StudentPublishedResultsResponse> => {
    const res = await api.get('/grades/student/my-results', {
      params: academicYearId ? { academicYearId } : {},
    });
    return res.data.data;
  },

  // Reports
  getCourseReport: async (offeringId: string): Promise<any> => {
    const res = await api.get(`/grades/reports/course/${offeringId}`);
    return res.data.data;
  },

  getBatchReport: async (batchId: string): Promise<any> => {
    const res = await api.get(`/grades/reports/batch/${batchId}`);
    return res.data.data;
  },

  getStudentTranscript: async (studentId: string): Promise<StudentTranscript> => {
    const res = await api.get(`/grades/reports/transcript/${studentId}`);
    return res.data.data;
  },
};

export default gradeService;
