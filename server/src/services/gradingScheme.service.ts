import prisma from '../config/prisma.client.js';
import { AssessmentType, GradeSubmissionStatus } from '@prisma/client';
import { logAuditEvent } from '../utils/auditLogger.js';

export interface GradingComponentInput {
  name: string;
  percentage: number;
  defaultMaxScore?: number;
  orderIndex?: number;
  type?: AssessmentType;
  description?: string;
}

export interface CreateGradingSchemeInput {
  name: string;
  description?: string;
  components: GradingComponentInput[];
}

export interface CreateSchemeVersionInput {
  description?: string;
  components: GradingComponentInput[];
}

export interface ApplySchemeInput {
  schemeId: string;
  versionId?: string;
  applicationOption:
    | 'ALL_SELECTED'
    | 'BATCH_ALL'
    | 'ACADEMIC_YEAR_ALL'
    | 'INDIVIDUAL'
    | 'MULTIPLE_INDIVIDUAL';
  academicYearId?: string;
  batchId?: string;
  courseOfferingIds?: string[];
}

export interface UpdateCourseSchemeInput {
  name?: string;
  changeReason?: string;
  components: Array<{
    name: string;
    percentage: number;
    maxScore?: number;
    type?: AssessmentType;
    orderIndex?: number;
  }>;
  confirmRecalculation?: boolean;
}

export class GradingSchemeService {
  /**
   * Helper: Validate components percentage and unique names
   */
  public validateComponents(components: GradingComponentInput[]) {
    if (!components || components.length === 0) {
      throw new Error('ቢያንስ አንድ የምዘና መስፈርት መካተት አለበት።');
    }

    const names = new Set<string>();
    let totalPercentage = 0;

    for (const c of components) {
      const trimmedName = c.name?.trim();
      if (!trimmedName) {
        throw new Error('የምዘና መስፈርት ስም ባዶ መሆን አይችልም።');
      }

      const lowerName = trimmedName.toLowerCase();
      if (names.has(lowerName)) {
        throw new Error(
          `ተመሳሳይ ስም ያለው የምዘና መስፈርት ('${trimmedName}') በአንድ መመዘኛ ውስጥ ከአንድ ጊዜ በላይ ሊገባ አይችልም።`
        );
      }
      names.add(lowerName);

      const pct = Number(c.percentage);
      if (isNaN(pct) || pct <= 0) {
        throw new Error(`የምዘናው የክብደት መጠን (${trimmedName}) ከ0% በላይ አዎንታዊ ቁጥር መሆን አለበት።`);
      }
      if (pct > 100) {
        throw new Error(`የምዘናው የክብደት መጠን (${trimmedName}) ከ100% መብለጥ አይችልም።`);
      }

      totalPercentage += pct;
    }

    // Floating-point tolerant exact 100% check
    if (Math.abs(totalPercentage - 100) > 0.001) {
      throw new Error(
        `የምዘና መስፈርቶች የክብደት ድምር በትክክል 100% መሆን አለበት። የአሁኑ ድምር: ${Number(
          totalPercentage.toFixed(2)
        )}% ነው።`
      );
    }
  }

  // ==========================================
  // 1. REUSABLE TEMPLATES MANAGEMENT
  // ==========================================

  /**
   * Create a new reusable grading scheme template with Version 1
   */
  async createScheme(input: CreateGradingSchemeInput, userId: string) {
    const trimmedName = input.name?.trim();
    if (!trimmedName) {
      throw new Error('እባክዎ የመመዘኛውን ስም ያስገቡ።');
    }

    // Check unique scheme name
    const existing = await prisma.gradingScheme.findUnique({
      where: { name: trimmedName },
    });
    if (existing) {
      throw new Error(`'${trimmedName}' በሚል ስም የተመዘገበ መመዘኛ አስቀድሞ አለ።`);
    }

    // Validate components sum and constraints
    this.validateComponents(input.components);

    return prisma.$transaction(async (tx) => {
      // 1. Create GradingScheme
      const scheme = await tx.gradingScheme.create({
        data: {
          name: trimmedName,
          description: input.description?.trim() || null,
          status: 'ACTIVE',
          createdById: userId,
        },
      });

      // 2. Create Version 1
      const version = await tx.gradingSchemeVersion.create({
        data: {
          schemeId: scheme.id,
          versionNumber: 1,
          description: 'የመጀመሪያ ቅጂ (Initial Version)',
          status: 'ACTIVE',
          isLatest: true,
        },
      });

      // 3. Create Components
      for (let i = 0; i < input.components.length; i++) {
        const c = input.components[i];
        await tx.gradingComponent.create({
          data: {
            versionId: version.id,
            name: c.name.trim(),
            percentage: c.percentage,
            defaultMaxScore: c.defaultMaxScore || 100,
            orderIndex: c.orderIndex !== undefined ? c.orderIndex : i + 1,
            type: c.type || AssessmentType.HOMEWORK_ASSIGNMENT,
            description: c.description?.trim() || null,
          },
        });
      }

      await logAuditEvent({
        userId,
        action: 'CREATE_GRADING_SCHEME',
        entityName: 'GradingScheme',
        entityId: scheme.id,
        details: {
          schemeName: scheme.name,
          versionNumber: 1,
          componentCount: input.components.length,
        },
      });

      return tx.gradingScheme.findUnique({
        where: { id: scheme.id },
        include: {
          versions: {
            include: { components: { orderBy: { orderIndex: 'asc' } } },
          },
        },
      });
    });
  }

  /**
   * Get all available grading scheme templates
   */
  async getSchemes(status?: string) {
    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }

    const schemes = await prisma.gradingScheme.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            components: { orderBy: { orderIndex: 'asc' } },
          },
        },
        appliedSchemes: {
          select: { id: true, courseOfferingId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return schemes.map((s) => {
      const latestVersion = s.versions.find((v) => v.isLatest) || s.versions[0];
      return {
        id: s.id,
        name: s.name,
        description: s.description,
        status: s.status,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        createdBy: s.createdBy,
        totalVersions: s.versions.length,
        appliedCoursesCount: new Set(s.appliedSchemes.map((a) => a.courseOfferingId)).size,
        latestVersion: latestVersion
          ? {
              id: latestVersion.id,
              versionNumber: latestVersion.versionNumber,
              description: latestVersion.description,
              createdAt: latestVersion.createdAt,
              components: latestVersion.components,
            }
          : null,
      };
    });
  }

  /**
   * Get scheme details by ID including all versions
   */
  async getSchemeById(id: string) {
    const scheme = await prisma.gradingScheme.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            components: { orderBy: { orderIndex: 'asc' } },
          },
        },
        appliedSchemes: {
          include: {
            courseOffering: {
              include: {
                course: true,
                academicYear: true,
                batch: true,
              },
            },
          },
        },
      },
    });

    if (!scheme) {
      throw new Error('የተጠየቀው የመመዘኛ ቅጽ አልተገኘም።');
    }

    return scheme;
  }

  /**
   * Create a new version of an existing template scheme
   */
  async createNewVersion(schemeId: string, input: CreateSchemeVersionInput, userId: string) {
    const scheme = await prisma.gradingScheme.findUnique({
      where: { id: schemeId },
      include: { versions: { orderBy: { versionNumber: 'desc' } } },
    });

    if (!scheme) {
      throw new Error('የተመረጠው መመዘኛ አልተገኘም።');
    }

    this.validateComponents(input.components);

    return prisma.$transaction(async (tx) => {
      // 1. Mark existing versions as not latest
      await tx.gradingSchemeVersion.updateMany({
        where: { schemeId },
        data: { isLatest: false, status: 'SUPERSEDED' },
      });

      const nextVersionNumber = (scheme.versions[0]?.versionNumber || 0) + 1;

      // 2. Create new Version
      const newVersion = await tx.gradingSchemeVersion.create({
        data: {
          schemeId,
          versionNumber: nextVersionNumber,
          description: input.description?.trim() || `ቅጂ ${nextVersionNumber}`,
          status: 'ACTIVE',
          isLatest: true,
        },
      });

      // 3. Create components
      for (let i = 0; i < input.components.length; i++) {
        const c = input.components[i];
        await tx.gradingComponent.create({
          data: {
            versionId: newVersion.id,
            name: c.name.trim(),
            percentage: c.percentage,
            defaultMaxScore: c.defaultMaxScore || 100,
            orderIndex: c.orderIndex !== undefined ? c.orderIndex : i + 1,
            type: c.type || AssessmentType.HOMEWORK_ASSIGNMENT,
            description: c.description?.trim() || null,
          },
        });
      }

      // Update scheme timestamp
      await tx.gradingScheme.update({
        where: { id: schemeId },
        data: { updatedAt: new Date() },
      });

      await logAuditEvent({
        userId,
        action: 'CREATE_SCHEME_VERSION',
        entityName: 'GradingSchemeVersion',
        entityId: newVersion.id,
        details: {
          schemeId,
          schemeName: scheme.name,
          newVersionNumber: nextVersionNumber,
          componentCount: input.components.length,
        },
      });

      return tx.gradingSchemeVersion.findUnique({
        where: { id: newVersion.id },
        include: { components: { orderBy: { orderIndex: 'asc' } } },
      });
    });
  }

  /**
   * Update scheme metadata (name, description, status)
   */
  async updateSchemeMetadata(
    schemeId: string,
    data: { name?: string; description?: string; status?: string },
    userId: string
  ) {
    const scheme = await prisma.gradingScheme.findUnique({ where: { id: schemeId } });
    if (!scheme) throw new Error('መመዘኛው አልተገኘም።');

    const updateData: any = {};
    if (data.name && data.name.trim() !== scheme.name) {
      const nameExists = await prisma.gradingScheme.findUnique({
        where: { name: data.name.trim() },
      });
      if (nameExists && nameExists.id !== schemeId) {
        throw new Error(`'${data.name.trim()}' በሚል ስም የተመዘገበ መመዘኛ አስቀድሞ አለ።`);
      }
      updateData.name = data.name.trim();
    }
    if (data.description !== undefined) {
      updateData.description = data.description ? data.description.trim() : null;
    }
    if (data.status) {
      updateData.status = data.status;
    }

    const updated = await prisma.gradingScheme.update({
      where: { id: schemeId },
      data: updateData,
    });

    await logAuditEvent({
      userId,
      action: 'UPDATE_SCHEME_METADATA',
      entityName: 'GradingScheme',
      entityId: schemeId,
      details: { updatedFields: Object.keys(updateData) },
    });

    return updated;
  }

  /**
   * Delete scheme (Rule: Do not delete if referenced by academic records)
   */
  async deleteScheme(schemeId: string, userId: string) {
    const scheme = await prisma.gradingScheme.findUnique({
      where: { id: schemeId },
      include: {
        appliedSchemes: true,
      },
    });

    if (!scheme) throw new Error('መመዘኛው አልተገኘም።');

    if (scheme.appliedSchemes.length > 0) {
      throw new Error(
        `ይህ መመዘኛ በ${scheme.appliedSchemes.length} የኮርስ ምደባዎች ላይ ጥቅም ላይ ስለዋለ ሊሰረዝ አይችልም። ይልቁንስ ሁኔታውን 'ARCHIVED' ያድርጉት።`
      );
    }

    await prisma.gradingScheme.delete({
      where: { id: schemeId },
    });

    await logAuditEvent({
      userId,
      action: 'DELETE_GRADING_SCHEME',
      entityName: 'GradingScheme',
      entityId: schemeId,
      details: { schemeName: scheme.name },
    });

    return { success: true, message: 'መመዘኛው በተሳካ ሁኔታ ተሰርዟል።' };
  }

  // ==========================================
  // 2. APPLY SCHEMES & INDEPENDENT COPIES
  // ==========================================

  /**
   * Get courses available for scheme assignment with filter parameters
   */
  async getCoursesForAssignment(filters: {
    academicYearId?: string;
    batchId?: string;
    teacherId?: string;
    search?: string;
  }) {
    const whereClause: any = {};

    if (filters.academicYearId) {
      whereClause.academicYearId = filters.academicYearId;
    }
    if (filters.batchId) {
      whereClause.batchId = filters.batchId;
    }
    if (filters.teacherId) {
      whereClause.teacherAssignments = {
        some: { teacherId: filters.teacherId },
      };
    }
    if (filters.search) {
      whereClause.course = {
        OR: [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { amharicTitle: { contains: filters.search, mode: 'insensitive' } },
          { code: { contains: filters.search, mode: 'insensitive' } },
        ],
      };
    }

    const offerings = await prisma.courseOffering.findMany({
      where: whereClause,
      include: {
        course: true,
        academicYear: true,
        batch: true,
        teacherAssignments: {
          include: {
            teacher: {
              include: { user: true },
            },
          },
        },
        enrollments: { select: { id: true } },
        gradingSchemes: {
          where: { isActive: true },
          include: {
            components: { orderBy: { orderIndex: 'asc' } },
          },
        },
        gradeSubmissions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ academicYear: { startDate: 'desc' } }, { course: { title: 'asc' } }],
    });

    return offerings.map((o) => {
      const activeScheme = o.gradingSchemes[0] || null;
      const latestSub = o.gradeSubmissions[0] || null;
      return {
        offeringId: o.id,
        courseId: o.courseId,
        courseCode: o.course.code,
        courseTitle: o.course.title,
        amharicTitle: o.course.amharicTitle,
        academicYearId: o.academicYearId,
        academicYearName: o.academicYear.name,
        batchId: o.batchId,
        batchName: o.batch.name,
        termSemester: o.termSemester,
        status: o.status,
        enrolledStudentsCount: o.enrollments.length,
        teachers: o.teacherAssignments.map((ta) => ({
          id: ta.teacherId,
          name: `${ta.teacher.spiritualTitle ? ta.teacher.spiritualTitle + ' ' : ''}${
            ta.teacher.user.firstName
          } ${ta.teacher.user.lastName}`,
          isPrimary: ta.isPrimary,
        })),
        activeScheme: activeScheme
          ? {
              id: activeScheme.id,
              name: activeScheme.name,
              versionNumber: activeScheme.versionNumber,
              appliedAt: activeScheme.appliedAt,
              componentsCount: activeScheme.components.length,
              components: activeScheme.components,
            }
          : null,
        latestSubmissionStatus: latestSub ? latestSub.status : 'NOT_STARTED',
      };
    });
  }

  /**
   * Apply a grading scheme to courses (Rule 4: Independent copy created)
   */
  async applySchemeToCourses(input: ApplySchemeInput, userId: string) {
    // 1. Resolve template scheme and version
    const scheme = await prisma.gradingScheme.findUnique({
      where: { id: input.schemeId },
      include: {
        versions: {
          include: { components: { orderBy: { orderIndex: 'asc' } } },
        },
      },
    });

    if (!scheme) {
      throw new Error('የተመረጠው መመዘኛ አልተገኘም።');
    }

    let targetVersion = input.versionId
      ? scheme.versions.find((v) => v.id === input.versionId)
      : scheme.versions.find((v) => v.isLatest) || scheme.versions[0];

    if (!targetVersion || targetVersion.components.length === 0) {
      throw new Error('በተመረጠው መመዘኛ ውስጥ ምንም የምዘና መስፈርቶች አልተገኙም።');
    }

    // 2. Resolve target course offerings based on application option
    let targetOfferingIds: string[] = [];

    switch (input.applicationOption) {
      case 'ALL_SELECTED':
      case 'INDIVIDUAL':
      case 'MULTIPLE_INDIVIDUAL':
        if (!input.courseOfferingIds || input.courseOfferingIds.length === 0) {
          throw new Error('እባክዎ መመዘኛው የሚመደብላቸውን ኮርሶች ይምረጡ።');
        }
        targetOfferingIds = input.courseOfferingIds;
        break;

      case 'BATCH_ALL':
        if (!input.batchId) {
          throw new Error('እባክዎ ምድብ (Batch) ይምረጡ።');
        }
        const batchOfferings = await prisma.courseOffering.findMany({
          where: { batchId: input.batchId },
          select: { id: true },
        });
        targetOfferingIds = batchOfferings.map((o) => o.id);
        break;

      case 'ACADEMIC_YEAR_ALL':
        if (!input.academicYearId) {
          throw new Error('እባክዎ የትምህርት ዘመን ይምረጡ።');
        }
        const yearOfferings = await prisma.courseOffering.findMany({
          where: { academicYearId: input.academicYearId },
          select: { id: true },
        });
        targetOfferingIds = yearOfferings.map((o) => o.id);
        break;

      default:
        throw new Error('የተሳሳተ የምደባ አማራጭ ተመርጧል።');
    }

    if (targetOfferingIds.length === 0) {
      throw new Error('ለመመደብ የተመረጡ የኮርስ ምደባዎች አልተገኙም።');
    }

    // 3. Execute in database transaction to prevent partial assignments
    const result = await prisma.$transaction(async (tx) => {
      const assignedCourseList: any[] = [];

      for (const offeringId of targetOfferingIds) {
        // Fetch course offering info
        const offering = await tx.courseOffering.findUnique({
          where: { id: offeringId },
          include: {
            course: true,
            gradingSchemes: { where: { isActive: true } },
            assessments: true,
          },
        });

        if (!offering) continue;

        // Deactivate existing active course grading scheme
        if (offering.gradingSchemes.length > 0) {
          await tx.courseGradingScheme.updateMany({
            where: { courseOfferingId: offeringId, isActive: true },
            data: { isActive: false },
          });
        }

        // Get next version number for this course offering
        const allCourseSchemes = await tx.courseGradingScheme.findMany({
          where: { courseOfferingId: offeringId },
          orderBy: { versionNumber: 'desc' },
          take: 1,
        });
        const nextVersionNumber = (allCourseSchemes[0]?.versionNumber || 0) + 1;

        // CRITICAL RULE 4: Create INDEPENDENT CourseGradingScheme
        const courseScheme = await tx.courseGradingScheme.create({
          data: {
            courseOfferingId: offeringId,
            originSchemeId: scheme.id,
            originVersionId: targetVersion.id,
            name: `${scheme.name} - ${offering.course.title}`,
            versionNumber: nextVersionNumber,
            isActive: true,
            totalWeight: 100,
            appliedById: userId,
            changeReason: `የመመዘኛ ምደባ፦ ${scheme.name} (ቅጂ ${targetVersion.versionNumber})`,
          },
        });

        // Create INDEPENDENT CourseGradingComponent copies and sync to Assessment table
        for (const c of targetVersion.components) {
          // Check if an assessment with the same name already exists on offering
          let assessment = offering.assessments.find(
            (a) => a.name.trim().toLowerCase() === c.name.trim().toLowerCase()
          );

          if (!assessment) {
            assessment = await tx.assessment.create({
              data: {
                courseOfferingId: offeringId,
                name: c.name.trim(),
                type: c.type,
                maxScore: c.defaultMaxScore,
                weightPercentage: c.percentage,
                displayOrder: c.orderIndex,
                description: c.description,
              },
            });
          } else {
            // Update weight if needed
            assessment = await tx.assessment.update({
              where: { id: assessment.id },
              data: {
                weightPercentage: c.percentage,
                maxScore: c.defaultMaxScore,
                displayOrder: c.orderIndex,
              },
            });
          }

          await tx.courseGradingComponent.create({
            data: {
              courseGradingSchemeId: courseScheme.id,
              name: c.name.trim(),
              percentage: c.percentage,
              maxScore: c.defaultMaxScore,
              orderIndex: c.orderIndex,
              type: c.type,
              assessmentId: assessment.id,
            },
          });
        }

        // Record audit
        await logAuditEvent({
          userId,
          action: 'APPLY_COURSE_GRADING_SCHEME',
          entityName: 'CourseGradingScheme',
          entityId: courseScheme.id,
          details: {
            courseOfferingId: offeringId,
            courseTitle: offering.course.title,
            schemeId: scheme.id,
            schemeName: scheme.name,
            versionNumber: nextVersionNumber,
          },
        });

        assignedCourseList.push({
          offeringId,
          courseTitle: offering.course.title,
          schemeName: courseScheme.name,
          versionNumber: courseScheme.versionNumber,
        });
      }

      return assignedCourseList;
    });

    return {
      success: true,
      message: `መመዘኛው ለ${result.length} ኮርሶች በተሳካ ሁኔታ ተመድቧል።`,
      assignedCount: result.length,
      assignedCourses: result,
    };
  }

  // ==========================================
  // 3. EDIT APPLIED COURSE SCHEMES & VERSIONING
  // ==========================================

  /**
   * Get single course offering's active scheme and version history
   */
  async getCourseSchemeDetails(courseOfferingId: string) {
    const offering = await prisma.courseOffering.findUnique({
      where: { id: courseOfferingId },
      include: {
        course: true,
        academicYear: true,
        batch: true,
        teacherAssignments: {
          include: { teacher: { include: { user: true } } },
        },
        enrollments: {
          include: {
            grades: true,
          },
        },
        gradeSubmissions: {
          orderBy: { createdAt: 'desc' },
        },
        gradingSchemes: {
          orderBy: { versionNumber: 'desc' },
          include: {
            components: { orderBy: { orderIndex: 'asc' } },
            originScheme: true,
          },
        },
        gradeSnapshots: {
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: { select: { firstName: true, lastName: true, role: true } },
          },
        },
      },
    });

    if (!offering) {
      throw new Error('የተመረጠው የኮርስ ምደባ አልተገኘም።');
    }

    const activeScheme = offering.gradingSchemes.find((s) => s.isActive) || null;
    const totalGradesEntered = offering.enrollments.reduce(
      (sum, e) => sum + e.grades.length,
      0
    );
    const hasSubmittedGrades = offering.gradeSubmissions.some(
      (s) =>
        s.status === GradeSubmissionStatus.SUBMITTED ||
        s.status === GradeSubmissionStatus.APPROVED ||
        s.status === GradeSubmissionStatus.PUBLISHED
    );

    return {
      offeringId: offering.id,
      courseTitle: offering.course.title,
      amharicTitle: offering.course.amharicTitle,
      courseCode: offering.course.code,
      academicYear: offering.academicYear.name,
      batch: offering.batch.name,
      enrolledStudentsCount: offering.enrollments.length,
      totalGradesEntered,
      hasGrades: totalGradesEntered > 0,
      hasSubmittedGrades,
      activeScheme: activeScheme
        ? {
            id: activeScheme.id,
            name: activeScheme.name,
            versionNumber: activeScheme.versionNumber,
            appliedAt: activeScheme.appliedAt,
            changeReason: activeScheme.changeReason,
            components: activeScheme.components,
            originSchemeName: activeScheme.originScheme?.name,
          }
        : null,
      history: offering.gradingSchemes.map((s) => ({
        id: s.id,
        name: s.name,
        versionNumber: s.versionNumber,
        isActive: s.isActive,
        appliedAt: s.appliedAt,
        changeReason: s.changeReason,
        componentsCount: s.components.length,
        components: s.components,
      })),
      snapshots: offering.gradeSnapshots.map((snap) => ({
        id: snap.id,
        reason: snap.reason,
        studentCount: snap.studentCount,
        createdAt: snap.createdAt,
        createdBy: snap.createdBy,
        snapshotData: snap.snapshotData,
      })),
    };
  }

  /**
   * Edit course-specific grading scheme
   * CRITICAL RULE 5: Affects only this course offering; others remain unchanged.
   * CRITICAL RULE 6: If grades exist, requires confirmation and takes calculation snapshot.
   */
  async updateCourseGradingScheme(
    courseOfferingId: string,
    input: UpdateCourseSchemeInput,
    userId: string
  ) {
    const offering = await prisma.courseOffering.findUnique({
      where: { id: courseOfferingId },
      include: {
        course: true,
        gradingSchemes: {
          where: { isActive: true },
          include: { components: true },
        },
        enrollments: {
          include: {
            grades: {
              include: { assessment: true },
            },
            student: true,
          },
        },
        gradeSubmissions: {
          orderBy: { createdAt: 'desc' },
        },
        assessments: true,
      },
    });

    if (!offering) {
      throw new Error('የተመረጠው የኮርስ ምደባ አልተገኘም።');
    }

    // Validate components
    this.validateComponents(
      input.components.map((c) => ({
        name: c.name,
        percentage: c.percentage,
        defaultMaxScore: c.maxScore,
        type: c.type,
        orderIndex: c.orderIndex,
      }))
    );

    const activeScheme = offering.gradingSchemes[0] || null;
    const totalGrades = offering.enrollments.reduce((sum, e) => sum + e.grades.length, 0);

    // Rule 6: Require explicit confirmation if grades exist
    if (totalGrades > 0 && !input.confirmRecalculation) {
      throw new Error(
        'ለዚህ ኮርስ አስቀድመው የተመዘገቡ ውጤቶች አሉ። የመመዘኛውን የክብደት መጠን መቀየር ውጤቶችን ሊያዛባ ስለሚችል እባክዎ የማረጋገጫ ስምምነት ይስጡ።'
      );
    }

    return prisma.$transaction(async (tx) => {
      // 1. Snapshot prior grades and calculation state before modifying
      if (totalGrades > 0 || offering.enrollments.length > 0) {
        const snapshotData = {
          courseOfferingId,
          courseTitle: offering.course.title,
          schemeVersion: activeScheme?.versionNumber || 1,
          previousComponents: activeScheme?.components || [],
          students: offering.enrollments.map((e) => ({
            studentId: e.studentId,
            admissionNumber: e.student.admissionNumber,
            fullName: `${e.student.guardianName || ''}`,
            finalNumericScore: e.finalNumericScore,
            finalLetterGrade: e.finalLetterGrade,
            isPassed: e.isPassed,
            grades: e.grades.map((g) => ({
              assessmentName: g.assessment.name,
              scoreObtained: g.scoreObtained,
              weightPercentage: g.assessment.weightPercentage,
            })),
          })),
        };

        await tx.gradeCalculationSnapshot.create({
          data: {
            courseOfferingId,
            courseGradingSchemeId: activeScheme?.id || null,
            reason: `SCHEME_UPDATE_VERSION_${(activeScheme?.versionNumber || 0) + 1}`,
            snapshotData: snapshotData as any,
            studentCount: offering.enrollments.length,
            createdById: userId,
          },
        });
      }

      // 2. Deactivate previous course grading scheme version
      if (activeScheme) {
        await tx.courseGradingScheme.update({
          where: { id: activeScheme.id },
          data: { isActive: false },
        });
      }

      const allCourseSchemes = await tx.courseGradingScheme.findMany({
        where: { courseOfferingId },
        orderBy: { versionNumber: 'desc' },
        take: 1,
      });
      const nextVersionNumber = (allCourseSchemes[0]?.versionNumber || 0) + 1;

      // 3. Create NEW course configuration version
      const newCourseScheme = await tx.courseGradingScheme.create({
        data: {
          courseOfferingId,
          originSchemeId: activeScheme?.originSchemeId || null,
          originVersionId: activeScheme?.originVersionId || null,
          name: input.name?.trim() || activeScheme?.name || `የተሻሻለ መመዘኛ - ${offering.course.title}`,
          versionNumber: nextVersionNumber,
          isActive: true,
          totalWeight: 100,
          appliedById: userId,
          changeReason: input.changeReason?.trim() || `የኮርስ መመዘኛ ማሻሻያ (ቅጂ ${nextVersionNumber})`,
        },
      });

      // 4. Create new CourseGradingComponents and synchronize Assessment records
      for (let i = 0; i < input.components.length; i++) {
        const c = input.components[i];
        let assessment = offering.assessments.find(
          (a) => a.name.trim().toLowerCase() === c.name.trim().toLowerCase()
        );

        if (!assessment) {
          assessment = await tx.assessment.create({
            data: {
              courseOfferingId,
              name: c.name.trim(),
              type: c.type || AssessmentType.HOMEWORK_ASSIGNMENT,
              maxScore: c.maxScore || 100,
              weightPercentage: c.percentage,
              displayOrder: c.orderIndex !== undefined ? c.orderIndex : i + 1,
            },
          });
        } else {
          assessment = await tx.assessment.update({
            where: { id: assessment.id },
            data: {
              weightPercentage: c.percentage,
              maxScore: c.maxScore || assessment.maxScore,
              displayOrder: c.orderIndex !== undefined ? c.orderIndex : assessment.displayOrder,
            },
          });
        }

        await tx.courseGradingComponent.create({
          data: {
            courseGradingSchemeId: newCourseScheme.id,
            name: c.name.trim(),
            percentage: c.percentage,
            maxScore: c.maxScore || 100,
            orderIndex: c.orderIndex !== undefined ? c.orderIndex : i + 1,
            type: c.type || AssessmentType.HOMEWORK_ASSIGNMENT,
            assessmentId: assessment.id,
          },
        });
      }

      // 5. Audit log
      await logAuditEvent({
        userId,
        action: 'UPDATE_COURSE_GRADING_SCHEME',
        entityName: 'CourseGradingScheme',
        entityId: newCourseScheme.id,
        details: {
          courseOfferingId,
          courseTitle: offering.course.title,
          previousVersionNumber: activeScheme?.versionNumber || 0,
          newVersionNumber: nextVersionNumber,
          changeReason: input.changeReason,
          componentCount: input.components.length,
          hadGrades: totalGrades > 0,
        },
      });

      return tx.courseGradingScheme.findUnique({
        where: { id: newCourseScheme.id },
        include: { components: { orderBy: { orderIndex: 'asc' } } },
      });
    });
  }
}

export const gradingSchemeService = new GradingSchemeService();
export default gradingSchemeService;
