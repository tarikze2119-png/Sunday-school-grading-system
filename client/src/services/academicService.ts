import api from './api';

export interface AcademicYearData {
  id: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: 'ACTIVE' | 'ARCHIVED' | 'COMPLETED' | 'UPCOMING';
  description?: string;
  _count?: {
    batches: number;
    courseOfferings: number;
    students: number;
  };
}

export interface BatchData {
  id: string;
  academicYearId: string;
  name: string;
  code: string;
  stageLevel: string;
  description?: string;
  isActive: boolean;
  academicYear?: { id: string; name: string; isCurrent: boolean };
  _count?: {
    students: number;
    courseOfferings: number;
  };
}

export const academicService = {
  // Years
  getYears: async () => {
    const res = await api.get<{ success: boolean; data: AcademicYearData[] }>('/academic/years');
    return res.data.data;
  },
  getAcademicYears: async () => {
    return academicService.getYears();
  },
  createYear: async (data: { name: string; code: string; startDate: string; endDate: string; isCurrent?: boolean; description?: string }) => {
    const res = await api.post<{ success: boolean; message: string; data: AcademicYearData }>('/academic/years', data);
    return res.data;
  },
  updateYear: async (id: string, data: Partial<AcademicYearData>) => {
    const res = await api.put<{ success: boolean; message: string; data: AcademicYearData }>(`/academic/years/${id}`, data);
    return res.data;
  },
  closeYear: async (id: string) => {
    const res = await api.patch<{ success: boolean; message: string; data: AcademicYearData }>(`/academic/years/${id}/close`);
    return res.data;
  },
  setCurrentYear: async (id: string) => {
    const res = await api.patch<{ success: boolean; message: string }>(`/academic/years/${id}/set-current`);
    return res.data;
  },
  updateYearStatus: async (id: string, status: string) => {
    const res = await api.patch<{ success: boolean; message: string }>(`/academic/years/${id}/status`, { status });
    return res.data;
  },
  deleteYear: async (id: string) => {
    const res = await api.delete<{ success: boolean; message: string }>(`/academic/years/${id}`);
    return res.data;
  },

  // Batches
  getBatches: async (academicYearId?: string) => {
    const url = academicYearId ? `/academic/batches?academicYearId=${academicYearId}` : '/academic/batches';
    const res = await api.get<{ success: boolean; data: BatchData[] }>(url);
    return res.data.data;
  },
  createBatch: async (data: { academicYearId: string; name: string; code: string; stageLevel: string; description?: string }) => {
    const res = await api.post<{ success: boolean; message: string; data: BatchData }>('/academic/batches', data);
    return res.data;
  },
  updateBatch: async (id: string, data: Partial<BatchData>) => {
    const res = await api.put<{ success: boolean; message: string; data: BatchData }>(`/academic/batches/${id}`, data);
    return res.data;
  },
  getBatchStudents: async (batchId: string) => {
    const res = await api.get<{ success: boolean; data: any }>(`/academic/batches/${batchId}/students`);
    return res.data.data;
  },
  toggleBatch: async (id: string, isActive: boolean) => {
    const res = await api.patch<{ success: boolean; message: string }>(`/academic/batches/${id}/toggle-status`, { isActive });
    return res.data;
  },
  deleteBatch: async (id: string) => {
    const res = await api.delete<{ success: boolean; message: string }>(`/academic/batches/${id}`);
    return res.data;
  },
};

export default academicService;
