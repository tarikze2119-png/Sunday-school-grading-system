import { 
  PrismaClient, 
  UserRole, 
  Gender, 
  AcademicYearStatus, 
  OfferingStatus, 
  AssessmentType, 
  GradeSubmissionStatus,
  ApprovalDecision 
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for Sunday School Grading System...');

  // 1. Seed Standard Sunday School Grading Scale
  console.log('1. Creating standard grading scales...');
  const gradingScales = [
    {
      letterGrade: 'A+',
      amharicLabel: 'እጅግ በጣም ጥሩ (ከፍተኛ ማዕረግ)',
      minScore: 95.0,
      maxScore: 100.0,
      gradePoint: 4.0,
      isPassing: true,
      displayOrder: 1,
    },
    {
      letterGrade: 'A',
      amharicLabel: 'እጅግ በጣም ጥሩ',
      minScore: 85.0,
      maxScore: 94.99,
      gradePoint: 4.0,
      isPassing: true,
      displayOrder: 2,
    },
    {
      letterGrade: 'B',
      amharicLabel: 'በጣም ጥሩ',
      minScore: 75.0,
      maxScore: 84.99,
      gradePoint: 3.0,
      isPassing: true,
      displayOrder: 3,
    },
    {
      letterGrade: 'C',
      amharicLabel: 'ጥሩ (አጥጋቢ)',
      minScore: 60.0,
      maxScore: 74.99,
      gradePoint: 2.0,
      isPassing: true,
      displayOrder: 4,
    },
    {
      letterGrade: 'D',
      amharicLabel: 'ዝቅተኛ ማለፊያ',
      minScore: 50.0,
      maxScore: 59.99,
      gradePoint: 1.0,
      isPassing: true,
      displayOrder: 5,
    },
    {
      letterGrade: 'F',
      amharicLabel: 'ያላለፈ (የሚደገም)',
      minScore: 0.0,
      maxScore: 49.99,
      gradePoint: 0.0,
      isPassing: false,
      displayOrder: 6,
    },
  ];

  for (const scale of gradingScales) {
    await prisma.gradingScale.upsert({
      where: { letterGrade: scale.letterGrade },
      update: scale,
      create: scale,
    });
  }

  // 2. Seed Academic Years (Historical 2015 ዓ.ም., Current 2016 ዓ.ም., and 2019 E.C.)
  console.log('2. Seeding Multi-Year Academic Structure & Historical Snapshots...');
  
  // Historical Year 1: 2015 ዓ.ም. (COMPLETED)
  const academicYear2015 = await prisma.academicYear.upsert({
    where: { code: 'AY-2015-EC' },
    update: { isCurrent: false },
    create: {
      name: '2015 ዓ.ም.',
      code: 'AY-2015-EC',
      startDate: new Date('2022-09-11'),
      endDate: new Date('2023-07-07'),
      isCurrent: false,
      status: AcademicYearStatus.COMPLETED,
      description: 'የ2015 ዓ.ም. የተጠናቀቀ የሰንበት ትምህርት ቤት የትምህርት ዘመን (Historical Archive)',
    },
  });

  const batch2015Children = await prisma.batch.upsert({
    where: {
      academicYearId_code: {
        academicYearId: academicYear2015.id,
        code: 'B-2015-CHILDREN',
      },
    },
    update: {},
    create: {
      academicYearId: academicYear2015.id,
      name: 'ምድብ 1 - የሕፃናት ክፍል',
      code: 'B-2015-CHILDREN',
      stageLevel: 'ደረጃ 1 (ሕፃናት)',
      description: 'የ2015 ዓ.ም. የሕፃናት ክፍል',
      isActive: false,
    },
  });

  // Active Year 2: 2016 ዓ.ም. (ACTIVE / Current)
  const academicYear = await prisma.academicYear.upsert({
    where: { code: 'AY-2016-EC' },
    update: { isCurrent: true },
    create: {
      name: '2016 ዓ.ም.',
      code: 'AY-2016-EC',
      startDate: new Date('2023-09-12'),
      endDate: new Date('2024-07-07'),
      isCurrent: true,
      status: AcademicYearStatus.ACTIVE,
      description: 'የ2016 ዓ.ም. የሰንበት ትምህርት ቤት የትምህርት ዘመን',
    },
  });

  // Future Year 3: 2019 E.C. (UPCOMING)
  await prisma.academicYear.upsert({
    where: { code: 'AY-2019-EC' },
    update: {},
    create: {
      name: '2019 E.C.',
      code: 'AY-2019-EC',
      startDate: new Date('2026-09-11'),
      endDate: new Date('2027-07-07'),
      isCurrent: false,
      status: AcademicYearStatus.UPCOMING,
      description: 'የ2019 ዓ.ም. መጪው የትምህርት ዘመን (2019 E.C.)',
    },
  });

  // Seed Batches under 2016 ዓ.ም.
  const batchChildren = await prisma.batch.upsert({
    where: {
      academicYearId_code: {
        academicYearId: academicYear.id,
        code: 'B-2016-CHILDREN',
      },
    },
    update: {},
    create: {
      academicYearId: academicYear.id,
      name: 'ምድብ 1 - የሕፃናት ክፍል',
      code: 'B-2016-CHILDREN',
      stageLevel: 'ደረጃ 1 (ሕፃናት)',
      description: 'ከ7 እስከ 12 ዓመት ላሉ የሰንበት ት/ቤት ሕፃናት የተዘጋጀ ክፍል',
      isActive: true,
    },
  });

  const batchYouth = await prisma.batch.upsert({
    where: {
      academicYearId_code: {
        academicYearId: academicYear.id,
        code: 'B-2016-YOUTH',
      },
    },
    update: {},
    create: {
      academicYearId: academicYear.id,
      name: 'ምድብ 2 - የወጣቶች ክፍል',
      code: 'B-2016-YOUTH',
      stageLevel: 'ደረጃ 2 (ወጣቶች)',
      description: 'ከ13 እስከ 25 ዓመት ላሉ ወጣቶች የተዘጋጀ የነገረ መለኮት እና ዜማ ክፍል',
      isActive: true,
    },
  });

  const batchAdults = await prisma.batch.upsert({
    where: {
      academicYearId_code: {
        academicYearId: academicYear.id,
        code: 'B-2016-ADULTS',
      },
    },
    update: {},
    create: {
      academicYearId: academicYear.id,
      name: 'ምድብ 3 - የአበው እና እማት ክፍል',
      code: 'B-2016-ADULTS',
      stageLevel: 'ደረጃ 3 (አበው)',
      description: 'ለታላላቆች እና ለአረጋውያን የተዘጋጀ የሃይማኖት ትምህርት',
      isActive: true,
    },
  });

  // 3. Seed Course Catalog
  console.log('3. Seeding Course Catalog...');
  const courseDogma = await prisma.course.upsert({
    where: { code: 'CRS-DOGMA-101' },
    update: {},
    create: {
      code: 'CRS-DOGMA-101',
      title: 'Christian Dogmatics 1',
      amharicTitle: 'ነገረ ሃይማኖት ፩',
      description: 'መሠረተ እምነት፣ አምስቱ አዕማደ ምሥጢር እና ሃይማኖተ አበው',
      creditHours: 3,
      isActive: true,
    },
  });

  const courseHistory = await prisma.course.upsert({
    where: { code: 'CRS-HIST-101' },
    update: {},
    create: {
      code: 'CRS-HIST-101',
      title: 'Church History 1',
      amharicTitle: 'የቤተክርስቲያን ታሪክ ፩',
      description: 'የሐዲስ ኪዳን ቤተክርስቲያን ታሪክ እና የኢትዮጵያ ቤተክርስቲያን ጥንታዊ ታሪክ',
      creditHours: 2,
      isActive: true,
    },
  });

  const courseLiturgy = await prisma.course.upsert({
    where: { code: 'CRS-LITURGY-101' },
    update: {},
    create: {
      code: 'CRS-LITURGY-101',
      title: 'Ecclesiastical Rites & Liturgy',
      amharicTitle: 'ሥርዓተ ቤተክርስቲያን እና ዜማ',
      description: 'የቅዳሴ ሥርዓት፣ የጾም እና የበዓላት ቀኖናዎች እንዲሁም መሠረታዊ ዜማ',
      creditHours: 2,
      isActive: true,
    },
  });

  // 4. Seed User Accounts for 5 Roles
  console.log('4. Seeding Pre-Configured Users for all 5 roles...');

  // ROLE 1: SUPER_ADMIN
  const superAdminPass = await bcrypt.hash('Admin@SundaySchool2026', 12);
  await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: { passwordHash: superAdminPass },
    create: {
      username: 'superadmin',
      email: 'superadmin@sundayschool.org',
      passwordHash: superAdminPass,
      role: UserRole.SUPER_ADMIN,
      firstName: 'ዋና',
      lastName: 'አስተዳዳሪ',
      phone: '+251911000000',
      isActive: true,
    },
  });

  // ROLE 2: ADMIN
  const adminPass = await bcrypt.hash('Admin@2026', 12);
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin_mulugeta' },
    update: { passwordHash: adminPass },
    create: {
      username: 'admin_mulugeta',
      email: 'mulugeta.admin@sundayschool.org',
      passwordHash: adminPass,
      role: UserRole.ADMIN,
      firstName: 'ሙሉጌታ',
      lastName: 'ኃይሉ',
      phone: '+251911000001',
      isActive: true,
    },
  });

  // ROLE 3: MANAGEMENT
  const mgmtPass = await bcrypt.hash('Mgmt@2026', 12);
  const mgmtUser = await prisma.user.upsert({
    where: { username: 'mgmt_berhanu' },
    update: { passwordHash: mgmtPass },
    create: {
      username: 'mgmt_berhanu',
      email: 'berhanu.mgmt@sundayschool.org',
      passwordHash: mgmtPass,
      role: UserRole.MANAGEMENT,
      firstName: 'ብርሃኑ',
      lastName: 'ተክሌ',
      phone: '+251911000002',
      isActive: true,
    },
  });

  await prisma.managementProfile.upsert({
    where: { userId: mgmtUser.id },
    update: {},
    create: {
      userId: mgmtUser.id,
      department: 'የትምህርት ክፍል',
      positionTitle: 'የትምህርት ክፍል ዋና ኃላፊ',
      officePhone: '+251111223344',
    },
  });

  // ROLE 4: TEACHER
  const teacherPass = await bcrypt.hash('Teacher@2026', 12);
  const teacherUser = await prisma.user.upsert({
    where: { username: 'teacher_tekle' },
    update: { passwordHash: teacherPass },
    create: {
      username: 'teacher_tekle',
      email: 'tekle.teacher@sundayschool.org',
      passwordHash: teacherPass,
      role: UserRole.TEACHER,
      firstName: 'ተክለሃይማኖት',
      lastName: 'ወልደጊዮርጊስ',
      phone: '+251911000003',
      isActive: true,
    },
  });

  const teacherProfile = await prisma.teacher.upsert({
    where: { userId: teacherUser.id },
    update: {},
    create: {
      userId: teacherUser.id,
      teacherCode: 'TCH-001',
      spiritualTitle: 'መምህር',
      qualification: 'የነገረ መለኮት ዲፕሎማ',
      specialization: 'ነገረ ሃይማኖት እና ዜማ',
    },
  });

  // ROLE 5: STUDENT
  const studentPass = await bcrypt.hash('Student@2026', 12);
  const studentUser = await prisma.user.upsert({
    where: { username: 'student_yohannes' },
    update: { passwordHash: studentPass },
    create: {
      username: 'student_yohannes',
      email: 'yohannes.student@sundayschool.org',
      passwordHash: studentPass,
      role: UserRole.STUDENT,
      firstName: 'ዮሐንስ',
      lastName: 'ተስፋዬ',
      grandfatherName: 'ዘውዴ',
      phone: '+251911000004',
      isActive: true,
    },
  });

  const studentProfile = await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: {
      userId: studentUser.id,
      academicYearId: academicYear.id,
      batchId: batchYouth.id,
      admissionNumber: 'STU-2016-0042',
      baptismalName: 'ኃይለ ማርያም',
      gender: Gender.MALE,
      guardianName: 'ተስፋዬ ዘውዴ',
      guardianPhone: '+251911999999',
    },
  });

  // Seed StudentRegistration records across multi-year timeline (2015 ዓ.ም. PROMOTED -> 2016 ዓ.ም. ACTIVE)
  await prisma.studentRegistration.upsert({
    where: {
      studentId_academicYearId: {
        studentId: studentProfile.id,
        academicYearId: academicYear2015.id,
      },
    },
    update: {},
    create: {
      studentId: studentProfile.id,
      academicYearId: academicYear2015.id,
      batchId: batch2015Children.id,
      status: 'PROMOTED',
      registeredAt: new Date('2022-09-15'),
    },
  });

  await prisma.studentRegistration.upsert({
    where: {
      studentId_academicYearId: {
        studentId: studentProfile.id,
        academicYearId: academicYear.id,
      },
    },
    update: {},
    create: {
      studentId: studentProfile.id,
      academicYearId: academicYear.id,
      batchId: batchYouth.id,
      status: 'ACTIVE',
      registeredAt: new Date('2023-09-14'),
    },
  });

  // Seed Historical Course Offerings & Published Grades for 2015 ዓ.ም.
  const offering2015Dogma = await prisma.courseOffering.upsert({
    where: {
      courseId_academicYearId_batchId_termSemester: {
        courseId: courseDogma.id,
        academicYearId: academicYear2015.id,
        batchId: batch2015Children.id,
        termSemester: '1',
      },
    },
    update: {},
    create: {
      courseId: courseDogma.id,
      academicYearId: academicYear2015.id,
      batchId: batch2015Children.id,
      termSemester: '1',
      status: OfferingStatus.COMPLETED,
    },
  });

  await prisma.studentEnrollment.upsert({
    where: {
      studentId_courseOfferingId: {
        studentId: studentProfile.id,
        courseOfferingId: offering2015Dogma.id,
      },
    },
    update: {
      finalNumericScore: 92.0,
      finalLetterGrade: 'A',
      isPassed: true,
    },
    create: {
      studentId: studentProfile.id,
      courseOfferingId: offering2015Dogma.id,
      finalNumericScore: 92.0,
      finalLetterGrade: 'A',
      isPassed: true,
    },
  });

  await prisma.gradeSubmission.create({
    data: {
      courseOfferingId: offering2015Dogma.id,
      submittedById: teacherUser.id,
      status: GradeSubmissionStatus.PUBLISHED,
      submissionDate: new Date('2023-01-20'),
      publishedAt: new Date('2023-01-25'),
      publishedById: adminUser.id,
      version: 1,
      notes: 'የ2015 ዓ.ም. የተጠናቀቀ እና ይፋ የሆነ ውጤት',
    },
  });

  const offering2015Liturgy = await prisma.courseOffering.upsert({
    where: {
      courseId_academicYearId_batchId_termSemester: {
        courseId: courseLiturgy.id,
        academicYearId: academicYear2015.id,
        batchId: batch2015Children.id,
        termSemester: '1',
      },
    },
    update: {},
    create: {
      courseId: courseLiturgy.id,
      academicYearId: academicYear2015.id,
      batchId: batch2015Children.id,
      termSemester: '1',
      status: OfferingStatus.COMPLETED,
    },
  });

  await prisma.studentEnrollment.upsert({
    where: {
      studentId_courseOfferingId: {
        studentId: studentProfile.id,
        courseOfferingId: offering2015Liturgy.id,
      },
    },
    update: {
      finalNumericScore: 96.0,
      finalLetterGrade: 'A+',
      isPassed: true,
    },
    create: {
      studentId: studentProfile.id,
      courseOfferingId: offering2015Liturgy.id,
      finalNumericScore: 96.0,
      finalLetterGrade: 'A+',
      isPassed: true,
    },
  });

  await prisma.gradeSubmission.create({
    data: {
      courseOfferingId: offering2015Liturgy.id,
      submittedById: teacherUser.id,
      status: GradeSubmissionStatus.PUBLISHED,
      submissionDate: new Date('2023-01-22'),
      publishedAt: new Date('2023-01-26'),
      publishedById: adminUser.id,
      version: 1,
      notes: 'የ2015 ዓ.ም. የዜማ ትምህርት ይፋዊ ውጤት',
    },
  });

  // 5. Seed Course Offering 1: ነገረ ሃይማኖት ፩ (In SUBMITTED review state)
  console.log('5. Seeding Course Offerings, Teacher Assignments, Assessments & Grades...');
  const nextWeekDeadline = new Date();
  nextWeekDeadline.setDate(nextWeekDeadline.getDate() + 7);

  const offeringDogma = await prisma.courseOffering.upsert({
    where: {
      courseId_academicYearId_batchId_termSemester: {
        courseId: courseDogma.id,
        academicYearId: academicYear.id,
        batchId: batchYouth.id,
        termSemester: '1',
      },
    },
    update: {
      gradeDeadline: nextWeekDeadline,
      isSubmissionOpen: true,
    },
    create: {
      courseId: courseDogma.id,
      academicYearId: academicYear.id,
      batchId: batchYouth.id,
      termSemester: '1',
      status: OfferingStatus.GRADES_PENDING,
      gradeDeadline: nextWeekDeadline,
      isSubmissionOpen: true,
    },
  });

  // Assign Teacher to Course Offering
  await prisma.teacherAssignment.upsert({
    where: {
      teacherId_courseOfferingId: {
        teacherId: teacherProfile.id,
        courseOfferingId: offeringDogma.id,
      },
    },
    update: {},
    create: {
      teacherId: teacherProfile.id,
      courseOfferingId: offeringDogma.id,
      isPrimary: true,
    },
  });

  // Enroll Student in Course Offering
  const enrollmentDogma = await prisma.studentEnrollment.upsert({
    where: {
      studentId_courseOfferingId: {
        studentId: studentProfile.id,
        courseOfferingId: offeringDogma.id,
      },
    },
    update: {},
    create: {
      studentId: studentProfile.id,
      courseOfferingId: offeringDogma.id,
    },
  });

  // Configure standard 5-component assessments for offeringDogma
  const assessmentsConfig = [
    { name: 'ክትትል እና ስነ-ምግባር', type: AssessmentType.ATTENDANCE_DISCIPLINE, maxScore: 10, weightPercentage: 10, displayOrder: 1 },
    { name: 'የቤት ስራ እና የክፍል ተሳትፎ', type: AssessmentType.HOMEWORK_ASSIGNMENT, maxScore: 10, weightPercentage: 10, displayOrder: 2 },
    { name: 'ፈጣን ፈተና (Quiz)', type: AssessmentType.QUIZ, maxScore: 20, weightPercentage: 20, displayOrder: 3 },
    { name: 'አጋማሽ ፈተና (Midterm)', type: AssessmentType.MIDTERM_EXAM, maxScore: 20, weightPercentage: 20, displayOrder: 4 },
    { name: 'የማጠቃለያ ፈተና (Final Exam)', type: AssessmentType.FINAL_EXAM, maxScore: 40, weightPercentage: 40, displayOrder: 5 },
  ];

  for (const a of assessmentsConfig) {
    const assessment = await prisma.assessment.upsert({
      where: {
        courseOfferingId_name: {
          courseOfferingId: offeringDogma.id,
          name: a.name,
        },
      },
      update: a,
      create: {
        courseOfferingId: offeringDogma.id,
        ...a,
      },
    });

    // Record Grade for student
    let score = 9.0;
    if (a.type === AssessmentType.ATTENDANCE_DISCIPLINE) score = 9.5;
    else if (a.type === AssessmentType.HOMEWORK_ASSIGNMENT) score = 9.0;
    else if (a.type === AssessmentType.QUIZ) score = 18.5;
    else if (a.type === AssessmentType.MIDTERM_EXAM) score = 19.0;
    else if (a.type === AssessmentType.FINAL_EXAM) score = 38.0;

    await prisma.grade.upsert({
      where: {
        enrollmentId_assessmentId: {
          enrollmentId: enrollmentDogma.id,
          assessmentId: assessment.id,
        },
      },
      update: { scoreObtained: score },
      create: {
        enrollmentId: enrollmentDogma.id,
        assessmentId: assessment.id,
        studentId: studentProfile.id,
        scoreObtained: score,
        isExempt: false,
        recordedById: teacherUser.id,
      },
    });
  }

  // Create GradeSubmission in SUBMITTED state for Admin review
  await prisma.gradeSubmission.create({
    data: {
      courseOfferingId: offeringDogma.id,
      submittedById: teacherUser.id,
      status: GradeSubmissionStatus.SUBMITTED,
      submissionDate: new Date(),
      version: 1,
      notes: 'የመንፈቀ ዓመቱ የተማሪዎች ውጤት ለማጽደቂያ ቀርቧል',
    },
  });

  // 6. Seed Course Offering 2: የቤተክርስቲያን ታሪክ ፩ (In PUBLISHED state so student sees immediate results)
  const offeringHistory = await prisma.courseOffering.upsert({
    where: {
      courseId_academicYearId_batchId_termSemester: {
        courseId: courseHistory.id,
        academicYearId: academicYear.id,
        batchId: batchYouth.id,
        termSemester: '1',
      },
    },
    update: {
      status: OfferingStatus.COMPLETED,
    },
    create: {
      courseId: courseHistory.id,
      academicYearId: academicYear.id,
      batchId: batchYouth.id,
      termSemester: '1',
      status: OfferingStatus.COMPLETED,
    },
  });

  await prisma.teacherAssignment.upsert({
    where: {
      teacherId_courseOfferingId: {
        teacherId: teacherProfile.id,
        courseOfferingId: offeringHistory.id,
      },
    },
    update: {},
    create: {
      teacherId: teacherProfile.id,
      courseOfferingId: offeringHistory.id,
      isPrimary: true,
    },
  });

  const enrollmentHistory = await prisma.studentEnrollment.upsert({
    where: {
      studentId_courseOfferingId: {
        studentId: studentProfile.id,
        courseOfferingId: offeringHistory.id,
      },
    },
    update: {
      finalNumericScore: 95.0,
      finalLetterGrade: 'A+',
      isPassed: true,
    },
    create: {
      studentId: studentProfile.id,
      courseOfferingId: offeringHistory.id,
      finalNumericScore: 95.0,
      finalLetterGrade: 'A+',
      isPassed: true,
    },
  });

  // Configure assessments for offeringHistory
  for (const a of assessmentsConfig) {
    const assessment = await prisma.assessment.upsert({
      where: {
        courseOfferingId_name: {
          courseOfferingId: offeringHistory.id,
          name: a.name,
        },
      },
      update: a,
      create: {
        courseOfferingId: offeringHistory.id,
        ...a,
      },
    });

    let score = a.maxScore * 0.95;
    await prisma.grade.upsert({
      where: {
        enrollmentId_assessmentId: {
          enrollmentId: enrollmentHistory.id,
          assessmentId: assessment.id,
        },
      },
      update: { scoreObtained: score },
      create: {
        enrollmentId: enrollmentHistory.id,
        assessmentId: assessment.id,
        studentId: studentProfile.id,
        scoreObtained: score,
        isExempt: false,
        recordedById: teacherUser.id,
      },
    });
  }

  // Create GradeSubmission in PUBLISHED state
  const publishedSub = await prisma.gradeSubmission.create({
    data: {
      courseOfferingId: offeringHistory.id,
      submittedById: teacherUser.id,
      status: GradeSubmissionStatus.PUBLISHED,
      submissionDate: new Date('2024-01-15'),
      publishedAt: new Date('2024-01-18'),
      publishedById: adminUser.id,
      version: 1,
      notes: 'የጸደቀ እና የታተመ ይፋዊ ውጤት',
    },
  });

  await prisma.gradeApproval.create({
    data: {
      gradeSubmissionId: publishedSub.id,
      approvedById: adminUser.id,
      decision: ApprovalDecision.APPROVED,
      comments: 'ውጤቱ በሙሉ ተረጋግጦ ጸድቋል',
      decidedAt: new Date('2024-01-17'),
    },
  });

  // 7. Seed In-App Notifications for Roles (Phase 6)
  console.log('7. Seeding Role-Targeted In-App Notifications...');
  await prisma.notification.createMany({
    data: [
      {
        userId: teacherUser.id,
        type: 'COURSE_ASSIGNED',
        title: 'አዲስ የኮርስ ማስተማሪያ ምደባ',
        message: 'ለ2016 ዓ.ም. ነገረ ሃይማኖት ፩ በምድብ 2 (ወጣቶች) ተመድበዋል።',
        linkUrl: '/dashboard',
        isRead: false,
      },
      {
        userId: teacherUser.id,
        type: 'DEADLINE_APPROACHING',
        title: 'የውጤት ማስረከቢያ ቀነ-ገደብ ማሳሰቢያ',
        message: 'የነገረ ሃይማኖት ፩ የመጨረሻ ውጤት ማስረከቢያ 7 ቀናት ብቻ ቀርተዋል።',
        linkUrl: '/dashboard',
        isRead: false,
      },
      {
        userId: adminUser.id,
        type: 'GRADE_SUBMITTED',
        title: 'ለማጽደቅ የቀረበ የተማሪዎች ውጤት',
        message: 'መምህር ተክለሃይማኖት ለነገረ ሃይማኖት ፩ ውጤት አቅርበዋል። እባክዎ መርምረው ያጽድቁ።',
        linkUrl: '/dashboard',
        isRead: false,
      },
      {
        userId: studentUser.id,
        type: 'REGISTRATION_CONFIRMED',
        title: 'የትምህርት ዘመን ምዝገባ ማረጋገጫ',
        message: 'በ2016 ዓ.ም. በምድብ 2 (ወጣቶች) ምዝገባዎ ተረጋግጧል።',
        linkUrl: '/dashboard',
        isRead: true,
      },
      {
        userId: studentUser.id,
        type: 'RESULTS_PUBLISHED',
        title: 'ይፋዊ የውጤት ማስታወቂያ',
        message: 'የቤተክርስቲያን ታሪክ ፩ ውጤትዎ በይፋ ታትሟል። በውጤት ማዕከልዎ መመልከት ይችላሉ።',
        linkUrl: '/dashboard',
        isRead: false,
      },
      {
        userId: mgmtUser.id,
        type: 'ANNOUNCEMENT',
        title: 'የመንፈቀ ዓመቱ የትምህርት አፈጻጸም ሪፖርት',
        message: 'የ2016 ዓ.ም. የመንፈቀ ዓመቱ አጠቃላይ የአካዳሚክ ሪፖርት ዝግጁ ሆኗል።',
        linkUrl: '/dashboard',
        isRead: false,
      },
    ],
  });

  // 8. Seed Audit History Log Entries (Phase 6)
  console.log('8. Seeding Audit History Logs...');
  await prisma.auditLog.createMany({
    data: [
      {
        userId: adminUser.id,
        action: 'CREATE_ACADEMIC_YEAR',
        entityName: 'AcademicYear',
        details: { name: '2016 ዓ.ም.', code: 'AY-2016-EC' },
      },
      {
        userId: adminUser.id,
        action: 'REGISTER_STUDENT',
        entityName: 'Student',
        details: { admissionNumber: 'STU-2016-0042', name: 'ዮሐንስ ተስፋዬ' },
      },
      {
        userId: adminUser.id,
        action: 'ASSIGN_TEACHER',
        entityName: 'TeacherAssignment',
        details: { teacher: 'ተክለሃይማኖት ወልደጊዮርጊስ', course: 'ነገረ ሃይማኖት ፩' },
      },
      {
        userId: teacherUser.id,
        action: 'SUBMIT_GRADES_FOR_APPROVAL',
        entityName: 'GradeSubmission',
        details: { course: 'ነገረ ሃይማኖት ፩', enrolledCount: 48 },
      },
      {
        userId: adminUser.id,
        action: 'APPROVE_GRADE_SUBMISSION',
        entityName: 'GradeSubmission',
        details: { course: 'የቤተክርስቲያን ታሪክ ፩', comments: 'ውጤቱ በሙሉ ተረጋግጦ ጸድቋል' },
      },
      {
        userId: adminUser.id,
        action: 'PUBLISH_GRADE_SUBMISSION',
        entityName: 'GradeSubmission',
        details: { course: 'የቤተክርስቲያን ታሪክ ፩' },
      },
      {
        userId: adminUser.id,
        action: 'SET_GRADE_DEADLINE',
        entityName: 'CourseOffering',
        details: { course: 'ነገረ ሃይማኖት ፩', deadlineDays: 7 },
      },
    ],
  });

  // 12. Seed Phase 4A Reusable Grading Scheme Templates
  console.log('12. Creating Phase 4A reusable grading scheme templates...');
  const standardScheme = await prisma.gradingScheme.upsert({
    where: { name: 'መደበኛ ምዘና (Standard Assessment)' },
    update: {},
    create: {
      name: 'መደበኛ ምዘና (Standard Assessment)',
      description: 'መደበኛ የሰንበት ት/ቤት የምዘና መዋቅር (አጋማሽ 20% + የቤት ሥራ 1 20% + የቤት ሥራ 2 20% + ማጠቃለያ 40% = 100%)',
      status: 'ACTIVE',
      createdById: adminUser.id,
      versions: {
        create: {
          versionNumber: 1,
          description: 'የመጀመሪያ መደበኛ ቅጂ (Version 1)',
          status: 'ACTIVE',
          isLatest: true,
          components: {
            create: [
              {
                name: 'አጋማሽ ፈተና (Midterm)',
                percentage: 20.0,
                defaultMaxScore: 20.0,
                orderIndex: 1,
                type: AssessmentType.MIDTERM_EXAM,
              },
              {
                name: 'የቤት ሥራ 1 (Assignment 1)',
                percentage: 20.0,
                defaultMaxScore: 20.0,
                orderIndex: 2,
                type: AssessmentType.HOMEWORK_ASSIGNMENT,
              },
              {
                name: 'የቤት ሥራ 2 (Assignment 2)',
                percentage: 20.0,
                defaultMaxScore: 20.0,
                orderIndex: 3,
                type: AssessmentType.HOMEWORK_ASSIGNMENT,
              },
              {
                name: 'የማጠቃለያ ፈተና (Final Examination)',
                percentage: 40.0,
                defaultMaxScore: 40.0,
                orderIndex: 4,
                type: AssessmentType.FINAL_EXAM,
              },
            ],
          },
        },
      },
    },
  });

  const practicalScheme = await prisma.gradingScheme.upsert({
    where: { name: 'ተግባራዊ ምዘና (Practical Assessment)' },
    update: {},
    create: {
      name: 'ተግባራዊ ምዘና (Practical Assessment)',
      description: 'ለዜማና ለስርዓተ ቤተክርስቲያን የተዘጋጀ ተግባራዊ መመዘኛ (ተግባር 40% + የቤት ሥራ 20% + ማጠቃለያ 40% = 100%)',
      status: 'ACTIVE',
      createdById: adminUser.id,
      versions: {
        create: {
          versionNumber: 1,
          description: 'የመጀመሪያ ተግባራዊ ቅጂ (Version 1)',
          status: 'ACTIVE',
          isLatest: true,
          components: {
            create: [
              {
                name: 'ተግባራዊ ዜማ እና ሥርዓት (Practical Work)',
                percentage: 40.0,
                defaultMaxScore: 40.0,
                orderIndex: 1,
                type: AssessmentType.PRACTICAL_LITURGY,
              },
              {
                name: 'የቤት ሥራ እና ክትትል (Assignment)',
                percentage: 20.0,
                defaultMaxScore: 20.0,
                orderIndex: 2,
                type: AssessmentType.HOMEWORK_ASSIGNMENT,
              },
              {
                name: 'የማጠቃለያ ፈተና (Final Examination)',
                percentage: 40.0,
                defaultMaxScore: 40.0,
                orderIndex: 3,
                type: AssessmentType.FINAL_EXAM,
              },
            ],
          },
        },
      },
    },
  });

  console.log('✅ Seeding completed successfully!');
  console.log('----------------------------------------------------');
  console.log('Academic Workflow & Grading Engine Seeded:');
  console.log('  • Academic Years: 2016 ዓ.ም. (Current) & 2019 E.C.');
  console.log('  • Batches: ምድብ 1 (ሕፃናት), ምድብ 2 (ወጣቶች), ምድብ 3 (አበው)');
  console.log('  • Courses: ነገረ ሃይማኖት ፩, የቤተክርስቲያን ታሪክ ፩, ዜማ');
  console.log('  • Offering 1: ነገረ ሃይማኖት ፩ -> Status: SUBMITTED (Ready for Admin review/approval)');
  console.log('  • Offering 2: የቤተክርስቲያን ታሪክ ፩ -> Status: PUBLISHED (Visible on Student portal & Report Card)');
  console.log('  • 5 Standard Assessments Configured: 10% + 10% + 20% + 20% + 40% = 100%');
  console.log('----------------------------------------------------');
  console.log('Test Accounts for all 5 roles:');
  console.log('  1. SUPER ADMIN: superadmin       / Admin@SundaySchool2026');
  console.log('  2. ADMIN:       admin_mulugeta   / Admin@2026');
  console.log('  3. MANAGEMENT:  mgmt_berhanu     / Mgmt@2026');
  console.log('  4. TEACHER:     teacher_tekle    / Teacher@2026');
  console.log('  5. STUDENT:     student_yohannes / Student@2026');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
