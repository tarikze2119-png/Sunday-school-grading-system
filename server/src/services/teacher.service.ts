import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.client.js';
import { logAuditEvent } from '../utils/auditLogger.js';
import { UserRole } from '@prisma/client';

export interface RegisterTeacherInput {
  firstName: string;
  lastName: string;
  grandfatherName?: string;
  spiritualTitle?: string; // e.g. "ዲያቆን", "ቀሲስ", "መምህር"
  teacherCode?: string;
  qualification?: string;
  specialization?: string;
  phone?: string;
  email?: string;
  username?: string;
  password?: string;
}

export class TeacherService {
  async registerTeacher(input: RegisterTeacherInput, operatorId: string) {
    const teacherCode =
      input.teacherCode?.trim() || `TCH-${Math.floor(100 + Math.random() * 900)}`;

    const existingCode = await prisma.teacher.findUnique({ where: { teacherCode } });
    if (existingCode) {
      const error: any = new Error(`የመምህር መለያ ኮድ '${teacherCode}' አስቀድሞ አለ።`);
      error.statusCode = 400;
      throw error;
    }

    const username =
      input.username?.trim().toLowerCase() ||
      `tch_${teacherCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          ...(input.email ? [{ email: input.email.trim().toLowerCase() }] : []),
          ...(input.phone ? [{ phone: input.phone.trim() }] : []),
        ],
      },
    });

    if (existingUser) {
      const error: any = new Error('በዚህ የተጠቃሚ ስም፣ ኢሜይል ወይም ስልክ የተመዘገበ አካውንት አስቀድሞ አለ።');
      error.statusCode = 400;
      throw error;
    }

    const password = input.password || 'Teacher@2026';
    const passwordHash = await bcrypt.hash(password, 12);

    const teacher = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username,
          email: input.email ? input.email.trim().toLowerCase() : null,
          phone: input.phone ? input.phone.trim() : null,
          passwordHash,
          role: UserRole.TEACHER,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          grandfatherName: input.grandfatherName ? input.grandfatherName.trim() : null,
          isActive: true,
        },
      });

      return tx.teacher.create({
        data: {
          userId: user.id,
          teacherCode,
          spiritualTitle: input.spiritualTitle?.trim() || 'መምህር',
          qualification: input.qualification?.trim(),
          specialization: input.specialization?.trim(),
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              phone: true,
              firstName: true,
              lastName: true,
              isActive: true,
            },
          },
        },
      });
    });

    await logAuditEvent({
      userId: operatorId,
      action: 'REGISTER_TEACHER',
      entityName: 'Teacher',
      entityId: teacher.id,
      details: { teacherCode: teacher.teacherCode, fullName: `${input.firstName} ${input.lastName}` },
    });

    return teacher;
  }

  async listTeachers(filters: { search?: string; page?: number; limit?: number }) {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 30;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.search) {
      const q = filters.search.trim();
      where.OR = [
        { teacherCode: { contains: q, mode: 'insensitive' } },
        { specialization: { contains: q, mode: 'insensitive' } },
        { user: { firstName: { contains: q, mode: 'insensitive' } } },
        { user: { lastName: { contains: q, mode: 'insensitive' } } },
        { user: { phone: { contains: q } } },
      ];
    }

    const [total, teachers] = await Promise.all([
      prisma.teacher.count({ where }),
      prisma.teacher.findMany({
        where,
        skip,
        take: limit,
        orderBy: { joinedDate: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              phone: true,
              firstName: true,
              lastName: true,
              isActive: true,
            },
          },
          assignments: {
            include: {
              courseOffering: {
                include: {
                  course: true,
                  academicYear: { select: { name: true } },
                  batch: { select: { name: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    return { total, page, limit, totalPages: Math.ceil(total / limit), teachers };
  }

  async getTeacherAssignments(teacherId: string) {
    return prisma.teacherAssignment.findMany({
      where: { teacherId },
      include: {
        courseOffering: {
          include: {
            course: true,
            academicYear: true,
            batch: true,
            _count: { select: { enrollments: true } },
          },
        },
      },
    });
  }
}

export const teacherService = new TeacherService();
export default teacherService;
