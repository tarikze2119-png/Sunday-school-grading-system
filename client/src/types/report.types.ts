export type NotificationType =
  | 'COURSE_ASSIGNED'
  | 'REGISTRATION_CONFIRMED'
  | 'DEADLINE_APPROACHING'
  | 'GRADE_SUBMITTED'
  | 'GRADE_APPROVED'
  | 'GRADE_REJECTED'
  | 'RESULTS_PUBLISHED'
  | 'ENROLLMENT_CONFIRMED'
  | 'ANNOUNCEMENT'
  | 'SYSTEM';

export interface InAppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface StudentAcademicTermCourse {
  courseId: string;
  courseName: string;
  courseCode: string;
  creditHours: number;
  totalScore: number | null;
  letterGrade: string;
  amharicLabel: string;
  isPassed: boolean | null;
  assessments: Array<{
    name: string;
    score: number;
    maxScore: number;
    weight: number;
  }>;
}

export interface StudentAcademicTerm {
  academicYearId: string;
  academicYearName: string;
  batchName: string;
  stageLevel: string;
  registrationStatus: string;
  registeredAt: string;
  courses: StudentAcademicTermCourse[];
  termCreditHours: number;
  termGpa: number;
}

export interface StudentMultiYearHistoryResponse {
  student: {
    id: string;
    admissionNumber: string;
    fullName: string;
    baptismalName?: string | null;
    gender: string;
    phone?: string | null;
    guardianName?: string | null;
    guardianPhone?: string | null;
  };
  summary: {
    totalTerms: number;
    cumulativeCredits: number;
    cumulativeGpa: number;
    distinction: string;
  };
  historyTerms: StudentAcademicTerm[];
}

export interface StudentsByYearItem {
  academicYearId: string;
  academicYearName: string;
  code: string;
  isCurrent: boolean;
  status: string;
  totalBatches: number;
  totalStudents: number;
  maleStudents: number;
  femaleStudents: number;
  activeStudents: number;
  promotedStudents: number;
  students: Array<{
    studentId: string;
    admissionNumber: string;
    fullName: string;
    baptismalName?: string | null;
    gender: string;
    batchName: string;
    status: string;
    registeredAt: string;
  }>;
}

export interface StudentsByBatchItem {
  batchId: string;
  batchName: string;
  code: string;
  stageLevel: string;
  academicYearId: string;
  academicYearName: string;
  totalCourses: number;
  totalStudents: number;
  maleStudents: number;
  femaleStudents: number;
  students: Array<{
    studentId: string;
    admissionNumber: string;
    fullName: string;
    baptismalName?: string | null;
    gender: string;
    phone?: string | null;
    status: string;
  }>;
}

export interface StudentsByCourseItem {
  offeringId: string;
  courseId: string;
  courseTitle: string;
  courseCode: string;
  creditHours: number;
  academicYearName: string;
  batchName: string;
  teachers: string[];
  totalEnrolled: number;
  passedCount: number;
  failedCount: number;
  pendingCount: number;
  students: Array<{
    studentId: string;
    admissionNumber: string;
    fullName: string;
    baptismalName?: string | null;
    finalNumericScore: number | null;
    finalLetterGrade: string;
    isPassed: boolean | null;
  }>;
}

export interface TeacherAssignmentReportItem {
  teacherId: string;
  teacherCode: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  qualification: string;
  specialization: string;
  totalAssignedCourses: number;
  totalStudentsTaught: number;
  assignments: Array<{
    assignmentId: string;
    isPrimary: boolean;
    courseName: string;
    courseCode: string;
    academicYear: string;
    batchName: string;
    enrolledStudentsCount: number;
    submissionStatus: string;
    gradeDeadline?: string | null;
  }>;
}

export interface CourseWisePerformanceItem {
  offeringId: string;
  courseName: string;
  courseCode: string;
  academicYearName: string;
  batchName: string;
  totalEnrolled: number;
  totalGraded: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: string;
  gradeDistribution: Record<string, number>;
  submissionStatus: string;
}

export interface BatchWisePerformanceItem {
  batchId: string;
  batchName: string;
  stageLevel: string;
  academicYearName: string;
  totalStudents: number;
  totalCourses: number;
  averageScore: number;
  passRate: string;
  topStudents: Array<{
    studentId: string;
    admissionNumber: string;
    fullName: string;
    average: number;
    completedCourses: number;
  }>;
}

export interface StudentPerformanceItem {
  studentId: string;
  admissionNumber: string;
  fullName: string;
  baptismalName?: string | null;
  gender: string;
  academicYearName: string;
  batchName: string;
  totalEnrolledCourses: number;
  completedCoursesCount: number;
  totalEarnedCredits: number;
  gpa: number;
  distinction: string;
  courses: Array<{
    courseName: string;
    courseCode: string;
    creditHours: number;
    score: number | null;
    letterGrade: string;
    isPassed: boolean | null;
  }>;
}

export interface GradeSubmissionProgressReport {
  summary: {
    TOTAL: number;
    NOT_STARTED: number;
    DRAFT: number;
    SUBMITTED: number;
    APPROVED: number;
    REJECTED: number;
    PUBLISHED: number;
    OVERDUE: number;
    completionRate: string;
  };
  items: Array<{
    offeringId: string;
    courseName: string;
    courseCode: string;
    academicYear: string;
    batchName: string;
    teachers: string[];
    submissionStatus: string;
    gradeDeadline?: string | null;
    isOverdue: boolean;
    isSubmissionOpen: boolean;
  }>;
}

export interface ApprovedAndRejectedGradesItem {
  approvalId: string;
  decision: 'APPROVED' | 'REJECTED';
  decidedAt: string;
  comments?: string | null;
  rejectionReason?: string | null;
  courseName: string;
  courseCode: string;
  academicYearName: string;
  batchName: string;
  submittedBy: string;
  decidedBy: string;
}
