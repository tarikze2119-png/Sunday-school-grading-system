import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');

async function runTests() {
  console.log('================================================================================');
  console.log('🛡️  MANAGEMENT TRANSCRIPT PRINT RESTRICTION REGRESSION TEST SUITE');
  console.log('================================================================================\n');

  let passed = 0;
  let total = 0;

  // ---------------------------------------------------------------------------
  // TEST 1: Source Code Inspection - MultiYearTranscriptModal Role-Aware Controls
  // ---------------------------------------------------------------------------
  total++;
  {
    const filePath = path.resolve(rootDir, 'client/src/components/grades/MultiYearTranscriptModal.tsx');
    const content = fs.readFileSync(filePath, 'utf8');

    // 1. Role determination
    assert(content.includes("const isAdminOrSuperAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';"),
      'Must determine isAdminOrSuperAdmin from AuthContext user.role');

    // 2. Application-level print handler guard
    assert(content.includes('if (!isAdminOrSuperAdmin) {'),
      'handlePrint must explicitly check !isAdminOrSuperAdmin');
    assert(content.includes("alert('ይፋዊ የትምህርት ማስረጃ የማተም ወይም የማውረድ ፈቃድ ለአስተዳዳሪዎች ብቻ የተፈቀደ ነው።');"),
      'handlePrint must alert unauthorized users and abort');

    // 3. Application UI print button visibility
    assert(content.includes('{isAdminOrSuperAdmin && (') && content.includes('<Printer className="w-4 h-4" /> በPDF አትም (Print / Save PDF)'),
      'Print button must be conditionally rendered ONLY for Admin and Super Admin');

    // 4. Role-aware print media suppression
    assert(content.includes("isAdminOrSuperAdmin\n              ? 'print:p-0 print:m-0 print:overflow-visible'\n              : 'print:hidden'"),
      'Printable document container must have print:hidden when !isAdminOrSuperAdmin');

    // 5. Official restriction notice in print media
    assert(content.includes('id="management-print-restriction-notice"'),
      'Must contain management-print-restriction-notice element');
    assert(content.includes('ይፋዊ የትምህርት ማስረጃ የማተም ፈቃድ አልተሰጠም (Printing Prohibited)'),
      'Must display clear Amharic restriction notice');
    assert(content.includes('OFFICIAL RESTRICTION NOTICE: Management role is restricted to read-only on-screen viewing.'),
      'Must display clear English restriction notice');

    console.log('  ✅ 1. MultiYearTranscriptModal: Role-aware print suppression and restriction notice verified');
    passed++;
  }

  // ---------------------------------------------------------------------------
  // TEST 2: Source Code Inspection - ReportCardModal Role-Aware Controls
  // ---------------------------------------------------------------------------
  total++;
  {
    const filePath = path.resolve(rootDir, 'client/src/components/grades/ReportCardModal.tsx');
    const content = fs.readFileSync(filePath, 'utf8');

    // 1. Role determination
    assert(content.includes("const isAdminOrSuperAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';"),
      'ReportCardModal must determine isAdminOrSuperAdmin from AuthContext user.role');

    // 2. Application-level print handler guard
    assert(content.includes('if (!isAdminOrSuperAdmin) {'),
      'handlePrint must explicitly check !isAdminOrSuperAdmin');

    // 3. UI print button
    assert(content.includes('{isAdminOrSuperAdmin && (') && content.includes('<Printer className="w-4 h-4" /> አትም (Print / PDF)'),
      'Print button must be conditionally rendered ONLY for Admin and Super Admin');

    // 4. Role-aware print suppression
    assert(content.includes("isAdminOrSuperAdmin ? 'print:p-8' : 'print:hidden'"),
      'Report card document container must have print:hidden when !isAdminOrSuperAdmin');

    // 5. Official restriction notice in print media
    assert(content.includes('id="management-report-card-print-restriction-notice"'),
      'Must contain management-report-card-print-restriction-notice element');

    console.log('  ✅ 2. ReportCardModal: Role-aware print suppression and restriction notice verified');
    passed++;
  }

  // ---------------------------------------------------------------------------
  // TEST 3: Live API Verification - Management Read-Only vs Mutation Blocking
  // ---------------------------------------------------------------------------
  total++;
  {
    const API_URL = 'http://localhost:5000/api/v1';
    const password = process.env.STAGING_PASSWORD || 'Staging@Phase1!2026';

    // 1. Authenticate Management user
    const mgmtLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'stg_management_1', password }),
    });
    const mgmtLoginBody = (await mgmtLoginRes.json()) as any;
    assert.strictEqual(mgmtLoginRes.status, 200, 'Management login must succeed with HTTP 200');
    const mgmtToken = mgmtLoginBody.data.accessToken;
    assert(mgmtToken, 'Management must receive accessToken');

    // 2. Authenticate Admin user
    const adminLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'stg_admin_full', password }),
    });
    assert.strictEqual(adminLoginRes.status, 200, 'Admin login must succeed with HTTP 200');
    const adminLoginBody = (await adminLoginRes.json()) as any;
    const adminToken = adminLoginBody.data.accessToken;
    assert(adminToken, 'Admin must receive accessToken');

    // Target student: Staging Student One
    const studentId = 'b2c9d656-d6b1-4295-aa63-d95da5fbf7d8';

    // 3. Management CAN view official transcript (HTTP 200 OK)
    const mgmtViewRes = await fetch(`${API_URL}/transcripts/student/${studentId}`, {
      headers: { Authorization: `Bearer ${mgmtToken}` },
    });
    assert.strictEqual(mgmtViewRes.status, 200, 'Management must be permitted to view official transcript (HTTP 200)');
    const mgmtViewBody = (await mgmtViewRes.json()) as any;
    assert.strictEqual(mgmtViewBody.success, true, 'Management view response must be success: true');
    assert(mgmtViewBody.data.publication, 'Management view response must contain publication metadata');

    // 4. Management CAN view historical version (HTTP 200 OK)
    const mgmtV1Res = await fetch(`${API_URL}/transcripts/student/${studentId}/version/1`, {
      headers: { Authorization: `Bearer ${mgmtToken}` },
    });
    assert.strictEqual(mgmtV1Res.status, 200, 'Management must be permitted to view Version 1 (HTTP 200)');

    // 5. Management BLOCKED from preparing transcript draft (HTTP 403 Forbidden)
    const mgmtPrepRes = await fetch(`${API_URL}/transcripts/student/${studentId}/prepare`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${mgmtToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'Unauthorized management prepare attempt' }),
    });
    assert.strictEqual(mgmtPrepRes.status, 403, 'Management must be blocked from preparing drafts (HTTP 403)');

    // 6. Management BLOCKED from publishing transcript (HTTP 403 Forbidden)
    const mgmtPubRes = await fetch(`${API_URL}/transcripts/student/${studentId}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${mgmtToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'Unauthorized management publish attempt' }),
    });
    assert.strictEqual(mgmtPubRes.status, 403, 'Management must be blocked from publishing transcripts (HTTP 403)');

    // 7. Management BLOCKED from discarding draft (HTTP 403 Forbidden)
    const mgmtDiscRes = await fetch(`${API_URL}/transcripts/student/${studentId}/draft/discard`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${mgmtToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Unauthorized management discard attempt' }),
    });
    assert.strictEqual(mgmtDiscRes.status, 403, 'Management must be blocked from discarding drafts (HTTP 403)');

    console.log('  ✅ 3. Live API: Management read-only access (200) vs mutation blocking (403) verified');
    passed++;
  }

  // ---------------------------------------------------------------------------
  // TEST 4: Existing Transcript Versioning and Audit Integrity Intact
  // ---------------------------------------------------------------------------
  total++;
  {
    const API_URL = 'http://localhost:5000/api/v1';
    const password = process.env.STAGING_PASSWORD || 'Staging@Phase1!2026';
    const adminLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'stg_admin_full', password }),
    });
    const adminToken = ((await adminLoginRes.json()) as any).data.accessToken;
    const studentId = 'b2c9d656-d6b1-4295-aa63-d95da5fbf7d8';

    const historyRes = await fetch(`${API_URL}/transcripts/student/${studentId}/history`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(historyRes.status, 200, 'Publication history must be accessible (HTTP 200)');
    const historyBody = (await historyRes.json()) as any;
    assert(Array.isArray(historyBody.data), 'History data must be an array');
    assert(historyBody.data.length >= 2, 'History must contain multiple publication actions');

    const actions = historyBody.data.map((h: any) => h.action);
    assert(actions.includes('PUBLISH_OFFICIAL_TRANSCRIPT'), 'History must contain PUBLISH actions');

    console.log('  ✅ 4. Existing multi-version transcript history and audit trail verified intact');
    passed++;
  }

  console.log('\n================================================================================');
  console.log(`🎉 ALL ${passed}/${total} MANAGEMENT TRANSCRIPT PRINT REGRESSION SUITES PASSED!`);
  console.log('================================================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Regression suite failed:', err);
  process.exit(1);
});
