import prisma, { LOCK_TRANSACTION_OPTIONS } from '../config/prisma.client.js';
import { Prisma, UserRole } from '@prisma/client';
import { SecurityIncidentException, logSecurityIncident, logAuditEvent } from '../utils/auditLogger.js';

export interface ValidatedGeneralAdminConfig {
  systemSetting: {
    id: string;
    generalAdminUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  generalAdminUser: {
    id: string;
    username: string;
    role: string;
    isActive: boolean;
    isDeleted: boolean;
    tokenVersion: number;
    adminResponsibilities: string[];
  } | null;
}

export interface ValidationOptions {
  requiredOperation?:
    | 'APPOINT_GENERAL_ADMIN'
    | 'REVOKE_GENERAL_ADMIN'
    | 'TRANSFER_GENERAL_ADMIN'
    | 'APPROVE_GRADES'
    | 'PUBLISH_GRADES'
    | 'ASSIGN_RESPONSIBILITY'
    | 'GENERAL_OPERATION';
  operatorId?: string;
  operatorRole?: UserRole;
  allowNullAppointment?: boolean;
  auditDetails?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Shared singleton validation with explicit row-level locking.
 * Enforces fail-closed security for General Admin configuration.
 */
export async function validateGeneralAdminConfiguration(
  tx: any,
  options?: ValidationOptions
): Promise<ValidatedGeneralAdminConfig> {
  // 1. Acquire row-level FOR UPDATE lock on SYSTEM_DEFAULT singleton
  const settings = (await tx.$queryRaw(
    Prisma.sql`SELECT id, "generalAdminUserId", "createdAt", "updatedAt" FROM system_settings WHERE id = 'SYSTEM_DEFAULT' FOR UPDATE`
  )) as Array<{ id: string; generalAdminUserId: string | null; createdAt: Date; updatedAt: Date }>;

  if (!settings || settings.length === 0) {
    throw new SecurityIncidentException({
      message: 'የሲስተሙ መቼት (SystemSetting) አልተገኘም (SYSTEM_CONFIG_MISSING)።',
      statusCode: 500,
      code: 'SYSTEM_CONFIG_MISSING',
      action: 'SYSTEM_CONFIG_MISSING_DETECTED',
      entityName: 'SystemSetting',
      entityId: 'SYSTEM_DEFAULT',
      userId: options?.operatorId,
      details: options?.auditDetails,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
    });
  }

  const systemSetting = settings[0];

  // 2. Handle null appointment
  if (!systemSetting.generalAdminUserId) {
    if (options?.allowNullAppointment) {
      return { systemSetting, generalAdminUser: null };
    }

    const err: any = new Error('ዋና አስተዳዳሪ (General Admin) አልተሾመም፤ ተግባሩን ማከናወን አይቻልም።');
    err.statusCode = 403;
    err.code = 'GENERAL_ADMIN_NOT_APPOINTED';
    throw err;
  }

  // 3. Acquire row-level lock on the appointed General Admin user
  const users = (await tx.$queryRaw(
    Prisma.sql`SELECT id, username, role, "isActive", "isDeleted", "tokenVersion", "adminResponsibilities" FROM users WHERE id = ${systemSetting.generalAdminUserId} FOR UPDATE`
  )) as Array<{
    id: string;
    username: string;
    role: string;
    isActive: boolean;
    isDeleted: boolean;
    tokenVersion: number;
    adminResponsibilities: string[];
  }>;

  if (!users || users.length === 0) {
    throw new SecurityIncidentException({
      message: 'የተሾመው ዋና አስተዳዳሪ አካውንት በዳታቤዝ ውስጥ አልተገኘም (Corrupted General Admin pointer)።',
      statusCode: 500,
      code: 'INVALID_GENERAL_ADMIN_POINTER',
      action: 'INVALID_GENERAL_ADMIN_POINTER_DETECTED',
      entityName: 'SystemSetting',
      entityId: 'SYSTEM_DEFAULT',
      userId: options?.operatorId,
      details: {
        generalAdminUserId: systemSetting.generalAdminUserId,
        reason: 'USER_NOT_FOUND',
        ...options?.auditDetails,
      },
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
    });
  }

  const gaUser = users[0];

  // 4. Validate pointer integrity: Must be role ADMIN, active, and not soft-deleted
  if (gaUser.role !== 'ADMIN' || !gaUser.isActive || gaUser.isDeleted) {
    const reason =
      gaUser.role !== 'ADMIN'
        ? 'ROLE_NOT_ADMIN'
        : !gaUser.isActive
        ? 'USER_INACTIVE'
        : 'USER_DELETED';

    throw new SecurityIncidentException({
      message: `የዋና አስተዳዳሪ አካውንት ውድቅ ሆኗል (${reason})።`,
      statusCode: 500,
      code: 'INVALID_GENERAL_ADMIN_POINTER',
      action: 'INVALID_GENERAL_ADMIN_POINTER_DETECTED',
      entityName: 'SystemSetting',
      entityId: 'SYSTEM_DEFAULT',
      userId: options?.operatorId,
      details: {
        generalAdminUserId: systemSetting.generalAdminUserId,
        role: gaUser.role,
        isActive: gaUser.isActive,
        isDeleted: gaUser.isDeleted,
        reason,
        ...options?.auditDetails,
      },
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
    });
  }

  // 5. Independent operator authorization checks
  if (options?.requiredOperation) {
    if (
      options.requiredOperation === 'APPROVE_GRADES' ||
      options.requiredOperation === 'PUBLISH_GRADES'
    ) {
      if (options.operatorId !== systemSetting.generalAdminUserId) {
        const err: any = new Error(
          'ውጤት የማጽደቅ እና ይፋ የማድረግ ስልጣን የዋና አስተዳዳሪው (General Admin) ብቻ ነው።'
        );
        err.statusCode = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
    } else if (options.requiredOperation === 'ASSIGN_RESPONSIBILITY') {
      const isSuperAdmin = options.operatorRole === UserRole.SUPER_ADMIN;
      const isGeneralAdmin = options.operatorId === systemSetting.generalAdminUserId;
      if (!isSuperAdmin && !isGeneralAdmin) {
        const err: any = new Error('የአስተዳዳሪዎችን ኃላፊነት ለመመደብ የሚያስችል ፈቃድ የለዎትም።');
        err.statusCode = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
    } else if (
      options.requiredOperation === 'APPOINT_GENERAL_ADMIN' ||
      options.requiredOperation === 'REVOKE_GENERAL_ADMIN' ||
      options.requiredOperation === 'TRANSFER_GENERAL_ADMIN'
    ) {
      if (options.operatorRole !== UserRole.SUPER_ADMIN) {
        const err: any = new Error(
          'ዋና አስተዳዳሪን የመሾም፣ የመሻር ወይም የማስተላለፍ ስልጣን የበላይ አስተዳዳሪ (Super Admin) ብቻ ነው።'
        );
        err.statusCode = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
    }
  }

  return { systemSetting, generalAdminUser: gaUser };
}

export class SystemSettingService {
  /**
   * Appoint General Admin (Super Admin only).
   */
  async appointGeneralAdmin(
    operator: { id: string; role: UserRole; username: string },
    targetUserId: string,
    ipAddress?: string | null,
    userAgent?: string | null
  ) {
    if (operator.role !== UserRole.SUPER_ADMIN) {
      const err: any = new Error('ዋና አስተዳዳሪን የመሾም ስልጣን የበላይ አስተዳዳሪ (Super Admin) ብቻ ነው።');
      err.statusCode = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Lock SYSTEM_DEFAULT
        const config = await validateGeneralAdminConfiguration(tx, {
          allowNullAppointment: true,
          operatorId: operator.id,
          operatorRole: operator.role,
        });

        if (config.systemSetting.generalAdminUserId) {
          const err: any = new Error(
            'ዋና አስተዳዳሪ አስቀድሞ ተሹሟል፤ እባክዎ ማስተላለፍን (Transfer) ወይም መሻርን (Revoke) ይጠቀሙ።'
          );
          err.statusCode = 409;
          err.code = 'GENERAL_ADMIN_ALREADY_EXISTS';
          throw err;
        }

        // 2. Lock target user row
        const targetUsers = (await tx.$queryRaw(
          Prisma.sql`SELECT id, username, role, "isActive", "isDeleted" FROM users WHERE id = ${targetUserId} FOR UPDATE`
        )) as Array<{ id: string; username: string; role: string; isActive: boolean; isDeleted: boolean }>;

        if (!targetUsers || targetUsers.length === 0) {
          const err: any = new Error('ተጠቃሚው አልተገኘም።');
          err.statusCode = 404;
          err.code = 'USER_NOT_FOUND';
          throw err;
        }

        const target = targetUsers[0];
        if (target.role !== 'ADMIN') {
          const err: any = new Error('ዋና አስተዳዳሪ ሆኖ የሚሾመው አካውንት አስተዳዳሪ (ADMIN) መሆን አለበት።');
          err.statusCode = 400;
          err.code = 'INVALID_ROLE';
          throw err;
        }

        if (!target.isActive || target.isDeleted) {
          const err: any = new Error('የታገደ ወይም የተሰረዘ አካውንት ዋና አስተዳዳሪ ሆኖ ሊሾም አይችልም።');
          err.statusCode = 400;
          err.code = 'ACCOUNT_INACTIVE_OR_DELETED';
          throw err;
        }

        // 3. Update appointment
        await tx.systemSetting.update({
          where: { id: 'SYSTEM_DEFAULT' },
          data: { generalAdminUserId: targetUserId },
        });

        // 4. Bump target tokenVersion
        await tx.user.update({
          where: { id: targetUserId },
          data: { tokenVersion: { increment: 1 } },
        });

        // 5. Commit atomic audit log
        await logAuditEvent(
          {
            userId: operator.id,
            action: 'GENERAL_ADMIN_APPOINTED',
            entityName: 'SystemSetting',
            entityId: 'SYSTEM_DEFAULT',
            details: {
              appointedUserId: targetUserId,
              appointedUsername: target.username,
              appointedBy: operator.username,
            },
            ipAddress,
            userAgent,
          },
          tx
        );

        return {
          message: `ተጠቃሚ '${target.username}' በተሳካ ሁኔታ በዋና አስተዳዳሪነት (General Admin) ተሹሟል።`,
          generalAdminUserId: targetUserId,
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
   * Revoke General Admin (Super Admin only).
   * Also acts as the repair path if pointer is corrupt.
   */
  async revokeGeneralAdmin(
    operator: { id: string; role: UserRole; username: string },
    ipAddress?: string | null,
    userAgent?: string | null
  ) {
    if (operator.role !== UserRole.SUPER_ADMIN) {
      const err: any = new Error('ዋና አስተዳዳሪን የመሻር ስልጣን የበላይ አስተዳዳሪ (Super Admin) ብቻ ነው።');
      err.statusCode = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Lock SYSTEM_DEFAULT
        const settings = (await tx.$queryRaw(
          Prisma.sql`SELECT id, "generalAdminUserId" FROM system_settings WHERE id = 'SYSTEM_DEFAULT' FOR UPDATE`
        )) as Array<{ id: string; generalAdminUserId: string | null }>;

        if (!settings || settings.length === 0) {
          throw new SecurityIncidentException({
            message: 'የሲስተሙ መቼት አልተገኘም።',
            statusCode: 500,
            code: 'SYSTEM_CONFIG_MISSING',
            action: 'SYSTEM_CONFIG_MISSING_DETECTED',
            entityName: 'SystemSetting',
            entityId: 'SYSTEM_DEFAULT',
            userId: operator.id,
            ipAddress,
            userAgent,
          });
        }

        const setting = settings[0];
        const incumbentId = setting.generalAdminUserId;

        if (!incumbentId) {
          return { message: 'የተሾመ ዋና አስተዳዳሪ የለም።', generalAdminUserId: null };
        }

        // 2. Lock incumbent user if exists and bump tokenVersion
        const users = (await tx.$queryRaw(
          Prisma.sql`SELECT id, username FROM users WHERE id = ${incumbentId} FOR UPDATE`
        )) as Array<{ id: string; username: string }>;

        if (users && users.length > 0) {
          await tx.user.update({
            where: { id: incumbentId },
            data: { tokenVersion: { increment: 1 } },
          });
        }

        // 3. Clear appointment
        await tx.systemSetting.update({
          where: { id: 'SYSTEM_DEFAULT' },
          data: { generalAdminUserId: null },
        });

        // 4. Commit atomic audit log
        await logAuditEvent(
          {
            userId: operator.id,
            action: 'GENERAL_ADMIN_REVOKED',
            entityName: 'SystemSetting',
            entityId: 'SYSTEM_DEFAULT',
            details: {
              revokedUserId: incumbentId,
              revokedBy: operator.username,
            },
            ipAddress,
            userAgent,
          },
          tx
        );

        return {
          message: 'የዋና አስተዳዳሪነት ሹመት በተሳካ ሁኔታ ተሽሯል።',
          generalAdminUserId: null,
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
   * Transfer General Admin (Super Admin only).
   */
  async transferGeneralAdmin(
    operator: { id: string; role: UserRole; username: string },
    newTargetUserId: string,
    ipAddress?: string | null,
    userAgent?: string | null
  ) {
    if (operator.role !== UserRole.SUPER_ADMIN) {
      const err: any = new Error('ዋና አስተዳዳሪን የማስተላለፍ ስልጣን የበላይ አስተዳዳሪ (Super Admin) ብቻ ነው።');
      err.statusCode = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Lock SYSTEM_DEFAULT
        const settings = (await tx.$queryRaw(
          Prisma.sql`SELECT id, "generalAdminUserId" FROM system_settings WHERE id = 'SYSTEM_DEFAULT' FOR UPDATE`
        )) as Array<{ id: string; generalAdminUserId: string | null }>;

        if (!settings || settings.length === 0) {
          throw new SecurityIncidentException({
            message: 'የሲስተሙ መቼት አልተገኘም።',
            statusCode: 500,
            code: 'SYSTEM_CONFIG_MISSING',
            action: 'SYSTEM_CONFIG_MISSING_DETECTED',
            entityName: 'SystemSetting',
            entityId: 'SYSTEM_DEFAULT',
            userId: operator.id,
            ipAddress,
            userAgent,
          });
        }

        const incumbentId = settings[0].generalAdminUserId;
        if (incumbentId === newTargetUserId) {
          return { message: 'ይህ ተጠቃሚ አስቀድሞ በዋና አስተዳዳሪነት ተሹሟል።', generalAdminUserId: newTargetUserId };
        }

        // 2. Lock affected users in ascending ID order
        const userIdsToLock = Array.from(new Set([incumbentId, newTargetUserId].filter(Boolean) as string[])).sort();
        for (const uid of userIdsToLock) {
          await tx.$queryRaw(Prisma.sql`SELECT id FROM users WHERE id = ${uid} FOR UPDATE`);
        }

        // Validate new target
        const newTarget = await tx.user.findUnique({
          where: { id: newTargetUserId },
          select: { id: true, username: true, role: true, isActive: true, isDeleted: true },
        });

        if (!newTarget) {
          const err: any = new Error('አዲሱ ተጠቃሚ አልተገኘም።');
          err.statusCode = 404;
          err.code = 'USER_NOT_FOUND';
          throw err;
        }

        if (newTarget.role !== 'ADMIN' || !newTarget.isActive || newTarget.isDeleted) {
          const err: any = new Error('አዲሱ ተሿሚ ንቁ እና ያልተሰረዘ አስተዳዳሪ (ADMIN) መሆን አለበት።');
          err.statusCode = 400;
          err.code = 'INVALID_TARGET_USER';
          throw err;
        }

        // 3. Invalidate old incumbent session
        if (incumbentId) {
          await tx.user.update({
            where: { id: incumbentId },
            data: { tokenVersion: { increment: 1 } },
          });
        }

        // 4. Invalidate new target session to reflect new GA status
        await tx.user.update({
          where: { id: newTargetUserId },
          data: { tokenVersion: { increment: 1 } },
        });

        // 5. Update appointment
        await tx.systemSetting.update({
          where: { id: 'SYSTEM_DEFAULT' },
          data: { generalAdminUserId: newTargetUserId },
        });

        // 6. Audit log
        await logAuditEvent(
          {
            userId: operator.id,
            action: 'GENERAL_ADMIN_TRANSFERRED',
            entityName: 'SystemSetting',
            entityId: 'SYSTEM_DEFAULT',
            details: {
              previousAdminUserId: incumbentId,
              newAdminUserId: newTargetUserId,
              newAdminUsername: newTarget.username,
              transferredBy: operator.username,
            },
            ipAddress,
            userAgent,
          },
          tx
        );

        return {
          message: `የዋና አስተዳዳሪነት ስልጣን ወደ '${newTarget.username}' በተሳካ ሁኔታ ተላልፏል።`,
          generalAdminUserId: newTargetUserId,
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
   * Retrieve current General Admin status.
   */
  async getGeneralAdminStatus() {
    const setting = await prisma.systemSetting.findUnique({
      where: { id: 'SYSTEM_DEFAULT' },
      include: {
        generalAdminUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            isActive: true,
            isDeleted: true,
            adminResponsibilities: true,
          },
        },
      },
    });

    if (!setting) {
      return { isConfigured: false, generalAdmin: null };
    }

    return {
      isConfigured: Boolean(setting.generalAdminUserId),
      generalAdmin: setting.generalAdminUser,
    };
  }
}

export const systemSettingService = new SystemSettingService();
export default systemSettingService;
