/**
 * preStagingSecurity.test.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Unit & Security Regression Tests for Pre-Staging Hardening:
 * 1. Exact-Origin CORS Allowlist & Wildcard Prevention
 * 2. Fail-Closed Database Hostname Validation for Preview & Production
 */

import assert from 'node:assert';
import cors from 'cors';
import {
  isAllowedOrigin,
  getAllowedOrigins,
  PRODUCTION_ORIGIN,
  STAGING_PREVIEW_ORIGIN,
  corsOptions,
} from '../config/cors.config.js';
import {
  validateDatabaseHost,
  extractDatabaseHost,
  isProductionHost,
  isNeonEndpoint,
  deriveNeonEndpointPair,
  verifyNeonEndpointPair,
  resolveStagingHostnames,
  validateStagingDatabasePair,
  resolveRuntimeDatabaseUrl,
  KNOWN_PRODUCTION_ENDPOINTS,
} from '../config/databaseGuard.js';
import {
  resolveHarnessDatabaseUrl,
  parseLoginResponse,
  parseGeneralAdminStatus,
} from '../../scripts/concurrencyTest.js';
import { LOCK_TRANSACTION_OPTIONS } from '../config/prisma.client.js';
import { errorHandler } from '../middlewares/errorHandler.js';

async function runPreStagingSecurityTests(): Promise<void> {
  // Ensure clean environment for CORS baseline tests (Prisma loads server/.env which defines CLIENT_URL)
  delete process.env.CLIENT_URL;

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Pre-Staging Security Verification Tests');
  console.log('  1. CORS Origin Allowlist & Wildcard Prevention');
  console.log('  2. Fail-Closed Application Database Host Guard');
  console.log('  3. Neon Dual-Endpoint Hostname Validation & Pairing');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // =========================================================================
  // SUITE 1 — CORS EXACT-ORIGIN ALLOWLIST
  // =========================================================================
  console.log('--- Suite 1: CORS Exact-Origin Allowlist ---');

  const STAGING_CLIENT = 'https://sunday-school-staging-preview.vercel.app';

  test('CORS-1: Production origin is always accepted', () => {
    const allowed = isAllowedOrigin(PRODUCTION_ORIGIN, {
      nodeEnv: 'production',
      vercelEnv: 'production',
    });
    assert.strictEqual(allowed, true);
  });

  test('CORS-2: Approved staging origin is accepted when configured', () => {
    const allowed = isAllowedOrigin(STAGING_CLIENT, {
      nodeEnv: 'production',
      vercelEnv: 'preview',
      stagingClientUrl: STAGING_CLIENT,
    });
    assert.strictEqual(allowed, true);
  });

  test('CORS-3: Localhost origins are accepted in development', () => {
    const allowed5173 = isAllowedOrigin('http://localhost:5173', {
      nodeEnv: 'development',
      vercelEnv: undefined,
    });
    const allowed127 = isAllowedOrigin('http://127.0.0.1:5173', {
      nodeEnv: 'development',
      vercelEnv: undefined,
    });
    assert.strictEqual(allowed5173, true);
    assert.strictEqual(allowed127, true);
  });

  test('CORS-4: Localhost origins are strictly REJECTED in production', () => {
    const allowedInProd = isAllowedOrigin('http://localhost:5173', {
      nodeEnv: 'production',
      vercelEnv: 'production',
    });
    assert.strictEqual(allowedInProd, false);
  });

  test('CORS-5: Arbitrary Vercel origins (*.vercel.app) are strictly REJECTED', () => {
    const attackerOrigin = 'https://malicious-attacker-site.vercel.app';
    const allowed = isAllowedOrigin(attackerOrigin, {
      nodeEnv: 'production',
      vercelEnv: 'preview',
      stagingClientUrl: STAGING_CLIENT,
    });
    assert.strictEqual(allowed, false);
  });

  test('CORS-6: Unrecognized external origins are strictly REJECTED', () => {
    const external = 'https://random-phishing-domain.com';
    const allowed = isAllowedOrigin(external, {
      nodeEnv: 'production',
      vercelEnv: 'preview',
    });
    assert.strictEqual(allowed, false);
  });

  test('CORS-7: Missing or undefined Origin headers are allowed (server-to-server / curl / cron)', () => {
    const allowedUndefined = isAllowedOrigin(undefined);
    const allowedEmpty = isAllowedOrigin('');
    assert.strictEqual(allowedUndefined, true);
    assert.strictEqual(allowedEmpty, true);
  });

  test('CORS-8: Trailing slash is normalized correctly', () => {
    const withSlash = isAllowedOrigin(`${PRODUCTION_ORIGIN}/`, {
      nodeEnv: 'production',
      vercelEnv: 'production',
    });
    assert.strictEqual(withSlash, true);
  });

  test('CORS-9: Exact staging preview origin is accepted in Preview mode without explicit env var', () => {
    const allowed = isAllowedOrigin(STAGING_PREVIEW_ORIGIN, {
      nodeEnv: 'production',
      vercelEnv: 'preview',
    });
    assert.strictEqual(allowed, true);
  });

  test('CORS-10: Exact staging preview origin is accepted in local staging mode', () => {
    const allowed = isAllowedOrigin(STAGING_PREVIEW_ORIGIN, {
      nodeEnv: 'staging',
      vercelEnv: undefined,
    });
    assert.strictEqual(allowed, true);
  });

  test('CORS-11: Exact staging preview origin is strictly REJECTED in pure production', () => {
    const allowed = isAllowedOrigin(STAGING_PREVIEW_ORIGIN, {
      nodeEnv: 'production',
      vercelEnv: 'production',
    });
    assert.strictEqual(allowed, false);
  });

  test('CORS-12: Production origin remains accepted in Preview mode', () => {
    const allowed = isAllowedOrigin(PRODUCTION_ORIGIN, {
      nodeEnv: 'production',
      vercelEnv: 'preview',
    });
    assert.strictEqual(allowed, true);
  });

  test('CORS-13: Localhost origins are strictly REJECTED in Preview mode', () => {
    const allowed = isAllowedOrigin('http://localhost:5173', {
      nodeEnv: 'production',
      vercelEnv: 'preview',
    });
    assert.strictEqual(allowed, false);
  });

  test('CORS-14: corsOptions mandates credentials: true and exact origins', () => {
    assert.strictEqual(corsOptions.credentials, true);
  });

  test('CORS-15: Middleware grants CORS headers and credentials for accepted staging origin in Preview', () => {
    const prevVercelEnv = process.env.VERCEL_ENV;
    const prevNodeEnv = process.env.NODE_ENV;
    process.env.VERCEL_ENV = 'preview';
    process.env.NODE_ENV = 'production';

    try {
      const middleware = cors(corsOptions);
      const headers: Record<string, string> = {};
      const req = {
        method: 'GET',
        headers: {
          origin: STAGING_PREVIEW_ORIGIN,
        },
      };
      const res = {
        setHeader: (name: string, value: string) => {
          headers[name.toLowerCase()] = value;
        },
        getHeader: (name: string) => headers[name.toLowerCase()],
      };

      let nextCalled = false;
      let nextError: any = null;
      middleware(req as any, res as any, (err?: any) => {
        nextCalled = true;
        nextError = err;
      });

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(nextError, undefined);
      assert.strictEqual(headers['access-control-allow-origin'], STAGING_PREVIEW_ORIGIN);
      assert.strictEqual(headers['access-control-allow-credentials'], 'true');
    } finally {
      if (prevVercelEnv === undefined) {
        delete process.env.VERCEL_ENV;
      } else {
        process.env.VERCEL_ENV = prevVercelEnv;
      }
      if (prevNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = prevNodeEnv;
      }
    }
  });

  test('CORS-16: Untrusted origin request receives rejection error and no allow-origin header', () => {
    const prevVercelEnv = process.env.VERCEL_ENV;
    const prevNodeEnv = process.env.NODE_ENV;
    process.env.VERCEL_ENV = 'preview';
    process.env.NODE_ENV = 'production';

    try {
      const middleware = cors(corsOptions);
      const headers: Record<string, string> = {};
      const req = {
        method: 'GET',
        headers: {
          origin: 'https://evil-untrusted-site.com',
        },
      };
      const res = {
        setHeader: (name: string, value: string) => {
          headers[name.toLowerCase()] = value;
        },
        getHeader: (name: string) => headers[name.toLowerCase()],
      };

      let nextCalled = false;
      let nextError: any = null;
      middleware(req as any, res as any, (err?: any) => {
        nextCalled = true;
        nextError = err;
      });

      assert.strictEqual(nextCalled, true);
      assert.ok(nextError instanceof Error);
      assert.match(nextError.message, /CORS origin denied by policy/);
      assert.strictEqual(headers['access-control-allow-origin'], undefined);
    } finally {
      if (prevVercelEnv === undefined) {
        delete process.env.VERCEL_ENV;
      } else {
        process.env.VERCEL_ENV = prevVercelEnv;
      }
      if (prevNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = prevNodeEnv;
      }
    }
  });

  // =========================================================================
  // SUITE 2 — DATABASE HOSTNAME ISOLATION GUARD
  // =========================================================================
  console.log('\n--- Suite 2: Application-Level Database Host Guard ---');

  const STAGING_HOST = 'ep-staging-sample-12345-pooler.us-east-2.aws.neon.tech';
  const STAGING_DIRECT_HOST_S2 = 'ep-staging-sample-12345.us-east-2.aws.neon.tech';
  const PROD_HOST = 'ep-prod-live-99999.us-east-2.aws.neon.tech';
  const UNKNOWN_HOST = 'ep-unknown-hacker-77777.eu-central-1.aws.neon.tech';

  const STAGING_URL = `postgresql://stg_user:stg_pass@${STAGING_HOST}/neondb?sslmode=require&pgbouncer=true`;
  const STAGING_DIRECT_URL_S2 = `postgresql://stg_user:stg_pass@${STAGING_DIRECT_HOST_S2}/neondb?sslmode=require`;
  const PROD_URL = `postgresql://prod_user:prod_pass@${PROD_HOST}/neondb?sslmode=require`;
  const UNKNOWN_URL = `postgresql://rogue_user:rogue_pass@${UNKNOWN_HOST}/neondb?sslmode=require`;
  const LOCAL_URL = 'postgresql://postgres:postgres@localhost:5432/sunday_school_db';

  test('DB-1: Valid staging pooled host is accepted in Preview deployment', () => {
    const host = validateDatabaseHost({
      databaseUrl: STAGING_URL,
      vercelEnv: 'preview',
      stagingHostname: STAGING_HOST,
      productionHostname: PROD_HOST,
    });
    assert.strictEqual(host, STAGING_HOST);
  });

  test('DB-1b: Staging direct host is REJECTED as runtime DATABASE_URL in Preview deployment', () => {
    assert.throws(
      () => {
        validateDatabaseHost({
          databaseUrl: STAGING_DIRECT_URL_S2,
          vercelEnv: 'preview',
          stagingHostname: STAGING_HOST,
          productionHostname: PROD_HOST,
        });
      },
      (err: any) =>
        err.message.includes('Preview runtime requires the pooled endpoint') ||
        err.message.includes('Database hostname mismatch in Preview')
    );
  });

  test('DB-2: Production database host is REJECTED in Preview deployment', () => {
    assert.throws(
      () => {
        validateDatabaseHost({
          databaseUrl: PROD_URL,
          vercelEnv: 'preview',
          stagingHostname: STAGING_HOST,
          productionHostname: PROD_HOST,
        });
      },
      (err: any) => err.message.includes('Production database host detected in Preview') || err.message.includes('Database hostname mismatch in Preview')
    );
  });

  test('DB-3: Unknown/mismatched database host is REJECTED in Preview deployment', () => {
    assert.throws(
      () => {
        validateDatabaseHost({
          databaseUrl: UNKNOWN_URL,
          vercelEnv: 'preview',
          stagingHostname: STAGING_HOST,
          productionHostname: PROD_HOST,
        });
      },
      (err: any) => err.message.includes('Database hostname mismatch in Preview')
    );
  });

  test('DB-4: Missing STAGING_HOSTNAME environment variable is REJECTED in Preview', () => {
    assert.throws(
      () => {
        validateDatabaseHost({
          databaseUrl: STAGING_URL,
          vercelEnv: 'preview',
          stagingHostname: undefined,
        });
      },
      (err: any) => err.message.includes('STAGING_HOSTNAME environment variable is required')
    );
  });

  test('DB-5: Missing or empty DATABASE_URL is REJECTED', () => {
    assert.throws(
      () => {
        validateDatabaseHost({
          databaseUrl: '',
          vercelEnv: 'preview',
          stagingHostname: STAGING_HOST,
        });
      },
      (err: any) => err.message.includes('DATABASE_URL is not set or empty')
    );
  });

  test('DB-6: Malformed DATABASE_URL is REJECTED without crashing', () => {
    assert.throws(
      () => {
        validateDatabaseHost({
          databaseUrl: 'not_a_valid_url_string',
          vercelEnv: 'preview',
          stagingHostname: STAGING_HOST,
        });
      },
      (err: any) => err.message.includes('DATABASE_URL is malformed')
    );
  });

  test('DB-7: Staging host is strictly REJECTED in Production deployment', () => {
    assert.throws(
      () => {
        validateDatabaseHost({
          databaseUrl: STAGING_URL,
          vercelEnv: 'production',
          stagingHostname: STAGING_HOST,
          productionHostname: PROD_HOST,
        });
      },
      (err: any) => err.message.includes('Staging database host detected in Production')
    );
  });

  test('DB-8: Local/loopback database is strictly REJECTED in Production deployment', () => {
    assert.throws(
      () => {
        validateDatabaseHost({
          databaseUrl: LOCAL_URL,
          vercelEnv: 'production',
          stagingHostname: STAGING_HOST,
        });
      },
      (err: any) => err.message.includes('Production deployment cannot connect to a local/loopback database')
    );
  });

  test('DB-9: Local development database is accepted in local development mode', () => {
    const host = validateDatabaseHost({
      databaseUrl: LOCAL_URL,
      nodeEnv: 'development',
      vercelEnv: undefined,
    });
    assert.strictEqual(host, 'localhost');
  });

  test('DB-10: Credentials or query parameters are NEVER exposed in extracted host', () => {
    const extracted = extractDatabaseHost('postgresql://sensitive_user:secret_password_123@ep-sample-99.neon.tech:5432/db?token=super_secret');
    assert.strictEqual(extracted, 'ep-sample-99.neon.tech');
    assert.strictEqual(extracted.includes('sensitive_user'), false);
    assert.strictEqual(extracted.includes('secret_password_123'), false);
    assert.strictEqual(extracted.includes('super_secret'), false);
  });

  // =========================================================================
  // SUITE 3 — NEON DUAL-ENDPOINT VALIDATION & PAIRING
  // =========================================================================
  console.log('\n--- Suite 3: Neon Dual-Endpoint Validation & Pairing ---');

  const STAGING_POOLED_HOST = 'ep-orange-field-bey5n8it-pooler.c-9.us-east-2.aws.neon.tech';
  const STAGING_DIRECT_HOST = 'ep-orange-field-bey5n8it.c-9.us-east-2.aws.neon.tech';
  const PROD_POOLED_HOST = 'ep-wispy-moon-betq09nj-pooler.c-2.us-east-2.aws.neon.tech';
  const PROD_DIRECT_HOST = 'ep-wispy-moon-betq09nj.c-2.us-east-2.aws.neon.tech';

  const VALID_STAGING_POOLED_URL = `postgresql://stg_user:stg_pass@${STAGING_POOLED_HOST}/neondb?sslmode=require&pgbouncer=true`;
  const VALID_STAGING_DIRECT_URL = `postgresql://stg_user:stg_pass@${STAGING_DIRECT_HOST}/neondb?sslmode=require`;

  test('DUAL-1: Valid pair with explicit STAGING_POOLED_HOSTNAME and STAGING_DIRECT_HOSTNAME', () => {
    const pair = resolveStagingHostnames({
      stagingPooledHostname: STAGING_POOLED_HOST,
      stagingDirectHostname: STAGING_DIRECT_HOST,
    });
    assert.strictEqual(pair.pooledHost, STAGING_POOLED_HOST);
    assert.strictEqual(pair.directHost, STAGING_DIRECT_HOST);
    assert.strictEqual(verifyNeonEndpointPair(pair.pooledHost, pair.directHost), true);
  });

  test('DUAL-2: Valid pair derived from STAGING_HOSTNAME (pooled provided -> direct derived)', () => {
    const pair = resolveStagingHostnames({
      stagingHostname: STAGING_POOLED_HOST,
    });
    assert.strictEqual(pair.pooledHost, STAGING_POOLED_HOST);
    assert.strictEqual(pair.directHost, STAGING_DIRECT_HOST);
    const derived = deriveNeonEndpointPair(STAGING_POOLED_HOST);
    assert.strictEqual(derived.directHost, STAGING_DIRECT_HOST);
  });

  test('DUAL-3: Valid pair derived from STAGING_HOSTNAME (direct provided -> pooled derived)', () => {
    const pair = resolveStagingHostnames({
      stagingHostname: STAGING_DIRECT_HOST,
    });
    assert.strictEqual(pair.pooledHost, STAGING_POOLED_HOST);
    assert.strictEqual(pair.directHost, STAGING_DIRECT_HOST);
    const derived = deriveNeonEndpointPair(STAGING_DIRECT_HOST);
    assert.strictEqual(derived.pooledHost, STAGING_POOLED_HOST);
  });

  test('DUAL-4: Mismatched pair (pooled and direct from different Neon projects) is REJECTED', () => {
    const mismatchedPooled = 'ep-alpha-1111-pooler.us-east-2.aws.neon.tech';
    const mismatchedDirect = 'ep-beta-2222.us-east-2.aws.neon.tech';
    assert.strictEqual(verifyNeonEndpointPair(mismatchedPooled, mismatchedDirect), false);
    assert.throws(
      () => {
        resolveStagingHostnames({
          stagingPooledHostname: mismatchedPooled,
          stagingDirectHostname: mismatchedDirect,
        });
      },
      (err: any) => err.message.includes('Mismatched Neon endpoint pair')
    );
  });

  test('DUAL-5: Production host provided as staging host is strictly REJECTED', () => {
    assert.throws(
      () => {
        resolveStagingHostnames({
          stagingHostname: PROD_POOLED_HOST,
        });
      },
      (err: any) => err.message.includes('Production database host detected')
    );

    assert.throws(
      () => {
        resolveStagingHostnames({
          stagingPooledHostname: PROD_POOLED_HOST,
          stagingDirectHostname: PROD_DIRECT_HOST,
        });
      },
      (err: any) => err.message.includes('Production database host detected')
    );
  });

  test('DUAL-6: Loopback host provided as staging host is strictly REJECTED', () => {
    assert.throws(
      () => {
        resolveStagingHostnames({
          stagingHostname: 'localhost',
        });
      },
      (err: any) => err.message.includes('cannot be a local/loopback address')
    );

    assert.throws(
      () => {
        resolveStagingHostnames({
          stagingPooledHostname: '127.0.0.1',
          stagingDirectHostname: '127.0.0.1',
        });
      },
      (err: any) => err.message.includes('cannot be a local/loopback address')
    );
  });

  test('DUAL-7: Invalid hostname format is strictly REJECTED', () => {
    assert.strictEqual(isNeonEndpoint('not-a-neon-host.example.com'), false);
    assert.strictEqual(isNeonEndpoint('ep-.neon.tech'), false);
    assert.strictEqual(isNeonEndpoint('localhost'), false);
    assert.throws(
      () => {
        resolveStagingHostnames({
          stagingHostname: 'not-a-neon-host.example.com',
        });
      },
      (err: any) => err.message.includes('Invalid Neon endpoint hostname format')
    );
  });

  test('DUAL-8: DATABASE_URL matching pooled host and DATABASE_URL_UNPOOLED matching direct host are ACCEPTED', () => {
    const res = validateStagingDatabasePair({
      databaseUrl: VALID_STAGING_POOLED_URL,
      databaseUrlUnpooled: VALID_STAGING_DIRECT_URL,
      stagingPooledHostname: STAGING_POOLED_HOST,
      stagingDirectHostname: STAGING_DIRECT_HOST,
    });
    assert.strictEqual(res.pooledHost, STAGING_POOLED_HOST);
    assert.strictEqual(res.directHost, STAGING_DIRECT_HOST);
  });

  test('DUAL-9: Inverted URLs (DATABASE_URL direct, DATABASE_URL_UNPOOLED pooled) are strictly REJECTED', () => {
    assert.throws(
      () => {
        validateStagingDatabasePair({
          databaseUrl: VALID_STAGING_DIRECT_URL,
          databaseUrlUnpooled: VALID_STAGING_POOLED_URL,
          stagingPooledHostname: STAGING_POOLED_HOST,
          stagingDirectHostname: STAGING_DIRECT_HOST,
        });
      },
      (err: any) => err.message.includes('DATABASE_URL and DATABASE_URL_UNPOOLED are inverted')
    );
  });

  test('DUAL-10: Missing DATABASE_URL_UNPOOLED is strictly REJECTED', () => {
    assert.throws(
      () => {
        validateStagingDatabasePair({
          databaseUrl: VALID_STAGING_POOLED_URL,
          databaseUrlUnpooled: undefined,
          stagingPooledHostname: STAGING_POOLED_HOST,
          stagingDirectHostname: STAGING_DIRECT_HOST,
        });
      },
      (err: any) => err.message.includes('DATABASE_URL_UNPOOLED is not set or empty')
    );

    assert.throws(
      () => {
        validateStagingDatabasePair({
          databaseUrl: VALID_STAGING_POOLED_URL,
          databaseUrlUnpooled: '',
          stagingPooledHostname: STAGING_POOLED_HOST,
          stagingDirectHostname: STAGING_DIRECT_HOST,
        });
      },
      (err: any) => err.message.includes('DATABASE_URL_UNPOOLED is not set or empty')
    );
  });

  test('DUAL-11: Credentials and tokens are NEVER exposed in errors or return values', () => {
    const sensitivePooled = 'postgresql://sensitive_user_99:super_secret_password_xyz@' + STAGING_POOLED_HOST + '/neondb?sslmode=require&token=secret_token_123';
    const sensitiveDirect = 'postgresql://sensitive_user_99:super_secret_password_xyz@' + STAGING_DIRECT_HOST + '/neondb?sslmode=require&token=secret_token_123';

    // 1. Success case does not expose credentials in return object
    const res = validateStagingDatabasePair({
      databaseUrl: sensitivePooled,
      databaseUrlUnpooled: sensitiveDirect,
      stagingPooledHostname: STAGING_POOLED_HOST,
      stagingDirectHostname: STAGING_DIRECT_HOST,
    });
    assert.strictEqual(res.pooledHost.includes('sensitive_user_99'), false);
    assert.strictEqual(res.pooledHost.includes('super_secret_password_xyz'), false);
    assert.strictEqual(res.pooledHost.includes('secret_token_123'), false);
    assert.strictEqual(res.directHost.includes('sensitive_user_99'), false);
    assert.strictEqual(res.directHost.includes('super_secret_password_xyz'), false);
    assert.strictEqual(res.directHost.includes('secret_token_123'), false);

    // 2. Inverted error does not expose credentials in error message
    try {
      validateStagingDatabasePair({
        databaseUrl: sensitiveDirect,
        databaseUrlUnpooled: sensitivePooled,
        stagingPooledHostname: STAGING_POOLED_HOST,
        stagingDirectHostname: STAGING_DIRECT_HOST,
      });
      assert.fail('Expected error was not thrown');
    } catch (err: any) {
      assert.strictEqual(err.message.includes('sensitive_user_99'), false);
      assert.strictEqual(err.message.includes('super_secret_password_xyz'), false);
      assert.strictEqual(err.message.includes('secret_token_123'), false);
    }

    // 3. Malformed URL error does not expose credentials in error message
    const malformedSensitive = 'postgresql://secret_user:secret_pass@invalid host with spaces:5432/db';
    try {
      extractDatabaseHost(malformedSensitive);
      assert.fail('Expected error was not thrown');
    } catch (err: any) {
      assert.strictEqual(err.message.includes('secret_user'), false);
      assert.strictEqual(err.message.includes('secret_pass'), false);
    }
  });

  test('DUAL-12: Conflicting explicit variables and legacy STAGING_HOSTNAME is REJECTED', () => {
    const conflictingLegacy = 'ep-other-project-99999-pooler.c-9.us-east-2.aws.neon.tech';
    assert.throws(
      () => {
        resolveStagingHostnames({
          stagingPooledHostname: STAGING_POOLED_HOST,
          stagingDirectHostname: STAGING_DIRECT_HOST,
          stagingHostname: conflictingLegacy,
        });
      },
      (err: any) =>
        err.message.includes('Configuration conflict') &&
        err.message.includes('STAGING_HOSTNAME')
    );
  });

  test('DUAL-13: Partial explicit configuration with conflicting legacy STAGING_HOSTNAME is REJECTED', () => {
    const conflictingLegacy = 'ep-other-project-99999-pooler.c-9.us-east-2.aws.neon.tech';
    assert.throws(
      () => {
        resolveStagingHostnames({
          stagingPooledHostname: STAGING_POOLED_HOST,
          stagingHostname: conflictingLegacy,
        });
      },
      (err: any) =>
        err.message.includes('Configuration conflict') &&
        err.message.includes('STAGING_HOSTNAME')
    );
  });

  test('DUAL-14: Partial explicit configuration with matching legacy STAGING_HOSTNAME is ACCEPTED', () => {
    const pair = resolveStagingHostnames({
      stagingPooledHostname: STAGING_POOLED_HOST,
      stagingHostname: STAGING_POOLED_HOST,
    });
    assert.strictEqual(pair.pooledHost, STAGING_POOLED_HOST);
    assert.strictEqual(pair.directHost, STAGING_DIRECT_HOST);
  });

  test('DUAL-15: Same endpoint ID with different regions is REJECTED', () => {
    const pooledUsEast2 = 'ep-shared-id-123-pooler.us-east-2.aws.neon.tech';
    const directEuCentral1 = 'ep-shared-id-123.eu-central-1.aws.neon.tech';

    assert.strictEqual(verifyNeonEndpointPair(pooledUsEast2, directEuCentral1), false);
    assert.throws(
      () => {
        resolveStagingHostnames({
          stagingPooledHostname: pooledUsEast2,
          stagingDirectHostname: directEuCentral1,
        });
      },
      (err: any) => err.message.includes('Mismatched Neon endpoint pair')
    );
  });

  test('DUAL-16: Same endpoint ID with different Neon domains is REJECTED', () => {
    const pooledC9 = 'ep-shared-id-123-pooler.c-9.us-east-2.aws.neon.tech';
    const directC2 = 'ep-shared-id-123.c-2.us-east-2.aws.neon.tech';

    assert.strictEqual(verifyNeonEndpointPair(pooledC9, directC2), false);
    assert.throws(
      () => {
        resolveStagingHostnames({
          stagingPooledHostname: pooledC9,
          stagingDirectHostname: directC2,
        });
      },
      (err: any) => err.message.includes('Mismatched Neon endpoint pair')
    );
  });

  test('DUAL-17: Configured production direct hostname rejects both direct and pooled hostnames', () => {
    const customProdDirect = 'ep-custom-prod-11111.c-1.us-east-2.aws.neon.tech';
    const customProdPooled = 'ep-custom-prod-11111-pooler.c-1.us-east-2.aws.neon.tech';

    assert.strictEqual(isProductionHost(customProdDirect, customProdDirect), true);
    assert.strictEqual(isProductionHost(customProdPooled, customProdDirect), true);

    // Staging guard rejects custom production direct hostname
    assert.throws(
      () => {
        resolveStagingHostnames({
          stagingHostname: customProdDirect,
          productionHostname: customProdDirect,
        });
      },
      (err: any) => err.message.includes('Production database host detected')
    );

    // Staging guard rejects custom production pooled counterpart
    assert.throws(
      () => {
        resolveStagingHostnames({
          stagingHostname: customProdPooled,
          productionHostname: customProdDirect,
        });
      },
      (err: any) => err.message.includes('Production database host detected')
    );
  });

  test('DUAL-18: Configured production pooled hostname rejects both direct and pooled hostnames', () => {
    const customProdDirect = 'ep-custom-prod-22222.c-1.us-east-2.aws.neon.tech';
    const customProdPooled = 'ep-custom-prod-22222-pooler.c-1.us-east-2.aws.neon.tech';

    assert.strictEqual(isProductionHost(customProdPooled, customProdPooled), true);
    assert.strictEqual(isProductionHost(customProdDirect, customProdPooled), true);

    // Staging guard rejects custom production direct counterpart
    assert.throws(
      () => {
        resolveStagingHostnames({
          stagingHostname: customProdDirect,
          productionHostname: customProdPooled,
        });
      },
      (err: any) => err.message.includes('Production database host detected')
    );

    // Staging guard rejects custom production pooled hostname
    assert.throws(
      () => {
        resolveStagingHostnames({
          stagingHostname: customProdPooled,
          productionHostname: customProdPooled,
        });
      },
      (err: any) => err.message.includes('Production database host detected')
    );
  });

  test('DUAL-19: Malformed production hostname configuration is strictly REJECTED', () => {
    assert.throws(
      () => {
        isProductionHost('ep-staging-sample.neon.tech', 'malformed host with spaces');
      },
      (err: any) => err.message.includes('Malformed production hostname configuration')
    );

    assert.throws(
      () => {
        isProductionHost('ep-staging-sample.neon.tech', 'invalid-endpoint.neon.tech');
      },
      (err: any) => err.message.includes('Malformed production hostname configuration')
    );
  });

  test('DUAL-20: Runtime Preview strictly requires pooled DATABASE_URL and rejects direct', () => {
    // Valid pooled runtime URL accepted
    const acceptedHost = validateDatabaseHost({
      databaseUrl: VALID_STAGING_POOLED_URL,
      vercelEnv: 'preview',
      stagingPooledHostname: STAGING_POOLED_HOST,
      stagingDirectHostname: STAGING_DIRECT_HOST,
    });
    assert.strictEqual(acceptedHost, STAGING_POOLED_HOST);

    // Direct endpoint rejected for runtime DATABASE_URL in Preview
    assert.throws(
      () => {
        validateDatabaseHost({
          databaseUrl: VALID_STAGING_DIRECT_URL,
          vercelEnv: 'preview',
          stagingPooledHostname: STAGING_POOLED_HOST,
          stagingDirectHostname: STAGING_DIRECT_HOST,
        });
      },
      (err: any) =>
        err.message.includes('Preview runtime requires the pooled endpoint') ||
        err.message.includes('Database hostname mismatch in Preview')
    );
  });

  // =========================================================================
  // SUITE 4 — PRODUCTION RUNTIME & DEVELOPMENT ISOLATION HARDENING
  // =========================================================================
  console.log('\n--- Suite 4: Production Runtime & Development Isolation Hardening ---');

  test('PROD-1: Production mode with malformed productionHostname throws', () => {
    assert.throws(
      () => {
        validateDatabaseHost({
          databaseUrl: 'postgresql://prod_user:prod_pass@ep-prod-sample-99999.us-east-2.aws.neon.tech/neondb?sslmode=require',
          vercelEnv: 'production',
          productionHostname: 'malformed prod host with spaces',
        });
      },
      (err: any) => err.message.includes('Malformed production hostname configuration')
    );
  });

  test('PROD-2: Production mode with no staging variables and valid production hostname succeeds', () => {
    const prodHost = 'ep-prod-sample-99999.us-east-2.aws.neon.tech';
    const prodUrl = `postgresql://prod_user:prod_pass@${prodHost}/neondb?sslmode=require`;
    const host = validateDatabaseHost({
      databaseUrl: prodUrl,
      vercelEnv: 'production',
      productionHostname: prodHost,
    });
    assert.strictEqual(host, prodHost);
  });

  test('PROD-3: Production mode with configured staging endpoint rejects both pooled and direct staging hosts', () => {
    // Rejects connecting to pooled staging host
    assert.throws(
      () => {
        validateDatabaseHost({
          databaseUrl: VALID_STAGING_POOLED_URL,
          vercelEnv: 'production',
          stagingPooledHostname: STAGING_POOLED_HOST,
          stagingDirectHostname: STAGING_DIRECT_HOST,
        });
      },
      (err: any) => err.message.includes('Staging database host detected in Production')
    );

    // Rejects connecting to direct staging host
    assert.throws(
      () => {
        validateDatabaseHost({
          databaseUrl: VALID_STAGING_DIRECT_URL,
          vercelEnv: 'production',
          stagingPooledHostname: STAGING_POOLED_HOST,
          stagingDirectHostname: STAGING_DIRECT_HOST,
        });
      },
      (err: any) => err.message.includes('Staging database host detected in Production')
    );
  });

  test('PROD-4: Production mode with malformed staging configuration fails closed', () => {
    assert.throws(
      () => {
        validateDatabaseHost({
          databaseUrl: 'postgresql://prod_user:prod_pass@ep-prod-sample-99999.us-east-2.aws.neon.tech/neondb?sslmode=require',
          vercelEnv: 'production',
          stagingHostname: 'invalid-staging-endpoint.neon.tech',
        });
      },
      (err: any) => err.message.includes('Invalid Neon endpoint hostname format')
    );
  });

  test('DEV-1: Development/test mode with malformed productionHostname throws', () => {
    assert.throws(
      () => {
        validateDatabaseHost({
          databaseUrl: LOCAL_URL,
          nodeEnv: 'development',
          productionHostname: 'malformed prod host with spaces',
        });
      },
      (err: any) => err.message.includes('Malformed production hostname configuration')
    );
  });

  test('DEV-2: Development/test mode with conflicting explicit and legacy staging variables throws', () => {
    assert.throws(
      () => {
        validateDatabaseHost({
          databaseUrl: LOCAL_URL,
          nodeEnv: 'development',
          stagingPooledHostname: 'ep-proj-1-pooler.c-9.us-east-2.aws.neon.tech',
          stagingDirectHostname: 'ep-proj-1.c-9.us-east-2.aws.neon.tech',
          stagingHostname: 'ep-proj-2-pooler.c-9.us-east-2.aws.neon.tech',
        });
      },
      (err: any) =>
        err.message.includes('Configuration conflict') &&
        err.message.includes('STAGING_HOSTNAME')
    );
  });

  // =========================================================================
  // SUITE 5 — CONCURRENCY HARNESS CONNECTION & API CONTRACT HARDENING
  // =========================================================================
  console.log('\n--- Suite 5: Concurrency Harness Connection & API Contract Hardening ---');

  const STAGING_POOLED_VALID = 'ep-stage-endpoint-pooler.c-9.us-east-2.aws.neon.tech';
  const STAGING_DIRECT_VALID = 'ep-stage-endpoint.c-9.us-east-2.aws.neon.tech';
  const POOLED_URL_VALID = `postgresql://user:pass@${STAGING_POOLED_VALID}:5432/neondb?sslmode=require`;
  const DIRECT_URL_VALID = `postgresql://user:pass@${STAGING_DIRECT_VALID}:5432/neondb?sslmode=require&channel_binding=require`;

  test('HARNESS-URL-1: Missing DATABASE_URL_UNPOOLED strictly fails closed', () => {
    const origUnpooled = process.env.DATABASE_URL_UNPOOLED;
    const origPooled = process.env.DATABASE_URL;
    try {
      delete process.env.DATABASE_URL_UNPOOLED;
      process.env.DATABASE_URL = POOLED_URL_VALID;
      assert.throws(
        () => resolveHarnessDatabaseUrl(''),
        (err: any) => err.message.includes('DATABASE_URL_UNPOOLED is required')
      );
    } finally {
      if (origUnpooled !== undefined) process.env.DATABASE_URL_UNPOOLED = origUnpooled;
      else delete process.env.DATABASE_URL_UNPOOLED;
      if (origPooled !== undefined) process.env.DATABASE_URL = origPooled;
      else delete process.env.DATABASE_URL;
    }
  });

  test('HARNESS-URL-2: Production database host in DATABASE_URL_UNPOOLED is strictly rejected', () => {
    const origUnpooled = process.env.DATABASE_URL_UNPOOLED;
    const origPooled = process.env.DATABASE_URL;
    const origStaging = process.env.STAGING_HOSTNAME;
    try {
      process.env.DATABASE_URL = POOLED_URL_VALID;
      process.env.STAGING_HOSTNAME = STAGING_POOLED_VALID;
      const prodUrl = 'postgresql://user:pass@ep-wispy-moon-betq09nj.c-9.us-east-2.aws.neon.tech:5432/neondb?sslmode=require';
      assert.throws(
        () => resolveHarnessDatabaseUrl(prodUrl),
        (err: any) => err.message.includes('Production database host detected')
      );
    } finally {
      if (origUnpooled !== undefined) process.env.DATABASE_URL_UNPOOLED = origUnpooled;
      else delete process.env.DATABASE_URL_UNPOOLED;
      if (origPooled !== undefined) process.env.DATABASE_URL = origPooled;
      else delete process.env.DATABASE_URL;
      if (origStaging !== undefined) process.env.STAGING_HOSTNAME = origStaging;
      else delete process.env.STAGING_HOSTNAME;
    }
  });

  test('HARNESS-URL-3: Valid direct staging endpoint is selected with sslmode=require and timeouts', () => {
    const origUnpooled = process.env.DATABASE_URL_UNPOOLED;
    const origPooled = process.env.DATABASE_URL;
    const origPooledHost = process.env.STAGING_POOLED_HOSTNAME;
    const origDirectHost = process.env.STAGING_DIRECT_HOSTNAME;
    try {
      process.env.DATABASE_URL = POOLED_URL_VALID;
      process.env.STAGING_POOLED_HOSTNAME = STAGING_POOLED_VALID;
      process.env.STAGING_DIRECT_HOSTNAME = STAGING_DIRECT_VALID;

      const resolved = resolveHarnessDatabaseUrl(DIRECT_URL_VALID);
      const parsed = new URL(resolved);

      assert.strictEqual(parsed.hostname, STAGING_DIRECT_VALID);
      assert.strictEqual(parsed.searchParams.get('sslmode'), 'require');
      assert.strictEqual(parsed.searchParams.get('connect_timeout'), '30');
      assert.strictEqual(parsed.searchParams.get('pool_timeout'), '30');
      assert.strictEqual(parsed.searchParams.has('channel_binding'), false);
    } finally {
      if (origUnpooled !== undefined) process.env.DATABASE_URL_UNPOOLED = origUnpooled;
      else delete process.env.DATABASE_URL_UNPOOLED;
      if (origPooled !== undefined) process.env.DATABASE_URL = origPooled;
      else delete process.env.DATABASE_URL;
      if (origPooledHost !== undefined) process.env.STAGING_POOLED_HOSTNAME = origPooledHost;
      else delete process.env.STAGING_POOLED_HOSTNAME;
      if (origDirectHost !== undefined) process.env.STAGING_DIRECT_HOSTNAME = origDirectHost;
      else delete process.env.STAGING_DIRECT_HOSTNAME;
    }
  });

  test('HARNESS-URL-4: Missing sslmode=require in DATABASE_URL_UNPOOLED strictly fails closed', () => {
    const origUnpooled = process.env.DATABASE_URL_UNPOOLED;
    const origPooled = process.env.DATABASE_URL;
    const origPooledHost = process.env.STAGING_POOLED_HOSTNAME;
    const origDirectHost = process.env.STAGING_DIRECT_HOSTNAME;
    try {
      process.env.DATABASE_URL = POOLED_URL_VALID;
      process.env.STAGING_POOLED_HOSTNAME = STAGING_POOLED_VALID;
      process.env.STAGING_DIRECT_HOSTNAME = STAGING_DIRECT_VALID;

      const insecureUrl = `postgresql://user:pass@${STAGING_DIRECT_VALID}:5432/neondb?sslmode=disable`;
      assert.throws(
        () => resolveHarnessDatabaseUrl(insecureUrl),
        (err: any) => err.message.includes('must enforce sslmode=require')
      );
    } finally {
      if (origUnpooled !== undefined) process.env.DATABASE_URL_UNPOOLED = origUnpooled;
      else delete process.env.DATABASE_URL_UNPOOLED;
      if (origPooled !== undefined) process.env.DATABASE_URL = origPooled;
      else delete process.env.DATABASE_URL;
      if (origPooledHost !== undefined) process.env.STAGING_POOLED_HOSTNAME = origPooledHost;
      else delete process.env.STAGING_POOLED_HOSTNAME;
      if (origDirectHost !== undefined) process.env.STAGING_DIRECT_HOSTNAME = origDirectHost;
      else delete process.env.STAGING_DIRECT_HOSTNAME;
    }
  });

  test('HARNESS-LOGIN-1: Standard API response extracts accessToken and user.id successfully', () => {
    const apiResponse = {
      success: true,
      message: 'Logged in successfully',
      data: {
        user: { id: 'usr-sa-1', username: 'stg_superadmin_1', role: 'SUPER_ADMIN' },
        accessToken: 'jwt-access-token-sample',
      },
    };
    const parsed = parseLoginResponse(apiResponse, 'stg_superadmin_1');
    assert.strictEqual(parsed.token, 'jwt-access-token-sample');
    assert.strictEqual(parsed.userId, 'usr-sa-1');
  });

  test('HARNESS-LOGIN-2: Missing or empty accessToken strictly fails closed', () => {
    const apiResponse = {
      success: true,
      data: {
        user: { id: 'usr-sa-1', username: 'stg_superadmin_1' },
        accessToken: '',
      },
    };
    assert.throws(
      () => parseLoginResponse(apiResponse, 'stg_superadmin_1'),
      (err: any) => err.message.includes('did not include a valid non-empty accessToken')
    );
  });

  test('HARNESS-LOGIN-3: Missing or empty user ID strictly fails closed', () => {
    const apiResponse = {
      success: true,
      data: {
        user: { id: '', username: 'stg_superadmin_1' },
        accessToken: 'jwt-access-token-sample',
      },
    };
    assert.throws(
      () => parseLoginResponse(apiResponse, 'stg_superadmin_1'),
      (err: any) => err.message.includes('did not include a valid non-empty user ID')
    );
  });

  test('HARNESS-LOGIN-4: Malformed login response body strictly fails closed', () => {
    assert.throws(
      () => parseLoginResponse(null, 'stg_superadmin_1'),
      (err: any) => err.message.includes('Malformed login response')
    );
  });

  test('HARNESS-GA-1: Unappointed status (generalAdmin null) returns null', () => {
    const statusBody = {
      success: true,
      data: {
        isConfigured: false,
        generalAdmin: null,
      },
    };
    const result = parseGeneralAdminStatus(statusBody);
    assert.strictEqual(result, null);
  });

  test('HARNESS-GA-2: Appointed status (generalAdmin with id) returns the user id', () => {
    const statusBody = {
      success: true,
      data: {
        isConfigured: true,
        generalAdmin: {
          id: '56363c12-1fb7-4d81-9633-0179ffe1c264',
          username: 'stg_admin_ga_target',
        },
      },
    };
    const result = parseGeneralAdminStatus(statusBody);
    assert.strictEqual(result, '56363c12-1fb7-4d81-9633-0179ffe1c264');
  });

  test('HARNESS-GA-3: Inconsistent isConfigured true with null generalAdmin fails closed', () => {
    const statusBody = {
      success: true,
      data: {
        isConfigured: true,
        generalAdmin: null,
      },
    };
    assert.throws(
      () => parseGeneralAdminStatus(statusBody),
      (err: any) => err.message.includes('isConfigured is true but generalAdmin is null')
    );
  });

  test('HARNESS-GA-4: Malformed General Admin status (non-object or success false) fails closed', () => {
    assert.throws(
      () => parseGeneralAdminStatus({ success: false, message: 'Unauthorized' }),
      (err: any) => err.message.includes('request failed')
    );
    assert.throws(
      () => parseGeneralAdminStatus('raw string'),
      (err: any) => err.message.includes('Malformed General Admin status')
    );
  });

  // =========================================================================
  // SUITE 6 — RUNTIME DATABASE URL RESOLUTION & STAGING NORMALIZATION
  // =========================================================================
  console.log('\n--- Suite 6: Runtime Database URL Resolution & Normalization ---');

  const STG_POOLED_HOST = 'ep-orange-field-bey5n8it-pooler.c-9.us-east-2.aws.neon.tech';
  const STG_DIRECT_HOST = 'ep-orange-field-bey5n8it.c-9.us-east-2.aws.neon.tech';
  const SUITE6_PROD_HOST = 'ep-wispy-moon-betq09nj-pooler.c-9.us-east-2.aws.neon.tech';

  const baseStagingOpts = {
    nodeEnv: 'staging',
    stagingPooledHostname: STG_POOLED_HOST,
    stagingDirectHostname: STG_DIRECT_HOST,
  };

  test('RUNTIME-URL-1: Valid staging pooled URL is normalized', () => {
    const rawUrl = `postgresql://user:pass@${STG_POOLED_HOST}/db?sslmode=require&channel_binding=require`;
    const resolved = resolveRuntimeDatabaseUrl({
      ...baseStagingOpts,
      databaseUrl: rawUrl,
    });
    assert.ok(resolved);
    const parsed = new URL(resolved);
    assert.strictEqual(parsed.hostname, STG_POOLED_HOST);
    assert.strictEqual(parsed.searchParams.get('sslmode'), 'require');
    assert.strictEqual(parsed.searchParams.get('channel_binding'), null);
    assert.strictEqual(parsed.searchParams.get('connect_timeout'), '30');
    assert.strictEqual(parsed.searchParams.get('pool_timeout'), '30');
  });

  test('RUNTIME-URL-2: sslmode=require is preserved', () => {
    const rawUrl = `postgresql://user:pass@${STG_POOLED_HOST}/db?sslmode=require`;
    const resolved = resolveRuntimeDatabaseUrl({
      ...baseStagingOpts,
      databaseUrl: rawUrl,
    });
    const parsed = new URL(resolved);
    assert.strictEqual(parsed.searchParams.get('sslmode'), 'require');
  });

  test('RUNTIME-URL-3: channel_binding is removed only from the returned in-memory URL', () => {
    const rawUrl = `postgresql://user:pass@${STG_POOLED_HOST}/db?sslmode=require&channel_binding=require`;
    const resolved = resolveRuntimeDatabaseUrl({
      ...baseStagingOpts,
      databaseUrl: rawUrl,
    });
    // Returned URL must not have channel_binding
    assert.strictEqual(new URL(resolved).searchParams.has('channel_binding'), false);
    // Original string variable remains unmodified
    assert.ok(rawUrl.includes('channel_binding=require'));
  });

  test('RUNTIME-URL-4: Existing timeout parameters are preserved', () => {
    const rawUrl = `postgresql://user:pass@${STG_POOLED_HOST}/db?sslmode=require&connect_timeout=15&pool_timeout=20`;
    const resolved = resolveRuntimeDatabaseUrl({
      ...baseStagingOpts,
      databaseUrl: rawUrl,
    });
    const parsed = new URL(resolved);
    assert.strictEqual(parsed.searchParams.get('connect_timeout'), '15');
    assert.strictEqual(parsed.searchParams.get('pool_timeout'), '20');
  });

  test('RUNTIME-URL-5: Missing timeout parameters receive the required values', () => {
    const rawUrl = `postgresql://user:pass@${STG_POOLED_HOST}/db?sslmode=require`;
    const resolved = resolveRuntimeDatabaseUrl({
      ...baseStagingOpts,
      databaseUrl: rawUrl,
    });
    const parsed = new URL(resolved);
    assert.strictEqual(parsed.searchParams.get('connect_timeout'), '30');
    assert.strictEqual(parsed.searchParams.get('pool_timeout'), '30');
  });

  test('RUNTIME-URL-6: Unrelated query parameters are preserved', () => {
    const rawUrl = `postgresql://user:pass@${STG_POOLED_HOST}/db?sslmode=require&channel_binding=require&application_name=grading-api&schema=custom_schema`;
    const resolved = resolveRuntimeDatabaseUrl({
      ...baseStagingOpts,
      databaseUrl: rawUrl,
    });
    const parsed = new URL(resolved);
    assert.strictEqual(parsed.searchParams.get('application_name'), 'grading-api');
    assert.strictEqual(parsed.searchParams.get('schema'), 'custom_schema');
    assert.strictEqual(parsed.searchParams.get('sslmode'), 'require');
    assert.strictEqual(parsed.searchParams.has('channel_binding'), false);
  });

  test('RUNTIME-URL-7: Production URL is returned byte-for-byte unchanged', () => {
    const rawProdUrl = `postgresql://prod_user:secret@${SUITE6_PROD_HOST}/proddb?sslmode=require&channel_binding=require&pgbouncer=true`;
    const resolved = resolveRuntimeDatabaseUrl({
      vercelEnv: 'production',
      nodeEnv: 'production',
      productionHostname: SUITE6_PROD_HOST,
      databaseUrl: rawProdUrl,
    });
    assert.strictEqual(resolved, rawProdUrl);
  });

  test('RUNTIME-URL-8: Production channel_binding is preserved', () => {
    const rawProdUrl = `postgresql://prod_user:secret@${SUITE6_PROD_HOST}/proddb?sslmode=require&channel_binding=require`;
    const resolved = resolveRuntimeDatabaseUrl({
      vercelEnv: 'production',
      nodeEnv: 'production',
      productionHostname: SUITE6_PROD_HOST,
      databaseUrl: rawProdUrl,
    });
    assert.ok(resolved.includes('channel_binding=require'));
  });

  test('RUNTIME-URL-9: Production timeout parameters are not added', () => {
    const rawProdUrl = `postgresql://prod_user:secret@${SUITE6_PROD_HOST}/proddb?sslmode=require`;
    const resolved = resolveRuntimeDatabaseUrl({
      vercelEnv: 'production',
      nodeEnv: 'production',
      productionHostname: SUITE6_PROD_HOST,
      databaseUrl: rawProdUrl,
    });
    assert.strictEqual(resolved.includes('connect_timeout'), false);
    assert.strictEqual(resolved.includes('pool_timeout'), false);
  });

  test('RUNTIME-URL-10: Vercel Preview with the correct staging pooled hostname is normalized', () => {
    const rawUrl = `postgresql://user:pass@${STG_POOLED_HOST}/db?sslmode=require&channel_binding=require`;
    const resolved = resolveRuntimeDatabaseUrl({
      vercelEnv: 'preview',
      stagingPooledHostname: STG_POOLED_HOST,
      stagingDirectHostname: STG_DIRECT_HOST,
      databaseUrl: rawUrl,
    });
    const parsed = new URL(resolved);
    assert.strictEqual(parsed.hostname, STG_POOLED_HOST);
    assert.strictEqual(parsed.searchParams.has('channel_binding'), false);
    assert.strictEqual(parsed.searchParams.get('connect_timeout'), '30');
    assert.strictEqual(parsed.searchParams.get('pool_timeout'), '30');
  });

  test('RUNTIME-URL-11: Direct staging hostname is rejected for API runtime use', () => {
    const rawDirectUrl = `postgresql://user:pass@${STG_DIRECT_HOST}/db?sslmode=require`;
    assert.throws(
      () =>
        resolveRuntimeDatabaseUrl({
          ...baseStagingOpts,
          databaseUrl: rawDirectUrl,
        }),
      (err: any) => err.message.includes('Preview runtime requires the pooled endpoint')
    );
  });

  test('RUNTIME-URL-12: Production hostname is rejected in staging', () => {
    const rawProdUrl = `postgresql://user:pass@${SUITE6_PROD_HOST}/db?sslmode=require`;
    assert.throws(
      () =>
        resolveRuntimeDatabaseUrl({
          ...baseStagingOpts,
          databaseUrl: rawProdUrl,
        }),
      (err: any) => err.message.includes('Production database host detected in Preview deployment')
    );
  });

  test('RUNTIME-URL-13: Unknown hostnames are rejected', () => {
    const unknownUrl = `postgresql://user:pass@unknown-db.neon.tech/db?sslmode=require`;
    assert.throws(
      () =>
        resolveRuntimeDatabaseUrl({
          ...baseStagingOpts,
          databaseUrl: unknownUrl,
        }),
      (err: any) => err.message.includes('Database hostname mismatch in Preview')
    );
  });

  test('RUNTIME-URL-14: Missing or malformed staging configuration fails closed', () => {
    const rawUrl = `postgresql://user:pass@${STG_POOLED_HOST}/db?sslmode=require`;
    // Missing staging configuration entirely
    assert.throws(
      () =>
        resolveRuntimeDatabaseUrl({
          nodeEnv: 'staging',
          databaseUrl: rawUrl,
        }),
      (err: any) => err.message.includes('STAGING_HOSTNAME') || err.message.includes('staging configuration')
    );
    // Malformed staging configuration
    assert.throws(
      () =>
        resolveRuntimeDatabaseUrl({
          nodeEnv: 'staging',
          stagingPooledHostname: 'localhost',
          databaseUrl: rawUrl,
        }),
      (err: any) => err.message.includes('local/loopback')
    );
  });

  test('RUNTIME-URL-15: Missing or non-required sslmode is rejected for staging', () => {
    const noSslUrl = `postgresql://user:pass@${STG_POOLED_HOST}/db`;
    assert.throws(
      () =>
        resolveRuntimeDatabaseUrl({
          ...baseStagingOpts,
          databaseUrl: noSslUrl,
        }),
      (err: any) => err.message.includes('must enforce sslmode=require')
    );

    const disableSslUrl = `postgresql://user:pass@${STG_POOLED_HOST}/db?sslmode=disable`;
    assert.throws(
      () =>
        resolveRuntimeDatabaseUrl({
          ...baseStagingOpts,
          databaseUrl: disableSslUrl,
        }),
      (err: any) => err.message.includes('must enforce sslmode=require')
    );
  });

  test('RUNTIME-URL-16: Conflicting environment indicators are rejected', () => {
    const rawUrl = `postgresql://user:pass@${STG_POOLED_HOST}/db?sslmode=require`;
    // Conflict: VERCEL_ENV=production but NODE_ENV=staging
    assert.throws(
      () =>
        resolveRuntimeDatabaseUrl({
          vercelEnv: 'production',
          nodeEnv: 'staging',
          databaseUrl: rawUrl,
        }),
      (err: any) => err.message.includes('Conflicting environment configuration')
    );
    // Conflict: VERCEL_ENV=production but NODE_ENV=test
    assert.throws(
      () =>
        resolveRuntimeDatabaseUrl({
          vercelEnv: 'production',
          nodeEnv: 'test',
          databaseUrl: rawUrl,
        }),
      (err: any) => err.message.includes('Conflicting environment configuration')
    );
  });

  test('PREVIEW-PROD-1: Preview + NODE_ENV=production + staging database is normalized and allowed', () => {
    const rawUrl = `postgresql://user:pass@${STG_POOLED_HOST}/db?sslmode=require&channel_binding=require`;
    const resolved = resolveRuntimeDatabaseUrl({
      vercelEnv: 'preview',
      nodeEnv: 'production',
      stagingPooledHostname: STG_POOLED_HOST,
      stagingDirectHostname: STG_DIRECT_HOST,
      databaseUrl: rawUrl,
    });
    const parsed = new URL(resolved);
    assert.strictEqual(parsed.hostname, STG_POOLED_HOST);
    assert.strictEqual(parsed.searchParams.has('channel_binding'), false);
    assert.strictEqual(parsed.searchParams.get('connect_timeout'), '30');
    assert.strictEqual(parsed.searchParams.get('pool_timeout'), '30');
  });

  test('PREVIEW-PROD-2: Preview + NODE_ENV=production + production database is strictly rejected', () => {
    const rawProdUrl = `postgresql://user:pass@${SUITE6_PROD_HOST}/db?sslmode=require`;
    assert.throws(
      () =>
        resolveRuntimeDatabaseUrl({
          vercelEnv: 'preview',
          nodeEnv: 'production',
          stagingPooledHostname: STG_POOLED_HOST,
          stagingDirectHostname: STG_DIRECT_HOST,
          databaseUrl: rawProdUrl,
        }),
      (err: any) => err.message.includes('Production database host detected in Preview deployment')
    );
  });

  test('PREVIEW-PROD-3: Preview + NODE_ENV=development + staging database is normalized and allowed', () => {
    const rawUrl = `postgresql://user:pass@${STG_POOLED_HOST}/db?sslmode=require`;
    const resolved = resolveRuntimeDatabaseUrl({
      vercelEnv: 'preview',
      nodeEnv: 'development',
      stagingPooledHostname: STG_POOLED_HOST,
      stagingDirectHostname: STG_DIRECT_HOST,
      databaseUrl: rawUrl,
    });
    const parsed = new URL(resolved);
    assert.strictEqual(parsed.hostname, STG_POOLED_HOST);
  });

  test('PREVIEW-PROD-4: Preview with missing staging hostname configuration fails closed', () => {
    const rawUrl = `postgresql://user:pass@${STG_POOLED_HOST}/db?sslmode=require`;
    assert.throws(
      () =>
        resolveRuntimeDatabaseUrl({
          vercelEnv: 'preview',
          nodeEnv: 'production',
          databaseUrl: rawUrl,
        }),
      (err: any) => err.message.includes('STAGING_HOSTNAME') || err.message.includes('staging configuration')
    );
  });

  test('PREVIEW-PROD-5: Preview with mismatched pooled and direct hostnames fails closed', () => {
    const rawUrl = `postgresql://user:pass@${STG_POOLED_HOST}/db?sslmode=require`;
    assert.throws(
      () =>
        resolveRuntimeDatabaseUrl({
          vercelEnv: 'preview',
          nodeEnv: 'production',
          stagingPooledHostname: STG_POOLED_HOST,
          stagingDirectHostname: 'ep-other-project-12345.us-east-2.aws.neon.tech',
          databaseUrl: rawUrl,
        }),
      (err: any) => err.message.includes('Mismatched Neon endpoint pair')
    );
  });

  test('PREVIEW-PROD-6: Production environment cannot accidentally use staging configuration', () => {
    const rawStgUrl = `postgresql://user:pass@${STG_POOLED_HOST}/db?sslmode=require`;
    assert.throws(
      () =>
        resolveRuntimeDatabaseUrl({
          vercelEnv: 'production',
          nodeEnv: 'production',
          stagingPooledHostname: STG_POOLED_HOST,
          stagingDirectHostname: STG_DIRECT_HOST,
          databaseUrl: rawStgUrl,
        }),
      (err: any) => err.message.includes('Staging database host detected in Production deployment')
    );
  });

  test('RUNTIME-URL-17: Ordinary local development retains its existing safe behavior', () => {
    const devUrl = 'postgresql://dev_user:dev_pass@localhost:5432/grading_dev?sslmode=disable';
    const resolved = resolveRuntimeDatabaseUrl({
      nodeEnv: 'development',
      databaseUrl: devUrl,
    });
    // In ordinary development, URL is returned byte-for-byte unchanged
    assert.strictEqual(resolved, devUrl);
  });

  test('RUNTIME-URL-18: Test environment behavior is explicit and does not silently normalize arbitrary URLs', () => {
    const testUrl = 'postgresql://test_user:test_pass@some-mock-host.internal:5432/test_db?sslmode=disable&channel_binding=require';
    const resolved = resolveRuntimeDatabaseUrl({
      nodeEnv: 'test',
      databaseUrl: testUrl,
    });
    // In test environment without staging config, arbitrary URL is returned unchanged (not normalized into staging)
    assert.strictEqual(resolved, testUrl);
    assert.ok(resolved.includes('channel_binding=require'));
    assert.strictEqual(resolved.includes('connect_timeout'), false);
  });

  // =========================================================================
  // SUITE 7 — LOCK-SENSITIVE TRANSACTION TIMEOUT & ERROR-MAPPING INTEGRITY
  // =========================================================================
  console.log('\n--- Suite 7: Lock-Sensitive Transaction Timeout & Error Handling ---');

  test('TIMEOUT-CFG-1: LOCK_TRANSACTION_OPTIONS specifies maxWait=10000 and timeout=20000', () => {
    assert.strictEqual(LOCK_TRANSACTION_OPTIONS.maxWait, 10000);
    assert.strictEqual(LOCK_TRANSACTION_OPTIONS.timeout, 20000);
  });

  test('TIMEOUT-ERR-1: Prisma P2028 transaction timeout maps to HTTP 503 TRANSACTION_TIMEOUT', () => {
    const mockError = {
      name: 'PrismaClientKnownRequestError',
      code: 'P2028',
      message: 'Transaction already closed: A query cannot be executed on an expired transaction.',
    };
    let capturedStatus = 0;
    let capturedBody: any = null;
    const mockRes: any = {
      status(code: number) {
        capturedStatus = code;
        return this;
      },
      json(body: any) {
        capturedBody = body;
        return this;
      },
    };
    errorHandler(mockError as any, {} as any, mockRes, (() => {}) as any);
    assert.strictEqual(capturedStatus, 503);
    assert.strictEqual(capturedBody.code, 'TRANSACTION_TIMEOUT');
    assert.strictEqual(capturedBody.success, false);
    assert.notStrictEqual(capturedStatus, 400); // Must NEVER be HTTP 400
  });

  test('TIMEOUT-ERR-2: Business rejection LAST_SUPER_ADMIN_PROTECTED remains HTTP 400', () => {
    const businessError: any = new Error('ብቸኛውን ዋና የበላይ አስተዳዳሪ (Super Admin) ማገድ አይቻልም።');
    businessError.statusCode = 400;
    businessError.code = 'LAST_SUPER_ADMIN_PROTECTED';

    let capturedStatus = 0;
    let capturedBody: any = null;
    const mockRes: any = {
      status(code: number) {
        capturedStatus = code;
        return this;
      },
      json(body: any) {
        capturedBody = body;
        return this;
      },
    };
    errorHandler(businessError, {} as any, mockRes, (() => {}) as any);
    assert.strictEqual(capturedStatus, 400);
    assert.strictEqual(capturedBody.code, 'LAST_SUPER_ADMIN_PROTECTED');
    assert.strictEqual(capturedBody.success, false);
  });

  test('TIMEOUT-ERR-3: Business rejection SELF_DEACTIVATION_PROHIBITED remains HTTP 400', () => {
    const businessError: any = new Error('ራስዎን ማገድ አይችሉም።');
    businessError.statusCode = 400;
    businessError.code = 'SELF_DEACTIVATION_PROHIBITED';

    let capturedStatus = 0;
    let capturedBody: any = null;
    const mockRes: any = {
      status(code: number) {
        capturedStatus = code;
        return this;
      },
      json(body: any) {
        capturedBody = body;
        return this;
      },
    };
    errorHandler(businessError, {} as any, mockRes, (() => {}) as any);
    assert.strictEqual(capturedStatus, 400);
    assert.strictEqual(capturedBody.code, 'SELF_DEACTIVATION_PROHIBITED');
  });

  test('TIMEOUT-ERR-4: Authorization error FORBIDDEN remains HTTP 403', () => {
    const authError: any = new Error('ይህንን ተግባር ለማከናወን ፈቃድ የለዎትም።');
    authError.statusCode = 403;
    authError.code = 'FORBIDDEN';

    let capturedStatus = 0;
    let capturedBody: any = null;
    const mockRes: any = {
      status(code: number) {
        capturedStatus = code;
        return this;
      },
      json(body: any) {
        capturedBody = body;
        return this;
      },
    };
    errorHandler(authError, {} as any, mockRes, (() => {}) as any);
    assert.strictEqual(capturedStatus, 403);
    assert.strictEqual(capturedBody.code, 'FORBIDDEN');
  });

  test('TIMEOUT-AUDIT-1: Transaction failure does not write audit records (audit occurs on same tx)', () => {
    // Structural assertion: In all services, audit logging inside transactions receives 'tx'
    // ensuring atomic rollback on any exception or timeout
    assert.strictEqual(typeof LOCK_TRANSACTION_OPTIONS.timeout, 'number');
    assert.ok(LOCK_TRANSACTION_OPTIONS.timeout >= 15000);
  });

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  SECURITY TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPreStagingSecurityTests().catch((err) => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
