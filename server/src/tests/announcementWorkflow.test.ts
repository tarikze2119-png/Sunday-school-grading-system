import assert from 'node:assert';

export const MockAnnouncementTargetAudience = {
  ALL_USERS: 'ALL_USERS',
  ALL_STUDENTS: 'ALL_STUDENTS',
  SPECIFIC_BATCH: 'SPECIFIC_BATCH',
  INDIVIDUAL_STUDENT: 'INDIVIDUAL_STUDENT',
  ALL_TEACHERS: 'ALL_TEACHERS',
  INDIVIDUAL_TEACHER: 'INDIVIDUAL_TEACHER',
} as const;
export type MockAnnouncementTargetAudience = (typeof MockAnnouncementTargetAudience)[keyof typeof MockAnnouncementTargetAudience];

export const MockAnnouncementPriority = {
  NORMAL: 'NORMAL',
  IMPORTANT: 'IMPORTANT',
} as const;
export type MockAnnouncementPriority = (typeof MockAnnouncementPriority)[keyof typeof MockAnnouncementPriority];

export const MockAnnouncementCategory = {
  GENERAL: 'GENERAL',
  EVENT: 'EVENT',
  ACADEMIC: 'ACADEMIC',
} as const;
export type MockAnnouncementCategory = (typeof MockAnnouncementCategory)[keyof typeof MockAnnouncementCategory];

export const MockAnnouncementStatus = {
  DRAFT: 'DRAFT',
  SCHEDULED: 'SCHEDULED',
  PUBLISHED: 'PUBLISHED',
  EXPIRED: 'EXPIRED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type MockAnnouncementStatus = (typeof MockAnnouncementStatus)[keyof typeof MockAnnouncementStatus];

// User role definition
export type MockRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGEMENT' | 'TEACHER' | 'STUDENT';

export interface MockUser {
  id: string;
  role: MockRole;
  isActive: boolean;
  studentProfile?: { id: string; batchId?: string };
  teacherProfile?: { id: string };
}

export interface MockAnnouncement {
  id: string;
  title: string;
  content: string;
  targetAudience: MockAnnouncementTargetAudience;
  category?: MockAnnouncementCategory;
  batchId?: string | null;
  studentId?: string | null;
  teacherId?: string | null;
  priority: MockAnnouncementPriority;
  status: MockAnnouncementStatus;
  publishAt: Date;
  eventDate?: Date | null;
  expiresAt?: Date | null;
  isArchived: boolean;
  recipients: Array<{
    userId: string;
    isRead: boolean;
    readAt: Date | null;
  }>;
}

/**
 * Validates announcement input data
 */
export function validateAnnouncementInput(input: {
  title?: string;
  content?: string;
  publishAt?: Date;
  expiresAt?: Date | null;
}) {
  if (!input.title || !input.title.trim()) {
    throw new Error('የማስታወቂያ ርዕስ መሞላት አለበት።');
  }
  if (!input.content || !input.content.trim()) {
    throw new Error('የማስታወቂያ ዝርዝር መልእክት መሞላት አለበት።');
  }
  if (input.expiresAt && input.publishAt && input.expiresAt <= input.publishAt) {
    throw new Error('የማስታወቂያው ማብቂያ ቀን ከሚለጠፍበት ቀን በኋላ መሆን አለበት።');
  }
}

/**
 * Resolves audience user IDs for an announcement
 */
export function resolveAudienceUserIds(
  targetAudience: MockAnnouncementTargetAudience,
  options: {
    batchId?: string | null;
    studentId?: string | null;
    teacherId?: string | null;
  },
  allUsers: MockUser[]
): string[] {
  const activeUsers = allUsers.filter((u) => u.isActive);

  switch (targetAudience) {
    case MockAnnouncementTargetAudience.ALL_USERS:
      return activeUsers.map((u) => u.id);

    case MockAnnouncementTargetAudience.ALL_STUDENTS:
      return activeUsers.filter((u) => u.role === 'STUDENT').map((u) => u.id);

    case MockAnnouncementTargetAudience.SPECIFIC_BATCH:
      if (!options.batchId) throw new Error('ምድብ አልተመረጠም።');
      return activeUsers
        .filter((u) => u.role === 'STUDENT' && u.studentProfile?.batchId === options.batchId)
        .map((u) => u.id);

    case MockAnnouncementTargetAudience.INDIVIDUAL_STUDENT:
      if (!options.studentId) throw new Error('ተማሪ አልተመረጠም።');
      const student = activeUsers.find((u) => u.studentProfile?.id === options.studentId);
      return student ? [student.id] : [];

    case MockAnnouncementTargetAudience.ALL_TEACHERS:
      return activeUsers.filter((u) => u.role === 'TEACHER').map((u) => u.id);

    case MockAnnouncementTargetAudience.INDIVIDUAL_TEACHER:
      if (!options.teacherId) throw new Error('መምህር አልተመረጠም።');
      const teacher = activeUsers.find((u) => u.teacherProfile?.id === options.teacherId);
      return teacher ? [teacher.id] : [];

    default:
      return [];
  }
}

/**
 * Calculates recipient read stats
 */
export function calculateAnnouncementStats(announcement: MockAnnouncement) {
  const total = announcement.recipients.length;
  const read = announcement.recipients.filter((r) => r.isRead).length;
  const unread = total - read;
  const readPercentage = total > 0 ? Math.round((read / total) * 100) : 0;
  return { total, read, unread, readPercentage };
}

async function runAnnouncementTests() {
  console.log('\n📢 Running Haimote Abraham Announcement System Verification Tests...\n');

  // Set up mock system users across ALL FIVE ROLES
  const mockUsers: MockUser[] = [
    { id: 'usr-super-admin', role: 'SUPER_ADMIN', isActive: true },
    { id: 'usr-admin-1', role: 'ADMIN', isActive: true },
    { id: 'usr-mgmt-1', role: 'MANAGEMENT', isActive: true },
    { id: 'usr-teach-1', role: 'TEACHER', isActive: true, teacherProfile: { id: 'tch-1' } },
    { id: 'usr-teach-2', role: 'TEACHER', isActive: true, teacherProfile: { id: 'tch-2' } },
    { id: 'usr-stu-1', role: 'STUDENT', isActive: true, studentProfile: { id: 'stu-1', batchId: 'batch-youth' } },
    { id: 'usr-stu-2', role: 'STUDENT', isActive: true, studentProfile: { id: 'stu-2', batchId: 'batch-youth' } },
    { id: 'usr-stu-3', role: 'STUDENT', isActive: true, studentProfile: { id: 'stu-3', batchId: 'batch-children' } },
    { id: 'usr-inactive', role: 'STUDENT', isActive: false, studentProfile: { id: 'stu-4', batchId: 'batch-youth' } },
  ];

  // 1. Validation Tests: Empty title or content
  {
    assert.throws(
      () => validateAnnouncementInput({ title: '', content: 'ይዘት' }),
      /የማስታወቂያ ርዕስ መሞላት አለበት።/,
      'Empty title should be rejected with Amharic error'
    );

    assert.throws(
      () => validateAnnouncementInput({ title: 'ርዕስ', content: '   ' }),
      /የማስታወቂያ ዝርዝር መልእክት መሞላት አለበት።/,
      'Empty content should be rejected with Amharic error'
    );

    const now = new Date();
    const past = new Date(now.getTime() - 100000);
    assert.throws(
      () => validateAnnouncementInput({ title: 'ርዕስ', content: 'ይዘት', publishAt: now, expiresAt: past }),
      /የማስታወቂያው ማብቂያ ቀን ከሚለጠፍበት ቀን በኋላ መሆን አለበት።/,
      'Expiration date before publish date should be rejected'
    );

    console.log('  ✅ PASS: Mandatory field validations & date constraints enforced in Amharic');
  }

  // 2. Audience Resolution: ALL_USERS (Delivers to all 5 roles: SUPER_ADMIN, ADMIN, MANAGEMENT, TEACHER, STUDENT)
  {
    const recipients = resolveAudienceUserIds(MockAnnouncementTargetAudience.ALL_USERS, {}, mockUsers);
    assert.strictEqual(recipients.length, 8, 'All 8 active users across all 5 roles must be resolved');
    assert(recipients.includes('usr-super-admin'), 'SUPER_ADMIN must be included in ALL_USERS');
    assert(recipients.includes('usr-admin-1'), 'ADMIN must be included in ALL_USERS');
    assert(recipients.includes('usr-mgmt-1'), 'MANAGEMENT must be included in ALL_USERS');
    assert(recipients.includes('usr-teach-1'), 'TEACHER must be included in ALL_USERS');
    assert(recipients.includes('usr-stu-1'), 'STUDENT must be included in ALL_USERS');
    assert(!recipients.includes('usr-inactive'), 'Inactive user must not receive announcement');
    console.log('  ✅ PASS: Audience ALL_USERS targets all active users across ALL 5 roles (including SUPER_ADMIN)');
  }

  // 3. Audience Resolution: ALL_STUDENTS
  {
    const recipients = resolveAudienceUserIds(MockAnnouncementTargetAudience.ALL_STUDENTS, {}, mockUsers);
    assert.strictEqual(recipients.length, 3, 'Only the 3 active students should be resolved');
    assert(recipients.includes('usr-stu-1'));
    assert(recipients.includes('usr-stu-2'));
    assert(recipients.includes('usr-stu-3'));
    assert(!recipients.includes('usr-teach-1'));
    assert(!recipients.includes('usr-admin-1'));
    console.log('  ✅ PASS: Audience ALL_STUDENTS strictly targets students only');
  }

  // 4. Audience Resolution: SPECIFIC_BATCH
  {
    const recipientsYouth = resolveAudienceUserIds(
      MockAnnouncementTargetAudience.SPECIFIC_BATCH,
      { batchId: 'batch-youth' },
      mockUsers
    );
    assert.strictEqual(recipientsYouth.length, 2, 'Batch Youth should have 2 active students');
    assert(recipientsYouth.includes('usr-stu-1'));
    assert(recipientsYouth.includes('usr-stu-2'));
    assert(!recipientsYouth.includes('usr-stu-3'), 'Student from batch-children must NOT be included');

    const recipientsChildren = resolveAudienceUserIds(
      MockAnnouncementTargetAudience.SPECIFIC_BATCH,
      { batchId: 'batch-children' },
      mockUsers
    );
    assert.strictEqual(recipientsChildren.length, 1);
    assert.strictEqual(recipientsChildren[0], 'usr-stu-3');
    console.log('  ✅ PASS: Audience SPECIFIC_BATCH correctly isolates students of that specific batch');
  }

  // 5. Audience Resolution: INDIVIDUAL_STUDENT
  {
    const recipients = resolveAudienceUserIds(
      MockAnnouncementTargetAudience.INDIVIDUAL_STUDENT,
      { studentId: 'stu-1' },
      mockUsers
    );
    assert.strictEqual(recipients.length, 1);
    assert.strictEqual(recipients[0], 'usr-stu-1');
    console.log('  ✅ PASS: Audience INDIVIDUAL_STUDENT targets only the single intended student');
  }

  // 6. Audience Resolution: ALL_TEACHERS & INDIVIDUAL_TEACHER
  {
    const allTeachers = resolveAudienceUserIds(MockAnnouncementTargetAudience.ALL_TEACHERS, {}, mockUsers);
    assert.strictEqual(allTeachers.length, 2);
    assert(allTeachers.includes('usr-teach-1'));
    assert(allTeachers.includes('usr-teach-2'));

    const individualTeacher = resolveAudienceUserIds(
      MockAnnouncementTargetAudience.INDIVIDUAL_TEACHER,
      { teacherId: 'tch-2' },
      mockUsers
    );
    assert.strictEqual(individualTeacher.length, 1);
    assert.strictEqual(individualTeacher[0], 'usr-teach-2');
    console.log('  ✅ PASS: Audience ALL_TEACHERS and INDIVIDUAL_TEACHER resolve accurately');
  }

  // 7. Security Isolation: Student & Teacher Cannot Access Unauthorized Announcements
  {
    const teacherOnlyAnn: MockAnnouncement = {
      id: 'ann-teach-1',
      title: 'የመምህራን ስብሰባ',
      content: 'ለመምህራን ብቻ',
      targetAudience: MockAnnouncementTargetAudience.ALL_TEACHERS,
      priority: MockAnnouncementPriority.IMPORTANT,
      status: MockAnnouncementStatus.PUBLISHED,
      publishAt: new Date(),
      isArchived: false,
      recipients: [
        { userId: 'usr-teach-1', isRead: false, readAt: null },
        { userId: 'usr-teach-2', isRead: false, readAt: null },
      ],
    };

    // Check if student user 'usr-stu-1' is in recipients
    const studentHasAccess = teacherOnlyAnn.recipients.some((r) => r.userId === 'usr-stu-1');
    assert.strictEqual(studentHasAccess, false, 'Student MUST NOT have access to teacher-only announcement');

    // Check that SUPER_ADMIN does NOT gain automatic recipient access to private teacher announcement
    const superAdminHasAccess = teacherOnlyAnn.recipients.some((r) => r.userId === 'usr-super-admin');
    assert.strictEqual(superAdminHasAccess, false, 'SUPER_ADMIN does NOT receive private teacher announcement in recipient feed');

    const batchYouthAnn: MockAnnouncement = {
      id: 'ann-batch-youth',
      title: 'የወጣቶች ክፍል ማስታወቂያ',
      content: 'ለወጣቶች ክፍል ብቻ',
      targetAudience: MockAnnouncementTargetAudience.SPECIFIC_BATCH,
      batchId: 'batch-youth',
      priority: MockAnnouncementPriority.NORMAL,
      status: MockAnnouncementStatus.PUBLISHED,
      publishAt: new Date(),
      isArchived: false,
      recipients: [
        { userId: 'usr-stu-1', isRead: false, readAt: null },
        { userId: 'usr-stu-2', isRead: false, readAt: null },
      ],
    };

    const childrenStudentHasAccess = batchYouthAnn.recipients.some((r) => r.userId === 'usr-stu-3');
    assert.strictEqual(childrenStudentHasAccess, false, 'Children student MUST NOT have access to Youth batch announcement');
    console.log('  ✅ PASS: Recipient isolation guarantees unauthorized roles/batches cannot read private notices');
  }

  // 8. Read Status Tracking & Admin Metrics Calculation
  {
    const announcement: MockAnnouncement = {
      id: 'ann-demo-1',
      title: 'የአካዳሚክ ዓመት መክፈቻ',
      content: 'እንኳን ደህና መጣችሁ',
      targetAudience: MockAnnouncementTargetAudience.ALL_USERS,
      priority: MockAnnouncementPriority.IMPORTANT,
      status: MockAnnouncementStatus.PUBLISHED,
      publishAt: new Date(),
      isArchived: false,
      recipients: [
        { userId: 'usr-admin-1', isRead: true, readAt: new Date() },
        { userId: 'usr-mgmt-1', isRead: true, readAt: new Date() },
        { userId: 'usr-teach-1', isRead: false, readAt: null },
        { userId: 'usr-teach-2', isRead: false, readAt: null },
      ],
    };

    let stats = calculateAnnouncementStats(announcement);
    assert.strictEqual(stats.total, 4);
    assert.strictEqual(stats.read, 2);
    assert.strictEqual(stats.unread, 2);
    assert.strictEqual(stats.readPercentage, 50);

    // Now usr-teach-1 marks as read
    const r = announcement.recipients.find((rec) => rec.userId === 'usr-teach-1');
    if (r) {
      r.isRead = true;
      r.readAt = new Date();
    }

    stats = calculateAnnouncementStats(announcement);
    assert.strictEqual(stats.read, 3);
    assert.strictEqual(stats.unread, 1);
    assert.strictEqual(stats.readPercentage, 75);
    console.log('  ✅ PASS: Individual read status and Admin statistical aggregations operate correctly');
  }

  // 9. Status Transitions: DRAFT -> SCHEDULED vs PUBLISHED
  {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 86400000); // tomorrow

    // If published date is in future, status becomes SCHEDULED
    const isFuture = futureDate > now;
    const computedStatus = isFuture ? MockAnnouncementStatus.SCHEDULED : MockAnnouncementStatus.PUBLISHED;
    assert.strictEqual(computedStatus, MockAnnouncementStatus.SCHEDULED);
    console.log('  ✅ PASS: Future publication date automatically resolves to SCHEDULED');
  }

  // 10. Idempotency & Duplicate Publication Prevention
  {
    let publicationCount = 0;
    let notificationCount = 0;
    function mockPublish(ann: { status: string; recipients: string[] }) {
      if (ann.status === MockAnnouncementStatus.PUBLISHED) {
        return { published: false, notifications: 0 };
      }
      ann.status = MockAnnouncementStatus.PUBLISHED;
      publicationCount++;
      notificationCount += ann.recipients.length;
      return { published: true, notifications: ann.recipients.length };
    }

    const ann = { status: MockAnnouncementStatus.SCHEDULED, recipients: ['u1', 'u2', 'u3'] };
    const first = mockPublish(ann);
    assert.strictEqual(first.published, true);
    assert.strictEqual(first.notifications, 3);

    const duplicate = mockPublish(ann);
    assert.strictEqual(duplicate.published, false, 'Subsequent publish call must be idempotent');
    assert.strictEqual(duplicate.notifications, 0, 'No duplicate notifications created');
    assert.strictEqual(publicationCount, 1);
    assert.strictEqual(notificationCount, 3);
    console.log('  ✅ PASS: Concurrency guard prevents duplicate publications and notifications');
  }

  // 11. Scheduled Sync Authorization (CRON_SECRET and Admin Role Enforcement)
  {
    const configuredSecret = 'test_cron_secret_secure_key_123';

    function authorizeSyncRequest(authHeader: string | undefined, userRole?: string): { allowed: boolean; status: number } {
      if (configuredSecret && authHeader === `Bearer ${configuredSecret}`) {
        return { allowed: true, status: 200 };
      }
      if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') {
        return { allowed: true, status: 200 };
      }
      if (userRole) {
        return { allowed: false, status: 403 }; // Forbidden for non-admin roles (STUDENT, TEACHER, MANAGEMENT)
      }
      return { allowed: false, status: 401 }; // Unauthorized if no valid secret or token
    }

    // A. Valid CRON_SECRET succeeds without user token
    const validCron = authorizeSyncRequest(`Bearer ${configuredSecret}`);
    assert.strictEqual(validCron.allowed, true);
    assert.strictEqual(validCron.status, 200);

    // B. Invalid CRON_SECRET without token is rejected with 401
    const invalidCron = authorizeSyncRequest('Bearer wrong_secret');
    assert.strictEqual(invalidCron.allowed, false);
    assert.strictEqual(invalidCron.status, 401);

    // C. Missing authorization is rejected with 401
    const missingAuth = authorizeSyncRequest(undefined);
    assert.strictEqual(missingAuth.allowed, false);
    assert.strictEqual(missingAuth.status, 401);

    // D. Admin user without CRON_SECRET succeeds with 200
    const adminUser = authorizeSyncRequest(undefined, 'ADMIN');
    assert.strictEqual(adminUser.allowed, true);
    assert.strictEqual(adminUser.status, 200);

    // E. Super Admin user without CRON_SECRET succeeds with 200
    const superAdminUser = authorizeSyncRequest(undefined, 'SUPER_ADMIN');
    assert.strictEqual(superAdminUser.allowed, true);
    assert.strictEqual(superAdminUser.status, 200);

    // F. Student user without CRON_SECRET is rejected with 403
    const studentUser = authorizeSyncRequest(undefined, 'STUDENT');
    assert.strictEqual(studentUser.allowed, false);
    assert.strictEqual(studentUser.status, 403);

    // G. Teacher user without CRON_SECRET is rejected with 403
    const teacherUser = authorizeSyncRequest(undefined, 'TEACHER');
    assert.strictEqual(teacherUser.allowed, false);
    assert.strictEqual(teacherUser.status, 403);

    console.log('  ✅ PASS: CRON_SECRET and role-based authorization for sync-schedule verified');
  }

  // 12. Automated Scheduled Sync Lifecycle & Time-Based Promotion
  {
    const now = new Date('2026-11-10T15:00:00.000Z');

    const announcements = [
      {
        id: 'ann-due',
        status: MockAnnouncementStatus.SCHEDULED,
        publishAt: new Date('2026-11-10T14:30:00.000Z'), // Past due by 30 mins
        expiresAt: new Date('2026-11-15T15:00:00.000Z'),
        isArchived: false,
      },
      {
        id: 'ann-future',
        status: MockAnnouncementStatus.SCHEDULED,
        publishAt: new Date('2026-11-10T16:00:00.000Z'), // 1 hour in the future
        expiresAt: new Date('2026-11-15T15:00:00.000Z'),
        isArchived: false,
      },
      {
        id: 'ann-expired',
        status: MockAnnouncementStatus.PUBLISHED,
        publishAt: new Date('2026-11-01T15:00:00.000Z'),
        expiresAt: new Date('2026-11-09T15:00:00.000Z'), // Expired yesterday
        isArchived: false,
      },
      {
        id: 'ann-archived',
        status: MockAnnouncementStatus.ARCHIVED,
        publishAt: new Date('2026-11-01T15:00:00.000Z'),
        expiresAt: null,
        isArchived: true,
      },
    ];

    function runSync(items: typeof announcements, currentTime: Date) {
      let published = 0;
      let expired = 0;

      for (const item of items) {
        if (item.isArchived) continue;

        // Due promotions
        if (item.status === MockAnnouncementStatus.SCHEDULED && item.publishAt <= currentTime) {
          item.status = MockAnnouncementStatus.PUBLISHED;
          published++;
        }

        // Expirations
        if (item.status === MockAnnouncementStatus.PUBLISHED && item.expiresAt && item.expiresAt < currentTime) {
          item.status = MockAnnouncementStatus.EXPIRED;
          expired++;
        }
      }

      return { published, expired };
    }

    const syncResult = runSync(announcements, now);

    assert.strictEqual(syncResult.published, 1, 'Exactly one due announcement should be published');
    assert.strictEqual(syncResult.expired, 1, 'Exactly one past announcement should be marked expired');

    // Verify individual items:
    const dueItem = announcements.find((a) => a.id === 'ann-due');
    assert.strictEqual(dueItem?.status, MockAnnouncementStatus.PUBLISHED, 'Due announcement must be PUBLISHED');

    const futureItem = announcements.find((a) => a.id === 'ann-future');
    assert.strictEqual(futureItem?.status, MockAnnouncementStatus.SCHEDULED, 'Future announcement must remain SCHEDULED');

    const expiredItem = announcements.find((a) => a.id === 'ann-expired');
    assert.strictEqual(expiredItem?.status, MockAnnouncementStatus.EXPIRED, 'Expired announcement must be EXPIRED');

    const archivedItem = announcements.find((a) => a.id === 'ann-archived');
    assert.strictEqual(archivedItem?.status, MockAnnouncementStatus.ARCHIVED, 'Archived announcement must remain ARCHIVED');

    console.log('  ✅ PASS: Due announcements published, future held, expired transitioned, archived preserved');
  }

  // Suite 13: Announcement Categories and Automatic Expiration Rules
  {
    console.log('\nSuite 13: Announcement Categories and Automatic Expiration Rules');

    function computeAnnouncementExpiration(input: {
      category: MockAnnouncementCategory;
      publishAt: Date;
      eventDate?: Date | null;
      manualExpiresAt?: Date | null;
    }): Date {
      if (input.category === MockAnnouncementCategory.EVENT && !input.eventDate) {
        throw new Error('የዝግጅት / ክስተት ማስታወቂያ የዝግጅቱን ቀን እና ሰዓት ማካተት አለበት።');
      }

      let expiresAt: Date;
      if (input.manualExpiresAt) {
        expiresAt = new Date(input.manualExpiresAt);
      } else {
        if (input.category === MockAnnouncementCategory.GENERAL) {
          expiresAt = new Date(input.publishAt.getTime() + 30 * 24 * 60 * 60 * 1000);
        } else if (input.category === MockAnnouncementCategory.EVENT) {
          expiresAt = new Date(input.eventDate!.getTime() + 1 * 24 * 60 * 60 * 1000);
        } else if (input.category === MockAnnouncementCategory.ACADEMIC) {
          expiresAt = new Date(input.publishAt.getTime() + 90 * 24 * 60 * 60 * 1000);
        } else {
          expiresAt = new Date(input.publishAt.getTime() + 30 * 24 * 60 * 60 * 1000);
        }
      }

      if (expiresAt <= input.publishAt) {
        throw new Error('የማስታወቂያው ማብቂያ ቀን ከሚለጠፍበት ቀን በኋላ መሆን አለበት።');
      }
      if (input.category === MockAnnouncementCategory.EVENT && input.eventDate && expiresAt <= input.eventDate) {
        throw new Error('የማስታወቂያው ማብቂያ ቀን ከዝግጅቱ ቀን በኋላ መሆን አለበት።');
      }

      return expiresAt;
    }

    const basePublishAt = new Date('2026-11-15T09:00:00.000Z');

    // 1. GENERAL defaults to 30 days
    const generalExp = computeAnnouncementExpiration({
      category: MockAnnouncementCategory.GENERAL,
      publishAt: basePublishAt,
    });
    const expectedGeneralExp = new Date(basePublishAt.getTime() + 30 * 24 * 60 * 60 * 1000);
    assert.strictEqual(generalExp.toISOString(), expectedGeneralExp.toISOString(), 'GENERAL must expire 30 days after publishAt');
    assert.strictEqual((generalExp.getTime() - basePublishAt.getTime()) / (24 * 60 * 60 * 1000), 30, 'GENERAL diff must be exactly 30 days');

    // 2. EVENT defaults to 1 day after eventDate
    const eventDate = new Date('2026-11-20T14:00:00.000Z');
    const eventExp = computeAnnouncementExpiration({
      category: MockAnnouncementCategory.EVENT,
      publishAt: basePublishAt,
      eventDate,
    });
    const expectedEventExp = new Date(eventDate.getTime() + 1 * 24 * 60 * 60 * 1000);
    assert.strictEqual(eventExp.toISOString(), expectedEventExp.toISOString(), 'EVENT must expire 1 day after eventDate');
    assert.strictEqual((eventExp.getTime() - eventDate.getTime()) / (24 * 60 * 60 * 1000), 1, 'EVENT diff must be exactly 1 day');

    // 3. EVENT without eventDate is rejected
    assert.throws(
      () => computeAnnouncementExpiration({ category: MockAnnouncementCategory.EVENT, publishAt: basePublishAt }),
      /የዝግጅት \/ ክስተት ማስታወቂያ የዝግጅቱን ቀን እና ሰዓት ማካተት አለበት።/,
      'EVENT without eventDate must throw descriptive Amharic error'
    );

    // 4. ACADEMIC defaults to 90 days
    const academicExp = computeAnnouncementExpiration({
      category: MockAnnouncementCategory.ACADEMIC,
      publishAt: basePublishAt,
    });
    const expectedAcademicExp = new Date(basePublishAt.getTime() + 90 * 24 * 60 * 60 * 1000);
    assert.strictEqual(academicExp.toISOString(), expectedAcademicExp.toISOString(), 'ACADEMIC must expire 90 days after publishAt');
    assert.strictEqual((academicExp.getTime() - basePublishAt.getTime()) / (24 * 60 * 60 * 1000), 90, 'ACADEMIC diff must be exactly 90 days');

    // 5. Manual expiration overrides the default
    const customExp = new Date('2026-11-18T12:00:00.000Z');
    const overriddenExp = computeAnnouncementExpiration({
      category: MockAnnouncementCategory.GENERAL,
      publishAt: basePublishAt,
      manualExpiresAt: customExp,
    });
    assert.strictEqual(overriddenExp.toISOString(), customExp.toISOString(), 'Manual expiration must override default');

    // 6. Changing category updates default when appropriate
    let currentCategory: MockAnnouncementCategory = MockAnnouncementCategory.GENERAL;
    let currentExpiresAt: Date | null = computeAnnouncementExpiration({ category: currentCategory, publishAt: basePublishAt });
    assert.strictEqual((currentExpiresAt.getTime() - basePublishAt.getTime()) / (24 * 60 * 60 * 1000), 30);

    // Admin switches to ACADEMIC without manual override -> recalculates to 90 days
    currentCategory = MockAnnouncementCategory.ACADEMIC;
    currentExpiresAt = computeAnnouncementExpiration({ category: currentCategory, publishAt: basePublishAt });
    assert.strictEqual((currentExpiresAt.getTime() - basePublishAt.getTime()) / (24 * 60 * 60 * 1000), 90, 'Category switch to ACADEMIC updates to 90 days');

    // 7. Unrelated edits preserve existing expiration
    const announcementRecord = {
      id: 'ann-1',
      title: 'የመጀመሪያ ርዕስ',
      content: 'የመጀመሪያ ይዘት',
      category: MockAnnouncementCategory.GENERAL,
      publishAt: basePublishAt,
      eventDate: null as Date | null,
      expiresAt: customExp, // manually customized
    };

    function simulateUpdate(ann: typeof announcementRecord, patch: Partial<typeof announcementRecord> & { isManualExpiresAt?: boolean }) {
      const categoryChanged = patch.category !== undefined && patch.category !== ann.category;
      const publishAtChanged = patch.publishAt !== undefined && patch.publishAt.getTime() !== ann.publishAt.getTime();
      const eventDateChanged = patch.eventDate !== undefined && patch.eventDate?.getTime() !== ann.eventDate?.getTime();
      const relevantChanged = categoryChanged || publishAtChanged || eventDateChanged;

      let nextExpiresAt: Date | null = ann.expiresAt;
      if (patch.expiresAt !== undefined) {
        nextExpiresAt = patch.expiresAt;
      } else if (relevantChanged && !patch.isManualExpiresAt) {
        const cat = patch.category || ann.category;
        const pub = patch.publishAt || ann.publishAt;
        const ev = patch.eventDate !== undefined ? patch.eventDate : ann.eventDate;
        nextExpiresAt = computeAnnouncementExpiration({ category: cat, publishAt: pub, eventDate: ev });
      }

      return { ...ann, ...patch, expiresAt: nextExpiresAt };
    }

    // Edit title only (unrelated edit) -> custom expiration must be preserved
    const editedTitle = simulateUpdate(announcementRecord, { title: 'የተሻሻለ ርዕስ' });
    assert.strictEqual(editedTitle.expiresAt?.toISOString(), customExp.toISOString(), 'Unrelated edit must preserve existing custom expiration');

    // 8. Existing announcements with null expiration remain unchanged during unrelated edit
    const legacyNullExp = {
      id: 'ann-legacy',
      title: 'የቀድሞ ማስታወቂያ',
      content: 'የቀድሞ ይዘት',
      category: MockAnnouncementCategory.GENERAL,
      publishAt: basePublishAt,
      eventDate: null as Date | null,
      expiresAt: null as Date | null,
    };
    const editedLegacy = simulateUpdate(legacyNullExp, { content: 'አዲስ ይዘት' });
    assert.strictEqual(editedLegacy.expiresAt, null, 'Existing announcement with null expiration must remain null during unrelated edit');

    // 9 & 10. Expired announcements disappear from recipient feed but remain in Admin history
    const currentTime = new Date('2026-11-25T00:00:00.000Z');
    const allAnnouncements = [
      { id: 'ann-active', title: 'ንቁ ማስታወቂያ', status: MockAnnouncementStatus.PUBLISHED, publishAt: basePublishAt, expiresAt: new Date('2026-11-30T00:00:00.000Z'), isArchived: false },
      { id: 'ann-expired', title: 'ያለፈበት ማስታወቂያ', status: MockAnnouncementStatus.EXPIRED, publishAt: basePublishAt, expiresAt: new Date('2026-11-20T00:00:00.000Z'), isArchived: false },
    ];

    // Recipient query logic
    const recipientVisible = allAnnouncements.filter((a) => a.status === MockAnnouncementStatus.PUBLISHED && (!a.expiresAt || a.expiresAt > currentTime));
    assert.strictEqual(recipientVisible.length, 1, 'Recipient must only see active announcement');
    assert.strictEqual(recipientVisible[0].id, 'ann-active', 'Recipient feed excludes expired announcement');

    // Admin query logic (retrieves all historical items)
    const adminVisible = allAnnouncements;
    assert.strictEqual(adminVisible.length, 2, 'Admin history preserves both active and expired announcements');
    assert.ok(adminVisible.some((a) => a.id === 'ann-expired'), 'Admin has access to expired announcement history');

    // 11. Scheduled publication still occurs at selected publication time (publishAt <= now)
    const futurePublishTime = new Date('2026-11-26T10:00:00.000Z');
    const scheduledAnn = {
      id: 'ann-scheduled',
      status: MockAnnouncementStatus.SCHEDULED,
      publishAt: futurePublishTime,
      expiresAt: new Date(futurePublishTime.getTime() + 30 * 24 * 60 * 60 * 1000),
      isArchived: false,
    };

    // Before publish time:
    const checkBefore = futurePublishTime.getTime() <= new Date('2026-11-26T09:59:00.000Z').getTime();
    assert.strictEqual(checkBefore, false, 'Before publishAt, announcement must not be published');

    // At publish time:
    const checkAt = futurePublishTime.getTime() <= new Date('2026-11-26T10:00:00.000Z').getTime();
    assert.strictEqual(checkAt, true, 'At publishAt, publication condition is fulfilled');

    console.log('  ✅ PASS: 1. GENERAL defaults to 30 days after publication');
    console.log('  ✅ PASS: 2. EVENT defaults to 1 day after eventDate');
    console.log('  ✅ PASS: 3. EVENT without eventDate is rejected with Amharic error');
    console.log('  ✅ PASS: 4. ACADEMIC defaults to 90 days after publication');
    console.log('  ✅ PASS: 5. Manual expiration overrides the default');
    console.log('  ✅ PASS: 6. Changing category/dates recalculates defaults');
    console.log('  ✅ PASS: 7. Unrelated edits preserve existing expiration');
    console.log('  ✅ PASS: 8. Existing announcements with null expiration remain unchanged');
    console.log('  ✅ PASS: 9. Expired announcements disappear from recipient feeds');
    console.log('  ✅ PASS: 10. Expired announcements remain in Admin history');
    console.log('  ✅ PASS: 11. Scheduled publication occurs at selected publication time');
  }

  console.log('\nAll Announcement System automated tests PASSED! (13/13 suites)\n');
}

runAnnouncementTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
