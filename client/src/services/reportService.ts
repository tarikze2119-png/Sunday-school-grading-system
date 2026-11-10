import api from './api';
import {
  StudentsByYearItem,
  StudentsByBatchItem,
  StudentsByCourseItem,
  TeacherAssignmentReportItem,
  CourseWisePerformanceItem,
  BatchWisePerformanceItem,
  StudentPerformanceItem,
  GradeSubmissionProgressReport,
  ApprovedAndRejectedGradesItem,
  StudentMultiYearHistoryResponse,
} from '../types/report.types';

export interface ReportFilterParams {
  academicYearId?: string;
  batchId?: string;
  courseId?: string;
  teacherId?: string;
  studentId?: string;
  search?: string;
}

export const reportService = {
  getStudentsByAcademicYear: async (params?: ReportFilterParams): Promise<StudentsByYearItem[]> => {
    const res = await api.get('/reports/students-by-year', { params });
    return res.data.data;
  },

  getStudentsByBatch: async (params?: ReportFilterParams): Promise<StudentsByBatchItem[]> => {
    const res = await api.get('/reports/students-by-batch', { params });
    return res.data.data;
  },

  getStudentsByCourse: async (params?: ReportFilterParams): Promise<StudentsByCourseItem[]> => {
    const res = await api.get('/reports/students-by-course', { params });
    return res.data.data;
  },

  getTeacherAssignments: async (params?: ReportFilterParams): Promise<TeacherAssignmentReportItem[]> => {
    const res = await api.get('/reports/teacher-assignments', { params });
    return res.data.data;
  },

  getCoursePerformance: async (params?: ReportFilterParams): Promise<CourseWisePerformanceItem[]> => {
    const res = await api.get('/reports/course-performance', { params });
    return res.data.data;
  },

  getBatchPerformance: async (params?: ReportFilterParams): Promise<BatchWisePerformanceItem[]> => {
    const res = await api.get('/reports/batch-performance', { params });
    return res.data.data;
  },

  getStudentPerformance: async (params?: ReportFilterParams): Promise<StudentPerformanceItem[]> => {
    const res = await api.get('/reports/student-performance', { params });
    return res.data.data;
  },

  getSubmissionProgress: async (params?: ReportFilterParams): Promise<GradeSubmissionProgressReport> => {
    const res = await api.get('/reports/submission-progress', { params });
    return res.data.data;
  },

  getApprovedAndRejectedGrades: async (params?: ReportFilterParams): Promise<ApprovedAndRejectedGradesItem[]> => {
    const res = await api.get('/reports/approvals-log', { params });
    return res.data.data;
  },

  getStudentAcademicHistory: async (studentId: string = 'me'): Promise<StudentMultiYearHistoryResponse> => {
    const res = await api.get(`/reports/student-history/${studentId}`);
    return res.data.data;
  },

  downloadCsvReport: async (reportType: string, params?: ReportFilterParams): Promise<void> => {
    try {
      const res = await api.get(`/reports/export/${reportType}`, {
        params,
        responseType: 'blob',
      });

      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}_report_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          throw new Error(json.message || 'ሪፖርቱን ወደ Excel ማውረድ አልተቻለም።');
        } catch {
          throw new Error('ሪፖርቱን ወደ Excel ማውረድ አልተቻለም።');
        }
      }
      throw err;
    }
  },
};

export default reportService;
