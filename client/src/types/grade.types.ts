export type GradeSubmissionStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'PUBLISHED'
  | 'NOT_STARTED';

export type ApprovalDecision = 'APPROVED' | 'REJECTED';

export type AssessmentType =
  | 'ATTENDANCE_DISCIPLINE'
  | 'HOMEWORK_ASSIGNMENT'
  | 'QUIZ'
  | 'MIDTERM_EXAM'
  | 'FINAL_EXAM'
  | 'PROJECT'
  | 'PRACTICAL_LITURGY';

export interface AssessmentItem {
  id: string;
  courseOfferingId: string;
  name: string;
  type: AssessmentType;
  maxScore: number;
  weightPercentage: number;
  description?: string;
  displayOrder: number;
}

export interface StudentGradeEntry {
  scoreObtained: number;
  isExempt: boolean;
  feedback?: string;
}

export interface GradingScaleItem {
  id: string;
  letterGrade: string;
  amharicLabel: string;
  minScore: number;
  maxScore: number;
  gradePoint: number;
  isPassing: boolean;
  displayOrder?: number;
}

export interface TeacherCourseCard {
  offeringId: string;
  courseId: string;
  courseName: string;
  courseCode: string;
  creditHours: number;
  academicYearId: string;
  academicYearName: string;
  batchId: string;
  batchName: string;
  stageLevel: string;
  termSemester: string;
  enrolledStudentsCount: number;
  gradeDeadline: string | null;
  isSubmissionOpen: boolean;
  isOverdue: boolean;
  totalWeight: number;
  assessmentsCount: number;
  appliedScheme?: {
    id: string;
    name: string;
    versionNumber: number;
    componentsCount?: number;
  } | null;
  submissionStatus: GradeSubmissionStatus;
  rejectionReason: string | null;
  submissionDate: string | null;
  version: number;
}

export interface GradeSheetStudentRow {
  enrollmentId: string;
  studentId: string;
  admissionNumber: string;
  fullName: string;
  baptismalName?: string | null;
  phone?: string | null;
  grades: Record<string, StudentGradeEntry>;
  totalScore: number;
  letterGrade: string;
  gradeAmharicLabel: string;
  isPassed: boolean;
  finalNumericScore: number | null;
  finalLetterGrade: string | null;
}

export interface CourseOfferingGradeSheet {
  offering: {
    id: string;
    courseName: string;
    courseCode: string;
    creditHours: number;
    academicYearName: string;
    batchName: string;
    termSemester: string;
    gradeDeadline: string | null;
    isSubmissionOpen: boolean;
    isLocked: boolean;
    teachers: string[];
  };
  appliedScheme?: {
    id: string;
    name: string;
    versionNumber: number;
    originSchemeName?: string;
    components: Array<{
      id: string;
      name: string;
      percentage: number;
      maxScore: number;
      type?: AssessmentType;
      orderIndex?: number;
    }>;
  } | null;
  assessments: AssessmentItem[];
  totalWeight: number;
  gradingScales: GradingScaleItem[];
  latestSubmission: {
    id: string;
    status: GradeSubmissionStatus;
    submissionDate: string | null;
    rejectionReason: string | null;
    notes?: string | null;
    version: number;
  } | null;
  students: GradeSheetStudentRow[];
}

export interface DeadlineOverviewItem {
  id: string;
  courseName: string;
  courseCode: string;
  academicYearName: string;
  batchName: string;
  enrolledCount: number;
  teachers: string[];
  gradeDeadline: string | null;
  isSubmissionOpen: boolean;
  isOverdue: boolean;
  daysRemaining: number | null;
  submissionStatus: GradeSubmissionStatus;
}

export interface SubmissionReviewItem {
  id: string;
  courseOfferingId: string;
  submittedById: string;
  status: GradeSubmissionStatus;
  submissionDate: string | null;
  rejectionReason: string | null;
  version: number;
  notes?: string | null;
  updatedAt: string;
  courseOffering: {
    id: string;
    course: { title: string; amharicTitle: string; code: string };
    academicYear: { name: string };
    batch: { name: string };
    appliedScheme?: {
      id: string;
      name: string;
      versionNumber: number;
      components: any[];
    } | null;
    assessments: AssessmentItem[];
    _count: { enrollments: number };
  };
  submittedBy: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    phone?: string;
  };
  approvals: Array<{
    id: string;
    decision: ApprovalDecision;
    comments?: string;
    decidedAt: string;
    approvedBy: { firstName: string; lastName: string };
  }>;
}

export interface StudentPublishedResultItem {
  enrollmentId: string;
  courseName: string;
  courseCode: string;
  creditHours: number;
  academicYearName: string;
  batchName: string;
  termSemester: string;
  appliedSchemeName?: string;
  assessmentBreakdown: Array<{
    assessmentName: string;
    assessmentType: AssessmentType;
    maxScore: number;
    weightPercentage: number;
    scoreObtained: number;
    weightedScore: number;
    isExempt: boolean;
  }>;
  totalScore: number;
  letterGrade: string;
  gradeAmharicLabel: string;
  gradePoint: number;
  isPassed: boolean;
  publishedAt: string | null;
}

export interface StudentPublishedResultsResponse {
  student: {
    id: string;
    admissionNumber: string;
    fullName: string;
    baptismalName?: string | null;
  };
  results: StudentPublishedResultItem[];
  summary: {
    totalCoursesTaken: number;
    totalCreditHours: number;
    gpa: number;
  };
}

export interface StudentTranscript {
  student: {
    id: string;
    admissionNumber: string;
    fullName: string;
    baptismalName?: string | null;
    gender: string;
    guardianName?: string | null;
    guardianPhone?: string | null;
  };
  academicTerms: Array<{
    academicYearName: string;
    batchName: string;
    termSemester: string;
    termCredits: number;
    termGpa: number;
    courses: Array<{
      courseCode: string;
      courseName: string;
      creditHours: number;
      score: number | null;
      letterGrade: string;
      gradePoint: number;
      isPassed: boolean | null;
    }>;
  }>;
  cumulativeGpa: number;
  totalCreditsEarned: number;
}
