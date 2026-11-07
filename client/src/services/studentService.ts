import api from './api';

export interface StudentListItem {
  id: string;
  userId: string;
  academicYearId: string;
  batchId: string;
  admissionNumber: string;
  baptismalName?: string;
  gender: 'MALE' | 'FEMALE';
  dateOfBirth?: string;
  guardianName?: string;
  guardianPhone?: string;
  emergencyContact?: string;
  user: {
    id: string;
    username: string;
    email?: string;
    phone?: string;
    firstName: string;
    lastName: string;
    grandfatherName?: string;
    isActive: boolean;
  };
  academicYear: { id: string; name: string; code: string };
  batch: { id: string; name: string; stageLevel: string };
  registrations?: Array<{
    id: string;
    status: string;
    academicYear: { name: string };
    batch: { name: string };
    registeredAt: string;
  }>;
  _count?: { enrollments: number; grades: number };
}

export const studentService = {
  list: async (params?: { academicYearId?: string; batchId?: string; search?: string; isActive?: boolean; page?: number; limit?: number }) => {
    const res = await api.get<{
      success: boolean;
      data: { total: number; page: number; totalPages: number; students: StudentListItem[] };
    }>('/students', { params });
    return res.data.data;
  },

  getStudents: async (params?: { academicYearId?: string; batchId?: string; search?: string; isActive?: boolean; page?: number; limit?: number }): Promise<StudentListItem[]> => {
    const res = await studentService.list(params);
    return res?.students || [];
  },

  register: async (data: any) => {
    const res = await api.post<{ success: boolean; message: string; data: StudentListItem }>('/students', data);
    return res.data;
  },

  promote: async (studentId: string, newAcademicYearId: string, newBatchId: string) => {
    const res = await api.post<{ success: boolean; message: string }>(`/students/${studentId}/promote`, {
      newAcademicYearId,
      newBatchId,
    });
    return res.data;
  },

  importExcel: async (academicYearId: string, batchId: string, rows: any[]) => {
    const res = await api.post<{ success: boolean; message: string; data: any }>('/students/import-excel', {
      academicYearId,
      batchId,
      rows,
    });
    return res.data;
  },

  exportCSVUrl: (academicYearId?: string, batchId?: string) => {
    const base = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    const params = new URLSearchParams();
    if (academicYearId) params.append('academicYearId', academicYearId);
    if (batchId) params.append('batchId', batchId);
    return `${base}/students/export-csv?${params.toString()}`;
  },
};

export default studentService;
