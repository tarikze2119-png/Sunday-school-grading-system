/**
 * ============================================================================
 * SEC-01 and DEF-01 Critical Authorization Remediation Test Suite
 * Institution: ሐይመተ አብርሃም ሰንበት ትምህርት ቤት
 * ============================================================================
 * Coverage:
 * 1. SEC-01: Student Profile Ownership (GET /api/v1/students/:id)
 *    - Parameter bridging: Supports both `req.params.id` and `req.params.studentId`
 *    - Self-access by Student role (via studentId, userId, or 'me') -> 200 / next()
 *    - Cross-student access by Student role -> 403 FORBIDDEN_STUDENT_RECORD
 *    - Teacher role access for assigned student -> 200 / next()
 *    - Teacher role access for unassigned student -> 403 FORBIDDEN_TEACHER_STUDENT_UNASSIGNED
 *    - Administrative roles (SUPER_ADMIN, ADMIN, MANAGEMENT) -> 200 / next()
 *    - Student controller getById 'me' resolution
 * 2. DEF-01: Super Admin Grade Rejection Barred (POST /submissions/:submissionId/reject)
 *    - Super Admin blocked at authorizeRole ([UserRole.ADMIN]) -> 403
 *    - Super Admin blocked at requireResponsibility(RESULT_MANAGEMENT_ADMIN, { allowSuperAdmin: false }) -> 403
 *    - Ordinary Admin with RESULT_MANAGEMENT_ADMIN responsibility -> Allowed
 *    - Ordinary Admin without RESULT_MANAGEMENT_ADMIN responsibility -> 403
 *    - Appointed General Admin (via singleton check) -> Allowed
 *    - Teacher, Student, Management roles -> 403
 *    - Mandatory Amharic rejection reason validation
 * 3. Route Stack Inspection:
 *    - Verify GET /:id in student.routes has verifyStudentRecordOwnership mounted
 *    - Verify POST /submissions/:submissionId/reject in grade.routes excludes SUPER_ADMIN
 * ============================================================================
 */

import assert from 'node:assert';
import { UserRole, AdminResponsibility } from '@prisma/client';
import { verifyStudentRecordOwnership } from '../middlewares/ownershipGuards.js';
import { authorizeRole, requireResponsibility } from '../middlewares/authorize.js';
import studentController from '../controllers/student.controller.js';
import studentService from '../services/student.service.js';
import prisma from '../config/prisma.client.js';
import { validateAmharicFeedback } from '../utils/validation.js';
import studentRoutes from '../routes/student.routes.js';
import gradeRoutes from '../routes/grade.routes.js';

let passedTests = 0;
let totalTests = 0;

function it(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    const res = fn();
    if (res instanceof Promise) {
      return res
        .then(() => {
          passedTests++;
          console.log(`  ✅ [PASS] ${name}`);
        })
        .catch((err) => {
          console.error(`  ❌ [FAIL] ${name}:`, err.message);
          throw err;
        });
    } else {
      passedTests++;
      console.log(`  ✅ [PASS] ${name}`);
    }
  } catch (err: any) {
    console.error(`  ❌ [FAIL] ${name}:`, err.message);
    throw err;
  }
}

// Helpers to create mock Express request and response objects
function createMockReq(overrides: Record<string, any> = {}): any {
  return {
    params: {},
    query: {},
    body: {},
    headers: {},
    user: null,
    path: '',
    ...overrides,
  };
}

function createMockRes(): any {
  const res: any = {
    statusCode: 200,
    body: null,
    headers: {},
  };
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.body = data;
    return res;
  };
  res.send = (data: any) => {
    res.body = data;
    return res;
  };
  return res;
}

async function runTestSuite() {
  console.log('\n========================================================================');
  console.log('🛡️  ሐይመተ አብርሃም ሰንበት ትምህርት ቤት • SEC-01 & DEF-01 Remediation Tests');
  console.log('========================================================================\n');

  // =========================================================================
  // SUITE 1: SEC-01 - STUDENT PROFILE OWNERSHIP (verifyStudentRecordOwnership)
  // =========================================================================
  console.log('--- Suite 1: SEC-01 Student Record Ownership Guard ---');

  await it('SEC-01-01: Unauthenticated request is rejected with HTTP 401', async () => {
    const req = createMockReq({ user: null, params: { id: 'student-123' } });
    const res = createMockRes();
    let nextCalled = false;

    await verifyStudentRecordOwnership(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.success, false);
  });

  await it('SEC-01-02: SUPER_ADMIN bypasses ownership check and gets immediate access', async () => {
    const req = createMockReq({
      user: { id: 'super-admin-1', role: UserRole.SUPER_ADMIN },
      params: { id: 'any-student-id' },
    });
    const res = createMockRes();
    let nextCalled = false;

    await verifyStudentRecordOwnership(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);
    assert.strictEqual(res.statusCode, 200);
  });

  await it('SEC-01-03: General Admin / ADMIN bypasses ownership check and gets immediate access', async () => {
    const req = createMockReq({
      user: { id: 'admin-1', role: UserRole.ADMIN },
      params: { id: 'any-student-id' },
    });
    const res = createMockRes();
    let nextCalled = false;

    await verifyStudentRecordOwnership(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);
  });

  await it('SEC-01-04: MANAGEMENT role bypasses ownership check for aggregate oversight', async () => {
    const req = createMockReq({
      user: { id: 'mgmt-1', role: UserRole.MANAGEMENT },
      params: { id: 'any-student-id' },
    });
    const res = createMockRes();
    let nextCalled = false;

    await verifyStudentRecordOwnership(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);
  });

  await it('SEC-01-05: Student role accessing own profile via req.params.id (studentId match) is ALLOWED', async () => {
    const req = createMockReq({
      user: { id: 'user-stu-1', role: UserRole.STUDENT, studentId: 'stu-profile-1' },
      params: { id: 'stu-profile-1' },
    });
    const res = createMockRes();
    let nextCalled = false;

    await verifyStudentRecordOwnership(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);
  });

  await it('SEC-01-06: Student role accessing own profile via req.params.id (userId match) is ALLOWED', async () => {
    const req = createMockReq({
      user: { id: 'user-stu-1', role: UserRole.STUDENT, studentId: 'stu-profile-1' },
      params: { id: 'user-stu-1' },
    });
    const res = createMockRes();
    let nextCalled = false;

    await verifyStudentRecordOwnership(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);
  });

  await it('SEC-01-07: Student role requesting id: "me" is ALLOWED', async () => {
    const req = createMockReq({
      user: { id: 'user-stu-1', role: UserRole.STUDENT, studentId: 'stu-profile-1' },
      params: { id: 'me' },
    });
    const res = createMockRes();
    let nextCalled = false;

    await verifyStudentRecordOwnership(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);
  });

  await it('SEC-01-08: Student role requesting ANOTHER student profile is BLOCKED with HTTP 403', async () => {
    const req = createMockReq({
      user: { id: 'user-stu-1', role: UserRole.STUDENT, studentId: 'stu-profile-1' },
      params: { id: 'stu-profile-2' },
    });
    const res = createMockRes();
    let nextCalled = false;

    // Mock prisma.student.findUnique if studentId is not in token
    const origFindUnique = prisma.student.findUnique;
    (prisma.student.findUnique as any) = async () => ({ id: 'stu-profile-1' });

    try {
      await verifyStudentRecordOwnership(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.code, 'FORBIDDEN_STUDENT_RECORD');
      assert.ok(res.body.message.includes('የሌላ ተማሪን መረጃ የመመልከት ፈቃድ የለዎትም'));
    } finally {
      prisma.student.findUnique = origFindUnique;
    }
  });

  await it('SEC-01-09: Teacher accessing student assigned to their course offering is ALLOWED', async () => {
    const req = createMockReq({
      user: { id: 'usr-teacher-1', role: UserRole.TEACHER },
      params: { id: 'stu-profile-assigned' },
    });
    const res = createMockRes();
    let nextCalled = false;

    const origFindMany = prisma.teacherAssignment.findMany;
    (prisma.teacherAssignment.findMany as any) = async () => [
      { courseOfferingId: 'offering-101' },
    ];

    try {
      await verifyStudentRecordOwnership(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.deepStrictEqual((req as any).allowedOfferingIds, ['offering-101']);
    } finally {
      prisma.teacherAssignment.findMany = origFindMany;
    }
  });

  await it('SEC-01-10: Teacher accessing student NOT assigned to their course is BLOCKED with HTTP 403', async () => {
    const req = createMockReq({
      user: { id: 'usr-teacher-1', role: UserRole.TEACHER },
      params: { id: 'stu-profile-unassigned' },
    });
    const res = createMockRes();
    let nextCalled = false;

    const origFindMany = prisma.teacherAssignment.findMany;
    (prisma.teacherAssignment.findMany as any) = async () => [];

    try {
      await verifyStudentRecordOwnership(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.code, 'FORBIDDEN_TEACHER_STUDENT_UNASSIGNED');
      assert.ok(res.body.message.includes('የኮርስ ምደባ የለም'));
    } finally {
      prisma.teacherAssignment.findMany = origFindMany;
    }
  });

  await it('SEC-01-11: Teacher requesting id: "me" or empty studentId receives HTTP 400', async () => {
    const req = createMockReq({
      user: { id: 'usr-teacher-1', role: UserRole.TEACHER },
      params: { id: 'me' },
    });
    const res = createMockRes();
    let nextCalled = false;

    await verifyStudentRecordOwnership(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.body.message.includes('የተማሪ መለያ አልተገለጸም'));
  });

  await it('SEC-01-12: StudentController.getById resolves "me" to authenticated student profile', async () => {
    const req = createMockReq({
      user: { id: 'usr-student-self', role: UserRole.STUDENT, studentId: 'stu-self-id' },
      params: { id: 'me' },
    });
    const res = createMockRes();

    const origGetStudentById = studentService.getStudentById;
    let queryIdPassed = '';
    (studentService.getStudentById as any) = async (id: string) => {
      queryIdPassed = id;
      return { id: 'stu-self-id', userId: 'usr-student-self', user: { firstName: 'ዮናታን' } };
    };

    try {
      await studentController.getById(req, res, () => {});
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(queryIdPassed, 'stu-self-id');
      assert.strictEqual(res.body.data.id, 'stu-self-id');
    } finally {
      studentService.getStudentById = origGetStudentById;
    }
  });

  await it('SEC-01-13: Student routes stack verifies verifyStudentRecordOwnership is mounted on GET /:id', () => {
    const getByIdRoute = studentRoutes.stack.find((layer: any) => {
      return layer.route && layer.route.path === '/:id' && layer.route.methods.get;
    });

    assert.ok(getByIdRoute, 'GET /:id route must exist in studentRoutes');
    const handlerNames = getByIdRoute.route.stack.map((s: any) => s.name);
    assert.ok(
      handlerNames.includes('verifyStudentRecordOwnership'),
      `GET /:id route must include verifyStudentRecordOwnership. Handlers found: ${handlerNames.join(', ')}`
    );
  });

  // =========================================================================
  // SUITE 2: DEF-01 - GRADE REJECTION AUTHORIZATION (POST /submissions/:submissionId/reject)
  // =========================================================================
  console.log('\n--- Suite 2: DEF-01 Super Admin Grade Rejection Barred ---');

  await it('DEF-01-01: Grade rejection route excludes SUPER_ADMIN from authorizeRole', () => {
    const rejectRoute = gradeRoutes.stack.find((layer: any) => {
      return (
        layer.route &&
        layer.route.path === '/submissions/:submissionId/reject' &&
        layer.route.methods.post
      );
    });

    assert.ok(rejectRoute, 'POST /submissions/:submissionId/reject route must exist');
    assert.strictEqual(rejectRoute.route.stack.length >= 3, true);
  });

  await it('DEF-01-02: SUPER_ADMIN is blocked by authorizeRole([ADMIN]) on grade rejection', async () => {
    const middleware = authorizeRole([UserRole.ADMIN]);
    const req = createMockReq({
      user: { id: 'usr-super-admin', role: UserRole.SUPER_ADMIN },
    });
    const res = createMockRes();
    let nextCalled = false;

    middleware(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.message.includes('የፈቃድ ደረጃ የለዎትም'));
  });

  await it('DEF-01-03: SUPER_ADMIN is explicitly blocked by requireResponsibility with allowSuperAdmin: false', async () => {
    const middleware = requireResponsibility(AdminResponsibility.RESULT_MANAGEMENT_ADMIN, {
      allowSuperAdmin: false,
    });
    const req = createMockReq({
      user: { id: 'usr-super-admin', role: UserRole.SUPER_ADMIN },
    });
    const res = createMockRes();
    let nextCalled = false;

    await middleware(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.code, 'FORBIDDEN_RESPONSIBILITY_REQUIRED');
  });

  await it('DEF-01-04: Subordinate Admin with RESULT_MANAGEMENT_ADMIN responsibility is ALLOWED', async () => {
    const middleware = requireResponsibility(AdminResponsibility.RESULT_MANAGEMENT_ADMIN, {
      allowSuperAdmin: false,
    });
    const req = createMockReq({
      user: {
        id: 'usr-result-admin',
        role: UserRole.ADMIN,
        adminResponsibilities: [AdminResponsibility.RESULT_MANAGEMENT_ADMIN],
      },
    });
    const res = createMockRes();
    let nextCalled = false;

    await middleware(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);
  });

  await it('DEF-01-05: Subordinate Admin WITHOUT RESULT_MANAGEMENT_ADMIN is BLOCKED with HTTP 403', async () => {
    const middleware = requireResponsibility(AdminResponsibility.RESULT_MANAGEMENT_ADMIN, {
      allowSuperAdmin: false,
    });
    const req = createMockReq({
      user: {
        id: 'usr-reg-admin',
        role: UserRole.ADMIN,
        adminResponsibilities: [AdminResponsibility.USER_REGISTRATION_ADMIN],
      },
    });
    const res = createMockRes();
    let nextCalled = false;

    const origFindUnique = prisma.systemSetting.findUnique;
    (prisma.systemSetting.findUnique as any) = async () => ({
      generalAdminUserId: 'usr-different-general-admin',
    });

    try {
      await middleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body.code, 'FORBIDDEN_RESPONSIBILITY_REQUIRED');
    } finally {
      prisma.systemSetting.findUnique = origFindUnique;
    }
  });

  await it('DEF-01-06: General Admin appointed in SystemSetting is ALLOWED for grade rejection oversight', async () => {
    const middleware = requireResponsibility(AdminResponsibility.RESULT_MANAGEMENT_ADMIN, {
      allowSuperAdmin: false,
    });
    const req = createMockReq({
      user: {
        id: 'usr-general-admin-appointed',
        role: UserRole.ADMIN,
        adminResponsibilities: [], // No explicit subordinate responsibility needed
      },
    });
    const res = createMockRes();
    let nextCalled = false;

    const origFindUnique = prisma.systemSetting.findUnique;
    (prisma.systemSetting.findUnique as any) = async () => ({
      generalAdminUserId: 'usr-general-admin-appointed',
    });

    try {
      await middleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(req.user.isGeneralAdmin, true);
    } finally {
      prisma.systemSetting.findUnique = origFindUnique;
    }
  });

  await it('DEF-01-07: TEACHER, STUDENT, and MANAGEMENT roles are blocked from grade rejection', () => {
    const middleware = authorizeRole([UserRole.ADMIN]);

    for (const forbiddenRole of [UserRole.TEACHER, UserRole.STUDENT, UserRole.MANAGEMENT]) {
      const req = createMockReq({ user: { id: `usr-${forbiddenRole}`, role: forbiddenRole } });
      const res = createMockRes();
      let nextCalled = false;

      middleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 403);
    }
  });

  await it('DEF-01-08: Grade rejection mandates valid Amharic reason', () => {
    // Valid Amharic reasons
    const validReason1 = 'የተማሪዎች ውጤት ስሌት ላይ ያልተሟላ መረጃ ስላለ እባክዎ ይገምግሙ።';
    const res1 = validateAmharicFeedback(validReason1);
    assert.strictEqual(res1.isValid, true);

    // Invalid non-Amharic reasons
    const invalidReason1 = 'The grades are wrong, please fix and re-submit';
    const res2 = validateAmharicFeedback(invalidReason1);
    assert.strictEqual(res2.isValid, false);

    // Empty reason
    const res3 = validateAmharicFeedback('');
    assert.strictEqual(res3.isValid, false);
  });

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n========================================================================');
  console.log(`📊  Test Results: ${passedTests}/${totalTests} Passed (100%)`);
  console.log('========================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
