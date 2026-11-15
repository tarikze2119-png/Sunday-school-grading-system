import bcrypt from 'bcryptjs';
import prisma, { LOCK_TRANSACTION_OPTIONS } from '../config/prisma.client.js';
import { logAuditEvent, SecurityIncidentException, logSecurityIncident } from '../utils/auditLogger.js';
import { UserRole, Gender, AdminResponsibility, Prisma } from '@prisma/client';

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
  // Admin responsibilities
  adminResponsibilities?: AdminResponsibility[];
}

export class UserService {
  /**
   * List users with optional role, search filter, soft-deletion filter, and pagination
   */
  async listUsers(filters: {
    role?: UserRole;
    search?: string;
    isActive?: boolean;
    includeDeleted?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.includeDeleted !== true) {
      where.isDeleted = false;
    }
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

    const [total, users, systemSetting] = await Promise.all([
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
          isDeleted: true,
          deletedAt: true,
          adminResponsibilities: true,
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
      prisma.systemSetting.findUnique({
        where: { id: 'SYSTEM_DEFAULT' },
        select: { generalAdminUserId: true },
      }),
    ]);

    const gaId = systemSetting?.generalAdminUserId;
    const augmentedUsers = users.map((u) => ({
      ...u,
      isGeneralAdmin: u.id === gaId,
    }));

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      users: augmentedUsers,
    };
  }

  /**
   * Create a new user with strict RBAC hierarchy checks
   */
  async createUser(
    operator: { id: string; role: UserRole; username: string },
    input: CreateUserInput,
    ipAddress?: string,
    userAgent?: string
  ) {
    // 1. RBAC Hierarchy Enforcement
    if (operator.role === UserRole.ADMIN) {
      // Check if operator is the General Admin
      const setting = await prisma.systemSetting.findUnique({
        where: { id: 'SYSTEM_DEFAULT' },
        select: { generalAdminUserId: true },
      });
      const isGeneralAdmin = setting?.generalAdminUserId === operator.id;

      if (input.role === UserRole.SUPER_ADMIN) {
        const error: any = new Error('አስተዳዳሪ (Admin) የዋና የበላይ አስተዳዳሪ (Super Admin) አካውንት የመፍጠር ፈቃድ የለውም።');
        error.statusCode = 403;
        error.code = 'FORBIDDEN';
        throw error;
      }

      if (input.role === UserRole.ADMIN && !isGeneralAdmin) {
        const error: any = new Error('ተራ አስተዳዳሪ ሌላ አስተዳዳሪን የመመዝገብ ፈቃድ የለውም፤ ይህ የዋና አስተዳዳሪ (General Admin) ወይም Super Admin ስልጣን ነው።');
        error.statusCode = 403;
        error.code = 'FORBIDDEN';
        throw error;
      }

      if (input.role === UserRole.MANAGEMENT) {
        const error: any = new Error('አስተዳዳሪ (Admin) የአመራር (Management) አካውንት የመፍጠር ፈቃድ የለውም።');
        error.statusCode = 403;
        error.code = 'FORBIDDEN';
        throw error;
      }
    } else if (operator.role !== UserRole.SUPER_ADMIN) {
      const error: any = new Error('አካውንት የመፍጠር ፈቃድ የለዎትም።');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    // 2. Validate uniqueness across active and soft-deleted records
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
      const error: any = new Error('በዚህ የተጠቃሚ ስም፣ ኢሜይል ወይም ስልክ የተመዘገበ አካውንት አስቀድሞ አለ። የተሰረዙ የተጠቃሚ ስሞችንም እንደገና መጠቀም አይቻልም።');
      error.statusCode = 400;
      error.code = 'USERNAME_OR_EMAIL_TAKEN';
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
          isDeleted: false,
          adminResponsibilities: input.adminResponsibilities || [],
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

      await logAuditEvent(
        {
          userId: operator.id,
          action: 'USER_CREATED',
          entityName: 'User',
          entityId: user.id,
          details: {
            createdUsername: user.username,
            role: user.role,
            createdBy: operator.username,
          },
          ipAddress,
          userAgent,
        },
        tx
      );

      return user;
    });

    return newUser;
  }

  /**
   * Activate or Deactivate account with transaction locks and deployment marker clearance
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
      error.code = 'SELF_DEACTIVATION_PROHIBITED';
      throw error;
    }

    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Lock SYSTEM_DEFAULT
        const settings = (await tx.$queryRaw(
          Prisma.sql`SELECT id, "generalAdminUserId" FROM system_settings WHERE id = 'SYSTEM_DEFAULT' FOR UPDATE`
        )) as Array<{ id: string; generalAdminUserId: string | null }>;

        // 2. Lock target user row FOR UPDATE
        const targetUsers = (await tx.$queryRaw(
          Prisma.sql`SELECT id, username, role, "isActive", "isDeleted", "tokenVersion" FROM users WHERE id = ${targetUserId} FOR UPDATE`
        )) as Array<{
          id: string;
          username: string;
          role: UserRole;
          isActive: boolean;
          isDeleted: boolean;
          tokenVersion: number;
        }>;

        if (!targetUsers || targetUsers.length === 0) {
          const error: any = new Error('ተጠቃሚው አልተገኘም።');
          error.statusCode = 404;
          error.code = 'USER_NOT_FOUND';
          throw error;
        }

        const targetUser = targetUsers[0];

        if (targetUser.isDeleted) {
          const error: any = new Error('የተሰረዘ አካውንትን ሁኔታ መቀየር አይቻልም፤ መጀመሪያ መመለስ (Restore) አለበት።');
          error.statusCode = 400;
          error.code = 'USER_IS_DELETED';
          throw error;
        }

        // 3. Prohibit deactivating the last active Super Admin
        if (targetUser.role === UserRole.SUPER_ADMIN && !isActive) {
          const activeSuperAdmins = await tx.user.count({
            where: {
              role: UserRole.SUPER_ADMIN,
              isActive: true,
              isDeleted: false,
              id: { not: targetUserId },
            },
          });

          if (activeSuperAdmins === 0) {
            const error: any = new Error('ብቸኛውን ዋና የበላይ አስተዳዳሪ (Super Admin) ማገድ አይቻልም።');
            error.statusCode = 400;
            error.code = 'LAST_SUPER_ADMIN_PROTECTED';
            throw error;
          }
        }

        // 4. RBAC Permission Checks
        if (operator.role === UserRole.ADMIN) {
          if (
            targetUser.role === UserRole.SUPER_ADMIN ||
            targetUser.role === UserRole.MANAGEMENT ||
            targetUser.role === UserRole.ADMIN
          ) {
            const error: any = new Error('አስተዳዳሪ (Admin) የበላይ አካላትን ወይም አቻ አስተዳዳሪን የማገድ ፈቃድ የለውም።');
            error.statusCode = 403;
            error.code = 'FORBIDDEN';
            throw error;
          }
        } else if (operator.role !== UserRole.SUPER_ADMIN) {
          const error: any = new Error('ይህንን ተግባር ለማከናወን ፈቃድ የለዎትም።');
          error.statusCode = 403;
          error.code = 'FORBIDDEN';
          throw error;
        }

        // 5. If target is current General Admin and being deactivated: clear appointment atomically
        const currentGaId = settings && settings.length > 0 ? settings[0].generalAdminUserId : null;
        if (currentGaId === targetUserId && !isActive) {
          await tx.systemSetting.update({
            where: { id: 'SYSTEM_DEFAULT' },
            data: { generalAdminUserId: null },
          });

          await logAuditEvent(
            {
              userId: operator.id,
              action: 'GENERAL_ADMIN_REVOKED',
              entityName: 'SystemSetting',
              entityId: 'SYSTEM_DEFAULT',
              details: {
                reason: 'DEACTIVATED',
                targetUserId,
                targetUsername: targetUser.username,
                revokedBy: operator.username,
              },
              ipAddress,
              userAgent,
            },
            tx
          );
        }

        // 6. Deliberate status change: clear deployment restriction marker and bump tokenVersion
        const updated = await tx.user.update({
          where: { id: targetUserId },
          data: {
            isActive,
            deploymentRestrictionId: null,
            tokenVersion: { increment: 1 },
          },
        });

        // 7. Atomic audit log inside transaction
        await logAuditEvent(
          {
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
          },
          tx
        );

        return updated;
      }, LOCK_TRANSACTION_OPTIONS);
    } catch (error: any) {
      if (error instanceof SecurityIncidentException) {
        await logSecurityIncident(error);
      }
      throw error;
    }
  }

  /**
   * Soft-delete user account (Super Admin only)
   */
  async deleteUser(
    operator: { id: string; role: UserRole; username: string },
    targetUserId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    if (operator.role !== UserRole.SUPER_ADMIN) {
      const error: any = new Error('አካውንት የመሰረዝ (Soft delete) ስልጣን የበላይ አስተዳዳሪ (Super Admin) ብቻ ነው።');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    if (operator.id === targetUserId) {
      const error: any = new Error('ራስዎን ማጥፋት (መሰረዝ) አይችሉም።');
      error.statusCode = 400;
      error.code = 'SELF_DELETION_PROHIBITED';
      throw error;
    }

    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Lock SYSTEM_DEFAULT
        const settings = (await tx.$queryRaw(
          Prisma.sql`SELECT id, "generalAdminUserId" FROM system_settings WHERE id = 'SYSTEM_DEFAULT' FOR UPDATE`
        )) as Array<{ id: string; generalAdminUserId: string | null }>;

        // 2. Lock target user row FOR UPDATE
        const targetUsers = (await tx.$queryRaw(
          Prisma.sql`SELECT id, username, role, "isActive", "isDeleted", "tokenVersion" FROM users WHERE id = ${targetUserId} FOR UPDATE`
        )) as Array<{
          id: string;
          username: string;
          role: UserRole;
          isActive: boolean;
          isDeleted: boolean;
          tokenVersion: number;
        }>;

        if (!targetUsers || targetUsers.length === 0) {
          const error: any = new Error('ተጠቃሚው አልተገኘም።');
          error.statusCode = 404;
          error.code = 'USER_NOT_FOUND';
          throw error;
        }

        const targetUser = targetUsers[0];

        if (targetUser.isDeleted) {
          return { message: 'ይህ አካውንት አስቀድሞ ተሰርዟል።', user: targetUser };
        }

        // 3. Prevent deleting the last active Super Admin
        if (targetUser.role === UserRole.SUPER_ADMIN) {
          const activeSuperAdmins = await tx.user.count({
            where: {
              role: UserRole.SUPER_ADMIN,
              isActive: true,
              isDeleted: false,
              id: { not: targetUserId },
            },
          });

          if (activeSuperAdmins === 0) {
            const error: any = new Error('ብቸኛውን ዋና የበላይ አስተዳዳሪ (Super Admin) መሰረዝ አይቻልም።');
            error.statusCode = 400;
            error.code = 'LAST_SUPER_ADMIN_PROTECTED';
            throw error;
          }
        }

        // 4. If target is General Admin, clear appointment atomically
        const currentGaId = settings && settings.length > 0 ? settings[0].generalAdminUserId : null;
        if (currentGaId === targetUserId) {
          await tx.systemSetting.update({
            where: { id: 'SYSTEM_DEFAULT' },
            data: { generalAdminUserId: null },
          });

          await logAuditEvent(
            {
              userId: operator.id,
              action: 'GENERAL_ADMIN_REVOKED',
              entityName: 'SystemSetting',
              entityId: 'SYSTEM_DEFAULT',
              details: {
                reason: 'USER_SOFT_DELETED',
                targetUserId,
                targetUsername: targetUser.username,
              },
              ipAddress,
              userAgent,
            },
            tx
          );
        }

        // 5. Soft-delete: mark isDeleted, deactivate, increment tokenVersion, clear deployment restriction marker
        const updated = await tx.user.update({
          where: { id: targetUserId },
          data: {
            isDeleted: true,
            isActive: false,
            deletedAt: new Date(),
            deletedById: operator.id,
            deploymentRestrictionId: null,
            tokenVersion: { increment: 1 },
          },
        });

        // 6. Commit atomic audit log
        await logAuditEvent(
          {
            userId: operator.id,
            action: 'USER_SOFT_DELETED',
            entityName: 'User',
            entityId: targetUserId,
            details: {
              deletedUsername: targetUser.username,
              role: targetUser.role,
              deletedBy: operator.username,
            },
            ipAddress,
            userAgent,
          },
          tx
        );

        return {
          message: `የተጠቃሚ '${targetUser.username}' አካውንት በተሳካ ሁኔታ ተሰርዟል።`,
          user: updated,
        };
      }, LOCK_TRANSACTION_OPTIONS);
    } catch (error: any) {
      if (error instanceof SecurityIncidentException) {
        await logSecurityIncident(error);
      }
      throw error;
    }
  }

  /**
   * Restore a soft-deleted user (Super Admin only).
   * Restored accounts REMAIN INACTIVE until explicitly activated!
   */
  async restoreUser(
    operator: { id: string; role: UserRole; username: string },
    targetUserId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    if (operator.role !== UserRole.SUPER_ADMIN) {
      const error: any = new Error('የተሰረዘ አካውንትን የመመለስ (Restore) ስልጣን የበላይ አስተዳዳሪ (Super Admin) ብቻ ነው።');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }

    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Lock SYSTEM_DEFAULT
        await tx.$queryRaw(Prisma.sql`SELECT id FROM system_settings WHERE id = 'SYSTEM_DEFAULT' FOR UPDATE`);

        // 2. Lock target user row FOR UPDATE
        const targetUsers = (await tx.$queryRaw(
          Prisma.sql`SELECT id, username, role, "isDeleted" FROM users WHERE id = ${targetUserId} FOR UPDATE`
        )) as Array<{ id: string; username: string; role: UserRole; isDeleted: boolean }>;

        if (!targetUsers || targetUsers.length === 0) {
          const error: any = new Error('ተጠቃሚው አልተገኘም።');
          error.statusCode = 404;
          error.code = 'USER_NOT_FOUND';
          throw error;
        }

        const targetUser = targetUsers[0];
        if (!targetUser.isDeleted) {
          const error: any = new Error('ይህ አካውንት አልተሰረዘም።');
          error.statusCode = 400;
          error.code = 'USER_NOT_DELETED';
          throw error;
        }

        // 3. Restore account: remains inactive (isActive: false) until explicitly activated
        const updated = await tx.user.update({
          where: { id: targetUserId },
          data: {
            isDeleted: false,
            isActive: false, // Mandatory: must remain inactive upon restoration
            deletedAt: null,
            deletedById: null,
            deploymentRestrictionId: null,
            tokenVersion: { increment: 1 },
          },
        });

        // 4. Commit atomic audit log
        await logAuditEvent(
          {
            userId: operator.id,
            action: 'USER_RESTORED',
            entityName: 'User',
            entityId: targetUserId,
            details: {
              restoredUsername: targetUser.username,
              role: targetUser.role,
              restoredBy: operator.username,
              note: 'Account restored in inactive state pending explicit activation',
            },
            ipAddress,
            userAgent,
          },
          tx
        );

        return {
          message: `የተጠቃሚ '${targetUser.username}' አካውንት ወደ ሲስተሙ ተመልሷል፤ ነገር ግን አገልግሎት እንዲጀምር እስኪፈቀድለት ድረስ እንደታገደ (Inactive) ይቆያል።`,
          user: updated,
        };
      }, LOCK_TRANSACTION_OPTIONS);
    } catch (error: any) {
      if (error instanceof SecurityIncidentException) {
        await logSecurityIncident(error);
      }
      throw error;
    }
  }

  /**
   * Update subordinate admin responsibilities (Super Admin or General Admin only)
   */
  async updateAdminResponsibilities(
    operator: { id: string; role: UserRole; username: string },
    targetUserId: string,
    newResponsibilities: AdminResponsibility[],
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Lock SYSTEM_DEFAULT
        const settings = (await tx.$queryRaw(
          Prisma.sql`SELECT id, "generalAdminUserId" FROM system_settings WHERE id = 'SYSTEM_DEFAULT' FOR UPDATE`
        )) as Array<{ id: string; generalAdminUserId: string | null }>;

        const isSuperAdmin = operator.role === UserRole.SUPER_ADMIN;
        const currentGaId = settings && settings.length > 0 ? settings[0].generalAdminUserId : null;
        const isGeneralAdmin = currentGaId === operator.id;

        if (!isSuperAdmin && !isGeneralAdmin) {
          const error: any = new Error('የአስተዳዳሪ ኃላፊነቶችን የመመደብ ፈቃድ የለዎትም። ይህ የSuper Admin ወይም የዋና አስተዳዳሪ (General Admin) ስልጣን ነው።');
          error.statusCode = 403;
          error.code = 'FORBIDDEN';
          throw error;
        }

        // 2. Lock target user row FOR UPDATE
        const targetUsers = (await tx.$queryRaw(
          Prisma.sql`SELECT id, username, role, "isActive", "isDeleted", "tokenVersion", "adminResponsibilities" FROM users WHERE id = ${targetUserId} FOR UPDATE`
        )) as Array<{
          id: string;
          username: string;
          role: UserRole;
          isActive: boolean;
          isDeleted: boolean;
          tokenVersion: number;
          adminResponsibilities: string[];
        }>;

        if (!targetUsers || targetUsers.length === 0) {
          const error: any = new Error('ተጠቃሚው አልተገኘም።');
          error.statusCode = 404;
          error.code = 'USER_NOT_FOUND';
          throw error;
        }

        const targetUser = targetUsers[0];

        if (targetUser.role !== UserRole.ADMIN) {
          const error: any = new Error('ኃላፊነት ሊመደብ የሚችለው ለአስተዳዳሪ (ADMIN) አካውንት ብቻ ነው።');
          error.statusCode = 400;
          error.code = 'INVALID_ROLE';
          throw error;
        }

        if (!targetUser.isActive || targetUser.isDeleted) {
          const error: any = new Error('የታገደ ወይም የተሰረዘ አካውንት ላይ ኃላፊነት መመደብ አይቻልም።');
          error.statusCode = 400;
          error.code = 'ACCOUNT_INACTIVE_OR_DELETED';
          throw error;
        }

        // 3. Update responsibilities and bump tokenVersion to invalidate stale tokens
        const updated = await tx.user.update({
          where: { id: targetUserId },
          data: {
            adminResponsibilities: newResponsibilities,
            tokenVersion: { increment: 1 },
          },
        });

        // 4. Commit atomic audit log
        await logAuditEvent(
          {
            userId: operator.id,
            action: 'ADMIN_RESPONSIBILITIES_UPDATED',
            entityName: 'User',
            entityId: targetUserId,
            details: {
              targetUsername: targetUser.username,
              previousResponsibilities: targetUser.adminResponsibilities,
              newResponsibilities,
              assignedBy: operator.username,
            },
            ipAddress,
            userAgent,
          },
          tx
        );

        return {
          message: `የአስተዳዳሪ '${targetUser.username}' ኃላፊነቶች በተሳካ ሁኔታ ተስተካክለዋል።`,
          user: updated,
        };
      }, LOCK_TRANSACTION_OPTIONS);
    } catch (error: any) {
      if (error instanceof SecurityIncidentException) {
        await logSecurityIncident(error);
      }
      throw error;
    }
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
