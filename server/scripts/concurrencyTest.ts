/**
 * concurrencyTest.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Phase 1 Concurrency Verification Test — ሐይመተ አብርሃም ሰንበት ትምህርት ቤት
 *
 * PURPOSE:
 *   Verifies that the application correctly serializes concurrent requests
 *   using PostgreSQL row-level locks (SELECT ... FOR UPDATE) and transaction
 *   isolation in UserService.toggleUserStatus and SystemSettingService.
 *
 *   TEST SUITES:
 *
 *   TEST A — Concurrent Super Admin Deactivation & Last-Active Guard:
 *     - Strictly read-only precondition: Confirms stg_superadmin_1 and
 *       stg_superadmin_2 exist, are active, non-deleted, and constitute the
 *       EXACT set of active Super Admins in the entire database (count === 2).
 *       If any other active Super Admin exists (e.g. baseline 'superadmin'),
 *       aborts immediately with instructions — NEVER modifies baseline accounts.
 *     - Fires simultaneous mutual deactivation requests via Promise.allSettled.
 *     - Verifies PostgreSQL transaction serialization: exactly one deactivation
 *       succeeds (HTTP 200), while the competing deactivation is rejected
 *       (HTTP 400 LAST_SUPER_ADMIN_PROTECTED or HTTP 401 session revocation).
 *     - Neither request returns HTTP 500.
 *     - Automatically inspects the database to assert that exactly one active
 *       Super Admin remains, and tokenVersion incremented predictably (+1).
 *     - Asserts audit log persistence: verifies USER_DEACTIVATED audit log exists
 *       for the target account by the winning Super Admin (createdAt >= test start).
 *     - Asserts no false audit log exists claiming the winner was deactivated.
 *     - Verifies direct attempts to deactivate the sole remaining Super Admin
 *       are blocked (HTTP 400 SELF_DEACTIVATION_PROHIBITED).
 *     - Cleanup (finally): Restores ONLY the synthetic Super Admin accounts
 *       and independently verifies both accounts exist, are active, non-deleted,
 *       and role SUPER_ADMIN in the database.
 *
 *   TEST B — Serialized General Admin Appoint vs. Revoke Race:
 *     - Strictly read-only precondition: Reads current General Admin pointer.
 *       Requires generalAdminUserId to be null. If not null, aborts immediately.
 *     - Races concurrent appointment (SA1) and revocation (SA2) via Promise.allSettled.
 *     - Waits for both requests to settle before inspecting or cleaning the database.
 *     - Verifies no server crash (neither request returns HTTP 500).
 *     - Dual-outcome validation:
 *         Outcome A (Appoint first): Appoint succeeds, Revoke sees target and revokes.
 *           Final pointer is NULL; both appoint and revoke audit logs exist.
 *         Outcome B (Revoke first): Revoke sees NULL and returns idempotent no-op (200)
 *           without audit event; Appoint then succeeds.
 *           Final pointer is stg_admin_ga_target; appoint audit log exists.
 *     - Unconditional Cleanup (finally): Guaranteed cleanup via authorized API +
 *       independent Prisma database verification that pointer is NULL.
 *
 *   TEST TC-30 — Competing General Admin Appointments Race:
 *     - Strictly read-only precondition: Verifies pointer is initially NULL.
 *     - Verifies Candidate A (stg_admin_ga_target) and Candidate B (stg_admin_none)
 *       are distinct, active, non-deleted ADMIN accounts.
 *     - Races concurrent appointments via Promise.allSettled: SA1 appoints Candidate A,
 *       SA2 appoints Candidate B.
 *     - Waits for both requests to settle before inspecting or cleaning the database.
 *     - Verifies mutual exclusion: exactly one request returns HTTP 200, and the
 *       competing request receives HTTP 409 GENERAL_ADMIN_ALREADY_EXISTS.
 *     - Verifies database pointer references exactly the winning candidate.
 *     - Verifies exactly one GENERAL_ADMIN_APPOINTED audit log exists for the winner.
 *     - Unconditional Cleanup (finally): Guaranteed cleanup via authorized API +
 *       independent Prisma database verification that pointer is NULL.
 *
 *   TEST D — Self-Deactivation Guard:
 *     - Verifies Super Admin self-deactivation returns HTTP 400
 *       SELF_DEACTIVATION_PROHIBITED.
 *
 * LIMITATION NOTE:
 *   The HTTP concurrency tests verify transaction serialization, error semantics,
 *   database consistency, and audit log persistence. Observing the physical
 *   PostgreSQL row-level lock waiting state (wait_event_type = 'Lock' in
 *   pg_stat_activity) requires a separate manual observation during a sustained
 *   lock-holding transaction in staging.
 *
 * SAFETY:
 *   - NEVER runs automatically. Must be explicitly invoked.
 *   - Entry-point check prevents any operation when imported as a module.
 *   - Validates DATABASE_URL and DATABASE_URL_UNPOOLED against STAGING_HOSTNAME
 *     using exact equality (===) BEFORE any database or network operations.
 *   - Refuses to connect if hostname is localhost, loopback, or mismatched.
 *   - Strictly read-only preconditions — zero automated mutations of baseline data.
 *   - Uses only synthetic staging accounts (stg_*).
 *   - Does NOT print passwords, connection strings, or JWT secrets.
 *
 * USAGE (PowerShell — staging server must be running on port 5000):
 *   Set-Location server
 *   $env:STAGING_HOSTNAME              = "ep-xxxx-yyyy.us-east-2.aws.neon.tech"
 *   $env:DATABASE_URL                  = "postgresql://...@<staging-host>:5432/<db>?sslmode=require&pgbouncer=true"
 *   $env:DATABASE_URL_UNPOOLED         = "postgresql://...@<staging-host>:5432/<db>?sslmode=require"
 *   $env:STAGING_SA1_USERNAME          = "stg_superadmin_1"
 *   $env:STAGING_SA1_PASSWORD          = "Staging@Phase1!2026"
 *   $env:STAGING_SA2_USERNAME          = "stg_superadmin_2"
 *   $env:STAGING_SA2_PASSWORD          = "Staging@Phase1!2026"
 *   $env:STAGING_GA_TARGET_USERNAME    = "stg_admin_ga_target"
 *   $env:STAGING_GA_CANDIDATE_B_USERNAME = "stg_admin_none"
 *   npx tsx scripts/concurrencyTest.ts
 * ───────────────────────────────────────────────────────────────────────────
 */

import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { PrismaClient, UserRole } from '@prisma/client';
import { validateStagingDatabasePair } from '../src/config/databaseGuard.js';

export class FatalTestFailureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FatalTestFailureError';
  }
}

// ============================================================================
// SECTION 1 — ENTRY-POINT CHECK
// ============================================================================

export function isDirectExecution(): boolean {
  if (!process.argv[1]) return false;
  try {
    const currentFilePath = resolve(fileURLToPath(import.meta.url));
    const entryFilePath = resolve(process.argv[1]);
    return currentFilePath.toLowerCase() === entryFilePath.toLowerCase();
  } catch {
    return false;
  }
}

// ============================================================================
// SECTION 2 — STAGING ENVIRONMENT GUARD
// ============================================================================

export function validateStagingEnvironment(): { pooledHost: string; directHost: string } {
  try {
    const pair = validateStagingDatabasePair();
    console.log('✅ STAGING GUARD PASSED');
    console.log(`   DATABASE_URL host (pooled):          ${pair.pooledHost}`);
    console.log(`   DATABASE_URL_UNPOOLED host (direct): ${pair.directHost}`);
    console.log('');
    return pair;
  } catch (err: any) {
    console.error(`\n❌ STAGING GUARD FAILED — ${err.message}`);
    throw new FatalTestFailureError(`Staging guard failed: ${err.message}`);
  }
}

// ============================================================================
// SECTION 3 — PRISMA CLIENT (LAZY INITIALIZATION)
// ============================================================================

let prismaInstance: PrismaClient | null = null;

export function resolveHarnessDatabaseUrl(rawUnpooledUrl?: string): string {
  const unpooledUrl = rawUnpooledUrl ?? process.env['DATABASE_URL_UNPOOLED'];
  if (!unpooledUrl || unpooledUrl.trim() === '') {
    throw new FatalTestFailureError(
      '[ConcurrencyHarness] DATABASE_URL_UNPOOLED is required for harness direct database operations. Direct compute URL missing.'
    );
  }

  // Validate staging pair using centralized guard to ensure isolation
  const pair = validateStagingDatabasePair({
    databaseUrlUnpooled: unpooledUrl,
  });

  let parsed: URL;
  try {
    parsed = new URL(unpooledUrl.trim());
  } catch (err: any) {
    throw new FatalTestFailureError(
      `[ConcurrencyHarness] Malformed DATABASE_URL_UNPOOLED: ${err.message}`
    );
  }

  const hostname = parsed.hostname.toLowerCase().trim();
  if (hostname !== pair.directHost.toLowerCase().trim()) {
    throw new FatalTestFailureError(
      `[ConcurrencyHarness] DATABASE_URL_UNPOOLED hostname mismatch: expected direct host '${pair.directHost}', received '${hostname}'.`
    );
  }

  // Ensure TLS enforcement is preserved
  const sslmode = parsed.searchParams.get('sslmode');
  if (sslmode !== 'require') {
    throw new FatalTestFailureError(
      `[ConcurrencyHarness] DATABASE_URL_UNPOOLED must enforce sslmode=require. Found: '${sslmode ?? 'none'}'.`
    );
  }

  // In-memory removal of channel_binding (incompatible with Prisma Rust query engine)
  parsed.searchParams.delete('channel_binding');

  // Add resilient timeouts for cold-boot Neon compute instances if not explicitly set
  if (!parsed.searchParams.has('connect_timeout')) {
    parsed.searchParams.set('connect_timeout', '30');
  }
  if (!parsed.searchParams.has('pool_timeout')) {
    parsed.searchParams.set('pool_timeout', '30');
  }

  return parsed.toString();
}

export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    const directUrl = resolveHarnessDatabaseUrl();
    prismaInstance = new PrismaClient({
      datasources: {
        db: {
          url: directUrl,
        },
      },
      log: ['warn', 'error'],
    });
  }
  return prismaInstance;
}

export function resetPrismaClientForTesting(): void {
  prismaInstance = null;
}

// ============================================================================
// SECTION 4 — CONFIGURATION
// ============================================================================

interface Config {
  apiBase: string;
  sa1Username: string;
  sa1Password: string;
  sa2Username: string;
  sa2Password: string;
  gaTargetUsername: string;
  gaCandidateBUsername: string;
}

function loadConfig(): Config {
  const required: Array<[string, string]> = [
    ['STAGING_SA1_USERNAME', 'stg_superadmin_1'],
    ['STAGING_SA1_PASSWORD', ''],
    ['STAGING_SA2_USERNAME', 'stg_superadmin_2'],
    ['STAGING_SA2_PASSWORD', ''],
    ['STAGING_GA_TARGET_USERNAME', 'stg_admin_ga_target'],
  ];

  const missing = required.filter(([k]) => !process.env[k] || process.env[k]!.trim() === '');
  if (missing.length > 0) {
    console.error('\n❌ CONFIG FAILED — Missing required environment variables:');
    missing.forEach(([k]) => console.error(`  • ${k}`));
    throw new FatalTestFailureError('Missing required configuration variables.');
  }

  return {
    apiBase: (process.env['STAGING_API_BASE'] ?? 'http://localhost:5000').replace(/\/$/, ''),
    sa1Username: process.env['STAGING_SA1_USERNAME']!,
    sa1Password: process.env['STAGING_SA1_PASSWORD']!,
    sa2Username: process.env['STAGING_SA2_USERNAME']!,
    sa2Password: process.env['STAGING_SA2_PASSWORD']!,
    gaTargetUsername: process.env['STAGING_GA_TARGET_USERNAME']!,
    gaCandidateBUsername: process.env['STAGING_GA_CANDIDATE_B_USERNAME']?.trim() || 'stg_admin_none',
  };
}

// ============================================================================
// SECTION 5 — HTTP CLIENT HELPERS
// ============================================================================

interface HttpResult {
  status: number;
  body: Record<string, unknown>;
  durationMs: number;
  label: string;
}

async function httpPost(
  url: string,
  jwt: string,
  body: Record<string, unknown>,
  label: string
): Promise<HttpResult> {
  const start = Date.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const durationMs = Date.now() - start;
  let responseBody: Record<string, unknown> = {};
  try {
    responseBody = (await res.json()) as Record<string, unknown>;
  } catch {
    responseBody = { raw: await res.text().catch(() => '<unreadable>') };
  }
  return { status: res.status, body: responseBody, durationMs, label };
}

async function httpPatch(
  url: string,
  jwt: string,
  body: Record<string, unknown>,
  label: string
): Promise<HttpResult> {
  const start = Date.now();
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const durationMs = Date.now() - start;
  let responseBody: Record<string, unknown> = {};
  try {
    responseBody = (await res.json()) as Record<string, unknown>;
  } catch {
    responseBody = { raw: await res.text().catch(() => '<unreadable>') };
  }
  return { status: res.status, body: responseBody, durationMs, label };
}

async function httpGet(
  url: string,
  jwt: string,
  label: string
): Promise<HttpResult> {
  const start = Date.now();
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${jwt}` },
  });
  const durationMs = Date.now() - start;
  let responseBody: Record<string, unknown> = {};
  try {
    responseBody = (await res.json()) as Record<string, unknown>;
  } catch {
    responseBody = { raw: await res.text().catch(() => '<unreadable>') };
  }
  return { status: res.status, body: responseBody, durationMs, label };
}

export function parseLoginResponse(json: unknown, username: string): { token: string; userId: string } {
  if (!json || typeof json !== 'object') {
    throw new FatalTestFailureError(`[ConcurrencyHarness] Malformed login response for ${username}: body is not an object.`);
  }
  const payload = json as Record<string, unknown>;
  const data = payload['data'] as Record<string, unknown> | undefined;

  // Extract access token: primary data.accessToken; fallback data.token or payload.token
  const tokenCandidate = (data?.['accessToken'] ?? data?.['token'] ?? payload['token']) as string | undefined;
  if (!tokenCandidate || typeof tokenCandidate !== 'string' || tokenCandidate.trim() === '') {
    throw new FatalTestFailureError(`[ConcurrencyHarness] Login response for ${username} did not include a valid non-empty accessToken.`);
  }

  // Extract user ID: primary data.user.id; fallback data.id or payload.id
  const userObj = data?.['user'] as Record<string, unknown> | undefined;
  const userIdCandidate = (userObj?.['id'] ?? data?.['id'] ?? payload['id']) as string | undefined;
  if (!userIdCandidate || typeof userIdCandidate !== 'string' || userIdCandidate.trim() === '') {
    throw new FatalTestFailureError(`[ConcurrencyHarness] Login response for ${username} did not include a valid non-empty user ID.`);
  }

  return { token: tokenCandidate.trim(), userId: userIdCandidate.trim() };
}

export function parseGeneralAdminStatus(body: unknown): string | null {
  if (!body || typeof body !== 'object') {
    throw new FatalTestFailureError('[ConcurrencyHarness] Malformed General Admin status response: body is not an object.');
  }

  const payload = body as Record<string, unknown>;
  if (payload['success'] !== true) {
    throw new FatalTestFailureError(`[ConcurrencyHarness] General Admin status request failed: success is not true (${JSON.stringify(payload)})`);
  }

  const data = payload['data'];
  if (!data || typeof data !== 'object') {
    throw new FatalTestFailureError('[ConcurrencyHarness] Malformed General Admin status response: missing or invalid "data" field.');
  }

  const dataObj = data as Record<string, unknown>;

  // Check generalAdmin object
  const generalAdmin = dataObj['generalAdmin'];
  if (generalAdmin === null || generalAdmin === undefined) {
    if (dataObj['isConfigured'] === true) {
      throw new FatalTestFailureError('[ConcurrencyHarness] Malformed General Admin status response: isConfigured is true but generalAdmin is null.');
    }
    return null;
  }

  if (typeof generalAdmin !== 'object') {
    throw new FatalTestFailureError('[ConcurrencyHarness] Malformed General Admin status response: "generalAdmin" must be an object or null.');
  }

  const gaObj = generalAdmin as Record<string, unknown>;
  const gaId = gaObj['id'];
  if (!gaId || typeof gaId !== 'string' || gaId.trim() === '') {
    throw new FatalTestFailureError('[ConcurrencyHarness] Malformed General Admin status response: non-null generalAdmin object is missing valid "id".');
  }

  return gaId.trim();
}

export async function login(apiBase: string, username: string, password: string): Promise<{ token: string; userId: string }> {
  const res = await fetch(`${apiBase}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: username, password }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new FatalTestFailureError(`Login failed for ${username}: HTTP ${res.status} — ${body}`);
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch (err: any) {
    throw new FatalTestFailureError(`Login response for ${username} could not be parsed as JSON: ${err.message}`);
  }

  return parseLoginResponse(json, username);
}

function printResult(result: HttpResult, expectStatus: number | number[], description: string): boolean {
  const expectedList = Array.isArray(expectStatus) ? expectStatus : [expectStatus];
  const pass = expectedList.includes(result.status);
  const symbol = pass ? '✅' : '❌';
  const code = (result.body['code'] as string | undefined) ?? '—';
  const success = result.body['success'];
  console.log(
    `  ${symbol} [${result.label}] ${description}\n` +
    `     HTTP ${result.status} (expected ${expectedList.join(' or ')}) | success: ${success} | code: ${code} | ${result.durationMs}ms`
  );
  if (!pass) {
    console.log(`     ⚠  Unexpected response body: ${JSON.stringify(result.body).substring(0, 300)}`);
  }
  return pass;
}

// ============================================================================
// SECTION 6 — TEST A: CONCURRENT SUPER ADMIN DEACTIVATION & LAST-ACTIVE GUARD
// ============================================================================

async function testConcurrentSuperAdminDeactivation(
  config: Config,
  sa1Id: string,
  sa2Id: string
): Promise<boolean> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  TEST A — Concurrent Super Admin Deactivation & Last-Active Guard');
  console.log('  Endpoints: PATCH /api/v1/users/:id/status');
  console.log('  Verification Target: Last-active-Super-Admin protection under concurrent race');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const prisma = getPrismaClient();

  // 1. Confirm preconditions in DB (strictly read-only)
  const sa1Before = await prisma.user.findUnique({
    where: { id: sa1Id },
    select: { id: true, username: true, role: true, isActive: true, isDeleted: true, tokenVersion: true },
  });
  const sa2Before = await prisma.user.findUnique({
    where: { id: sa2Id },
    select: { id: true, username: true, role: true, isActive: true, isDeleted: true, tokenVersion: true },
  });

  if (!sa1Before || !sa2Before) {
    console.error('  ❌ Precondition failed: Could not find both Super Admin accounts in database.');
    return false;
  }

  if (sa1Before.role !== UserRole.SUPER_ADMIN || sa2Before.role !== UserRole.SUPER_ADMIN) {
    console.error('  ❌ Precondition failed: Both test accounts must have role SUPER_ADMIN.');
    return false;
  }

  if (!sa1Before.isActive || !sa2Before.isActive || sa1Before.isDeleted || sa2Before.isDeleted) {
    console.error('  ❌ Precondition failed: Both Super Admin accounts must be active and non-deleted before testing.');
    return false;
  }

  // Strict Super Admin isolation precondition: query ALL active, non-deleted Super Admins
  const allActiveSAs = await prisma.user.findMany({
    where: {
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      isDeleted: false,
    },
    select: { id: true, username: true },
  });

  const activeIds = new Set(allActiveSAs.map((u) => u.id));

  // Exactly two active Super Admins must exist in the database, matching sa1Id and sa2Id
  if (allActiveSAs.length !== 2 || !activeIds.has(sa1Id) || !activeIds.has(sa2Id)) {
    console.error('\n  ❌ PRECONDITION FAILED — Test A requires strict Super Admin isolation:');
    console.error(`     Found ${allActiveSAs.length} active Super Admin account(s) in the database: ${allActiveSAs.map((u) => u.username).join(', ')}`);
    console.error('     To safely test Last-Active-Super-Admin protection under concurrent race conditions without modifying baseline data:');
    console.error('     1. Exactly two active Super Admin accounts must exist in the database, matching stg_superadmin_1 and stg_superadmin_2.');
    console.error('     2. If baseline Super Admin accounts (e.g. "superadmin") exist and are active, manually deactivate them prior to running this test,');
    console.error('        or run this test against an isolated test database containing only synthetic accounts.');
    console.error('     Test A strictly will NOT automatically deactivate baseline accounts. Aborting immediately without modifying any data.\n');
    return false;
  }

  console.log(`  Initial DB state for ${sa1Before.username}: isActive=${sa1Before.isActive}, tokenVersion=${sa1Before.tokenVersion}`);
  console.log(`  Initial DB state for ${sa2Before.username}: isActive=${sa2Before.isActive}, tokenVersion=${sa2Before.tokenVersion}`);
  console.log('  ✅ Precondition met: Exactly 2 active Super Admins exist in DB (stg_superadmin_1 and stg_superadmin_2).');

  let testPassed = false;
  let testError: Error | null = null;
  let restorationError: Error | null = null;
  let restorationSuccess = false;
  let hasUnknownInFlightState = false;
  let inFlightReport: string | null = null;
  const testStartTime = new Date();

  try {
    // 2. Authenticate fresh sessions for both Super Admins
    const sa1Auth = await login(config.apiBase, config.sa1Username, config.sa1Password);
    const sa2Auth = await login(config.apiBase, config.sa2Username, config.sa2Password);

    console.log('\n  Step A-1: Firing simultaneous mutual deactivation requests via Promise.allSettled:');
    console.log(`    Request 1: SA1 (${config.sa1Username}) deactivates SA2 (${config.sa2Username})`);
    console.log(`    Request 2: SA2 (${config.sa2Username}) deactivates SA1 (${config.sa1Username})`);

    const urlDeactivateSa2 = `${config.apiBase}/api/v1/users/${sa2Id}/status`;
    const urlDeactivateSa1 = `${config.apiBase}/api/v1/users/${sa1Id}/status`;

    // Fire both mutual deactivations concurrently, waiting for both to settle
    const [settled1, settled2] = await Promise.allSettled([
      httpPatch(urlDeactivateSa2, sa1Auth.token, { isActive: false }, 'SA1-deactivates-SA2'),
      httpPatch(urlDeactivateSa1, sa2Auth.token, { isActive: false }, 'SA2-deactivates-SA1'),
    ]);

    if (settled1.status === 'rejected' || settled2.status === 'rejected') {
      hasUnknownInFlightState = true;
      testPassed = false;

      const sa1ReqStatus = settled1.status === 'rejected'
        ? `REJECTED (Transport Error: ${settled1.reason?.message ?? settled1.reason})`
        : `FULFILLED (HTTP ${settled1.value.status}, code: ${(settled1.value.body['code'] as string) ?? '—'})`;

      const sa2ReqStatus = settled2.status === 'rejected'
        ? `REJECTED (Transport Error: ${settled2.reason?.message ?? settled2.reason})`
        : `FULFILLED (HTTP ${settled2.value.status}, code: ${(settled2.value.body['code'] as string) ?? '—'})`;

      const reportLines = [
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '🚨 CRITICAL SAFETY ALERT: UNKNOWN_IN_FLIGHT_STATE (Test A)',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '  Outcome: UNKNOWN_IN_FLIGHT_STATE',
        '  Test Status: FAILED',
        `  Request 1 (SA1 deactivates SA2): ${sa1ReqStatus}`,
        `  Request 2 (SA2 deactivates SA1): ${sa2ReqStatus}`,
        '',
        '  SAFETY INVARIANTS & REASONING:',
        '  1. Client promise rejection indicates transport-level failure/timeout;',
        '     server-side Express request or PostgreSQL transaction may still be actively executing.',
        '  2. Server-side completion cannot be authoritatively established.',
        '  3. Automatic restoration is SKIPPED to avoid racing against a delayed deactivation.',
        `  4. Affected synthetic accounts: ${config.sa1Username} (${sa1Id}) and ${config.sa2Username} (${sa2Id}).`,
        '  5. The test harness CANNOT claim both Super Admin accounts are active.',
        '  6. MANUAL STAGING DATABASE INSPECTION & RECOVERY REQUIRED: Check users table in Neon',
        '     to inspect state once in-flight transactions settle, and restore manually if needed.',
        '  7. Subsequent concurrency tests are HALTED immediately.',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      ];
      inFlightReport = reportLines.join('\n');
      console.error('\n' + inFlightReport + '\n');
      throw new Error('UNKNOWN_IN_FLIGHT_STATE: Transport rejection during Test A mutual deactivation.');
    }

    const res1 = settled1.value;
    const res2 = settled2.value;

    console.log('\n  Race Results:');
    console.log(`    Req 1 [SA1 -> SA2]: HTTP ${res1.status} | code: ${(res1.body['code'] as string) ?? '—'} | ${res1.durationMs}ms`);
    console.log(`    Req 2 [SA2 -> SA1]: HTTP ${res2.status} | code: ${(res2.body['code'] as string) ?? '—'} | ${res2.durationMs}ms`);

    // Verify race semantics:
    // Exactly one request must succeed (HTTP 200).
    // The losing request must be rejected:
    //   - HTTP 400 with code LAST_SUPER_ADMIN_PROTECTED (if it acquired DB lock after losing transaction)
    //   - OR HTTP 401 (if its session verification read DB after the winning deactivation committed)
    const req1Succeeded = res1.status === 200;
    const req2Succeeded = res2.status === 200;

    const exactlyOneSucceeded = (req1Succeeded && !req2Succeeded) || (!req1Succeeded && req2Succeeded);
    const noServerCrash = res1.status !== 500 && res2.status !== 500;

    if (!exactlyOneSucceeded) {
      console.error(`  ❌ Assertion Failed: Expected exactly one deactivation to succeed, but received: req1=${res1.status}, req2=${res2.status}`);
    } else {
      console.log('  ✅ Exactly one mutual deactivation succeeded; the competing deactivation was rejected.');
    }

    if (!noServerCrash) {
      console.error('  ❌ Assertion Failed: One or both requests returned HTTP 500 server crash.');
    }

    // 3. Automated Database Verification of Final State
    console.log('\n  Step A-2: Querying actual database state to verify Super Admin protection…');
    const sa1After = await prisma.user.findUnique({
      where: { id: sa1Id },
      select: { id: true, username: true, isActive: true, tokenVersion: true },
    });
    const sa2After = await prisma.user.findUnique({
      where: { id: sa2Id },
      select: { id: true, username: true, isActive: true, tokenVersion: true },
    });

    if (!sa1After || !sa2After) {
      throw new Error('Could not re-query Super Admin records from database.');
    }

    console.log(`    DB state ${sa1After.username}: isActive=${sa1After.isActive}, tokenVersion=${sa1After.tokenVersion}`);
    console.log(`    DB state ${sa2After.username}: isActive=${sa2After.isActive}, tokenVersion=${sa2After.tokenVersion}`);

    const activeCount = (sa1After.isActive ? 1 : 0) + (sa2After.isActive ? 1 : 0);
    const exactlyOneActiveInDb = activeCount === 1;

    if (!exactlyOneActiveInDb) {
      console.error(`  ❌ Assertion Failed: Expected exactly 1 active Super Admin in DB, but found ${activeCount}.`);
    } else {
      console.log('  ✅ Database Assertion Passed: Exactly one active Super Admin remains in the system.');
    }

    // Verify tokenVersion increments
    let tokenVersionValid = false;
    let winnerActorId: string;
    let deactivatedTargetId: string;

    if (sa1After.isActive) {
      // SA1 remained active (winner), SA2 was deactivated (loser)
      winnerActorId = sa1Id;
      deactivatedTargetId = sa2Id;
      tokenVersionValid = sa1After.tokenVersion === sa1Before.tokenVersion && sa2After.tokenVersion === sa2Before.tokenVersion + 1;
    } else {
      // SA2 remained active (winner), SA1 was deactivated (loser)
      winnerActorId = sa2Id;
      deactivatedTargetId = sa1Id;
      tokenVersionValid = sa2After.tokenVersion === sa2Before.tokenVersion && sa1After.tokenVersion === sa1Before.tokenVersion + 1;
    }

    if (!tokenVersionValid) {
      console.error('  ❌ Assertion Failed: TokenVersion was not incremented predictably for the deactivated account.');
    } else {
      console.log('  ✅ Database Assertion Passed: Deactivated account tokenVersion incremented by exactly 1.');
    }

    // 4. Assert Audit Log Persistence
    console.log('\n  Step A-3: Verifying audit log persistence for winning deactivation…');
    const winningAuditLog = await prisma.auditLog.findFirst({
      where: {
        action: 'USER_DEACTIVATED',
        entityName: 'User',
        entityId: deactivatedTargetId,
        userId: winnerActorId,
        createdAt: { gte: testStartTime },
      },
    });

    const auditLogged = !!winningAuditLog;
    if (!auditLogged) {
      console.error(`  ❌ Assertion Failed: No USER_DEACTIVATED audit log found for target ${deactivatedTargetId} by operator ${winnerActorId}.`);
    } else {
      console.log(`  ✅ Audit Log Verified: USER_DEACTIVATED persisted for target ${deactivatedTargetId} by operator ${winnerActorId} (auditId: ${winningAuditLog.id}).`);
    }

    const falseAuditLog = await prisma.auditLog.findFirst({
      where: {
        action: 'USER_DEACTIVATED',
        entityName: 'User',
        entityId: winnerActorId,
        createdAt: { gte: testStartTime },
      },
    });

    const noFalseAudit = !falseAuditLog;
    if (!noFalseAudit) {
      console.error(`  ❌ Assertion Failed: Found unexpected USER_DEACTIVATED audit log for winning Super Admin ${winnerActorId} (auditId: ${falseAuditLog.id}).`);
    } else {
      console.log(`  ✅ Audit Log Verified: No false deactivation audit log exists for winning Super Admin ${winnerActorId}.`);
    }

    // 5. Test Direct Deactivation of the Sole Remaining Active Super Admin
    console.log('\n  Step A-4: Verifying direct deactivation attempts on the sole remaining Super Admin are blocked…');
    const activeSaId = sa1After.isActive ? sa1Id : sa2Id;
    const activeSaAuth = sa1After.isActive ? sa1Auth : sa2Auth;
    const inactiveSaAuth = sa1After.isActive ? sa2Auth : sa1Auth;

    // A: Sole remaining SA attempts self-deactivation -> must get HTTP 400 SELF_DEACTIVATION_PROHIBITED
    const selfDeactResult = await httpPatch(
      `${config.apiBase}/api/v1/users/${activeSaId}/status`,
      activeSaAuth.token,
      { isActive: false },
      'RemainingSA-self-deactivation'
    );
    const selfDeactPassed = printResult(
      selfDeactResult,
      400,
      'Sole remaining Super Admin self-deactivation rejected (SELF_DEACTIVATION_PROHIBITED)'
    );

    // B: Deactivated SA attempts to deactivate sole remaining SA -> must get HTTP 401
    const inactiveCallerResult = await httpPatch(
      `${config.apiBase}/api/v1/users/${activeSaId}/status`,
      inactiveSaAuth.token,
      { isActive: false },
      'DeactivatedSA-caller-rejected'
    );
    const inactiveCallerPassed = printResult(
      inactiveCallerResult,
      401,
      'Deactivated Super Admin request rejected by authentication middleware (HTTP 401)'
    );

    testPassed = exactlyOneSucceeded && noServerCrash && exactlyOneActiveInDb && tokenVersionValid && auditLogged && noFalseAudit && selfDeactPassed && inactiveCallerPassed;

  } catch (err: any) {
    console.error(`  ❌ Test A encountered execution exception: ${err.message ?? err}`);
    testError = err instanceof Error ? err : new Error(String(err));
    testPassed = false;
  } finally {
    // 6. Cleanup & Account Restoration Resolution (finally block)
    console.log('\n  Step A-5: Cleanup — Restoring synthetic Super Admin accounts in DB…');
    if (hasUnknownInFlightState) {
      console.error('  ⚠ [FAIL-CLOSED] Race outcome: UNKNOWN_IN_FLIGHT_STATE.');
      console.error('     Automatic restoration SKIPPED to avoid racing with in-flight deactivation transaction.');
      console.error(`     Cannot claim synthetic Super Admin accounts (${config.sa1Username}, ${config.sa2Username}) are active.`);
      console.error('     MANUAL DATABASE INSPECTION REQUIRED: Query users table in Neon.');
      restorationSuccess = false;
    } else {
      // Normal restoration: executed ONLY when both requests returned actual HTTP responses (both fulfilled)
      try {
        await prisma.user.updateMany({
          where: { id: { in: [sa1Id, sa2Id] } },
          data: { isActive: true },
        });

        // Explicit post-restoration verification strictly restricted to both synthetic accounts
        const restoredUsers = await prisma.user.findMany({
          where: { id: { in: [sa1Id, sa2Id] } },
          select: { id: true, username: true, role: true, isActive: true, isDeleted: true },
        });

        const allActive =
          restoredUsers.length === 2 &&
          restoredUsers.every((u) => u.isActive && !u.isDeleted && u.role === UserRole.SUPER_ADMIN);

        if (!allActive) {
          console.error('  ❌ Step A-5 Failed: One or both Super Admin accounts failed to restore to active baseline.');
          restorationSuccess = false;
        } else {
          console.log('  ✅ Synthetic Super Admin accounts successfully restored and verified active in database.');
          restorationSuccess = true;
        }
      } catch (cleanupErr: any) {
        console.error(`  ❌ Step A-5 Restoration Error: ${cleanupErr.message}`);
        restorationError = cleanupErr instanceof Error ? cleanupErr : new Error(String(cleanupErr));
        restorationSuccess = false;
      }
    }
  }

  const passed = testPassed && restorationSuccess && !testError && !restorationError && !hasUnknownInFlightState;

  if (passed) {
    console.log('\n  ✅ TEST A PASSED — Last-Active-Super-Admin protection verified under concurrent race conditions.');
  } else {
    console.log('\n  ❌ TEST A FAILED — One or more assertions, transport checks, or account restoration failed.');
    if (hasUnknownInFlightState) console.error('     Failure reason: UNKNOWN_IN_FLIGHT_STATE (transport rejection; manual DB verification required).');
    if (testError) console.error(`     Primary test error: ${testError.message}`);
    if (restorationError) console.error(`     Restoration error: ${restorationError.message}`);
  }

  return passed;
}

// ============================================================================
// SECTION 7 — TEST B: SERIALIZED GENERAL ADMIN APPOINT vs REVOKE RACE
// ============================================================================

async function testAppointmentVsRevocation(
  config: Config,
  jwt1: string,
  jwt2: string,
  gaTargetUserId: string,
  sa1Id: string,
  sa2Id: string
): Promise<boolean> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  TEST B — Serialized General Admin Appoint vs. Revoke Race');
  console.log('  Endpoints: POST .../general-admin/appoint');
  console.log('             POST .../general-admin/revoke');
  console.log('  Target User: ' + config.gaTargetUsername);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const prisma = getPrismaClient();

  // 1. Non-destructive Pre-check (strictly read-only): Read current General Admin pointer
  console.log('\n  Step B-1: Reading current General Admin pointer before testing (strictly read-only)…');
  const statusResult = await httpGet(
    `${config.apiBase}/api/v1/system-admin/general-admin/status`,
    jwt1,
    'B-1-status'
  );

  const currentGaId = parseGeneralAdminStatus(statusResult.body);

  if (currentGaId !== null) {
    console.error(`\n  ❌ ABORTING TEST B: A General Admin is currently appointed (${currentGaId}).`);
    console.error('     Precondition failed: generalAdminUserId must be null before running Test B.');
    console.error('     Test B strictly performs zero pre-emptive write or revoke operations in its precondition.');
    console.error('     Please manually revoke or clear the General Admin appointment before executing this test.\n');
    return false;
  }

  console.log('  ✅ Precondition met: General Admin pointer is null. Zero writes performed.');

  const testBStartTime = new Date();
  let testPassed = false;
  let testError: Error | null = null;
  let cleanupError: Error | null = null;
  let cleanupSuccess = false;
  let hasUnknownInFlightState = false;
  let inFlightReport: string | null = null;

  try {
    // 2. Race: SA1 appoints gaTargetUserId, while SA2 revokes gaTargetUserId simultaneously
    console.log('\n  Step B-2: Firing simultaneous appoint (SA1) and revoke (SA2) via Promise.allSettled…');
    const [settledAppoint, settledRevoke] = await Promise.allSettled([
      httpPost(
        `${config.apiBase}/api/v1/system-admin/general-admin/appoint`,
        jwt1,
        { targetUserId: gaTargetUserId },
        'SA1-appoint'
      ),
      httpPost(
        `${config.apiBase}/api/v1/system-admin/general-admin/revoke`,
        jwt2,
        { targetUserId: gaTargetUserId },
        'SA2-revoke'
      ),
    ]);

    // Check if either promise rejected at the network/transport layer
    if (settledAppoint.status === 'rejected' || settledRevoke.status === 'rejected') {
      hasUnknownInFlightState = true;
      testPassed = false;

      const appointStatusDesc = settledAppoint.status === 'rejected'
        ? `REJECTED (Transport Error: ${settledAppoint.reason?.message ?? settledAppoint.reason})`
        : `FULFILLED (HTTP ${settledAppoint.value.status}, code: ${(settledAppoint.value.body['code'] as string) ?? '—'})`;

      const revokeStatusDesc = settledRevoke.status === 'rejected'
        ? `REJECTED (Transport Error: ${settledRevoke.reason?.message ?? settledRevoke.reason})`
        : `FULFILLED (HTTP ${settledRevoke.value.status}, code: ${(settledRevoke.value.body['code'] as string) ?? '—'})`;

      const reportLines = [
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '🚨 CRITICAL SAFETY ALERT: UNKNOWN_IN_FLIGHT_STATE (Test B)',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '  Outcome: UNKNOWN_IN_FLIGHT_STATE',
        '  Test Status: FAILED',
        `  Appoint Request: ${appointStatusDesc}`,
        `  Revoke Request:  ${revokeStatusDesc}`,
        '',
        '  SAFETY INVARIANTS & REASONING:',
        '  1. Client promise rejection indicates transport-level failure/timeout;',
        '     server-side Express request or PostgreSQL transaction may still be executing.',
        '  2. Server-side completion cannot be authoritatively established.',
        '  3. Automatic cleanup is SKIPPED to avoid racing against in-flight transactions.',
        '  4. The test harness CANNOT claim the General Admin pointer is safely cleared.',
        '  5. MANUAL DATABASE INSPECTION REQUIRED: Query SYSTEM_DEFAULT.generalAdminUserId',
        '     in Neon to inspect state after server settling, and clear manually if needed.',
        '  6. Subsequent concurrency tests are HALTED immediately.',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      ];
      inFlightReport = reportLines.join('\n');
      console.error('\n' + inFlightReport + '\n');
      throw new Error('UNKNOWN_IN_FLIGHT_STATE: Transport rejection during Test B race.');
    }

    const appointResult = settledAppoint.value;
    const revokeResult = settledRevoke.value;

    console.log('\n  Race Results:');
    console.log(`    Appoint: HTTP ${appointResult.status} | code: ${(appointResult.body['code'] as string) ?? '—'} | ${appointResult.durationMs}ms`);
    console.log(`    Revoke:  HTTP ${revokeResult.status} | code: ${(revokeResult.body['code'] as string) ?? '—'} | ${revokeResult.durationMs}ms`);

    const noServerCrash = appointResult.status !== 500 && revokeResult.status !== 500;
    if (!noServerCrash) {
      console.error('  ❌ Assertion Failed: One or both requests caused an internal server error (HTTP 500).');
    } else {
      console.log('  ✅ No server crash or unhandled deadlock occurred during race.');
    }

    // 3. Post-race State Verification
    console.log('\n  Step B-3: Verifying final GA state consistency…');
    const finalStatus = await httpGet(
      `${config.apiBase}/api/v1/system-admin/general-admin/status`,
      jwt1,
      'B-3-status'
    );

    const finalGaId = parseGeneralAdminStatus(finalStatus.body);

    const pointerValid = finalGaId === null || finalGaId === gaTargetUserId;
    if (!pointerValid) {
      console.error(`  ❌ Assertion Failed: Final GA pointer references an unexpected account (${finalGaId}).`);
    } else {
      console.log(`  ✅ Pointer integrity verified: final GA state is ${finalGaId ? `assigned to target (${finalGaId})` : 'null'}.`);
    }

    // If appointed, verify target user is an active, non-deleted Admin
    let targetEligible = true;
    if (finalGaId === gaTargetUserId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: gaTargetUserId },
        select: { id: true, role: true, isActive: true, isDeleted: true },
      });
      targetEligible = !!targetUser && targetUser.role === UserRole.ADMIN && targetUser.isActive && !targetUser.isDeleted;
      if (!targetEligible) {
        console.error('  ❌ Assertion Failed: Appointed target is not an eligible active Admin.');
      } else {
        console.log('  ✅ Eligibility verified: Appointed GA is an active, non-deleted Admin.');
      }
    }

    // 4. Assert Audit Log Persistence Based on Exact Serialized Outcome
    console.log('\n  Step B-4: Verifying audit log persistence based on serialized outcome…');
    const appointLog = await prisma.auditLog.findFirst({
      where: {
        action: 'GENERAL_ADMIN_APPOINTED',
        entityName: 'SystemSetting',
        entityId: 'SYSTEM_DEFAULT',
        userId: sa1Id,
        createdAt: { gte: testBStartTime },
      },
    });

    const revokeLog = await prisma.auditLog.findFirst({
      where: {
        action: 'GENERAL_ADMIN_REVOKED',
        entityName: 'SystemSetting',
        entityId: 'SYSTEM_DEFAULT',
        userId: sa2Id,
        createdAt: { gte: testBStartTime },
      },
    });

    let outcomeValid = false;

    if (finalGaId === null || finalGaId === undefined) {
      if (!appointLog) {
        console.error('  ❌ Assertion Failed (Outcome A): Final pointer is NULL, but GENERAL_ADMIN_APPOINTED audit log is missing.');
      } else if (!revokeLog) {
        console.error('  ❌ Assertion Failed (Outcome A): Final pointer is NULL, but GENERAL_ADMIN_REVOKED audit log is missing.');
      } else {
        console.log('  ✅ Serialized Outcome A Verified: Appoint committed first, Revoke committed second (final pointer NULL; both audit logs persisted).');
        outcomeValid = true;
      }
    } else if (finalGaId === gaTargetUserId) {
      if (!appointLog) {
        console.error('  ❌ Assertion Failed (Outcome B): Final pointer is target, but GENERAL_ADMIN_APPOINTED audit log is missing.');
      } else {
        console.log('  ✅ Serialized Outcome B Verified: Revoke committed first (idempotent no-op), Appoint committed second (final pointer target; appoint audit log persisted).');
        outcomeValid = true;
      }
    } else {
      console.error(`  ❌ Assertion Failed: Final pointer references unrecognized account: ${finalGaId}`);
    }

    testPassed = noServerCrash && pointerValid && targetEligible && outcomeValid;

  } catch (err: any) {
    console.error(`  ❌ Test B encountered unexpected execution exception: ${err.message ?? err}`);
    testError = err instanceof Error ? err : new Error(String(err));
    testPassed = false;
  } finally {
    // 5. Mandatory Cleanup & Database State Resolution (finally block)
    console.log('\n  Step B-5: Mandatory Cleanup & Database State Resolution (finally block)…');
    if (hasUnknownInFlightState) {
      console.error('  ⚠ [FAIL-CLOSED] Race outcome: UNKNOWN_IN_FLIGHT_STATE.');
      console.error('     Automatic cleanup SKIPPED to avoid racing with in-flight server transaction.');
      console.error('     General Admin pointer CANNOT be claimed safely cleared.');
      console.error('     MANUAL DATABASE INSPECTION REQUIRED: Check SYSTEM_DEFAULT.generalAdminUserId in database.');
      cleanupSuccess = false;
    } else {
      // Normal cleanup: executed ONLY when both requests returned actual HTTP responses (both fulfilled)
      try {
        const settingBeforeCleanup = await prisma.systemSetting.findUnique({
          where: { id: 'SYSTEM_DEFAULT' },
          select: { generalAdminUserId: true },
        });

        const currentPointer = settingBeforeCleanup?.generalAdminUserId;

        if (currentPointer === gaTargetUserId) {
          console.log(`    Active appointment detected for target (${gaTargetUserId}). Revoking via authorized API…`);
          const cleanupRevoke = await httpPost(
            `${config.apiBase}/api/v1/system-admin/general-admin/revoke`,
            jwt1,
            { targetUserId: gaTargetUserId },
            'B-5-cleanup'
          );

          if (cleanupRevoke.status === 200) {
            console.log('    ✅ Cleanup revoke API returned HTTP 200.');
          } else {
            console.error(`    ❌ Cleanup revoke API failed with HTTP ${cleanupRevoke.status}.`);
            cleanupSuccess = false;
          }
        } else if (currentPointer === null || currentPointer === undefined) {
          console.log('    Pointer is already NULL — no API revocation needed.');
        } else {
          console.error(`    ❌ SAFETY ALERT: Pointer references unexpected non-test account (${currentPointer}). Refusing to revoke via generic target.`);
          cleanupSuccess = false;
        }

        // Independent post-cleanup verification
        const settingAfterCleanup = await prisma.systemSetting.findUnique({
          where: { id: 'SYSTEM_DEFAULT' },
          select: { generalAdminUserId: true },
        });

        if (settingAfterCleanup?.generalAdminUserId !== null && settingAfterCleanup?.generalAdminUserId !== undefined) {
          console.error(`    ❌ Verification Failed: Pointer is still ${settingAfterCleanup?.generalAdminUserId} (expected NULL).`);
          cleanupSuccess = false;
        } else {
          console.log('    ✅ Independent DB Verification Passed: Pointer is confirmed NULL in database.');
          if (currentPointer === gaTargetUserId || currentPointer === null || currentPointer === undefined) {
            cleanupSuccess = true;
          }
        }
      } catch (cleanErr: any) {
        console.error(`    ❌ Cleanup failed with exception: ${cleanErr.message ?? cleanErr}`);
        cleanupError = cleanErr instanceof Error ? cleanErr : new Error(String(cleanErr));
        cleanupSuccess = false;
      }
    }
  }

  const passed = testPassed && cleanupSuccess && !testError && !cleanupError && !hasUnknownInFlightState;
  if (passed) {
    console.log('\n  ✅ TEST B PASSED — Serialized General Admin race executed safely and left database in clean state.');
  } else {
    console.log('\n  ❌ TEST B FAILED — One or more assertions, transport checks, or cleanup operations failed.');
    if (hasUnknownInFlightState) console.error('     Failure reason: UNKNOWN_IN_FLIGHT_STATE (transport rejection; manual DB verification required).');
    if (testError) console.error(`     Primary test error: ${testError.message}`);
    if (cleanupError) console.error(`     Cleanup error: ${cleanupError.message}`);
  }

  return passed;
}

// ============================================================================
// SECTION 8 — TEST TC-30: COMPETING GENERAL ADMIN APPOINTMENTS RACE
// ============================================================================

async function testCompetingGeneralAdminAppointments(
  config: Config,
  jwt1: string,
  jwt2: string,
  candidateAId: string,
  candidateBId: string,
  candidateAName: string,
  candidateBName: string,
  sa1Id: string,
  sa2Id: string
): Promise<boolean> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  TEST TC-30 — Competing General Admin Appointments Race');
  console.log('  Endpoints: POST /api/v1/system-admin/general-admin/appoint');
  console.log(`  Candidate A: ${candidateAName} (${candidateAId})`);
  console.log(`  Candidate B: ${candidateBName} (${candidateBId})`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const prisma = getPrismaClient();

  // 1. Precondition (strictly read-only): Read current GA pointer
  console.log('\n  Step TC30-1: Verifying General Admin pointer is NULL before competing appointments…');
  const statusResult = await httpGet(
    `${config.apiBase}/api/v1/system-admin/general-admin/status`,
    jwt1,
    'TC30-1-status'
  );

  const currentGaId = parseGeneralAdminStatus(statusResult.body);

  if (currentGaId !== null) {
    console.error(`\n  ❌ ABORTING TC-30: A General Admin is already appointed (${currentGaId}).`);
    console.error('     Precondition failed: generalAdminUserId must be null before running TC-30.');
    return false;
  }

  console.log('  ✅ Precondition met: General Admin pointer is null. Zero writes performed.');

  const testStartTime = new Date();
  let testPassed = false;
  let testError: Error | null = null;
  let cleanupError: Error | null = null;
  let cleanupSuccess = false;
  let hasUnknownInFlightState = false;
  let inFlightReport: string | null = null;

  try {
    // 2. Race: SA1 appoints Candidate A, SA2 appoints Candidate B simultaneously via Promise.allSettled
    console.log('\n  Step TC30-2: Firing simultaneous competing appointments via Promise.allSettled:');
    console.log(`    Request 1: SA1 appoints Candidate A (${candidateAName})`);
    console.log(`    Request 2: SA2 appoints Candidate B (${candidateBName})`);

    const [settled1, settled2] = await Promise.allSettled([
      httpPost(
        `${config.apiBase}/api/v1/system-admin/general-admin/appoint`,
        jwt1,
        { targetUserId: candidateAId },
        'SA1-appoint-CandA'
      ),
      httpPost(
        `${config.apiBase}/api/v1/system-admin/general-admin/appoint`,
        jwt2,
        { targetUserId: candidateBId },
        'SA2-appoint-CandB'
      ),
    ]);

    if (settled1.status === 'rejected' || settled2.status === 'rejected') {
      hasUnknownInFlightState = true;
      testPassed = false;

      const candAStatusDesc = settled1.status === 'rejected'
        ? `REJECTED (Transport Error: ${settled1.reason?.message ?? settled1.reason})`
        : `FULFILLED (HTTP ${settled1.value.status}, code: ${(settled1.value.body['code'] as string) ?? '—'})`;

      const candBStatusDesc = settled2.status === 'rejected'
        ? `REJECTED (Transport Error: ${settled2.reason?.message ?? settled2.reason})`
        : `FULFILLED (HTTP ${settled2.value.status}, code: ${(settled2.value.body['code'] as string) ?? '—'})`;

      const reportLines = [
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '🚨 CRITICAL SAFETY ALERT: UNKNOWN_IN_FLIGHT_STATE (TC-30)',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '  Outcome: UNKNOWN_IN_FLIGHT_STATE',
        '  Test Status: FAILED',
        `  Candidate A Request (${candidateAName}): ${candAStatusDesc}`,
        `  Candidate B Request (${candidateBName}): ${candBStatusDesc}`,
        '',
        '  SAFETY INVARIANTS & REASONING:',
        '  1. Client promise rejection indicates transport-level failure/timeout;',
        '     server-side Express request or PostgreSQL transaction may still be executing.',
        '  2. Server-side completion cannot be authoritatively established.',
        '  3. Automatic cleanup is SKIPPED to avoid racing against in-flight transactions.',
        '  4. The test harness CANNOT claim the General Admin pointer is safely cleared.',
        '  5. MANUAL DATABASE INSPECTION REQUIRED: Query SYSTEM_DEFAULT.generalAdminUserId',
        '     in Neon to inspect state after server settling, and clear manually if needed.',
        '  6. Subsequent concurrency tests are HALTED immediately.',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      ];
      inFlightReport = reportLines.join('\n');
      console.error('\n' + inFlightReport + '\n');
      throw new Error('UNKNOWN_IN_FLIGHT_STATE: Transport rejection during TC-30 race.');
    }

    const res1 = settled1.value;
    const res2 = settled2.value;

    console.log('\n  Race Results:');
    console.log(`    Req 1 [SA1 -> Cand A]: HTTP ${res1.status} | code: ${(res1.body['code'] as string) ?? '—'} | ${res1.durationMs}ms`);
    console.log(`    Req 2 [SA2 -> Cand B]: HTTP ${res2.status} | code: ${(res2.body['code'] as string) ?? '—'} | ${res2.durationMs}ms`);

    const noServerCrash = res1.status !== 500 && res2.status !== 500;
    if (!noServerCrash) {
      console.error('  ❌ Assertion Failed: One or both requests returned HTTP 500 server crash.');
    }

    // 3. Exactly one request must succeed (HTTP 200), and the competing request must receive HTTP 409 GENERAL_ADMIN_ALREADY_EXISTS
    let winnerCandidateId = '';
    let winnerCandidateName = '';
    let winnerSaId = '';
    let conflictValid = false;

    if (res1.status === 200 && res2.status === 409 && (res2.body['code'] === 'GENERAL_ADMIN_ALREADY_EXISTS')) {
      winnerCandidateId = candidateAId;
      winnerCandidateName = candidateAName;
      winnerSaId = sa1Id;
      conflictValid = true;
      console.log('  ✅ Mutual exclusion verified: Candidate A appointed (HTTP 200); Candidate B rejected with HTTP 409 GENERAL_ADMIN_ALREADY_EXISTS.');
    } else if (res2.status === 200 && res1.status === 409 && (res1.body['code'] === 'GENERAL_ADMIN_ALREADY_EXISTS')) {
      winnerCandidateId = candidateBId;
      winnerCandidateName = candidateBName;
      winnerSaId = sa2Id;
      conflictValid = true;
      console.log('  ✅ Mutual exclusion verified: Candidate B appointed (HTTP 200); Candidate A rejected with HTTP 409 GENERAL_ADMIN_ALREADY_EXISTS.');
    } else {
      console.error(`  ❌ Assertion Failed: Expected exactly one HTTP 200 and one HTTP 409 GENERAL_ADMIN_ALREADY_EXISTS, but received Req1=${res1.status} (${res1.body['code']}), Req2=${res2.status} (${res2.body['code']}).`);
    }

    // 4. Verify Database State
    console.log('\n  Step TC30-3: Verifying final database state…');
    const finalSetting = await prisma.systemSetting.findUnique({
      where: { id: 'SYSTEM_DEFAULT' },
      select: { generalAdminUserId: true },
    });

    const pointerConsistent = conflictValid && finalSetting?.generalAdminUserId === winnerCandidateId;
    if (!pointerConsistent) {
      console.error(`  ❌ Assertion Failed: Database pointer ${finalSetting?.generalAdminUserId} does not match expected winner ${winnerCandidateId}.`);
    } else {
      console.log(`  ✅ Database Assertion Passed: Pointer matches winning candidate (${winnerCandidateName}).`);
    }

    // 5. Verify Audit Log Persistence
    console.log('\n  Step TC30-4: Verifying audit log persistence…');
    let auditLogValid = false;
    if (conflictValid) {
      const winningAudit = await prisma.auditLog.findFirst({
        where: {
          action: 'GENERAL_ADMIN_APPOINTED',
          entityName: 'SystemSetting',
          entityId: 'SYSTEM_DEFAULT',
          userId: winnerSaId,
          createdAt: { gte: testStartTime },
        },
      });

      const falseAudit = await prisma.auditLog.findFirst({
        where: {
          action: 'GENERAL_ADMIN_APPOINTED',
          entityName: 'SystemSetting',
          entityId: 'SYSTEM_DEFAULT',
          userId: winnerSaId === sa1Id ? sa2Id : sa1Id,
          createdAt: { gte: testStartTime },
        },
      });

      if (!winningAudit) {
        console.error('  ❌ Assertion Failed: No GENERAL_ADMIN_APPOINTED audit log found for winning Super Admin.');
      } else if (falseAudit) {
        console.error('  ❌ Assertion Failed: Unexpected GENERAL_ADMIN_APPOINTED audit log found for losing Super Admin.');
      } else {
        console.log(`  ✅ Audit Log Verified: Exactly one GENERAL_ADMIN_APPOINTED log persisted by winning Super Admin (auditId: ${winningAudit.id}).`);
        auditLogValid = true;
      }
    }

    testPassed = noServerCrash && conflictValid && pointerConsistent && auditLogValid;

  } catch (err: any) {
    console.error(`  ❌ TC-30 encountered unexpected execution exception: ${err.message ?? err}`);
    testError = err instanceof Error ? err : new Error(String(err));
    testPassed = false;
  } finally {
    // 6. Cleanup of Winning Appointment (finally block)
    console.log('\n  Step TC30-5: Mandatory Cleanup & Database State Resolution (finally block)…');
    if (hasUnknownInFlightState) {
      console.error('  ⚠ [FAIL-CLOSED] Race outcome: UNKNOWN_IN_FLIGHT_STATE.');
      console.error('     Automatic cleanup SKIPPED to avoid racing with in-flight server transaction.');
      console.error('     General Admin pointer CANNOT be claimed safely cleared.');
      console.error('     MANUAL DATABASE INSPECTION REQUIRED: Check SYSTEM_DEFAULT.generalAdminUserId in database.');
      cleanupSuccess = false;
    } else {
      // Normal cleanup: executed ONLY when both requests returned actual HTTP responses (both fulfilled)
      try {
        const settingBeforeCleanup = await prisma.systemSetting.findUnique({
          where: { id: 'SYSTEM_DEFAULT' },
          select: { generalAdminUserId: true },
        });

        const currentPointer = settingBeforeCleanup?.generalAdminUserId;

        if (currentPointer === candidateAId || currentPointer === candidateBId) {
          const candidateLabel = currentPointer === candidateAId ? candidateAName : candidateBName;
          console.log(`    Active appointment detected for candidate ${candidateLabel} (${currentPointer}). Revoking via authorized API…`);
          const cleanupRevoke = await httpPost(
            `${config.apiBase}/api/v1/system-admin/general-admin/revoke`,
            jwt1,
            { targetUserId: currentPointer },
            'TC30-cleanup'
          );

          if (cleanupRevoke.status === 200) {
            console.log('    ✅ Cleanup revoke API returned HTTP 200.');
          } else {
            console.error(`    ❌ Cleanup revoke API failed with HTTP ${cleanupRevoke.status}.`);
            cleanupSuccess = false;
          }
        } else if (currentPointer === null || currentPointer === undefined) {
          console.log('    Pointer is already NULL — no API revocation needed.');
        } else {
          console.error(`    ❌ SAFETY ALERT: Pointer references unexpected non-test account (${currentPointer}). Refusing to revoke via candidate ID.`);
          cleanupSuccess = false;
        }

        // Independent post-cleanup verification
        const settingAfterCleanup = await prisma.systemSetting.findUnique({
          where: { id: 'SYSTEM_DEFAULT' },
          select: { generalAdminUserId: true },
        });

        if (settingAfterCleanup?.generalAdminUserId !== null && settingAfterCleanup?.generalAdminUserId !== undefined) {
          console.error(`    ❌ Verification Failed: General Admin pointer is still ${settingAfterCleanup?.generalAdminUserId} (expected NULL).`);
          cleanupSuccess = false;
        } else {
          console.log('    ✅ Independent DB Verification Passed: General Admin pointer is verified NULL in database.');
          if (currentPointer === candidateAId || currentPointer === candidateBId || currentPointer === null || currentPointer === undefined) {
            cleanupSuccess = true;
          }
        }
      } catch (cleanErr: any) {
        console.error(`    ❌ TC-30 Cleanup failed with exception: ${cleanErr.message ?? cleanErr}`);
        cleanupError = cleanErr instanceof Error ? cleanErr : new Error(String(cleanErr));
        cleanupSuccess = false;
      }
    }
  }

  const passed = testPassed && cleanupSuccess && !testError && !cleanupError && !hasUnknownInFlightState;
  if (passed) {
    console.log('\n  ✅ TEST TC-30 PASSED — Competing General Admin appointments serialized safely with mutual exclusion.');
  } else {
    console.log('\n  ❌ TEST TC-30 FAILED — One or more assertions, transport checks, or cleanup operations failed.');
    if (hasUnknownInFlightState) console.error('     Failure reason: UNKNOWN_IN_FLIGHT_STATE (transport rejection; manual DB verification required).');
    if (testError) console.error(`     Primary test error: ${testError.message}`);
    if (cleanupError) console.error(`     Cleanup error: ${cleanupError.message}`);
  }

  return passed;
}

// ============================================================================
// SECTION 9 — TEST D: SELF-DEACTIVATION GUARD
// ============================================================================

async function testSelfDeactivationGuard(
  config: Config,
  jwt1: string,
  sa1UserId: string
): Promise<boolean> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  TEST D — Self-Deactivation Guard');
  console.log('  Endpoint: PATCH /api/v1/users/:id/status');
  console.log('  Rule: Super Admin cannot deactivate their own account');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const result = await httpPatch(
    `${config.apiBase}/api/v1/users/${sa1UserId}/status`,
    jwt1,
    { isActive: false },
    'SA1-self-deactivation'
  );

  const passed = printResult(
    result,
    400,
    'Self-deactivation rejected with HTTP 400 (SELF_DEACTIVATION_PROHIBITED)'
  );

  if (passed && result.body['code'] === 'SELF_DEACTIVATION_PROHIBITED') {
    console.log('\n  ✅ TEST D PASSED — Self-deactivation correctly rejected with expected error code.');
    return true;
  } else {
    console.log('\n  ❌ TEST D FAILED — Unexpected response code or status.');
    return false;
  }
}

// ============================================================================
// SECTION 10 — MAIN ORCHESTRATOR
// ============================================================================

export async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Phase 1 Concurrency Verification Test Harness');
  console.log('  ሐይመተ አብርሃም ሰንበት ትምህርት ቤት — Staging Environment Only');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  validateStagingEnvironment();
  const config = loadConfig();
  const prisma = getPrismaClient();

  console.log(`  API base:              ${config.apiBase}`);
  console.log(`  SA1 username:          ${config.sa1Username}`);
  console.log(`  SA2 username:          ${config.sa2Username}`);
  console.log(`  GA appoint target A:   ${config.gaTargetUsername}`);
  console.log(`  GA appoint target B:   ${config.gaCandidateBUsername}`);
  console.log('');

  // 1. Resolve Account IDs directly from DB
  const sa1 = await prisma.user.findUnique({
    where: { username: config.sa1Username },
    select: { id: true, role: true, isActive: true, isDeleted: true },
  });
  const sa2 = await prisma.user.findUnique({
    where: { username: config.sa2Username },
    select: { id: true, role: true, isActive: true, isDeleted: true },
  });
  const gaTargetA = await prisma.user.findUnique({
    where: { username: config.gaTargetUsername },
    select: { id: true, role: true, isActive: true, isDeleted: true },
  });
  const gaTargetB = await prisma.user.findUnique({
    where: { username: config.gaCandidateBUsername },
    select: { id: true, role: true, isActive: true, isDeleted: true },
  });

  if (!sa1 || !sa2 || !gaTargetA || !gaTargetB) {
    console.error('❌ Could not resolve all required test accounts from database.');
    console.error('   Ensure seedSyntheticStaging.ts has been executed first.');
    throw new FatalTestFailureError('Required test accounts could not be resolved.');
  }

  // Verify candidate eligibility
  if (gaTargetA.role !== UserRole.ADMIN || !gaTargetA.isActive || gaTargetA.isDeleted) {
    console.error(`❌ Candidate A (${config.gaTargetUsername}) is not an eligible active Admin.`);
    throw new FatalTestFailureError(`Candidate A (${config.gaTargetUsername}) is ineligible.`);
  }
  if (gaTargetB.role !== UserRole.ADMIN || !gaTargetB.isActive || gaTargetB.isDeleted) {
    console.error(`❌ Candidate B (${config.gaCandidateBUsername}) is not an eligible active Admin.`);
    throw new FatalTestFailureError(`Candidate B (${config.gaCandidateBUsername}) is ineligible.`);
  }
  if (gaTargetA.id === gaTargetB.id) {
    console.error('❌ Candidate A and Candidate B must be distinct user accounts.');
    throw new FatalTestFailureError('Candidate A and Candidate B must be distinct.');
  }

  // 2. Authenticate Initial Super Admin Sessions
  console.log('Authenticating Super Admin sessions…');
  let sa1Auth: { token: string; userId: string };
  let sa2Auth: { token: string; userId: string };
  try {
    sa1Auth = await login(config.apiBase, config.sa1Username, config.sa1Password);
    sa2Auth = await login(config.apiBase, config.sa2Username, config.sa2Password);
    console.log('  ✅ Both Super Admin sessions authenticated.');
  } catch (authErr: any) {
    console.error(`❌ Initial authentication failed: ${authErr.message}`);
    throw new FatalTestFailureError(`Initial authentication failed: ${authErr.message}`);
  }

  // 3. Sequential Execution with Strict Short-Circuiting

  // Step 1: Suite A — Concurrent SA deactivation & last-active guard
  const resultA = await testConcurrentSuperAdminDeactivation(config, sa1.id, sa2.id);
  if (!resultA) {
    console.error('\n🚨 CRITICAL FAILURE: Suite A failed. Halting test harness immediately.');
    throw new FatalTestFailureError('Suite A (Last-Active-Super-Admin Protection) failed.');
  }

  // Step 2: Refresh Super Admin sessions (tokenVersion was incremented in Test A)
  console.log('\nRefreshing Super Admin sessions following Test A…');
  try {
    sa1Auth = await login(config.apiBase, config.sa1Username, config.sa1Password);
    sa2Auth = await login(config.apiBase, config.sa2Username, config.sa2Password);
    console.log('  ✅ Super Admin sessions successfully refreshed.');
  } catch (refreshErr: any) {
    console.error(`\n🚨 CRITICAL FAILURE: Session refresh failed following Test A: ${refreshErr.message}`);
    throw new FatalTestFailureError(`Session refresh failed following Test A: ${refreshErr.message}`);
  }

  // Step 3: Suite B — Serialized Appoint vs Revoke race
  const resultB = await testAppointmentVsRevocation(config, sa1Auth.token, sa2Auth.token, gaTargetA.id, sa1.id, sa2.id);
  if (!resultB) {
    console.error('\n🚨 CRITICAL FAILURE: Suite B failed. Halting test harness immediately.');
    throw new FatalTestFailureError('Suite B (Serialized GA Appoint vs Revoke) failed.');
  }

  // Step 4: Suite TC-30 — Competing General Admin appointments race
  const resultTC30 = await testCompetingGeneralAdminAppointments(
    config,
    sa1Auth.token,
    sa2Auth.token,
    gaTargetA.id,
    gaTargetB.id,
    config.gaTargetUsername,
    config.gaCandidateBUsername,
    sa1.id,
    sa2.id
  );
  if (!resultTC30) {
    console.error('\n🚨 CRITICAL FAILURE: Suite TC-30 failed. Halting test harness immediately.');
    throw new FatalTestFailureError('Suite TC-30 (Competing GA Appointments) failed.');
  }

  // Step 5: Suite D — Self-deactivation guard
  const resultD = await testSelfDeactivationGuard(config, sa1Auth.token, sa1.id);
  if (!resultD) {
    console.error('\n🚨 CRITICAL FAILURE: Suite D failed.');
    throw new FatalTestFailureError('Suite D (Self-Deactivation Guard) failed.');
  }

  // 4. Summary & Clean Exit
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  CONCURRENCY TEST SUITE SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  TEST A — Last-Active-Super-Admin Protection: ✅ PASS');
  console.log('  TEST B — Serialized GA Appoint vs Revoke:    ✅ PASS');
  console.log('  TEST TC-30 — Competing GA Appointments:     ✅ PASS');
  console.log('  TEST D — Self-Deactivation Guard:            ✅ PASS');
  console.log('');
  console.log('  ✅ ALL CONCURRENCY TESTS COMPLETED SUCCESSFULLY');
  console.log('     Row-level locking, transaction serialization, conflict responses, audit persistence, and clean state verified.');
}

// ============================================================================
// ENTRY POINT (Only execute when directly run from CLI)
// ============================================================================

if (isDirectExecution()) {
  let exitCode = 0;
  main()
    .catch((err) => {
      exitCode = 1;
      console.error('\n❌ Concurrency test runner failed:', err.message ?? err);
    })
    .finally(async () => {
      if (prismaInstance) {
        try {
          await prismaInstance.$disconnect();
          console.log('  ✅ Prisma client disconnected gracefully.');
        } catch (discErr: any) {
          console.error('  ❌ Error disconnecting Prisma client:', discErr.message ?? discErr);
          exitCode = 1;
        }
      }
      process.exitCode = exitCode;
    });
}
