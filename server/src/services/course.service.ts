import prisma from '../config/prisma.client.js';
import { logAuditEvent } from '../utils/auditLogger.js';
import { OfferingStatus } from '@prisma/client';

export interface CreateCourseInput {
  code: string;
  title: string;
  amharicTitle: string;
  description?: string;
  creditHours?: number;
}

export interface CreateCourseOfferingInput {
  courseId: string;
  academicYearId: string;
  batchId: string;
  termSemester?: string;
  primaryTeacherId?: string;
}

export class CourseService {
  // ==========================================
  // COURSE CATALOG
  // ==========================================

  async listCourses(search?: string) {
    const where: any = {};
    if (search) {
      const q = search.trim();
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { title: { contains: q, mode: 'insensitive' } },
        { amharicTitle: { contains: q, mode: 'insensitive' } },
      ];
    }

    return prisma.course.findMany({
      where,
      orderBy: { code: 'asc' },
      include: {
        _count: { select: { offerings: true } },
      },
    });
  }

  async createCourse(input: CreateCourseInput, operatorId: string) {
    const existing = await prisma.course.findUnique({ where: { code: input.code.trim().toUpperCase() } });
    if (existing) {
      const error: any = new Error(`የኮርስ መለያ ኮድ '${input.code}' አስቀድሞ ተመዝግቧል።`);
      error.statusCode = 400;
      throw error;
    }

    const course = await prisma.course.create({
      data: {
        code: input.code.trim().toUpperCase(),
        title: input.title.trim(),
        amharicTitle: input.amharicTitle.trim(),
        description: input.description,
        creditHours: input.creditHours || 2,
        isActive: true,
      },
    });

    await logAuditEvent({
      userId: operatorId,
      action: 'CREATE_COURSE',
      entityName: 'Course',
      entityId: course.id,
      details: { code: course.code, amharicTitle: course.amharicTitle },
    });

    return course;
  }

  async updateCourse(id: string, data: Partial<CreateCourseInput>, operatorId: string) {
    const updated = await prisma.course.update({
      where: { id },
      data,
    });

    await logAuditEvent({
      userId: operatorId,
      action: 'UPDATE_COURSE',
      entityName: 'Course',
      entityId: id,
      details: data,
    });

    return updated;
  }

  // ==========================================
  // COURSE OFFERINGS (Course <-> Year <-> Batch)
  // ==========================================

  async listOfferings(filters: { academicYearId?: string; batchId?: string; teacherId?: string }) {
    const where: any = {};
    if (filters.academicYearId) where.academicYearId = filters.academicYearId;
    if (filters.batchId) where.batchId = filters.batchId;
    if (filters.teacherId) {
      where.teacherAssignments = { some: { teacherId: filters.teacherId } };
    }

    return prisma.courseOffering.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        course: true,
        academicYear: { select: { id: true, name: true, code: true } },
        batch: { select: { id: true, name: true, stageLevel: true } },
        teacherAssignments: {
          include: {
            teacher: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true, phone: true } },
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
            assessments: true,
          },
        },
      },
    });
  }

  async getOfferingById(id: string) {
    const offering = await prisma.courseOffering.findUnique({
      where: { id },
      include: {
        course: true,
        academicYear: true,
        batch: true,
        teacherAssignments: {
          include: {
            teacher: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true, phone: true } },
              },
            },
          },
        },
        enrollments: {
          include: {
            student: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true, phone: true } },
              },
            },
          },
        },
        assessments: { orderBy: { displayOrder: 'asc' } },
        gradeSubmissions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!offering) {
      const error: any = new Error('የኮርስ ምደባው አልተገኘም።');
      error.statusCode = 404;
      throw error;
    }

    return offering;
  }

  async createOffering(input: CreateCourseOfferingInput, operatorId: string) {
    const term = input.termSemester || '1';

    // Rule: One course can have multiple offerings, but prevent duplicate in same batch & term
    const existing = await prisma.courseOffering.findUnique({
      where: {
        courseId_academicYearId_batchId_termSemester: {
          courseId: input.courseId,
          academicYearId: input.academicYearId,
          batchId: input.batchId,
          termSemester: term,
        },
      },
    });

    if (existing) {
      const error: any = new Error('ይህ ኮርስ አስቀድሞ ለዚህ ምድብ እና መንፈቅ ተመድቧል።');
      error.statusCode = 400;
      throw error;
    }

    const offering = await prisma.$transaction(async (tx) => {
      const off = await tx.courseOffering.create({
        data: {
          courseId: input.courseId,
          academicYearId: input.academicYearId,
          batchId: input.batchId,
          termSemester: term,
          status: OfferingStatus.ACTIVE,
        },
      });

      // Assign teacher if provided
      if (input.primaryTeacherId) {
        await tx.teacherAssignment.create({
          data: {
            teacherId: input.primaryTeacherId,
            courseOfferingId: off.id,
            isPrimary: true,
          },
        });
      }

      return off;
    });

    await logAuditEvent({
      userId: operatorId,
      action: 'CREATE_COURSE_OFFERING',
      entityName: 'CourseOffering',
      entityId: offering.id,
      details: { courseId: input.courseId, batchId: input.batchId, yearId: input.academicYearId },
    });

    return this.getOfferingById(offering.id);
  }

  async assignTeacherToOffering(offeringId: string, teacherId: string, isPrimary = true, operatorId: string) {
    const existing = await prisma.teacherAssignment.findUnique({
      where: {
        teacherId_courseOfferingId: {
          teacherId,
          courseOfferingId: offeringId,
        },
      },
    });

    if (existing) {
      const error: any = new Error('መምህሩ አስቀድሞ ለዚህ ኮርስ ተመድቧል።');
      error.statusCode = 400;
      throw error;
    }

    const assignment = await prisma.teacherAssignment.create({
      data: {
        courseOfferingId: offeringId,
        teacherId,
        isPrimary,
      },
      include: {
        teacher: { include: { user: true } },
        courseOffering: { include: { course: true } },
      },
    });

    await logAuditEvent({
      userId: operatorId,
      action: 'ASSIGN_TEACHER',
      entityName: 'TeacherAssignment',
      entityId: assignment.id,
      details: {
        teacher: assignment.teacher.user.firstName,
        course: assignment.courseOffering.course.amharicTitle,
      },
    });

    // Notify Teacher
    await prisma.notification.create({
      data: {
        userId: assignment.teacher.userId,
        type: 'COURSE_ASSIGNED',
        title: 'አዲስ የኮርስ ማስተማሪያ ምደባ',
        message: `ለ'${assignment.courseOffering.course.amharicTitle || assignment.courseOffering.course.title}' ኮርስ በማስተማሪያነት ተመድበዋል።`,
        linkUrl: `/dashboard?tab=grades&offeringId=${offeringId}`,
      },
    }).catch(() => {});

    return assignment;
  }

  async removeTeacherAssignment(assignmentId: string, operatorId: string) {
    await prisma.teacherAssignment.delete({ where: { id: assignmentId } });
    await logAuditEvent({
      userId: operatorId,
      action: 'REMOVE_TEACHER_ASSIGNMENT',
      entityName: 'TeacherAssignment',
      entityId: assignmentId,
    });
    return { message: 'መምህሩ ከዚህ ኮርስ ምደባ ላይ ተነስቷል።' };
  }
}

export const courseService = new CourseService();
export default courseService;
