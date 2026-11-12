import http from 'node:http';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import { ENV } from '../config/env.config.js';
import prisma from '../config/prisma.client.js';
import { UserRole } from '@prisma/client';

interface TestResult {
  id: string;
  category: string;
  scenario: string;
  method: string;
  path: string;
  expectedStatus: number;
  actualStatus: number;
  durationMs: number;
  status: 'PASS' | 'FAIL';
  details?: string;
}

const results: TestResult[] = [];

let server: http.Server;
let serverPort: number;

async function runTest(
  id: string,
  category: string,
  scenario: string,
  method: string,
  path: string,
  headers: Record<string, string>,
  body: any,
  expectedStatus: number,
  validator?: (data: any, res: Response) => boolean | string
) {
  const start = Date.now();
  try {
    const res = await fetch(`http://127.0.0.1:${serverPort}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
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
    let detailMsg = '';

    if (pass && validator) {
      const valRes = validator(data, res);
      if (typeof valRes === 'string') {
        pass = false;
        detailMsg = valRes;
      } else if (!valRes) {
        pass = false;
        detailMsg = 'Custom validator returned false';
      }
    }

    if (!pass && !detailMsg) {
      detailMsg = `Expected ${expectedStatus}, received ${res.status}: ${JSON.stringify(data).slice(0, 150)}`;
    }

    results.push({
      id,
      category,
      scenario,
      method,
      path,
      expectedStatus,
      actualStatus: res.status,
      durationMs,
      status: pass ? 'PASS' : 'FAIL',
      details: detailMsg || undefined,
    });
  } catch (err: any) {
    results.push({
      id,
      category,
      scenario,
      method,
      path,
      expectedStatus,
      actualStatus: 0,
      durationMs: Date.now() - start,
      status: 'FAIL',
      details: err.message,
    });
  }
}

async function main() {
  console.log('========================================================================');
  console.log('🚀 SUNDAY SCHOOL STUDENT GRADING MANAGEMENT SYSTEM');
  console.log('📡 COMPREHENSIVE LIVE API FUNCTIONALITY & SECURITY TEST SUITE');
  console.log('========================================================================\n');

  // Verify Database Connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connectivity established successfully.');
  } catch (err: any) {
    console.error('❌ Failed to connect to database:', err.message);
    process.exit(1);
  }

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
    // Collect active entities from DB for realistic test context
    const studentRecord = await prisma.student.findFirst({ include: { user: true } });
    const teacherRecord = await prisma.teacher.findFirst({ include: { user: true } });
    const batchRecord = await prisma.batch.findFirst();
    const offeringRecord = await prisma.courseOffering.findFirst({ include: { course: true } });

    console.log('--- Phase 1: Authentication & Credential Verification ---');

    // 1.1 Health Check
    await runTest(
      'AUTH-01',
      'Authentication',
      'System health check returns 200 OK with system status',
      'GET',
      '/api/v1/health',
      {},
      null,
      200,
      (d) => d.success === true
    );

    // 1.2 Missing credentials validation
    await runTest(
      'AUTH-02',
      'Authentication',
      'Login fails with 400 Bad Request when credentials omitted',
      'POST',
      '/api/v1/auth/login',
      {},
      {},
      400,
      (d) => d.success === false
    );

    // 1.3 Invalid password
    await runTest(
      'AUTH-03',
      'Authentication',
      'Login fails with 401 Unauthorized for incorrect password',
      'POST',
      '/api/v1/auth/login',
      {},
      { identifier: 'superadmin', password: 'WrongPassword@123' },
      401,
      (d) => d.success === false
    );

    // 1.4 Non-existent user
    await runTest(
      'AUTH-04',
      'Authentication',
      'Login fails with 401 Unauthorized for non-existent user identifier',
      'POST',
      '/api/v1/auth/login',
      {},
      { identifier: 'ghost_user_99999', password: 'AnyPassword@2026' },
      401,
      (d) => d.success === false
    );

    // 1.5 SQL injection attempt in username
    await runTest(
      'AUTH-05',
      'Authentication',
      'SQL injection string safely handled and rejected with 401',
      'POST',
      '/api/v1/auth/login',
      {},
      { identifier: "' OR '1'='1", password: "' OR '1'='1" },
      401,
      (d) => d.success === false
    );

    // 1.6 - 1.10 Authentic Logins for all 5 roles
    let superAdminToken = '';
    let adminToken = '';
    let mgmtToken = '';
    let teacherToken = '';
    let studentToken = '';

    await runTest(
      'AUTH-06',
      'Authentication',
      'Role 1: SUPER_ADMIN authentic login',
      'POST',
      '/api/v1/auth/login',
      {},
      { identifier: 'superadmin', password: process.env.SEED_SUPERADMIN_PASSWORD || 'Admin@SundaySchool2026' },
      200,
      (d) => {
        if (!d.success || !d.data?.accessToken || d.data?.user?.role !== 'SUPER_ADMIN') return false;
        superAdminToken = d.data.accessToken;
        return true;
      }
    );

    await runTest(
      'AUTH-07',
      'Authentication',
      'Role 2: ADMIN authentic login',
      'POST',
      '/api/v1/auth/login',
      {},
      { identifier: 'admin_mulugeta', password: process.env.SEED_ADMIN_PASSWORD || 'Admin@2026' },
      200,
      (d) => {
        if (!d.success || !d.data?.accessToken || d.data?.user?.role !== 'ADMIN') return false;
        adminToken = d.data.accessToken;
        return true;
      }
    );

    await runTest(
      'AUTH-08',
      'Authentication',
      'Role 3: MANAGEMENT authentic login',
      'POST',
      '/api/v1/auth/login',
      {},
      { identifier: 'mgmt_berhanu', password: process.env.SEED_MGMT_PASSWORD || 'Mgmt@2026' },
      200,
      (d) => {
        if (!d.success || !d.data?.accessToken || d.data?.user?.role !== 'MANAGEMENT') return false;
        mgmtToken = d.data.accessToken;
        return true;
      }
    );

    await runTest(
      'AUTH-09',
      'Authentication',
      'Role 4: TEACHER authentic login',
      'POST',
      '/api/v1/auth/login',
      {},
      { identifier: 'teacher_tekle', password: process.env.SEED_TEACHER_PASSWORD || 'Teacher@2026' },
      200,
      (d) => {
        if (!d.success || !d.data?.accessToken || d.data?.user?.role !== 'TEACHER') return false;
        teacherToken = d.data.accessToken;
        return true;
      }
    );

    await runTest(
      'AUTH-10',
      'Authentication',
      'Role 5: STUDENT authentic login',
      'POST',
      '/api/v1/auth/login',
      {},
      { identifier: 'student_yohannes', password: process.env.SEED_STUDENT_PASSWORD || 'Student@2026' },
      200,
      (d) => {
        if (!d.success || !d.data?.accessToken || d.data?.user?.role !== 'STUDENT') return false;
        studentToken = d.data.accessToken;
        return true;
      }
    );

    // 1.11 - 1.15 Verify /api/v1/auth/me for each role
    await runTest(
      'AUTH-11',
      'Authentication',
      'Token validation /auth/me for SUPER_ADMIN',
      'GET',
      '/api/v1/auth/me',
      { Authorization: `Bearer ${superAdminToken}` },
      null,
      200,
      (d) => d.success === true && d.data?.role === 'SUPER_ADMIN'
    );

    await runTest(
      'AUTH-12',
      'Authentication',
      'Token validation /auth/me for ADMIN',
      'GET',
      '/api/v1/auth/me',
      { Authorization: `Bearer ${adminToken}` },
      null,
      200,
      (d) => d.success === true && d.data?.role === 'ADMIN'
    );

    await runTest(
      'AUTH-13',
      'Authentication',
      'Token validation /auth/me for MANAGEMENT',
      'GET',
      '/api/v1/auth/me',
      { Authorization: `Bearer ${mgmtToken}` },
      null,
      200,
      (d) => d.success === true && d.data?.role === 'MANAGEMENT'
    );

    await runTest(
      'AUTH-14',
      'Authentication',
      'Token validation /auth/me for TEACHER',
      'GET',
      '/api/v1/auth/me',
      { Authorization: `Bearer ${teacherToken}` },
      null,
      200,
      (d) => d.success === true && d.data?.role === 'TEACHER'
    );

    await runTest(
      'AUTH-15',
      'Authentication',
      'Token validation /auth/me for STUDENT',
      'GET',
      '/api/v1/auth/me',
      { Authorization: `Bearer ${studentToken}` },
      null,
      200,
      (d) => d.success === true && d.data?.role === 'STUDENT'
    );

    // 1.16 - 1.18 Token security & tampering
    const tamperedToken = superAdminToken.slice(0, -6) + 'xyz123';
    const expiredToken = jwt.sign(
      { userId: 'usr-expired', role: 'ADMIN', username: 'exp_user' },
      ENV.JWT_ACCESS_SECRET,
      { expiresIn: '-10s' }
    );

    await runTest(
      'AUTH-16',
      'Authentication',
      'Protected endpoint rejects request with missing token (401)',
      'GET',
      '/api/v1/auth/me',
      {},
      null,
      401,
      (d) => d.success === false
    );

    await runTest(
      'AUTH-17',
      'Authentication',
      'Protected endpoint rejects signature-tampered token (401)',
      'GET',
      '/api/v1/auth/me',
      { Authorization: `Bearer ${tamperedToken}` },
      null,
      401,
      (d) => d.success === false
    );

    await runTest(
      'AUTH-18',
      'Authentication',
      'Protected endpoint rejects expired token (401)',
      'GET',
      '/api/v1/auth/me',
      { Authorization: `Bearer ${expiredToken}` },
      null,
      401,
      (d) => d.success === false && d.message.includes('ጊዜው አልፎበታል')
    );

    // 1.19 Password Change Workflow (Cycle: Change -> New login -> Old rejected -> Revert)
    console.log('--- Phase 1.2: Password Change Lifecycle ---');
    const pwdTestUser = 'student_yohannes';
    const initialPwd = process.env.SEED_STUDENT_PASSWORD || 'Student@2026';
    const tempNewPwd = 'NewTemporaryPwd@2026!';

    // Change to temp password
    await runTest(
      'PWD-01',
      'Password Lifecycle',
      'Student successfully changes password with valid current password',
      'PUT',
      '/api/v1/auth/change-password',
      { Authorization: `Bearer ${studentToken}` },
      { currentPassword: initialPwd, newPassword: tempNewPwd },
      200,
      (d) => d.success === true
    );

    // Old password must be rejected
    await runTest(
      'PWD-02',
      'Password Lifecycle',
      'Old password is now rejected upon login attempt (401)',
      'POST',
      '/api/v1/auth/login',
      {},
      { identifier: pwdTestUser, password: initialPwd },
      401,
      (d) => d.success === false
    );

    // Login with new password succeeds
    let studentNewToken = '';
    await runTest(
      'PWD-03',
      'Password Lifecycle',
      'Login with new password succeeds (200)',
      'POST',
      '/api/v1/auth/login',
      {},
      { identifier: pwdTestUser, password: tempNewPwd },
      200,
      (d) => {
        if (!d.success || !d.data?.accessToken) return false;
        studentNewToken = d.data.accessToken;
        return true;
      }
    );

    // Change back to original password for consistency
    await runTest(
      'PWD-04',
      'Password Lifecycle',
      'Restore original password to maintain consistent test state',
      'PUT',
      '/api/v1/auth/change-password',
      { Authorization: `Bearer ${studentNewToken}` },
      { currentPassword: tempNewPwd, newPassword: initialPwd },
      200,
      (d) => d.success === true
    );

    // Re-verify original password works
    await runTest(
      'PWD-05',
      'Password Lifecycle',
      'Original password restored and functional (200)',
      'POST',
      '/api/v1/auth/login',
      {},
      { identifier: pwdTestUser, password: initialPwd },
      200,
      (d) => {
        studentToken = d.data.accessToken;
        return d.success === true;
      }
    );

    console.log('--- Phase 2: Super Admin Exclusive Privileges & RBAC ---');

    // 2.1 Audit logs viewable by Super Admin
    await runTest(
      'SADM-01',
      'Super Admin',
      'Super Admin can view system audit logs (200)',
      'GET',
      '/api/v1/users/audit-logs',
      { Authorization: `Bearer ${superAdminToken}` },
      null,
      200,
      (d) => d.success === true && Array.isArray(d.data.logs)
    );

    // 2.2 Audit logs blocked for Admin
    await runTest(
      'SADM-02',
      'Super Admin',
      'Admin cannot access system audit logs (Super Admin exclusive 403)',
      'GET',
      '/api/v1/users/audit-logs',
      { Authorization: `Bearer ${adminToken}` },
      null,
      403,
      (d) => d.success === false
    );

    // 2.3 Audit logs blocked for Management
    await runTest(
      'SADM-03',
      'Super Admin',
      'Management cannot access audit logs (403)',
      'GET',
      '/api/v1/users/audit-logs',
      { Authorization: `Bearer ${mgmtToken}` },
      null,
      403
    );

    // 2.4 Audit logs blocked for Teacher
    await runTest(
      'SADM-04',
      'Super Admin',
      'Teacher cannot access audit logs (403)',
      'GET',
      '/api/v1/users/audit-logs',
      { Authorization: `Bearer ${teacherToken}` },
      null,
      403
    );

    // 2.5 Audit logs blocked for Student
    await runTest(
      'SADM-05',
      'Super Admin',
      'Student cannot access audit logs (403)',
      'GET',
      '/api/v1/users/audit-logs',
      { Authorization: `Bearer ${studentToken}` },
      null,
      403
    );

    // 2.6 Super Admin registers an Admin account
    const testAdminUsername = `test_admin_${Date.now()}`;
    await runTest(
      'SADM-06',
      'Super Admin',
      'Super Admin can register a new Admin account (201)',
      'POST',
      '/api/v1/users',
      { Authorization: `Bearer ${superAdminToken}` },
      {
        username: testAdminUsername,
        password: 'AdminPassword@2026',
        role: 'ADMIN',
        firstName: 'ሙከራ',
        lastName: 'አስተዳዳሪ',
      },
      201,
      (d) => d.success === true && (d.data?.role === 'ADMIN' || d.data?.user?.role === 'ADMIN')
    );

    // 2.7 Super Admin registers a Management account
    const testMgmtUsername = `test_mgmt_${Date.now()}`;
    await runTest(
      'SADM-07',
      'Super Admin',
      'Super Admin can register a new Management account (201)',
      'POST',
      '/api/v1/users',
      { Authorization: `Bearer ${superAdminToken}` },
      {
        username: testMgmtUsername,
        password: 'MgmtPassword@2026',
        role: 'MANAGEMENT',
        firstName: 'ሙከራ',
        lastName: 'ማኔጅመንት',
      },
      201,
      (d) => d.success === true && (d.data?.role === 'MANAGEMENT' || d.data?.user?.role === 'MANAGEMENT')
    );

    console.log('--- Phase 3: Admin Hierarchy Guards & Permission Limits ---');

    // 3.1 Admin cannot create SUPER_ADMIN account
    await runTest(
      'ADM-01',
      'Admin RBAC',
      'Admin cannot create a SUPER_ADMIN account (Hierarchy guard 403)',
      'POST',
      '/api/v1/users',
      { Authorization: `Bearer ${adminToken}` },
      {
        username: 'unauth_superadmin',
        password: 'Password@2026',
        role: 'SUPER_ADMIN',
        firstName: 'Fake',
        lastName: 'SuperAdmin',
      },
      403,
      (d) => d.success === false && d.message.includes('ፈቃድ የለውም')
    );

    // 3.2 Admin cannot create another ADMIN account
    await runTest(
      'ADM-02',
      'Admin RBAC',
      'Admin cannot create another ADMIN account (Hierarchy guard 403)',
      'POST',
      '/api/v1/users',
      { Authorization: `Bearer ${adminToken}` },
      {
        username: 'unauth_subadmin',
        password: 'Password@2026',
        role: 'ADMIN',
        firstName: 'Fake',
        lastName: 'Admin',
      },
      403,
      (d) => d.success === false && d.message.includes('ፈቃድ የለውም')
    );

    // 3.3 Admin cannot create MANAGEMENT account (Super Admin exclusive)
    await runTest(
      'ADM-03',
      'Admin RBAC',
      'Admin cannot create MANAGEMENT account (Super Admin exclusive 403)',
      'POST',
      '/api/v1/users',
      { Authorization: `Bearer ${adminToken}` },
      {
        username: 'unauth_mgmt',
        password: 'Password@2026',
        role: 'MANAGEMENT',
        firstName: 'Fake',
        lastName: 'Mgmt',
      },
      403,
      (d) => d.success === false && d.message.includes('የዋና አስተዳዳሪ ብቻ ነው')
    );

    // 3.4 Non-admin roles cannot create users
    await runTest(
      'ADM-04',
      'Admin RBAC',
      'Teacher cannot create user accounts (403)',
      'POST',
      '/api/v1/users',
      { Authorization: `Bearer ${teacherToken}` },
      { username: 'teacher_sub', role: 'STUDENT', firstName: 'A', lastName: 'B' },
      403
    );

    await runTest(
      'ADM-05',
      'Admin RBAC',
      'Student cannot create user accounts (403)',
      'POST',
      '/api/v1/users',
      { Authorization: `Bearer ${studentToken}` },
      { username: 'student_sub', role: 'STUDENT', firstName: 'A', lastName: 'B' },
      403
    );

    // 3.6 Non-admin roles cannot list system users
    await runTest(
      'ADM-06',
      'Admin RBAC',
      'Teacher cannot list system users (403)',
      'GET',
      '/api/v1/users',
      { Authorization: `Bearer ${teacherToken}` },
      null,
      403
    );

    await runTest(
      'ADM-07',
      'Admin RBAC',
      'Student cannot list system users (403)',
      'GET',
      '/api/v1/users',
      { Authorization: `Bearer ${studentToken}` },
      null,
      403
    );

    console.log('--- Phase 4: Admin Academic Entity Management ---');

    // 4.1 Academic years list
    await runTest(
      'ACAD-01',
      'Academic Admin',
      'Admin can list academic years (200)',
      'GET',
      '/api/v1/academic/years',
      { Authorization: `Bearer ${adminToken}` },
      null,
      200,
      (d) => d.success === true && Array.isArray(d.data)
    );

    // 4.2 Batches list (All 5 levels)
    await runTest(
      'ACAD-02',
      'Academic Admin',
      'Admin can list batches (200)',
      'GET',
      '/api/v1/academic/batches',
      { Authorization: `Bearer ${adminToken}` },
      null,
      200,
      (d) => d.success === true && Array.isArray(d.data) && d.data.length >= 5
    );

    // 4.3 Courses catalog
    await runTest(
      'ACAD-03',
      'Academic Admin',
      'Admin can list course catalog (200)',
      'GET',
      '/api/v1/courses',
      { Authorization: `Bearer ${adminToken}` },
      null,
      200,
      (d) => d.success === true && Array.isArray(d.data)
    );

    // 4.4 Course offerings
    await runTest(
      'ACAD-04',
      'Academic Admin',
      'Admin can list course offerings (200)',
      'GET',
      '/api/v1/courses/offerings/list',
      { Authorization: `Bearer ${adminToken}` },
      null,
      200,
      (d) => d.success === true && Array.isArray(d.data)
    );

    // 4.5 Grading schemes
    await runTest(
      'ACAD-05',
      'Academic Admin',
      'Admin can list grading schemes (200)',
      'GET',
      '/api/v1/grading-schemes',
      { Authorization: `Bearer ${adminToken}` },
      null,
      200,
      (d) => (d.success === true || d.status === 'success') && Array.isArray(d.data)
    );

    // 4.6 Grading scheme 100% total rule validation
    await runTest(
      'ACAD-06',
      'Academic Admin',
      'Grading scheme creation rejected when component weights sum to 90% (400)',
      'POST',
      '/api/v1/grading-schemes',
      { Authorization: `Bearer ${adminToken}` },
      {
        name: 'Invalid 90% Scheme',
        description: 'Should fail 100% requirement',
        components: [
          { name: 'Midterm', percentage: 40, defaultMaxScore: 100, type: 'MIDTERM_EXAM' },
          { name: 'Final', percentage: 50, defaultMaxScore: 100, type: 'FINAL_EXAM' },
        ],
      },
      400,
      (d) => (d.success === false || d.status === 'fail') && d.message.includes('100%')
    );

    await runTest(
      'ACAD-07',
      'Academic Admin',
      'Grading scheme creation rejected when component weights sum to 120% (400)',
      'POST',
      '/api/v1/grading-schemes',
      { Authorization: `Bearer ${adminToken}` },
      {
        name: 'Invalid 120% Scheme',
        description: 'Should fail 100% requirement',
        components: [
          { name: 'Midterm', percentage: 50, defaultMaxScore: 100, type: 'MIDTERM_EXAM' },
          { name: 'Final', percentage: 70, defaultMaxScore: 100, type: 'FINAL_EXAM' },
        ],
      },
      400,
      (d) => (d.success === false || d.status === 'fail') && d.message.includes('100%')
    );

    // 4.8 Students list
    await runTest(
      'ACAD-08',
      'Academic Admin',
      'Admin can list registered students (200)',
      'GET',
      '/api/v1/students',
      { Authorization: `Bearer ${adminToken}` },
      null,
      200,
      (d) => d.success === true && (Array.isArray(d.data) || Array.isArray(d.data?.students))
    );

    // 4.9 Teachers list
    await runTest(
      'ACAD-09',
      'Academic Admin',
      'Admin can list registered teachers (200)',
      'GET',
      '/api/v1/teachers',
      { Authorization: `Bearer ${adminToken}` },
      null,
      200,
      (d) => d.success === true && (Array.isArray(d.data) || Array.isArray(d.data?.teachers))
    );

    console.log('--- Phase 5: Teacher Permissions & Self-Approval Guards ---');

    // 5.1 Teacher assigned courses
    await runTest(
      'TCH-01',
      'Teacher',
      'Teacher can access their assigned courses endpoint (200)',
      'GET',
      '/api/v1/grades/teacher/courses',
      { Authorization: `Bearer ${teacherToken}` },
      null,
      200,
      (d) => d.success === true && Array.isArray(d.data)
    );

    // 5.2 Teacher CANNOT approve grade submissions
    await runTest(
      'TCH-02',
      'Teacher',
      'Teacher CANNOT approve grade submissions (Self-approval guard 403)',
      'POST',
      '/api/v1/grades/submissions/sub-sample/approve',
      { Authorization: `Bearer ${teacherToken}` },
      {},
      403,
      (d) => d.success === false
    );

    // 5.3 Teacher CANNOT reject grade submissions
    await runTest(
      'TCH-03',
      'Teacher',
      'Teacher CANNOT reject grade submissions (403)',
      'POST',
      '/api/v1/grades/submissions/sub-sample/reject',
      { Authorization: `Bearer ${teacherToken}` },
      { rejectionReason: 'Reason' },
      403,
      (d) => d.success === false
    );

    // 5.4 Teacher CANNOT publish grades
    await runTest(
      'TCH-04',
      'Teacher',
      'Teacher CANNOT publish grade submissions (403)',
      'POST',
      '/api/v1/grades/submissions/sub-sample/publish',
      { Authorization: `Bearer ${teacherToken}` },
      {},
      403,
      (d) => d.success === false
    );

    // 5.5 Teacher CANNOT set grade submission deadlines
    await runTest(
      'TCH-05',
      'Teacher',
      'Teacher CANNOT modify grade submission deadlines (403)',
      'PUT',
      '/api/v1/grades/offerings/off-1/deadline',
      { Authorization: `Bearer ${teacherToken}` },
      { deadline: '2026-12-31' },
      403,
      (d) => d.success === false
    );

    // 5.6 Teacher CANNOT access student results endpoint
    await runTest(
      'TCH-06',
      'Teacher',
      'Teacher CANNOT access student personal results endpoint (403)',
      'GET',
      '/api/v1/grades/student/my-results',
      { Authorization: `Bearer ${teacherToken}` },
      null,
      403
    );

    // 5.7 Teacher CANNOT create announcements
    await runTest(
      'TCH-07',
      'Teacher',
      'Teacher CANNOT create announcements (403)',
      'POST',
      '/api/v1/announcements',
      { Authorization: `Bearer ${teacherToken}` },
      { title: 'Teacher Notice', content: 'Testing' },
      403
    );

    console.log('--- Phase 6: Student Privacy & Ownership Guards ---');

    // 6.1 Student accesses personal results
    await runTest(
      'STU-01',
      'Student',
      'Student can access their own published results (200)',
      'GET',
      '/api/v1/grades/student/my-results',
      { Authorization: `Bearer ${studentToken}` },
      null,
      200,
      (d) => d.success === true && (Array.isArray(d.data) || Array.isArray(d.data?.results))
    );

    // 6.2 Student accesses own academic history
    const studentDbId = studentRecord?.id || '28943bde-2a84-498e-8aab-e4b27688aaa3';
    await runTest(
      'STU-02',
      'Student',
      'Student can access their own academic history (200)',
      'GET',
      `/api/v1/reports/student-history/${studentDbId}`,
      { Authorization: `Bearer ${studentToken}` },
      null,
      200,
      (d) => d.success === true && d.data?.student?.id === studentDbId
    );

    // 6.3 Student CANNOT access another student's history (Cross-student isolation)
    await runTest(
      'STU-03',
      'Student',
      'Student CANNOT access another student\'s academic history (403)',
      'GET',
      '/api/v1/reports/student-history/other-student-id-999',
      { Authorization: `Bearer ${studentToken}` },
      null,
      403,
      (d) => d.success === false
    );

    // 6.4 Student CANNOT access another student's transcript
    await runTest(
      'STU-04',
      'Student',
      'Student CANNOT access another student\'s transcript (403)',
      'GET',
      '/api/v1/grades/reports/transcript/other-student-id-999',
      { Authorization: `Bearer ${studentToken}` },
      null,
      403,
      (d) => d.success === false
    );

    // 6.5 Student CANNOT access offering grade sheets
    await runTest(
      'STU-05',
      'Student',
      'Student CANNOT access grade sheet of course offerings (403)',
      'GET',
      '/api/v1/grades/offerings/off-1/sheet',
      { Authorization: `Bearer ${studentToken}` },
      null,
      403
    );

    // 6.6 Student CANNOT access grade review list
    await runTest(
      'STU-06',
      'Student',
      'Student CANNOT access grade review submissions list (403)',
      'GET',
      '/api/v1/grades/submissions/review',
      { Authorization: `Bearer ${studentToken}` },
      null,
      403
    );

    // 6.7 Student CANNOT create announcements
    await runTest(
      'STU-07',
      'Student',
      'Student CANNOT create announcements (403)',
      'POST',
      '/api/v1/announcements',
      { Authorization: `Bearer ${studentToken}` },
      { title: 'Student Post', content: 'Unauthorized' },
      403
    );

    console.log('--- Phase 7: Management Read-Only Enforcement ---');

    // 7.1 Management can read academic years
    await runTest(
      'MGMT-01',
      'Management',
      'Management can view academic years (200)',
      'GET',
      '/api/v1/academic/years',
      { Authorization: `Bearer ${mgmtToken}` },
      null,
      200,
      (d) => d.success === true
    );

    // 7.2 Management can read batches
    await runTest(
      'MGMT-02',
      'Management',
      'Management can view batches (200)',
      'GET',
      '/api/v1/academic/batches',
      { Authorization: `Bearer ${mgmtToken}` },
      null,
      200,
      (d) => d.success === true
    );

    // 7.3 Management can view reports
    await runTest(
      'MGMT-03',
      'Management',
      'Management can access students-by-year report (200)',
      'GET',
      '/api/v1/reports/students-by-year',
      { Authorization: `Bearer ${mgmtToken}` },
      null,
      200,
      (d) => d.success === true
    );

    await runTest(
      'MGMT-04',
      'Management',
      'Management can access batch-performance report (200)',
      'GET',
      '/api/v1/reports/batch-performance',
      { Authorization: `Bearer ${mgmtToken}` },
      null,
      200,
      (d) => d.success === true
    );

    // 7.5 Management CANNOT create academic year
    await runTest(
      'MGMT-05',
      'Management',
      'Management CANNOT create academic year (Read-only guard 403)',
      'POST',
      '/api/v1/academic/years',
      { Authorization: `Bearer ${mgmtToken}` },
      { name: '2025 ዓ.ም.', code: 'AY-2025-FAIL', startDate: '2025-09-11', endDate: '2026-07-07' },
      403
    );

    // 7.6 Management CANNOT create batch
    await runTest(
      'MGMT-06',
      'Management',
      'Management CANNOT create batch (Read-only guard 403)',
      'POST',
      '/api/v1/academic/batches',
      { Authorization: `Bearer ${mgmtToken}` },
      { academicYearId: 'ay-1', name: 'Batch X', code: 'B-X', stageLevel: '1' },
      403
    );

    // 7.7 Management CANNOT create course
    await runTest(
      'MGMT-07',
      'Management',
      'Management CANNOT create course (Read-only guard 403)',
      'POST',
      '/api/v1/courses',
      { Authorization: `Bearer ${mgmtToken}` },
      { code: 'CRS-TEST', title: 'Test Course', amharicTitle: 'ሙከራ' },
      403
    );

    // 7.8 Management CANNOT create course offering
    await runTest(
      'MGMT-08',
      'Management',
      'Management CANNOT create course offering (403)',
      'POST',
      '/api/v1/courses/offerings',
      { Authorization: `Bearer ${mgmtToken}` },
      { courseId: 'crs-1', academicYearId: 'ay-1', batchId: 'b-1' },
      403
    );

    // 7.9 Management CANNOT enroll students
    await runTest(
      'MGMT-09',
      'Management',
      'Management CANNOT enroll students (403)',
      'POST',
      '/api/v1/enrollments/individual',
      { Authorization: `Bearer ${mgmtToken}` },
      { studentId: 'stu-1', courseOfferingId: 'off-1' },
      403
    );

    // 7.10 Management CANNOT create grading scheme
    await runTest(
      'MGMT-10',
      'Management',
      'Management CANNOT create grading scheme (403)',
      'POST',
      '/api/v1/grading-schemes',
      { Authorization: `Bearer ${mgmtToken}` },
      { name: 'Test Scheme', components: [] },
      403
    );

    // 7.11 Management CANNOT approve grades
    await runTest(
      'MGMT-11',
      'Management',
      'Management CANNOT approve grade submissions (403)',
      'POST',
      '/api/v1/grades/submissions/sub-1/approve',
      { Authorization: `Bearer ${mgmtToken}` },
      {},
      403
    );

    // 7.12 Management CANNOT publish grades
    await runTest(
      'MGMT-12',
      'Management',
      'Management CANNOT publish grades (403)',
      'POST',
      '/api/v1/grades/submissions/sub-1/publish',
      { Authorization: `Bearer ${mgmtToken}` },
      {},
      403
    );

    // 7.13 Management CANNOT create announcements
    await runTest(
      'MGMT-13',
      'Management',
      'Management CANNOT create announcements (403)',
      'POST',
      '/api/v1/announcements',
      { Authorization: `Bearer ${mgmtToken}` },
      { title: 'Notice', content: 'Notice' },
      403
    );

    console.log('--- Phase 8: Announcement System & Expiration Features ---');

    // 8.1 Admin creates GENERAL announcement (default 30-day expiration)
    let generalAnnId = '';
    await runTest(
      'ANN-01',
      'Announcement',
      'Admin creates GENERAL announcement with automatic 30-day expiration (201)',
      'POST',
      '/api/v1/announcements',
      { Authorization: `Bearer ${adminToken}` },
      {
        title: 'የሰንበት ትምህርት ቤት አጠቃላይ ማስታወቂያ',
        content: 'የአጠቃላይ ማስታወቂያ ዝርዝር ይዘት...',
        category: 'GENERAL',
        targetAudience: 'ALL_USERS',
        priority: 'NORMAL',
      },
      201,
      (d) => {
        if (!d.success || !d.data?.id || d.data?.category !== 'GENERAL') return false;
        generalAnnId = d.data.id;
        const pub = new Date(d.data.publishAt).getTime();
        const exp = new Date(d.data.expiresAt).getTime();
        const diffDays = Math.round((exp - pub) / (24 * 60 * 60 * 1000));
        return diffDays === 30;
      }
    );

    // 8.2 Admin creates EVENT announcement (1 day after eventDate)
    const eventTime = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days from now
    let eventAnnId = '';
    await runTest(
      'ANN-02',
      'Announcement',
      'Admin creates EVENT announcement with automatic 1-day-post-event expiration (201)',
      'POST',
      '/api/v1/announcements',
      { Authorization: `Bearer ${adminToken}` },
      {
        title: 'የዝማሬ በዓል ዝግጅት ማስታወቂያ',
        content: 'የበዓሉ ዝግጅት ማስታወቂያ ዝርዝር...',
        category: 'EVENT',
        eventDate: eventTime.toISOString(),
        targetAudience: 'ALL_USERS',
        priority: 'IMPORTANT',
      },
      201,
      (d) => {
        if (!d.success || !d.data?.id || d.data?.category !== 'EVENT') return false;
        eventAnnId = d.data.id;
        const ev = new Date(d.data.eventDate).getTime();
        const exp = new Date(d.data.expiresAt).getTime();
        const diffDays = Math.round((exp - ev) / (24 * 60 * 60 * 1000));
        return diffDays === 1;
      }
    );

    // 8.3 EVENT announcement creation rejected without eventDate
    await runTest(
      'ANN-03',
      'Announcement',
      'EVENT announcement rejected when eventDate is missing (400)',
      'POST',
      '/api/v1/announcements',
      { Authorization: `Bearer ${adminToken}` },
      {
        title: 'ቀን የሌለው ዝግጅት',
        content: 'ይዘት',
        category: 'EVENT',
        targetAudience: 'ALL_USERS',
      },
      400,
      (d) => d.success === false && d.message.includes('የዝግጅት')
    );

    // 8.4 Admin creates ACADEMIC announcement (90 days after publication)
    await runTest(
      'ANN-04',
      'Announcement',
      'Admin creates ACADEMIC announcement with automatic 90-day expiration (201)',
      'POST',
      '/api/v1/announcements',
      { Authorization: `Bearer ${adminToken}` },
      {
        title: 'የአካዳሚክ ፈተና መርሃ ግብር ማስታወቂያ',
        content: 'የፈተና መርሃ ግብር ዝርዝር...',
        category: 'ACADEMIC',
        targetAudience: 'ALL_USERS',
      },
      201,
      (d) => {
        if (!d.success || !d.data?.id || d.data?.category !== 'ACADEMIC') return false;
        const pub = new Date(d.data.publishAt).getTime();
        const exp = new Date(d.data.expiresAt).getTime();
        const diffDays = Math.round((exp - pub) / (24 * 60 * 60 * 1000));
        return diffDays === 90;
      }
    );

    // 8.5 Admin manual override of expiresAt takes precedence
    const customExpDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days
    await runTest(
      'ANN-05',
      'Announcement',
      'Admin manual expiration override takes precedence over default (201)',
      'POST',
      '/api/v1/announcements',
      { Authorization: `Bearer ${adminToken}` },
      {
        title: 'በአስተዳዳሪው የተወሰነ የማብቂያ ቀን ያለው ማስታወቂያ',
        content: 'ይዘት...',
        category: 'GENERAL',
        expiresAt: customExpDate.toISOString(),
        isManualExpiresAt: true,
        targetAudience: 'ALL_USERS',
      },
      201,
      (d) => {
        if (!d.success || !d.data?.id) return false;
        const exp = new Date(d.data.expiresAt).getTime();
        const diffDays = Math.round((exp - Date.now()) / (24 * 60 * 60 * 1000));
        return diffDays === 15;
      }
    );

    // 8.6 Recipient feed accessible to all authenticated users
    await runTest(
      'ANN-06',
      'Announcement',
      'Recipient feed accessible to authenticated student (200)',
      'GET',
      '/api/v1/announcements/my',
      { Authorization: `Bearer ${studentToken}` },
      null,
      200,
      (d) => d.success === true && Array.isArray(d.data)
    );

    // 8.7 Unread count endpoint accessible to all authenticated users
    await runTest(
      'ANN-07',
      'Announcement',
      'Unread count accessible to authenticated teacher (200)',
      'GET',
      '/api/v1/announcements/unread-count',
      { Authorization: `Bearer ${teacherToken}` },
      null,
      200,
      (d) => d.success === true && typeof d.data.unreadCount === 'number'
    );

    // 8.8 Non-admin roles cannot access Admin announcement management feed
    await runTest(
      'ANN-08',
      'Announcement',
      'Student cannot access Admin announcement management feed (403)',
      'GET',
      '/api/v1/announcements/admin',
      { Authorization: `Bearer ${studentToken}` },
      null,
      403
    );

    await runTest(
      'ANN-09',
      'Announcement',
      'Teacher cannot access Admin announcement management feed (403)',
      'GET',
      '/api/v1/announcements/admin',
      { Authorization: `Bearer ${teacherToken}` },
      null,
      403
    );

    await runTest(
      'ANN-10',
      'Announcement',
      'Management cannot access Admin announcement management feed (403)',
      'GET',
      '/api/v1/announcements/admin',
      { Authorization: `Bearer ${mgmtToken}` },
      null,
      403
    );

    // 8.11 Public sync-schedule rejected without authentication
    await runTest(
      'ANN-11',
      'Announcement',
      'Public sync-schedule rejected without authorization header (401)',
      'GET',
      '/api/v1/announcements/sync-schedule',
      {},
      null,
      401
    );

    // 8.12 Public sync-schedule rejected for non-admin
    await runTest(
      'ANN-12',
      'Announcement',
      'Public sync-schedule rejected with Student token (403)',
      'GET',
      '/api/v1/announcements/sync-schedule',
      { Authorization: `Bearer ${studentToken}` },
      null,
      403
    );

    // 8.13 Public sync-schedule succeeds with Admin token
    await runTest(
      'ANN-13',
      'Announcement',
      'Public sync-schedule succeeds with Admin token (200)',
      'GET',
      '/api/v1/announcements/sync-schedule',
      { Authorization: `Bearer ${adminToken}` },
      null,
      200,
      (d) => d.success === true
    );

  } finally {
    server.close();
    await prisma.$disconnect();
  }

  // Summary Report
  console.log('\n========================================================================');
  console.log('📊 LIVE API FUNCTIONALITY & SECURITY TEST SUMMARY');
  console.log('========================================================================\n');

  const passed = results.filter((r) => r.status === 'PASS');
  const failed = results.filter((r) => r.status === 'FAIL');

  console.log(`Total Scenarios Tested : ${results.length}`);
  console.log(`✅ Passed Scenarios    : ${passed.length}`);
  console.log(`❌ Failed Scenarios    : ${failed.length}\n`);

  results.forEach((r) => {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    console.log(
      `${icon} [${r.id}] ${r.category.padEnd(20)} | ${r.method.padEnd(5)} ${r.path.padEnd(46)} | Exp:${r.expectedStatus} Act:${r.actualStatus} (${r.durationMs}ms)`
    );
    if (r.details) {
      console.log(`   └─ Details: ${r.details}`);
    }
  });

  if (failed.length > 0) {
    console.log(`\n❌ TEST SUITE FAILED with ${failed.length} failure(s).`);
    process.exit(1);
  } else {
    console.log('\n🎉 ALL 70 LIVE API FUNCTIONALITY & SECURITY TESTS PASSED SUCCESSFULLY!');
  }
}

main().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
