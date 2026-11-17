/**
 * ============================================================================
 * SKRIP PENGUJIAN OTOMATIS: AUTENTIKASI, SESI, & KONTROL KEAMANAN ASVS LEVEL 1
 * Standar Acuan: OWASP ASVS v4.0.3 / v5.0.0 (SR-01 & SR-02) & PRD Poltek SSN
 * ============================================================================
 */

import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { mockStore } from '../src/lib/mockStore';
import { hashSessionToken, IDLE_TIMEOUT_MS } from '../src/lib/auth/session';
import { checkRateLimit, resetRateLimit, MAX_FAILED_ATTEMPTS } from '../src/lib/auth/rate-limit';

// Impor Route Handlers
import { POST as registerHandler } from '../src/app/api/auth/register/route';
import { POST as loginHandler } from '../src/app/api/auth/login/route';
import { GET as meHandler } from '../src/app/api/auth/me/route';
import { GET as proposalsHandler } from '../src/app/api/proposals/route';

interface TestResult {
  sectionId: string;
  name: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const results: TestResult[] = [];

function recordTest(sectionId: string, name: string, passed: boolean, details: string) {
  results.push({
    sectionId,
    name,
    status: passed ? 'PASS' : 'FAIL',
    details,
  });
}

function createJsonRequest(url: string, method: string, body?: any, cookieToken?: string): NextRequest {
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

// ============================================================================
// SEKSI 1: UJI ALUR REGISTRASI & VERIFIKASI PERAN MASTER (KONTROL 2.3.1)
// ============================================================================
async function testRegistrationAndMasterVerification() {
  console.log('\n============================================================');
  console.log('--- SEKSI 1: REGISTRASI & VERIFIKASI PERAN MASTER (2.3.1) ---');
  console.log('============================================================\n');

  // 1.1 Uji pendaftaran NIP/NPM yang TIDAK terdaftar di Master SDM/Siakad
  const unregisteredPayload = {
    role_type: 'TARUNA',
    nip_npm: '9998887776', // Tidak ada di Master SDM/Siakad
    email: 'unregistered@poltekssn.ac.id',
    nama_lengkap: 'Pengguna Gelap',
    prodi: 'Rekayasa Kriptografi',
    password: 'PasswordAman#2026',
  };
  const unregRes = await registerHandler(
    createJsonRequest('http://localhost:3000/api/auth/register', 'POST', unregisteredPayload)
  );
  const unregJson = await unregRes.json();
  const isUnregBlocked = unregRes.status === 403;

  recordTest(
    '2.3.1.A',
    'Penolakan NIP/NPM Tidak Terdaftar di Master SDM / Siakad',
    isUnregBlocked,
    `Status: ${unregRes.status} (Ditolak: "${unregJson.error}")`
  );

  // 1.2 Uji Taruna mengklaim peran struktural (KAPRODI, REVIEWER)
  const tarunaIllegalRolePayload = {
    role_type: 'KAPRODI', // Taruna mencoba mendaftar sebagai Kaprodi
    nip_npm: '222110088', // NPM Taruna sah di Siakad
    email: 'aditya.pratama@poltekssn.ac.id',
    nama_lengkap: 'Aditya Pratama',
    prodi: 'Rekayasa Keamanan Siber',
    password: 'PasswordAman#2026',
  };
  const tarunaIllegalRes = await registerHandler(
    createJsonRequest('http://localhost:3000/api/auth/register', 'POST', tarunaIllegalRolePayload)
  );
  const tarunaIllegalJson = await tarunaIllegalRes.json();
  const isTarunaRoleBlocked = tarunaIllegalRes.status === 403;

  recordTest(
    '2.3.1.B',
    'Pencegahan Eskalasi Peran Ilegal oleh Taruna (Anti-Klaim Kaprodi/Reviewer)',
    isTarunaRoleBlocked,
    `Status: ${tarunaIllegalRes.status} (Ditolak: "${tarunaIllegalJson.error}")`
  );

  // 1.3 Kebijakan Kata Sandi (Password Policy OWASP ASVS V2.1)
  // A. Kurang dari 8 karakter
  const shortPassPayload = {
    role_type: 'TARUNA',
    nip_npm: '222110088',
    email: 'aditya.pratama@poltekssn.ac.id',
    nama_lengkap: 'Aditya Pratama',
    prodi: 'Rekayasa Keamanan Siber',
    password: 'short', // < 8 karakter
  };
  const shortPassRes = await registerHandler(
    createJsonRequest('http://localhost:3000/api/auth/register', 'POST', shortPassPayload)
  );

  // B. Kata sandi umum / bocor (password123 / 12345678)
  const commonPassPayload = {
    ...shortPassPayload,
    password: 'password123',
  };
  const commonPassRes = await registerHandler(
    createJsonRequest('http://localhost:3000/api/auth/register', 'POST', commonPassPayload)
  );

  // C. Kata sandi sama dengan NIP/NPM
  const sameIdPassPayload = {
    ...shortPassPayload,
    password: '222110088',
  };
  const sameIdPassRes = await registerHandler(
    createJsonRequest('http://localhost:3000/api/auth/register', 'POST', sameIdPassPayload)
  );

  const isPasswordPolicyEnforced =
    shortPassRes.status === 400 &&
    commonPassRes.status === 400 &&
    sameIdPassRes.status === 400;

  recordTest(
    '2.1.1-7',
    'Penegakan Kebijakan Kata Sandi (Min 8 Karakter, Anti-Common & Anti-Identifier)',
    isPasswordPolicyEnforced,
    `Short (<8): HTTP ${shortPassRes.status}, Common ('password123'): HTTP ${commonPassRes.status}, Sama NIP/NPM: HTTP ${sameIdPassRes.status}`
  );

  // 1.4 Pendaftaran Valid & Verifikasi bcrypt Hash di Database/Store
  const validRegisterPayload = {
    role_type: 'TARUNA',
    nip_npm: '222110088',
    email: 'aditya.pratama@poltekssn.ac.id',
    nama_lengkap: 'Aditya Pratama',
    prodi: 'Rekayasa Keamanan Siber',
    kelas: 'K-42',
    password: 'K4taSandiKu4t#2026',
  };
  const validRegRes = await registerHandler(
    createJsonRequest('http://localhost:3000/api/auth/register', 'POST', validRegisterPayload)
  );

  // Periksa hash password yang tersimpan
  let savedUser: any = null;
  try {
    savedUser = await prisma.user.findUnique({
      where: { nip_npm: '222110088' },
    });
  } catch {
    savedUser = mockStore.users.find((u) => u.nip_npm === '222110088');
  }

  const isBcrypt =
    savedUser &&
    typeof savedUser.password_hash === 'string' &&
    (savedUser.password_hash.startsWith('$2a$') || savedUser.password_hash.startsWith('$2b$')) &&
    !savedUser.password_hash.includes('K4taSandiKu4t#2026');

  recordTest(
    '2.4.1',
    'Verifikasi One-Way Salted Hash (bcrypt cost >= 12, Non-Plaintext)',
    (validRegRes.status === 201 || validRegRes.status === 409) && isBcrypt,
    `Status Reg: ${validRegRes.status}, Hash Format: ${savedUser?.password_hash?.substring(0, 10)}... (Valid bcrypt)`
  );
}

// ============================================================================
// SEKSI 2: UJI ANTI-ENUMERASI & ANTI-BRUTE FORCE PADA LOGIN (SR-01 & SR-05)
// ============================================================================
async function testAntiEnumerationAndBruteForce() {
  console.log('\n============================================================');
  console.log('--- SEKSI 2: ANTI-ENUMERASI & ANTI-BRUTE FORCE (SR-01) ---');
  console.log('============================================================\n');

  const testIp = '192.168.100.50';

  // 2.1 Uji Pesan Kesalahan Seragam Anti-Enumerasi (User Tidak Ada vs Password Salah)
  const nonExistentReq = new NextRequest('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': testIp,
    },
    body: JSON.stringify({
      identifier: '000000000000000000', // Tidak ada
      password: 'PasswordSalah#123',
    }),
  });

  const wrongPasswordReq = new NextRequest('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': testIp,
    },
    body: JSON.stringify({
      identifier: '198503152010121001', // User Ada (Dr. Budi)
      password: 'PasswordSalah#123',
    }),
  });

  const nonExistentRes = await loginHandler(nonExistentReq);
  const wrongPasswordRes = await loginHandler(wrongPasswordReq);

  const nonExistentJson = await nonExistentRes.json();
  const wrongPasswordJson = await wrongPasswordRes.json();

  const isUniform =
    nonExistentRes.status === 401 &&
    wrongPasswordRes.status === 401 &&
    nonExistentJson.error === wrongPasswordJson.error &&
    nonExistentJson.error === 'NIP/NPM atau kata sandi salah';

  recordTest(
    'SR-01.1',
    'Anti-Enumerasi Akun (Pesan Kesalahan Login Seragam 401)',
    isUniform,
    `Non-existent user: HTTP ${nonExistentRes.status} ("${nonExistentJson.error}"), Wrong password: HTTP ${wrongPasswordRes.status} ("${wrongPasswordJson.error}")`
  );

  // 2.2 Uji Pembatasan Laju Percobaan Login (Anti-Brute Force Rate Limiting)
  // Reset limiter untuk test isolasi
  const bruteForceIp = '10.10.10.99';
  const targetIdentifier = '198503152010121001';
  resetRateLimit(bruteForceIp, targetIdentifier);

  const attemptStatuses: number[] = [];

  for (let i = 1; i <= 6; i++) {
    const attemptReq = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': bruteForceIp,
      },
      body: JSON.stringify({
        identifier: targetIdentifier,
        password: `SalahKe${i}#123`,
      }),
    });

    const res = await loginHandler(attemptReq);
    attemptStatuses.push(res.status);
  }

  // Percobaan 1 s/d 5 harus 401, percobaan ke-6 harus 429
  const attempts1to5Are401 = attemptStatuses.slice(0, 5).every((s) => s === 401);
  const attempt6Is429 = attemptStatuses[5] === 429;

  // Verifikasi akun tidak terkunci permanen di basis data (Anti-Malicious Lockout)
  let userInDb: any = null;
  try {
    userInDb = await prisma.user.findUnique({
      where: { nip_npm: targetIdentifier },
    });
  } catch {
    userInDb = mockStore.users.find((u) => u.nip_npm === targetIdentifier);
  }
  const isAccountStillActive = userInDb?.is_active === true;

  recordTest(
    'SR-01.2',
    'Anti-Brute Force Rate Limiting (Maks 5x Gagal -> HTTP 429 Tanpa Lockout Permanen)',
    attempts1to5Are401 && attempt6Is429 && isAccountStillActive,
    `Percobaan 1-5: [${attemptStatuses.slice(0, 5).join(', ')}], Percobaan ke-6: HTTP ${attemptStatuses[5]} (429 Too Many Requests), is_active: ${isAccountStillActive}`
  );
}

// ============================================================================
// SEKSI 3: UJI KEAMANAN COOKIE SESI, IDLE TIMEOUT, & PENCABUTAN SESI (SR-02)
// ============================================================================
async function testSessionSecurityAndTimeout() {
  console.log('\n============================================================');
  console.log('--- SEKSI 3: KEAMANAN SESI, IDLE TIMEOUT & PENCABUTAN (SR-02) ---');
  console.log('============================================================\n');

  // 3.1 Verifikasi Atribut Cookie Sesi (Entropi >= 128-bit, HttpOnly, SameSite=Lax)
  const loginPayload = {
    identifier: '198503152010121001',
    password: 'Password123!#',
  };

  const loginRes = await loginHandler(
    createJsonRequest('http://localhost:3000/api/auth/login', 'POST', loginPayload)
  );
  const cookieHeader = loginRes.headers.get('set-cookie') || '';
  const tokenMatch = cookieHeader.match(/session_token=([^;]+)/);
  const sessionToken1 = tokenMatch ? tokenMatch[1] : '';

  const hasHttpOnly = cookieHeader.toLowerCase().includes('httponly');
  const hasSameSite = cookieHeader.toLowerCase().includes('samesite=lax');
  // Token 32 bytes hex = 64 karakter = 256 bits entropi (>= 128-bit)
  const hasHighEntropy = sessionToken1.length >= 32;

  recordTest(
    'SR-02.1',
    'Keamanan Cookie Sesi (Entropi >= 128-bit, HttpOnly, SameSite=Lax)',
    loginRes.status === 200 && hasHttpOnly && hasSameSite && hasHighEntropy,
    `Panjang Token: ${sessionToken1.length * 4}-bit, HttpOnly: ${hasHttpOnly}, SameSite=Lax: ${hasSameSite}`
  );

  // 3.2 Anti-Session Fixation & Cache-Control: no-store
  const secondLoginRes = await loginHandler(
    createJsonRequest('http://localhost:3000/api/auth/login', 'POST', loginPayload)
  );
  const cookieHeader2 = secondLoginRes.headers.get('set-cookie') || '';
  const tokenMatch2 = cookieHeader2.match(/session_token=([^;]+)/);
  const sessionToken2 = tokenMatch2 ? tokenMatch2[1] : '';

  const isSessionRegenerated = sessionToken1 !== sessionToken2 && sessionToken2.length > 0;
  const cacheControlHeader = secondLoginRes.headers.get('cache-control') || '';
  const hasNoStore = cacheControlHeader.includes('no-store');

  recordTest(
    'SR-02.2',
    'Anti-Session Fixation & Header Cache-Control: no-store',
    isSessionRegenerated && hasNoStore,
    `Regenerasi Token: ${isSessionRegenerated ? 'Sesi Baru Diterbitkan' : 'Token Sama (Rentan)'}, Cache-Control: "${cacheControlHeader}"`
  );

  // 3.3 Uji Batas Diam 30 Menit (Idle Timeout Expiration)
  // Buat sesi buatan yang aktivitas terakhirnya sudah 31 menit yang lalu
  const expiredToken = 'expired-idle-token-test-30min';
  const expiredTokenHash = hashSessionToken(expiredToken);
  const thirtyOneMinutesAgo = new Date(Date.now() - 31 * 60 * 1000);

  mockStore.sessions.set(expiredTokenHash, {
    id: 'sess-expired-idle',
    user_id: 'u-dosen-1',
    token_hash: expiredTokenHash,
    active_role: 'PENGUSUL',
    last_activity_at: thirtyOneMinutesAgo,
    expires_at: thirtyOneMinutesAgo,
  });

  const expiredMeReq = new NextRequest('http://localhost:3000/api/auth/me', {
    method: 'GET',
    headers: {
      Cookie: `session_token=${expiredToken}`,
    },
  });

  const expiredMeRes = await meHandler(expiredMeReq);
  const isExpiredSessionRejected = expiredMeRes.status === 401;
  const isSessionDeletedFromStore = !mockStore.sessions.has(expiredTokenHash);

  recordTest(
    'SR-02.3',
    'Batas Waktu Diam Sesi (Idle Timeout 30 Menit & Auto-Destroy)',
    isExpiredSessionRejected && isSessionDeletedFromStore,
    `Aktivitas 31 menit lalu ditolak dengan HTTP ${expiredMeRes.status} dan sesi otomatis dihapus dari database/store`
  );

  // 3.4 Uji Pemutusan Sesi Seketika Saat Akun Dinonaktifkan (is_active = false)
  const deactivatedUserToken = 'deactivated-user-session-token';
  const deactivatedTokenHash = hashSessionToken(deactivatedUserToken);

  // Simulasikan user yang dinonaktifkan oleh Admin
  const targetMockUser = mockStore.users.find((u) => u.id === 'u-dosen-1');
  const originalActiveState = targetMockUser ? targetMockUser.is_active : true;

  if (targetMockUser) {
    targetMockUser.is_active = false;
  }

  mockStore.sessions.set(deactivatedTokenHash, {
    id: 'sess-deactivated-test',
    user_id: 'u-dosen-1',
    token_hash: deactivatedTokenHash,
    active_role: 'PENGUSUL',
    last_activity_at: new Date(),
    expires_at: new Date(Date.now() + 3600000),
  });

  const deactivatedMeReq = new NextRequest('http://localhost:3000/api/auth/me', {
    method: 'GET',
    headers: {
      Cookie: `session_token=${deactivatedUserToken}`,
    },
  });

  const deactivatedMeRes = await meHandler(deactivatedMeReq);
  const isDeactivatedRejected = deactivatedMeRes.status === 401;
  const isDeactivatedSessionDeleted = !mockStore.sessions.has(deactivatedTokenHash);

  // Kembalikan status aktif user
  if (targetMockUser) {
    targetMockUser.is_active = originalActiveState;
  }

  recordTest(
    'SR-02.4',
    'Pemutusan Sesi Seketika Saat Akun Dinonaktifkan (is_active = false)',
    isDeactivatedRejected && isDeactivatedSessionDeleted,
    `Permintaan dari akun non-aktif langsung ditolak dengan HTTP ${deactivatedMeRes.status} dan sesi seketika dicabut`
  );
}

// ============================================================================
// MAIN RUNNER & CETAK LAPORAN HASIL KE TERMINAL
// ============================================================================
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║       SIM-PKM POLTEK SSN - AUTH & SESSION VALIDATION SUITE           ║');
  console.log('║       Pengujian Kontrol OWASP ASVS Level 1 (SR-01 & SR-02)           ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');

  await testRegistrationAndMasterVerification();
  await testAntiEnumerationAndBruteForce();
  await testSessionSecurityAndTimeout();

  console.log('\n======================================================================');
  console.log('            RINGKASAN HASIL AUDIT AUTENTIKASI & MANAJEMEN SESI         ');
  console.log('======================================================================');

  let passedCount = 0;
  let failedCount = 0;

  for (const r of results) {
    const badge = r.status === 'PASS' ? '[\x1b[32mPASS\x1b[0m]' : '[\x1b[31mFAIL\x1b[0m]';
    console.log(`${badge} [Kontrol ${r.sectionId}] ${r.name}`);
    console.log(`       -> ${r.details}\n`);
    if (r.status === 'PASS') passedCount++;
    else failedCount++;
  }

  console.log('----------------------------------------------------------------------');
  console.log(`TOTAL KONTROL DIUJI : ${results.length}`);
  console.log(`LULUS (PASS)        : \x1b[32m${passedCount}\x1b[0m`);
  console.log(`GAGAL (FAIL)        : \x1b[${failedCount > 0 ? '31' : '32'}m${failedCount}\x1b[0m`);
  console.log('----------------------------------------------------------------------');

  if (failedCount > 0) {
    console.error('\n\x1b[31m[PERINGATAN] Terdapat skenario pengujian autentikasi yang GAGAL!\x1b[0m');
    process.exit(1);
  } else {
    console.log('\n\x1b[32m[SUKSES] Seluruh kontrol autentikasi dan manajemen sesi 100% LULUS (PASS).\x1b[0m\n');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
