/**
 * cors.config.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Strict Origin Allowlist & CORS Configuration
 *
 * Implements a fail-closed exact-origin allowlist:
 * - Production domain: https://hymete-abrham-grading-system.vercel.app
 * - Approved staging preview domain: explicitly configured via STAGING_CLIENT_URL or CLIENT_URL
 * - Local development origins: permitted ONLY when running outside production
 * - Arbitrary *.vercel.app domains: strictly rejected
 * - Missing Origin headers: allowed for server-to-server, curl, cron, and mobile requests
 */

import cors from 'cors';

export const PRODUCTION_ORIGIN = 'https://hymete-abrham-grading-system.vercel.app';
export const STAGING_PREVIEW_ORIGIN = 'https://sunday-school-grading-system-git-staging-tarik19.vercel.app';

export interface CorsEnvOptions {
  nodeEnv?: string;
  vercelEnv?: string;
  stagingClientUrl?: string;
  clientUrl?: string;
}

export function getAllowedOrigins(env: CorsEnvOptions = {}): string[] {
  const nodeEnv = env.nodeEnv ?? process.env['NODE_ENV'] ?? 'development';
  const rawVercelEnv = env.vercelEnv ?? process.env['VERCEL_ENV'];
  const vercelEnv = rawVercelEnv ? rawVercelEnv.toLowerCase().trim() : undefined;
  const isVercelProduction = vercelEnv === 'production';
  const isVercelPreview = vercelEnv === 'preview';
  const isStaging = nodeEnv === 'staging';
  const isDevelopment = !isVercelProduction && nodeEnv !== 'production';

  const origins: string[] = [PRODUCTION_ORIGIN];

  // Approved staging preview domain: allowed in preview, staging, and dev; strictly excluded in pure Production
  if (isVercelPreview || isStaging || isDevelopment) {
    if (!origins.includes(STAGING_PREVIEW_ORIGIN)) {
      origins.push(STAGING_PREVIEW_ORIGIN);
    }
  }

  // 1. Explicit Staging Client URL
  const stagingUrl = env.stagingClientUrl ?? process.env['STAGING_CLIENT_URL'];
  if (stagingUrl && stagingUrl.trim().length > 0) {
    const cleaned = stagingUrl.trim().replace(/\/$/, '');
    if (!origins.includes(cleaned)) {
      origins.push(cleaned);
    }
  }

  // 2. Explicit Client URL from environment (if set and distinct)
  const clientUrl = env.clientUrl ?? process.env['CLIENT_URL'];
  if (clientUrl && clientUrl.trim().length > 0) {
    const cleaned = clientUrl.trim().replace(/\/$/, '');
    if (!origins.includes(cleaned)) {
      origins.push(cleaned);
    }
  }

  // 3. Local Development Origins — strictly excluded in Production and Preview
  const isProductionLike = isVercelProduction || nodeEnv === 'production';
  if (!isProductionLike) {
    const devOrigins = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5000',
      'http://127.0.0.1:5000',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ];
    for (const dev of devOrigins) {
      if (!origins.includes(dev)) {
        origins.push(dev);
      }
    }
  }

  return origins;
}

export function isAllowedOrigin(
  origin: string | undefined,
  env: CorsEnvOptions = {}
): boolean {
  // Legitimate server-to-server requests, curl, cron, mobile apps, or same-origin without Origin header
  if (!origin || origin.trim() === '') {
    return true;
  }

  const normalizedOrigin = origin.trim().replace(/\/$/, '').toLowerCase();
  const allowed = getAllowedOrigins(env).map((o) => o.toLowerCase());

  return allowed.includes(normalizedOrigin);
}

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS origin denied by policy: origin '${origin}' is not permitted.`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
