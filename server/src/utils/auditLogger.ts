import prisma from '../config/prisma.client.js';

export interface AuditLogOptions {
  userId?: string | null;
  action: string;
  entityName: string;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export const logAuditEvent = async (options: AuditLogOptions): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: options.userId || null,
        action: options.action,
        entityName: options.entityName,
        entityId: options.entityId || null,
        details: options.details ? (options.details as object) : undefined,
        ipAddress: options.ipAddress || null,
        userAgent: options.userAgent || null,
      },
    });
  } catch (error) {
    console.error('⚠️ [AuditLog Error] Failed to write audit log entry:', error);
    // Non-blocking so the main transaction completes
  }
};
