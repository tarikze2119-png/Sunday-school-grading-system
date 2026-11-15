/**
 * ============================================================================
 * Pre-Deployment Security, Logout & Performance Benchmark Runner
 * ============================================================================
 */

import http from 'node:http';
import assert from 'node:assert';
import app from '../app.js';
import prisma from '../config/prisma.client.js';
import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

let server: http.Server;
let serverPort: number;

function parseSetCookie(header: string | null): Record<string, string> {
  const result: Record<string, string> = {};
  if (!header) return result;
  const parts = header.split(';').map((p) => p.trim());
  const [nameVal] = parts;
  const eqIdx = nameVal.indexOf('=');
  if (eqIdx !== -1) {
    result.name = nameVal.substring(0, eqIdx);
    result.value = nameVal.substring(eqIdx + 1);
  }
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (part.toLowerCase() === 'httponly') result.httpOnly = 'true';
    else if (part.toLowerCase() === 'secure') result.secure = 'true';
    else if (part.toLowerCase().startsWith('samesite=')) result.sameSite = part.split('=')[1];
    else if (part.toLowerCase().startsWith('path=')) result.path = part.split('=')[1];
    else if (part.toLowerCase().startsWith('expires=')) result.expires = part.split('=')[1];
    else if (part.toLowerCase().startsWith('max-age=')) result.maxAge = part.split('=')[1];
  }
  return result;
}

function calculateStats(latencies: number[]) {
  const sorted = [...latencies].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = Math.round((sum / sorted.length) * 10) / 10;
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? max;
  return { min, max, avg, p50, p95, count: sorted.length };
}

async function main() {
  console.log('========================================================================');
  console.log('🔍 PRE-DEPLOYMENT VERIFICATION & BENCHMARK RUNNER');
  console.log('========================================================================\n');

  await prisma.$queryRaw`SELECT 1`;
  console.log('✅ Connected to isolated local database on localhost:5432.');

  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr: any = server.address();
      serverPort = addr.port;
      console.log(`📡 In-process test server listening at http://127.0.0.1:${serverPort}\n`);
      resolve();
    });
  });

  try {
    // =========================================================================
    // 1. LOGOUT BEHAVIOR AUDIT & VERIFICATION
    // =========================================================================
    console.log('--- 1. Logout Verification ---');

    // Create test user for logout tests
    const logoutUser = await prisma.user.create({
      data: {
        username: `user_logout_${Date.now()}`,
        passwordHash: await bcrypt.hash('LogoutPass@1234', 12),
        role: UserRole.TEACHER,
        firstName: 'ማቴዎስ',
        lastName: 'ክንፈ',
        isActive: true,
        tokenVersion: 1,
      },
    });

    // 1.1 Device A Login
    const devALoginRes = await fetch(`http://127.0.0.1:${serverPort}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: logoutUser.username, password: 'LogoutPass@1234' }),
    });
    const devALoginData = await devALoginRes.json();
    const devA_token = devALoginData.data.accessToken;
    const devA_setCookie = devALoginRes.headers.get('set-cookie');
    const devA_cookieMeta = parseSetCookie(devA_setCookie);
    const devA_refreshToken = devA_cookieMeta.value;

    // 1.2 Device B Login
    const devBLoginRes = await fetch(`http://127.0.0.1:${serverPort}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: logoutUser.username, password: 'LogoutPass@1234' }),
    });
    const devBLoginData = await devBLoginRes.json();
    const devB_token = devBLoginData.data.accessToken;
    const devB_refreshToken = parseSetCookie(devBLoginRes.headers.get('set-cookie')).value;

    console.log('  Login cookie set options:', {
      httpOnly: devA_cookieMeta.httpOnly === 'true',
      sameSite: devA_cookieMeta.sameSite,
      path: devA_cookieMeta.path,
    });

    // 1.3 Device A executes POST /api/v1/auth/logout
    const logoutRes = await fetch(`http://127.0.0.1:${serverPort}/api/v1/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${devA_token}`,
      },
    });
    const logoutData = await logoutRes.json();
    const logoutSetCookie = logoutRes.headers.get('set-cookie');
    const logoutCookieMeta = parseSetCookie(logoutSetCookie);

    console.log('  Logout response status:', logoutRes.status, logoutData.message);
    console.log('  Logout clear-cookie headers:', {
      cleared: logoutCookieMeta.value === '' || logoutCookieMeta.maxAge === '0' || !!logoutCookieMeta.expires,
      httpOnly: logoutCookieMeta.httpOnly === 'true',
      sameSite: logoutCookieMeta.sameSite,
      path: logoutCookieMeta.path,
    });

    // 1.4 Multi-device independence: Device B still works after Device A logs out
    const devBMeRes = await fetch(`http://127.0.0.1:${serverPort}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${devB_token}` },
    });
    console.log('  Device B session after Device A logout:', devBMeRes.status, devBMeRes.status === 200 ? 'ACTIVE (Multi-device preserved)' : 'INACTIVE');

    // 1.5 Device B refresh token still works
    const devBRefreshRes = await fetch(`http://127.0.0.1:${serverPort}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refreshToken=${devB_refreshToken}` },
    });
    console.log('  Device B refresh after Device A logout:', devBRefreshRes.status, devBRefreshRes.status === 200 ? 'REFRESH ACTIVE' : 'REJECTED');

    // 1.6 Server-side revocation analysis for raw Device A refresh token
    const devAReuseRes = await fetch(`http://127.0.0.1:${serverPort}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refreshToken=${devA_refreshToken}` },
    });
    const devAReuseData = await devAReuseRes.json();
    console.log('  Device A old raw refresh token reuse attempt:', devAReuseRes.status, devAReuseData.message || (devAReuseRes.status === 200 ? 'Refreshed' : 'Rejected'));

    await prisma.user.delete({ where: { id: logoutUser.id } });
    console.log('  Cleaned up logout test user.\n');

    // =========================================================================
    // 2. MIGRATION & DEFAULT VALUE VERIFICATION
    // =========================================================================
    console.log('--- 2. Migration & User Data Integrity Verification ---');

    // Check all existing users
    const allUsers = await prisma.user.findMany({
      select: { username: true, role: true, tokenVersion: true, createdAt: true },
    });
    const nonDefaultUsers = allUsers.filter((u) => typeof u.tokenVersion !== 'number' || u.tokenVersion < 1);
    console.log(`  Total local users: ${allUsers.length}`);
    console.log(`  Users with valid tokenVersion (>= 1): ${allUsers.length - nonDefaultUsers.length}/${allUsers.length}`);
    assert(nonDefaultUsers.length === 0, 'All existing users must have tokenVersion >= 1');

    // Test new user creation without specifying tokenVersion
    const newUser = await prisma.user.create({
      data: {
        username: `new_user_${Date.now()}`,
        passwordHash: await bcrypt.hash('TempPassword@123', 12),
        role: UserRole.STUDENT,
        firstName: 'አዲስ',
        lastName: 'ተማሪ',
      },
    });
    console.log(`  New user '${newUser.username}' default tokenVersion:`, newUser.tokenVersion);
    assert.strictEqual(newUser.tokenVersion, 1, 'New user must default to tokenVersion 1');
    await prisma.user.delete({ where: { id: newUser.id } });
    console.log('  Cleaned up test new user.\n');

    // =========================================================================
    // 3. PERFORMANCE BENCHMARK (1, 10, AND 25 CONCURRENT REQUESTS)
    // =========================================================================
    console.log('--- 3. Authenticated Request Performance Benchmark ---');

    // Obtain fresh token for teacher_tekle
    const loginBenchRes = await fetch(`http://127.0.0.1:${serverPort}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'teacher_tekle', password: 'Teacher@2026' }),
    });
    const loginBenchData = await loginBenchRes.json();
    const benchToken = loginBenchData.data.accessToken;
    assert(benchToken, 'Must obtain valid benchmark token');

    // Warm-up query
    await fetch(`http://127.0.0.1:${serverPort}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${benchToken}` },
    });

    // 3.1 Single Request (10 sequential iterations)
    const singleLatencies: number[] = [];
    for (let i = 0; i < 10; i++) {
      const t0 = performance.now();
      const r = await fetch(`http://127.0.0.1:${serverPort}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${benchToken}` },
      });
      const t1 = performance.now();
      assert.strictEqual(r.status, 200);
      singleLatencies.push(Math.round(t1 - t0));
    }
    const singleStats = calculateStats(singleLatencies);
    console.log('  Level 1 (Single request, 10 sequential iterations):', singleStats);

    // 3.2 10 Simultaneous Concurrent Requests
    const batch10Start = performance.now();
    const batch10Promises = Array.from({ length: 10 }, async () => {
      const t0 = performance.now();
      const r = await fetch(`http://127.0.0.1:${serverPort}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${benchToken}` },
      });
      const t1 = performance.now();
      assert.strictEqual(r.status, 200);
      return Math.round(t1 - t0);
    });
    const batch10Latencies = await Promise.all(batch10Promises);
    const batch10TotalMs = Math.round(performance.now() - batch10Start);
    const batch10Stats = calculateStats(batch10Latencies);
    console.log(`  Level 2 (10 simultaneous concurrent requests - total ${batch10TotalMs}ms):`, batch10Stats);

    // 3.3 25 Simultaneous Concurrent Requests
    const batch25Start = performance.now();
    const batch25Promises = Array.from({ length: 25 }, async () => {
      const t0 = performance.now();
      const r = await fetch(`http://127.0.0.1:${serverPort}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${benchToken}` },
      });
      const t1 = performance.now();
      assert.strictEqual(r.status, 200);
      return Math.round(t1 - t0);
    });
    const batch25Latencies = await Promise.all(batch25Promises);
    const batch25TotalMs = Math.round(performance.now() - batch25Start);
    const batch25Stats = calculateStats(batch25Latencies);
    console.log(`  Level 3 (25 simultaneous concurrent requests - total ${batch25TotalMs}ms):`, batch25Stats);

    // 3.4 Combined Auth + Academic Endpoint under 25 Concurrent Requests
    const academic25Start = performance.now();
    const academic25Promises = Array.from({ length: 25 }, async () => {
      const t0 = performance.now();
      const r = await fetch(`http://127.0.0.1:${serverPort}/api/v1/academic/batches`, {
        headers: { Authorization: `Bearer ${benchToken}` },
      });
      const t1 = performance.now();
      assert.strictEqual(r.status, 200);
      return Math.round(t1 - t0);
    });
    const academic25Latencies = await Promise.all(academic25Promises);
    const academic25TotalMs = Math.round(performance.now() - academic25Start);
    const academic25Stats = calculateStats(academic25Latencies);
    console.log(`  Level 3B (25 concurrent calls to /academic/batches - total ${academic25TotalMs}ms):`, academic25Stats);

    console.log('\n========================================================================');
    console.log('✅ ALL PRE-DEPLOYMENT BENCHMARKS & VERIFICATIONS COMPLETED');
    console.log('========================================================================\n');
  } finally {
    if (server) server.close();
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Benchmark Error:', err);
  process.exit(1);
});
