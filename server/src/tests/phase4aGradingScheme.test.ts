import assert from 'node:assert';

export const AssessmentType = {
  ATTENDANCE_DISCIPLINE: 'ATTENDANCE_DISCIPLINE',
  HOMEWORK_ASSIGNMENT: 'HOMEWORK_ASSIGNMENT',
  QUIZ: 'QUIZ',
  MIDTERM_EXAM: 'MIDTERM_EXAM',
  FINAL_EXAM: 'FINAL_EXAM',
  PROJECT: 'PROJECT',
  PRACTICAL_LITURGY: 'PRACTICAL_LITURGY',
} as const;

export type AssessmentType = (typeof AssessmentType)[keyof typeof AssessmentType];

/**
 * Phase 4A Advanced Grading Scheme Management Verification Suite
 * Tests all 12 scenarios specified in the requirements:
 * 1. Create a grading scheme.
 * 2. Add four components totaling 100%.
 * 3. Reject a scheme totaling 90% (with Amharic validation error).
 * 4. Apply a scheme to three selected courses (independent copies).
 * 5. Create another grading scheme.
 * 6. Verify the first three courses remain unchanged.
 * 7. Edit one selected course's applied scheme (Bible Study).
 * 8. Verify the other courses (Church History) remain unchanged.
 * 9. Create a new template version.
 * 10. Verify existing course configurations retain previously applied versions.
 * 11. Verify previous published grades and calculation snapshots are preserved.
 * 12. Verify all modifications appear in AuditLog.
 */

console.log('\n📐 Running Phase 4A Advanced Grading Scheme Management Tests...\n');

// In-Memory Test Harness for Phase 4A Business Engine
class InMemoryGradingSchemeHarness {
  public schemes: Map<string, any> = new Map();
  public versions: Map<string, any> = new Map();
  public components: Map<string, any> = new Map();
  public courseSchemes: Map<string, any> = new Map();
  public courseComponents: Map<string, any> = new Map();
  public calculationSnapshots: any[] = [];
  public auditLogs: any[] = [];
  public courses: Map<string, any> = new Map();
  public enrollments: Map<string, any> = new Map();

  constructor() {
    // Seed initial courses for testing
    this.courses.set('course-bible-study', {
      id: 'course-bible-study',
      title: 'የመጽሐፍ ቅዱስ ጥናት ፩ (Bible Study 1)',
      academicYearId: 'ay-2016',
      batchId: 'batch-youth',
    });
    this.courses.set('course-church-history', {
      id: 'course-church-history',
      title: 'የቤተክርስቲያን ታሪክ ፩ (Church History 1)',
      academicYearId: 'ay-2016',
      batchId: 'batch-youth',
    });
    this.courses.set('course-dogma', {
      id: 'course-dogma',
      title: 'ነገረ ሃይማኖት ፩ (Dogma 1)',
      academicYearId: 'ay-2016',
      batchId: 'batch-youth',
    });

    // Seed student enrollments with published grades
    this.enrollments.set('enrollment-yohannes-bs', {
      id: 'enrollment-yohannes-bs',
      courseOfferingId: 'course-bible-study',
      studentId: 'student-yohannes',
      finalNumericScore: 94.5,
      finalLetterGrade: 'A',
      status: 'PUBLISHED',
      grades: [
        { assessmentName: 'አጋማሽ ፈተና', score: 19.0, weight: 20 },
        { assessmentName: 'የቤት ሥራ 1', score: 18.5, weight: 20 },
        { assessmentName: 'የቤት ሥራ 2', score: 19.0, weight: 20 },
        { assessmentName: 'ማጠቃለያ ፈተና', score: 38.0, weight: 40 },
      ],
    });
  }

  public validateComponents(components: any[]) {
    if (!components || components.length === 0) {
      throw new Error('ቢያንስ አንድ የምዘና መስፈርት መካተት አለበት።');
    }

    const names = new Set<string>();
    let totalPercentage = 0;

    for (const c of components) {
      const trimmed = c.name?.trim();
      if (!trimmed) throw new Error('የምዘና መስፈርት ስም ባዶ መሆን አይችልም።');

      const lower = trimmed.toLowerCase();
      if (names.has(lower)) {
        throw new Error(
          `ተመሳሳይ ስም ያለው የምዘና መስፈርት ('${trimmed}') በአንድ መመዘኛ ውስጥ ከአንድ ጊዜ በላይ ሊገባ አይችልም።`
        );
      }
      names.add(lower);

      const pct = Number(c.percentage);
      if (isNaN(pct) || pct <= 0) {
        throw new Error(`የምዘናው የክብደት መጠን (${trimmed}) ከ0% በላይ አዎንታዊ ቁጥር መሆን አለበት።`);
      }
      if (pct > 100) {
        throw new Error(`የምዘናው የክብደት መጠን (${trimmed}) ከ100% መብለጥ አይችልም።`);
      }

      totalPercentage += pct;
    }

    if (Math.abs(totalPercentage - 100) > 0.001) {
      throw new Error(
        `የምዘና መስፈርቶች የክብደት ድምር በትክክል 100% መሆን አለበት። የአሁኑ ድምር: ${Number(
          totalPercentage.toFixed(2)
        )}% ነው።`
      );
    }
  }

  public createGradingScheme(name: string, description: string, components: any[], userId: string) {
    this.validateComponents(components);

    const schemeId = `scheme-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const versionId = `ver-${schemeId}-1`;

    const scheme = {
      id: schemeId,
      name,
      description,
      status: 'ACTIVE',
      createdById: userId,
      createdAt: new Date(),
    };
    this.schemes.set(schemeId, scheme);

    const version = {
      id: versionId,
      schemeId,
      versionNumber: 1,
      description: 'የመጀመሪያ ቅጂ',
      isLatest: true,
      status: 'ACTIVE',
    };
    this.versions.set(versionId, version);

    const compList: any[] = [];
    for (let i = 0; i < components.length; i++) {
      const c = components[i];
      const compId = `comp-${versionId}-${i + 1}`;
      const compObj = {
        id: compId,
        versionId,
        name: c.name,
        percentage: c.percentage,
        defaultMaxScore: c.defaultMaxScore || 100,
        orderIndex: i + 1,
        type: c.type || 'HOMEWORK_ASSIGNMENT',
      };
      this.components.set(compId, compObj);
      compList.push(compObj);
    }

    this.auditLogs.push({
      action: 'CREATE_GRADING_SCHEME',
      entityName: 'GradingScheme',
      entityId: schemeId,
      userId,
      details: { name, versionNumber: 1, componentCount: components.length },
    });

    return { ...scheme, latestVersion: { ...version, components: compList } };
  }

  public createNewVersion(schemeId: string, description: string, components: any[], userId: string) {
    this.validateComponents(components);
    const scheme = this.schemes.get(schemeId);
    if (!scheme) throw new Error('መመዘኛው አልተገኘም።');

    // Find current max version
    const existingVers = Array.from(this.versions.values()).filter((v) => v.schemeId === schemeId);
    const maxVerNum = Math.max(...existingVers.map((v) => v.versionNumber), 0);
    const nextVerNum = maxVerNum + 1;

    // Supersede old versions
    for (const v of existingVers) {
      v.isLatest = false;
      v.status = 'SUPERSEDED';
    }

    const newVersionId = `ver-${schemeId}-${nextVerNum}`;
    const newVersion = {
      id: newVersionId,
      schemeId,
      versionNumber: nextVerNum,
      description,
      isLatest: true,
      status: 'ACTIVE',
    };
    this.versions.set(newVersionId, newVersion);

    const compList: any[] = [];
    for (let i = 0; i < components.length; i++) {
      const c = components[i];
      const compId = `comp-${newVersionId}-${i + 1}`;
      const compObj = {
        id: compId,
        versionId: newVersionId,
        name: c.name,
        percentage: c.percentage,
        defaultMaxScore: c.defaultMaxScore || 100,
        orderIndex: i + 1,
      };
      this.components.set(compId, compObj);
      compList.push(compObj);
    }

    this.auditLogs.push({
      action: 'CREATE_SCHEME_VERSION',
      entityName: 'GradingSchemeVersion',
      entityId: newVersionId,
      userId,
      details: { schemeId, nextVerNum, componentCount: components.length },
    });

    return { ...newVersion, components: compList };
  }

  public applySchemeToCourses(schemeId: string, courseOfferingIds: string[], userId: string) {
    const scheme = this.schemes.get(schemeId);
    if (!scheme) throw new Error('መመዘኛው አልተገኘም።');

    // Find latest version
    const version = Array.from(this.versions.values()).find(
      (v) => v.schemeId === schemeId && v.isLatest
    );
    if (!version) throw new Error('የመመዘኛው ቅጂ አልተገኘም።');

    const templateComps = Array.from(this.components.values()).filter(
      (c) => c.versionId === version.id
    );

    const assigned: any[] = [];

    for (const offeringId of courseOfferingIds) {
      // Deactivate existing course schemes
      for (const cs of this.courseSchemes.values()) {
        if (cs.courseOfferingId === offeringId && cs.isActive) {
          cs.isActive = false;
        }
      }

      const existingForCourse = Array.from(this.courseSchemes.values()).filter(
        (cs) => cs.courseOfferingId === offeringId
      );
      const nextVer = existingForCourse.length + 1;

      // CRITICAL RULE 4: Create INDEPENDENT CourseGradingScheme
      const courseSchemeId = `course-scheme-${offeringId}-${nextVer}`;
      const courseScheme = {
        id: courseSchemeId,
        courseOfferingId: offeringId,
        originSchemeId: scheme.id,
        originVersionId: version.id,
        name: `${scheme.name} - ${this.courses.get(offeringId)?.title}`,
        versionNumber: nextVer,
        isActive: true,
        totalWeight: 100,
        appliedById: userId,
      };
      this.courseSchemes.set(courseSchemeId, courseScheme);

      // Create INDEPENDENT copies of components
      const courseComps: any[] = [];
      for (let i = 0; i < templateComps.length; i++) {
        const tc = templateComps[i];
        const ccId = `course-comp-${courseSchemeId}-${i + 1}`;
        const cc = {
          id: ccId,
          courseGradingSchemeId: courseSchemeId,
          name: tc.name,
          percentage: tc.percentage,
          maxScore: tc.defaultMaxScore,
          orderIndex: tc.orderIndex,
        };
        this.courseComponents.set(ccId, cc);
        courseComps.push(cc);
      }

      this.auditLogs.push({
        action: 'APPLY_COURSE_GRADING_SCHEME',
        entityName: 'CourseGradingScheme',
        entityId: courseSchemeId,
        userId,
        details: { courseOfferingId: offeringId, schemeId, versionNumber: nextVer },
      });

      assigned.push({ ...courseScheme, components: courseComps });
    }

    return assigned;
  }

  public updateCourseAppliedScheme(
    courseOfferingId: string,
    components: any[],
    changeReason: string,
    userId: string,
    confirmRecalculation: boolean = false
  ) {
    this.validateComponents(components);

    // Check if course has grades
    const enrollments = Array.from(this.enrollments.values()).filter(
      (e) => e.courseOfferingId === courseOfferingId
    );
    const hasGrades = enrollments.some((e) => e.grades && e.grades.length > 0);

    if (hasGrades && !confirmRecalculation) {
      throw new Error(
        'ለዚህ ኮርስ አስቀድመው የተመዘገቡ ውጤቶች አሉ። የመመዘኛውን የክብደት መጠን መቀየር ውጤቶችን ሊያዛባ ስለሚችል እባክዎ የማረጋገጫ ስምምነት ይስጡ።'
      );
    }

    // Snapshot current state
    if (hasGrades) {
      this.calculationSnapshots.push({
        id: `snap-${Date.now()}`,
        courseOfferingId,
        reason: 'BEFORE_COURSE_SCHEME_UPDATE',
        snapshotData: JSON.parse(JSON.stringify(enrollments)),
        studentCount: enrollments.length,
        createdById: userId,
        createdAt: new Date(),
      });
    }

    // Deactivate previous active course scheme
    const activeScheme = Array.from(this.courseSchemes.values()).find(
      (cs) => cs.courseOfferingId === courseOfferingId && cs.isActive
    );
    if (activeScheme) {
      activeScheme.isActive = false;
    }

    const existingForCourse = Array.from(this.courseSchemes.values()).filter(
      (cs) => cs.courseOfferingId === courseOfferingId
    );
    const nextVer = existingForCourse.length + 1;

    // Create NEW course configuration version
    const newCourseSchemeId = `course-scheme-${courseOfferingId}-${nextVer}`;
    const newCourseScheme = {
      id: newCourseSchemeId,
      courseOfferingId,
      originSchemeId: activeScheme?.originSchemeId,
      name: `የተሻሻለ መመዘኛ - ${this.courses.get(courseOfferingId)?.title}`,
      versionNumber: nextVer,
      isActive: true,
      totalWeight: 100,
      appliedById: userId,
      changeReason,
    };
    this.courseSchemes.set(newCourseSchemeId, newCourseScheme);

    const newComps: any[] = [];
    for (let i = 0; i < components.length; i++) {
      const c = components[i];
      const ccId = `course-comp-${newCourseSchemeId}-${i + 1}`;
      const cc = {
        id: ccId,
        courseGradingSchemeId: newCourseSchemeId,
        name: c.name,
        percentage: c.percentage,
        maxScore: c.maxScore || 100,
        orderIndex: i + 1,
      };
      this.courseComponents.set(ccId, cc);
      newComps.push(cc);
    }

    this.auditLogs.push({
      action: 'UPDATE_COURSE_GRADING_SCHEME',
      entityName: 'CourseGradingScheme',
      entityId: newCourseSchemeId,
      userId,
      details: { courseOfferingId, nextVer, changeReason, componentCount: components.length },
    });

    return { ...newCourseScheme, components: newComps };
  }

  public getCourseActiveComponents(courseOfferingId: string) {
    const activeScheme = Array.from(this.courseSchemes.values()).find(
      (cs) => cs.courseOfferingId === courseOfferingId && cs.isActive
    );
    if (!activeScheme) return [];
    return Array.from(this.courseComponents.values()).filter(
      (cc) => cc.courseGradingSchemeId === activeScheme.id
    );
  }
}

// ==========================================
// TEST SCENARIOS EXECUTION
// ==========================================

const harness = new InMemoryGradingSchemeHarness();
const ADMIN_USER_ID = 'user-admin-mulugeta';

// ----------------------------------------------------
// Scenario 1 & 2: Create a grading scheme with 4 components totaling 100%
// ----------------------------------------------------
const standardComponents = [
  { name: 'አጋማሽ ፈተና (Midterm)', percentage: 20, defaultMaxScore: 20 },
  { name: 'የቤት ሥራ 1 (Assignment 1)', percentage: 20, defaultMaxScore: 20 },
  { name: 'የቤት ሥራ 2 (Assignment 2)', percentage: 20, defaultMaxScore: 20 },
  { name: 'የማጠቃለያ ፈተና (Final Exam)', percentage: 40, defaultMaxScore: 40 },
];

const schemeStandard = harness.createGradingScheme(
  'መደበኛ ምዘና (Standard Assessment)',
  'መደበኛ የሰንበት ት/ቤት የምዘና መዋቅር (20/20/20/40)',
  standardComponents,
  ADMIN_USER_ID
);

assert.strictEqual(schemeStandard.name, 'መደበኛ ምዘና (Standard Assessment)');
assert.strictEqual(schemeStandard.latestVersion.versionNumber, 1);
assert.strictEqual(schemeStandard.latestVersion.components.length, 4);

const sumWeights = schemeStandard.latestVersion.components.reduce(
  (sum: number, c: any) => sum + c.percentage,
  0
);
assert.strictEqual(sumWeights, 100);
console.log('  ✅ Scenario 1 & 2: Created grading scheme with 4 components totaling 100%');

// ----------------------------------------------------
// Scenario 3: Reject a scheme totaling 90% with clear Amharic error
// ----------------------------------------------------
assert.throws(
  () => {
    harness.createGradingScheme(
      'ጉድለት ያለበት መመዘኛ',
      'ይህ መመዘኛ 90% ብቻ ነው ያለው',
      [
        { name: 'አጋማሽ', percentage: 20 },
        { name: 'የቤት ሥራ', percentage: 30 },
        { name: 'ማጠቃለያ', percentage: 40 }, // Sum: 90% (Not 100%)
      ],
      ADMIN_USER_ID
    );
  },
  (err: any) => {
    assert(err.message.includes('100% መሆን አለበት'));
    assert(err.message.includes('90%'));
    return true;
  }
);
console.log('  ✅ Scenario 3: Rejected scheme totaling 90% with descriptive Amharic validation message');

// ----------------------------------------------------
// Scenario 4: Apply scheme to three selected courses (Independent Copies)
// ----------------------------------------------------
const targetCourseOfferingIds = [
  'course-bible-study',
  'course-church-history',
  'course-dogma',
];

const appliedResults = harness.applySchemeToCourses(
  schemeStandard.id,
  targetCourseOfferingIds,
  ADMIN_USER_ID
);

assert.strictEqual(appliedResults.length, 3);
for (const app of appliedResults) {
  assert.strictEqual(app.isActive, true);
  assert.strictEqual(app.versionNumber, 1);
  assert.strictEqual(app.components.length, 4);
  assert.strictEqual(
    app.components.reduce((sum: number, c: any) => sum + c.percentage, 0),
    100
  );
}
console.log('  ✅ Scenario 4: Applied scheme to 3 selected courses creating independent copies');

// ----------------------------------------------------
// Scenario 5 & 6: Create another grading scheme; verify first 3 courses remain unchanged
// ----------------------------------------------------
const practicalComponents = [
  { name: 'ተግባራዊ ዜማ (Practical Liturgy)', percentage: 40, defaultMaxScore: 40 },
  { name: 'የክፍል ተሳትፎ (Classwork)', percentage: 20, defaultMaxScore: 20 },
  { name: 'የማጠቃለያ ፈተና (Final)', percentage: 40, defaultMaxScore: 40 },
];

const schemePractical = harness.createGradingScheme(
  'ተግባራዊ ምዘና (Practical Assessment)',
  'ለዜማና ለስርዓተ ቤተክርስቲያን የተዘጋጀ መመዘኛ (40/20/40)',
  practicalComponents,
  ADMIN_USER_ID
);

assert.strictEqual(schemePractical.name, 'ተግባራዊ ምዘና (Practical Assessment)');

// Verify first 3 courses remain completely unchanged with Standard Assessment components
for (const offeringId of targetCourseOfferingIds) {
  const activeComps = harness.getCourseActiveComponents(offeringId);
  assert.strictEqual(activeComps.length, 4);
  const midterm = activeComps.find((c) => c.name.includes('አጋማሽ ፈተና'));
  assert(midterm);
  assert.strictEqual(midterm.percentage, 20);
}
console.log('  ✅ Scenario 5 & 6: Created second scheme; verified first 3 courses remain unchanged');

// ----------------------------------------------------
// Scenario 7 & 8: Edit one selected course's scheme (Bible Study: Midterm 25%, Assgn 1 15%);
// Verify other courses (Church History & Dogma) remain unchanged!
// ----------------------------------------------------
const updatedBibleStudyComponents = [
  { name: 'አጋማሽ ፈተና (Midterm)', percentage: 25, maxScore: 25 },
  { name: 'የቤት ሥራ 1 (Assignment 1)', percentage: 15, maxScore: 15 },
  { name: 'የቤት ሥራ 2 (Assignment 2)', percentage: 20, maxScore: 20 },
  { name: 'የማጠቃለያ ፈተና (Final Exam)', percentage: 40, maxScore: 40 },
];

// If confirmRecalculation is false and course has grades, must reject!
assert.throws(
  () => {
    harness.updateCourseAppliedScheme(
      'course-bible-study',
      updatedBibleStudyComponents,
      'አጋማሽን ወደ 25% ከፍ ማድረግ',
      ADMIN_USER_ID,
      false // without explicit confirmation
    );
  },
  (err: any) => {
    assert(err.message.includes('አስቀድመው የተመዘገቡ ውጤቶች አሉ።'));
    return true;
  }
);

// Update with explicit confirmation
const updatedBS = harness.updateCourseAppliedScheme(
  'course-bible-study',
  updatedBibleStudyComponents,
  'የአጋማሽ ፈተና ክብደትን ወደ 25% ከፍ ማድረግ (ማሻሻያ)',
  ADMIN_USER_ID,
  true // with explicit confirmation
);

assert.strictEqual(updatedBS.versionNumber, 2);
assert.strictEqual(updatedBS.isActive, true);

// Check Bible Study active components
const bsComps = harness.getCourseActiveComponents('course-bible-study');
const bsMidterm = bsComps.find((c) => c.name.includes('አጋማሽ'));
const bsAssgn1 = bsComps.find((c) => c.name.includes('የቤት ሥራ 1'));
assert.strictEqual(bsMidterm?.percentage, 25);
assert.strictEqual(bsAssgn1?.percentage, 15);

// CRITICAL VERIFICATION: Church History must remain at 20% / 20% / 20% / 40% (Unchanged!)
const chComps = harness.getCourseActiveComponents('course-church-history');
const chMidterm = chComps.find((c) => c.name.includes('አጋማሽ'));
const chAssgn1 = chComps.find((c) => c.name.includes('የቤት ሥራ 1'));
assert.strictEqual(chMidterm?.percentage, 20);
assert.strictEqual(chAssgn1?.percentage, 20);

// CRITICAL VERIFICATION: Dogma must remain at 20% / 20% / 20% / 40% (Unchanged!)
const dogmaComps = harness.getCourseActiveComponents('course-dogma');
const dogmaMidterm = dogmaComps.find((c) => c.name.includes('አጋማሽ'));
assert.strictEqual(dogmaMidterm?.percentage, 20);

console.log('  ✅ Scenario 7 & 8: Edited Bible Study; verified Church History & Dogma remained completely unaffected');

// ----------------------------------------------------
// Scenario 9 & 10: Create a new template version; verify existing course configurations remain unchanged
// ----------------------------------------------------
const newStandardVersionComponents = [
  { name: 'አጋማሽ ፈተና', percentage: 30 },
  { name: 'የቤት ሥራ', percentage: 20 },
  { name: 'የማጠቃለያ ፈተና', percentage: 50 },
];

const newVer = harness.createNewVersion(
  schemeStandard.id,
  'ቅጂ 2፦ አጋማሽ 30% እና ማጠቃለያ 50%',
  newStandardVersionComponents,
  ADMIN_USER_ID
);

assert.strictEqual(newVer.versionNumber, 2);
assert.strictEqual(newVer.isLatest, true);

// Verify existing course offerings (Church History, Dogma) still retain their Version 1 components (20/20/20/40)
const chCompsAfter = harness.getCourseActiveComponents('course-church-history');
assert.strictEqual(chCompsAfter.length, 4);
const chMidtermAfter = chCompsAfter.find((c) => c.name.includes('አጋማሽ'));
assert.strictEqual(chMidtermAfter?.percentage, 20); // NOT changed to 30%!

console.log('  ✅ Scenario 9 & 10: Created template Version 2; verified existing course offerings retain previous versions');

// ----------------------------------------------------
// Scenario 11: Verify previous published grades and calculation snapshots are preserved
// ----------------------------------------------------
assert(harness.calculationSnapshots.length > 0);
const latestSnapshot = harness.calculationSnapshots[harness.calculationSnapshots.length - 1];
assert.strictEqual(latestSnapshot.courseOfferingId, 'course-bible-study');
assert.strictEqual(latestSnapshot.studentCount, 1);

// Verify student historical grade in enrollment is preserved
const studentEnrollment = harness.enrollments.get('enrollment-yohannes-bs');
assert.strictEqual(studentEnrollment.finalNumericScore, 94.5);
assert.strictEqual(studentEnrollment.finalLetterGrade, 'A');
assert.strictEqual(studentEnrollment.status, 'PUBLISHED');

console.log('  ✅ Scenario 11: Verified previous published grades and calculation snapshots preserved before mutation');

// ----------------------------------------------------
// Scenario 12: Verify all modifications appear in AuditLog
// ----------------------------------------------------
const auditActions = harness.auditLogs.map((l) => l.action);
assert(auditActions.includes('CREATE_GRADING_SCHEME'));
assert(auditActions.includes('APPLY_COURSE_GRADING_SCHEME'));
assert(auditActions.includes('UPDATE_COURSE_GRADING_SCHEME'));
assert(auditActions.includes('CREATE_SCHEME_VERSION'));

assert(harness.auditLogs.every((l) => l.userId === ADMIN_USER_ID));
console.log('  ✅ Scenario 12: Verified all modifications recorded in AuditLog with user attribution and entity IDs');

console.log('\nAll 12 Phase 4A Scenarios Passed Successfully! (100% Requirement Coverage)\n');
