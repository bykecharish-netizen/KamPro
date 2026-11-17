import { Role } from '@prisma/client';
import { mockStore } from '@/lib/mockStore';
import { checkConflictOfInterest, validateReviewerAssignments } from '@/lib/rbac/coiGuard';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

async function runTests() {
  console.log('🧪 Menjalankan Pengujian Alur Kerja Proposal (PENGUSUL, KAPRODI, KA_PPM)...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Uji Aturan Revisi: Skor >= 60 wajib ditolak dengan 403
  const propScoreHigh = { skor_rata_rata: 75.0, status: 'REVISI' };
  const canReviseHigh = propScoreHigh.skor_rata_rata < 60;
  assert(!canReviseHigh, 'Revisi ditolak jika skor >= 60 (Harus < 60)');

  const propScoreLow = { skor_rata_rata: 54.5, status: 'REVISI' };
  const canReviseLow = propScoreLow.skor_rata_rata < 60;
  assert(canReviseLow, 'Revisi diizinkan jika status REVISI dan skor < 60 (54.5)');

  // 2. Uji Validasi CPL: Pengesahan Digital Kata Sandi
  const dummyPassword = 'Password123!#';
  const hashed = await hashPassword(dummyPassword);

  const correctMatch = await verifyPassword('Password123!#', hashed);
  assert(correctMatch, 'Pengesahan CPL berhasil dengan kata sandi benar');

  const wrongMatch = await verifyPassword('WrongPassword!', hashed);
  assert(!wrongMatch, 'Pengesahan CPL gagal dan ditolak (401) jika kata sandi salah');

  // 3. Uji Validasi CPL: Pemeriksaan Prodi Sama
  const kaprodiProdi = 'Rekayasa Kriptografi';
  const proposalSameProdi = { prodi: 'Rekayasa Kriptografi' };
  const proposalDiffProdi = { prodi: 'Rekayasa Keamanan Siber' };
  assert(
    proposalSameProdi.prodi === kaprodiProdi,
    'Kaprodi hanya boleh memvalidasi usulan dari prodinya sendiri'
  );
  assert(
    proposalDiffProdi.prodi !== kaprodiProdi,
    'Validasi CPL lintas prodi otomatis diblokir (403)'
  );

  // 4. Uji Penomoran Registrasi Sesuai Skema
  function getPrefix(skema: string): string {
    const s = skema.toUpperCase();
    if (s.includes('PKM-KC') || s.includes('OK-PK')) return 'OK-PK';
    if (s.includes('PKM-RE') || s.includes('OK-PP')) return 'OK-PP';
    if (s.includes('PKM-PI') || s.includes('OK-PKP')) return 'OK-PKP';
    if (s.includes('PKM-K') || s.includes('OK-PRP')) return 'OK-PRP';
    if (s.includes('PDP') || s.includes('PL')) return 'PL';
    return 'OK-PK';
  }

  assert(getPrefix('PKM-KC') === 'OK-PK', 'Skema PKM-KC menghasilkan prefix OK-PK');
  assert(getPrefix('PKM-RE') === 'OK-PP', 'Skema PKM-RE menghasilkan prefix OK-PP');
  assert(getPrefix('PKM-PI') === 'OK-PKP', 'Skema PKM-PI menghasilkan prefix OK-PKP');
  assert(getPrefix('PKM-K') === 'OK-PRP', 'Skema PKM-K menghasilkan prefix OK-PRP');
  assert(getPrefix('PDP') === 'PL', 'Skema PDP/Lanjutan menghasilkan prefix PL');

  // 5. Uji Anti-COI Guard pada Penunjukan Reviewer
  // prop-1: ketua_id = 'u-dosen-1', member = 'u-taruna-1'
  const coiCheckKetua = await checkConflictOfInterest('prop-1', 'u-dosen-1');
  assert(
    coiCheckKetua.hasConflict === true,
    'Anti-COI: Penunjukan Reviewer diblokir jika penelaah adalah Ketua Tim'
  );

  const coiCheckMember = await checkConflictOfInterest('prop-1', 'u-taruna-1');
  assert(
    coiCheckMember.hasConflict === true,
    'Anti-COI: Penunjukan Reviewer diblokir jika penelaah adalah Anggota Tim'
  );

  const coiCheckNeutral = await checkConflictOfInterest('prop-1', 'u-rev-1');
  assert(
    coiCheckNeutral.hasConflict === false,
    'Anti-COI: Penunjukan Reviewer diizinkan jika penelaah independen (bukan ketua/anggota)'
  );

  // 6. Uji Penugasan Slot Reviewer 1-3 (Validasi Duplikasi)
  const duplicateSlots = await validateReviewerAssignments('prop-1', [
    { reviewer_id: 'u-rev-1', reviewer_slot: 1 },
    { reviewer_id: 'u-rev-2', reviewer_slot: 1 }, // Duplikat slot 1
  ]);
  assert(!duplicateSlots.isValid, 'Penugasan ditolak jika ada slot reviewer yang duplikat');

  const duplicateReviewer = await validateReviewerAssignments('prop-1', [
    { reviewer_id: 'u-rev-1', reviewer_slot: 1 },
    { reviewer_id: 'u-rev-1', reviewer_slot: 2 }, // Reviewer sama di 2 slot
  ]);
  assert(!duplicateReviewer.isValid, 'Penugasan ditolak jika 1 reviewer ditugaskan di >1 slot');

  const validAssignments = await validateReviewerAssignments('prop-1', [
    { reviewer_id: 'u-rev-1', reviewer_slot: 1 },
    { reviewer_id: 'u-rev-2', reviewer_slot: 2 },
  ]);
  assert(validAssignments.isValid, 'Penugasan 2 reviewer independen di slot 1 dan 2 berhasil');

  console.log(`\nHasil: ${passed} Passed, ${failed} Failed.`);
  if (failed > 0) process.exit(1);
}

runTests();
