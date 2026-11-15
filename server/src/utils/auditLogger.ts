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

export class SecurityIncidentException extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly incidentData: {
    userId?: string | null;
    action: string;
    entityName: string;
    entityId?: string | null;
    details?: Record<string, unknown> | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  };

  constructor(options: {
    message: string;
    statusCode?: number;
    code?: string;
    userId?: string | null;
    action: string;
    entityName: string;
    entityId?: string | null;
    details?: Record<string, unknown> | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    super(options.message);
    this.name = 'SecurityIncidentException';
    this.statusCode = options.statusCode || 500;
    this.code = options.code || 'SECURITY_INCIDENT';
    this.incidentData = {
      userId: options.userId || null,
      action: options.action,
      entityName: options.entityName,
      entityId: options.entityId || null,
      details: options.details || null,
      ipAddress: options.ipAddress || null,
      userAgent: options.userAgent || null,
    };
  }
}

/**
 * Persists a critical security incident independently using the root Prisma client.
 * Must be executed outside rolled-back business transactions.
 * Throws HTTP 503 AUDIT_PERSISTENCE_FAILED if the independent audit write fails.
 */
export async function logSecurityIncident(
  incident: SecurityIncidentException,
  rootPrismaClient: any = prisma
): Promise<void> {
  try {
    await rootPrismaClient.auditLog.create({
      data: {
        userId: incident.incidentData.userId || null,
        action: incident.incidentData.action,
        entityName: incident.incidentData.entityName,
        entityId: incident.incidentData.entityId || null,
        details: incident.incidentData.details ? (incident.incidentData.details as object) : undefined,
        ipAddress: incident.incidentData.ipAddress || null,
        userAgent: incident.incidentData.userAgent || null,
      },
    });
  } catch (error) {
    console.error('🚨 [EMERGENCY OPERATIONAL ALERT] Root security audit log persistence failed:', error);
    const auditFailure: any = new Error('የደህንነት ኦዲት መዝገብን ማስቀመጥ አልተቻለም (Audit persistence failed).');
    auditFailure.statusCode = 503;
    auditFailure.code = 'AUDIT_PERSISTENCE_FAILED';
    auditFailure.originalError = incident;
    throw auditFailure;
  }
}

/**
 * Standard audit logger.
 * When client (e.g. transaction client tx) is supplied, writes atomically within that client.
 * Suppresses non-critical logging errors to avoid blocking when running outside transactions.
 */
export const logAuditEvent = async (
  options: AuditLogOptions,
  client: any = prisma
): Promise<void> => {
  try {
    await client.auditLog.create({
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
    // Suppress non-blocking optional audit log failure
  }
};
