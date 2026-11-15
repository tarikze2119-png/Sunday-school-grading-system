import { PrismaClient } from '@prisma/client';
import { validateDatabaseHost, resolveRuntimeDatabaseUrl } from './databaseGuard.js';

// Enforce fail-closed database host validation before Prisma client instantiation
validateDatabaseHost();

const runtimeDatabaseUrl = resolveRuntimeDatabaseUrl();

/**
 * Standard transaction options for lock-sensitive interactive transactions
 * (accounting for WAN network latency to remote Neon endpoints during PostgreSQL row-lock contention).
 */
export const LOCK_TRANSACTION_OPTIONS = {
  maxWait: 10000,
  timeout: 20000,
} as const;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(runtimeDatabaseUrl
      ? {
          datasources: {
            db: {
              url: runtimeDatabaseUrl,
            },
          },
        }
      : {}),
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

globalForPrisma.prisma = prisma;

export default prisma;
