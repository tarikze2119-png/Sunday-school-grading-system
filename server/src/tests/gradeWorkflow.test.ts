/**
 * Phase 4 Grading & Approval Engine Verification Tests
 * 
 * Tests:
 * 1. Weighted score calculation
 * 2. Official Sunday School Grading Scale letter and grade point mapping
 * 3. Server-side deadline & open lock enforcement logic
 * 4. Self-approval security guard (teacher cannot approve own submission)
 * 5. Mandatory Amharic rejection reason validation
 * 6. 100% assessment weight sum requirement
 */

export interface MockAssessment {
  id: string;
  name: string;
  maxScore: number;
  weightPercentage: number;
}

export interface MockGradingScale {
  letterGrade: string;
  amharicLabel: string;
  minScore: number;
  maxScore: number;
  gradePoint: number;
  isPassing: boolean;
}

const standardScales: MockGradingScale[] = [
  { letterGrade: 'A+', amharicLabel: 'እጅግ በጣም ጥሩ (ከፍተኛ ማዕረግ)', minScore: 95.0, maxScore: 100.0, gradePoint: 4.0, isPassing: true },
  { letterGrade: 'A', amharicLabel: 'እጅግ በጣም ጥሩ', minScore: 85.0, maxScore: 94.99, gradePoint: 4.0, isPassing: true },
  { letterGrade: 'B', amharicLabel: 'በጣም ጥሩ', minScore: 75.0, maxScore: 84.99, gradePoint: 3.0, isPassing: true },
  { letterGrade: 'C', amharicLabel: 'ጥሩ (አጥጋቢ)', minScore: 60.0, maxScore: 74.99, gradePoint: 2.0, isPassing: true },
  { letterGrade: 'D', amharicLabel: 'ዝቅተኛ ማለፊያ', minScore: 50.0, maxScore: 59.99, gradePoint: 1.0, isPassing: true },
  { letterGrade: 'F', amharicLabel: 'ያላለፈ (የሚደገም)', minScore: 0.0, maxScore: 49.99, gradePoint: 0.0, isPassing: false },
];

export function calculateWeightedTotal(
  scores: Array<{ maxScore: number; weightPercentage: number; scoreObtained: number; isExempt?: boolean }>
): number {
  let total = 0;
  for (const item of scores) {
    if (!item.isExempt && item.maxScore > 0) {
      total += (item.scoreObtained / item.maxScore) * item.weightPercentage;
    }
  }
  return Math.round(total * 100) / 100;
}

export function mapScoreToGradeScale(
  score: number,
  scales: MockGradingScale[] = standardScales
): MockGradingScale {
  const activeScales = (scales && scales.length > 0) ? scales : standardScales;
  const sorted = [...activeScales].sort((a, b) => b.minScore - a.minScore);
  for (const s of sorted) {
    if (score >= s.minScore) {
      return s;
    }
  }
  return sorted[sorted.length - 1];
}

export function validateDeadline(
  deadline: Date | null,
  isSubmissionOpen: boolean,
  currentTime: Date = new Date()
): { allowed: boolean; reason?: string } {
  if (deadline && currentTime > deadline && !isSubmissionOpen) {
    return {
      allowed: false,
      reason: 'የውጤት ማስረከቢያ ጊዜ አልቋል። እባክዎ ጊዜው እንዲራዘም ወይም ዳግም እንዲከፈት አስተዳዳሪውን ያነጋግሩ።',
    };
  }
  return { allowed: true };
}

export function validateSelfApproval(submittedById: string, approvedById: string): boolean {
  if (submittedById === approvedById) {
    throw new Error('መምህሩ ራሱ ያስገባውን ውጤት ራሱ ማጽደቅ አይችልም።');
  }
  return true;
}

export function validateRejectionReason(reason?: string): boolean {
  if (!reason || reason.trim().length === 0) {
    throw new Error('ውጤት ውድቅ ሲደረግ የግዴታ ምክንያቱ በአማርኛ መገለጽ አለበት።');
  }
  return true;
}

export function validateTotalAssessmentWeight(assessments: Array<{ weightPercentage: number }>): boolean {
  const sum = assessments.reduce((acc, a) => acc + a.weightPercentage, 0);
  if (Math.round(sum) !== 100) {
    throw new Error(`የምዘና መስፈርቶች የክብደት ድምር 100% መሆን አለበት። የአሁኑ ድምር ${sum}% ነው።`);
  }
  return true;
}

// ==========================================
// Test Suite Execution
// ==========================================
export function runGradeWorkflowTests() {
  console.log('🧪 Running Phase 4 Grading & Approval Workflow Tests...\n');

  let passed = 0;
  let failed = 0;

  function assert(testName: string, condition: boolean) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // Test 1: Standard 5-Component Weighted Total Calculation
  const standardScores = [
    { maxScore: 10, weightPercentage: 10, scoreObtained: 9.5 },  // 9.5%
    { maxScore: 10, weightPercentage: 10, scoreObtained: 9.0 },  // 9.0%
    { maxScore: 20, weightPercentage: 20, scoreObtained: 18.5 }, // 18.5%
    { maxScore: 20, weightPercentage: 20, scoreObtained: 19.0 }, // 19.0%
    { maxScore: 40, weightPercentage: 40, scoreObtained: 38.0 }, // 38.0%
  ];
  const total = calculateWeightedTotal(standardScores);
  assert('Weighted Total calculation equals 94.0%', total === 94.0);

  // Test 2: Scale Mapping
  const gradeA = mapScoreToGradeScale(94.0);
  assert("Score 94.0 maps to Grade 'A' (እጅግ በጣም ጥሩ)", gradeA.letterGrade === 'A' && gradeA.gradePoint === 4.0);

  const gradeAPlus = mapScoreToGradeScale(98.5);
  assert("Score 98.5 maps to Grade 'A+' (ከፍተኛ ማዕረግ)", gradeAPlus.letterGrade === 'A+' && gradeAPlus.isPassing);

  const grade99 = mapScoreToGradeScale(99.0);
  assert("Score 99.0 maps to Grade 'A+' (እጅግ በጣም ጥሩ - ከፍተኛ ማዕረግ)", grade99.letterGrade === 'A+' && grade99.gradePoint === 4.0 && grade99.isPassing);

  const emptyScalesGrade99 = mapScoreToGradeScale(99.0, []);
  assert("Score 99.0 with empty DB scales array still resolves to 'A+' via default scales", emptyScalesGrade99.letterGrade === 'A+' && emptyScalesGrade99.gradePoint === 4.0 && emptyScalesGrade99.isPassing);

  const gradeF = mapScoreToGradeScale(42.0);
  assert("Score 42.0 maps to Grade 'F' (ያላለፈ)", gradeF.letterGrade === 'F' && !gradeF.isPassing);

  // Test 3: Deadline Enforcement
  const pastDate = new Date('2023-01-01');
  const futureDate = new Date('2030-01-01');

  const overdueLocked = validateDeadline(pastDate, false);
  assert('Past deadline with submission locked is blocked', !overdueLocked.allowed);

  const overdueReopened = validateDeadline(pastDate, true);
  assert('Past deadline with Admin reopen is permitted', overdueReopened.allowed);

  const futureDeadline = validateDeadline(futureDate, false);
  assert('Future deadline before due date is permitted', futureDeadline.allowed);

  // Test 4: Self-Approval Guard
  let selfApprovalBlocked = false;
  try {
    validateSelfApproval('teacher-user-123', 'teacher-user-123');
  } catch (e: any) {
    selfApprovalBlocked = e.message.includes('መምህሩ ራሱ');
  }
  assert('Teacher cannot approve their own submission (Self-Approval Guard)', selfApprovalBlocked);

  const adminApprovalAllowed = validateSelfApproval('teacher-user-123', 'admin-user-456');
  assert('Distinct Admin can approve teacher submission', adminApprovalAllowed);

  // Test 5: Rejection Reason Requirement
  let emptyRejectionBlocked = false;
  try {
    validateRejectionReason('');
  } catch (e: any) {
    emptyRejectionBlocked = true;
  }
  assert('Empty rejection reason is rejected with Amharic validation', emptyRejectionBlocked);

  const validReasonAccepted = validateRejectionReason('የተማሪው የፈተና ወረቀት አልተገኘም');
  assert('Amharic rejection reason is accepted', validReasonAccepted);

  // Test 6: 100% Total Assessment Weight
  const validAssessments = [
    { weightPercentage: 10 },
    { weightPercentage: 10 },
    { weightPercentage: 20 },
    { weightPercentage: 20 },
    { weightPercentage: 40 },
  ];
  assert('Assessment components summing to 100% are valid', validateTotalAssessmentWeight(validAssessments));

  let invalidWeightBlocked = false;
  try {
    validateTotalAssessmentWeight([{ weightPercentage: 30 }, { weightPercentage: 40 }]);
  } catch (e) {
    invalidWeightBlocked = true;
  }
  assert('Assessment components summing to 70% (not 100%) are rejected', invalidWeightBlocked);

  console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
  return failed === 0;
}

// Run immediately if executed directly
if (process.argv[1]?.includes('gradeWorkflow.test')) {
  runGradeWorkflowTests();
}
