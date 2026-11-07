import { AssessmentType } from './grade.types';

export interface GradingComponent {
  id: string;
  versionId: string;
  name: string;
  percentage: number;
  defaultMaxScore: number;
  orderIndex: number;
  type: AssessmentType;
  description?: string;
  createdAt?: string;
}

export interface GradingSchemeVersion {
  id: string;
  schemeId: string;
  versionNumber: number;
  description?: string;
  status: string;
  isLatest: boolean;
  createdAt: string;
  components: GradingComponent[];
}

export interface GradingScheme {
  id: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'DRAFT';
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  totalVersions: number;
  appliedCoursesCount: number;
  latestVersion: {
    id: string;
    versionNumber: number;
    description?: string;
    createdAt: string;
    components: GradingComponent[];
  } | null;
  versions?: GradingSchemeVersion[];
}

export interface CourseGradingComponent {
  id: string;
  courseGradingSchemeId: string;
  name: string;
  percentage: number;
  maxScore: number;
  orderIndex: number;
  type: AssessmentType;
  assessmentId?: string;
}

export interface CourseGradingScheme {
  id: string;
  courseOfferingId: string;
  originSchemeId?: string;
  originVersionId?: string;
  name: string;
  versionNumber: number;
  isActive: boolean;
  totalWeight: number;
  appliedById?: string;
  appliedAt: string;
  changeReason?: string;
  components: CourseGradingComponent[];
  originSchemeName?: string;
}

export interface GradeCalculationSnapshot {
  id: string;
  reason: string;
  studentCount: number;
  createdAt: string;
  createdBy?: {
    firstName: string;
    lastName: string;
    role: string;
  };
  snapshotData: any;
}

export interface AssignableCourse {
  offeringId: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  amharicTitle?: string;
  academicYearId: string;
  academicYearName: string;
  batchId: string;
  batchName: string;
  termSemester: string;
  status: string;
  enrolledStudentsCount: number;
  teachers: Array<{
    id: string;
    name: string;
    isPrimary: boolean;
  }>;
  activeScheme: {
    id: string;
    name: string;
    versionNumber: number;
    appliedAt: string;
    componentsCount: number;
    components: CourseGradingComponent[];
  } | null;
  latestSubmissionStatus: string;
}

export interface CourseSchemeDetailsResponse {
  offeringId: string;
  courseTitle: string;
  amharicTitle?: string;
  courseCode: string;
  academicYear: string;
  batch: string;
  enrolledStudentsCount: number;
  totalGradesEntered: number;
  hasGrades: boolean;
  hasSubmittedGrades: boolean;
  activeScheme: CourseGradingScheme | null;
  history: Array<{
    id: string;
    name: string;
    versionNumber: number;
    isActive: boolean;
    appliedAt: string;
    changeReason?: string;
    componentsCount: number;
    components: CourseGradingComponent[];
  }>;
  snapshots: GradeCalculationSnapshot[];
}

export interface CreateGradingSchemePayload {
  name: string;
  description?: string;
  components: Array<{
    name: string;
    percentage: number;
    defaultMaxScore?: number;
    type?: AssessmentType;
    orderIndex?: number;
    description?: string;
  }>;
}

export interface ApplySchemePayload {
  schemeId: string;
  versionId?: string;
  applicationOption:
    | 'ALL_SELECTED'
    | 'BATCH_ALL'
    | 'ACADEMIC_YEAR_ALL'
    | 'INDIVIDUAL'
    | 'MULTIPLE_INDIVIDUAL';
  academicYearId?: string;
  batchId?: string;
  courseOfferingIds?: string[];
}

export interface UpdateCourseSchemePayload {
  name?: string;
  changeReason?: string;
  components: Array<{
    name: string;
    percentage: number;
    maxScore?: number;
    type?: AssessmentType;
    orderIndex?: number;
  }>;
  confirmRecalculation?: boolean;
}
