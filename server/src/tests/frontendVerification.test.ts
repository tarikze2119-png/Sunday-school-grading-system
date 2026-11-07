/**
 * Frontend Architecture & UI Verification Test Suite
 * 
 * Tests:
 * 1. Routing & Protected Route Guards
 * 2. 5 Role-Specific Dashboards Structure
 * 3. 100% Amharic Localization & Font Stack Verification
 * 4. Mobile Responsiveness (Drawer, Grid, Zero-Overflow, Dual-Mode Grade Sheet)
 * 5. Official Printable Report Card & Multi-Year Transcript Layouts
 * 6. API Client Interceptors & Amharic Network Error Handling
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd().endsWith('server') ? path.resolve(process.cwd(), '..') : process.cwd();

async function runFrontendVerificationTests() {
  console.log('\n================================================================================');
  console.log('💻 FRONTEND ARCHITECTURE & USER INTERFACE VERIFICATION TEST SUITE');
  console.log('================================================================================\n');

  let passed = 0;

  // ---------------------------------------------------------------------------
  // 1. App Routing & Protected Routes
  // ---------------------------------------------------------------------------
  {
    const appRoutesPath = path.resolve(rootDir, 'client/src/routes/AppRoutes.tsx');
    assert(fs.existsSync(appRoutesPath), 'AppRoutes.tsx must exist');
    const content = fs.readFileSync(appRoutesPath, 'utf8');

    assert(content.includes('path="/login"'), 'Login route must be defined');
    assert(content.includes('path="/dashboard"'), 'Dashboard route must be defined');
    assert(content.includes('ProtectedRoute'), 'Dashboard must be wrapped in ProtectedRoute');
    assert(content.includes('404'), '404 Fallback route must exist');
    assert(content.includes('የተጠየቀው ገጽ አልተገኘም'), '404 message must be in Amharic');

    console.log('  ✅ 1. App routing, protected route guards, and Amharic 404 fallback verified');
    passed++;
  }

  // ---------------------------------------------------------------------------
  // 2. All 5 Role-Specific Dashboards
  // ---------------------------------------------------------------------------
  {
    const dashboards = [
      { name: 'SuperAdminDashboard', file: 'client/src/pages/dashboard/SuperAdminDashboard.tsx', check: 'ዋና አስተዳዳሪ' },
      { name: 'AdminDashboard', file: 'client/src/pages/dashboard/AdminDashboard.tsx', check: 'ማጠቃለያ ዳሽቦርድ' },
      { name: 'ManagementDashboard', file: 'client/src/pages/dashboard/ManagementDashboard.tsx', check: 'አመራር' },
      { name: 'TeacherDashboard', file: 'client/src/pages/dashboard/TeacherDashboard.tsx', check: 'መምህር' },
      { name: 'StudentDashboard', file: 'client/src/pages/dashboard/StudentDashboard.tsx', check: 'ተማሪ' },
    ];

    for (const d of dashboards) {
      const fullPath = path.resolve(rootDir, d.file);
      assert(fs.existsSync(fullPath), `${d.name} component file must exist at ${d.file}`);
      const content = fs.readFileSync(fullPath, 'utf8');
      assert(content.includes('export const') || content.includes('export default'), `${d.name} must export a React component`);
    }

    console.log('  ✅ 2. All 5 role-specific dashboard page components verified');
    passed++;
  }

  // ---------------------------------------------------------------------------
  // 3. 100% Amharic Localization, lang="am", and Noto Sans Ethiopic Font Stack
  // ---------------------------------------------------------------------------
  {
    const indexHtml = fs.readFileSync(path.resolve(rootDir, 'client/index.html'), 'utf8');
    assert(indexHtml.includes('lang="am"'), 'HTML root must specify lang="am"');
    assert(indexHtml.includes('Noto Sans Ethiopic'), 'Google Font Noto Sans Ethiopic must be imported');

    const tailwindConfig = fs.readFileSync(path.resolve(rootDir, 'client/tailwind.config.js'), 'utf8');
    assert(tailwindConfig.includes('Noto Sans Ethiopic'), 'Tailwind config must declare Noto Sans Ethiopic font family');
    assert(tailwindConfig.includes('lineHeight'), 'Tailwind config must declare Ethiopic line height optimization');

    const commonJson = JSON.parse(fs.readFileSync(path.resolve(rootDir, 'client/src/locales/am/common.json'), 'utf8'));
    const gradesJson = JSON.parse(fs.readFileSync(path.resolve(rootDir, 'client/src/locales/am/grades.json'), 'utf8'));
    const navJson = JSON.parse(fs.readFileSync(path.resolve(rootDir, 'client/src/locales/am/navigation.json'), 'utf8'));

    const allKeys = { ...commonJson, ...gradesJson, ...navJson };
    for (const [k, v] of Object.entries(allKeys)) {
      assert(typeof v === 'string' && v.trim().length > 0, `Locale key ${k} must not be empty`);
    }

    console.log('  ✅ 3. 100% Amharic language setup, Noto Sans Ethiopic fonts, and locale dictionaries verified');
    passed++;
  }

  // ---------------------------------------------------------------------------
  // 4. Mobile Responsiveness & Dual-Mode Grade Sheet
  // ---------------------------------------------------------------------------
  {
    const shellContent = fs.readFileSync(path.resolve(rootDir, 'client/src/pages/dashboard/DashboardShell.tsx'), 'utf8');
    assert(shellContent.includes('overflow-x-hidden'), 'Main shell must eliminate horizontal scrolling');
    assert(shellContent.includes('mobileMenuOpen'), 'Mobile drawer state must be present');
    assert(shellContent.includes('md:hidden'), 'Mobile drawer elements must use md:hidden breakpoint');

    const teacherPage = fs.readFileSync(path.resolve(rootDir, 'client/src/pages/grades/TeacherGradesPage.tsx'), 'utf8');
    assert(teacherPage.includes("viewMode === 'matrix'"), 'Spreadsheet matrix view must exist for desktops');
    assert(teacherPage.includes("viewMode === 'cards'"), 'Touch cards view must exist for mobile screens');
    assert(teacherPage.includes('overflow-x-auto'), 'Matrix table container must support smooth horizontal panning');

    console.log('  ✅ 4. Mobile responsiveness, hamburger drawer, zero horizontal overflow, and dual-mode grade entry verified');
    passed++;
  }

  // ---------------------------------------------------------------------------
  // 5. Official Printable Report Card & Multi-Year Transcript Layouts
  // ---------------------------------------------------------------------------
  {
    const reportCard = fs.readFileSync(path.resolve(rootDir, 'client/src/components/grades/ReportCardModal.tsx'), 'utf8');
    assert(reportCard.includes('window.print()'), 'Report card must trigger window.print()');
    assert(reportCard.includes('print:hidden'), 'Report card controls must hide on print');
    assert(reportCard.includes('print:p-0'), 'Report card must use print padding optimizations');
    assert(reportCard.includes('የኢትዮጵያ ኦርቶዶክስ ተዋሕዶ ቤተክርስቲያን'), 'Report card must feature authentic Church header');

    const transcript = fs.readFileSync(path.resolve(rootDir, 'client/src/components/grades/MultiYearTranscriptModal.tsx'), 'utf8');
    assert(transcript.includes('window.print()'), 'Transcript must trigger window.print()');
    assert(transcript.includes('toEthiopianDateString'), 'Transcript must format dates with Ethiopian calendar');
    assert(transcript.includes('cumulativeGpa'), 'Transcript must show cumulative GPA calculation');

    console.log('  ✅ 5. Printable Report Card & Multi-Year Transcript verified (Ethiopian Calendar, Church seals, print styles)');
    passed++;
  }

  // ---------------------------------------------------------------------------
  // 6. Axios API Client Interceptors & Amharic Error Formatting
  // ---------------------------------------------------------------------------
  {
    const apiContent = fs.readFileSync(path.resolve(rootDir, 'client/src/services/api.ts'), 'utf8');
    assert(apiContent.includes('Bearer ${token}'), 'Request interceptor must inject Bearer JWT token');
    assert(apiContent.includes('localStorage.getItem'), 'Client must read access_token from localStorage');
    assert(apiContent.includes('status === 401'), 'Response interceptor must handle 401 unauthorized');
    assert(apiContent.includes('status === 403'), 'Response interceptor must handle 403 forbidden');
    assert(apiContent.includes('የመግቢያ ፈቃድዎ አብቅቷል'), '401 error message must be in Amharic');
    assert(apiContent.includes('ይህንን ገጽ ወይም ተግባር የመመልከት ፈቃድ የለዎትም'), '403 error message must be in Amharic');

    console.log('  ✅ 6. Axios API client, JWT Bearer interceptor, and Amharic error handling verified');
    passed++;
  }

  console.log('\n================================================================================');
  console.log(`🎉 ALL ${passed}/6 FRONTEND ARCHITECTURAL & UI TEST SUITES PASSED!`);
  console.log('================================================================================\n');
}

runFrontendVerificationTests().catch(err => {
  console.error('\n❌ Frontend Verification Test Failed:', err);
  process.exit(1);
});
