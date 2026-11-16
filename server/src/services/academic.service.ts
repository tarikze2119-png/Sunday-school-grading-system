import prisma from '../config/prisma.client.js';
import { logAuditEvent } from '../utils/auditLogger.js';
import { AcademicYearStatus } from '@prisma/client';

export interface CreateAcademicYearInput {
  name: string; // e.g., "2016 ዓ.ም." or "2019 E.C."
  code: string; // e.g., "AY-2016-EC"
  startDate: string | Date;
  endDate: string | Date;
  description?: string;
  isCurrent?: boolean;
}

export interface CreateBatchInput {
  academicYearId: string;
  name: string; // e.g., "ምድብ 1 - የሕፃናት ክፍል"
  code: string; // e.g., "B-2016-CHI"
  stageLevel: string; // e.g., "ደረጃ 1 (ሕፃናት)"
  description?: string;
}

export class AcademicService {
  // ==========================================
  // ACADEMIC YEARS
  // ==========================================

  async listAcademicYears() {
    return prisma.academicYear.findMany({
      orderBy: { startDate: 'desc' },
      include: {
        _count: {
          select: {
            batches: true,
            courseOfferings: true,
            students: true,
          },
        },
      },
    });
  }

  async getAcademicYearById(id: string) {
    const year = await prisma.academicYear.findUnique({
      where: { id },
      include: {
        batches: {
          orderBy: { createdAt: 'asc' },
          include: {
            _count: {
              select: {
                students: true,
                courseOfferings: true,
              },
            },
          },
        },
        _count: {
          select: {
            courseOfferings: true,
            students: true,
          },
        },
      },
    });

    if (!year) {
      const error: any = new Error('የትምህርት ዘመኑ አልተገኘም።');
      error.statusCode = 404;
      throw error;
    }
    return year;
  }

  async getCurrentAcademicYear() {
    return prisma.academicYear.findFirst({
      where: { isCurrent: true },
      include: {
        batches: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async createAcademicYear(input: CreateAcademicYearInput, operatorId: string) {
    const start = new Date(input.startDate);
    const end = new Date(input.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      const error: any = new Error('የትምህርት ዘመኑ የመጀመሪያ ወይም የማጠቃለያ ቀን ትክክል አይደለም።');
      error.statusCode = 400;
      throw error;
    }
    if (start >= end) {
      const error: any = new Error('የትምህርት ዘመኑ መጀመሪያ ቀን ከማጠቃለያ ቀን በፊት መሆን አለበት።');
      error.statusCode = 400;
      throw error;
    }

    const existing = await prisma.academicYear.findFirst({
      where: {
        OR: [{ name: input.name.trim() }, { code: input.code.trim().toUpperCase() }],
      },
    });

    if (existing) {
      const error: any = new Error('በዚህ ስም ወይም መለያ ኮድ የተመዘገበ የትምህርት ዘመን አስቀድሞ አለ።');
      error.statusCode = 400;
      throw error;
    }

    const academicYear = await prisma.$transaction(async (tx) => {
      // If setting this year as current, unset any other current year
      if (input.isCurrent) {
        await tx.academicYear.updateMany({
          where: { isCurrent: true },
          data: { isCurrent: false },
        });
      }

      return tx.academicYear.create({
        data: {
          name: input.name.trim(),
          code: input.code.trim().toUpperCase(),
          startDate: start,
          endDate: end,
          description: input.description,
          isCurrent: Boolean(input.isCurrent),
          status: AcademicYearStatus.ACTIVE,
        },
      });
    });

    await logAuditEvent({
      userId: operatorId,
      action: 'CREATE_ACADEMIC_YEAR',
      entityName: 'AcademicYear',
      entityId: academicYear.id,
      details: { name: academicYear.name, code: academicYear.code },
    });

    return academicYear;
  }

  async updateAcademicYear(
    id: string,
    input: Partial<CreateAcademicYearInput> & { status?: AcademicYearStatus },
    operatorId: string
  ) {
    const target = await prisma.academicYear.findUnique({ where: { id } });
    if (!target) {
      const error: any = new Error('የትምህርት ዘመኑ አልተገኘም።');
      error.statusCode = 404;
      throw error;
    }

    // Protection rule: If already closed (COMPLETED), disallow modifying details unless reopening
    if (target.status === AcademicYearStatus.COMPLETED && input.status === undefined) {
      const error: any = new Error(
        'ይህ የትምህርት ዘመን የተዘጋ (COMPLETED) ስለሆነ ታሪካዊ መረጃዎችን መቀየር አይቻልም። መረጃ ለማስተካከል አስቀድመው ሁኔታውን ወደ ንቁ (ACTIVE) ይቀይሩት።'
      );
      error.statusCode = 400;
      throw error;
    }

    // Name or Code uniqueness check
    if (input.name || input.code) {
      const existing = await prisma.academicYear.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(input.name ? [{ name: input.name.trim() }] : []),
            ...(input.code ? [{ code: input.code.trim().toUpperCase() }] : []),
          ],
        },
      });

      if (existing) {
        const error: any = new Error('በዚህ ስም ወይም መለያ ኮድ የተመዘገበ ሌላ የትምህርት ዘመን አስቀድሞ አለ።');
        error.statusCode = 400;
        throw error;
      }
    }

    // Date validation
    const start = input.startDate ? new Date(input.startDate) : target.startDate;
    const end = input.endDate ? new Date(input.endDate) : target.endDate;
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      const error: any = new Error('የትምህርት ዘመኑ መጀመሪያ ቀን ከማጠቃለያ ቀን በፊት መሆን አለበት።');
      error.statusCode = 400;
      throw error;
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (input.isCurrent) {
        await tx.academicYear.updateMany({
          where: { id: { not: id }, isCurrent: true },
          data: { isCurrent: false },
        });
      }

      return tx.academicYear.update({
        where: { id },
        data: {
          ...(input.name ? { name: input.name.trim() } : {}),
          ...(input.code ? { code: input.code.trim().toUpperCase() } : {}),
          ...(input.startDate ? { startDate: start } : {}),
          ...(input.endDate ? { endDate: end } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.isCurrent !== undefined ? { isCurrent: input.isCurrent } : {}),
          ...(input.status ? { status: input.status } : {}),
        },
      });
    });

    await logAuditEvent({
      userId: operatorId,
      action: 'UPDATE_ACADEMIC_YEAR',
      entityName: 'AcademicYear',
      entityId: id,
      details: { ...input },
    });

    return updated;
  }

  async closeAcademicYear(id: string, operatorId: string) {
    const target = await prisma.academicYear.findUnique({
      where: { id },
      include: {
        _count: {
          select: { batches: true, courseOfferings: true, students: true },
        },
      },
    });

    if (!target) {
      const error: any = new Error('የትምህርት ዘመኑ አልተገኘም።');
      error.statusCode = 404;
      throw error;
    }

    if (target.status === AcademicYearStatus.COMPLETED) {
      const error: any = new Error('የትምህርት ዘመኑ አስቀድሞ የተዘጋ (COMPLETED) ነው።');
      error.statusCode = 400;
      throw error;
    }

    const closed = await prisma.$transaction(async (tx) => {
      // 1. Mark academic year completed and unset isCurrent
      const year = await tx.academicYear.update({
        where: { id },
        data: {
          status: AcademicYearStatus.COMPLETED,
          isCurrent: false,
        },
      });

      // 2. Automatically deactivate all batches in this year to protect them
      await tx.batch.updateMany({
        where: { academicYearId: id },
        data: { isActive: false },
      });

      return year;
    });

    await logAuditEvent({
      userId: operatorId,
      action: 'CLOSE_ACADEMIC_YEAR',
      entityName: 'AcademicYear',
      entityId: id,
      details: {
        name: target.name,
        batchesClosed: target._count.batches,
      },
    });

    return {
      message: `የትምህርት ዘመን '${target.name}' በተሳካ ሁኔታ ተዘግቷል (COMPLETED)፤ በውስጡ ያሉት ${target._count.batches} ምድቦች እንዲዘጉ ተደርገዋል።`,
      data: closed,
    };
  }

  async setCurrentAcademicYear(id: string, operatorId: string) {
    const target = await prisma.academicYear.findUnique({ where: { id } });
    if (!target) {
      const error: any = new Error('የትምህርት ዘመኑ አልተገኘም።');
      error.statusCode = 404;
      throw error;
    }

    await prisma.$transaction(async (tx) => {
      await tx.academicYear.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      });
      await tx.academicYear.update({
        where: { id },
        data: { isCurrent: true, status: AcademicYearStatus.ACTIVE },
      });
    });

    await logAuditEvent({
      userId: operatorId,
      action: 'SET_CURRENT_ACADEMIC_YEAR',
      entityName: 'AcademicYear',
      entityId: id,
      details: { name: target.name },
    });

    return { message: `'${target.name}' አሁን የሚሰራበት (ዋና) የትምህርት ዘመን ሆኖ ተመርጧል።` };
  }

  async updateAcademicYearStatus(id: string, status: AcademicYearStatus, operatorId: string) {
    const updated = await prisma.academicYear.update({
      where: { id },
      data: { status },
    });

    await logAuditEvent({
      userId: operatorId,
      action: 'UPDATE_ACADEMIC_YEAR_STATUS',
      entityName: 'AcademicYear',
      entityId: id,
      details: { newStatus: status },
    });

    return updated;
  }

  async deleteAcademicYear(id: string, operatorId: string) {
    const target = await prisma.academicYear.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            batches: true,
            courseOfferings: true,
            students: true,
          },
        },
      },
    });

    if (!target) {
      const error: any = new Error('የትምህርት ዘመኑ አልተገኘም።');
      error.statusCode = 404;
      throw error;
    }

    // Protection rule: Prevent accidental deletion of years containing records
    if (
      target._count.batches > 0 ||
      target._count.courseOfferings > 0 ||
      target._count.students > 0
    ) {
      const error: any = new Error(
        `ይህ የትምህርት ዘመን ${target._count.batches} ምድቦች፣ ${target._count.courseOfferings} ኮርሶች እና ${target._count.students} ተማሪዎች ስላሉት ሊሰረዝ አይችልም። ይልቁንስ ሁኔታውን ወደ 'ማህደር (ARCHIVED)' ይቀይሩት።`
      );
      error.statusCode = 400;
      throw error;
    }

    await prisma.academicYear.delete({ where: { id } });

    await logAuditEvent({
      userId: operatorId,
      action: 'DELETE_ACADEMIC_YEAR',
      entityName: 'AcademicYear',
      entityId: id,
      details: { name: target.name },
    });

    return { message: `'${target.name}' በተሳካ ሁኔታ ተሰርዟል።` };
  }

  // ==========================================
  // BATCH MANAGEMENT
  // ==========================================

  async listBatches(academicYearId?: string) {
    const where: any = {};
    if (academicYearId) {
      where.academicYearId = academicYearId;
    }

    return prisma.batch.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        academicYear: { select: { id: true, name: true, code: true, isCurrent: true } },
        _count: {
          select: {
            students: true,
            courseOfferings: true,
          },
        },
      },
    });
  }

  async createBatch(input: CreateBatchInput, operatorId: string) {
    const year = await prisma.academicYear.findUnique({ where: { id: input.academicYearId } });
    if (!year) {
      const error: any = new Error('የተመረጠው የትምህርት ዘመን አልተገኘም።');
      error.statusCode = 404;
      throw error;
    }

    const existing = await prisma.batch.findFirst({
      where: {
        academicYearId: input.academicYearId,
        OR: [{ name: input.name.trim() }, { code: input.code.trim().toUpperCase() }],
      },
    });

    if (existing) {
      const error: any = new Error('በዚህ የትምህርት ዘመን ውስጥ በተመሳሳይ ስም ወይም መለያ ኮድ የተመዘገበ ምድብ አለ።');
      error.statusCode = 400;
      throw error;
    }

    const batch = await prisma.batch.create({
      data: {
        academicYearId: input.academicYearId,
        name: input.name.trim(),
        code: input.code.trim().toUpperCase(),
        stageLevel: input.stageLevel.trim(),
        description: input.description,
        isActive: true,
      },
    });

    await logAuditEvent({
      userId: operatorId,
      action: 'CREATE_BATCH',
      entityName: 'Batch',
      entityId: batch.id,
      details: { name: batch.name, code: batch.code, academicYear: year.name },
    });

    return batch;
  }

  async getBatchDetails(id: string) {
    const batch = await prisma.batch.findUnique({
      where: { id },
      include: {
        academicYear: {
          select: { id: true, name: true, code: true, status: true, isCurrent: true },
        },
        students: {
          where: { user: { isDeleted: false } },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                grandfatherName: true,
                phone: true,
                email: true,
                isActive: true,
              },
            },
          },
          orderBy: { admissionNumber: 'asc' },
        },
        courseOfferings: {
          include: {
            course: true,
            teacherAssignments: {
              include: {
                teacher: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            students: true,
            courseOfferings: true,
          },
        },
      },
    });

    if (!batch) {
      const error: any = new Error('ምድቡ አልተገኘም።');
      error.statusCode = 404;
      throw error;
    }

    return batch;
  }

  async updateBatch(
    id: string,
    data: { name?: string; code?: string; stageLevel?: string; description?: string; isActive?: boolean },
    operatorId: string
  ) {
    const target = await prisma.batch.findUnique({
      where: { id },
      include: { academicYear: true },
    });

    if (!target) {
      const error: any = new Error('ምድቡ አልተገኘም።');
      error.statusCode = 404;
      throw error;
    }

    // Protection rule: disallow editing batch if academic year is completed
    if (target.academicYear.status === AcademicYearStatus.COMPLETED) {
      const error: any = new Error('የተዘጋ (COMPLETED) የትምህርት ዘመን ምድቦችን ማሻሻል አይቻልም።');
      error.statusCode = 400;
      throw error;
    }

    // Code or Name uniqueness within same academic year
    if (data.code || data.name) {
      const existing = await prisma.batch.findFirst({
        where: {
          academicYearId: target.academicYearId,
          id: { not: id },
          OR: [
            ...(data.code ? [{ code: data.code.trim().toUpperCase() }] : []),
            ...(data.name ? [{ name: data.name.trim() }] : []),
          ],
        },
      });

      if (existing) {
        const error: any = new Error('በዚህ የትምህርት ዘመን ውስጥ በተመሳሳይ ስም ወይም መለያ ኮድ የተመዘገበ ሌላ ምድብ አለ።');
        error.statusCode = 400;
        throw error;
      }
    }

    const updated = await prisma.batch.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.code ? { code: data.code.trim().toUpperCase() } : {}),
        ...(data.stageLevel ? { stageLevel: data.stageLevel.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });

    await logAuditEvent({
      userId: operatorId,
      action: 'UPDATE_BATCH',
      entityName: 'Batch',
      entityId: id,
      details: data,
    });

    return updated;
  }

  async toggleBatchStatus(id: string, isActive: boolean, operatorId: string) {
    const updated = await prisma.batch.update({
      where: { id },
      data: { isActive },
    });

    await logAuditEvent({
      userId: operatorId,
      action: isActive ? 'ACTIVATE_BATCH' : 'DEACTIVATE_BATCH',
      entityName: 'Batch',
      entityId: id,
    });

    return updated;
  }

  async deleteBatch(id: string, operatorId: string) {
    const batch = await prisma.batch.findUnique({
      where: { id },
      include: {
        _count: {
          select: { students: true, courseOfferings: true },
        },
      },
    });

    if (!batch) {
      const error: any = new Error('ምድቡ አልተገኘም።');
      error.statusCode = 404;
      throw error;
    }

    if (batch._count.students > 0 || batch._count.courseOfferings > 0) {
      const error: any = new Error(
        `በዚህ ምድብ ውስጥ ${batch._count.students} ተማሪዎች እና ${batch._count.courseOfferings} ኮርሶች ስለተመዘገቡ ሊሰረዝ አይችልም። ይልቁንስ ምድቡን 'ያልነቃ (Deactivate)' ያድርጉት።`
      );
      error.statusCode = 400;
      throw error;
    }

    await prisma.batch.delete({ where: { id } });

    await logAuditEvent({
      userId: operatorId,
      action: 'DELETE_BATCH',
      entityName: 'Batch',
      entityId: id,
      details: { name: batch.name },
    });

    return { message: `'${batch.name}' በተሳካ ሁኔታ ተሰርዟል።` };
  }
}

export const academicService = new AcademicService();
export default academicService;
