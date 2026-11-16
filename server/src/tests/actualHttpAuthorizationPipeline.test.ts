/**
 * ============================================================================
 * Phase 5.1 — Actual HTTP Authorization Pipeline Verification Test Suite
 * Institution: ሐይመተ አብርሃም ሰንበት ትምህርት ቤት
 * ============================================================================
 * Test Quality Classification:
 * - COMPLETE HTTP INTEGRATION TEST: Spins up the real Express application
 *   (Helmet, CORS, JSON body parsers, cookie parser, router, authenticateJwt,
 *   authorizeRole, requireResponsibility, verifyStudentRecordOwnership,
 *   controllers, services, and centralized error handler) listening on an
 *   ephemeral localhost TCP port (127.0.0.1:0).
 * - Real HTTP requests are dispatched over native TCP sockets using `fetch()`.
 * - Zero database mutations: Prisma read queries are mocked in-memory with
 *   synthetic institutional identities, ensuring 100% READ-ONLY operation
 *   without altering database state or triggering missing migration errors.
 * ============================================================================
 */

import http from 'node:http';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import { UserRole, AdminResponsibility } from '@prisma/client';
import app from '../app.js';
import prisma from '../config/prisma.client.js';
import { ENV } from '../config/env.config.js';

let passedTests = 0;
let totalTests = 0;

function it(name: string, fn: () => Promise<void>) {
  totalTests++;
  return fn()
    .then(() => {
      passedTests++;
      console.log(`  ✅ [PASS] ${name}`);
    })
    .catch((err) => {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
      throw err;
    });
}

// ============================================================================
// SYNTHETIC TEST IDENTITIES (Non-Production / Synthetic Names Only)
// ============================================================================
const SYN_IDENTITIES = {
  studentA: {
    userId: 'syn-usr-student-a-uuid',
    studentId: 'syn-stu-profile-a-uuid',
    username: 'student_almaz',
    firstName: 'አልማዝ',
    lastName: 'ተፈራ',
    role: UserRole.STUDENT,
    tokenVersion: 1,
    isActive: true,
    isDeleted: false,
    adminResponsibilities: [],
  },
  studentB: {
    userId: 'syn-usr-student-b-uuid',
    studentId: 'syn-stu-profile-b-uuid',
    username: 'student_bereket',
    firstName: 'በረከት',
    lastName: 'ኃይሉ',
    role: UserRole.STUDENT,
    tokenVersion: 1,
    isActive: true,
    isDeleted: false,
    adminResponsibilities: [],
  },
  teacherAssigned: {
    userId: 'syn-usr-teacher-assigned-uuid',
    teacherId: 'syn-tch-profile-assigned-uuid',
    username: 'teacher_tewodros',
    firstName: 'ቴዎድሮስ',
    lastName: 'ካሳ',
    role: UserRole.TEACHER,
    tokenVersion: 1,
    isActive: true,
    isDeleted: false,
    adminResponsibilities: [],
  },
  teacherUnassigned: {
    userId: 'syn-usr-teacher-unassigned-uuid',
    teacherId: 'syn-tch-profile-unassigned-uuid',
    username: 'teacher_yohannes',
    firstName: 'ዮሐንስ',
    lastName: 'መላኩ',
    role: UserRole.TEACHER,
    tokenVersion: 1,
    isActive: true,
    isDeleted: false,
    adminResponsibilities: [],
  },
  generalAdmin: {
    userId: 'syn-usr-general-admin-uuid',
    username: 'genadmin_samuel',
    firstName: 'ሳሙኤል',
    lastName: 'ወልደማርያም',
    role: UserRole.ADMIN,
    tokenVersion: 1,
    isActive: true,
    isDeleted: false,
    adminResponsibilities: [], // Exercises singleton General Admin oversight check
  },
  superAdmin: {
    userId: 'syn-usr-super-admin-uuid',
    username: 'superadmin_girum',
    firstName: 'ግሩም',
    lastName: 'ታደሰ',
    role: UserRole.SUPER_ADMIN,
    tokenVersion: 1,
    isActive: true,
    isDeleted: false,
    adminResponsibilities: [],
  },
  resultAdmin: {
    userId: 'syn-usr-result-admin-uuid',
    username: 'resultadmin_dawit',
    firstName: 'ዳዊት',
    lastName: 'ዘውዴ',
    role: UserRole.ADMIN,
    tokenVersion: 1,
    isActive: true,
    isDeleted: false,
    adminResponsibilities: [AdminResponsibility.RESULT_MANAGEMENT_ADMIN],
  },
  registrationAdmin: {
    userId: 'syn-usr-reg-admin-uuid',
    username: 'regadmin_mulugeta',
    firstName: 'ሙሉጌታ',
    lastName: 'ከበደ',
    role: UserRole.ADMIN,
    tokenVersion: 1,
    isActive: true,
    isDeleted: false,
    adminResponsibilities: [AdminResponsibility.USER_REGISTRATION_ADMIN],
  },
  management: {
    userId: 'syn-usr-management-uuid',
    username: 'mgmt_kibreab',
    firstName: 'ክብረአብ',
    lastName: 'ተክለ',
    role: UserRole.MANAGEMENT,
    tokenVersion: 1,
    isActive: true,
    isDeleted: false,
    adminResponsibilities: [],
  },
};

// Generate authentic JWT signed with ENV.JWT_ACCESS_SECRET
function generateToken(identity: any): string {
  const payload = {
    userId: identity.userId,
    username: identity.username,
    role: identity.role,
    firstName: identity.firstName,
    lastName: identity.lastName,
    studentId: identity.studentId,
    teacherId: identity.teacherId,
    tokenVersion: identity.tokenVersion,
  };
  return jwt.sign(payload, ENV.JWT_ACCESS_SECRET, { expiresIn: '1h' });
}

// Synthetic student profiles for studentService.getStudentById
const SYNTHETIC_STUDENT_PROFILES: Record<string, any> = {
  [SYN_IDENTITIES.studentA.studentId]: {
    id: SYN_IDENTITIES.studentA.studentId,
    userId: SYN_IDENTITIES.studentA.userId,
    admissionNumber: 'STU/2016/001',
    user: {
      id: SYN_IDENTITIES.studentA.userId,
      username: SYN_IDENTITIES.studentA.username,
      firstName: SYN_IDENTITIES.studentA.firstName,
      lastName: SYN_IDENTITIES.studentA.lastName,
      isActive: true,
    },
    academicYear: { id: 'ay-2016', name: '2016 ዓ.ም', code: 'AY2016' },
    batch: { id: 'b-01', name: 'የመጀመሪያ ዓመት - ሀ', stageLevel: 1 },
    registrations: [],
    enrollments: [
      {
        id: 'enr-01',
        courseOfferingId: 'offering-bible-101',
        courseOffering: {
          id: 'offering-bible-101',
          course: { id: 'c-01', code: 'BIB101', title: 'የመጽሐፍ ቅዱስ ጥናት' },
        },
      },
    ],
  },
  [SYN_IDENTITIES.studentB.studentId]: {
    id: SYN_IDENTITIES.studentB.studentId,
    userId: SYN_IDENTITIES.studentB.userId,
    admissionNumber: 'STU/2016/002',
    user: {
      id: SYN_IDENTITIES.studentB.userId,
      username: SYN_IDENTITIES.studentB.username,
      firstName: SYN_IDENTITIES.studentB.firstName,
      lastName: SYN_IDENTITIES.studentB.lastName,
      isActive: true,
    },
    academicYear: { id: 'ay-2016', name: '2016 ዓ.ም', code: 'AY2016' },
    batch: { id: 'b-01', name: 'የመጀመሪያ ዓመት - ሀ', stageLevel: 1 },
    registrations: [],
    enrollments: [],
  },
};

async function runActualHttpPipelineTests() {
  console.log('\n========================================================================');
  console.log('🌐  ሐይመተ አብርሃም ሰንበት ትምህርት ቤት • Actual Express HTTP Pipeline Verification');
  console.log('========================================================================\n');

  // 1. Start real Express app on ephemeral port
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`📡 Real Express HTTP server listening at: ${baseUrl}\n`);

  // Preserve original Prisma client methods
  const origFindUniqueUser = prisma.user.findUnique;
  const origFindUniqueSetting = prisma.systemSetting.findUnique;
  const origFindUniqueStudent = prisma.student.findUnique;
  const origFindFirstStudent = prisma.student.findFirst;
  const origFindManyTeacherAssignment = prisma.teacherAssignment.findMany;
  const origFindUniqueSubmission = prisma.gradeSubmission.findUnique;
  const origTransaction = prisma.$transaction;
  const origAuditLog = (prisma as any).auditLog;

  // Intercept Prisma queries with synthetic identities
  (prisma.user.findUnique as any) = async (args: any) => {
    const userId = args.where.id;
    for (const key of Object.keys(SYN_IDENTITIES)) {
      const idObj = (SYN_IDENTITIES as any)[key];
      if (idObj.userId === userId) {
        return {
          id: idObj.userId,
          username: idObj.username,
          email: `${idObj.username}@example.com`,
          role: idObj.role,
          firstName: idObj.firstName,
          lastName: idObj.lastName,
          isActive: idObj.isActive,
          isDeleted: idObj.isDeleted,
          tokenVersion: idObj.tokenVersion,
          adminResponsibilities: idObj.adminResponsibilities,
        };
      }
    }
    return null;
  };

  (prisma.systemSetting.findUnique as any) = async (args: any) => {
    if (args.where.id === 'SYSTEM_DEFAULT') {
      return {
        id: 'SYSTEM_DEFAULT',
        generalAdminUserId: SYN_IDENTITIES.generalAdmin.userId,
      };
    }
    return null;
  };

  (prisma.student.findUnique as any) = async (args: any) => {
    const userId = args.where.userId;
    if (userId === SYN_IDENTITIES.studentA.userId) {
      return { id: SYN_IDENTITIES.studentA.studentId };
    }
    if (userId === SYN_IDENTITIES.studentB.userId) {
      return { id: SYN_IDENTITIES.studentB.studentId };
    }
    return null;
  };

  (prisma.student.findFirst as any) = async (args: any) => {
    const orConditions = args.where?.OR || [];
    for (const cond of orConditions) {
      if (cond.id === SYN_IDENTITIES.studentA.studentId || cond.userId === SYN_IDENTITIES.studentA.userId) {
        return SYNTHETIC_STUDENT_PROFILES[SYN_IDENTITIES.studentA.studentId];
      }
      if (cond.id === SYN_IDENTITIES.studentB.studentId || cond.userId === SYN_IDENTITIES.studentB.userId) {
        return SYNTHETIC_STUDENT_PROFILES[SYN_IDENTITIES.studentB.studentId];
      }
    }
    return null;
  };

  (prisma.teacherAssignment.findMany as any) = async (args: any) => {
    const teacherUserId = args.where?.teacher?.userId;
    const requestedStudentId = args.where?.courseOffering?.enrollments?.some?.OR?.[0]?.studentId ||
      args.where?.courseOffering?.enrollments?.some?.studentId;

    if (
      teacherUserId === SYN_IDENTITIES.teacherAssigned.userId &&
      (requestedStudentId === SYN_IDENTITIES.studentA.studentId || requestedStudentId === SYN_IDENTITIES.studentA.userId)
    ) {
      return [{ courseOfferingId: 'offering-bible-101' }];
    }
    return [];
  };

  (prisma.gradeSubmission.findUnique as any) = async (args: any) => {
    if (args.where.id === 'sub-101') {
      return {
        id: 'sub-101',
        courseOfferingId: 'offering-bible-101',
        submittedById: SYN_IDENTITIES.teacherAssigned.userId,
        status: 'SUBMITTED',
        courseOffering: { id: 'offering-bible-101' },
      };
    }
    return null;
  };

  (prisma.$transaction as any) = async (callback: any) => {
    const txMock = {
      gradeSubmission: {
        update: async () => ({ id: 'sub-101', status: 'REJECTED' }),
      },
      gradeApproval: {
        create: async () => ({ id: 'appr-101' }),
      },
      courseOffering: {
        update: async () => ({ id: 'offering-bible-101', isSubmissionOpen: true }),
      },
      notification: {
        create: async () => ({ id: 'notif-101' }),
      },
      systemSetting: {
        findUnique: async () => ({ generalAdminUserId: SYN_IDENTITIES.generalAdmin.userId }),
      },
      auditLog: {
        create: async () => ({ id: 'audit-01' }),
      },
    };
    return callback(txMock);
  };

  Object.defineProperty(prisma, 'auditLog', {
    value: { create: async () => ({ id: 'audit-01' }) },
    configurable: true,
  });

  try {
    // =========================================================================
    // SECTION 1: VERIFY STUDENT PROFILE HTTP ACCESS (GET /api/v1/students/:id)
    // =========================================================================
    console.log('--- Section 1: Student Profile HTTP Access (GET /api/v1/students/:id) ---');

    await it('HTTP-STU-01: Unauthenticated request is rejected with HTTP 401', async () => {
      const response = await fetch(`${baseUrl}/api/v1/students/${SYN_IDENTITIES.studentA.studentId}`);
      const body = await response.json();

      assert.strictEqual(response.status, 401);
      assert.strictEqual(body.success, false);
      assert.ok(body.message.includes('ይግቡ'));
    });

    await it('HTTP-STU-02: Student A requests their own profile via Student ID -> HTTP 200', async () => {
      const token = generateToken(SYN_IDENTITIES.studentA);
      const response = await fetch(
        `${baseUrl}/api/v1/students/${SYN_IDENTITIES.studentA.studentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const body = await response.json();

      assert.strictEqual(response.status, 200);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.id, SYN_IDENTITIES.studentA.studentId);
      assert.strictEqual(body.data.user.firstName, 'አልማዝ');
    });

    await it('HTTP-STU-03: Student A requests their own profile via User ID -> HTTP 200', async () => {
      const token = generateToken(SYN_IDENTITIES.studentA);
      const response = await fetch(
        `${baseUrl}/api/v1/students/${SYN_IDENTITIES.studentA.userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const body = await response.json();

      assert.strictEqual(response.status, 200);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.id, SYN_IDENTITIES.studentA.studentId);
    });

    await it('HTTP-STU-04: Student A requests /students/me resolves to own profile -> HTTP 200', async () => {
      const token = generateToken(SYN_IDENTITIES.studentA);
      const response = await fetch(
        `${baseUrl}/api/v1/students/me`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const body = await response.json();

      assert.strictEqual(response.status, 200);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.id, SYN_IDENTITIES.studentA.studentId);
      assert.strictEqual(body.data.user.firstName, 'አልማዝ');
    });

    await it('HTTP-STU-05: Student A requests Student B profile via Student ID -> HTTP 403', async () => {
      const token = generateToken(SYN_IDENTITIES.studentA);
      const response = await fetch(
        `${baseUrl}/api/v1/students/${SYN_IDENTITIES.studentB.studentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const body = await response.json();

      assert.strictEqual(response.status, 403);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.code, 'FORBIDDEN_STUDENT_RECORD');
      assert.ok(body.message.includes('የሌላ ተማሪን መረጃ የመመልከት ፈቃድ የለዎትም'));
    });

    await it('HTTP-STU-06: Student A requests Student B profile via User ID -> HTTP 403', async () => {
      const token = generateToken(SYN_IDENTITIES.studentA);
      const response = await fetch(
        `${baseUrl}/api/v1/students/${SYN_IDENTITIES.studentB.userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const body = await response.json();

      assert.strictEqual(response.status, 403);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.code, 'FORBIDDEN_STUDENT_RECORD');
      assert.ok(body.message.includes('የሌላ ተማሪን መረጃ የመመልከት ፈቃድ የለዎትም'));
    });

    await it('HTTP-STU-07: Assigned Teacher requests enrolled Student A -> HTTP 200', async () => {
      const token = generateToken(SYN_IDENTITIES.teacherAssigned);
      const response = await fetch(
        `${baseUrl}/api/v1/students/${SYN_IDENTITIES.studentA.studentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const body = await response.json();

      assert.strictEqual(response.status, 200);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.id, SYN_IDENTITIES.studentA.studentId);
    });

    await it('HTTP-STU-08: Teacher requests unassigned Student B -> HTTP 403', async () => {
      const token = generateToken(SYN_IDENTITIES.teacherAssigned);
      const response = await fetch(
        `${baseUrl}/api/v1/students/${SYN_IDENTITIES.studentB.studentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const body = await response.json();

      assert.strictEqual(response.status, 403);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.code, 'FORBIDDEN_TEACHER_STUDENT_UNASSIGNED');
      assert.ok(body.message.includes('የኮርስ ምደባ የለም'));
    });

    await it('HTTP-STU-09: Teacher requests /students/me -> HTTP 400 (Student ID required)', async () => {
      const token = generateToken(SYN_IDENTITIES.teacherAssigned);
      const response = await fetch(
        `${baseUrl}/api/v1/students/me`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const body = await response.json();

      assert.strictEqual(response.status, 400);
      assert.strictEqual(body.success, false);
      assert.ok(body.message.includes('የተማሪ መለያ አልተገለጸም'));
    });

    await it('HTTP-STU-10: General Admin requests student profile -> HTTP 200', async () => {
      const token = generateToken(SYN_IDENTITIES.generalAdmin);
      const response = await fetch(
        `${baseUrl}/api/v1/students/${SYN_IDENTITIES.studentA.studentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const body = await response.json();

      assert.strictEqual(response.status, 200);
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.id, SYN_IDENTITIES.studentA.studentId);
    });

    await it('HTTP-STU-11: Super Admin requests student profile -> HTTP 200', async () => {
      const token = generateToken(SYN_IDENTITIES.superAdmin);
      const response = await fetch(
        `${baseUrl}/api/v1/students/${SYN_IDENTITIES.studentA.studentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const body = await response.json();

      assert.strictEqual(response.status, 200);
      assert.strictEqual(body.success, true);
    });

    await it('HTTP-STU-12: Management role requests student profile -> HTTP 200', async () => {
      const token = generateToken(SYN_IDENTITIES.management);
      const response = await fetch(
        `${baseUrl}/api/v1/students/${SYN_IDENTITIES.studentA.studentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const body = await response.json();

      assert.strictEqual(response.status, 200);
      assert.strictEqual(body.success, true);
    });

    // =========================================================================
    // SECTION 2: VERIFY GRADE REJECTION HTTP ACCESS (POST /submissions/:id/reject)
    // =========================================================================
    console.log('\n--- Section 2: Grade Rejection HTTP Access (POST /api/v1/grades/submissions/:submissionId/reject) ---');

    await it('HTTP-GRD-01: Result Management Admin with valid Amharic reason -> HTTP 200', async () => {
      const token = generateToken(SYN_IDENTITIES.resultAdmin);
      const response = await fetch(
        `${baseUrl}/api/v1/grades/submissions/sub-101/reject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            rejectionReason: 'የፈተና ውጤት ስሌት ላይ ያልተሟላ መረጃ ስላለ እባክዎ ይገምግሙ።',
          }),
        }
      );
      const body = await response.json();

      assert.strictEqual(response.status, 200);
      assert.strictEqual(body.success, true);
    });

    await it('HTTP-GRD-02: Result Management Admin with missing or invalid reason -> HTTP 400', async () => {
      const token = generateToken(SYN_IDENTITIES.resultAdmin);
      const response = await fetch(
        `${baseUrl}/api/v1/grades/submissions/sub-101/reject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            rejectionReason: 'Invalid English Reason without Amharic',
          }),
        }
      );
      const body = await response.json();

      assert.strictEqual(response.status, 400);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.code, 'INVALID_REJECTION_REASON');
    });

    await it('HTTP-GRD-03: General Admin with valid Amharic reason -> HTTP 200', async () => {
      const token = generateToken(SYN_IDENTITIES.generalAdmin);
      const response = await fetch(
        `${baseUrl}/api/v1/grades/submissions/sub-101/reject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            rejectionReason: 'በዋና አስተዳዳሪው የታየ የውጤት ስህተት ስላለ ተማሪዎቹን ውጤት እንደገና ይገምግሙ።',
          }),
        }
      );
      const body = await response.json();

      assert.strictEqual(response.status, 200);
      assert.strictEqual(body.success, true);
    });

    await it('HTTP-GRD-04: Super Admin attempting grade rejection -> HTTP 403', async () => {
      const token = generateToken(SYN_IDENTITIES.superAdmin);
      const response = await fetch(
        `${baseUrl}/api/v1/grades/submissions/sub-101/reject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            rejectionReason: 'የውጤት ሰነዱ ስህተት አለበት።',
          }),
        }
      );
      const body = await response.json();

      assert.strictEqual(response.status, 403);
      assert.strictEqual(body.success, false);
    });

    await it('HTTP-GRD-05: Subordinate Admin without RESULT_MANAGEMENT_ADMIN (Registration Admin) -> HTTP 403', async () => {
      const token = generateToken(SYN_IDENTITIES.registrationAdmin);
      const response = await fetch(
        `${baseUrl}/api/v1/grades/submissions/sub-101/reject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            rejectionReason: 'የውጤት ሰነዱ ስህተት አለበት።',
          }),
        }
      );
      const body = await response.json();

      assert.strictEqual(response.status, 403);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.code, 'FORBIDDEN_RESPONSIBILITY_REQUIRED');
    });

    await it('HTTP-GRD-06: Management role attempting grade rejection -> HTTP 403', async () => {
      const token = generateToken(SYN_IDENTITIES.management);
      const response = await fetch(
        `${baseUrl}/api/v1/grades/submissions/sub-101/reject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            rejectionReason: 'የውጤት ሰነዱ ስህተት አለበት።',
          }),
        }
      );
      const body = await response.json();

      assert.strictEqual(response.status, 403);
      assert.strictEqual(body.success, false);
    });

    await it('HTTP-GRD-07: Teacher role attempting grade rejection -> HTTP 403', async () => {
      const token = generateToken(SYN_IDENTITIES.teacherAssigned);
      const response = await fetch(
        `${baseUrl}/api/v1/grades/submissions/sub-101/reject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            rejectionReason: 'የውጤት ሰነዱ ስህተት አለበት።',
          }),
        }
      );
      const body = await response.json();

      assert.strictEqual(response.status, 403);
      assert.strictEqual(body.success, false);
    });

    await it('HTTP-GRD-08: Student role attempting grade rejection -> HTTP 403', async () => {
      const token = generateToken(SYN_IDENTITIES.studentA);
      const response = await fetch(
        `${baseUrl}/api/v1/grades/submissions/sub-101/reject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            rejectionReason: 'የውጤት ሰነዱ ስህተት አለበት።',
          }),
        }
      );
      const body = await response.json();

      assert.strictEqual(response.status, 403);
      assert.strictEqual(body.success, false);
    });

    await it('HTTP-GRD-09: Unauthenticated grade rejection -> HTTP 401', async () => {
      const response = await fetch(
        `${baseUrl}/api/v1/grades/submissions/sub-101/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rejectionReason: 'የውጤት ሰነዱ ስህተት አለበት።',
          }),
        }
      );
      const body = await response.json();

      assert.strictEqual(response.status, 401);
      assert.strictEqual(body.success, false);
    });

  } finally {
    // Restore Prisma client methods
    prisma.user.findUnique = origFindUniqueUser;
    prisma.systemSetting.findUnique = origFindUniqueSetting;
    prisma.student.findUnique = origFindUniqueStudent;
    prisma.student.findFirst = origFindFirstStudent;
    prisma.teacherAssignment.findMany = origFindManyTeacherAssignment;
    prisma.gradeSubmission.findUnique = origFindUniqueSubmission;
    prisma.$transaction = origTransaction;
    (prisma as any).auditLog = origAuditLog;

    // Shutdown HTTP server cleanly
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n========================================================================');
  console.log(`📊  HTTP Pipeline Verification Results: ${passedTests}/${totalTests} Passed (100%)`);
  console.log('========================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runActualHttpPipelineTests().catch((err) => {
  console.error('Fatal error during HTTP pipeline test:', err);
  process.exit(1);
});
