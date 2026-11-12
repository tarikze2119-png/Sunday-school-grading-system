import http from 'node:http';
import assert from 'node:assert';
import bcrypt from 'bcryptjs';
import app from '../app.js';
import prisma from '../config/prisma.client.js';
import { UserRole, GradeSubmissionStatus, OfferingStatus } from '@prisma/client';

let server: http.Server;
let serverPort: number;

interface TestResult {
  section: string;
  id: string;
  description: string;
  role: string;
  method: string;
  endpoint: string;
  expectedStatus: number;
  actualStatus: number;
  passed: boolean;
  notes?: string;
}

const results: TestResult[] = [];

async function callApi(
  section: string,
  id: string,
  description: string,
  role: string,
  method: string,
  path: string,
  token: string | null,
  body?: any
): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`http://127.0.0.1:${serverPort}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // empty
  }

  const expected = expectedStatusLookup(id);
  const passed = res.status === expected;
  results.push({
    section,
    id,
    description,
    role,
    endpoint: path,
    method,
    expectedStatus: expected,
    actualStatus: res.status,
    passed,
    notes: data?.message,
  });

  const symbol = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${symbol}] ${id} [${role}] ${method} ${path} -> ${res.status} (expected ${expected}) ${data?.message ? `(${data.message})` : ''}`);

  return { status: res.status, data };
}

const expectedStatuses: Record<string, number> = {};
function expectStatus(id: string, status: number) {
  expectedStatuses[id] = status;
}
function expectedStatusLookup(id: string): number {
  return expectedStatuses[id] ?? 200;
}

function recordTest(
  id: string,
  description: string,
  role: string,
  method: string,
  endpoint: string,
  expectedStatus: number,
  actualStatus: number,
  notes?: string
) {
  const passed = actualStatus === expectedStatus;
  results.push({
    section: 'SECURITY_CHECK',
    id,
    description,
    role,
    endpoint,
    method,
    expectedStatus,
    actualStatus,
    passed,
    notes,
  });
  const symbol = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${symbol}] ${id} [${role}] ${method} ${endpoint} -> ${actualStatus} (expected ${expectedStatus}) ${notes ? `(${notes})` : ''}`);
}

async function runTests() {
  console.log('================================================================');
  console.log('Teacher Privacy, Student Grade Reports & Official Transcript Policy');
  console.log('Comprehensive Security & Regression Verification');
  console.log('================================================================\n');

  // Start test server on ephemeral port
  await new Promise<void>((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (typeof addr === 'object' && addr !== null) {
        serverPort = addr.port;
      }
      console.log(`📡 In-process test server listening at http://127.0.0.1:${serverPort}\n`);
      resolve();
    });
  });

  try {
    // ==========================================
    // 0. AUTHENTICATION & TEST ACTOR PREPARATION
    // ==========================================
    console.log('--- Phase 0: Authenticating Test Roles ---');

    expectStatus('AUTH-ADM', 200);
    const adminLogin = await callApi('AUTH', 'AUTH-ADM', 'Admin login', 'ADMIN', 'POST', '/api/v1/auth/login', null, {
      identifier: 'admin_mulugeta',
      password: process.env.SEED_ADMIN_PASSWORD || 'Admin@2026',
    });
    const adminToken = adminLogin.data?.data?.accessToken;
    assert.ok(adminToken, 'Admin token required');

    expectStatus('AUTH-SADM', 200);
    const superAdminLogin = await callApi('AUTH', 'AUTH-SADM', 'SuperAdmin login', 'SUPER_ADMIN', 'POST', '/api/v1/auth/login', null, {
      identifier: 'superadmin',
      password: process.env.SEED_SUPERADMIN_PASSWORD || 'Admin@SundaySchool2026',
    });
    const superAdminToken = superAdminLogin.data?.data?.accessToken;
    assert.ok(superAdminToken, 'SuperAdmin token required');

    expectStatus('AUTH-MGMT', 200);
    const mgmtLogin = await callApi('AUTH', 'AUTH-MGMT', 'Management login', 'MANAGEMENT', 'POST', '/api/v1/auth/login', null, {
      identifier: 'mgmt_berhanu',
      password: process.env.SEED_MGMT_PASSWORD || 'Mgmt@2026',
    });
    const mgmtToken = mgmtLogin.data?.data?.accessToken;
    assert.ok(mgmtToken, 'Management token required');

    expectStatus('AUTH-TCH-A', 200);
    const teacherALogin = await callApi('AUTH', 'AUTH-TCH-A', 'Teacher A login', 'TEACHER', 'POST', '/api/v1/auth/login', null, {
      identifier: 'teacher_tekle',
      password: process.env.SEED_TEACHER_PASSWORD || 'Teacher@2026',
    });
    const teacherAToken = teacherALogin.data?.data?.accessToken;
    assert.ok(teacherAToken, 'Teacher A token required');

    expectStatus('AUTH-STU-A', 200);
    const studentALogin = await callApi('AUTH', 'AUTH-STU-A', 'Student A login', 'STUDENT', 'POST', '/api/v1/auth/login', null, {
      identifier: 'student_yohannes',
      password: process.env.SEED_STUDENT_PASSWORD || 'Student@2026',
    });
    const studentAToken = studentALogin.data?.data?.accessToken;
    assert.ok(studentAToken, 'Student A token required');

    // Retrieve Student A profile
    const studentAProfile = await prisma.student.findFirst({
      where: { user: { username: 'student_yohannes' } },
      include: { academicYear: true, batch: true },
    });
    assert.ok(studentAProfile, 'Student A record must exist');
    const studentAId = studentAProfile.id;

    // Retrieve Teacher A profile
    const teacherAProfile = await prisma.teacher.findFirst({
      where: { user: { username: 'teacher_tekle' } },
    });
    assert.ok(teacherAProfile, 'Teacher A profile must exist');

    // Find Course Offering 1 assigned to Teacher A where Student A is enrolled
    const offeringCourse1 = await prisma.courseOffering.findFirst({
      where: {
        teacherAssignments: { some: { teacherId: teacherAProfile.id } },
        enrollments: { some: { studentId: studentAId } },
      },
      include: { course: true },
    });
    assert.ok(offeringCourse1, 'Course Offering 1 assigned to Teacher A with Student A enrolled must exist');

    // Setup Teacher B (for multi-teacher isolation test)
    const teacherBPass = await bcrypt.hash('TeacherB@2026!', 12);
    const teacherBUser = await prisma.user.upsert({
      where: { username: 'teacher_haile' },
      update: { isActive: true },
      create: {
        username: 'teacher_haile',
        email: 'haile.teacher@sundayschool.org',
        passwordHash: teacherBPass,
        role: UserRole.TEACHER,
        firstName: 'ኃይለሚካኤል',
        lastName: 'ዘውዴ',
        isActive: true,
      },
    });

    const teacherBProfile = await prisma.teacher.upsert({
      where: { userId: teacherBUser.id },
      update: {},
      create: {
        userId: teacherBUser.id,
        teacherCode: 'TCH-TEST-002',
        spiritualTitle: 'ዲያቆን',
        specialization: 'ዜማ እና ቋንቋ',
      },
    });

    // Login as Teacher B
    expectStatus('AUTH-TCH-B', 200);
    const teacherBLogin = await callApi('AUTH', 'AUTH-TCH-B', 'Teacher B login', 'TEACHER', 'POST', '/api/v1/auth/login', null, {
      identifier: 'teacher_haile',
      password: 'TeacherB@2026!',
    });
    const teacherBToken = teacherBLogin.data?.data?.accessToken;
    assert.ok(teacherBToken, 'Teacher B token required');

    // Setup Course 2 (assigned to Teacher B, NOT Teacher A)
    let courseGeez = await prisma.course.findFirst({
      where: { code: 'CRS-GEEZ-101' },
    });
    if (!courseGeez) {
      courseGeez = await prisma.course.create({
        data: {
          code: 'CRS-GEEZ-101',
          title: 'ግዕዝ ቋንቋ 1',
          amharicTitle: 'ግዕዝ ቋንቋ 1',
          creditHours: 2,
        },
      });
    }

    const offeringCourse2 = await prisma.courseOffering.upsert({
      where: {
        courseId_academicYearId_batchId_termSemester: {
          courseId: courseGeez.id,
          academicYearId: studentAProfile.academicYearId,
          batchId: studentAProfile.batchId,
          termSemester: '1',
        },
      },
      update: {},
      create: {
        courseId: courseGeez.id,
        academicYearId: studentAProfile.academicYearId,
        batchId: studentAProfile.batchId,
        termSemester: '1',
        status: OfferingStatus.ACTIVE,
      },
    });

    // Assign Course 2 to Teacher B (strictly remove Teacher A)
    await prisma.teacherAssignment.deleteMany({
      where: { courseOfferingId: offeringCourse2.id },
    });
    await prisma.teacherAssignment.create({
      data: {
        teacherId: teacherBProfile.id,
        courseOfferingId: offeringCourse2.id,
        isPrimary: true,
      },
    });

    // Enroll Student A in Course 2 (Course 2 taught by Teacher B, Course 1 taught by Teacher A)
    await prisma.studentEnrollment.upsert({
      where: {
        studentId_courseOfferingId: {
          studentId: studentAId,
          courseOfferingId: offeringCourse2.id,
        },
      },
      update: {
        finalNumericScore: 88.0,
        finalLetterGrade: 'A',
        isPassed: true,
      },
      create: {
        studentId: studentAId,
        courseOfferingId: offeringCourse2.id,
        finalNumericScore: 88.0,
        finalLetterGrade: 'A',
        isPassed: true,
      },
    });

    // Publish submission for Course 2
    await prisma.gradeSubmission.upsert({
      where: { id: `sub-course-2-${offeringCourse2.id}` },
      update: { status: GradeSubmissionStatus.PUBLISHED },
      create: {
        id: `sub-course-2-${offeringCourse2.id}`,
        courseOfferingId: offeringCourse2.id,
        submittedById: teacherBUser.id,
        status: GradeSubmissionStatus.PUBLISHED,
        submissionDate: new Date(),
        publishedAt: new Date(),
        publishedById: adminLogin.data?.data?.user?.id || 'admin',
        version: 1,
      },
    });

    // Setup Student B (enrolled ONLY in Course 2, NO shared courses with Teacher A)
    const studentBUser = await prisma.user.upsert({
      where: { username: 'student_selam' },
      update: { isActive: true },
      create: {
        username: 'student_selam',
        email: 'selam.student@sundayschool.org',
        passwordHash: await bcrypt.hash('StudentB@2026!', 12),
        role: UserRole.STUDENT,
        firstName: 'ሰላማዊት',
        lastName: 'ኃይሉ',
        isActive: true,
      },
    });

    const studentBProfile = await prisma.student.upsert({
      where: { userId: studentBUser.id },
      update: {},
      create: {
        userId: studentBUser.id,
        academicYearId: studentAProfile.academicYearId,
        batchId: studentAProfile.batchId,
        admissionNumber: 'STU-TEST-0099',
        gender: 'FEMALE',
      },
    });
    const studentBId = studentBProfile.id;

    // Enroll Student B in Course 2 ONLY
    await prisma.studentEnrollment.upsert({
      where: {
        studentId_courseOfferingId: {
          studentId: studentBId,
          courseOfferingId: offeringCourse2.id,
        },
      },
      update: {},
      create: {
        studentId: studentBId,
        courseOfferingId: offeringCourse2.id,
        finalNumericScore: 92.0,
        finalLetterGrade: 'A',
        isPassed: true,
      },
    });

    // Ensure Student B is NOT enrolled in any course offering of Teacher A
    await prisma.studentEnrollment.deleteMany({
      where: {
        studentId: studentBId,
        courseOffering: {
          teacherAssignments: { some: { teacherId: teacherAProfile.id } },
        },
      },
    });

    console.log('✅ Test actors, course offerings, assignments, and enrollments established.\n');

    // ==========================================
    // 1. TEACHER PRIVACY & STRICT TRANSCRIPT REJECTION
    // ==========================================
    console.log('--- Section 1: Teacher Privacy and Strict Transcript Access Control Tests ---');

    // 1.1 Teacher A can access Student A history for assigned course
    expectStatus('TCH-PRIV-01', 200);
    const t1 = await callApi(
      'TEACHER_PRIVACY',
      'TCH-PRIV-01',
      'Teacher A accesses student history for student enrolled in Teacher A course',
      'TEACHER',
      'GET',
      `/api/v1/reports/student-history/${studentAId}`,
      teacherAToken
    );
    assert.strictEqual(t1.status, 200);

    // 1.2 Teacher A cannot access Student B (no shared course)
    expectStatus('TCH-PRIV-02', 403);
    const t2 = await callApi(
      'TEACHER_PRIVACY',
      'TCH-PRIV-02',
      'Teacher A cannot access student history for unassigned student B',
      'TEACHER',
      'GET',
      `/api/v1/reports/student-history/${studentBId}`,
      teacherAToken
    );
    assert.strictEqual(t2.status, 403, 'Teacher A must be rejected with 403 for unassigned student');

    // 1.3 & 1.4 Scoped Filtering: Teacher A sees ONLY grades from assigned course offerings
    const studentACoursesSeenByTeacherA = (t1.data?.data?.historyTerms || [])
      .flatMap((term: any) => term.courses)
      .map((c: any) => c.courseCode);

    console.log(`Courses seen by Teacher A in history: ${studentACoursesSeenByTeacherA.join(', ')}`);
    assert.ok(
      studentACoursesSeenByTeacherA.includes(offeringCourse1.course.code),
      'Teacher A must see their own assigned course'
    );
    assert.ok(
      !studentACoursesSeenByTeacherA.includes(courseGeez.code),
      'Teacher A must NOT see Course 2 (assigned to Teacher B)'
    );
    recordTest(
      'TCH-PRIV-03',
      'Teacher A sees only assigned courses, unrelated course grades filtered out',
      'TEACHER',
      'GET',
      `/api/v1/reports/student-history/${studentAId}`,
      200,
      200,
      `Only assigned courses present: [${studentACoursesSeenByTeacherA.join(', ')}]`
    );

    // 1.5 Teacher B cannot access Teacher A's course report
    expectStatus('TCH-PRIV-04', 403);
    const t5 = await callApi(
      'TEACHER_PRIVACY',
      'TCH-PRIV-04',
      'Teacher B blocked from Teacher A course report',
      'TEACHER',
      'GET',
      `/api/v1/grades/reports/course/${offeringCourse1.id}`,
      teacherBToken
    );
    assert.strictEqual(t5.status, 403, 'Teacher B cannot access Teacher A course report');

    // 1.6 Teacher cannot access another teacher course offering sheet by changing ID
    expectStatus('TCH-PRIV-05', 403);
    const t6 = await callApi(
      'TEACHER_PRIVACY',
      'TCH-PRIV-05',
      'Teacher A blocked from Teacher B grade sheet by ID manipulation',
      'TEACHER',
      'GET',
      `/api/v1/grades/offerings/${offeringCourse2.id}/sheet`,
      teacherAToken
    );
    assert.strictEqual(t6.status, 403, 'Teacher A cannot access Teacher B grade sheet');

    // 1.7 Teacher cannot modify grades for an unassigned course
    expectStatus('TCH-PRIV-06', 403);
    const t7 = await callApi(
      'TEACHER_PRIVACY',
      'TCH-PRIV-06',
      'Teacher A cannot save draft grades for unassigned course offering',
      'TEACHER',
      'PUT',
      `/api/v1/grades/offerings/${offeringCourse2.id}/draft`,
      teacherAToken,
      {
        grades: [
          {
            enrollmentId: 'fake-enrollment-id',
            assessmentId: 'fake-assessment-id',
            scoreObtained: 85,
          },
        ],
      }
    );
    assert.strictEqual(t7.status, 403, 'Teacher A cannot modify grades for unassigned course');

    // 1.8 STRICT RULE: TEACHER must NEVER access official transcript!
    // GET /api/v1/grades/reports/transcript/:studentId MUST return HTTP 403 for TEACHER
    expectStatus('TCH-TRN-01', 403);
    const t8 = await callApi(
      'TEACHER_TRANSCRIPT_POLICY',
      'TCH-TRN-01',
      'Teacher A strictly blocked from GET /grades/reports/transcript/:studentId (returns 403)',
      'TEACHER',
      'GET',
      `/api/v1/grades/reports/transcript/${studentAId}`,
      teacherAToken
    );
    assert.strictEqual(t8.status, 403, 'Teacher must receive HTTP 403 on transcript endpoint');

    // 1.9 TEACHER strictly blocked from official transcript route
    expectStatus('TCH-TRN-02', 403);
    const t9 = await callApi(
      'TEACHER_TRANSCRIPT_POLICY',
      'TCH-TRN-02',
      'Teacher A strictly blocked from GET /transcripts/student/:studentId (returns 403)',
      'TEACHER',
      'GET',
      `/api/v1/transcripts/student/${studentAId}`,
      teacherAToken
    );
    assert.strictEqual(t9.status, 403, 'Teacher must receive HTTP 403 on /transcripts route');

    // 1.10 Teacher blocked from transcript of unassigned student
    expectStatus('TCH-TRN-03', 403);
    const t10 = await callApi(
      'TEACHER_TRANSCRIPT_POLICY',
      'TCH-TRN-03',
      'Teacher A blocked from transcript of unassigned student (returns 403)',
      'TEACHER',
      'GET',
      `/api/v1/grades/reports/transcript/${studentBId}`,
      teacherAToken
    );
    assert.strictEqual(t10.status, 403, 'Teacher denied transcript for unassigned student');

    // 1.11 TEACHER accesses course report for assigned course offering (HTTP 200)
    // The course report must contain ONLY that specific course's information
    expectStatus('TCH-CRPT-01', 200);
    const t11 = await callApi(
      'TEACHER_COURSE_REPORT',
      'TCH-CRPT-01',
      'Teacher A accesses course report for assigned course offering (HTTP 200)',
      'TEACHER',
      'GET',
      `/api/v1/grades/reports/course/${offeringCourse1.id}`,
      teacherAToken
    );
    assert.strictEqual(t11.status, 200, 'Teacher must be able to view assigned course report');
    assert.strictEqual(
      t11.data?.data?.courseCode,
      offeringCourse1.course.code,
      'Course report must contain only the specific assigned course'
    );
    assert.ok(
      !JSON.stringify(t11.data).includes(courseGeez.code),
      'Course report must NOT contain information from other courses'
    );

    // 1.12 Teacher blocked from course report of unassigned course offering (HTTP 403)
    expectStatus('TCH-CRPT-02', 403);
    const t12 = await callApi(
      'TEACHER_COURSE_REPORT',
      'TCH-CRPT-02',
      'Teacher A blocked from course report of unassigned course offering (HTTP 403)',
      'TEACHER',
      'GET',
      `/api/v1/grades/reports/course/${offeringCourse2.id}`,
      teacherAToken
    );
    assert.strictEqual(t12.status, 403, 'Teacher blocked from unassigned course report');

    // ==========================================
    // 2. STUDENT GRADE REPORT ACCESS
    // ==========================================
    console.log('\n--- Section 2: Student Grade Report & Access Restrictions Tests ---');

    // 2.1 Student A can view their own published grade report normally
    expectStatus('STU-RPT-01', 200);
    const s1 = await callApi(
      'STUDENT_REPORT',
      'STU-RPT-01',
      'Student A views own published course grade reports',
      'STUDENT',
      'GET',
      '/api/v1/grades/student/my-results',
      studentAToken
    );
    assert.strictEqual(s1.status, 200);
    assert.ok(s1.data?.data?.results?.length > 0, 'Student results should be populated');

    // 2.2 Student A can view their own academic-year grade history
    expectStatus('STU-RPT-02', 200);
    const s2 = await callApi(
      'STUDENT_REPORT',
      'STU-RPT-02',
      'Student A views own multi-year academic history',
      'STUDENT',
      'GET',
      '/api/v1/reports/student-history/me',
      studentAToken
    );
    assert.strictEqual(s2.status, 200);

    // 2.3 Student A must never access another student's grade reports
    expectStatus('STU-RPT-03', 403);
    const s3 = await callApi(
      'STUDENT_REPORT',
      'STU-RPT-03',
      'Student A blocked from viewing Student B grade report',
      'STUDENT',
      'GET',
      `/api/v1/reports/student-history/${studentBId}`,
      studentAToken
    );
    assert.strictEqual(s3.status, 403, 'Cross-student report access strictly forbidden');

    // 2.4 Students must NOT have access to official transcripts through student APIs
    expectStatus('STU-TRN-01', 403);
    const s4 = await callApi(
      'STUDENT_TRANSCRIPT',
      'STU-TRN-01',
      'Student denied direct GET /transcripts/student/:studentId',
      'STUDENT',
      'GET',
      `/api/v1/transcripts/student/${studentAId}`,
      studentAToken
    );
    assert.strictEqual(s4.status, 403, 'Official transcript endpoint forbidden to students');

    // 2.5 Direct transcript API requests by students denied on legacy route
    expectStatus('STU-TRN-02', 403);
    const s5 = await callApi(
      'STUDENT_TRANSCRIPT',
      'STU-TRN-02',
      'Student denied direct GET /grades/reports/transcript/:studentId',
      'STUDENT',
      'GET',
      `/api/v1/grades/reports/transcript/${studentAId}`,
      studentAToken
    );
    assert.strictEqual(s5.status, 403, 'Legacy transcript route forbidden to students');

    // 2.6 Student cannot prepare official transcripts
    expectStatus('STU-TRN-03', 403);
    const s6 = await callApi(
      'STUDENT_TRANSCRIPT',
      'STU-TRN-03',
      'Student denied POST /transcripts/student/:studentId/prepare',
      'STUDENT',
      'POST',
      `/api/v1/transcripts/student/${studentAId}/prepare`,
      studentAToken,
      { notes: 'Unauthorized attempt' }
    );
    assert.strictEqual(s6.status, 403);

    // 2.7 Student cannot publish official transcripts
    expectStatus('STU-TRN-04', 403);
    const s7 = await callApi(
      'STUDENT_TRANSCRIPT',
      'STU-TRN-04',
      'Student denied POST /transcripts/student/:studentId/publish',
      'STUDENT',
      'POST',
      `/api/v1/transcripts/student/${studentAId}/publish`,
      studentAToken,
      { notes: 'Unauthorized publish attempt' }
    );
    assert.strictEqual(s7.status, 403);

    // ==========================================
    // 3. OFFICIAL TRANSCRIPT MULTI-VERSIONING, DRAFT SEPARATION & DISCARD (14 SCENARIOS)
    // ==========================================
    console.log('\n--- Section 3: Official Transcript Multi-Versioning, Draft Separation & Discard Lifecycle (14 Scenarios) ---');

    // Clean up any audit logs for studentAId and studentBId to ensure fresh, clean test state
    await prisma.auditLog.deleteMany({
      where: {
        entityName: 'OfficialTranscript',
        entityId: { in: [studentAId, studentBId] },
      },
    });

    // Initial state check: NOT_PREPARED
    expectStatus('SCEN-00-INIT', 200);
    const initCheck = await callApi(
      'TRANSCRIPT_VERSIONING',
      'SCEN-00-INIT',
      'Check initial un-prepared state for Student A',
      'ADMIN',
      'GET',
      `/api/v1/transcripts/student/${studentAId}`,
      adminToken
    );
    assert.strictEqual(initCheck.status, 200);
    assert.strictEqual(initCheck.data?.data?.publication?.status, 'NOT_PREPARED');
    assert.strictEqual(initCheck.data?.data?.activeDraft, null);
    assert.strictEqual(initCheck.data?.data?.availableVersions?.length, 0);

    // SCENARIO 1: Prepare and publish Version 1
    console.log('\n>>> Scenario 1: Prepare and publish Version 1');
    expectStatus('SCEN-01-PREP', 200);
    const prep1 = await callApi(
      'TRANSCRIPT_VERSIONING',
      'SCEN-01-PREP',
      'Scenario 1.1: Prepare Version 1 draft',
      'SUPER_ADMIN',
      'POST',
      `/api/v1/transcripts/student/${studentAId}/prepare`,
      superAdminToken,
      { notes: 'Initial draft for Student A' }
    );
    assert.strictEqual(prep1.status, 200);
    assert.strictEqual(prep1.data?.data?.publication?.status, 'PREPARED');
    assert.strictEqual(prep1.data?.data?.publication?.targetVersionNumber, 1);
    assert.strictEqual(prep1.data?.data?.publication?.isDraft, true);

    expectStatus('SCEN-01-PUB', 200);
    const pub1 = await callApi(
      'TRANSCRIPT_VERSIONING',
      'SCEN-01-PUB',
      'Scenario 1.2: Publish Version 1',
      'SUPER_ADMIN',
      'POST',
      `/api/v1/transcripts/student/${studentAId}/publish`,
      superAdminToken,
      { notes: 'Official publication of Version 1' }
    );
    assert.strictEqual(pub1.status, 200);
    assert.strictEqual(pub1.data?.data?.publication?.status, 'PUBLISHED');
    assert.strictEqual(pub1.data?.data?.publication?.versionNumber, 1);
    assert.strictEqual(pub1.data?.data?.publication?.isDraft, false);
    assert.strictEqual(pub1.data?.data?.activeDraft, null);

    // SCENARIO 2: Prepare Version 2 while Version 1 is already published
    console.log('\n>>> Scenario 2: Prepare Version 2 while Version 1 is already published');
    expectStatus('SCEN-02-PREP-V2', 200);
    const prep2 = await callApi(
      'TRANSCRIPT_VERSIONING',
      'SCEN-02-PREP-V2',
      'Scenario 2: Prepare Version 2 draft while Version 1 is published',
      'ADMIN',
      'POST',
      `/api/v1/transcripts/student/${studentAId}/prepare`,
      adminToken,
      { notes: 'Working draft for Version 2 re-evaluation' }
    );
    assert.strictEqual(prep2.status, 200);
    assert.strictEqual(prep2.data?.data?.publication?.status, 'PREPARED');
    assert.strictEqual(prep2.data?.data?.publication?.targetVersionNumber, 2);
    assert.strictEqual(prep2.data?.data?.publication?.isDraft, true);

    // SCENARIO 3: Confirm Version 1 remains accessible and unchanged
    console.log('\n>>> Scenario 3: Confirm Version 1 remains accessible and unchanged');
    expectStatus('SCEN-03-V1-ACTIVE', 200);
    const v1StillActive = await callApi(
      'TRANSCRIPT_VERSIONING',
      'SCEN-03-V1-ACTIVE',
      'Scenario 3.1: Confirm GET /student/:id still returns published Version 1 despite active draft',
      'ADMIN',
      'GET',
      `/api/v1/transcripts/student/${studentAId}`,
      adminToken
    );
    assert.strictEqual(v1StillActive.status, 200);
    assert.strictEqual(v1StillActive.data?.data?.publication?.status, 'PUBLISHED');
    assert.strictEqual(v1StillActive.data?.data?.publication?.versionNumber, 1);
    assert.strictEqual(v1StillActive.data?.data?.publication?.isDraft, false);
    assert.ok(v1StillActive.data?.data?.activeDraft, 'Active draft must be exposed alongside Version 1');
    assert.strictEqual(v1StillActive.data?.data?.activeDraft?.targetVersionNumber, 2);

    expectStatus('SCEN-03-DRAFT-EP', 200);
    const draftCheck = await callApi(
      'TRANSCRIPT_VERSIONING',
      'SCEN-03-DRAFT-EP',
      'Scenario 3.2: Confirm GET /student/:id/draft returns active working draft',
      'ADMIN',
      'GET',
      `/api/v1/transcripts/student/${studentAId}/draft`,
      adminToken
    );
    assert.strictEqual(draftCheck.status, 200);
    assert.strictEqual(draftCheck.data?.data?.publication?.status, 'PREPARED');
    assert.strictEqual(draftCheck.data?.data?.publication?.targetVersionNumber, 2);
    assert.strictEqual(draftCheck.data?.data?.publication?.isDraft, true);

    // SCENARIO 4: Publish Version 2
    console.log('\n>>> Scenario 4: Publish Version 2');
    expectStatus('SCEN-04-PUB-V2', 200);
    const pub2 = await callApi(
      'TRANSCRIPT_VERSIONING',
      'SCEN-04-PUB-V2',
      'Scenario 4: Publish Version 2',
      'ADMIN',
      'POST',
      `/api/v1/transcripts/student/${studentAId}/publish`,
      adminToken,
      { notes: 'Official publication of Version 2' }
    );
    assert.strictEqual(pub2.status, 200);
    assert.strictEqual(pub2.data?.data?.publication?.status, 'PUBLISHED');
    assert.strictEqual(pub2.data?.data?.publication?.versionNumber, 2);
    assert.strictEqual(pub2.data?.data?.publication?.isDraft, false);
    assert.strictEqual(pub2.data?.data?.activeDraft, null);
    assert.strictEqual(pub2.data?.data?.availableVersions?.length, 2);

    // SCENARIO 5: Confirm both Version 1 and Version 2 are accessible
    console.log('\n>>> Scenario 5: Confirm both Version 1 and Version 2 are accessible');
    expectStatus('SCEN-05-GET-V1', 200);
    const getV1 = await callApi(
      'TRANSCRIPT_VERSIONING',
      'SCEN-05-GET-V1',
      'Scenario 5.1: Retrieve historical Version 1 via /version/1',
      'ADMIN',
      'GET',
      `/api/v1/transcripts/student/${studentAId}/version/1`,
      adminToken
    );
    assert.strictEqual(getV1.status, 200);
    assert.strictEqual(getV1.data?.data?.publication?.versionNumber, 1);
    assert.strictEqual(getV1.data?.data?.publication?.isHistorical, true);

    expectStatus('SCEN-05-GET-V2', 200);
    const getV2 = await callApi(
      'TRANSCRIPT_VERSIONING',
      'SCEN-05-GET-V2',
      'Scenario 5.2: Retrieve Version 2 via /version/2',
      'ADMIN',
      'GET',
      `/api/v1/transcripts/student/${studentAId}/version/2`,
      adminToken
    );
    assert.strictEqual(getV2.status, 200);
    assert.strictEqual(getV2.data?.data?.publication?.versionNumber, 2);
    assert.strictEqual(getV2.data?.data?.publication?.isHistorical, false);

    expectStatus('SCEN-05-GET-INV', 404);
    const getInvalid = await callApi(
      'TRANSCRIPT_VERSIONING',
      'SCEN-05-GET-INV',
      'Scenario 5.3: Request non-existent version (404)',
      'ADMIN',
      'GET',
      `/api/v1/transcripts/student/${studentAId}/version/999`,
      adminToken
    );
    assert.strictEqual(getInvalid.status, 404);

    // SCENARIO 6: Confirm Version 1 contains its original academic snapshot
    console.log('\n>>> Scenario 6: Confirm Version 1 contains its original academic snapshot');
    const v1Course2 = getV1.data?.data?.historyTerms
      ?.flatMap((t: any) => t.courses)
      ?.find((c: any) => c.courseCode === courseGeez.code);
    assert.ok(v1Course2, 'Course 2 must be present in Version 1 snapshot');
    const v1OriginalScore = v1Course2.totalScore;
    const v1OriginalGpa = getV1.data?.data?.cumulativeGpa;
    recordTest(
      'SCEN-06-SNAP-V1',
      'Scenario 6: Version 1 preserves its original sealed academic snapshot',
      'ADMIN',
      'GET',
      `/api/v1/transcripts/student/${studentAId}/version/1`,
      200,
      200,
      `Original sealed Course 2 score: ${v1OriginalScore}, GPA: ${v1OriginalGpa}`
    );

    // SCENARIO 7: Modify an underlying grade in DB and confirm historical versions remain unchanged
    console.log('\n>>> Scenario 7: Modify an underlying grade in DB and confirm historical versions remain unchanged');
    await prisma.studentEnrollment.update({
      where: {
        studentId_courseOfferingId: {
          studentId: studentAId,
          courseOfferingId: offeringCourse2.id,
        },
      },
      data: {
        finalNumericScore: 40.0,
        finalLetterGrade: 'F',
        isPassed: false,
      },
    });

    expectStatus('SCEN-07-V1-IMMUT', 200);
    const v1AfterDbChange = await callApi(
      'TRANSCRIPT_VERSIONING',
      'SCEN-07-V1-IMMUT',
      'Scenario 7.1: Verify Version 1 unchanged after database grade mutation',
      'ADMIN',
      'GET',
      `/api/v1/transcripts/student/${studentAId}/version/1`,
      adminToken
    );
    const v1ScoreAfter = v1AfterDbChange.data?.data?.historyTerms
      ?.flatMap((t: any) => t.courses)
      ?.find((c: any) => c.courseCode === courseGeez.code)?.totalScore;
    assert.strictEqual(v1ScoreAfter, v1OriginalScore, 'Version 1 score must remain completely unchanged');
    assert.strictEqual(v1AfterDbChange.data?.data?.cumulativeGpa, v1OriginalGpa, 'Version 1 GPA must remain unchanged');

    expectStatus('SCEN-07-V2-IMMUT', 200);
    const v2AfterDbChange = await callApi(
      'TRANSCRIPT_VERSIONING',
      'SCEN-07-V2-IMMUT',
      'Scenario 7.2: Verify Version 2 unchanged after database grade mutation',
      'ADMIN',
      'GET',
      `/api/v1/transcripts/student/${studentAId}/version/2`,
      adminToken
    );
    const v2ScoreAfter = v2AfterDbChange.data?.data?.historyTerms
      ?.flatMap((t: any) => t.courses)
      ?.find((c: any) => c.courseCode === courseGeez.code)?.totalScore;
    assert.strictEqual(v2ScoreAfter, v1OriginalScore, 'Version 2 score must remain completely unchanged');

    expectStatus('SCEN-07-LATEST-IMMUT', 200);
    const latestAfterDbChange = await callApi(
      'TRANSCRIPT_VERSIONING',
      'SCEN-07-LATEST-IMMUT',
      'Scenario 7.3: Verify latest published transcript endpoint is unchanged after DB mutation',
      'ADMIN',
      'GET',
      `/api/v1/transcripts/student/${studentAId}`,
      adminToken
    );
    const latestScoreAfter = latestAfterDbChange.data?.data?.historyTerms
      ?.flatMap((t: any) => t.courses)
      ?.find((c: any) => c.courseCode === courseGeez.code)?.totalScore;
    assert.strictEqual(latestScoreAfter, v1OriginalScore, 'Latest published transcript must use sealed snapshot');

    // Restore student grade in DB
    await prisma.studentEnrollment.update({
      where: {
        studentId_courseOfferingId: {
          studentId: studentAId,
          courseOfferingId: offeringCourse2.id,
        },
      },
      data: {
        finalNumericScore: 88.0,
        finalLetterGrade: 'A',
        isPassed: true,
      },
    });

    // SCENARIO 8: Confirm latest published version is displayed correctly
    console.log('\n>>> Scenario 8: Confirm latest published version is displayed correctly');
    expectStatus('SCEN-08-DISP-LATEST', 200);
    const latestCheck = await callApi(
      'TRANSCRIPT_VERSIONING',
      'SCEN-08-DISP-LATEST',
      'Scenario 8: Confirm latest published version is Version 2 with all available versions',
      'ADMIN',
      'GET',
      `/api/v1/transcripts/student/${studentAId}`,
      adminToken
    );
    assert.strictEqual(latestCheck.data?.data?.publication?.versionNumber, 2);
    assert.strictEqual(latestCheck.data?.data?.publication?.status, 'PUBLISHED');
    assert.strictEqual(latestCheck.data?.data?.availableVersions?.length, 2);
    assert.strictEqual(latestCheck.data?.data?.availableVersions[0].versionNumber, 1);
    assert.strictEqual(latestCheck.data?.data?.availableVersions[1].versionNumber, 2);

    // SCENARIO 9: DRAFT OVERWRITE PREVENTION, DISCARD PROTECTION & CONCURRENT PUBLISHING
    console.log('\n>>> Scenario 9: Draft Overwrite Prevention, Discard Protection & Concurrent Publishing');

    // 9.1 Prepare draft for Version 3
    expectStatus('SCEN-09-PREP-V3', 200);
    const prep3 = await callApi(
      'TRANSCRIPT_CONCURRENCY',
      'SCEN-09-PREP-V3',
      'Scenario 9.1: Admin prepares draft for Version 3',
      'ADMIN',
      'POST',
      `/api/v1/transcripts/student/${studentAId}/prepare`,
      adminToken,
      { notes: 'Draft for Version 3' }
    );
    assert.strictEqual(prep3.data?.data?.publication?.targetVersionNumber, 3);

    // 9.2 Attempt to prepare ANOTHER draft while one is active -> MUST return HTTP 409 Conflict
    expectStatus('SCEN-09-PREP-CONFLICT', 409);
    const prepConflict = await callApi(
      'TRANSCRIPT_CONCURRENCY',
      'SCEN-09-PREP-CONFLICT',
      'Scenario 9.2: Super Admin blocked from overwriting active draft (HTTP 409 Conflict)',
      'SUPER_ADMIN',
      'POST',
      `/api/v1/transcripts/student/${studentAId}/prepare`,
      superAdminToken,
      { notes: 'Conflicting draft attempt' }
    );
    assert.strictEqual(prepConflict.status, 409, 'Must reject with 409 when active draft exists');
    assert.ok(
      prepConflict.data?.message?.includes('ንቁ ረቂቅ'),
      'Must return localized Amharic error message explaining active draft exists'
    );

    // 9.3 Discard the draft via POST /draft/discard
    expectStatus('SCEN-09-DISCARD-POST', 200);
    const discardPost = await callApi(
      'TRANSCRIPT_CONCURRENCY',
      'SCEN-09-DISCARD-POST',
      'Scenario 9.3: Admin discards the active draft',
      'ADMIN',
      'POST',
      `/api/v1/transcripts/student/${studentAId}/draft/discard`,
      adminToken,
      { reason: 'Draft was obsolete' }
    );
    assert.strictEqual(discardPost.status, 200);
    assert.strictEqual(discardPost.data?.data?.publication?.versionNumber, 2);
    assert.strictEqual(discardPost.data?.data?.activeDraft, null);

    // 9.4 Attempt to PUBLISH after discard -> MUST return HTTP 409 Conflict
    expectStatus('SCEN-09-PUB-AFTER-DISCARD', 409);
    const pubAfterDiscard = await callApi(
      'TRANSCRIPT_CONCURRENCY',
      'SCEN-09-PUB-AFTER-DISCARD',
      'Scenario 9.4: Publish after draft discard blocked with HTTP 409 Conflict',
      'ADMIN',
      'POST',
      `/api/v1/transcripts/student/${studentAId}/publish`,
      adminToken,
      { notes: 'Attempting to publish discarded draft' }
    );
    assert.strictEqual(pubAfterDiscard.status, 409, 'Must reject publishing when no active draft exists');
    assert.ok(
      pubAfterDiscard.data?.message?.includes('ንቁ ረቂቅ'),
      'Must return error message stating no active draft exists'
    );

    // 9.5 Prepare draft again, test discard via DELETE /draft
    expectStatus('SCEN-09-PREP-DEL-TEST', 200);
    await callApi(
      'TRANSCRIPT_CONCURRENCY',
      'SCEN-09-PREP-DEL-TEST',
      'Scenario 9.5: Prepare draft for DELETE test',
      'ADMIN',
      'POST',
      `/api/v1/transcripts/student/${studentAId}/prepare`,
      adminToken
    );
    expectStatus('SCEN-09-DISCARD-DEL', 200);
    const discardDel = await callApi(
      'TRANSCRIPT_CONCURRENCY',
      'SCEN-09-DISCARD-DEL',
      'Scenario 9.6: Discard draft via DELETE /draft',
      'ADMIN',
      'DELETE',
      `/api/v1/transcripts/student/${studentAId}/draft`,
      adminToken
    );
    assert.strictEqual(discardDel.status, 200);
    assert.strictEqual(discardDel.data?.data?.activeDraft, null);

    // 9.6 Prepare draft for Version 3 after discard and publish successfully
    expectStatus('SCEN-09-PREP-V3-FINAL', 200);
    await callApi(
      'TRANSCRIPT_CONCURRENCY',
      'SCEN-09-PREP-V3-FINAL',
      'Scenario 9.7: Prepare fresh draft for Version 3',
      'ADMIN',
      'POST',
      `/api/v1/transcripts/student/${studentAId}/prepare`,
      adminToken
    );
    expectStatus('SCEN-09-PUB-V3-FINAL', 200);
    const pubV3 = await callApi(
      'TRANSCRIPT_CONCURRENCY',
      'SCEN-09-PUB-V3-FINAL',
      'Scenario 9.8: Publish Version 3 (assigned version 3, not skipping numbers)',
      'ADMIN',
      'POST',
      `/api/v1/transcripts/student/${studentAId}/publish`,
      adminToken
    );
    assert.strictEqual(pubV3.status, 200);
    assert.strictEqual(pubV3.data?.data?.publication?.versionNumber, 3);

    // 9.7 Concurrent Publishing & Row Locking: Prepare draft for Version 4
    expectStatus('SCEN-09-PREP-V4', 200);
    await callApi(
      'TRANSCRIPT_CONCURRENCY',
      'SCEN-09-PREP-V4',
      'Scenario 9.9: Prepare draft for Version 4 ahead of concurrency stress test',
      'ADMIN',
      'POST',
      `/api/v1/transcripts/student/${studentAId}/prepare`,
      adminToken
    );

    // Fire TWO SIMULTANEOUS PUBLISH REQUESTS concurrently
    console.log('Fired 2 concurrent publish requests for Student A...');
    const [concPub1, concPub2] = await Promise.all([
      fetch(`http://127.0.0.1:${serverPort}/api/v1/transcripts/student/${studentAId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ notes: 'Concurrent Publish Admin 1' }),
      }),
      fetch(`http://127.0.0.1:${serverPort}/api/v1/transcripts/student/${studentAId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
        body: JSON.stringify({ notes: 'Concurrent Publish Super Admin 2' }),
      }),
    ]);

    const concStatuses = [concPub1.status, concPub2.status].sort();
    console.log(`Concurrent publish response statuses: ${concStatuses.join(', ')}`);
    assert.deepStrictEqual(
      concStatuses,
      [200, 409],
      'Under concurrent publishing, exactly one request must succeed (200) and the other must be rejected (409 Conflict)'
    );
    recordTest(
      'SCEN-09-CONC-LOCK',
      'Concurrent publishing serialized by row lock: exactly 1 succeeded (200), 1 rejected (409 Conflict)',
      'ADMIN/SUPER_ADMIN',
      'POST',
      `/api/v1/transcripts/student/${studentAId}/publish`,
      200,
      200,
      `Statuses: ${concStatuses.join(', ')} - duplicate version completely prevented`
    );

    // Verify all published versions for Student A in DB are strictly sequential with NO duplicates
    const studentAPubLogs = await prisma.auditLog.findMany({
      where: {
        entityName: 'OfficialTranscript',
        entityId: studentAId,
        action: 'PUBLISH_OFFICIAL_TRANSCRIPT',
      },
      orderBy: { createdAt: 'asc' },
    });
    const assignedVersions = studentAPubLogs.map((l) => (l.details as any).versionNumber);
    console.log(`Assigned version numbers for Student A: ${assignedVersions.join(', ')}`);
    assert.deepStrictEqual(assignedVersions, [1, 2, 3, 4], 'Versions must be strictly sequential [1, 2, 3, 4]');
    const uniqueVersionsSet = new Set(assignedVersions);
    assert.strictEqual(assignedVersions.length, uniqueVersionsSet.size, 'No duplicate versions permitted');

    // SCENARIO 10: STUDENT ISOLATION & CONCURRENT PUBLISHING ACROSS MULTIPLE STUDENTS
    console.log('\n>>> Scenario 10: Student Isolation & Concurrent Publishing Across Multiple Students');
    await prisma.auditLog.deleteMany({
      where: {
        entityName: 'OfficialTranscript',
        entityId: studentBId,
      },
    });

    // Prepare draft for Student A (target Version 5)
    expectStatus('SCEN-10-STUA-PREP-V5', 200);
    await callApi(
      'TRANSCRIPT_ISOLATION',
      'SCEN-10-STUA-PREP-V5',
      'Prepare draft for Student A (target Version 5)',
      'ADMIN',
      'POST',
      `/api/v1/transcripts/student/${studentAId}/prepare`,
      adminToken
    );

    // Prepare draft for Student B (target Version 1)
    expectStatus('SCEN-10-STUB-PREP-V1', 200);
    await callApi(
      'TRANSCRIPT_ISOLATION',
      'SCEN-10-STUB-PREP-V1',
      'Prepare draft for Student B (target Version 1)',
      'ADMIN',
      'POST',
      `/api/v1/transcripts/student/${studentBId}/prepare`,
      adminToken
    );

    // Fire CONCURRENT PUBLISH requests for Student A and Student B simultaneously
    console.log('Fired concurrent publish requests for Student A and Student B simultaneously...');
    const [pubResStuA, pubResStuB] = await Promise.all([
      fetch(`http://127.0.0.1:${serverPort}/api/v1/transcripts/student/${studentAId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ notes: 'Publish Student A Version 5' }),
      }),
      fetch(`http://127.0.0.1:${serverPort}/api/v1/transcripts/student/${studentBId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
        body: JSON.stringify({ notes: 'Publish Student B Version 1' }),
      }),
    ]);

    assert.strictEqual(pubResStuA.status, 200, 'Student A publish must succeed with 200');
    assert.strictEqual(pubResStuB.status, 200, 'Student B publish must succeed with 200');

    const dataStuA = await pubResStuA.json();
    const dataStuB = await pubResStuB.json();

    assert.strictEqual(
      dataStuA?.data?.publication?.versionNumber,
      5,
      'Student A must receive Version 5'
    );
    assert.strictEqual(
      dataStuB?.data?.publication?.versionNumber,
      1,
      'Student B must receive Version 1 (isolated from Student A version history)'
    );
    recordTest(
      'SCEN-10-STU-ISOLATION',
      'Concurrent multi-student publish: Student A gets Version 5, Student B gets Version 1',
      'ADMIN/SUPER_ADMIN',
      'POST',
      `/api/v1/transcripts/student/concurrent`,
      200,
      200,
      `Student A Version: ${dataStuA?.data?.publication?.versionNumber}, Student B Version: ${dataStuB?.data?.publication?.versionNumber}`
    );

    // SCENARIO 11: Confirm unauthorized users (Student, Teacher) cannot retrieve historical transcripts
    console.log('\n>>> Scenario 11: Confirm unauthorized users cannot retrieve historical transcripts or drafts');
    expectStatus('SCEN-11-TCH-V1', 403);
    const tchV1 = await callApi(
      'TRANSCRIPT_RBAC',
      'SCEN-11-TCH-V1',
      'Scenario 11.1: Teacher blocked from GET /version/1 (403)',
      'TEACHER',
      'GET',
      `/api/v1/transcripts/student/${studentAId}/version/1`,
      teacherAToken
    );
    assert.strictEqual(tchV1.status, 403);

    expectStatus('SCEN-11-STU-V1', 403);
    const stuV1 = await callApi(
      'TRANSCRIPT_RBAC',
      'SCEN-11-STU-V1',
      'Scenario 11.2: Student blocked from GET /version/1 (403)',
      'STUDENT',
      'GET',
      `/api/v1/transcripts/student/${studentAId}/version/1`,
      studentAToken
    );
    assert.strictEqual(stuV1.status, 403);

    expectStatus('SCEN-11-TCH-DFT', 403);
    const tchDft = await callApi(
      'TRANSCRIPT_RBAC',
      'SCEN-11-TCH-DFT',
      'Scenario 11.3: Teacher blocked from GET /draft (403)',
      'TEACHER',
      'GET',
      `/api/v1/transcripts/student/${studentAId}/draft`,
      teacherAToken
    );
    assert.strictEqual(tchDft.status, 403);

    expectStatus('SCEN-11-STU-DFT', 403);
    const stuDft = await callApi(
      'TRANSCRIPT_RBAC',
      'SCEN-11-STU-DFT',
      'Scenario 11.4: Student blocked from GET /draft (403)',
      'STUDENT',
      'GET',
      `/api/v1/transcripts/student/${studentAId}/draft`,
      studentAToken
    );
    assert.strictEqual(stuDft.status, 403);

    // SCENARIO 12: Confirm MANAGEMENT cannot print, download, prepare, publish, or discard
    console.log('\n>>> Scenario 12: Confirm MANAGEMENT cannot prepare, publish, discard, or mutate');
    expectStatus('SCEN-12-MGMT-GET', 200);
    const mgmtGet = await callApi(
      'TRANSCRIPT_RBAC',
      'SCEN-12-MGMT-GET',
      'Scenario 12.1: Management can view latest published transcript (read-only)',
      'MANAGEMENT',
      'GET',
      `/api/v1/transcripts/student/${studentAId}`,
      mgmtToken
    );
    assert.strictEqual(mgmtGet.status, 200);

    expectStatus('SCEN-12-MGMT-V1', 200);
    const mgmtV1 = await callApi(
      'TRANSCRIPT_RBAC',
      'SCEN-12-MGMT-V1',
      'Scenario 12.2: Management can view historical Version 1 (read-only)',
      'MANAGEMENT',
      'GET',
      `/api/v1/transcripts/student/${studentAId}/version/1`,
      mgmtToken
    );
    assert.strictEqual(mgmtV1.status, 200);

    expectStatus('SCEN-12-MGMT-HIST', 200);
    const mgmtHist = await callApi(
      'TRANSCRIPT_RBAC',
      'SCEN-12-MGMT-HIST',
      'Scenario 12.3: Management can view publication history (read-only)',
      'MANAGEMENT',
      'GET',
      `/api/v1/transcripts/student/${studentAId}/history`,
      mgmtToken
    );
    assert.strictEqual(mgmtHist.status, 200);

    expectStatus('SCEN-12-MGMT-PREP', 403);
    const mgmtPrep = await callApi(
      'TRANSCRIPT_RBAC',
      'SCEN-12-MGMT-PREP',
      'Scenario 12.4: Management blocked from preparing transcript (403)',
      'MANAGEMENT',
      'POST',
      `/api/v1/transcripts/student/${studentAId}/prepare`,
      mgmtToken,
      { notes: 'Management attempt' }
    );
    assert.strictEqual(mgmtPrep.status, 403);

    expectStatus('SCEN-12-MGMT-PUB', 403);
    const mgmtPub = await callApi(
      'TRANSCRIPT_RBAC',
      'SCEN-12-MGMT-PUB',
      'Scenario 12.5: Management blocked from publishing transcript (403)',
      'MANAGEMENT',
      'POST',
      `/api/v1/transcripts/student/${studentAId}/publish`,
      mgmtToken,
      { notes: 'Management attempt' }
    );
    assert.strictEqual(mgmtPub.status, 403);

    expectStatus('SCEN-12-MGMT-DISC', 403);
    const mgmtDisc = await callApi(
      'TRANSCRIPT_RBAC',
      'SCEN-12-MGMT-DISC',
      'Scenario 12.6: Management blocked from discarding draft (403)',
      'MANAGEMENT',
      'POST',
      `/api/v1/transcripts/student/${studentAId}/draft/discard`,
      mgmtToken
    );
    assert.strictEqual(mgmtDisc.status, 403);

    expectStatus('SCEN-12-MGMT-DEL', 403);
    const mgmtDel = await callApi(
      'TRANSCRIPT_RBAC',
      'SCEN-12-MGMT-DEL',
      'Scenario 12.7: Management blocked from DELETE /draft (403)',
      'MANAGEMENT',
      'DELETE',
      `/api/v1/transcripts/student/${studentAId}/draft`,
      mgmtToken
    );
    assert.strictEqual(mgmtDel.status, 403);

    // SCENARIO 13: Confirm TEACHER and STUDENT cannot access official transcripts
    console.log('\n>>> Scenario 13: Confirm TEACHER and STUDENT cannot access official transcripts');
    expectStatus('SCEN-13-TCH-MAIN', 403);
    await callApi('TRANSCRIPT_RBAC', 'SCEN-13-TCH-MAIN', 'Scenario 13.1: Teacher blocked from GET /transcripts/student/:id (403)', 'TEACHER', 'GET', `/api/v1/transcripts/student/${studentAId}`, teacherAToken);

    expectStatus('SCEN-13-TCH-LEG', 403);
    await callApi('TRANSCRIPT_RBAC', 'SCEN-13-TCH-LEG', 'Scenario 13.2: Teacher blocked from GET /grades/reports/transcript/:id (403)', 'TEACHER', 'GET', `/api/v1/grades/reports/transcript/${studentAId}`, teacherAToken);

    expectStatus('SCEN-13-TCH-PREP', 403);
    await callApi('TRANSCRIPT_RBAC', 'SCEN-13-TCH-PREP', 'Scenario 13.3: Teacher blocked from POST /prepare (403)', 'TEACHER', 'POST', `/api/v1/transcripts/student/${studentAId}/prepare`, teacherAToken);

    expectStatus('SCEN-13-TCH-PUB', 403);
    await callApi('TRANSCRIPT_RBAC', 'SCEN-13-TCH-PUB', 'Scenario 13.4: Teacher blocked from POST /publish (403)', 'TEACHER', 'POST', `/api/v1/transcripts/student/${studentAId}/publish`, teacherAToken);

    expectStatus('SCEN-13-STU-MAIN', 403);
    await callApi('TRANSCRIPT_RBAC', 'SCEN-13-STU-MAIN', 'Scenario 13.5: Student blocked from GET /transcripts/student/:id (403)', 'STUDENT', 'GET', `/api/v1/transcripts/student/${studentAId}`, studentAToken);

    expectStatus('SCEN-13-STU-LEG', 403);
    await callApi('TRANSCRIPT_RBAC', 'SCEN-13-STU-LEG', 'Scenario 13.6: Student blocked from GET /grades/reports/transcript/:id (403)', 'STUDENT', 'GET', `/api/v1/grades/reports/transcript/${studentAId}`, studentAToken);

    expectStatus('SCEN-13-STU-PREP', 403);
    await callApi('TRANSCRIPT_RBAC', 'SCEN-13-STU-PREP', 'Scenario 13.7: Student blocked from POST /prepare (403)', 'STUDENT', 'POST', `/api/v1/transcripts/student/${studentAId}/prepare`, studentAToken);

    expectStatus('SCEN-13-STU-PUB', 403);
    await callApi('TRANSCRIPT_RBAC', 'SCEN-13-STU-PUB', 'Scenario 13.8: Student blocked from POST /publish (403)', 'STUDENT', 'POST', `/api/v1/transcripts/student/${studentAId}/publish`, studentAToken);

    // SCENARIO 14: Confirm teachers can access only their assigned-course reports
    console.log('\n>>> Scenario 14: Confirm teachers can access only their assigned-course reports');
    expectStatus('SCEN-14-TCH-ASSIGNED', 200);
    const rptAssigned = await callApi(
      'TEACHER_COURSE_REPORT',
      'SCEN-14-TCH-ASSIGNED',
      'Scenario 14.1: Teacher A accesses assigned course report (HTTP 200)',
      'TEACHER',
      'GET',
      `/api/v1/grades/reports/course/${offeringCourse1.id}`,
      teacherAToken
    );
    assert.strictEqual(rptAssigned.status, 200);
    assert.strictEqual(rptAssigned.data?.data?.courseCode, offeringCourse1.course.code);
    assert.ok(!JSON.stringify(rptAssigned.data).includes(courseGeez.code), 'Course report must not include other courses');

    expectStatus('SCEN-14-TCH-UNASSIGNED', 403);
    const rptUnassigned = await callApi(
      'TEACHER_COURSE_REPORT',
      'SCEN-14-TCH-UNASSIGNED',
      'Scenario 14.2: Teacher A blocked from unassigned course report (HTTP 403)',
      'TEACHER',
      'GET',
      `/api/v1/grades/reports/course/${offeringCourse2.id}`,
      teacherAToken
    );
    assert.strictEqual(rptUnassigned.status, 403);

    // ==========================================
    // SUMMARY REPORT
    // ==========================================
    console.log('\n================================================================');
    const total = results.length;
    const passed = results.filter((r) => r.passed).length;
    const failed = total - passed;
    console.log(`TOTAL SECURITY & POLICY TESTS: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('================================================================');

    if (failed > 0) {
      process.exitCode = 1;
    }
  } finally {
    await new Promise<void>((resolve) => {
      server.close(() => {
        console.log('\nTest server stopped.');
        resolve();
      });
    });
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
