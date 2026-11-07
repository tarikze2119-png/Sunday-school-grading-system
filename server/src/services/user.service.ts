import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.client.js';
import { logAuditEvent } from '../utils/auditLogger.js';
import { UserRole, Gender } from '@prisma/client';

export interface CreateUserInput {
  username: string;
  email?: string;
  password?: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  grandfatherName?: string;
  phone?: string;
  // Student-specific fields
  batchId?: string;
  academicYearId?: string;
  admissionNumber?: string;
  baptismalName?: string;
  gender?: Gender;
  guardianName?: string;
  guardianPhone?: string;
  dateOfBirth?: string;
  // Teacher-specific fields
  teacherCode?: string;
  spiritualTitle?: string;
  qualification?: string;
  specialization?: string;
  // Management-specific fields
  department?: string;
  positionTitle?: string;
  officePhone?: string;
}

export class UserService {
  /**
   * List users with optional role, search filter, and pagination
   */
  async listUsers(filters: { role?: UserRole; search?: string; isActive?: boolean; page?: number; limit?: number }) {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.role) {
      where.role = filters.role;
    }
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters.search) {
      const q = filters.search.trim();
      where.OR = [
        { username: { contains: q, mode: 'insensitive' } },
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          phone: true,
          role: true,
          firstName: true,
          lastName: true,
          grandfatherName: true,
          isActive: true,
          createdAt: true,
          studentProfile: {
            select: {
              id: true,
              admissionNumber: true,
              baptismalName: true,
              batch: { select: { id: true, name: true } },
              academicYear: { select: { id: true, name: true } },
            },
          },
          teacherProfile: {
            select: {
              id: true,
              teacherCode: true,
              spiritualTitle: true,
              specialization: true,
            },
          },
          managementProfile: {
            select: {
              id: true,
              department: true,
              positionTitle: true,
            },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      users,
    };
  }

  /**
   * Create a new user with strict RBAC boundary checks
   */
  async createUser(
    operator: { id: string; role: UserRole; username: string },
    input: CreateUserInput,
    ipAddress?: string,
    userAgent?: string
  ) {
    // 1. RBAC Hierarchy Enforcement
    if (operator.role === UserRole.ADMIN) {
      if (input.role === UserRole.SUPER_ADMIN || input.role === UserRole.ADMIN) {
        const error: any = new Error('አስተዳዳሪ (Admin) የዋና አስተዳዳሪን ወይም የሌላ አስተዳዳሪን አካውንት የመፍጠር ፈቃድ የለውም።');
        error.statusCode = 403;
        throw error;
      }
      if (input.role === UserRole.MANAGEMENT) {
        const error: any = new Error('አስተዳዳሪ (Admin) የአመራር (Management) አካውንት የመፍጠር ፈቃድ የለውም። ይህ ተግባር የዋና አስተዳዳሪ ብቻ ነው።');
        error.statusCode = 403;
        throw error;
      }
    } else if (operator.role !== UserRole.SUPER_ADMIN) {
      const error: any = new Error('አካውንት የመፍጠር ፈቃድ የለዎትም።');
      error.statusCode = 403;
      throw error;
    }

    // 2. Validate uniqueness
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { username: input.username.trim() },
          ...(input.email ? [{ email: input.email.trim().toLowerCase() }] : []),
          ...(input.phone ? [{ phone: input.phone.trim() }] : []),
        ],
      },
    });

    if (existing) {
      const error: any = new Error('በዚህ የተጠቃሚ ስም፣ ኢሜይል ወይም ስልክ የተመዘገበ አካውንት አስቀድሞ አለ።');
      error.statusCode = 400;
      throw error;
    }

    // 3. Hash password (default: Temporary@2026 if not specified)
    const rawPassword = input.password || 'Temporary@2026';
    const passwordHash = await bcrypt.hash(rawPassword, 12);

    // 4. Create user with transaction to attach corresponding profile
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: input.username.trim(),
          email: input.email ? input.email.trim().toLowerCase() : null,
          passwordHash,
          role: input.role,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          grandfatherName: input.grandfatherName ? input.grandfatherName.trim() : null,
          phone: input.phone ? input.phone.trim() : null,
          isActive: true,
        },
      });

      // Attach profile based on role
      if (input.role === UserRole.STUDENT) {
        if (!input.batchId || !input.academicYearId) {
          throw new Error('ተማሪ ለመመዝገብ የትምህርት ዘመን እና ምድብ (Batch) መመረጥ አለበት።');
        }
        const admissionNum = input.admissionNumber || `STU-${Date.now().toString().slice(-6)}`;
        await tx.student.create({
          data: {
            userId: user.id,
            academicYearId: input.academicYearId,
            batchId: input.batchId,
            admissionNumber: admissionNum,
            baptismalName: input.baptismalName,
            gender: input.gender || Gender.MALE,
            guardianName: input.guardianName,
            guardianPhone: input.guardianPhone,
            dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
          },
        });
      } else if (input.role === UserRole.TEACHER) {
        const teacherCode = input.teacherCode || `TCH-${Date.now().toString().slice(-4)}`;
        await tx.teacher.create({
          data: {
            userId: user.id,
            teacherCode,
            spiritualTitle: input.spiritualTitle || 'መምህር',
            qualification: input.qualification,
            specialization: input.specialization,
          },
        });
      } else if (input.role === UserRole.MANAGEMENT) {
        await tx.managementProfile.create({
          data: {
            userId: user.id,
            department: input.department || 'አጠቃላይ አመራር',
            positionTitle: input.positionTitle || 'የቦርድ አባል',
            officePhone: input.officePhone,
          },
        });
      }

      return user;
    });

    await logAuditEvent({
      userId: operator.id,
      action: 'USER_CREATED',
      entityName: 'User',
      entityId: newUser.id,
      details: {
        createdUsername: newUser.username,
        role: newUser.role,
        createdBy: operator.username,
      },
      ipAddress,
      userAgent,
    });

    return newUser;
  }

  /**
   * Activate or Deactivate account with RBAC checks
   */
  async toggleUserStatus(
    operator: { id: string; role: UserRole; username: string },
    targetUserId: string,
    isActive: boolean,
    ipAddress?: string,
    userAgent?: string
  ) {
    if (operator.id === targetUserId && !isActive) {
      const error: any = new Error('ራስዎን ማገድ አይችሉም።');
      error.statusCode = 400;
      throw error;
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      const error: any = new Error('ተጠቃሚው አልተገኘም።');
      error.statusCode = 404;
      throw error;
    }

    // RBAC: Admin cannot toggle Super Admin or Management
    if (operator.role === UserRole.ADMIN) {
      if (targetUser.role === UserRole.SUPER_ADMIN || targetUser.role === UserRole.MANAGEMENT || targetUser.role === UserRole.ADMIN) {
        const error: any = new Error('አስተዳዳሪ (Admin) የበላይ አካላትን ወይም አቻ አስተዳዳሪን የማገድ ፈቃድ የለውም።');
        error.statusCode = 403;
        throw error;
      }
    } else if (operator.role !== UserRole.SUPER_ADMIN) {
      const error: any = new Error('ይህንን ተግባር ለማከናወን ፈቃድ የለዎትም።');
      error.statusCode = 403;
      throw error;
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { isActive },
    });

    await logAuditEvent({
      userId: operator.id,
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entityName: 'User',
      entityId: targetUserId,
      details: {
        targetUsername: targetUser.username,
        targetRole: targetUser.role,
        modifiedBy: operator.username,
      },
      ipAddress,
      userAgent,
    });

    return updated;
  }

  /**
   * Retrieve Audit Logs (Super Admin only)
   */
  async getAuditLogs(page = 1, limit = 25) {
    const skip = (page - 1) * limit;
    const [total, logs] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              role: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      logs,
    };
  }
}

export const userService = new UserService();
export default userService;
