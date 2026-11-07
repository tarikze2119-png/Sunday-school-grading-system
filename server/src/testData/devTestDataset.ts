/**
 * Separate Development & Test Dataset for Sunday School Grading Management System
 * 
 * Dataset specifications:
 * - 2 Academic Years (2016 ዓ.ም. and 2017 ዓ.ም.)
 * - 3 Batches per Academic Year (Total 6 batches)
 * - 5 Teachers with teacher profiles and distinct specializations
 * - 5 Courses in theological curriculum
 * - 30 Students with baptismal names, guardians, and unique admission numbers
 * - Multiple Teacher-Course Assignments (teachers assigned to multiple batches/courses)
 * - Multiple Student Enrollments across course offerings
 * - Sample grades spanning all approval statuses: DRAFT, SUBMITTED, APPROVED, REJECTED, PUBLISHED
 * 
 * NOTE: Contains ONLY synthetic development/test accounts.
 * Passwords use standard test hash and are NEVER real production credentials.
 */

// Universal test password hash (representing 'Test@SundaySchool2026')
export const DEV_TEST_PASSWORD_HASH = '$2a$12$eXAMPLeHaSHFoRDEvELOPmenTTesTiNgPurPOsEsOnLY2026@secure';

export interface DevAcademicYear {
  id: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: 'ACTIVE' | 'COMPLETED' | 'UPCOMING' | 'ARCHIVED';
  description: string;
}

export interface DevBatch {
  id: string;
  academicYearId: string;
  name: string;
  code: string;
  stageLevel: string;
  description: string;
  isActive: boolean;
}

export interface DevUser {
  id: string;
  username: string;
  passwordHash: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGEMENT' | 'TEACHER' | 'STUDENT';
  firstName: string;
  lastName: string;
  grandfatherName?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
}

export interface DevTeacher {
  id: string;
  userId: string;
  teacherCode: string;
  spiritualTitle: string;
  qualification: string;
  specialization: string;
}

export interface DevCourse {
  id: string;
  code: string;
  title: string;
  amharicTitle: string;
  description: string;
  creditHours: number;
  isActive: boolean;
}

export interface DevStudent {
  id: string;
  userId: string;
  academicYearId: string;
  batchId: string;
  admissionNumber: string;
  baptismalName: string;
  gender: 'MALE' | 'FEMALE';
  guardianName: string;
  guardianPhone: string;
  dateOfBirth?: string;
}

export interface DevCourseOffering {
  id: string;
  courseId: string;
  academicYearId: string;
  batchId: string;
  termSemester: string;
  status: 'ACTIVE' | 'COMPLETED' | 'GRADES_PENDING' | 'PLANNED';
  gradeDeadline: string;
  isSubmissionOpen: boolean;
}

export interface DevTeacherAssignment {
  id: string;
  teacherId: string;
  courseOfferingId: string;
  isPrimary: boolean;
}

export interface DevEnrollment {
  id: string;
  studentId: string;
  courseOfferingId: string;
  finalNumericScore?: number | null;
  finalLetterGrade?: string | null;
  isPassed?: boolean | null;
}

export interface DevAssessment {
  id: string;
  courseOfferingId: string;
  name: string;
  maxScore: number;
  weightPercentage: number;
}

export interface DevGradeSubmission {
  id: string;
  courseOfferingId: string;
  submittedById: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';
  submissionDate?: string;
  rejectionReason?: string | null;
  version: number;
  publishedAt?: string | null;
  publishedById?: string | null;
}

export interface DevGrade {
  id: string;
  enrollmentId: string;
  assessmentId: string;
  studentId: string;
  scoreObtained: number;
}

// =============================================================================
// 1. ACADEMIC YEARS (Exactly 2 Years)
// =============================================================================
export const devAcademicYears: DevAcademicYear[] = [
  {
    id: 'ay-dev-2016',
    name: '2016 ዓ.ም.',
    code: 'AY-2016-DEV',
    startDate: '2023-09-12',
    endDate: '2024-07-07',
    isCurrent: false,
    status: 'COMPLETED',
    description: 'የ2016 ዓ.ም. የተጠናቀቀ የትምህርት ዘመን (Historical Year 1)',
  },
  {
    id: 'ay-dev-2017',
    name: '2017 ዓ.ም.',
    code: 'AY-2017-DEV',
    startDate: '2024-09-11',
    endDate: '2025-07-07',
    isCurrent: true,
    status: 'ACTIVE',
    description: 'የ2017 ዓ.ም. ወቅታዊ ንቁ የትምህርት ዘመን (Current Active Year 2)',
  },
];

// =============================================================================
// 2. BATCHES (Exactly 3 Batches per Academic Year = 6 Batches Total)
// =============================================================================
export const devBatches: DevBatch[] = [
  // Batches under 2016 ዓ.ም.
  {
    id: 'batch-dev-2016-01',
    academicYearId: 'ay-dev-2016',
    name: 'ምድብ 1 - የሕፃናት ክፍል (2016)',
    code: 'BATCH-2016-CHILDREN',
    stageLevel: 'ደረጃ 1 (ሕፃናት)',
    description: 'ከ7-12 ዓመት ላሉ ሕፃናት የተዘጋጀ ክፍል',
    isActive: false,
  },
  {
    id: 'batch-dev-2016-02',
    academicYearId: 'ay-dev-2016',
    name: 'ምድብ 2 - የወጣቶች ክፍል (2016)',
    code: 'BATCH-2016-YOUTH',
    stageLevel: 'ደረጃ 2 (ወጣቶች)',
    description: 'ከ13-25 ዓመት ላሉ ወጣቶች የተዘጋጀ ክፍል',
    isActive: false,
  },
  {
    id: 'batch-dev-2016-03',
    academicYearId: 'ay-dev-2016',
    name: 'ምድብ 3 - የአበው እና እማት ክፍል (2016)',
    code: 'BATCH-2016-ADULT',
    stageLevel: 'ደረጃ 3 (አበው)',
    description: 'ለታላላቆች የተዘጋጀ የሃይማኖት ትምህርት ክፍል',
    isActive: false,
  },

  // Batches under 2017 ዓ.ም.
  {
    id: 'batch-dev-2017-01',
    academicYearId: 'ay-dev-2017',
    name: 'ምድብ 1 - የሕፃናት ክፍል (2017)',
    code: 'BATCH-2017-CHILDREN',
    stageLevel: 'ደረጃ 1 (ሕፃናት)',
    description: 'ከ7-12 ዓመት ላሉ ሕፃናት የተዘጋጀ ክፍል (ንቁ)',
    isActive: true,
  },
  {
    id: 'batch-dev-2017-02',
    academicYearId: 'ay-dev-2017',
    name: 'ምድብ 2 - የወጣቶች ክፍል (2017)',
    code: 'BATCH-2017-YOUTH',
    stageLevel: 'ደረጃ 2 (ወጣቶች)',
    description: 'ከ13-25 ዓመት ላሉ ወጣቶች የተዘጋጀ ክፍል (ንቁ)',
    isActive: true,
  },
  {
    id: 'batch-dev-2017-03',
    academicYearId: 'ay-dev-2017',
    name: 'ምድብ 3 - የአበው እና እማት ክፍል (2017)',
    code: 'BATCH-2017-ADULT',
    stageLevel: 'ደረጃ 3 (አበው)',
    description: 'ለታላላቆች የተዘጋጀ የሃይማኖት ትምህርት ክፍል (ንቁ)',
    isActive: true,
  },
];

// =============================================================================
// 3. TEACHERS (Exactly 5 Teachers)
// =============================================================================
export const devTeacherUsers: DevUser[] = [
  {
    id: 'usr-dev-tchr-01',
    username: 'dev_teacher_tekle',
    passwordHash: DEV_TEST_PASSWORD_HASH,
    role: 'TEACHER',
    firstName: 'ተክለሃይማኖት',
    lastName: 'ወልደጊዮርጊስ',
    grandfatherName: 'ተስፋዬ',
    phone: '+251911000001',
    email: 'tekle.dev@sundayschool.org',
    isActive: true,
  },
  {
    id: 'usr-dev-tchr-02',
    username: 'dev_teacher_gebre',
    passwordHash: DEV_TEST_PASSWORD_HASH,
    role: 'TEACHER',
    firstName: 'ገብረመድህን',
    lastName: 'ዘውዴ',
    grandfatherName: 'ብርሃኑ',
    phone: '+251911000002',
    email: 'gebre.dev@sundayschool.org',
    isActive: true,
  },
  {
    id: 'usr-dev-tchr-03',
    username: 'dev_teacher_haile',
    passwordHash: DEV_TEST_PASSWORD_HASH,
    role: 'TEACHER',
    firstName: 'ኃይለሚካኤል',
    lastName: 'አሰፋ',
    grandfatherName: 'መኮንን',
    phone: '+251911000003',
    email: 'haile.dev@sundayschool.org',
    isActive: true,
  },
  {
    id: 'usr-dev-tchr-04',
    username: 'dev_teacher_bert',
    passwordHash: DEV_TEST_PASSWORD_HASH,
    role: 'TEACHER',
    firstName: 'በርተሎሜዎስ',
    lastName: 'ካሳ',
    grandfatherName: 'ኃይሌ',
    phone: '+251911000004',
    email: 'bert.dev@sundayschool.org',
    isActive: true,
  },
  {
    id: 'usr-dev-tchr-05',
    username: 'dev_teacher_welete',
    passwordHash: DEV_TEST_PASSWORD_HASH,
    role: 'TEACHER',
    firstName: 'ወለተማርያም',
    lastName: 'ደስታ',
    grandfatherName: 'ግርማ',
    phone: '+251911000005',
    email: 'welete.dev@sundayschool.org',
    isActive: true,
  },
];

export const devTeachers: DevTeacher[] = [
  {
    id: 'tchr-dev-01',
    userId: 'usr-dev-tchr-01',
    teacherCode: 'TCH-DEV-001',
    spiritualTitle: 'መምህር',
    qualification: 'የነገረ መለኮት ዲፕሎማ',
    specialization: 'ነገረ ሃይማኖት (Christian Dogmatics)',
  },
  {
    id: 'tchr-dev-02',
    userId: 'usr-dev-tchr-02',
    teacherCode: 'TCH-DEV-002',
    spiritualTitle: 'ቀሲስ',
    qualification: 'የቤተክርስቲያን ታሪክ የመጀመሪያ ዲግሪ',
    specialization: 'የቤተክርስቲያን ታሪክ (Church History)',
  },
  {
    id: 'tchr-dev-03',
    userId: 'usr-dev-tchr-03',
    teacherCode: 'TCH-DEV-003',
    spiritualTitle: 'ዲያቆን',
    qualification: 'የዜማ እና ሥርዓተ ቤተክርስቲያን ምስክር',
    specialization: 'ሥርዓተ ቤተክርስቲያን እና ዜማ (Liturgy & Chants)',
  },
  {
    id: 'tchr-dev-04',
    userId: 'usr-dev-tchr-04',
    teacherCode: 'TCH-DEV-004',
    spiritualTitle: 'መምህር',
    qualification: 'የመጽሐፍ ቅዱስ ጥናት ዲፕሎማ',
    specialization: 'የመጽሐፍ ቅዱስ ጥናት (Biblical Exegesis)',
  },
  {
    id: 'tchr-dev-05',
    userId: 'usr-dev-tchr-05',
    teacherCode: 'TCH-DEV-005',
    spiritualTitle: 'መምህርት',
    qualification: 'የግዕዝ ቋንቋ እና ንባብ ከፍተኛ ምስክር',
    specialization: 'ግዕዝ ቋንቋ እና ንባብ (Ge\'ez Language & Reading)',
  },
];

// =============================================================================
// 4. COURSES (Exactly 5 Theological Curriculum Courses)
// =============================================================================
export const devCourses: DevCourse[] = [
  {
    id: 'crs-dev-01',
    code: 'CRS-DOGMA-DEV',
    title: 'Christian Dogmatics 1',
    amharicTitle: 'ነገረ ሃይማኖት ፩',
    description: 'አምስቱ አዕማደ ምሥጢር እና ኦርቶዶክሳዊት ተዋሕዶ መሠረተ እምነት',
    creditHours: 3,
    isActive: true,
  },
  {
    id: 'crs-dev-02',
    code: 'CRS-HIST-DEV',
    title: 'Church History 1',
    amharicTitle: 'የቤተክርስቲያን ታሪክ ፩',
    description: 'የሐዲስ ኪዳን እና የኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ጥንታዊ ታሪክ',
    creditHours: 2,
    isActive: true,
  },
  {
    id: 'crs-dev-03',
    code: 'CRS-LITURGY-DEV',
    title: 'Ecclesiastical Liturgy & Hymnody',
    amharicTitle: 'ሥርዓተ ቤተክርስቲያን እና ዜማ',
    description: 'የቅዳሴ ሥርዓት፣ የበዓላት እና የአጽዋማት ቀኖና እንዲሁም መሠረታዊ ዜማ',
    creditHours: 2,
    isActive: true,
  },
  {
    id: 'crs-dev-04',
    code: 'CRS-BIBLE-DEV',
    title: 'Biblical Studies 1',
    amharicTitle: 'የመጽሐፍ ቅዱስ ጥናት',
    description: 'የብሉይ እና ሐዲስ ኪዳን መጻሕፍት ጥናትና አተረጓጎም',
    creditHours: 3,
    isActive: true,
  },
  {
    id: 'crs-dev-05',
    code: 'CRS-GEEZ-DEV',
    title: 'Ge\'ez Language & Grammar',
    amharicTitle: 'ግዕዝ ቋንቋ እና ንባብ',
    description: 'የግዕዝ ፊደላት፣ ሰዋሰው፣ የዜማ ንባብ እና ቃላት ፍቺ',
    creditHours: 2,
    isActive: true,
  },
];

// =============================================================================
// 5. STUDENTS (Exactly 30 Students: 15 in 2016, 15 in 2017)
// =============================================================================
// 5 students per batch across the 6 batches = 30 students total
const rawStudentNames = [
  // Batch 1 (2016 - Children): 5 students
  { first: 'ዮሐንስ', last: 'ተስፋዬ', baptismal: 'ወልደ ዮሐንስ', gender: 'MALE', gName: 'ተስፋዬ አስራት', gPhone: '+251911100001', bId: 'batch-dev-2016-01', yId: 'ay-dev-2016' },
  { first: 'ሳራ', last: 'ዘውዱ', baptismal: 'ወለተ ማርያም', gender: 'FEMALE', gName: 'ዘውዱ ገብሬ', gPhone: '+251911100002', bId: 'batch-dev-2016-01', yId: 'ay-dev-2016' },
  { first: 'ዳዊት', last: 'ኃይሉ', baptismal: 'ወልደ ዳዊት', gender: 'MALE', gName: 'ኃይሉ ታደሰ', gPhone: '+251911100003', bId: 'batch-dev-2016-01', yId: 'ay-dev-2016' },
  { first: 'ማርታ', last: 'ግርማ', baptismal: 'ወለተ ሐና', gender: 'FEMALE', gName: 'ግርማ አበበ', gPhone: '+251911100004', bId: 'batch-dev-2016-01', yId: 'ay-dev-2016' },
  { first: 'ኤፍሬም', last: 'አለሙ', baptismal: 'ወልደ ቂርቆስ', gender: 'MALE', gName: 'አለሙ ደበበ', gPhone: '+251911100005', bId: 'batch-dev-2016-01', yId: 'ay-dev-2016' },

  // Batch 2 (2016 - Youth): 5 students
  { first: 'ኪሩቤል', last: 'በቀለ', baptismal: 'ወልደ ሚካኤል', gender: 'MALE', gName: 'በቀለ ወልዴ', gPhone: '+251911100006', bId: 'batch-dev-2016-02', yId: 'ay-dev-2016' },
  { first: 'ሰሎሜ', last: 'ደጀኔ', baptismal: 'ወለተ ጊዮርጊስ', gender: 'FEMALE', gName: 'ደጀኔ በቀለ', gPhone: '+251911100007', bId: 'batch-dev-2016-02', yId: 'ay-dev-2016' },
  { first: 'ናሆም', last: 'ታሪኩ', baptismal: 'ወልደ ተክለሃይማኖት', gender: 'MALE', gName: 'ታሪኩ አሰፋ', gPhone: '+251911100008', bId: 'batch-dev-2016-02', yId: 'ay-dev-2016' },
  { first: 'ርብቃ', last: 'አየለ', baptismal: 'ወለተ ኪዳነምሕረት', gender: 'FEMALE', gName: 'አየለ መኮንን', gPhone: '+251911100009', bId: 'batch-dev-2016-02', yId: 'ay-dev-2016' },
  { first: 'አቤል', last: 'ፍቃዱ', baptismal: 'ወልደ ገብርኤል', gender: 'MALE', gName: 'ፍቃዱ ኃይሌ', gPhone: '+251911100010', bId: 'batch-dev-2016-02', yId: 'ay-dev-2016' },

  // Batch 3 (2016 - Adults): 5 students
  { first: 'ገብረእግዚአብሔር', last: 'ብርሃኑ', baptismal: 'ወልደ ማርያም', gender: 'MALE', gName: 'ብርሃኑ ወልደፃዲቅ', gPhone: '+251911100011', bId: 'batch-dev-2016-03', yId: 'ay-dev-2016' },
  { first: 'ወለተእግዚእ', last: 'ከበደ', baptismal: 'ወለተ ሰማዕት', gender: 'FEMALE', gName: 'ከበደ ደስታ', gPhone: '+251911100012', bId: 'batch-dev-2016-03', yId: 'ay-dev-2016' },
  { first: 'ተስፋሚካኤል', last: 'ወርቁ', baptismal: 'ወልደ ሩፋኤል', gender: 'MALE', gName: 'ወርቁ ታፈሰ', gPhone: '+251911100013', bId: 'batch-dev-2016-03', yId: 'ay-dev-2016' },
  { first: 'እህተማርያም', last: 'ጌታቸው', baptismal: 'ወለተ ጽዮን', gender: 'FEMALE', gName: 'ጌታቸው ንጉሤ', gPhone: '+251911100014', bId: 'batch-dev-2016-03', yId: 'ay-dev-2016' },
  { first: 'ኃይለእየሱስ', last: 'ታደሰ', baptismal: 'ወልደ ጴጥሮስ', gender: 'MALE', gName: 'ታደሰ ሙሉጌታ', gPhone: '+251911100015', bId: 'batch-dev-2016-03', yId: 'ay-dev-2016' },

  // Batch 4 (2017 - Children): 5 students
  { first: 'ሳሙኤል', last: 'ዮሴፍ', baptismal: 'ወልደ ሳሙኤል', gender: 'MALE', gName: 'ዮሴፍ ገብረጻድቅ', gPhone: '+251911100016', bId: 'batch-dev-2017-01', yId: 'ay-dev-2017' },
  { first: 'ሐና', last: 'ተክሉ', baptismal: 'ወለተ ሐና', gender: 'FEMALE', gName: 'ተክሉ አረጋ', gPhone: '+251911100017', bId: 'batch-dev-2017-01', yId: 'ay-dev-2017' },
  { first: 'በርናባስ', last: 'ሙሉጌታ', baptismal: 'ወልደ በርናባስ', gender: 'MALE', gName: 'ሙሉጌታ ጥላሁን', gPhone: '+251911100018', bId: 'batch-dev-2017-01', yId: 'ay-dev-2017' },
  { first: 'ኤልሳቤጥ', last: 'አበበ', baptismal: 'ወለተ ኤልሳቤጥ', gender: 'FEMALE', gName: 'አበበ ደምሴ', gPhone: '+251911100019', bId: 'batch-dev-2017-01', yId: 'ay-dev-2017' },
  { first: 'ሚካኤል', last: 'ጌታሁን', baptismal: 'ወልደ ሚካኤል', gender: 'MALE', gName: 'ጌታሁን ካሳሁን', gPhone: '+251911100020', bId: 'batch-dev-2017-01', yId: 'ay-dev-2017' },

  // Batch 5 (2017 - Youth): 5 students
  { first: 'ያሬድ', last: 'ተፈራ', baptismal: 'ወልደ ያሬድ', gender: 'MALE', gName: 'ተፈራ በቀለ', gPhone: '+251911100021', bId: 'batch-dev-2017-02', yId: 'ay-dev-2017' },
  { first: 'ሊዲያ', last: 'ታደለ', baptismal: 'ወለተ ሰሎሜ', gender: 'FEMALE', gName: 'ታደለ ገብሩ', gPhone: '+251911100022', bId: 'batch-dev-2017-02', yId: 'ay-dev-2017' },
  { first: 'ኤስድሮስ', last: 'አሸናፊ', baptismal: 'ወልደ እስጢፋኖስ', gender: 'MALE', gName: 'አሸናፊ አያሌው', gPhone: '+251911100023', bId: 'batch-dev-2017-02', yId: 'ay-dev-2017' },
  { first: 'ድልነሳው', last: 'ዘሪሁን', baptismal: 'ወልደ ጊዮርጊስ', gender: 'MALE', gName: 'ዘሪሁን ደሳለኝ', gPhone: '+251911100024', bId: 'batch-dev-2017-02', yId: 'ay-dev-2017' },
  { first: 'ትዕግሥት', last: 'ደበበ', baptismal: 'ወለተ ተክለሃይማኖት', gender: 'FEMALE', gName: 'ደበበ ማሞ', gPhone: '+251911100025', bId: 'batch-dev-2017-02', yId: 'ay-dev-2017' },

  // Batch 6 (2017 - Adults): 5 students
  { first: 'ተክለወልድ', last: 'ሀብቴ', baptismal: 'ወልደ እግዚእ', gender: 'MALE', gName: 'ሀብቴ ገብረኪዳን', gPhone: '+251911100026', bId: 'batch-dev-2017-03', yId: 'ay-dev-2017' },
  { first: 'ሰብለወንጌል', last: 'ጸጋዬ', baptismal: 'ወለተ ማርያም', gender: 'FEMALE', gName: 'ጸጋዬ ወንድሙ', gPhone: '+251911100027', bId: 'batch-dev-2017-03', yId: 'ay-dev-2017' },
  { first: 'ክንፈሚካኤል', last: 'አስፋው', baptismal: 'ወልደ ሚካኤል', gender: 'MALE', gName: 'አስፋው ታደሰ', gPhone: '+251911100028', bId: 'batch-dev-2017-03', yId: 'ay-dev-2017' },
  { first: 'ፍቅርተ', last: 'ወልደሰማዕት', baptismal: 'ወለተ ሰማዕታት', gender: 'FEMALE', gName: 'ወልደሰማዕት ካሳ', gPhone: '+251911100029', bId: 'batch-dev-2017-03', yId: 'ay-dev-2017' },
  { first: 'ገብረክርስቶስ', last: 'ሞላ', baptismal: 'ወልደ አረጋዊ', gender: 'MALE', gName: 'ሞላ ብርሃኔ', gPhone: '+251911100030', bId: 'batch-dev-2017-03', yId: 'ay-dev-2017' },
];

export const devStudentUsers: DevUser[] = rawStudentNames.map((s, idx) => {
  const num = String(idx + 1).padStart(3, '0');
  return {
    id: `usr-dev-stu-${num}`,
    username: `dev_student_${num}`,
    passwordHash: DEV_TEST_PASSWORD_HASH,
    role: 'STUDENT' as const,
    firstName: s.first,
    lastName: s.last,
    phone: `+251922000${num}`,
    email: `student${num}.dev@sundayschool.org`,
    isActive: true,
  };
});

export const devStudents: DevStudent[] = rawStudentNames.map((s, idx) => {
  const num = String(idx + 1).padStart(3, '0');
  const yearPrefix = s.yId === 'ay-dev-2016' ? '2016' : '2017';
  return {
    id: `stu-dev-${num}`,
    userId: `usr-dev-stu-${num}`,
    academicYearId: s.yId,
    batchId: s.bId,
    admissionNumber: `STD-${yearPrefix}-${num}`,
    baptismalName: s.baptismal,
    gender: s.gender as 'MALE' | 'FEMALE',
    guardianName: s.gName,
    guardianPhone: s.gPhone,
    dateOfBirth: '2010-01-01',
  };
});

// =============================================================================
// 6. COURSE OFFERINGS (Offerings tied to Academic Years and Batches)
// =============================================================================
export const devCourseOfferings: DevCourseOffering[] = [
  // Offering 1 (2016 - Batch 1 - Dogmatics) - Status: COMPLETED / PUBLISHED
  {
    id: 'offering-dev-01',
    courseId: 'crs-dev-01',
    academicYearId: 'ay-dev-2016',
    batchId: 'batch-dev-2016-01',
    termSemester: '1ኛ መንፈቅ',
    status: 'COMPLETED',
    gradeDeadline: '2024-02-01',
    isSubmissionOpen: false,
  },
  // Offering 2 (2016 - Batch 2 - Church History) - Status: COMPLETED / PUBLISHED
  {
    id: 'offering-dev-02',
    courseId: 'crs-dev-02',
    academicYearId: 'ay-dev-2016',
    batchId: 'batch-dev-2016-02',
    termSemester: '1ኛ መንፈቅ',
    status: 'COMPLETED',
    gradeDeadline: '2024-02-01',
    isSubmissionOpen: false,
  },
  // Offering 3 (2017 - Batch 1 - Liturgy) - Status: ACTIVE / APPROVED (Awaiting final publication)
  {
    id: 'offering-dev-03',
    courseId: 'crs-dev-03',
    academicYearId: 'ay-dev-2017',
    batchId: 'batch-dev-2017-01',
    termSemester: '1ኛ መንፈቅ',
    status: 'ACTIVE',
    gradeDeadline: '2025-03-01',
    isSubmissionOpen: true,
  },
  // Offering 4 (2017 - Batch 2 - Biblical Studies) - Status: GRADES_PENDING / SUBMITTED (Teacher submitted)
  {
    id: 'offering-dev-04',
    courseId: 'crs-dev-04',
    academicYearId: 'ay-dev-2017',
    batchId: 'batch-dev-2017-02',
    termSemester: '1ኛ መንፈቅ',
    status: 'GRADES_PENDING',
    gradeDeadline: '2025-03-15',
    isSubmissionOpen: true,
  },
  // Offering 5 (2017 - Batch 2 - Dogmatics) - Status: ACTIVE / REJECTED (Returned with justification)
  {
    id: 'offering-dev-05',
    courseId: 'crs-dev-01',
    academicYearId: 'ay-dev-2017',
    batchId: 'batch-dev-2017-02',
    termSemester: '1ኛ መንፈቅ',
    status: 'ACTIVE',
    gradeDeadline: '2025-03-20',
    isSubmissionOpen: true,
  },
  // Offering 6 (2017 - Batch 3 - Ge'ez Language) - Status: ACTIVE / DRAFT (Teacher entering scores)
  {
    id: 'offering-dev-06',
    courseId: 'crs-dev-05',
    academicYearId: 'ay-dev-2017',
    batchId: 'batch-dev-2017-03',
    termSemester: '1ኛ መንፈቅ',
    status: 'ACTIVE',
    gradeDeadline: '2025-04-01',
    isSubmissionOpen: true,
  },
];

// =============================================================================
// 7. MULTIPLE TEACHER-COURSE ASSIGNMENTS
// =============================================================================
// Rule 6: Teachers can teach multiple courses and batches
export const devTeacherAssignments: DevTeacherAssignment[] = [
  // Teacher 1 (Tekle) teaches Dogmatics in Batch 1 (2016) AND in Batch 2 (2017) -> MULTIPLE ASSIGNMENTS!
  { id: 'ta-dev-01', teacherId: 'tchr-dev-01', courseOfferingId: 'offering-dev-01', isPrimary: true },
  { id: 'ta-dev-02', teacherId: 'tchr-dev-01', courseOfferingId: 'offering-dev-05', isPrimary: true },

  // Teacher 2 (Gebre) teaches Church History in Batch 2 (2016)
  { id: 'ta-dev-03', teacherId: 'tchr-dev-02', courseOfferingId: 'offering-dev-02', isPrimary: true },

  // Teacher 3 (Haile) teaches Liturgy in Batch 1 (2017)
  { id: 'ta-dev-04', teacherId: 'tchr-dev-03', courseOfferingId: 'offering-dev-03', isPrimary: true },

  // Teacher 4 (Bert) teaches Biblical Studies in Batch 2 (2017)
  { id: 'ta-dev-05', teacherId: 'tchr-dev-04', courseOfferingId: 'offering-dev-04', isPrimary: true },

  // Teacher 5 (Welete) teaches Ge'ez in Batch 3 (2017)
  { id: 'ta-dev-06', teacherId: 'tchr-dev-05', courseOfferingId: 'offering-dev-06', isPrimary: true },
];

// =============================================================================
// 8. ASSESSMENTS CONFIGURATION (Summing to exactly 100%)
// =============================================================================
export const devAssessments: DevAssessment[] = [
  // Assessments for Offering 1 (Standard 4-Component: 20 + 20 + 20 + 40 = 100%)
  { id: 'asmt-dev-01', courseOfferingId: 'offering-dev-01', name: 'አጋማሽ ፈተና (Midterm)', maxScore: 100, weightPercentage: 20 },
  { id: 'asmt-dev-02', courseOfferingId: 'offering-dev-01', name: 'የቤት ሥራ 1 (Assignment 1)', maxScore: 100, weightPercentage: 20 },
  { id: 'asmt-dev-03', courseOfferingId: 'offering-dev-01', name: 'የቤት ሥራ 2 (Assignment 2)', maxScore: 100, weightPercentage: 20 },
  { id: 'asmt-dev-04', courseOfferingId: 'offering-dev-01', name: 'የማጠቃለያ ፈተና (Final Exam)', maxScore: 100, weightPercentage: 40 },

  // Assessments for Offering 3 (Practical 3-Component: 40 + 20 + 40 = 100%)
  { id: 'asmt-dev-05', courseOfferingId: 'offering-dev-03', name: 'ተግባራዊ ልምምድ (Practical)', maxScore: 100, weightPercentage: 40 },
  { id: 'asmt-dev-06', courseOfferingId: 'offering-dev-03', name: 'የክፍል ተሳትፎ (Participation)', maxScore: 100, weightPercentage: 20 },
  { id: 'asmt-dev-07', courseOfferingId: 'offering-dev-03', name: 'የማጠቃለያ ፈተና (Final Exam)', maxScore: 100, weightPercentage: 40 },
];

// =============================================================================
// 9. STUDENT ENROLLMENTS & SAMPLE GRADES (All 5 Approval Statuses Covered)
// =============================================================================
// 5 students of Batch 1 (2016) enrolled in Offering 1
export const devEnrollments: DevEnrollment[] = [
  { id: 'enr-dev-01', studentId: 'stu-dev-001', courseOfferingId: 'offering-dev-01', finalNumericScore: 92.00, finalLetterGrade: 'A', isPassed: true },
  { id: 'enr-dev-02', studentId: 'stu-dev-002', courseOfferingId: 'offering-dev-01', finalNumericScore: 86.50, finalLetterGrade: 'A', isPassed: true },
  { id: 'enr-dev-03', studentId: 'stu-dev-003', courseOfferingId: 'offering-dev-01', finalNumericScore: 78.00, finalLetterGrade: 'B', isPassed: true },
  { id: 'enr-dev-04', studentId: 'stu-dev-004', courseOfferingId: 'offering-dev-01', finalNumericScore: 68.00, finalLetterGrade: 'C', isPassed: true },
  { id: 'enr-dev-05', studentId: 'stu-dev-005', courseOfferingId: 'offering-dev-01', finalNumericScore: 42.00, finalLetterGrade: 'F', isPassed: false },

  // 5 students of Batch 4 (2017) enrolled in Offering 3
  { id: 'enr-dev-16', studentId: 'stu-dev-016', courseOfferingId: 'offering-dev-03', finalNumericScore: 95.00, finalLetterGrade: 'A+', isPassed: true },
  { id: 'enr-dev-17', studentId: 'stu-dev-017', courseOfferingId: 'offering-dev-03', finalNumericScore: 88.00, finalLetterGrade: 'A', isPassed: true },
  { id: 'enr-dev-18', studentId: 'stu-dev-018', courseOfferingId: 'offering-dev-03', finalNumericScore: 81.00, finalLetterGrade: 'B', isPassed: true },
  { id: 'enr-dev-19', studentId: 'stu-dev-019', courseOfferingId: 'offering-dev-03', finalNumericScore: 74.00, finalLetterGrade: 'C', isPassed: true },
  { id: 'enr-dev-20', studentId: 'stu-dev-020', courseOfferingId: 'offering-dev-03', finalNumericScore: 55.00, finalLetterGrade: 'D', isPassed: true },
];

// Grade Submissions demonstrating the 5 Approval Workflow States
export const devGradeSubmissions: DevGradeSubmission[] = [
  // Status 1: PUBLISHED (Offering 1 - Grades visible to students)
  {
    id: 'sub-dev-01',
    courseOfferingId: 'offering-dev-01',
    submittedById: 'usr-dev-tchr-01',
    status: 'PUBLISHED',
    submissionDate: '2024-01-20T10:00:00Z',
    version: 1,
    publishedAt: '2024-01-22T14:00:00Z',
    publishedById: 'usr-admin-mulugeta',
  },
  // Status 2: APPROVED (Offering 3 - Admin approved, pending publication)
  {
    id: 'sub-dev-03',
    courseOfferingId: 'offering-dev-03',
    submittedById: 'usr-dev-tchr-03',
    status: 'APPROVED',
    submissionDate: '2025-02-10T09:00:00Z',
    version: 1,
    publishedAt: null,
    publishedById: null,
  },
  // Status 3: SUBMITTED (Offering 4 - Teacher submitted, pending review)
  {
    id: 'sub-dev-04',
    courseOfferingId: 'offering-dev-04',
    submittedById: 'usr-dev-tchr-04',
    status: 'SUBMITTED',
    submissionDate: '2025-02-15T11:30:00Z',
    version: 1,
    publishedAt: null,
    publishedById: null,
  },
  // Status 4: REJECTED (Offering 5 - Admin returned with Amharic justification)
  {
    id: 'sub-dev-05',
    courseOfferingId: 'offering-dev-05',
    submittedById: 'usr-dev-tchr-01',
    status: 'REJECTED',
    submissionDate: '2025-02-12T14:00:00Z',
    rejectionReason: 'እባክዎ የተማሪዎችን የማጠቃለያ ፈተና ውጤት እንደገና ፈትሸው ያቅርቡ፤ የጎደሉ ውጤቶች አሉ።',
    version: 1,
    publishedAt: null,
    publishedById: null,
  },
  // Status 5: DRAFT (Offering 6 - Teacher currently entering scores)
  {
    id: 'sub-dev-06',
    courseOfferingId: 'offering-dev-06',
    submittedById: 'usr-dev-tchr-05',
    status: 'DRAFT',
    submissionDate: undefined,
    version: 1,
    publishedAt: null,
    publishedById: null,
  },
];
