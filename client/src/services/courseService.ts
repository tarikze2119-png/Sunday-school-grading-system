import api from './api';

export interface CourseData {
  id: string;
  code: string;
  title: string;
  amharicTitle: string;
  description?: string;
  creditHours: number;
  isActive: boolean;
  _count?: { offerings: number };
}

export interface CourseOfferingData {
  id: string;
  courseId: string;
  academicYearId: string;
  batchId: string;
  termSemester: string;
  status: string;
  course: CourseData;
  academicYear: { id: string; name: string; code: string };
  batch: { id: string; name: string; stageLevel: string };
  teacherAssignments: Array<{
    id: string;
    isPrimary: boolean;
    teacher: {
      id: string;
      teacherCode: string;
      spiritualTitle?: string;
      user: { id: string; firstName: string; lastName: string; phone?: string };
    };
  }>;
  _count?: { enrollments: number; assessments: number };
}

export const courseService = {
  // Catalog
  listCourses: async (search?: string) => {
    const res = await api.get<{ success: boolean; data: CourseData[] }>('/courses', {
      params: { search },
    });
    return res.data.data;
  },

  createCourse: async (data: { code: string; title: string; amharicTitle: string; creditHours?: number; description?: string }) => {
    const res = await api.post<{ success: boolean; message: string; data: CourseData }>('/courses', data);
    return res.data;
  },

  // Offerings
  listOfferings: async (params?: { academicYearId?: string; batchId?: string; teacherId?: string }) => {
    const res = await api.get<{ success: boolean; data: CourseOfferingData[] }>('/courses/offerings/list', { params });
    return res.data.data;
  },

  createOffering: async (data: { courseId: string; academicYearId: string; batchId: string; termSemester?: string; primaryTeacherId?: string }) => {
    const res = await api.post<{ success: boolean; message: string; data: CourseOfferingData }>('/courses/offerings', data);
    return res.data;
  },

  assignTeacher: async (offeringId: string, teacherId: string, isPrimary = true) => {
    const res = await api.post<{ success: boolean; message: string; data: any }>(
      `/courses/offerings/${offeringId}/assign-teacher`,
      { teacherId, isPrimary }
    );
    return res.data;
  },

  removeTeacherAssignment: async (assignmentId: string) => {
    const res = await api.delete<{ success: boolean; message: string }>(
      `/courses/offerings/teacher-assignments/${assignmentId}`
    );
    return res.data;
  },
};

export default courseService;
