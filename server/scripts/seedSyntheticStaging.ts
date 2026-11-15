/**
 * seedSyntheticStaging.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Phase 1 Staging Seed — ሐይመተ አብርሃም ሰንበት ትምህርት ቤት | ትምህርት ክፍል
 *
 * PURPOSE:
 *   Creates synthetic test accounts and supporting academic data required to
 *   execute the Phase 1 Admin Role Separation & General Admin Authority
 *   staging verification runbook.
 *
 * SAFETY:
 *   - NEVER runs automatically. Must be explicitly invoked.
 *   - Entry-point check prevents any operation when imported as a module.
 *   - Validates DATABASE_URL and DATABASE_URL_UNPOOLED against an approved
 *     staging hostname using exact equality (===) BEFORE connecting to Prisma.
 *   - Refuses to run if the target database cannot be positively confirmed as
 *     the staging Neon project.
 *   - Does NOT appoint the General Admin — that must be done via the actual
 *     Super Admin API endpoint (TC-08).
 *   - Does NOT print passwords, connection strings, or JWT secrets.
 *   - All data uses the "stg_" prefix to prevent collision with production or
 *     baseline seed accounts.
 *
 * USAGE (PowerShell — staging env must already be set):
 *   Set-Location server
 *   $env:STAGING_HOSTNAME = "ep-xxxx-yyyy.us-east-2.aws.neon.tech"
 *   npx tsx scripts/seedSyntheticStaging.ts
 *
 * REQUIRED ENVIRONMENT VARIABLES:
 *   DATABASE_URL           Prisma pooled connection string (pgBouncer)
 *   DATABASE_URL_UNPOOLED  Direct PostgreSQL connection string
 *   STAGING_HOSTNAME       The exact approved staging Neon project endpoint hostname
 *                          (must match both DATABASE_URL and DATABASE_URL_UNPOOLED exactly)
 *
 * DO NOT RUN WITHOUT READING THE RUNBOOK FIRST.
 * ───────────────────────────────────────────────────────────────────────────
 */

import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { PrismaClient, UserRole, AdminResponsibility, Gender, AcademicYearStatus, OfferingStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { validateStagingDatabasePair } from '../src/config/databaseGuard.js';

// ============================================================================
// SECTION 1 — ENTRY-POINT CHECK
// ============================================================================

export function isDirectExecution(): boolean {
  if (!process.argv[1]) return false;
  try {
    const currentFilePath = resolve(fileURLToPath(import.meta.url));
    const entryFilePath = resolve(process.argv[1]);
    return currentFilePath.toLowerCase() === entryFilePath.toLowerCase();
  } catch {
    return false;
  }
}

// ============================================================================
// SECTION 2 — STAGING ENVIRONMENT GUARD
// ============================================================================

export function validateStagingEnvironment(): { pooledHost: string; directHost: string } {
  try {
    const pair = validateStagingDatabasePair();
    console.log('✅ STAGING GUARD PASSED');
    console.log(`   DATABASE_URL host (pooled):          ${pair.pooledHost}`);
    console.log(`   DATABASE_URL_UNPOOLED host (direct): ${pair.directHost}`);
    console.log('');
    return pair;
  } catch (err: any) {
    console.error(`\n❌ STAGING GUARD FAILED — ${err.message}`);
    process.exit(1);
  }
}

// ============================================================================
// SECTION 3 — PRISMA CLIENT SINGLETON (LAZY INITIALIZATION)
// ============================================================================

let prismaInstance: PrismaClient | null = null;

function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: ['warn', 'error'],
    });
  }
  return prismaInstance;
}

// ============================================================================
// SECTION 4 — CONSTANTS
// ============================================================================

const SALT_ROUNDS = 12;
// Shared password for synthetic staging test accounts.
// Printed nowhere in outputs or logs.
const STAGING_PASSWORD = 'Staging@Phase1!2026';

// Admission number for the synthetic student
const STUDENT_ADMISSION = 'STG-2016-9001';

// ============================================================================
// SECTION 5 — ACCOUNT DEFINITIONS
// ============================================================================

interface AccountSpec {
  username: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  adminResponsibilities?: AdminResponsibility[];
  isActive?: boolean;
}

export const ACCOUNTS: AccountSpec[] = [
  // Two Super Admins for concurrency and GA appointment tests
  {
    username: 'stg_superadmin_1',
    role: UserRole.SUPER_ADMIN,
    firstName: 'Staging',
    lastName: 'SuperAdmin One',
    isActive: true,
  },
  {
    username: 'stg_superadmin_2',
    role: UserRole.SUPER_ADMIN,
    firstName: 'Staging',
    lastName: 'SuperAdmin Two',
    isActive: true,
  },
  // General Admin candidate (gets appointed via TC-08 API call, never here)
  {
    username: 'stg_admin_ga_target',
    role: UserRole.ADMIN,
    firstName: 'Staging',
    lastName: 'GA Target',
    adminResponsibilities: [],
    isActive: true,
  },
  // Admin with RESULT_MANAGEMENT_ADMIN — grade rejection tests
  {
    username: 'stg_admin_result',
    role: UserRole.ADMIN,
    firstName: 'Staging',
    lastName: 'Result Admin',
    adminResponsibilities: [AdminResponsibility.RESULT_MANAGEMENT_ADMIN],
    isActive: true,
  },
  // Admin with ANNOUNCEMENT_ADMIN
  {
    username: 'stg_admin_announcement',
    role: UserRole.ADMIN,
    firstName: 'Staging',
    lastName: 'Announcement Admin',
    adminResponsibilities: [AdminResponsibility.ANNOUNCEMENT_ADMIN],
    isActive: true,
  },
  // Admin with USER_REGISTRATION_ADMIN
  {
    username: 'stg_admin_registration',
    role: UserRole.ADMIN,
    firstName: 'Staging',
    lastName: 'Registration Admin',
    adminResponsibilities: [AdminResponsibility.USER_REGISTRATION_ADMIN],
    isActive: true,
  },
  // Admin with COURSE_TEACHER_ADMIN
  {
    username: 'stg_admin_course',
    role: UserRole.ADMIN,
    firstName: 'Staging',
    lastName: 'Course Admin',
    adminResponsibilities: [AdminResponsibility.COURSE_TEACHER_ADMIN],
    isActive: true,
  },
  // Admin with ALL responsibilities (full-access admin)
  {
    username: 'stg_admin_full',
    role: UserRole.ADMIN,
    firstName: 'Staging',
    lastName: 'Full Admin',
    adminResponsibilities: [
      AdminResponsibility.ANNOUNCEMENT_ADMIN,
      AdminResponsibility.USER_REGISTRATION_ADMIN,
      AdminResponsibility.COURSE_TEACHER_ADMIN,
      AdminResponsibility.RESULT_MANAGEMENT_ADMIN,
    ],
    isActive: true,
  },
  // Admin with no responsibilities — boundary tests
  {
    username: 'stg_admin_none',
    role: UserRole.ADMIN,
    firstName: 'Staging',
    lastName: 'No Responsibility Admin',
    adminResponsibilities: [],
    isActive: true,
  },
  // Management — read-only transcript boundary tests
  {
    username: 'stg_management_1',
    role: UserRole.MANAGEMENT,
    firstName: 'Staging',
    lastName: 'Management One',
    isActive: true,
  },
  // Teacher — grade submission, boundary tests
  {
    username: 'stg_teacher_1',
    role: UserRole.TEACHER,
    firstName: 'Staging',
    lastName: 'Teacher One',
    isActive: true,
  },
  // Student — my-results endpoint test
  {
    username: 'stg_student_1',
    role: UserRole.STUDENT,
    firstName: 'Staging',
    lastName: 'Student One',
    isActive: true,
  },
  // Account reserved for soft-delete and restoration tests
  {
    username: 'stg_delete_target',
    role: UserRole.ADMIN,
    firstName: 'Staging',
    lastName: 'Delete Target',
    adminResponsibilities: [],
    isActive: true,
  },
];

// ============================================================================
// SECTION 6 — HELPER: UPSERT A USER
// ============================================================================

async function upsertUser(prisma: PrismaClient, spec: AccountSpec, passwordHash: string): Promise<string> {
  const user = await prisma.user.upsert({
    where: { username: spec.username },
    update: {
      passwordHash,
      role: spec.role,
      firstName: spec.firstName,
      lastName: spec.lastName,
      isActive: spec.isActive ?? true,
      isDeleted: false,
      deletedAt: null,
      deletedById: null,
      adminResponsibilities: spec.adminResponsibilities ?? [],
    },
    create: {
      username: spec.username,
      passwordHash,
      role: spec.role,
      firstName: spec.firstName,
      lastName: spec.lastName,
      isActive: spec.isActive ?? true,
      isDeleted: false,
      adminResponsibilities: spec.adminResponsibilities ?? [],
    },
    select: { id: true, username: true, role: true },
  });
  return user.id;
}

// ============================================================================
// SECTION 7 — MAIN SEED FUNCTION
// ============================================================================

export async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Phase 1 Synthetic Staging Seed');
  console.log('  ሐይመተ አብርሃም ሰንበት ትምህርት ቤት — Staging Environment Only');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  // Validate environment before initializing connection
  validateStagingEnvironment();
  const prisma = getPrismaClient();

  // ------------------------------------------------------------------
  // STEP 1: Hash the shared staging password (single bcrypt operation)
  // ------------------------------------------------------------------
  console.log('Step 1: Hashing staging password with bcrypt (12 rounds)…');
  const passwordHash = await bcrypt.hash(STAGING_PASSWORD, SALT_ROUNDS);
  console.log('  ✅ Password hashed.');

  // ------------------------------------------------------------------
  // STEP 2: Validate & preserve SystemSetting singleton & GA appointment
  // ------------------------------------------------------------------
  console.log('\nStep 2: Validating SystemSetting singleton & preserving GA appointment…');
  const existingSetting = await prisma.systemSetting.findUnique({
    where: { id: 'SYSTEM_DEFAULT' },
    select: { id: true, generalAdminUserId: true },
  });

  if (!existingSetting) {
    // Create singleton only if it does not already exist
    await prisma.systemSetting.create({
      data: { id: 'SYSTEM_DEFAULT', generalAdminUserId: null },
    });
    console.log('  ✅ Created SYSTEM_DEFAULT singleton row (generalAdminUserId: null).');
  } else {
    // If singleton already exists, verify pointer integrity and preserve it
    if (existingSetting.generalAdminUserId !== null) {
      const referencedUser = await prisma.user.findUnique({
        where: { id: existingSetting.generalAdminUserId },
        select: { id: true, username: true, role: true, isActive: true, isDeleted: true },
      });

      if (!referencedUser) {
        throw new Error(
          `[Seed Guard] ABORT: SystemSetting.generalAdminUserId references non-existent user ID '${existingSetting.generalAdminUserId}'. Aborting without modifying data.`
        );
      }

      if (referencedUser.role !== UserRole.ADMIN) {
        throw new Error(
          `[Seed Guard] ABORT: Appointed General Admin '${referencedUser.username}' must have role 'ADMIN', but has role '${referencedUser.role}'. Aborting without modifying data.`
        );
      }

      if (!referencedUser.isActive) {
        throw new Error(
          `[Seed Guard] ABORT: Appointed General Admin '${referencedUser.username}' is inactive. Only active Admin accounts may hold the General Admin appointment. Aborting without modifying data.`
        );
      }

      if (referencedUser.isDeleted) {
        throw new Error(
          `[Seed Guard] ABORT: Appointed General Admin '${referencedUser.username}' is soft-deleted. Soft-deleted accounts cannot hold the General Admin appointment. Aborting without modifying data.`
        );
      }

      console.log(
        `  ✅ Preserved existing General Admin appointment: ${referencedUser.username} (${referencedUser.id}) [Role: ${referencedUser.role}, Active: ${referencedUser.isActive}].`
      );
    } else {
      console.log('  ✅ Preserved existing SYSTEM_DEFAULT singleton (generalAdminUserId is currently null).');
    }
  }
  console.log('  ℹ  GA appointment can be performed via POST /api/v1/system-admin/general-admin/appoint (TC-08).');

  // ------------------------------------------------------------------
  // STEP 3: Upsert all synthetic user accounts
  // ------------------------------------------------------------------
  console.log('\nStep 3: Creating/updating synthetic user accounts…');
  const userIds: Record<string, string> = {};
  for (const spec of ACCOUNTS) {
    const id = await upsertUser(prisma, spec, passwordHash);
    userIds[spec.username] = id;
    console.log(`  ✅ ${spec.role.padEnd(12)} ${spec.username} (id: ${id})`);
  }

  // ------------------------------------------------------------------
  // STEP 4: Teacher profile for stg_teacher_1
  // ------------------------------------------------------------------
  console.log('\nStep 4: Ensuring Teacher profile for stg_teacher_1…');
  const teacherUserId = userIds['stg_teacher_1'];
  const teacherProfile = await prisma.teacher.upsert({
    where: { userId: teacherUserId },
    update: { teacherCode: 'TCH-STG-001', spiritualTitle: 'ዲያቆን', specialization: 'ነገረ ሃይማኖት' },
    create: {
      userId: teacherUserId,
      teacherCode: 'TCH-STG-001',
      spiritualTitle: 'ዲያቆን',
      qualification: 'BA ነገረ ሃይማኖት',
      specialization: 'ነገረ ሃይማኖት',
    },
    select: { id: true },
  });
  console.log(`  ✅ Teacher profile id: ${teacherProfile.id}`);

  // ------------------------------------------------------------------
  // STEP 5: Management profile for stg_management_1
  // ------------------------------------------------------------------
  console.log('\nStep 5: Ensuring Management profile for stg_management_1…');
  const mgmtUserId = userIds['stg_management_1'];
  await prisma.managementProfile.upsert({
    where: { userId: mgmtUserId },
    update: { department: 'የትምህርት ክፍል', positionTitle: 'ዋና ፀሐፊ' },
    create: {
      userId: mgmtUserId,
      department: 'የትምህርት ክፍል',
      positionTitle: 'ዋና ፀሐፊ',
    },
  });
  console.log('  ✅ Management profile created.');

  // ------------------------------------------------------------------
  // STEP 6: Academic year & batch for student / enrollment data
  // ------------------------------------------------------------------
  console.log('\nStep 6: Ensuring staging academic year and batch…');
  const academicYear = await prisma.academicYear.upsert({
    where: { code: 'AY-STG-2016' },
    update: {},
    create: {
      name: '2016 ዓ.ም. (Staging)',
      code: 'AY-STG-2016',
      startDate: new Date('2023-09-12'),
      endDate: new Date('2024-07-07'),
      isCurrent: false,          // Do not interfere with any "current" year
      status: AcademicYearStatus.ACTIVE,
      description: 'Staging-only academic year — Phase 1 test data',
    },
    select: { id: true },
  });
  console.log(`  ✅ Academic year id: ${academicYear.id}`);

  const batch = await prisma.batch.upsert({
    where: { academicYearId_code: { academicYearId: academicYear.id, code: 'B-STG-YOUTH' } },
    update: {},
    create: {
      academicYearId: academicYear.id,
      name: 'Staging Batch — ወጣቶች',
      code: 'B-STG-YOUTH',
      stageLevel: 'ደረጃ 2 (ወጣቶች)',
      description: 'Staging-only batch — Phase 1 test data',
      isActive: true,
    },
    select: { id: true },
  });
  console.log(`  ✅ Batch id: ${batch.id}`);

  // ------------------------------------------------------------------
  // STEP 7: Course
  // ------------------------------------------------------------------
  console.log('\nStep 7: Ensuring staging course…');
  const course = await prisma.course.upsert({
    where: { code: 'CRS-STG-DOGMA-101' },
    update: {},
    create: {
      code: 'CRS-STG-DOGMA-101',
      title: 'Staging Dogmatics 1',
      amharicTitle: 'ነገረ ሃይማኖት ፩ (Staging)',
      description: 'Staging-only course — Phase 1 test data',
      creditHours: 2,
      isActive: true,
    },
    select: { id: true },
  });
  console.log(`  ✅ Course id: ${course.id}`);

  // ------------------------------------------------------------------
  // STEP 8: Course Offering (SUBMITTED — ready for GA approval test)
  // ------------------------------------------------------------------
  console.log('\nStep 8: Ensuring staging course offering (status: GRADES_PENDING)…');
  const offering = await prisma.courseOffering.upsert({
    where: {
      courseId_academicYearId_batchId_termSemester: {
        courseId: course.id,
        academicYearId: academicYear.id,
        batchId: batch.id,
        termSemester: 'STG-1',
      },
    },
    update: { status: OfferingStatus.GRADES_PENDING },
    create: {
      courseId: course.id,
      academicYearId: academicYear.id,
      batchId: batch.id,
      termSemester: 'STG-1',
      status: OfferingStatus.GRADES_PENDING,
      isSubmissionOpen: false,
    },
    select: { id: true },
  });
  console.log(`  ✅ Course offering id: ${offering.id}`);

  // ------------------------------------------------------------------
  // STEP 9: Teacher assignment
  // ------------------------------------------------------------------
  console.log('\nStep 9: Ensuring teacher assignment…');
  await prisma.teacherAssignment.upsert({
    where: {
      teacherId_courseOfferingId: {
        teacherId: teacherProfile.id,
        courseOfferingId: offering.id,
      },
    },
    update: {},
    create: {
      teacherId: teacherProfile.id,
      courseOfferingId: offering.id,
      isPrimary: true,
    },
  });
  console.log('  ✅ Teacher assignment created.');

  // ------------------------------------------------------------------
  // STEP 10: Student profile + enrollment for stg_student_1
  // ------------------------------------------------------------------
  console.log('\nStep 10: Ensuring Student profile and enrollment for stg_student_1…');
  const studentUserId = userIds['stg_student_1'];
  const studentProfile = await prisma.student.upsert({
    where: { userId: studentUserId },
    update: {},
    create: {
      userId: studentUserId,
      academicYearId: academicYear.id,
      batchId: batch.id,
      admissionNumber: STUDENT_ADMISSION,
      gender: Gender.MALE,
      baptismalName: 'Staging',
      guardianName: 'Staging Guardian',
    },
    select: { id: true },
  });
  console.log(`  ✅ Student profile id: ${studentProfile.id}`);

  // Student registration
  await prisma.studentRegistration.upsert({
    where: { studentId_academicYearId: { studentId: studentProfile.id, academicYearId: academicYear.id } },
    update: {},
    create: {
      studentId: studentProfile.id,
      academicYearId: academicYear.id,
      batchId: batch.id,
      status: 'ACTIVE',
    },
  });

  // Student enrollment in the staging offering
  await prisma.studentEnrollment.upsert({
    where: { studentId_courseOfferingId: { studentId: studentProfile.id, courseOfferingId: offering.id } },
    update: {},
    create: {
      studentId: studentProfile.id,
      courseOfferingId: offering.id,
    },
  });
  console.log('  ✅ Student registration and enrollment created.');

  // ------------------------------------------------------------------
  // STEP 11: GradeSubmission for grade approve/publish/reject tests
  // ------------------------------------------------------------------
  console.log('\nStep 11: Ensuring a GradeSubmission in SUBMITTED status for grade tests…');
  const existingSubmission = await prisma.gradeSubmission.findFirst({
    where: { courseOfferingId: offering.id, status: 'SUBMITTED' },
    select: { id: true },
  });

  let submissionId: string;
  if (existingSubmission) {
    submissionId = existingSubmission.id;
    console.log(`  ✅ Existing SUBMITTED grade submission found: ${submissionId}`);
  } else {
    const newSubmission = await prisma.gradeSubmission.create({
      data: {
        courseOfferingId: offering.id,
        submittedById: teacherUserId,
        status: 'SUBMITTED',
        submissionDate: new Date(),
        notes: 'Staging test submission — Phase 1 approval/reject tests',
        version: 1,
      },
      select: { id: true },
    });
    submissionId = newSubmission.id;
    console.log(`  ✅ New SUBMITTED grade submission created: ${submissionId}`);
  }

  // ============================================================================
  // STEP 12: Summary
  // ============================================================================
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  Synthetic Staging Seed — COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('  Accounts created (all use the STAGING_PASSWORD env variable):');
  console.log('  ┌──────────────────────────────┬──────────────┬───────────────────────────────────────────────────┐');
  console.log('  │ Username                     │ Role         │ Responsibilities                                  │');
  console.log('  ├──────────────────────────────┼──────────────┼───────────────────────────────────────────────────┤');

  const roleWidth = 12;
  const usernameWidth = 28;
  for (const spec of ACCOUNTS) {
    const username = spec.username.padEnd(usernameWidth);
    const role = spec.role.padEnd(roleWidth);
    const resp = (spec.adminResponsibilities ?? []).join(', ') || '—';
    console.log(`  │ ${username} │ ${role} │ ${resp.padEnd(49)} │`);
  }

  console.log('  └──────────────────────────────┴──────────────┴───────────────────────────────────────────────────┘');
  console.log('');
  console.log('  Academic data:');
  console.log(`    Academic Year ID:   ${academicYear.id}`);
  console.log(`    Batch ID:           ${batch.id}`);
  console.log(`    Course ID:          ${course.id}`);
  console.log(`    Course Offering ID: ${offering.id}  (status: GRADES_PENDING)`);
  console.log(`    Teacher Profile ID: ${teacherProfile.id}`);
  console.log(`    Student Profile ID: ${studentProfile.id}`);
  console.log(`    GradeSubmission ID: ${submissionId}  (status: SUBMITTED — use for TC-12/TC-13/TC-14)`);
  console.log('');
  console.log('  ⚠  GeneralAdmin is NOT appointed. Use TC-08 to appoint via API.');
  console.log('  ⚠  Passwords are not printed here. Use STAGING_PASSWORD env variable.');
  console.log('');
}

// ============================================================================
// ENTRY POINT (Only execute when directly run from CLI)
// ============================================================================

if (isDirectExecution()) {
  main()
    .catch((err) => {
      console.error('\n❌ Seed failed:', err.message ?? err);
      process.exit(1);
    })
    .finally(async () => {
      if (prismaInstance) {
        await prismaInstance.$disconnect();
      }
    });
}
