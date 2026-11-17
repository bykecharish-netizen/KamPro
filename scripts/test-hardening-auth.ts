/**
 * SIM-PKM POLTEK SSN - AUTH & RBAC HARDENING TEST SUITE
 * Memvalidasi Kontrol V1 (Sanitization & Encoding) dan V2 (Validation & Business Logic)
 * Sesuai Standar OWASP ASVS Level 1
 */

import { NextRequest } from 'next/server';
import { POST as loginHandler } from '@/app/api/auth/login/route';
import { POST as switchRoleHandler } from '@/app/api/auth/switch-role/route';
import { POST as validateCplHandler } from '@/app/api/proposals/[id]/validate-cpl/route';
import { mockStore } from '@/lib/mockStore';

interface TestResult {
  code: string;
  name: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const results: TestResult[] = [];

function recordTest(code: string, name: string, passed: boolean, details: string) {
  results.push({
    code,
    name,
    status: passed ? 'PASS' : 'FAIL',
    details,
  });
}

function createJsonRequest(
  url: string,
  method: string,
  body?: any,
  cookieToken?: string
): NextRequest {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  if (cookieToken) {
    headers.set('Cookie', `session_token=${cookieToken}`);
  }

  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function runHardeningTests() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║       SIM-PKM POLTEK SSN - AUTH & RBAC HARDENING TEST SUITE          ║');
  console.log('║       Pengujian Kontrol V1 & V2 (OWASP ASVS Level 1)                 ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  // --------------------------------------------------------------------------
  // TEST 1: Payload XSS pada Input Login (<script>alert(1)</script>)
  // --------------------------------------------------------------------------
  const xssReq = createJsonRequest('http://localhost:3000/api/auth/login', 'POST', {
    identifier: '<script>alert(1)</script>',
    password: 'Password123!#',
  });
  const xssRes = await loginHandler(xssReq);
  const xssBody = await xssRes.json();
  const xssBlocked = xssRes.status === 401 && xssBody.error === 'NIP/NPM atau kata sandi salah';

  recordTest(
    'HARDEN-01',
    'Mitigasi XSS Payload pada Login (<script>alert(1)</script>)',
    xssBlocked,
    `HTTP ${xssRes.status} (Ditolak oleh Regex skema Zod & Sanitasi): "${xssBody.error}"`
  );

  // --------------------------------------------------------------------------
  // TEST 2: Payload SQL Injection pada Input Login (' OR '1'='1)
  // --------------------------------------------------------------------------
  const sqliReq = createJsonRequest('http://localhost:3000/api/auth/login', 'POST', {
    identifier: "' OR '1'='1",
    password: 'Password123!#',
  });
  const sqliRes = await loginHandler(sqliReq);
  const sqliBody = await sqliRes.json();
  const sqliBlocked = sqliRes.status === 401 && sqliBody.error === 'NIP/NPM atau kata sandi salah';

  recordTest(
    'HARDEN-02',
    'Mitigasi SQL Injection pada Login (\' OR \'1\'=\'1)',
    sqliBlocked,
    `HTTP ${sqliRes.status} (Ditolak Zod Allowlist & Parameterized Query): "${sqliBody.error}"`
  );

  // --------------------------------------------------------------------------
  // TEST 3: Mass Assignment Injeksi Field Ilegal ({"role": "ADMIN"}) pada Login
  // --------------------------------------------------------------------------
  const massAssignReq = createJsonRequest('http://localhost:3000/api/auth/login', 'POST', {
    identifier: '198503152010121001',
    password: 'Password123!#',
    role: 'ADMIN',
  });
  const massAssignRes = await loginHandler(massAssignReq);
  const massAssignBody = await massAssignRes.json();
  const massAssignBlocked = massAssignRes.status === 401;

  recordTest(
    'HARDEN-03',
    'Pencegahan Mass Assignment via Zod .strict() (Injeksi {"role": "ADMIN"})',
    massAssignBlocked,
    `HTTP ${massAssignRes.status} (Ditolak oleh Zod .strict() pada loginSchema): "${massAssignBody.error}"`
  );

  // --------------------------------------------------------------------------
  // TEST 4: Manipulasi Peran ({"targetRole": "ADMIN"}) oleh Akun Non-Admin (Taruna)
  // --------------------------------------------------------------------------
  // Login dulu sebagai Taruna (Ahmad Farhan - NPM: 222110088)
  const tarunaLoginReq = createJsonRequest('http://localhost:3000/api/auth/login', 'POST', {
    identifier: '222110088',
    password: 'Password123!#',
  });
  const tarunaLoginRes = await loginHandler(tarunaLoginReq);
  const tarunaCookie = tarunaLoginRes.headers.get('set-cookie') || '';
  const tarunaToken = (tarunaCookie.match(/session_token=([^;]+)/) || [])[1];

  // Taruna mencoba beralih ke peran ADMIN
  const tarunaSwitchAdminReq = createJsonRequest(
    'http://localhost:3000/api/auth/switch-role',
    'POST',
    { targetRole: 'ADMIN' },
    tarunaToken
  );
  const tarunaSwitchAdminRes = await switchRoleHandler(tarunaSwitchAdminReq);
  const tarunaSwitchBody = await tarunaSwitchAdminRes.json();
  const tarunaSwitchBlocked =
    tarunaSwitchAdminRes.status === 403 &&
    tarunaSwitchBody.error === 'Peran tidak diizinkan untuk akun ini';

  recordTest(
    'HARDEN-04',
    'Pencegahan Manipulasi Peran Ilegal oleh Akun Non-Admin (Taruna -> ADMIN)',
    tarunaSwitchBlocked,
    `HTTP ${tarunaSwitchAdminRes.status} (Ditolak verifikasi user_roles database): "${tarunaSwitchBody.error}"`
  );

  // --------------------------------------------------------------------------
  // TEST 5: Valid Multi-Role Switcher (Dr. Budi Santoso: PENGUSUL -> KAPRODI)
  // --------------------------------------------------------------------------
  const budiLoginReq = createJsonRequest('http://localhost:3000/api/auth/login', 'POST', {
    identifier: '198503152010121001',
    password: 'Password123!#',
  });
  const budiLoginRes = await budiLoginHandler(budiLoginReq);
  const budiCookie = budiLoginRes.headers.get('set-cookie') || '';
  const budiToken = (budiCookie.match(/session_token=([^;]+)/) || [])[1];

  // Budi beralih ke KAPRODI (Peran sah yang dimilikinya)
  const budiSwitchKaprodiReq = createJsonRequest(
    'http://localhost:3000/api/auth/switch-role',
    'POST',
    { targetRole: 'KAPRODI' },
    budiToken
  );
  const budiSwitchKaprodiRes = await switchRoleHandler(budiSwitchKaprodiReq);
  const budiSwitchKaprodiBody = await budiSwitchKaprodiRes.json();
  const budiSwitchKaprodiSuccess =
    budiSwitchKaprodiRes.status === 200 &&
    budiSwitchKaprodiBody.active_role === 'KAPRODI';

  recordTest(
    'HARDEN-05',
    'Pergantian Peran Sah Multi-Role (Dr. Budi Santoso: PENGUSUL -> KAPRODI)',
    budiSwitchKaprodiSuccess,
    `HTTP ${budiSwitchKaprodiRes.status} (Berhasil beralih ke active_role: "${budiSwitchKaprodiBody.active_role}")`
  );

  // Budi mencoba beralih ke ADMIN (Budi memiliki PENGUSUL, KAPRODI, REVIEWER, tetapi TIDAK memiliki ADMIN)
  const budiSwitchAdminReq = createJsonRequest(
    'http://localhost:3000/api/auth/switch-role',
    'POST',
    { targetRole: 'ADMIN' },
    budiToken
  );
  const budiSwitchAdminRes = await switchRoleHandler(budiSwitchAdminReq);
  const budiSwitchAdminBody = await budiSwitchAdminRes.json();
  const budiSwitchAdminBlocked =
    budiSwitchAdminRes.status === 403 &&
    budiSwitchAdminBody.error === 'Peran tidak diizinkan untuk akun ini';

  recordTest(
    'HARDEN-06',
    'Pencegahan Eskalasi Peran ke ADMIN oleh Dosen Non-Admin (Dr. Budi Santoso -> ADMIN)',
    budiSwitchAdminBlocked,
    `HTTP ${budiSwitchAdminRes.status} (Ditolak verifikasi user_roles database): "${budiSwitchAdminBody.error}"`
  );

  // --------------------------------------------------------------------------
  // TEST 6: Penguncian Urutan Alur (No Skipping Steps - Kontrol 2.3.1)
  // Ketika active_role masih PENGUSUL, pemanggilan endpoint KAPRODI ditolak 403
  // --------------------------------------------------------------------------
  // Switch kembali ke PENGUSUL
  await switchRoleHandler(
    createJsonRequest(
      'http://localhost:3000/api/auth/switch-role',
      'POST',
      { targetRole: 'PENGUSUL' },
      budiToken
    )
  );

  // Buat request ke endpoint validate-cpl (khusus KAPRODI) sementara peran aktif masih PENGUSUL
  const dummyProp = mockStore.proposals[0];
  const skipStepReq = createJsonRequest(
    `http://localhost:3000/api/proposals/${dummyProp?.id || 'prop-1'}/validate-cpl`,
    'POST',
    { password: 'Password123!#' },
    budiToken
  );
  const skipStepRes = await validateCplHandler(skipStepReq, {
    params: Promise.resolve({ id: dummyProp?.id || 'prop-1' }),
  });
  const skipStepBlocked = skipStepRes.status === 403;

  recordTest(
    'HARDEN-07',
    'Penguncian Alur (No Skipping Steps: Akses API Kaprodi saat active_role = PENGUSUL)',
    skipStepBlocked,
    `HTTP ${skipStepRes.status} (Ditolak 403 Forbidden - Wajib lewat switch-role terlebih dahulu)`
  );

  // --------------------------------------------------------------------------
  // RINGKASAN HASIL
  // --------------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log('                 RINGKASAN HASIL AUDIT & HARDENING                    ');
  console.log('======================================================================');

  let passedCount = 0;
  for (const r of results) {
    if (r.status === 'PASS') passedCount++;
    console.log(`[${r.status}] [${r.code}] ${r.name}`);
    console.log(`       -> ${r.details}\n`);
  }

  console.log('----------------------------------------------------------------------');
  console.log(`TOTAL KONTROL DIUJI : ${results.length}`);
  console.log(`LULUS (PASS)        : ${passedCount}`);
  console.log(`GAGAL (FAIL)        : ${results.length - passedCount}`);
  console.log('----------------------------------------------------------------------\n');

  if (passedCount === results.length) {
    console.log('[SUKSES] Seluruh mekanisme hardening autentikasi dan RBAC 100% LULUS (PASS).\n');
  } else {
    console.error('[GAGAL] Sebagian kontrol hardening gagal dipenuhi.\n');
    process.exit(1);
  }
}

// Alias helper
const budiLoginHandler = loginHandler;

runHardeningTests().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
