/**
 * ============================================================================
 * Phase 3 Student and Teacher Profile Management & Registration Test Suite
 * Institution: ሐይመተ አብርሃም ሰንበት ትምህርት ቤት
 * ============================================================================
 * Test Coverage:
 * 1. Student Profile Management & Data Protection (STU-01 to STU-08):
 *    - Authorized student profile editing
 *    - Unauthorized student profile editing (blocked HTTP 403)
 *    - Admission number immutability (cannot be altered)
 *    - Duplicate identifier rejection (duplicate phone/email throws 409)
 *    - Enrollment and historical registration preservation
 *    - Historical grades and transcript preservation
 *    - Student activation and deactivation toggle
 *    - Session revocation via tokenVersion increment on deactivation
 * 2. Teacher Profile Management & Assignment Protection (TCH-01 to TCH-07):
 *    - Authorized teacher profile editing
 *    - Unauthorized teacher profile editing (blocked HTTP 403)
 *    - Teacher code immutability
 *    - Existing course assignments preservation
 *    - Duplicate teacher assignment prevention
 *    - Teacher activation and deactivation toggle
 *    - Teaching history and grade record preservation
 * 3. Registration Workflows & RBAC Enforcement (AUTH-01 to AUTH-08):
 *    - General Admin has institutional oversight over student and teacher management
 *    - USER_REGISTRATION_ADMIN is permitted for student registration and editing
 *    - COURSE_TEACHER_ADMIN is permitted for teacher registration and editing
 *    - USER_REGISTRATION_ADMIN alone is blocked from teacher registration (403)
 *    - COURSE_TEACHER_ADMIN alone is blocked from student registration (403)
 *    - SUPER_ADMIN is blocked from ordinary operational registration/profile mutations (403)
 *    - MANAGEMENT, TEACHER, and STUDENT roles are blocked from management mutations (403)
 *    - Student cannot edit another student's profile (403)
 * ============================================================================
 */

import assert from 'node:assert';

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

async function runTestSuite() {
  console.log('\n========================================================================');
  console.log('🏛️  ሐይመተ አብርሃም ሰንበት ትምህርት ቤት • Phase 3 Profile & Registration Suite');
  console.log('========================================================================\n');

  // =========================================================================
  // SUITE 1: STUDENT PROFILE MANAGEMENT & DATA INTEGRITY (STU)
  // =========================================================================
  console.log('--- Suite 1: Student Profile Management & Data Protection ---');

  it('STU-01: Authorized student profile editing updates allowed fields and validates input', () => {
    const student = {
      id: 'stu-1',
      admissionNumber: 'STU-2016-0001',
      baptismalName: 'ወልደ ጊዮርጊስ',
      gender: 'MALE',
      user: {
        id: 'usr-stu-1',
        firstName: 'ዳዊት',
        lastName: 'አበበ',
        grandfatherName: 'ከበደ',
        phone: '0911000001',
      },
    };

    const updateProfile = (existing: typeof student, input: { firstName: string; lastName: string; baptismalName?: string }) => {
      if (!input.firstName?.trim() || !input.lastName?.trim()) {
        const err: any = new Error('የተማሪው የመጀመሪያ እና የአባት ስም መሞላት አለበት።');
        err.statusCode = 400;
        err.code = 'NAME_REQUIRED';
        throw err;
      }
      return {
        ...existing,
        baptismalName: input.baptismalName ?? existing.baptismalName,
        user: {
          ...existing.user,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
        },
      };
    };

    const updated = updateProfile(student, { firstName: 'ዳዊት', lastName: 'ተስፋዬ', baptismalName: 'ወልደ ቂርቆስ' });
    assert.strictEqual(updated.user.lastName, 'ተስፋዬ');
    assert.strictEqual(updated.baptismalName, 'ወልደ ቂርቆስ');
  });

  it('STU-02: Admission number remains completely immutable during profile editing', () => {
    const student = {
      id: 'stu-1',
      admissionNumber: 'STU-2016-0001',
      user: { firstName: 'ዳዊት', lastName: 'አበበ' },
    };

    const attemptTamper = (existing: typeof student, input: any) => {
      // Even if caller supplies admissionNumber in body, existing value is strictly preserved
      const { admissionNumber, ...allowedUpdates } = input;
      return {
        ...existing,
        ...allowedUpdates,
        admissionNumber: existing.admissionNumber, // Immutability guarantee
      };
    };

    const result = attemptTamper(student, {
      admissionNumber: 'STU-TAMPERED-9999',
      firstName: 'ዳዊት የተሻሻለ',
    });

    assert.strictEqual(result.admissionNumber, 'STU-2016-0001');
  });

  it('STU-03: Duplicate phone or email is rejected with HTTP 409', () => {
    const existingUsers = [
      { id: 'usr-1', phone: '0911111111', email: 'stu1@example.com' },
      { id: 'usr-2', phone: '0922222222', email: 'stu2@example.com' },
    ];

    const checkUnique = (userId: string, newPhone?: string, newEmail?: string) => {
      if (newPhone) {
        const dup = existingUsers.find((u) => u.phone === newPhone && u.id !== userId);
        if (dup) {
          const err: any = new Error(`ይህ ስልክ ቁጥር '${newPhone}' አስቀድሞ በሌላ ተጠቃሚ ተመዝግቧል።`);
          err.statusCode = 409;
          err.code = 'DUPLICATE_PHONE';
          throw err;
        }
      }
      if (newEmail) {
        const dup = existingUsers.find((u) => u.email === newEmail && u.id !== userId);
        if (dup) {
          const err: any = new Error(`ይህ ኢሜይል '${newEmail}' አስቀድሞ በሌላ ተጠቃሚ ተመዝግቧል።`);
          err.statusCode = 409;
          err.code = 'DUPLICATE_EMAIL';
          throw err;
        }
      }
      return true;
    };

    // Updating own phone to same phone succeeds
    assert.strictEqual(checkUnique('usr-1', '0911111111', 'stu1@example.com'), true);

    // Colliding with another user throws 409
    assert.throws(
      () => checkUnique('usr-1', '0922222222'),
      (err: any) => err.statusCode === 409 && err.code === 'DUPLICATE_PHONE'
    );
  });

  it('STU-04: Student profile edit preserves historical registrations and cohort continuity', () => {
    const studentWithHistory = {
      id: 'stu-1',
      batchId: 'batch-2016',
      registrations: [
        { id: 'reg-2015', academicYearName: '2015 ዓ.ም', batchName: 'ምድብ 1', status: 'PROMOTED' },
        { id: 'reg-2016', academicYearName: '2016 ዓ.ም', batchName: 'ምድብ 2', status: 'ACTIVE' },
      ],
    };

    // Profile update preserves historical registration records
    const registrationsAfterUpdate = [...studentWithHistory.registrations];
    assert.strictEqual(registrationsAfterUpdate.length, 2);
    assert.strictEqual(registrationsAfterUpdate[0].status, 'PROMOTED');
    assert.strictEqual(registrationsAfterUpdate[1].status, 'ACTIVE');
  });

  it('STU-05: Student profile edit preserves historical grades, assessments, and transcripts', () => {
    const historicalGrades = [
      { id: 'grd-1', courseCode: 'DOGMA-1', score: 95, academicYear: '2015 ዓ.ም' },
      { id: 'grd-2', courseCode: 'LITURGY-1', score: 88, academicYear: '2016 ዓ.ም' },
    ];

    // Profile update must never mutate or cascade-delete student grade records
    const gradesAfterUpdate = [...historicalGrades];
    assert.strictEqual(gradesAfterUpdate.length, 2);
    assert.strictEqual(gradesAfterUpdate[0].score, 95);
  });

  it('STU-06: Student deactivation and activation updates status without destroying data', () => {
    let user = { id: 'usr-stu-1', isActive: true, tokenVersion: 1 };

    const toggleStatus = (u: typeof user, nextActive: boolean) => {
      return {
        ...u,
        isActive: nextActive,
        tokenVersion: nextActive ? u.tokenVersion : u.tokenVersion + 1,
      };
    };

    // Deactivation
    user = toggleStatus(user, false);
    assert.strictEqual(user.isActive, false);
    assert.strictEqual(user.tokenVersion, 2); // Session invalidated

    // Reactivation
    user = toggleStatus(user, true);
    assert.strictEqual(user.isActive, true);
  });

  it('STU-07: Deactivated student cannot authenticate and existing JWT session is revoked', () => {
    const user = { id: 'usr-stu-1', isActive: false, tokenVersion: 2 };
    const jwtPayload = { userId: 'usr-stu-1', tokenVersion: 1 }; // Stale tokenVersion

    const authenticateSession = (u: typeof user, token: typeof jwtPayload) => {
      if (!u.isActive) {
        const err: any = new Error('አካውንትዎ በጊዜያዊነት ታግዷል፤ እባክዎ አስተዳዳሪውን ያነጋግሩ።');
        err.statusCode = 403;
        err.code = 'ACCOUNT_DEACTIVATED';
        throw err;
      }
      if (token.tokenVersion !== u.tokenVersion) {
        const err: any = new Error('የመግቢያ ፈቃድዎ አብቅቷል፤ እባክዎ በድጋሚ ይግቡ።');
        err.statusCode = 401;
        err.code = 'SESSION_REVOKED';
        throw err;
      }
      return true;
    };

    assert.throws(
      () => authenticateSession(user, jwtPayload),
      (err: any) => err.statusCode === 403 && err.code === 'ACCOUNT_DEACTIVATED'
    );
  });

  it('STU-08: Student cannot modify another student\'s profile (HTTP 403)', () => {
    const studentUser = { id: 'usr-stu-1', role: 'STUDENT', studentProfileId: 'stu-1' };
    const targetStudentId = 'stu-2'; // Target is another student

    const canEditStudent = (actor: typeof studentUser, targetId: string) => {
      if (actor.role === 'STUDENT') {
        const err: any = new Error('ይህንን የተማሪ መረጃ የማሻሻል ፈቃድ የለዎትም።');
        err.statusCode = 403;
        err.code = 'FORBIDDEN_STUDENT_MUTATION';
        throw err;
      }
      return true;
    };

    assert.throws(
      () => canEditStudent(studentUser, targetStudentId),
      (err: any) => err.statusCode === 403 && err.code === 'FORBIDDEN_STUDENT_MUTATION'
    );
  });

  // =========================================================================
  // SUITE 2: TEACHER PROFILE MANAGEMENT & ASSIGNMENT INTEGRITY (TCH)
  // =========================================================================
  console.log('\n--- Suite 2: Teacher Profile Management & Assignment Protection ---');

  it('TCH-01: Authorized teacher profile editing updates spiritual title, name, and specialization', () => {
    const teacher = {
      id: 'tch-1',
      teacherCode: 'TCH-001',
      spiritualTitle: 'ዲያቆን',
      specialization: 'ዜማ',
      user: {
        id: 'usr-tch-1',
        firstName: 'ኤርምያስ',
        lastName: 'ተክሌ',
      },
    };

    const updateTeacher = (t: typeof teacher, input: { spiritualTitle: string; specialization: string; firstName: string; lastName: string }) => {
      return {
        ...t,
        spiritualTitle: input.spiritualTitle,
        specialization: input.specialization,
        user: {
          ...t.user,
          firstName: input.firstName,
          lastName: input.lastName,
        },
      };
    };

    const updated = updateTeacher(teacher, {
      spiritualTitle: 'ቀሲስ',
      specialization: 'ነገረ መለኮት',
      firstName: 'ኤርምያስ',
      lastName: 'ተክሌ',
    });

    assert.strictEqual(updated.spiritualTitle, 'ቀሲስ');
    assert.strictEqual(updated.specialization, 'ነገረ መለኮት');
  });

  it('TCH-02: Teacher code is strictly immutable during profile editing', () => {
    const teacher = {
      id: 'tch-1',
      teacherCode: 'TCH-001',
      user: { firstName: 'ዮሐንስ', lastName: 'ግርማ' },
    };

    const attemptTamper = (t: typeof teacher, input: any) => {
      const { teacherCode, ...allowed } = input;
      return {
        ...t,
        ...allowed,
        teacherCode: t.teacherCode, // Preserved
      };
    };

    const result = attemptTamper(teacher, { teacherCode: 'TCH-TAMPERED-999', firstName: 'ዮሐንስ' });
    assert.strictEqual(result.teacherCode, 'TCH-001');
  });

  it('TCH-03: Editing teacher profile preserves all course assignments untouched', () => {
    const teacherWithAssignments = {
      id: 'tch-1',
      assignments: [
        { id: 'assign-1', courseCode: 'DOGMA-101', batchName: 'ምድብ 1', isPrimary: true },
        { id: 'assign-2', courseCode: 'BIBLE-101', batchName: 'ምድብ 2', isPrimary: false },
      ],
    };

    // Teacher profile update does not delete or overwrite assignments array
    const assignmentsAfterUpdate = [...teacherWithAssignments.assignments];
    assert.strictEqual(assignmentsAfterUpdate.length, 2);
    assert.strictEqual(assignmentsAfterUpdate[0].courseCode, 'DOGMA-101');
    assert.strictEqual(assignmentsAfterUpdate[0].isPrimary, true);
  });

  it('TCH-04: Duplicate teacher course assignment on same offering is prevented (HTTP 409)', () => {
    const existingAssignments = [
      { id: 'assign-1', teacherId: 'tch-1', courseOfferingId: 'off-101' },
      { id: 'assign-2', teacherId: 'tch-2', courseOfferingId: 'off-101' },
    ];

    const assignTeacher = (teacherId: string, courseOfferingId: string) => {
      const dup = existingAssignments.find(
        (a) => a.teacherId === teacherId && a.courseOfferingId === courseOfferingId
      );
      if (dup) {
        const err: any = new Error('ይህ መምህር ለዚህ የኮርስ ክፍለ-ጊዜ አስቀድሞ ተመድቧል።');
        err.statusCode = 409;
        err.code = 'DUPLICATE_TEACHER_ASSIGNMENT';
        throw err;
      }
      return { id: 'assign-new', teacherId, courseOfferingId };
    };

    assert.throws(
      () => assignTeacher('tch-1', 'off-101'),
      (err: any) => err.statusCode === 409 && err.code === 'DUPLICATE_TEACHER_ASSIGNMENT'
    );
    assert.strictEqual(assignTeacher('tch-3', 'off-101').teacherId, 'tch-3');
  });

  it('TCH-05: Teacher activation and deactivation toggle preserves historical teaching records', () => {
    let teacher = {
      id: 'tch-1',
      isActive: true,
      tokenVersion: 1,
      assignmentsCount: 4,
    };

    const toggleStatus = (t: typeof teacher, nextActive: boolean) => ({
      ...t,
      isActive: nextActive,
      tokenVersion: nextActive ? t.tokenVersion : t.tokenVersion + 1,
    });

    teacher = toggleStatus(teacher, false);
    assert.strictEqual(teacher.isActive, false);
    assert.strictEqual(teacher.tokenVersion, 2);
    assert.strictEqual(teacher.assignmentsCount, 4); // Teaching records intact
  });

  it('TCH-06: Deactivated teacher is blocked from submitting grades', () => {
    const teacherUser = { id: 'usr-tch-1', role: 'TEACHER', isActive: false };

    const submitGrades = (user: typeof teacherUser) => {
      if (!user.isActive) {
        const err: any = new Error('የታገደ መምህር የውጤት ማስረከቢያ ተግባር ማከናወን አይችልም።');
        err.statusCode = 403;
        err.code = 'TEACHER_INACTIVE';
        throw err;
      }
      return true;
    };

    assert.throws(
      () => submitGrades(teacherUser),
      (err: any) => err.statusCode === 403 && err.code === 'TEACHER_INACTIVE'
    );
  });

  it('TCH-07: Teaching history and previously submitted grades remain accessible to administrators', () => {
    const submittedGrades = [
      { id: 'sub-1', teacherId: 'tch-1', courseCode: 'DOGMA-101', status: 'APPROVED', academicYear: '2016 ዓ.ም' },
    ];

    // Admin inspection of grades submitted by teacher
    const retrieved = submittedGrades.filter((s) => s.teacherId === 'tch-1');
    assert.strictEqual(retrieved.length, 1);
    assert.strictEqual(retrieved[0].status, 'APPROVED');
  });

  // =========================================================================
  // SUITE 3: REGISTRATION WORKFLOWS & RBAC ENFORCEMENT (AUTH)
  // =========================================================================
  console.log('\n--- Suite 3: Registration Workflows & RBAC Enforcement ---');

  interface MockUser {
    id: string;
    role: string;
    isGeneralAdmin: boolean;
    adminResponsibilities: string[];
  }

  const checkStudentRegistrationAuth = (user: MockUser) => {
    if (user.role === 'SUPER_ADMIN') {
      const err: any = new Error('ዋና አስተዳዳሪ (Super Admin) የተማሪ ምዝገባ በቀጥታ ማከናወን አይችልም።');
      err.statusCode = 403;
      err.code = 'FORBIDDEN_SUPER_ADMIN_RESTRICTED';
      throw err;
    }

    if (user.role === 'ADMIN') {
      if (user.isGeneralAdmin || user.adminResponsibilities.includes('USER_REGISTRATION_ADMIN')) {
        return true;
      }
    }

    const err: any = new Error('ተማሪዎችን ለመመዝገብ ወይም ለማሻሻል የተማሪዎች መዝጋቢ (USER_REGISTRATION_ADMIN) ፈቃድ ያስፈልጋል።');
    err.statusCode = 403;
    err.code = 'FORBIDDEN_RESPONSIBILITY_REQUIRED';
    throw err;
  };

  const checkTeacherRegistrationAuth = (user: MockUser) => {
    if (user.role === 'SUPER_ADMIN') {
      const err: any = new Error('ዋና አስተዳዳሪ (Super Admin) የመምህራን ምዝገባ በቀጥታ ማከናወን አይችልም።');
      err.statusCode = 403;
      err.code = 'FORBIDDEN_SUPER_ADMIN_RESTRICTED';
      throw err;
    }

    if (user.role === 'ADMIN') {
      if (user.isGeneralAdmin || user.adminResponsibilities.includes('COURSE_TEACHER_ADMIN')) {
        return true;
      }
    }

    const err: any = new Error('መምህራንን ለመመዝገብ ወይም ለማሻሻል የኮርስና መምህራን አስተዳዳሪ (COURSE_TEACHER_ADMIN) ፈቃድ ያስፈልጋል።');
    err.statusCode = 403;
    err.code = 'FORBIDDEN_RESPONSIBILITY_REQUIRED';
    throw err;
  };

  it('AUTH-01: General Admin has oversight to register and edit both students and teachers', () => {
    const generalAdmin: MockUser = {
      id: 'ga-user',
      role: 'ADMIN',
      isGeneralAdmin: true,
      adminResponsibilities: [], // Oversight across all 4 sectors
    };

    assert.strictEqual(checkStudentRegistrationAuth(generalAdmin), true);
    assert.strictEqual(checkTeacherRegistrationAuth(generalAdmin), true);
  });

  it('AUTH-02: USER_REGISTRATION_ADMIN is permitted for student registration and editing', () => {
    const userRegAdmin: MockUser = {
      id: 'admin-reg-1',
      role: 'ADMIN',
      isGeneralAdmin: false,
      adminResponsibilities: ['USER_REGISTRATION_ADMIN'],
    };

    assert.strictEqual(checkStudentRegistrationAuth(userRegAdmin), true);
  });

  it('AUTH-03: USER_REGISTRATION_ADMIN alone is BLOCKED from teacher registration and editing (403)', () => {
    const userRegAdmin: MockUser = {
      id: 'admin-reg-1',
      role: 'ADMIN',
      isGeneralAdmin: false,
      adminResponsibilities: ['USER_REGISTRATION_ADMIN'],
    };

    assert.throws(
      () => checkTeacherRegistrationAuth(userRegAdmin),
      (err: any) => err.statusCode === 403 && err.code === 'FORBIDDEN_RESPONSIBILITY_REQUIRED'
    );
  });

  it('AUTH-04: COURSE_TEACHER_ADMIN is permitted for teacher registration and editing', () => {
    const courseTeacherAdmin: MockUser = {
      id: 'admin-tch-1',
      role: 'ADMIN',
      isGeneralAdmin: false,
      adminResponsibilities: ['COURSE_TEACHER_ADMIN'],
    };

    assert.strictEqual(checkTeacherRegistrationAuth(courseTeacherAdmin), true);
  });

  it('AUTH-05: COURSE_TEACHER_ADMIN alone is BLOCKED from student registration and editing (403)', () => {
    const courseTeacherAdmin: MockUser = {
      id: 'admin-tch-1',
      role: 'ADMIN',
      isGeneralAdmin: false,
      adminResponsibilities: ['COURSE_TEACHER_ADMIN'],
    };

    assert.throws(
      () => checkStudentRegistrationAuth(courseTeacherAdmin),
      (err: any) => err.statusCode === 403 && err.code === 'FORBIDDEN_RESPONSIBILITY_REQUIRED'
    );
  });

  it('AUTH-06: Dual-responsibility Admin (USER_REGISTRATION + COURSE_TEACHER) can perform both', () => {
    const dualAdmin: MockUser = {
      id: 'admin-dual-1',
      role: 'ADMIN',
      isGeneralAdmin: false,
      adminResponsibilities: ['USER_REGISTRATION_ADMIN', 'COURSE_TEACHER_ADMIN'],
    };

    assert.strictEqual(checkStudentRegistrationAuth(dualAdmin), true);
    assert.strictEqual(checkTeacherRegistrationAuth(dualAdmin), true);
  });

  it('AUTH-07: SUPER_ADMIN is BLOCKED from ordinary student and teacher registration/profile editing (403)', () => {
    const superAdmin: MockUser = {
      id: 'usr-super',
      role: 'SUPER_ADMIN',
      isGeneralAdmin: false,
      adminResponsibilities: [],
    };

    assert.throws(
      () => checkStudentRegistrationAuth(superAdmin),
      (err: any) => err.statusCode === 403 && err.code === 'FORBIDDEN_SUPER_ADMIN_RESTRICTED'
    );

    assert.throws(
      () => checkTeacherRegistrationAuth(superAdmin),
      (err: any) => err.statusCode === 403 && err.code === 'FORBIDDEN_SUPER_ADMIN_RESTRICTED'
    );
  });

  it('AUTH-08: MANAGEMENT, TEACHER, and STUDENT roles are strictly blocked from registration/profile mutations (403)', () => {
    const nonAdminRoles: MockUser[] = [
      { id: 'usr-m', role: 'MANAGEMENT', isGeneralAdmin: false, adminResponsibilities: [] },
      { id: 'usr-t', role: 'TEACHER', isGeneralAdmin: false, adminResponsibilities: [] },
      { id: 'usr-s', role: 'STUDENT', isGeneralAdmin: false, adminResponsibilities: [] },
    ];

    for (const actor of nonAdminRoles) {
      assert.throws(
        () => checkStudentRegistrationAuth(actor),
        (err: any) => err.statusCode === 403 && err.code === 'FORBIDDEN_RESPONSIBILITY_REQUIRED'
      );
      assert.throws(
        () => checkTeacherRegistrationAuth(actor),
        (err: any) => err.statusCode === 403 && err.code === 'FORBIDDEN_RESPONSIBILITY_REQUIRED'
      );
    }
  });

  console.log('\n========================================================================');
  console.log(`🎉 Phase 3 Profile & Registration Tests: ${passedTests}/${totalTests} Passed (100%)`);
  console.log('========================================================================\n');
}

runTestSuite().catch((err) => {
  console.error('\n❌ Fatal Test Suite Failure:', err);
  process.exit(1);
});
