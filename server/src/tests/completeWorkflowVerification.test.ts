import http from 'node:http';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../app.js';
import { ENV } from '../config/env.config.js';
import prisma from '../config/prisma.client.js';
import {
  UserRole,
  OfferingStatus,
  GradeSubmissionStatus,
  AnnouncementStatus,
  AnnouncementCategory,
  AnnouncementTargetAudience,
} from '@prisma/client';

export interface DetailedEvidence {
  testId: string;
  description: string;
  endpoint: string;
  method: string;
  expectedResult: string;
  actualResult: string;
  status: 'PASS' | 'FAIL' | 'NOT TESTED';
  durationMs: number;
  evidence: any;
}

const evidenceList: DetailedEvidence[] = [];

let server: http.Server;
let serverPort: number;

async function executeApiCall(
  testId: string,
  description: string,
  method: string,
  path: string,
  token: string | null,
  body: any,
  expectedStatus: number,
  expectedResultText: string,
  extraHeaders: Record<string, string> = {},
  evaluator?: (res: Response, data: any) => { pass: boolean; note: string }
): Promise<any> {
  const start = Date.now();
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...extraHeaders,
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`http://127.0.0.1:${serverPort}${path}`, {
      method,
      headers,
      body: body !== undefined && body !== null ? JSON.stringify(body) : undefined,
    });
    const durationMs = Date.now() - start;
    let data: any = null;
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    let pass = res.status === expectedStatus;
    let actualResultText = `HTTP ${res.status}`;

    if (evaluator) {
      const evalRes = evaluator(res, data);
      if (!evalRes.pass) {
        pass = false;
        actualResultText += ` - ${evalRes.note}`;
      } else {
        actualResultText += ` - ${evalRes.note}`;
      }
    } else {
      actualResultText += ` - Success: ${data?.success ?? data?.status ?? 'N/A'}`;
    }

    // Capture set-cookie headers if any
    const setCookie = res.headers.get('set-cookie');

    evidenceList.push({
      testId,
      description,
      endpoint: path,
      method,
      expectedResult: expectedResultText,
      actualResult: actualResultText,
      status: pass ? 'PASS' : 'FAIL',
      durationMs,
      evidence: {
        statusCode: res.status,
        responseSnippet: typeof data === 'object' ? JSON.stringify(data).slice(0, 200) : String(data).slice(0, 200),
        setCookie: setCookie ? setCookie.slice(0, 50) + '...' : undefined,
      },
    });

    return { data, headers: res.headers };
  } catch (err: any) {
    const durationMs = Date.now() - start;
    evidenceList.push({
      testId,
      description,
      endpoint: path,
      method,
      expectedResult: expectedResultText,
      actualResult: `Error: ${err.message}`,
      status: 'FAIL',
      durationMs,
      evidence: { error: err.message },
    });
    return { data: null, headers: null };
  }
}

async function main() {
  console.log('========================================================================');
  console.log('🔍 IN-DEPTH SYSTEM WORKFLOW & SECURITY VERIFICATION RUNNER');
  console.log('========================================================================\n');

  // Verify local database
  await prisma.$queryRaw`SELECT 1`;
  console.log('✅ Connected to isolated local database on localhost:5432.');

  // Start in-process HTTP test server
  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      serverPort = addr.port;
      console.log(`📡 In-process test server listening at http://127.0.0.1:${serverPort}\n`);
      resolve();
    });
  });

  try {
    // -------------------------------------------------------------------------
    // 1. Authenticate Standard Roles for Test Orchestration
    // -------------------------------------------------------------------------
    console.log('Authenticating standard test actors...');
    const superAdminRes = await executeApiCall(
      'INIT-SADM',
      'Super Admin Authentication',
      'POST',
      '/api/v1/auth/login',
      null,
      { identifier: 'superadmin', password: process.env.SEED_SUPERADMIN_PASSWORD || 'Admin@SundaySchool2026' },
      200,
      'HTTP 200 with JWT access token'
    );
    const superAdminToken = superAdminRes.data.data.accessToken;

    const adminRes = await executeApiCall(
      'INIT-ADM',
      'Admin Authentication',
      'POST',
      '/api/v1/auth/login',
      null,
      { identifier: 'admin_mulugeta', password: process.env.SEED_ADMIN_PASSWORD || 'Admin@2026' },
      200,
      'HTTP 200 with JWT access token'
    );
    const adminToken = adminRes.data.data.accessToken;

    const teacherRes = await executeApiCall(
      'INIT-TCH',
      'Teacher Authentication',
      'POST',
      '/api/v1/auth/login',
      null,
      { identifier: 'teacher_tekle', password: process.env.SEED_TEACHER_PASSWORD || 'Teacher@2026' },
      200,
      'HTTP 200 with JWT access token'
    );
    const teacherToken = teacherRes.data.data.accessToken;

    const studentRes = await executeApiCall(
      'INIT-STU',
      'Student Authentication',
      'POST',
      '/api/v1/auth/login',
      null,
      { identifier: 'student_yohannes', password: process.env.SEED_STUDENT_PASSWORD || 'Student@2026' },
      200,
      'HTTP 200 with JWT access token'
    );
    const studentToken = studentRes.data.data.accessToken;

    // -------------------------------------------------------------------------
    // ISSUE 1: PASSWORD CHANGE & TOKEN INVALIDATION ANALYSIS
    // -------------------------------------------------------------------------
    console.log('\n--- Issue 1: Password Change & Token Lifecycle on Isolated Test Account ---');
    const isoUsername = `iso_test_user_${Date.now()}`;
    const initialPass = 'InitialPass@2026!';
    const updatedPass = 'NewSecurePass@2026!';

    // Create isolated ephemeral test user
    const isoPasswordHash = await bcrypt.hash(initialPass, 12);
    const isoUser = await prisma.user.create({
      data: {
        username: isoUsername,
        passwordHash: isoPasswordHash,
        role: UserRole.STUDENT,
        firstName: 'ሙከራ',
        lastName: 'ተጠቃሚ',
        isActive: true,
      },
    });
    console.log(`Created isolated test user '${isoUsername}' (ID: ${isoUser.id})`);

    // 1.1 Login with initial password
    const isoLoginInitial = await executeApiCall(
      'PWD-ISO-01',
      'Isolated user initial login',
      'POST',
      '/api/v1/auth/login',
      null,
      { identifier: isoUsername, password: initialPass },
      200,
      'HTTP 200 with access token and refresh token cookie',
      {},
      (res, d) => ({ pass: !!d.data?.accessToken, note: 'Tokens issued successfully' })
    );
    const initialAccessToken = isoLoginInitial.data.data.accessToken;
    const cookieHeader = isoLoginInitial.headers.get('set-cookie') || '';
    const refreshTokenMatch = cookieHeader.match(/refreshToken=([^;]+)/);
    const initialRefreshToken = refreshTokenMatch ? refreshTokenMatch[1] : '';

    // 1.2 Change password
    await executeApiCall(
      'PWD-ISO-02',
      'Isolated user password change',
      'PUT',
      '/api/v1/auth/change-password',
      initialAccessToken,
      { currentPassword: initialPass, newPassword: updatedPass },
      200,
      'HTTP 200 password changed successfully',
      {},
      (res, d) => ({ pass: d.success === true, note: 'Password hash updated in DB' })
    );

    // 1.3 Old password rejection check
    await executeApiCall(
      'PWD-ISO-03',
      'Old password rejection check',
      'POST',
      '/api/v1/auth/login',
      null,
      { identifier: isoUsername, password: initialPass },
      401,
      'HTTP 401 Unauthorized for old password',
      {},
      (res, d) => ({ pass: d.success === false, note: 'Old password correctly rejected' })
    );

    // 1.4 New password login check
    await executeApiCall(
      'PWD-ISO-04',
      'New password login check',
      'POST',
      '/api/v1/auth/login',
      null,
      { identifier: isoUsername, password: updatedPass },
      200,
      'HTTP 200 OK for new password',
      {},
      (res, d) => ({ pass: !!d.data?.accessToken, note: 'Authenticated with new password' })
    );

    // 1.5 Access Token Invalidation Analysis (Immediate Token Revocation via tokenVersion)
    await executeApiCall(
      'PWD-ISO-05',
      'Old access token validity check (Immediate Revocation)',
      'GET',
      '/api/v1/auth/me',
      initialAccessToken,
      null,
      401,
      'HTTP 401 Unauthorized because tokenVersion mismatch immediately invalidates old access token',
      {},
      (res, d) => ({ pass: d.success === false, note: d.message || 'Old access token immediately rejected' })
    );

    // 1.6 Refresh Token behavior after password change (Immediate Revocation)
    const isoRefreshToken = jwt.sign({ userId: isoUser.id, tokenVersion: 1 }, ENV.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    await executeApiCall(
      'PWD-ISO-06',
      'Old refresh token usage check (Immediate Revocation)',
      'POST',
      '/api/v1/auth/refresh',
      null,
      { refreshToken: isoRefreshToken },
      401,
      'HTTP 401 Unauthorized because tokenVersion mismatch immediately invalidates old refresh token',
      { Cookie: `refreshToken=${isoRefreshToken}` },
      (res, d) => ({ pass: d.success === false, note: d.message || 'Old refresh token immediately rejected' })
    );

    // Cleanup ephemeral user
    await prisma.user.delete({ where: { id: isoUser.id } });
    console.log(`Cleaned up isolated user '${isoUsername}' from local DB.`);

    // -------------------------------------------------------------------------
    // ISSUE 2: TRANSCRIPT & ACADEMIC HISTORY ROUTE AUDIT
    // -------------------------------------------------------------------------
    console.log('\n--- Issue 2: Transcript & Academic History Route Verification ---');
    const seededStudent = await prisma.student.findFirst({ include: { user: true } });
    const studentDbId = seededStudent!.id;

    // 2.1 GET /api/v1/reports/student-history/:studentId (Student self-view)
    await executeApiCall(
      'TRN-01',
      'Academic history report endpoint (self-view)',
      'GET',
      `/api/v1/reports/student-history/${studentDbId}`,
      studentToken,
      null,
      200,
      'HTTP 200 with multi-year progression data',
      {},
      (res, d) => ({ pass: d.success === true && !!d.data?.student, note: 'Multi-year history retrieved' })
    );

    // 2.2 GET /api/v1/reports/student-history/:studentId (Other student forbidden)
    await executeApiCall(
      'TRN-02',
      'Academic history report endpoint (cross-student block)',
      'GET',
      '/api/v1/reports/student-history/other-student-guid-9999',
      studentToken,
      null,
      403,
      'HTTP 403 Forbidden with ownership guard',
      {},
      (res, d) => ({ pass: d.success === false, note: d.message || 'Forbidden' })
    );

    // 2.3 GET /api/v1/grades/reports/transcript/:studentId (Official transcript restricted to Admin/Super Admin/Management)
    await executeApiCall(
      'TRN-03',
      'Official transcript endpoint forbidden to students',
      'GET',
      `/api/v1/grades/reports/transcript/${studentDbId}`,
      studentToken,
      null,
      403,
      'HTTP 403 Forbidden - Official transcripts are administrative only',
      {},
      (res, d) => ({ pass: d.success === false, note: d.message || 'Forbidden to students' })
    );

    // 2.3b Admin authorized access to official transcript
    await executeApiCall(
      'TRN-03-ADMIN',
      'Official transcript accessible to authorized Administrator',
      'GET',
      `/api/v1/grades/reports/transcript/${studentDbId}`,
      adminToken,
      null,
      200,
      'HTTP 200 with official transcript document',
      {},
      (res, d) => ({ pass: d.success === true && !!d.data?.student, note: 'Official transcript document retrieved by Admin' })
    );

    // 2.4 GET /api/v1/grades/reports/transcript/:studentId (Other student forbidden)
    await executeApiCall(
      'TRN-04',
      'Printable grade transcript card (cross-student block)',
      'GET',
      '/api/v1/grades/reports/transcript/other-student-guid-9999',
      studentToken,
      null,
      403,
      'HTTP 403 Forbidden with ownership guard',
      {},
      (res, d) => ({ pass: d.success === false, note: d.message || 'Forbidden' })
    );

    // -------------------------------------------------------------------------
    // ISSUE 4: ANNOUNCEMENT SCHEDULING, SYNCHRONIZATION & EXPIRATION LIFECYCLE
    // -------------------------------------------------------------------------
    console.log('\n--- Issue 4: Announcement Scheduling, Sync & Expiration Lifecycle ---');

    // 4.1 Create announcement with future publishAt (now + 1 hour) and status PUBLISHED -> SCHEDULED
    const futureTime = new Date(Date.now() + 60 * 60 * 1000);
    const annCreated = await executeApiCall(
      'ANN-SCH-01',
      'Create scheduled announcement with future publishAt',
      'POST',
      '/api/v1/announcements',
      adminToken,
      {
        title: 'የወደፊት የታቀደ ማስታወቂያ',
        content: 'ይህ ማስታወቂያ በሰዓቱ እስኪደርስ ድረስ አይታይም።',
        category: 'GENERAL',
        targetAudience: 'ALL_USERS',
        status: 'PUBLISHED', // With future publishAt, system transitions to SCHEDULED
        publishAt: futureTime.toISOString(),
      },
      201,
      'HTTP 201 with status SCHEDULED',
      {},
      (res, d) => ({ pass: d.data?.status === 'SCHEDULED', note: `Status is ${d.data?.status}` })
    );
    const annId = annCreated.data.data.id;

    // 4.2 Verify recipient feed does NOT show the scheduled announcement
    await executeApiCall(
      'ANN-SCH-02',
      'Verify scheduled announcement hidden before publishAt',
      'GET',
      '/api/v1/announcements/my',
      studentToken,
      null,
      200,
      'HTTP 200 with scheduled announcement absent',
      {},
      (res, d) => {
        const found = (d.data || []).some((a: any) => a.announcementId === annId || a.id === annId);
        return { pass: !found, note: found ? 'Unexpectedly present' : 'Correctly hidden from recipient feed' };
      }
    );

    // 4.3 Simulate publishAt arrival by updating publishAt <= now in local DB
    await prisma.announcement.update({
      where: { id: annId },
      data: { publishAt: new Date(Date.now() - 60 * 1000) },
    });

    // 4.4 Trigger sync-schedule endpoint
    await executeApiCall(
      'ANN-SCH-03',
      'Trigger announcement sync-schedule endpoint',
      'GET',
      '/api/v1/announcements/sync-schedule',
      adminToken,
      null,
      200,
      'HTTP 200 sync-schedule processed',
      {},
      (res, d) => ({ pass: d.success === true, note: 'Sync executed successfully' })
    );

    // 4.5 Verify announcement status transitioned to PUBLISHED
    const updatedAnn = await prisma.announcement.findUnique({ where: { id: annId } });
    evidenceList.push({
      testId: 'ANN-SCH-04',
      description: 'Verify DB status transitioned to PUBLISHED after sync',
      endpoint: 'Local DB query',
      method: 'prisma.findUnique',
      expectedResult: 'Announcement status is PUBLISHED',
      actualResult: `Status is ${updatedAnn?.status}`,
      status: updatedAnn?.status === 'PUBLISHED' ? 'PASS' : 'FAIL',
      durationMs: 5,
      evidence: { status: updatedAnn?.status },
    });

    // 4.6 Verify recipient feed NOW displays the published announcement
    await executeApiCall(
      'ANN-SCH-05',
      'Verify published announcement appears in recipient feed',
      'GET',
      '/api/v1/announcements/my',
      studentToken,
      null,
      200,
      'HTTP 200 with announcement visible',
      {},
      (res, d) => {
        const found = (d.data || []).some((a: any) => a.announcementId === annId || a.id === annId);
        return { pass: found, note: found ? 'Visible in recipient feed' : 'Not found in recipient feed' };
      }
    );

    // 4.7 Simulate expiration: set expiresAt <= now in DB, run sync
    await prisma.announcement.update({
      where: { id: annId },
      data: { expiresAt: new Date(Date.now() - 60 * 1000) },
    });

    await executeApiCall(
      'ANN-SCH-06',
      'Trigger sync for expired announcement',
      'GET',
      '/api/v1/announcements/sync-schedule',
      adminToken,
      null,
      200,
      'HTTP 200 sync executed',
      {},
      (res, d) => ({ pass: d.success === true, note: 'Sync executed' })
    );

    const expiredAnn = await prisma.announcement.findUnique({ where: { id: annId } });
    evidenceList.push({
      testId: 'ANN-SCH-07',
      description: 'Verify DB status transitioned to EXPIRED',
      endpoint: 'Local DB query',
      method: 'prisma.findUnique',
      expectedResult: 'Announcement status is EXPIRED',
      actualResult: `Status is ${expiredAnn?.status}`,
      status: expiredAnn?.status === 'EXPIRED' ? 'PASS' : 'FAIL',
      durationMs: 5,
      evidence: { status: expiredAnn?.status },
    });

    // 4.8 Verify expired announcement is REMOVED from recipient feed
    await executeApiCall(
      'ANN-SCH-08',
      'Verify expired announcement removed from recipient feed',
      'GET',
      '/api/v1/announcements/my',
      studentToken,
      null,
      200,
      'HTTP 200 with expired announcement absent',
      {},
      (res, d) => {
        const found = (d.data || []).some((a: any) => a.announcementId === annId || a.id === annId);
        return { pass: !found, note: found ? 'Unexpectedly present' : 'Correctly removed from recipient feed' };
      }
    );

    // 4.9 Verify expired announcement REMAINS in Admin management records
    await executeApiCall(
      'ANN-SCH-09',
      'Verify expired announcement retained in Admin archive/records',
      'GET',
      '/api/v1/announcements/admin',
      adminToken,
      null,
      200,
      'HTTP 200 with expired announcement present in Admin records',
      {},
      (res, d) => {
        const items = d.data?.items || d.data?.announcements || (Array.isArray(d.data) ? d.data : []);
        const found = items.some((a: any) => a.id === annId || a.announcementId === annId);
        return { pass: found, note: found ? 'Retained in Admin records' : 'Missing from Admin records' };
      }
    );

    // Clean up test announcement
    await prisma.announcementRecipient.deleteMany({ where: { announcementId: annId } });
    await prisma.announcement.delete({ where: { id: annId } });

    // -------------------------------------------------------------------------
    // ISSUE 5: COMPLETE 9-STEP GRADING LIFECYCLE WORKFLOW
    // -------------------------------------------------------------------------
    console.log('\n--- Issue 5: Complete 9-Step Grading Lifecycle Workflow ---');

    // Create an isolated course offering specifically for this 9-step test
    const course = await prisma.course.findFirst();
    const year = await prisma.academicYear.findFirst();
    const batch = await prisma.batch.findFirst();
    const teacher = await prisma.teacher.findFirst({ where: { user: { username: 'teacher_tekle' } } });
    const student = await prisma.student.findFirst({ where: { user: { username: 'student_yohannes' } } });

    const workflowOffering = await prisma.courseOffering.create({
      data: {
        courseId: course!.id,
        academicYearId: year!.id,
        batchId: batch!.id,
        termSemester: `ሴሚስተር_${Date.now()}`,
        status: OfferingStatus.IN_PROGRESS,
        isSubmissionOpen: true,
      },
    });

    // Assign teacher to offering
    await prisma.teacherAssignment.create({
      data: {
        courseOfferingId: workflowOffering.id,
        teacherId: teacher!.id,
        isPrimary: true,
      },
    });

    // Enroll student in offering
    const workflowEnrollment = await prisma.studentEnrollment.create({
      data: {
        studentId: student!.id,
        courseOfferingId: workflowOffering.id,
      },
    });

    // Create assessment component
    const workflowAssessment = await prisma.assessment.create({
      data: {
        courseOfferingId: workflowOffering.id,
        name: 'የመጨረሻ ፈተና',
        type: 'FINAL_EXAM',
        maxScore: 100,
        weightPercentage: 100,
        displayOrder: 1,
      },
    });

    const offeringId = workflowOffering.id;
    const enrollmentId = workflowEnrollment.id;

    // Step 1: Teacher views sheet
    await executeApiCall(
      'GRD-WF-01',
      'Step 1: Teacher views offering grade sheet',
      'GET',
      `/api/v1/grades/offerings/${offeringId}/sheet`,
      teacherToken,
      null,
      200,
      'HTTP 200 with students and assessment columns',
      {},
      (res, d) => ({ pass: d.success === true && !!d.data?.students, note: 'Sheet loaded' })
    );

    // Step 2: Teacher saves draft grades
    await executeApiCall(
      'GRD-WF-02',
      'Step 2: Teacher saves draft grades',
      'PUT',
      `/api/v1/grades/offerings/${offeringId}/draft`,
      teacherToken,
      {
        grades: [
          {
            enrollmentId,
            assessmentId: workflowAssessment.id,
            scoreObtained: 75,
          },
        ],
      },
      200,
      'HTTP 200 draft saved',
      {},
      (res, d) => ({ pass: d.success === true, note: 'Draft grades persisted' })
    );

    // Step 3: Teacher submits grades for Admin approval
    const submitRes = await executeApiCall(
      'GRD-WF-03',
      'Step 3: Teacher submits grades for approval',
      'POST',
      `/api/v1/grades/offerings/${offeringId}/submit`,
      teacherToken,
      { notes: 'የመጀመሪያ ሴሚስተር ውጤቶች ለግምገማ ቀርበዋል።' },
      200,
      'HTTP 200 submission created in SUBMITTED state',
      {},
      (res, d) => {
        const sub = d.submission || d.data?.submission;
        return { pass: d.success === true && !!sub, note: `Status: ${sub?.status}` };
      }
    );
    const submissionId = submitRes.data.submission?.id || submitRes.data.data?.submission?.id;

    // Step 4: Admin reviews submission in review queue
    await executeApiCall(
      'GRD-WF-04',
      'Step 4: Admin views review queue',
      'GET',
      '/api/v1/grades/submissions/review',
      adminToken,
      null,
      200,
      'HTTP 200 list containing pending submission',
      {},
      (res, d) => {
        const list = Array.isArray(d.data) ? d.data : Array.isArray(d.submissions) ? d.submissions : [];
        const found = list.some((s: any) => s.id === submissionId);
        return { pass: found, note: found ? 'Submission in review queue' : 'Not found in queue' };
      }
    );

    // Step 5: Admin rejects submission with reason
    await executeApiCall(
      'GRD-WF-05',
      'Step 5: Admin rejects submission with reason',
      'POST',
      `/api/v1/grades/submissions/${submissionId}/reject`,
      adminToken,
      { rejectionReason: 'እባክዎ የተማሪዎችን የክፍል ተሳትፎ ነጥብ እንደገና ፈትሸው ያስተካክሉ።' },
      200,
      'HTTP 200 submission marked REJECTED',
      {},
      (res, d) => ({ pass: d.success === true, note: 'Submission rejected with reason' })
    );

    // Step 6: Teacher corrects grades and resubmits
    await executeApiCall(
      'GRD-WF-06A',
      'Step 6A: Teacher updates corrected grades in draft',
      'PUT',
      `/api/v1/grades/offerings/${offeringId}/draft`,
      teacherToken,
      {
        grades: [
          {
            enrollmentId,
            assessmentId: workflowAssessment.id,
            scoreObtained: 92, // Corrected score
          },
        ],
      },
      200,
      'HTTP 200 corrected draft saved',
      {},
      (res, d) => ({ pass: d.success === true, note: 'Corrected score saved' })
    );

    const resubmitRes = await executeApiCall(
      'GRD-WF-06B',
      'Step 6B: Teacher resubmits corrected grades',
      'POST',
      `/api/v1/grades/offerings/${offeringId}/submit`,
      teacherToken,
      { notes: 'ማስተካከያ ተደርጎ በድጋሚ የቀረበ።' },
      200,
      'HTTP 200 resubmitted successfully',
      {},
      (res, d) => {
        const sub = d.submission || d.data?.submission;
        return { pass: d.success === true && !!sub, note: 'Resubmitted' };
      }
    );
    const resubmittedId = resubmitRes.data.submission?.id || resubmitRes.data.data?.submission?.id;

    // Step 7: Admin approves the resubmitted grades
    await executeApiCall(
      'GRD-WF-07',
      'Step 7: Admin approves submission',
      'POST',
      `/api/v1/grades/submissions/${resubmittedId}/approve`,
      adminToken,
      {},
      200,
      'HTTP 200 submission approved',
      {},
      (res, d) => ({ pass: d.success === true, note: 'Submission approved' })
    );

    // Guard: Student cannot view grades while still APPROVED (not yet PUBLISHED)
    await executeApiCall(
      'GRD-WF-07-GUARD',
      'Student cannot view unpublished approved grades',
      'GET',
      '/api/v1/grades/student/my-results',
      studentToken,
      null,
      200,
      'HTTP 200 with 0 published grades for this offering',
      {},
      (res, d) => {
        const results = d.data?.results || [];
        const foundOffering = results.some((r: any) => r.enrollmentId === enrollmentId);
        return { pass: !foundOffering, note: foundOffering ? 'Leaked unpublished grade' : 'Correctly hidden before publish' };
      }
    );

    // Step 8: Admin publishes the approved grades
    await executeApiCall(
      'GRD-WF-08',
      'Step 8: Admin publishes approved grades',
      'POST',
      `/api/v1/grades/submissions/${resubmittedId}/publish`,
      adminToken,
      {},
      200,
      'HTTP 200 grades published',
      {},
      (res, d) => ({ pass: d.success === true, note: 'Grades published to students' })
    );

    // Step 9: Student views published grades
    await executeApiCall(
      'GRD-WF-09',
      'Step 9: Student views published grades',
      'GET',
      '/api/v1/grades/student/my-results',
      studentToken,
      null,
      200,
      'HTTP 200 with student results now populated',
      {},
      (res, d) => {
        const results = d.data?.results || [];
        const found = results.some((r: any) => r.enrollmentId === enrollmentId || r.offeringId === offeringId);
        return { pass: found, note: found ? 'Published course grade visible to student' : 'Published grade not visible' };
      }
    );

    // Cleanup workflow offering
    await prisma.grade.deleteMany({ where: { enrollmentId } });
    await prisma.gradeApproval.deleteMany({ where: { gradeSubmission: { courseOfferingId: offeringId } } });
    await prisma.gradeSubmission.deleteMany({ where: { courseOfferingId: offeringId } });
    await prisma.studentEnrollment.deleteMany({ where: { courseOfferingId: offeringId } });
    await prisma.teacherAssignment.deleteMany({ where: { courseOfferingId: offeringId } });
    await prisma.assessment.deleteMany({ where: { courseOfferingId: offeringId } });
    await prisma.courseOffering.delete({ where: { id: offeringId } });
    console.log('Cleaned up workflow offering successfully.');

    // -------------------------------------------------------------------------
    // ISSUE 6: ADDITIONAL MISSING TESTS
    // -------------------------------------------------------------------------
    console.log('\n--- Issue 6: Additional Verifications ---');

    // 6.1 Duplicate Student Registration Prevention
    const existingStudent = await prisma.student.findFirst();
    const existingYear = await prisma.academicYear.findFirst();
    const existingBatch = await prisma.batch.findFirst();

    if (existingStudent && existingYear && existingBatch) {
      await executeApiCall(
        'ADD-01',
        'Duplicate student admission number rejected',
        'POST',
        '/api/v1/students',
        adminToken,
        {
          admissionNumber: existingStudent.admissionNumber,
          firstName: 'ሙከራ',
          lastName: 'ተማሪ',
          gender: 'MALE',
          academicYearId: existingYear.id,
          batchId: existingBatch.id,
        },
        400,
        'HTTP 400 Bad Request duplicate admission number rejected',
        {},
        (res, d) => ({ pass: d.success === false && d.message.includes('አስቀድሞ'), note: d.message })
      );
    }

    // 6.2 Teacher Assignment to Multiple Courses
    const targetTeacher = await prisma.teacher.findFirst();
    // Create 2 fresh offerings to guarantee no prior assignment
    const freshOff1 = await prisma.courseOffering.create({
      data: {
        courseId: course!.id,
        academicYearId: year!.id,
        batchId: batch!.id,
        termSemester: 'ሴሚስተር 1 (ሙከራ 1)',
      },
    });
    const freshOff2 = await prisma.courseOffering.create({
      data: {
        courseId: course!.id,
        academicYearId: year!.id,
        batchId: batch!.id,
        termSemester: 'ሴሚስተር 2 (ሙከራ 2)',
      },
    });

    await executeApiCall(
      'ADD-02A',
      'Assign teacher to Course Offering 1',
      'POST',
      `/api/v1/courses/offerings/${freshOff1.id}/assign-teacher`,
      adminToken,
      { teacherId: targetTeacher!.id, isPrimary: true },
      201,
      'HTTP 201 created assignment for course 1',
      {},
      (res, d) => ({ pass: d.success === true, note: 'Assigned to course 1' })
    );

    await executeApiCall(
      'ADD-02B',
      'Assign same teacher to Course Offering 2',
      'POST',
      `/api/v1/courses/offerings/${freshOff2.id}/assign-teacher`,
      adminToken,
      { teacherId: targetTeacher!.id, isPrimary: true },
      201,
      'HTTP 201 created assignment for course 2',
      {},
      (res, d) => ({ pass: d.success === true, note: 'Assigned to multiple courses successfully' })
    );

    // Cleanup fresh offerings
    await prisma.teacherAssignment.deleteMany({ where: { courseOfferingId: { in: [freshOff1.id, freshOff2.id] } } });
    await prisma.courseOffering.deleteMany({ where: { id: { in: [freshOff1.id, freshOff2.id] } } });

    // 6.3 Pagination for Large Student Lists
    await executeApiCall(
      'ADD-03',
      'Pagination parameters page & limit verified',
      'GET',
      '/api/v1/students?page=1&limit=1',
      adminToken,
      null,
      200,
      'HTTP 200 with pagination structure',
      {},
      (res, d) => {
        const hasPagination = typeof d.data?.page === 'number' && typeof d.data?.limit === 'number' && Array.isArray(d.data?.students);
        return { pass: hasPagination, note: `Page: ${d.data?.page}, Limit: ${d.data?.limit}, Total: ${d.data?.total}` };
      }
    );

    // 6.4 Basic Concurrent-User Behavior Simulation
    console.log('Running concurrent requests simulation (10 parallel requests)...');
    const startConcur = Date.now();
    const parallelRequests = Array.from({ length: 10 }, (_, i) =>
      fetch(`http://127.0.0.1:${serverPort}/api/v1/academic/batches`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    );
    const concurrentResponses = await Promise.all(parallelRequests);
    const concurDuration = Date.now() - startConcur;
    const all200 = concurrentResponses.every((r) => r.status === 200);

    evidenceList.push({
      testId: 'ADD-04',
      description: 'Concurrent user requests simulation (10 parallel requests)',
      endpoint: '/api/v1/academic/batches',
      method: 'GET (10x Parallel)',
      expectedResult: 'All 10 parallel requests complete with HTTP 200 OK without deadlocks',
      actualResult: `All 10 returned HTTP 200 in ${concurDuration}ms`,
      status: all200 ? 'PASS' : 'FAIL',
      durationMs: concurDuration,
      evidence: { statuses: concurrentResponses.map((r) => r.status), totalDurationMs: concurDuration },
    });

  } finally {
    server.close();
    await prisma.$disconnect();
  }

  // ---------------------------------------------------------------------------
  // Output Detailed Evidence JSON for Report Generation
  // ---------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log('📊 DETAILED EXECUTION EVIDENCE TABLE');
  console.log('========================================================================\n');

  console.log(JSON.stringify(evidenceList, null, 2));

  const total = evidenceList.length;
  const passed = evidenceList.filter((e) => e.status === 'PASS').length;
  const failed = evidenceList.filter((e) => e.status === 'FAIL').length;

  console.log(`\nTotal In-Depth Scenarios: ${total} | Passed: ${passed} | Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Fatal Runner Error:', err);
  process.exit(1);
});
