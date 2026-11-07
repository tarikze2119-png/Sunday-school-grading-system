import prisma from '../config/prisma.client.js';
import { 
  AssessmentType, 
  GradeSubmissionStatus, 
  ApprovalDecision, 
  NotificationType,
  OfferingStatus 
} from '@prisma/client';
import { logAuditEvent } from '../utils/auditLogger.js';

export interface AssessmentInput {
  name: string;
  type: AssessmentType;
  maxScore: number;
  weightPercentage: number;
  description?: string;
  displayOrder?: number;
}

export interface SaveGradeItemInput {
  enrollmentId: string;
  assessmentId: string;
  scoreObtained: number;
  feedback?: string;
  isExempt?: boolean;
}

export class GradeService {
  private cachedScales: any[] | null = null;
  private cachedScalesTime: number = 0;

  // ==========================================
  // A. ASSESSMENT CONFIGURATION
  // ==========================================

  /**
   * Get all system grading scales (In-memory cached for high throughput)
   */
  async getGradingScales() {
    const now = Date.now();
    if (this.cachedScales && now - this.cachedScalesTime < 300000) {
      return this.cachedScales;
    }
    const scales = await prisma.gradingScale.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    this.cachedScales = scales;
    this.cachedScalesTime = now;
    return scales;
  }

  /**
   * Get all assessment components configured for a course offering
   */
  async getAssessments(courseOfferingId: string) {
    return prisma.assessment.findMany({
      where: { courseOfferingId },
      orderBy: { displayOrder: 'asc' },
    });
  }

  /**
   * Add a new assessment component to a course offering
   */
  async createAssessment(courseOfferingId: string, data: AssessmentInput, adminUserId: string) {
    // 1. Verify course offering exists
    const offering = await prisma.courseOffering.findUnique({
      where: { id: courseOfferingId },
      include: { assessments: true },
    });

    if (!offering) {
      throw new Error('የተመረጠው የኮርስ ምደባ አልተገኘም።');
    }

    // 2. Prevent duplicate assessment name
    const nameExists = offering.assessments.some(
      (a) => a.name.trim().toLowerCase() === data.name.trim().toLowerCase()
    );
    if (nameExists) {
      throw new Error(`'${data.name}' በሚል ስም የተመዘገበ የምዘና መስፈርት አስቀድሞ አለ።`);
    }

    // 3. Validate weight percentage
    const currentTotalWeight = offering.assessments.reduce(
      (sum, a) => sum + Number(a.weightPercentage),
      0
    );

    const newWeight = Number(data.weightPercentage);
    if (newWeight <= 0 || newWeight > 100) {
      throw new Error('የምዘናው የክብደት መጠን ከ0% እስከ 100% መካከል መሆን አለበት።');
    }

    if (currentTotalWeight + newWeight > 100) {
      throw new Error(
        `የምዘናዎች ድምር ከ100% መብለጥ አይችልም። በአሁኑ ጊዜ የተመዘገበው ድምር ${currentTotalWeight}% ነው። ሊጨመር የሚችለው ከፍተኛው መጠን ${100 - currentTotalWeight}% ነው።`
      );
    }

    if (data.maxScore <= 0) {
      throw new Error('የምዘናው ከፍተኛ ውጤት ከ0 በላይ መሆን አለበት።');
    }

    const assessment = await prisma.assessment.create({
      data: {
        courseOfferingId,
        name: data.name.trim(),
        type: data.type,
        maxScore: data.maxScore,
        weightPercentage: data.weightPercentage,
        description: data.description?.trim(),
        displayOrder: data.displayOrder || offering.assessments.length + 1,
      },
    });

    await logAuditEvent({
      userId: adminUserId,
      action: 'CREATE_ASSESSMENT',
      entityName: 'Assessment',
      entityId: assessment.id,
      details: { courseOfferingId, name: assessment.name, weight: assessment.weightPercentage },
    });

    return assessment;
  }

  /**
   * Update an existing assessment component
   */
  async updateAssessment(
    assessmentId: string,
    data: Partial<AssessmentInput>,
    adminUserId: string
  ) {
    const existing = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { courseOffering: { include: { assessments: true } } },
    });

    if (!existing) {
      throw new Error('የተጠየቀው የምዘና መስፈርት አልተገኘም።');
    }

    if (data.weightPercentage !== undefined) {
      const otherAssessmentsWeight = existing.courseOffering.assessments
        .filter((a) => a.id !== assessmentId)
        .reduce((sum, a) => sum + Number(a.weightPercentage), 0);

      const newWeight = Number(data.weightPercentage);
      if (newWeight <= 0 || newWeight > 100) {
        throw new Error('የምዘናው የክብደት መጠን ከ0% እስከ 100% መካከል መሆን አለበት።');
      }

      if (otherAssessmentsWeight + newWeight > 100) {
        throw new Error(
          `የምዘናዎች ድምር ከ100% መብለጥ አይችልም። የቀሩት መስፈርቶች ድምር ${otherAssessmentsWeight}% ነው።`
        );
      }
    }

    if (data.maxScore !== undefined && data.maxScore <= 0) {
      throw new Error('የምዘናው ከፍተኛ ውጤት ከ0 በላይ መሆን አለበት።');
    }

    const updated = await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.type ? { type: data.type } : {}),
        ...(data.maxScore !== undefined ? { maxScore: data.maxScore } : {}),
        ...(data.weightPercentage !== undefined ? { weightPercentage: data.weightPercentage } : {}),
        ...(data.description !== undefined ? { description: data.description?.trim() } : {}),
        ...(data.displayOrder !== undefined ? { displayOrder: data.displayOrder } : {}),
      },
    });

    await logAuditEvent({
      userId: adminUserId,
      action: 'UPDATE_ASSESSMENT',
      entityName: 'Assessment',
      entityId: updated.id,
      details: data,
    });

    return updated;
  }

  /**
   * Delete an assessment component (only allowed if no grades have been recorded)
   */
  async deleteAssessment(assessmentId: string, adminUserId: string) {
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { grades: true },
    });

    if (!assessment) {
      throw new Error('የተጠየቀው የምዘና መስፈርት አልተገኘም።');
    }

    if (assessment.grades.length > 0) {
      throw new Error('ተማሪዎች ውጤት የተመዘገበበትን የምዘና መስፈርት መሰረዝ አይቻልም። መጀመሪያ ውጤቶቹን ያስተካክሉ።');
    }

    await prisma.assessment.delete({ where: { id: assessmentId } });

    await logAuditEvent({
      userId: adminUserId,
      action: 'DELETE_ASSESSMENT',
      entityName: 'Assessment',
      entityId: assessmentId,
      details: { name: assessment.name, courseOfferingId: assessment.courseOfferingId },
    });

    return { message: 'የምዘና መስፈርቱ በተሳካ ሁኔታ ተሰርዟል።' };
  }

  /**
   * Apply Standard 5-Component Sunday School Grading Preset:
   * 1. Attendance & Discipline: 10% (max 10)
   * 2. Assignment & Participation: 10% (max 10)
   * 3. Quiz: 20% (max 20)
   * 4. Midterm Examination: 20% (max 20)
   * 5. Final Examination: 40% (max 40)
   * Total = 100%
   */
  async applyStandardTemplate(courseOfferingId: string, adminUserId: string) {
    const offering = await prisma.courseOffering.findUnique({
      where: { id: courseOfferingId },
      include: { assessments: { include: { grades: true } } },
    });

    if (!offering) {
      throw new Error('የተመረጠው የኮርስ ምደባ አልተገኘም።');
    }

    const hasRecordedGrades = offering.assessments.some((a) => a.grades.length > 0);
    if (hasRecordedGrades) {
      throw new Error('ውጤት የተመዘገበበት ኮርስ በመሆኑ ነባሮቹን መስፈርቶች በአዲስ ቅንብር መቀየር አይቻልም።');
    }

    // Remove empty existing assessments if any
    if (offering.assessments.length > 0) {
      await prisma.assessment.deleteMany({
        where: { courseOfferingId },
      });
    }

    const standardComponents = [
      {
        name: 'ክትትል እና ስነ-ምግባር',
        type: AssessmentType.ATTENDANCE_DISCIPLINE,
        maxScore: 10,
        weightPercentage: 10,
        description: 'የሰንበት ት/ቤት መደበኛ ክትትል፣ አክብሮትና ስነ-ምግባር (10%)',
        displayOrder: 1,
      },
      {
        name: 'የቤት ስራ እና የክፍል ተሳትፎ',
        type: AssessmentType.HOMEWORK_ASSIGNMENT,
        maxScore: 10,
        weightPercentage: 10,
        description: 'የጽሑፍ እና የማንበብ የቤት ሥራዎች እንዲሁም የክፍል ውስጥ ንቁ ተሳትፎ (10%)',
        displayOrder: 2,
      },
      {
        name: 'ፈጣን ፈተና (Quiz)',
        type: AssessmentType.QUIZ,
        maxScore: 20,
        weightPercentage: 20,
        description: 'የክፍል ውስጥ ፈጣን የጽሑፍ እና የቃል ፈተናዎች (20%)',
        displayOrder: 3,
      },
      {
        name: 'አጋማሽ ፈተና (Midterm)',
        type: AssessmentType.MIDTERM_EXAM,
        maxScore: 20,
        weightPercentage: 20,
        description: 'የመንፈቀ ዓመት አጋማሽ የጽሑፍ ፈተና (20%)',
        displayOrder: 4,
      },
      {
        name: 'የማጠቃለያ ፈተና (Final Exam)',
        type: AssessmentType.FINAL_EXAM,
        maxScore: 40,
        weightPercentage: 40,
        description: 'የመንፈቀ ዓመት ማጠቃለያ አጠቃላይ ፈተና (40%)',
        displayOrder: 5,
      },
    ];

    await prisma.$transaction(
      standardComponents.map((item) =>
        prisma.assessment.create({
          data: {
            courseOfferingId,
            ...item,
          },
        })
      )
    );

    await logAuditEvent({
      userId: adminUserId,
      action: 'APPLY_STANDARD_ASSESSMENT_TEMPLATE',
      entityName: 'CourseOffering',
      entityId: courseOfferingId,
      details: { componentsCount: standardComponents.length, totalWeight: 100 },
    });

    return prisma.assessment.findMany({
      where: { courseOfferingId },
      orderBy: { displayOrder: 'asc' },
    });
  }

  // ==========================================
  // B. TEACHER COURSE DASHBOARD
  // ==========================================

  /**
   * Get all course offerings assigned to a teacher
   */
  async getTeacherAssignedCourses(teacherUserId: string) {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: teacherUserId },
    });

    if (!teacher) {
      throw new Error('የመምህር መዝገብ አልተገኘም።');
    }

    const assignments = await prisma.teacherAssignment.findMany({
      where: { teacherId: teacher.id },
      include: {
        courseOffering: {
          include: {
            course: true,
            academicYear: true,
            batch: true,
            assessments: {
              orderBy: { displayOrder: 'asc' },
            },
            gradingSchemes: {
              where: { isActive: true },
              include: { components: true },
            },
            gradeSubmissions: {
              orderBy: { version: 'desc' },
              take: 1,
            },
            _count: {
              select: { enrollments: true },
            },
          },
        },
      },
    });

    const now = new Date();

    return assignments.map((assignment) => {
      const offering = assignment.courseOffering;
      const latestSubmission = offering.gradeSubmissions[0];
      const deadline = offering.gradeDeadline ? new Date(offering.gradeDeadline) : null;
      const isOverdue = deadline ? now > deadline && !offering.isSubmissionOpen : false;

      const totalConfiguredWeight = offering.assessments.reduce(
        (sum, a) => sum + Number(a.weightPercentage),
        0
      );

      const activeScheme = offering.gradingSchemes?.[0] || null;

      return {
        offeringId: offering.id,
        courseId: offering.course.id,
        courseName: offering.course.amharicTitle || offering.course.title,
        courseCode: offering.course.code,
        creditHours: offering.course.creditHours,
        academicYearId: offering.academicYear.id,
        academicYearName: offering.academicYear.name,
        batchId: offering.batch.id,
        batchName: offering.batch.name,
        stageLevel: offering.batch.stageLevel,
        termSemester: offering.termSemester,
        enrolledStudentsCount: offering._count.enrollments,
        gradeDeadline: offering.gradeDeadline,
        isSubmissionOpen: offering.isSubmissionOpen,
        isOverdue,
        totalWeight: totalConfiguredWeight,
        assessmentsCount: activeScheme ? activeScheme.components.length : offering.assessments.length,
        appliedScheme: activeScheme
          ? {
              id: activeScheme.id,
              name: activeScheme.name,
              versionNumber: activeScheme.versionNumber,
              componentsCount: activeScheme.components.length,
            }
          : null,
        submissionStatus: latestSubmission ? latestSubmission.status : ('NOT_STARTED' as const),
        rejectionReason: latestSubmission?.rejectionReason || null,
        submissionDate: latestSubmission?.submissionDate || null,
        version: latestSubmission?.version || 0,
      };
    });
  }

  // ==========================================
  // C. GRADE ENTRY & SHEET RETRIEVAL
  // ==========================================

  /**
   * Get complete grade sheet for a course offering
   */
  async getOfferingGradesSheet(
    courseOfferingId: string,
    requestingUserId: string,
    requestingUserRole: string
  ) {
    const offering = await prisma.courseOffering.findUnique({
      where: { id: courseOfferingId },
      include: {
        course: true,
        academicYear: true,
        batch: true,
        teacherAssignments: {
          include: { teacher: { include: { user: true } } },
        },
        assessments: {
          orderBy: { displayOrder: 'asc' },
        },
        gradingSchemes: {
          where: { isActive: true },
          include: {
            components: { orderBy: { orderIndex: 'asc' } },
            originScheme: true,
          },
        },
        gradeSubmissions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
        enrollments: {
          include: {
            student: {
              include: {
                user: true,
              },
            },
            grades: true,
          },
          orderBy: {
            student: {
              admissionNumber: 'asc',
            },
          },
        },
      },
    });

    if (!offering) {
      throw new Error('የተመረጠው የኮርስ ምደባ አልተገኘም።');
    }

    // Role Security Guards:
    // Teachers may only view their assigned course offerings.
    if (requestingUserRole === 'TEACHER') {
      const isAssigned = offering.teacherAssignments.some(
        (ta) => ta.teacher.userId === requestingUserId
      );
      if (!isAssigned) {
        throw new Error('ይህንን የኮርስ ውጤት ሰነድ የመመልከት ፈቃድ የለዎትም።');
      }
    }

    const gradingScales = await this.getGradingScales();
    const latestSubmission = offering.gradeSubmissions[0];
    const activeScheme = offering.gradingSchemes?.[0] || null;

    // Use applied CourseGradingScheme if present, otherwise fall back to offering assessments
    const effectiveAssessments = activeScheme
      ? activeScheme.components.map((c) => {
          const matched = offering.assessments.find(
            (a) => a.id === c.assessmentId || a.name.trim().toLowerCase() === c.name.trim().toLowerCase()
          );
          return {
            id: matched ? matched.id : c.id,
            name: c.name,
            type: c.type,
            maxScore: Number(c.maxScore),
            weightPercentage: Number(c.percentage),
            displayOrder: c.orderIndex,
          };
        })
      : offering.assessments.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          maxScore: Number(a.maxScore),
          weightPercentage: Number(a.weightPercentage),
          displayOrder: a.displayOrder,
        }));

    const totalWeight = effectiveAssessments.reduce(
      (sum, a) => sum + Number(a.weightPercentage),
      0
    );

    const now = new Date();
    const deadline = offering.gradeDeadline ? new Date(offering.gradeDeadline) : null;
    const isPastDeadline = deadline ? now > deadline : false;
    const isLocked = isPastDeadline && !offering.isSubmissionOpen;

    // Build rows for each enrolled student using effectiveAssessments
    const studentRows = offering.enrollments.map((enrollment) => {
      let calculatedTotal = 0;
      const gradesMap: Record<string, { scoreObtained: number; isExempt: boolean; feedback?: string }> = {};

      for (const assessment of effectiveAssessments) {
        const gradeRecord = enrollment.grades.find((g) => g.assessmentId === assessment.id);
        if (gradeRecord) {
          const score = Number(gradeRecord.scoreObtained);
          gradesMap[assessment.id] = {
            scoreObtained: score,
            isExempt: gradeRecord.isExempt,
            feedback: gradeRecord.feedback || undefined,
          };

          if (!gradeRecord.isExempt && Number(assessment.maxScore) > 0) {
            const componentWeightedScore =
              (score / Number(assessment.maxScore)) * Number(assessment.weightPercentage);
            calculatedTotal += componentWeightedScore;
          }
        }
      }

      calculatedTotal = Math.round(calculatedTotal * 100) / 100;

      // Find matching letter grade from scale
      const matchedScale = gradingScales.find(
        (scale) => calculatedTotal >= Number(scale.minScore) && calculatedTotal <= Number(scale.maxScore)
      ) || gradingScales[gradingScales.length - 1];

      return {
        enrollmentId: enrollment.id,
        studentId: enrollment.student.id,
        admissionNumber: enrollment.student.admissionNumber,
        fullName: `${enrollment.student.user.firstName} ${enrollment.student.user.lastName} ${enrollment.student.user.grandfatherName || ''}`.trim(),
        baptismalName: enrollment.student.baptismalName,
        phone: enrollment.student.user.phone,
        grades: gradesMap,
        totalScore: calculatedTotal,
        letterGrade: matchedScale ? matchedScale.letterGrade : 'F',
        gradeAmharicLabel: matchedScale ? matchedScale.amharicLabel : 'የሚሻሻል',
        isPassed: matchedScale ? matchedScale.isPassing : false,
        finalNumericScore: enrollment.finalNumericScore ? Number(enrollment.finalNumericScore) : null,
        finalLetterGrade: enrollment.finalLetterGrade,
      };
    });

    return {
      offering: {
        id: offering.id,
        courseName: offering.course.amharicTitle || offering.course.title,
        courseCode: offering.course.code,
        creditHours: offering.course.creditHours,
        academicYearName: offering.academicYear.name,
        batchName: offering.batch.name,
        termSemester: offering.termSemester,
        gradeDeadline: offering.gradeDeadline,
        isSubmissionOpen: offering.isSubmissionOpen,
        isLocked,
        teachers: offering.teacherAssignments.map(
          (ta) => `${ta.teacher.spiritualTitle || ''} ${ta.teacher.user.firstName} ${ta.teacher.user.lastName}`.trim()
        ),
      },
      appliedScheme: activeScheme
        ? {
            id: activeScheme.id,
            name: activeScheme.name,
            versionNumber: activeScheme.versionNumber,
            originSchemeName: activeScheme.originScheme?.name,
            components: activeScheme.components.map((c) => ({
              id: c.id,
              name: c.name,
              percentage: Number(c.percentage),
              maxScore: Number(c.maxScore),
              type: c.type,
              orderIndex: c.orderIndex,
            })),
          }
        : null,
      assessments: effectiveAssessments,
      totalWeight,
      gradingScales,
      latestSubmission: latestSubmission
        ? {
            id: latestSubmission.id,
            status: latestSubmission.status,
            submissionDate: latestSubmission.submissionDate,
            rejectionReason: latestSubmission.rejectionReason,
            notes: latestSubmission.notes,
            version: latestSubmission.version,
          }
        : null,
      students: studentRows,
    };
  }

  /**
   * Save grade entry draft for multiple students in a course offering
   */
  async saveDraftGrades(
    courseOfferingId: string,
    teacherUserId: string,
    items: SaveGradeItemInput[]
  ) {
    const offering = await prisma.courseOffering.findUnique({
      where: { id: courseOfferingId },
      include: {
        teacherAssignments: { include: { teacher: true } },
        assessments: true,
        gradeSubmissions: { orderBy: { version: 'desc' }, take: 1 },
      },
    });

    if (!offering) {
      throw new Error('የተመረጠው የኮርስ ምደባ አልተገኘም።');
    }

    // 1. Verify Teacher is assigned
    const isAssigned = offering.teacherAssignments.some(
      (ta) => ta.teacher.userId === teacherUserId
    );
    if (!isAssigned) {
      throw new Error('ይህንን ኮርስ ለማስተማር ስላልተመደቡ ውጤት ማስገባት አይችሉም።');
    }

    // 2. Server-side deadline validation
    const now = new Date();
    if (offering.gradeDeadline && now > new Date(offering.gradeDeadline) && !offering.isSubmissionOpen) {
      throw new Error(
        'የውጤት ማስረከቢያ የመጨረሻ ቀን አልፏል። ውጤት ለማስገባት ወይም ለማስተካከል እባክዎ ጊዜው እንዲራዘም አስተዳዳሪውን ያነጋግሩ።'
      );
    }

    // 3. Status check: cannot modify APPROVED or PUBLISHED grades directly
    const latestSubmission = offering.gradeSubmissions[0];
    if (
      latestSubmission &&
      (latestSubmission.status === GradeSubmissionStatus.APPROVED ||
        latestSubmission.status === GradeSubmissionStatus.PUBLISHED)
    ) {
      throw new Error(
        'የጸደቀ ወይም የታተመ ውጤት ያለ አስተዳዳሪ ልዩ ፈቃድ ሊቀየር አይችልም።'
      );
    }

    // 4. Validate all score items against maxScore
    const assessmentsMap = new Map(offering.assessments.map((a) => [a.id, a]));

    for (const item of items) {
      const assessment = assessmentsMap.get(item.assessmentId);
      if (!assessment) {
        throw new Error('ልክ ያልሆነ የምዘና መስፈርት መለያ ተልኳል።');
      }

      const score = Number(item.scoreObtained);
      if (isNaN(score) || score < 0) {
        throw new Error(`ውጤት ከ0 በታች ሊሆን አይችልም (${assessment.name})።`);
      }

      if (score > Number(assessment.maxScore)) {
        throw new Error(
          `ለ'${assessment.name}' የተመዘገበው ውጤት (${score}) ከተፈቀደው ከፍተኛ ውጤት (${assessment.maxScore}) መብለጥ አይችልም።`
        );
      }
    }

    // 5. Query student IDs for enrollments
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { courseOfferingId },
      select: { id: true, studentId: true },
    });
    const enrollmentStudentMap = new Map(enrollments.map((e) => [e.id, e.studentId]));

    // 6. Execute atomic transaction
    await prisma.$transaction(async (tx) => {
      // Upsert grade items
      for (const item of items) {
        const studentId = enrollmentStudentMap.get(item.enrollmentId);
        if (!studentId) continue;

        await tx.grade.upsert({
          where: {
            enrollmentId_assessmentId: {
              enrollmentId: item.enrollmentId,
              assessmentId: item.assessmentId,
            },
          },
          update: {
            scoreObtained: item.scoreObtained,
            isExempt: item.isExempt || false,
            feedback: item.feedback?.trim(),
            recordedById: teacherUserId,
          },
          create: {
            enrollmentId: item.enrollmentId,
            assessmentId: item.assessmentId,
            studentId,
            scoreObtained: item.scoreObtained,
            isExempt: item.isExempt || false,
            feedback: item.feedback?.trim(),
            recordedById: teacherUserId,
          },
        });
      }

      // Upsert GradeSubmission as DRAFT if not existing
      if (!latestSubmission || latestSubmission.status === GradeSubmissionStatus.REJECTED) {
        await tx.gradeSubmission.create({
          data: {
            courseOfferingId,
            submittedById: teacherUserId,
            status: GradeSubmissionStatus.DRAFT,
            version: latestSubmission ? latestSubmission.version + 1 : 1,
            notes: 'የመምህር ረቂቅ ውጤት',
          },
        });
      }
    });

    await logAuditEvent({
      userId: teacherUserId,
      action: 'SAVE_GRADE_DRAFT',
      entityName: 'GradeSubmission',
      entityId: courseOfferingId,
      details: { itemsUpdated: items.length },
    });

    return { message: 'ረቂቅ ውጤት በተሳካ ሁኔታ ተቀምጧል።' };
  }

  /**
   * Submit complete grade packet for admin review and approval
   */
  async submitGradesForApproval(
    courseOfferingId: string,
    teacherUserId: string,
    notes?: string
  ) {
    const offering = await prisma.courseOffering.findUnique({
      where: { id: courseOfferingId },
      include: {
        teacherAssignments: { include: { teacher: true } },
        assessments: true,
        enrollments: {
          include: {
            student: { include: { user: true } },
            grades: true,
          },
        },
        gradeSubmissions: { orderBy: { version: 'desc' }, take: 1 },
      },
    });

    if (!offering) {
      throw new Error('የተመረጠው የኮርስ ምደባ አልተገኘም።');
    }

    // 1. Verify Teacher assignment
    const isAssigned = offering.teacherAssignments.some(
      (ta) => ta.teacher.userId === teacherUserId
    );
    if (!isAssigned) {
      throw new Error('ይህንን ኮርስ ለማስተማር ስላልተመደቡ ውጤት ማቅረብ አይችሉም።');
    }

    // 2. Deadline check
    const now = new Date();
    if (offering.gradeDeadline && now > new Date(offering.gradeDeadline) && !offering.isSubmissionOpen) {
      throw new Error('የውጤት ማስረከቢያ ጊዜ አልቋል። እባክዎ ጊዜው እንዲራዘም አስተዳዳሪውን ያነጋግሩ።');
    }

    // 3. Validate total assessment weight equals 100%
    const totalWeight = offering.assessments.reduce(
      (sum, a) => sum + Number(a.weightPercentage),
      0
    );

    if (Math.round(totalWeight) !== 100) {
      throw new Error(
        `ውጤት ለማጽደቅ ከማቅረብዎ በፊት የምዘና መስፈርቶች የክብደት ድምር 100% መሆን አለበት። የአሁኑ ድምር ${totalWeight}% ነው።`
      );
    }

    // 4. Validate enrollment count
    if (offering.enrollments.length === 0) {
      throw new Error('በዚህ ኮርስ የተመዘገቡ ተማሪዎች ስለሌሉ ውጤት ማቅረብ አይቻልም።');
    }

    // 5. Validate that EVERY enrolled student has a score for EVERY assessment (or marked exempt)
    const missingEntries: string[] = [];
    for (const enrollment of offering.enrollments) {
      const studentName = `${enrollment.student.user.firstName} ${enrollment.student.user.lastName}`;
      for (const assessment of offering.assessments) {
        const grade = enrollment.grades.find((g) => g.assessmentId === assessment.id);
        if (!grade && !grade?.isExempt) {
          missingEntries.push(`${studentName} (${assessment.name})`);
        }
      }
    }

    if (missingEntries.length > 0) {
      throw new Error(
        `ውጤት ላልተሞላላቸው ተማሪዎች ውጤት ሳያስገቡ ማቅረብ አይቻልም፦ ${missingEntries.slice(0, 5).join('፣ ')}${missingEntries.length > 5 ? ` እና ሌሎች ተጨማሪ ${missingEntries.length - 5}` : ''}።`
      );
    }

    const latestSubmission = offering.gradeSubmissions[0];
    const newVersion = latestSubmission ? latestSubmission.version + 1 : 1;

    let submission;

    await prisma.$transaction(async (tx) => {
      // Create new submission record
      submission = await tx.gradeSubmission.create({
        data: {
          courseOfferingId,
          submittedById: teacherUserId,
          status: GradeSubmissionStatus.SUBMITTED,
          submissionDate: new Date(),
          version: newVersion,
          notes: notes?.trim() || 'የተጠናቀቀ የውጤት ሰነድ ለማጽደቂያ ቀርቧል',
        },
      });

      // Update offering status
      await tx.courseOffering.update({
        where: { id: courseOfferingId },
        data: { status: OfferingStatus.GRADES_PENDING },
      });

      // Notify Admins
      const admins = await tx.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, isActive: true },
        select: { id: true },
      });

      for (const admin of admins) {
        await tx.notification.create({
          data: {
            userId: admin.id,
            type: NotificationType.GRADE_SUBMITTED,
            title: 'አዲስ የውጤት ሰነድ ለማጽደቅ ቀርቧል',
            message: `መምህር ${teacherUserId} ለኮርስ '${offering.id}' የተማሪዎች ውጤት አቅርቧል። እባክዎ መርምረው ያጽድቁ።`,
            linkUrl: `/dashboard?tab=approvals&offeringId=${courseOfferingId}`,
          },
        });
      }
    });

    await logAuditEvent({
      userId: teacherUserId,
      action: 'SUBMIT_GRADES_FOR_APPROVAL',
      entityName: 'GradeSubmission',
      entityId: submission ? (submission as any).id : courseOfferingId,
      details: { courseOfferingId, version: newVersion, enrolledCount: offering.enrollments.length },
    });

    return { message: 'የተማሪዎች ውጤት ለማጽደቅ በተሳካ ሁኔታ ቀርቧል።', submission };
  }

  // ==========================================
  // D. DEADLINE MANAGEMENT
  // ==========================================

  /**
   * Set or extend grade entry deadline for a course offering
   */
  async setOfferingDeadline(
    courseOfferingId: string,
    adminUserId: string,
    data: { gradeDeadline?: Date | string | null; isSubmissionOpen: boolean }
  ) {
    const offering = await prisma.courseOffering.findUnique({
      where: { id: courseOfferingId },
    });

    if (!offering) {
      throw new Error('የተመረጠው የኮርስ ምደባ አልተገኘም።');
    }

    const updated = await prisma.courseOffering.update({
      where: { id: courseOfferingId },
      data: {
        gradeDeadline: data.gradeDeadline ? new Date(data.gradeDeadline) : null,
        isSubmissionOpen: data.isSubmissionOpen,
      },
    });

    await logAuditEvent({
      userId: adminUserId,
      action: 'SET_GRADE_DEADLINE',
      entityName: 'CourseOffering',
      entityId: courseOfferingId,
      details: {
        previousDeadline: offering.gradeDeadline,
        newDeadline: updated.gradeDeadline,
        isSubmissionOpen: updated.isSubmissionOpen,
      },
    });

    // Notify assigned teachers of deadline update
    if (updated.gradeDeadline) {
      const assignments = await prisma.teacherAssignment.findMany({
        where: { courseOfferingId },
        include: { teacher: true },
      });
      for (const a of assignments) {
        await prisma.notification.create({
          data: {
            userId: a.teacher.userId,
            type: 'DEADLINE_APPROACHING',
            title: 'የውጤት ማስረከቢያ ቀነ-ገደብ ማሳሰቢያ',
            message: `የውጤት ማስረከቢያ የመጨረሻ ቀን ${new Date(updated.gradeDeadline).toLocaleDateString()} ተወስኗል። እባክዎ በወቅቱ ውጤት ያስገቡ።`,
            linkUrl: `/dashboard?tab=grades&offeringId=${courseOfferingId}`,
          },
        }).catch(() => {});
      }
    }

    return updated;
  }

  /**
   * Get all deadlines overview with urgency flags and overdue indicators
   */
  async getDeadlinesOverview(academicYearId?: string) {
    const offerings = await prisma.courseOffering.findMany({
      where: {
        ...(academicYearId ? { academicYearId } : {}),
      },
      include: {
        course: true,
        academicYear: true,
        batch: true,
        teacherAssignments: {
          include: { teacher: { include: { user: true } } },
        },
        gradeSubmissions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
        _count: {
          select: { enrollments: true },
        },
      },
      orderBy: { gradeDeadline: 'asc' },
    });

    const now = new Date();

    return offerings.map((o) => {
      const latest = o.gradeSubmissions[0];
      const deadline = o.gradeDeadline ? new Date(o.gradeDeadline) : null;
      const isOverdue = deadline ? now > deadline && !o.isSubmissionOpen : false;
      const daysRemaining = deadline
        ? Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        id: o.id,
        courseName: o.course.amharicTitle || o.course.title,
        courseCode: o.course.code,
        academicYearName: o.academicYear.name,
        batchName: o.batch.name,
        enrolledCount: o._count.enrollments,
        teachers: o.teacherAssignments.map(
          (ta) => `${ta.teacher.spiritualTitle || ''} ${ta.teacher.user.firstName} ${ta.teacher.user.lastName}`.trim()
        ),
        gradeDeadline: o.gradeDeadline,
        isSubmissionOpen: o.isSubmissionOpen,
        isOverdue,
        daysRemaining,
        submissionStatus: latest ? latest.status : ('NOT_STARTED' as const),
      };
    });
  }

  // ==========================================
  // E. GRADE APPROVAL WORKFLOW
  // ==========================================

  /**
   * Get all submissions awaiting Admin review
   */
  async getSubmissionsForReview(filters?: { status?: GradeSubmissionStatus; academicYearId?: string }) {
    const submissions = await prisma.gradeSubmission.findMany({
      where: {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.academicYearId
          ? { courseOffering: { academicYearId: filters.academicYearId } }
          : {}),
      },
      include: {
        courseOffering: {
          include: {
            course: true,
            academicYear: true,
            batch: true,
            assessments: true,
            gradingSchemes: {
              where: { isActive: true },
              include: { components: true },
            },
            _count: { select: { enrollments: true } },
          },
        },
        submittedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            phone: true,
          },
        },
        approvals: {
          orderBy: { decidedAt: 'desc' },
          include: {
            approvedBy: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return submissions;
  }

  /**
   * Approve grade submission:
   * 1. Teachers cannot approve their own submissions.
   * 2. Calculate weighted numeric totals and map to official grading scale letters.
   * 3. Update StudentEnrollment with finalNumericScore, finalLetterGrade, isPassed.
   * 4. Transition status to APPROVED.
   * 5. Record GradeApproval.
   * 6. AuditLog entry.
   */
  async approveSubmission(submissionId: string, adminUserId: string, comments?: string) {
    const submission = await prisma.gradeSubmission.findUnique({
      where: { id: submissionId },
      include: {
        courseOffering: {
          include: {
            assessments: true,
            gradingSchemes: {
              where: { isActive: true },
              include: { components: true },
            },
            enrollments: {
              include: {
                grades: true,
                student: { include: { user: true } },
              },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new Error('የተጠየቀው የውጤት ሰነድ አልተገኘም።');
    }

    // Security Rule: Teachers cannot approve their own grades!
    if (submission.submittedById === adminUserId) {
      throw new Error('መምህሩ ራሱ ያስገባውን ውጤት ራሱ ማጽደቅ አይችልም። ሌላ ስልጣን ያለው አስተዳዳሪ ማጽደቅ አለበት።');
    }

    if (submission.status === GradeSubmissionStatus.APPROVED) {
      throw new Error('ይህ የውጤት ሰነድ አስቀድሞ ጸድቋል።');
    }

    const scales = await this.getGradingScales();
    const offering = submission.courseOffering;
    const activeScheme = offering.gradingSchemes?.[0] || null;

    const effectiveAssessments = activeScheme
      ? activeScheme.components.map((c) => {
          const matched = offering.assessments.find(
            (a) => a.id === c.assessmentId || a.name.trim().toLowerCase() === c.name.trim().toLowerCase()
          );
          return {
            id: matched ? matched.id : c.id,
            name: c.name,
            maxScore: Number(c.maxScore),
            weightPercentage: Number(c.percentage),
          };
        })
      : offering.assessments.map((a) => ({
          id: a.id,
          name: a.name,
          maxScore: Number(a.maxScore),
          weightPercentage: Number(a.weightPercentage),
        }));

    await prisma.$transaction(async (tx) => {
      // 1. Calculate and update each student's final score and letter grade using course-specific scheme
      for (const enrollment of offering.enrollments) {
        let studentWeightedTotal = 0;

        for (const assessment of effectiveAssessments) {
          const grade = enrollment.grades.find((g) => g.assessmentId === assessment.id);
          if (grade && !grade.isExempt && Number(assessment.maxScore) > 0) {
            const part =
              (Number(grade.scoreObtained) / Number(assessment.maxScore)) *
              Number(assessment.weightPercentage);
            studentWeightedTotal += part;
          }
        }

        studentWeightedTotal = Math.round(studentWeightedTotal * 100) / 100;

        // Match grading scale
        const scale =
          scales.find(
            (s) => studentWeightedTotal >= Number(s.minScore) && studentWeightedTotal <= Number(s.maxScore)
          ) || scales[scales.length - 1];

        await tx.studentEnrollment.update({
          where: { id: enrollment.id },
          data: {
            finalNumericScore: studentWeightedTotal,
            finalLetterGrade: scale ? scale.letterGrade : 'F',
            isPassed: scale ? scale.isPassing : false,
          },
        });
      }

      // 2. Update GradeSubmission status to APPROVED
      await tx.gradeSubmission.update({
        where: { id: submissionId },
        data: {
          status: GradeSubmissionStatus.APPROVED,
          rejectionReason: null,
        },
      });

      // 3. Create GradeApproval record
      await tx.gradeApproval.create({
        data: {
          gradeSubmissionId: submissionId,
          approvedById: adminUserId,
          decision: ApprovalDecision.APPROVED,
          comments: comments?.trim() || 'ውጤቱ በአስተዳዳሪው ተመርምሮ ጸድቋል',
        },
      });

      // 4. Update CourseOffering status
      await tx.courseOffering.update({
        where: { id: offering.id },
        data: { status: OfferingStatus.COMPLETED },
      });

      // 5. Notify Teacher
      await tx.notification.create({
        data: {
          userId: submission.submittedById,
          type: NotificationType.GRADE_APPROVED,
          title: 'የውጤት ሰነድ ጸድቋል',
          message: `ያቀረቡት የኮርስ ውጤት ሰነድ በአስተዳዳሪው ጸድቋል።`,
          linkUrl: `/dashboard?tab=grades&offeringId=${offering.id}`,
        },
      });
    });

    await logAuditEvent({
      userId: adminUserId,
      action: 'APPROVE_GRADE_SUBMISSION',
      entityName: 'GradeSubmission',
      entityId: submissionId,
      details: { courseOfferingId: offering.id, comments },
    });

    return { message: 'የውጤት ሰነዱ በተሳካ ሁኔታ ጸድቋል።' };
  }

  /**
   * Reject grade submission with mandatory Amharic reason:
   * Returns sheet to teacher for correction and unlocks submission.
   */
  async rejectSubmission(
    submissionId: string,
    adminUserId: string,
    rejectionReason: string,
    comments?: string
  ) {
    if (!rejectionReason || rejectionReason.trim().length === 0) {
      throw new Error('ውጤት ውድቅ ሲደረግ የግዴታ ምክንያቱ በአማርኛ መገለጽ አለበት።');
    }

    const submission = await prisma.gradeSubmission.findUnique({
      where: { id: submissionId },
      include: { courseOffering: true },
    });

    if (!submission) {
      throw new Error('የተጠየቀው የውጤት ሰነድ አልተገኘም።');
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update submission status to REJECTED and save reason
      await tx.gradeSubmission.update({
        where: { id: submissionId },
        data: {
          status: GradeSubmissionStatus.REJECTED,
          rejectionReason: rejectionReason.trim(),
        },
      });

      // 2. Create rejection approval record
      await tx.gradeApproval.create({
        data: {
          gradeSubmissionId: submissionId,
          approvedById: adminUserId,
          decision: ApprovalDecision.REJECTED,
          comments: comments?.trim() || rejectionReason.trim(),
        },
      });

      // 3. Reopen course offering submission so teacher can correct it
      await tx.courseOffering.update({
        where: { id: submission.courseOfferingId },
        data: { isSubmissionOpen: true },
      });

      // 4. Notify Teacher with the mandatory reason
      await tx.notification.create({
        data: {
          userId: submission.submittedById,
          type: NotificationType.GRADE_REJECTED,
          title: 'የውጤት ሰነድ ማስተካከያ ተጠይቆበታል',
          message: `ያቀረቡት የኮርስ ውጤት ውድቅ ተደርጓል። ምክንያት፦ ${rejectionReason.trim()}። እባክዎ አስተካክለው በድጋሚ ያቅርቡ።`,
          linkUrl: `/dashboard?tab=grades&offeringId=${submission.courseOfferingId}`,
        },
      });
    });

    await logAuditEvent({
      userId: adminUserId,
      action: 'REJECT_GRADE_SUBMISSION',
      entityName: 'GradeSubmission',
      entityId: submissionId,
      details: { rejectionReason, comments },
    });

    return { message: 'የውጤት ሰነዱ ውድቅ ተደርጎ ለማስተካከያ ወደ መምህሩ ተመልሷል።' };
  }

  /**
   * Publish approved grade results for student visibility
   */
  async publishSubmission(submissionId: string, adminUserId: string) {
    const submission = await prisma.gradeSubmission.findUnique({
      where: { id: submissionId },
      include: {
        courseOffering: {
          include: {
            enrollments: { include: { student: true } },
          },
        },
      },
    });

    if (!submission) {
      throw new Error('የተጠየቀው የውጤት ሰነድ አልተገኘም።');
    }

    if (submission.status !== GradeSubmissionStatus.APPROVED) {
      throw new Error('ውጤትን ይፋ ማድረግ የሚቻለው አስቀድሞ በስልጣን ባለው አስተዳዳሪ የጸደቀ ከሆነ ብቻ ነው።');
    }

    await prisma.$transaction(async (tx) => {
      // 1. Set status to PUBLISHED
      await tx.gradeSubmission.update({
        where: { id: submissionId },
        data: {
          status: GradeSubmissionStatus.PUBLISHED,
          publishedAt: new Date(),
          publishedById: adminUserId,
        },
      });

      // 2. Notify all enrolled students that their grades are published
      for (const enrollment of submission.courseOffering.enrollments) {
        await tx.notification.create({
          data: {
            userId: enrollment.student.userId,
            type: NotificationType.RESULTS_PUBLISHED,
            title: 'አዲስ የኮርስ ውጤት ይፋ ሆኗል',
            message: 'የወሰዱት የኮርስ ውጤት በይፋ ታትሟል። በዳሽቦርድዎ ላይ መመልከት ይችላሉ።',
            linkUrl: '/dashboard?tab=results',
          },
        });
      }
    });

    await logAuditEvent({
      userId: adminUserId,
      action: 'PUBLISH_GRADE_SUBMISSION',
      entityName: 'GradeSubmission',
      entityId: submissionId,
      details: { courseOfferingId: submission.courseOfferingId },
    });

    return { message: 'የተማሪዎች ውጤት በይፋ ለተማሪዎች ታትሟል።' };
  }

  /**
   * Reopen a grade submission for modification with mandatory audit reasoning
   */
  async reopenSubmission(submissionId: string, adminUserId: string, reason: string) {
    if (!reason || reason.trim().length === 0) {
      throw new Error('ውጤት ዳግም ሲከፈት ምክንያቱ በግልጽ መመዝገብ አለበት።');
    }

    const submission = await prisma.gradeSubmission.findUnique({
      where: { id: submissionId },
      include: { courseOffering: true },
    });

    if (!submission) {
      throw new Error('የተጠየቀው የውጤት ሰነድ አልተገኘም።');
    }

    await prisma.$transaction(async (tx) => {
      await tx.gradeSubmission.update({
        where: { id: submissionId },
        data: {
          status: GradeSubmissionStatus.DRAFT,
          notes: `በአስተዳዳሪው ዳግም የተከፈተ። ምክንያት፦ ${reason.trim()}`,
        },
      });

      await tx.courseOffering.update({
        where: { id: submission.courseOfferingId },
        data: { isSubmissionOpen: true },
      });
    });

    await logAuditEvent({
      userId: adminUserId,
      action: 'REOPEN_GRADE_SUBMISSION',
      entityName: 'GradeSubmission',
      entityId: submissionId,
      details: { reason, previousStatus: submission.status },
    });

    return { message: 'የውጤት ሰነዱ ለማስተካከያ ዳግም ተከፍቷል።' };
  }

  // ==========================================
  // F. STUDENT RESULT VIEW
  // ==========================================

  /**
   * Student views their own officially PUBLISHED results only
   */
  async getStudentPublishedResults(studentUserId: string, academicYearId?: string) {
    const student = await prisma.student.findUnique({
      where: { userId: studentUserId },
      include: { user: true },
    });

    if (!student) {
      throw new Error('የተማሪ መዝገብ አልተገኘም።');
    }

    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        studentId: student.id,
        courseOffering: {
          ...(academicYearId ? { academicYearId } : {}),
          // Student can ONLY see PUBLISHED grades
          gradeSubmissions: {
            some: {
              status: GradeSubmissionStatus.PUBLISHED,
            },
          },
        },
      },
      include: {
        courseOffering: {
          include: {
            course: true,
            academicYear: true,
            batch: true,
            assessments: { orderBy: { displayOrder: 'asc' } },
            gradingSchemes: {
              where: { isActive: true },
              include: { components: true },
            },
            gradeSubmissions: {
              where: { status: GradeSubmissionStatus.PUBLISHED },
              orderBy: { publishedAt: 'desc' },
              take: 1,
            },
          },
        },
        grades: {
          include: {
            assessment: true,
          },
        },
      },
    });

    const scales = await this.getGradingScales();

    const results = enrollments.map((e) => {
      const offering = e.courseOffering;
      const latestPublished = offering.gradeSubmissions[0];
      const activeScheme = offering.gradingSchemes?.[0] || null;

      const effectiveAssessments = activeScheme
        ? activeScheme.components.map((c) => {
            const matched = offering.assessments.find(
              (a) => a.id === c.assessmentId || a.name.trim().toLowerCase() === c.name.trim().toLowerCase()
            );
            return {
              id: matched ? matched.id : c.id,
              name: c.name,
              type: c.type,
              maxScore: Number(c.maxScore),
              weightPercentage: Number(c.percentage),
            };
          })
        : offering.assessments.map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type,
            maxScore: Number(a.maxScore),
            weightPercentage: Number(a.weightPercentage),
          }));

      const assessmentBreakdown = effectiveAssessments.map((a) => {
        const gradeRecord = e.grades.find((g) => g.assessmentId === a.id);
        const score = gradeRecord ? Number(gradeRecord.scoreObtained) : 0;
        const weightedScore =
          !gradeRecord?.isExempt && Number(a.maxScore) > 0
            ? Math.round(((score / Number(a.maxScore)) * Number(a.weightPercentage)) * 100) / 100
            : 0;

        return {
          assessmentName: a.name,
          assessmentType: a.type,
          maxScore: Number(a.maxScore),
          weightPercentage: Number(a.weightPercentage),
          scoreObtained: score,
          weightedScore,
          isExempt: gradeRecord?.isExempt || false,
        };
      });

      const numericScore = e.finalNumericScore ? Number(e.finalNumericScore) : 0;
      const matchedScale = scales.find((s) => s.letterGrade === e.finalLetterGrade);

      return {
        enrollmentId: e.id,
        courseName: offering.course.amharicTitle || offering.course.title,
        courseCode: offering.course.code,
        creditHours: offering.course.creditHours,
        academicYearName: offering.academicYear.name,
        batchName: offering.batch.name,
        termSemester: offering.termSemester,
        appliedSchemeName: activeScheme?.name,
        assessmentBreakdown,
        totalScore: numericScore,
        letterGrade: e.finalLetterGrade || 'F',
        gradeAmharicLabel: matchedScale?.amharicLabel || '',
        gradePoint: matchedScale ? Number(matchedScale.gradePoint) : 0,
        isPassed: e.isPassed ?? false,
        publishedAt: latestPublished?.publishedAt || null,
      };
    });

    // Compute overall GPA
    let totalCreditHours = 0;
    let totalGradePoints = 0;

    for (const r of results) {
      totalCreditHours += r.creditHours;
      totalGradePoints += r.gradePoint * r.creditHours;
    }

    const gpa = totalCreditHours > 0 ? Math.round((totalGradePoints / totalCreditHours) * 100) / 100 : 0;

    return {
      student: {
        id: student.id,
        admissionNumber: student.admissionNumber,
        fullName: `${student.user.firstName} ${student.user.lastName} ${student.user.grandfatherName || ''}`.trim(),
        baptismalName: student.baptismalName,
      },
      results,
      summary: {
        totalCoursesTaken: results.length,
        totalCreditHours,
        gpa,
      },
    };
  }

  // ==========================================
  // G. ACADEMIC REPORTS & TRANSCRIPTS
  // ==========================================

  /**
   * Course-wise Results Report
   */
  async getCourseReport(courseOfferingId: string) {
    const offering = await prisma.courseOffering.findUnique({
      where: { id: courseOfferingId },
      include: {
        course: true,
        academicYear: true,
        batch: true,
        teacherAssignments: { include: { teacher: { include: { user: true } } } },
        assessments: { orderBy: { displayOrder: 'asc' } },
        enrollments: {
          include: {
            student: { include: { user: true } },
            grades: true,
          },
        },
      },
    });

    if (!offering) throw new Error('የተመረጠው የኮርስ ምደባ አልተገኘም።');

    const totalStudents = offering.enrollments.length;
    let passedCount = 0;
    let failedCount = 0;
    let totalNumericSum = 0;
    const gradeDistribution: Record<string, number> = {};

    const studentList = offering.enrollments.map((enr) => {
      const score = enr.finalNumericScore ? Number(enr.finalNumericScore) : 0;
      const letter = enr.finalLetterGrade || 'F';

      if (enr.isPassed) passedCount++;
      else failedCount++;

      totalNumericSum += score;
      gradeDistribution[letter] = (gradeDistribution[letter] || 0) + 1;

      return {
        admissionNumber: enr.student.admissionNumber,
        fullName: `${enr.student.user.firstName} ${enr.student.user.lastName}`,
        baptismalName: enr.student.baptismalName,
        score,
        letterGrade: letter,
        isPassed: enr.isPassed,
      };
    });

    // Sort by score desc for ranking
    studentList.sort((a, b) => b.score - a.score);

    const averageScore = totalStudents > 0 ? Math.round((totalNumericSum / totalStudents) * 100) / 100 : 0;
    const passRate = totalStudents > 0 ? Math.round((passedCount / totalStudents) * 100) : 0;

    return {
      courseName: offering.course.amharicTitle || offering.course.title,
      courseCode: offering.course.code,
      academicYear: offering.academicYear.name,
      batch: offering.batch.name,
      teachers: offering.teacherAssignments.map(
        (ta) => `${ta.teacher.spiritualTitle || ''} ${ta.teacher.user.firstName} ${ta.teacher.user.lastName}`.trim()
      ),
      metrics: {
        totalStudents,
        passedCount,
        failedCount,
        averageScore,
        passRate,
        highestScore: studentList[0]?.score || 0,
        lowestScore: studentList[studentList.length - 1]?.score || 0,
        gradeDistribution,
      },
      students: studentList,
    };
  }

  /**
   * Batch-wise Results Report
   */
  async getBatchReport(batchId: string) {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        academicYear: true,
        students: { include: { user: true, enrollments: true } },
        courseOfferings: {
          include: {
            course: true,
            enrollments: true,
          },
        },
      },
    });

    if (!batch) throw new Error('የተጠየቀው ምድብ አልተገኘም።');

    const totalStudents = batch.students.length;
    const totalCourses = batch.courseOfferings.length;

    const studentSummaries = batch.students.map((student) => {
      const studentEnrollments = student.enrollments;
      const completedCourses = studentEnrollments.filter((e) => e.finalNumericScore !== null);
      const totalScore = completedCourses.reduce((sum, e) => sum + Number(e.finalNumericScore), 0);
      const avgScore = completedCourses.length > 0 ? Math.round((totalScore / completedCourses.length) * 100) / 100 : 0;

      return {
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        fullName: `${student.user.firstName} ${student.user.lastName}`,
        baptismalName: student.baptismalName,
        coursesTaken: completedCourses.length,
        averageScore: avgScore,
      };
    });

    studentSummaries.sort((a, b) => b.averageScore - a.averageScore);

    return {
      batchName: batch.name,
      stageLevel: batch.stageLevel,
      academicYearName: batch.academicYear.name,
      totalStudents,
      totalCourses,
      students: studentSummaries,
    };
  }

  /**
   * Official Student Academic Transcript (የተማሪ የውጤት ካርድ / Transcript)
   */
  async getStudentTranscript(studentId: string) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        academicYear: true,
        batch: true,
        registrations: {
          include: { academicYear: true, batch: true },
          orderBy: { registeredAt: 'asc' },
        },
        enrollments: {
          include: {
            courseOffering: {
              include: {
                course: true,
                academicYear: true,
                batch: true,
                gradeSubmissions: {
                  where: { status: GradeSubmissionStatus.PUBLISHED },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!student) throw new Error('የተማሪ መዝገብ አልተገኘም።');

    const scales = await this.getGradingScales();

    // Group enrollments by Academic Year & Batch
    const historyMap = new Map<string, any>();

    for (const enr of student.enrollments) {
      const offering = enr.courseOffering;
      const yearName = offering.academicYear.name;
      const batchName = offering.batch.name;
      const key = `${yearName}__${batchName}`;

      if (!historyMap.has(key)) {
        historyMap.set(key, {
          academicYearName: yearName,
          batchName,
          termSemester: offering.termSemester,
          courses: [],
        });
      }

      const matchedScale = scales.find((s) => s.letterGrade === enr.finalLetterGrade);

      historyMap.get(key).courses.push({
        courseCode: offering.course.code,
        courseName: offering.course.amharicTitle || offering.course.title,
        creditHours: offering.course.creditHours,
        score: enr.finalNumericScore ? Number(enr.finalNumericScore) : null,
        letterGrade: enr.finalLetterGrade || '-',
        gradePoint: matchedScale ? Number(matchedScale.gradePoint) : 0,
        isPassed: enr.isPassed,
      });
    }

    let grandTotalCredits = 0;
    let grandTotalPoints = 0;

    const academicTerms = Array.from(historyMap.values()).map((term) => {
      let termCredits = 0;
      let termPoints = 0;

      for (const c of term.courses) {
        if (c.score !== null) {
          termCredits += c.creditHours;
          termPoints += c.gradePoint * c.creditHours;
        }
      }

      const termGpa = termCredits > 0 ? Math.round((termPoints / termCredits) * 100) / 100 : 0;
      grandTotalCredits += termCredits;
      grandTotalPoints += termPoints;

      return {
        ...term,
        termCredits,
        termGpa,
      };
    });

    const cumulativeGpa =
      grandTotalCredits > 0 ? Math.round((grandTotalPoints / grandTotalCredits) * 100) / 100 : 0;

    return {
      student: {
        id: student.id,
        admissionNumber: student.admissionNumber,
        fullName: `${student.user.firstName} ${student.user.lastName} ${student.user.grandfatherName || ''}`.trim(),
        baptismalName: student.baptismalName,
        gender: student.gender === 'MALE' ? 'ወንድ' : 'ሴት',
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
      },
      academicTerms,
      cumulativeGpa,
      totalCreditsEarned: grandTotalCredits,
    };
  }
}

export const gradeService = new GradeService();
export default gradeService;
