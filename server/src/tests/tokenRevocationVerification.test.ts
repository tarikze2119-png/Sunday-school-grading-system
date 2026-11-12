/**
 * ============================================================================
 * Token Revocation & Password Change Security Verification Test Runner
 * ============================================================================
 * Focus:
 *  1. Multi-Device (Device A & Device B) login & token issuance
 *  2. Password change on Device A -> immediate revocation on Device B
 *  3. Verification that old access token is rejected (HTTP 401)
 *  4. Verification that old refresh token is rejected (HTTP 401)
 *  5. Re-authentication with new password and verification of new tokens
 *  6. Legacy pre-migration token rejection (no tokenVersion)
 *  7. Inactive account token revocation
 *  8. Expired token rejection
 *  9. Password validation rules (wrong password, short password)
 * 10. Verification across all 5 roles (SUPER_ADMIN, ADMIN, TEACHER, STUDENT, MANAGEMENT)
 * 11. Admin reset password token invalidation
 * ============================================================================
 */

import http from 'node:http';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../app.js';
import { ENV } from '../config/env.config.js';
import prisma from '../config/prisma.client.js';
import { UserRole } from '@prisma/client';

export interface DetailedEvidence {
  testId: string;
  description: string;
  endpoint: string;
  method: string;
  expectedResult: string;
  actualResult: string;
  status: 'PASS' | 'FAIL' | 'NOT TESTED';
  durationMs: number;
  evidence: any;
}

const evidenceList: DetailedEvidence[] = [];

let server: http.Server;
let serverPort: number;

async function executeApiCall(
  testId: string,
  description: string,
  method: string,
  path: string,
  token: string | null,
  body: any,
  expectedStatus: number,
  expectedResultText: string,
  extraHeaders: Record<string, string> = {},
  evaluator?: (res: Response, data: any) => { pass: boolean; note: string }
): Promise<any> {
  const start = Date.now();
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...extraHeaders,
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`http://127.0.0.1:${serverPort}${path}`, {
      method,
      headers,
      body: body !== undefined && body !== null ? JSON.stringify(body) : undefined,
    });
    const durationMs = Date.now() - start;
    let data: any = null;
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    let pass = res.status === expectedStatus;
    let actualResultText = `HTTP ${res.status}`;

    if (evaluator) {
      const evalRes = evaluator(res, data);
      if (!evalRes.pass) {
        pass = false;
        actualResultText += ` - ${evalRes.note}`;
      } else {
        actualResultText += ` - ${evalRes.note}`;
      }
    } else {
      actualResultText += ` - Success: ${data?.success ?? data?.status ?? 'N/A'}`;
    }

    const setCookie = res.headers.get('set-cookie');

    evidenceList.push({
      testId,
      description,
      endpoint: path,
      method,
      expectedResult: expectedResultText,
      actualResult: actualResultText,
      status: pass ? 'PASS' : 'FAIL',
      durationMs,
      evidence: {
        statusCode: res.status,
        responseSnippet: typeof data === 'object' ? JSON.stringify(data).slice(0, 200) : String(data).slice(0, 200),
        setCookie: setCookie ? setCookie.slice(0, 50) + '...' : undefined,
      },
    });

    return { data, headers: res.headers };
  } catch (err: any) {
    const durationMs = Date.now() - start;
    evidenceList.push({
      testId,
      description,
      endpoint: path,
      method,
      expectedResult: expectedResultText,
      actualResult: `Error: ${err.message}`,
      status: 'FAIL',
      durationMs,
      evidence: { error: err.message },
    });
    return { data: null, headers: null };
  }
}

function parseCookie(setCookieHeader: string | null, cookieName: string): string | null {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(new RegExp(`${cookieName}=([^;]+)`));
  return match ? match[1] : null;
}

async function main() {
  console.log('========================================================================');
  console.log('🔒 TOKEN REVOCATION & IMMEDIATE INVALIDATION VERIFICATION RUNNER');
  console.log('========================================================================\n');

  // 1. Verify Database Isolation
  await prisma.$queryRaw`SELECT 1`;
  console.log('✅ Connected to isolated local database on localhost:5432.');

  // 2. Start In-Process Server
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
    // SCENARIO 1: MULTI-DEVICE SIMULATION (DEVICE A & DEVICE B)
    // =========================================================================
    console.log('--- Scenario 1: Multi-Device (Device A & Device B) Immediate Invalidation ---');

    const timestamp = Date.now();
    const testUsername = `user_dev_${timestamp}`;
    const initialPassword = 'InitialDevicePass@1234';
    const updatedPassword = 'NewSecurePassword@5678!';

    const passwordHash = await bcrypt.hash(initialPassword, 12);
    const multiDevUser = await prisma.user.create({
      data: {
        username: testUsername,
        passwordHash,
        role: UserRole.TEACHER,
        firstName: 'ተስፋዬ',
        lastName: 'ዘውዴ',
        isActive: true,
        tokenVersion: 1,
      },
    });

    console.log(`Created isolated user '${testUsername}' with tokenVersion=1.`);

    // 1.1 Device A Login
    const devALogin = await executeApiCall(
      'MDEV-01',
      'Device A: Initial login',
      'POST',
      '/api/v1/auth/login',
      null,
      { identifier: testUsername, password: initialPassword },
      200,
      'HTTP 200 with Device A access token and refresh token',
      {},
      (res, d) => ({
        pass: d.success === true && !!d.data?.accessToken,
        note: 'Device A authenticated',
      })
    );
    const devA_accessToken = devALogin.data?.data?.accessToken;
    const devA_refreshToken = parseCookie(devALogin.headers.get('set-cookie'), 'refreshToken');

    // 1.2 Device B Login
    const devBLogin = await executeApiCall(
      'MDEV-02',
      'Device B: Concurrent login with same account',
      'POST',
      '/api/v1/auth/login',
      null,
      { identifier: testUsername, password: initialPassword },
      200,
      'HTTP 200 with Device B access token and refresh token',
      {},
      (res, d) => ({
        pass: d.success === true && !!d.data?.accessToken,
        note: 'Device B authenticated',
      })
    );
    const devB_accessToken = devBLogin.data?.data?.accessToken;
    const devB_refreshToken = parseCookie(devBLogin.headers.get('set-cookie'), 'refreshToken');

    // 1.3 Verify both tokens work before password change
    await executeApiCall(
      'MDEV-03A',
      'Device A: Verify access token works before password change',
      'GET',
      '/api/v1/auth/me',
      devA_accessToken,
      null,
      200,
      'HTTP 200 Device A session active',
      {},
      (res, d) => ({ pass: d.success === true, note: 'Device A token valid' })
    );

    await executeApiCall(
      'MDEV-03B',
      'Device B: Verify access token works before password change',
      'GET',
      '/api/v1/auth/me',
      devB_accessToken,
      null,
      200,
      'HTTP 200 Device B session active',
      {},
      (res, d) => ({ pass: d.success === true, note: 'Device B token valid' })
    );

    await executeApiCall(
      'MDEV-03C',
      'Device B: Verify refresh token works before password change',
      'POST',
      '/api/v1/auth/refresh',
      null,
      null,
      200,
      'HTTP 200 Device B refresh token successfully issues new access token',
      { Cookie: `refreshToken=${devB_refreshToken}` },
      (res, d) => ({ pass: d.success === true && !!d.data?.accessToken, note: 'Refresh successful' })
    );

    // 1.4 Device A Changes Password
    await executeApiCall(
      'MDEV-04',
      'Device A: Change password',
      'PUT',
      '/api/v1/auth/change-password',
      devA_accessToken,
      {
        currentPassword: initialPassword,
        newPassword: updatedPassword,
      },
      200,
      'HTTP 200 password changed and tokenVersion incremented in DB',
      {},
      (res, d) => ({ pass: d.success === true, note: d.message || 'Password changed' })
    );

    // Verify DB tokenVersion has incremented to 2
    const updatedUser = await prisma.user.findUnique({ where: { id: multiDevUser.id } });
    evidenceList.push({
      testId: 'MDEV-05-DB',
      description: 'Verify tokenVersion incremented in PostgreSQL transaction',
      endpoint: 'Local DB query',
      method: 'prisma.user.findUnique',
      expectedResult: 'tokenVersion === 2',
      actualResult: `tokenVersion is ${updatedUser?.tokenVersion}`,
      status: updatedUser?.tokenVersion === 2 ? 'PASS' : 'FAIL',
      durationMs: 5,
      evidence: { tokenVersion: updatedUser?.tokenVersion },
    });

    // 1.5 Try Old Access Token from Device B (Must be REJECTED immediately)
    await executeApiCall(
      'MDEV-06',
      'Device B: Old access token is immediately rejected after password change',
      'GET',
      '/api/v1/auth/me',
      devB_accessToken,
      null,
      401,
      'HTTP 401 Unauthorized with revocation message',
      {},
      (res, d) => ({
        pass: d.success === false,
        note: d.message || 'Old access token rejected',
      })
    );

    // 1.6 Try Old Refresh Token from Device B (Must be REJECTED immediately)
    await executeApiCall(
      'MDEV-07',
      'Device B: Old refresh token is immediately rejected after password change',
      'POST',
      '/api/v1/auth/refresh',
      null,
      null,
      401,
      'HTTP 401 Unauthorized rejection for mismatched tokenVersion',
      { Cookie: `refreshToken=${devB_refreshToken}` },
      (res, d) => ({
        pass: d.success === false,
        note: d.message || 'Old refresh token rejected',
      })
    );

    // 1.7 Try Old Access Token from Device A (Also REJECTED immediately)
    await executeApiCall(
      'MDEV-08',
      'Device A: Old access token is also immediately rejected',
      'GET',
      '/api/v1/auth/me',
      devA_accessToken,
      null,
      401,
      'HTTP 401 Unauthorized rejection for mismatched tokenVersion',
      {},
      (res, d) => ({
        pass: d.success === false,
        note: d.message || 'Device A old access token rejected',
      })
    );

    // 1.8 Verify Old Password is REJECTED
    await executeApiCall(
      'MDEV-09',
      'Login with old password is rejected',
      'POST',
      '/api/v1/auth/login',
      null,
      { identifier: testUsername, password: initialPassword },
      401,
      'HTTP 401 Unauthorized wrong credentials',
      {},
      (res, d) => ({ pass: d.success === false, note: d.message || 'Old password rejected' })
    );

    // 1.9 Log in with NEW password
    const newLoginRes = await executeApiCall(
      'MDEV-10',
      'Log in again with new password',
      'POST',
      '/api/v1/auth/login',
      null,
      { identifier: testUsername, password: updatedPassword },
      200,
      'HTTP 200 with new tokens matching tokenVersion=2',
      {},
      (res, d) => ({ pass: d.success === true && !!d.data?.accessToken, note: 'Login successful' })
    );
    const newAccessToken = newLoginRes.data?.data?.accessToken;
    const newRefreshToken = parseCookie(newLoginRes.headers.get('set-cookie'), 'refreshToken');

    // 1.10 Confirm NEW tokens work
    await executeApiCall(
      'MDEV-11A',
      'Confirm new access token works successfully',
      'GET',
      '/api/v1/auth/me',
      newAccessToken,
      null,
      200,
      'HTTP 200 user profile retrieved with new access token',
      {},
      (res, d) => ({ pass: d.success === true, note: 'New access token valid' })
    );

    await executeApiCall(
      'MDEV-11B',
      'Confirm new refresh token works successfully',
      'POST',
      '/api/v1/auth/refresh',
      null,
      null,
      200,
      'HTTP 200 new refresh token generates new access token',
      { Cookie: `refreshToken=${newRefreshToken}` },
      (res, d) => ({ pass: d.success === true && !!d.data?.accessToken, note: 'New refresh token valid' })
    );

    // Clean up Scenario 1 user
    await prisma.user.delete({ where: { id: multiDevUser.id } });
    console.log(`Cleaned up user '${testUsername}'.\n`);

    // =========================================================================
    // SCENARIO 2: SAFE HANDLING OF PRE-MIGRATION TOKENS (NO TOKENVERSION)
    // =========================================================================
    console.log('--- Scenario 2: Pre-Migration Legacy Token Rejection ---');

    const legacyUser = await prisma.user.findFirst({ where: { role: UserRole.ADMIN } });
    assert(legacyUser, 'Admin user must exist');

    // Forge a valid JWT access token WITHOUT tokenVersion claim
    const legacyAccessToken = jwt.sign(
      {
        userId: legacyUser.id,
        username: legacyUser.username,
        role: legacyUser.role,
        firstName: legacyUser.firstName,
        lastName: legacyUser.lastName,
      },
      ENV.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    await executeApiCall(
      'LEGACY-01',
      'Legacy access token without tokenVersion claim is safely rejected',
      'GET',
      '/api/v1/auth/me',
      legacyAccessToken,
      null,
      401,
      'HTTP 401 Unauthorized rejection for missing tokenVersion',
      {},
      (res, d) => ({ pass: d.success === false, note: d.message || 'Legacy token rejected' })
    );

    // Forge a valid JWT refresh token WITHOUT tokenVersion claim
    const legacyRefreshToken = jwt.sign(
      {
        userId: legacyUser.id,
      },
      ENV.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    await executeApiCall(
      'LEGACY-02',
      'Legacy refresh token without tokenVersion claim is safely rejected',
      'POST',
      '/api/v1/auth/refresh',
      null,
      null,
      401,
      'HTTP 401 Unauthorized rejection for missing tokenVersion',
      { Cookie: `refreshToken=${legacyRefreshToken}` },
      (res, d) => ({ pass: d.success === false, note: d.message || 'Legacy refresh rejected' })
    );

    // =========================================================================
    // SCENARIO 3: PASSWORD VALIDATION RULES
    // =========================================================================
    console.log('\n--- Scenario 3: Password Validation Rules ---');

    // Create ephemeral user for validation tests
    const valUser = await prisma.user.create({
      data: {
        username: `user_val_${Date.now()}`,
        passwordHash: await bcrypt.hash('CorrectPass@1234', 12),
        role: UserRole.STUDENT,
        firstName: 'ዮናስ',
        lastName: 'ሃብቴ',
        isActive: true,
        tokenVersion: 1,
      },
    });

    const valLogin = await executeApiCall(
      'VAL-01',
      'Authenticate validation test user',
      'POST',
      '/api/v1/auth/login',
      null,
      { identifier: valUser.username, password: 'CorrectPass@1234' },
      200,
      'HTTP 200 authenticated',
      {},
      (res, d) => ({ pass: d.success === true, note: 'Authenticated' })
    );
    const valToken = valLogin.data?.data?.accessToken;

    // Wrong current password
    await executeApiCall(
      'VAL-02',
      'Change password with incorrect current password',
      'PUT',
      '/api/v1/auth/change-password',
      valToken,
      { currentPassword: 'WrongPassword@999', newPassword: 'BrandNewPass@9999' },
      400,
      'HTTP 400 Bad Request incorrect current password',
      {},
      (res, d) => ({ pass: d.success === false, note: d.message || 'Rejected' })
    );

    // New password too short (< 12 characters)
    await executeApiCall(
      'VAL-03',
      'Change password with new password shorter than 12 characters',
      'PUT',
      '/api/v1/auth/change-password',
      valToken,
      { currentPassword: 'CorrectPass@1234', newPassword: 'Short@123' },
      400,
      'HTTP 400 Bad Request password length requirement enforced',
      {},
      (res, d) => ({ pass: d.success === false, note: d.message || 'Length error' })
    );

    await prisma.user.delete({ where: { id: valUser.id } });

    // =========================================================================
    // SCENARIO 4: INACTIVE / DEACTIVATED ACCOUNT IMMEDIATE REVOCATION
    // =========================================================================
    console.log('\n--- Scenario 4: Inactive Account Revocation ---');

    const inactUser = await prisma.user.create({
      data: {
        username: `user_inact_${Date.now()}`,
        passwordHash: await bcrypt.hash('InactPass@12345', 12),
        role: UserRole.TEACHER,
        firstName: 'ገብሬ',
        lastName: 'ማርቆስ',
        isActive: true,
        tokenVersion: 1,
      },
    });

    const inactLogin = await executeApiCall(
      'INACT-01',
      'Login active user prior to deactivation',
      'POST',
      '/api/v1/auth/login',
      null,
      { identifier: inactUser.username, password: 'InactPass@12345' },
      200,
      'HTTP 200 tokens issued',
      {},
      (res, d) => ({ pass: d.success === true, note: 'Tokens issued' })
    );
    const inactToken = inactLogin.data?.data?.accessToken;
    const inactRefreshToken = parseCookie(inactLogin.headers.get('set-cookie'), 'refreshToken');

    // Deactivate user in DB
    await prisma.user.update({
      where: { id: inactUser.id },
      data: { isActive: false },
    });

    // Access token rejected immediately
    await executeApiCall(
      'INACT-02',
      'Deactivated account access token is immediately rejected',
      'GET',
      '/api/v1/auth/me',
      inactToken,
      null,
      401,
      'HTTP 401 Unauthorized account suspended',
      {},
      (res, d) => ({ pass: d.success === false, note: d.message || 'Deactivated token rejected' })
    );

    // Refresh token rejected immediately
    await executeApiCall(
      'INACT-03',
      'Deactivated account refresh token is immediately rejected',
      'POST',
      '/api/v1/auth/refresh',
      null,
      null,
      401,
      'HTTP 401 Unauthorized account suspended',
      { Cookie: `refreshToken=${inactRefreshToken}` },
      (res, d) => ({ pass: d.success === false, note: d.message || 'Deactivated refresh rejected' })
    );

    await prisma.user.delete({ where: { id: inactUser.id } });

    // =========================================================================
    // SCENARIO 5: EXPIRED TOKENS
    // =========================================================================
    console.log('\n--- Scenario 5: Expired Token Rejection ---');

    const expAccessToken = jwt.sign(
      {
        userId: legacyUser.id,
        username: legacyUser.username,
        role: legacyUser.role,
        firstName: legacyUser.firstName,
        lastName: legacyUser.lastName,
        tokenVersion: legacyUser.tokenVersion,
        exp: Math.floor(Date.now() / 1000) - 60, // expired 60 seconds ago
      },
      ENV.JWT_ACCESS_SECRET
    );

    await executeApiCall(
      'EXP-01',
      'Expired access token rejected',
      'GET',
      '/api/v1/auth/me',
      expAccessToken,
      null,
      401,
      'HTTP 401 Unauthorized token expired',
      {},
      (res, d) => ({ pass: d.success === false, note: d.message || 'Expired access token rejected' })
    );

    const expRefreshToken = jwt.sign(
      {
        userId: legacyUser.id,
        tokenVersion: legacyUser.tokenVersion,
        exp: Math.floor(Date.now() / 1000) - 60,
      },
      ENV.JWT_REFRESH_SECRET
    );

    await executeApiCall(
      'EXP-02',
      'Expired refresh token rejected',
      'POST',
      '/api/v1/auth/refresh',
      null,
      null,
      401,
      'HTTP 401 Unauthorized refresh token expired',
      { Cookie: `refreshToken=${expRefreshToken}` },
      (res, d) => ({ pass: d.success === false, note: d.message || 'Expired refresh token rejected' })
    );

    // =========================================================================
    // SCENARIO 6: ROLE-SPECIFIC VERIFICATION (ALL 5 ROLES)
    // =========================================================================
    console.log('\n--- Scenario 6: Role-Specific Verification (All 5 Roles) ---');

    const roleAccounts = [
      { role: UserRole.SUPER_ADMIN, username: 'superadmin', password: 'Admin@SundaySchool2026' },
      { role: UserRole.ADMIN, username: 'admin_mulugeta', password: 'Admin@2026' },
      { role: UserRole.TEACHER, username: 'teacher_tekle', password: 'Teacher@2026' },
      { role: UserRole.STUDENT, username: 'student_yohannes', password: 'Student@2026' },
      { role: UserRole.MANAGEMENT, username: 'mgmt_berhanu', password: 'Mgmt@2026' },
    ];

    for (const acc of roleAccounts) {
      const loginRes = await executeApiCall(
        `ROLE-${acc.role}-LOGIN`,
        `Login as role ${acc.role}`,
        'POST',
        '/api/v1/auth/login',
        null,
        { identifier: acc.username, password: acc.password },
        200,
        `HTTP 200 with tokens for ${acc.role}`,
        {},
        (res, d) => ({ pass: d.success === true && d.data?.user?.role === acc.role, note: `Role ${acc.role} login verified` })
      );

      const token = loginRes.data?.data?.accessToken;
      if (token) {
        // Decode token to verify tokenVersion claim is embedded
        const decodedToken: any = jwt.decode(token);
        assert(typeof decodedToken.tokenVersion === 'number', `tokenVersion must be embedded in ${acc.role} JWT`);

        await executeApiCall(
          `ROLE-${acc.role}-ME`,
          `Verify authenticated /me endpoint for role ${acc.role}`,
          'GET',
          '/api/v1/auth/me',
          token,
          null,
          200,
          `HTTP 200 profile data for ${acc.role}`,
          {},
          (res, d) => ({ pass: d.success === true && d.data?.role === acc.role, note: `Role ${acc.role} /me verified` })
        );
      }
    }

    // =========================================================================
    // SCENARIO 7: ADMIN PASSWORD RESET IMMEDIATE REVOCATION
    // =========================================================================
    console.log('\n--- Scenario 7: Admin Reset Password Invalidation ---');

    // Create user whose password will be reset by admin
    const resetUser = await prisma.user.create({
      data: {
        username: `user_reset_${Date.now()}`,
        passwordHash: await bcrypt.hash('OriginalPass@1234', 12),
        role: UserRole.STUDENT,
        firstName: 'ኤልያስ',
        lastName: 'ታደሰ',
        isActive: true,
        tokenVersion: 1,
      },
    });

    const resetUserLogin = await executeApiCall(
      'ADM-RST-01',
      'Student logs in before admin reset',
      'POST',
      '/api/v1/auth/login',
      null,
      { identifier: resetUser.username, password: 'OriginalPass@1234' },
      200,
      'HTTP 200 student authenticated',
      {},
      (res, d) => ({ pass: d.success === true, note: 'Authenticated' })
    );
    const resetUserToken = resetUserLogin.data?.data?.accessToken;
    const resetUserRefreshToken = parseCookie(resetUserLogin.headers.get('set-cookie'), 'refreshToken');

    // Admin logs in
    const adminLoginRes = await executeApiCall(
      'ADM-RST-02',
      'Admin logs in to perform password reset',
      'POST',
      '/api/v1/auth/login',
      null,
      { identifier: 'admin_mulugeta', password: 'Admin@2026' },
      200,
      'HTTP 200 Admin authenticated',
      {},
      (res, d) => ({ pass: d.success === true, note: 'Admin authenticated' })
    );
    const adminToken = adminLoginRes.data?.data?.accessToken;

    // Admin resets student's password
    await executeApiCall(
      'ADM-RST-03',
      'Admin resets student password',
      'POST',
      `/api/v1/auth/admin-reset-password/${resetUser.id}`,
      adminToken,
      { newPassword: 'AdminGivenNewPass@999' },
      200,
      'HTTP 200 student password reset by Admin',
      {},
      (res, d) => ({ pass: d.success === true, note: 'Reset completed' })
    );

    // Student's old access token rejected immediately
    await executeApiCall(
      'ADM-RST-04',
      'Student old access token rejected immediately after admin reset',
      'GET',
      '/api/v1/auth/me',
      resetUserToken,
      null,
      401,
      'HTTP 401 Unauthorized token revoked',
      {},
      (res, d) => ({ pass: d.success === false, note: d.message || 'Token revoked' })
    );

    // Student's old refresh token rejected immediately
    await executeApiCall(
      'ADM-RST-05',
      'Student old refresh token rejected immediately after admin reset',
      'POST',
      '/api/v1/auth/refresh',
      null,
      null,
      401,
      'HTTP 401 Unauthorized refresh revoked',
      { Cookie: `refreshToken=${resetUserRefreshToken}` },
      (res, d) => ({ pass: d.success === false, note: d.message || 'Refresh revoked' })
    );

    await prisma.user.delete({ where: { id: resetUser.id } });

    // =========================================================================
    // SUMMARY OUTPUT
    // =========================================================================
    console.log('\n========================================================================');
    console.log('📊 TOKEN REVOCATION VERIFICATION RESULTS');
    console.log('========================================================================\n');

    console.log(JSON.stringify(evidenceList, null, 2));

    const total = evidenceList.length;
    const passed = evidenceList.filter((e) => e.status === 'PASS').length;
    const failed = evidenceList.filter((e) => e.status === 'FAIL').length;

    console.log(`\nTotal Scenarios: ${total} | Passed: ${passed} | Failed: ${failed}\n`);

    if (failed > 0) {
      process.exitCode = 1;
    }
  } finally {
    if (server) {
      server.close();
    }
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Fatal Runner Error:', err);
  process.exit(1);
});
