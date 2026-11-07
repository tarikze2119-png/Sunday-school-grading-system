export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGEMENT' | 'TEACHER' | 'STUDENT';

export interface StudentProfile {
  id: string;
  userId?: string;
  academicYearId?: string;
  batchId?: string;
  admissionNumber?: string;
  baptismalName?: string;
  gender?: 'MALE' | 'FEMALE';
  dateOfBirth?: string;
  guardianName?: string;
  guardianPhone?: string;
}

export interface TeacherProfile {
  id: string;
  userId?: string;
  teacherCode?: string;
  spiritualTitle?: string;
  qualification?: string;
  specialization?: string;
}

export interface ManagementProfile {
  id: string;
  userId?: string;
  department?: string;
  positionTitle?: string;
  officePhone?: string;
}

export interface User {
  id: string;
  email?: string;
  username: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  grandfatherName?: string;
  phone?: string;
  isActive: boolean;
  createdAt?: string;
  studentProfile?: StudentProfile;
  teacherProfile?: TeacherProfile;
  managementProfile?: ManagementProfile;
}
