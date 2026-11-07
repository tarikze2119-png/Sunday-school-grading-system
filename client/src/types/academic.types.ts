export type AcademicYearStatus = 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type OfferingStatus = 'PLANNED' | 'ACTIVE' | 'GRADES_PENDING' | 'COMPLETED' | 'ARCHIVED';

export interface AcademicYear {
  id: string;
  name: string; // e.g. "2016 ዓ.ም."
  code: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: AcademicYearStatus;
  description?: string;
}

export interface Batch {
  id: string;
  academicYearId: string;
  name: string; // e.g. "ምድብ 1 - ሕፃናት"
  code: string;
  stageLevel: string;
  description?: string;
  academicYear?: AcademicYear;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  amharicTitle: string;
  description?: string;
  creditHours: number;
}

export interface CourseOffering {
  id: string;
  courseId: string;
  academicYearId: string;
  batchId: string;
  termSemester: string;
  status: OfferingStatus;
  course?: Course;
  academicYear?: AcademicYear;
  batch?: Batch;
}

export type CourseOfferingItem = any;
export type BatchItem = any;
export type AcademicYearItem = any;
export type { StudentListItem } from '../services/studentService';
