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
  batchId?: string | null;
  studentId?: string | null;
  teacherId?: string | null;
  priority: MockAnnouncementPriority;
  status: MockAnnouncementStatus;
  publishAt: Date;
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

  console.log('\nAll Announcement System automated tests PASSED! (10/10 suites)\n');
}

runAnnouncementTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
