import api from './api';

export interface TeacherListItem {
  id: string;
  userId: string;
  teacherCode: string;
  spiritualTitle?: string;
  qualification?: string;
  specialization?: string;
  joinedDate: string;
  user: {
    id: string;
    username: string;
    email?: string;
    phone?: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
  };
  assignments: Array<{
    id: string;
    isPrimary: boolean;
    courseOffering: {
      id: string;
      course: { amharicTitle: string; code: string };
      academicYear: { name: string };
      batch: { name: string };
    };
  }>;
}

export const teacherService = {
  list: async (params?: { search?: string; page?: number; limit?: number }) => {
    const res = await api.get<{
      success: boolean;
      data: { total: number; page: number; totalPages: number; teachers: TeacherListItem[] };
    }>('/teachers', { params });
    return res.data.data;
  },

  register: async (data: any) => {
    const res = await api.post<{ success: boolean; message: string; data: TeacherListItem }>('/teachers', data);
    return res.data;
  },

  getAssignments: async (teacherId: string) => {
    const res = await api.get<{ success: boolean; data: any[] }>(`/teachers/${teacherId}/assignments`);
    return res.data.data;
  },
};

export default teacherService;
