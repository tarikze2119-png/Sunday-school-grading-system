import api from './api';

export interface EnrolledStudentData {
  id: string;
  studentId: string;
  courseOfferingId: string;
  enrolledAt: string;
  finalNumericScore?: number;
  finalLetterGrade?: string;
  isPassed?: boolean;
  student: {
    id: string;
    admissionNumber: string;
    baptismalName?: string;
    user: { id: string; firstName: string; lastName: string; phone?: string };
    batch: { name: string };
  };
  _count?: { grades: number };
}

export const enrollmentService = {
  getOfferingStudents: async (offeringId: string) => {
    const res = await api.get<{ success: boolean; data: EnrolledStudentData[] }>(
      `/enrollments/offerings/${offeringId}/students`
    );
    return res.data.data;
  },

  enrollIndividual: async (courseOfferingId: string, studentId: string) => {
    const res = await api.post<{ success: boolean; message: string; data: any }>(
      '/enrollments/individual',
      { courseOfferingId, studentId }
    );
    return res.data;
  },

  bulkEnrollBatch: async (courseOfferingId: string) => {
    const res = await api.post<{
      success: boolean;
      message: string;
      data: { enrolledCount: number; skippedCount: number };
    }>(`/enrollments/offerings/${courseOfferingId}/bulk-enroll`);
    return res.data;
  },

  transfer: async (studentId: string, fromOfferingId: string, toOfferingId: string) => {
    const res = await api.post<{ success: boolean; message: string }>('/enrollments/transfer', {
      studentId,
      fromOfferingId,
      toOfferingId,
    });
    return res.data;
  },

  unenroll: async (enrollmentId: string) => {
    const res = await api.delete<{ success: boolean; message: string }>(`/enrollments/${enrollmentId}`);
    return res.data;
  },
};

export default enrollmentService;
