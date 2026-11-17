import { Role } from '@prisma/client';
import { getProposalScopeFilter } from '@/lib/rbac/scopeFilter';
import {
  sanitizeProposalDto,
  createProposalSchema,
  submitReviewSchema,
  directorBypassSchema,
  userSelfUpdateSchema,
} from '@/lib/rbac/dto';
import type { SessionWithUser } from '@/lib/auth/session';

async function runRbacTests() {
  console.log('🛡️ Memulai Pengujian Lapisan RBAC & Trusted Service Layer...\n');

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

  // Mock session factory
  function createMockSession(role: Role, userId = 'user-1', prodi = 'Rekayasa Kriptografi'): SessionWithUser {
    return {
      id: 'session-123',
      user_id: userId,
      token_hash: 'hash-123',
      active_role: role,
      last_activity_at: new Date(),
      expires_at: new Date(Date.now() + 30 * 60 * 1000),
      user: {
        id: userId,
        nip_npm: '198503152010121001',
        email: 'budi@poltekssn.ac.id',
        password_hash: 'hash',
        nama_lengkap: 'Dr. Budi Santoso',
        gelar: 'S.ST., M.Kom., Ph.D.',
        prodi: prodi,
        kelompok_keilmuan: 'Kriptografi Terapan',
        kelas: null,
        no_hp: '081234567890',
        is_active: true,
        created_at: new Date(),
        roles: [{ id: 'role-1', user_id: userId, role }],
      },
    };
  }

  // --- 1. Scope Filter Tests (Anti-IDOR / BOLA) ---
  console.log('--- 1. Pengujian Scope Filter (Anti-IDOR) ---');
  const pengusulSession = createMockSession(Role.PENGUSUL, 'usr-pengusul');
  const pengusulFilter = getProposalScopeFilter(pengusulSession) as any;
  assert(
    Array.isArray(pengusulFilter.OR) &&
    pengusulFilter.OR[0]?.ketua_id === 'usr-pengusul' &&
    pengusulFilter.OR[1]?.members?.some?.user_id === 'usr-pengusul',
    'Scope filter PENGUSUL hanya mencakup ketua_id miliknya atau anggota tim'
  );

  const kaprodiSession = createMockSession(Role.KAPRODI, 'usr-kaprodi', 'Rekayasa Keamanan Siber');
  const kaprodiFilter = getProposalScopeFilter(kaprodiSession) as any;
  assert(
    kaprodiFilter.prodi === 'Rekayasa Keamanan Siber',
    'Scope filter KAPRODI hanya mencakup proposal dari prodi yang sama'
  );

  const reviewerSession = createMockSession(Role.REVIEWER, 'usr-reviewer-1');
  const reviewerFilter = getProposalScopeFilter(reviewerSession) as any;
  assert(
    reviewerFilter.reviews?.some?.reviewer_id === 'usr-reviewer-1',
    'Scope filter REVIEWER hanya mencakup proposal yang ditugaskan di proposal_reviews'
  );

  const adminSession = createMockSession(Role.ADMIN, 'usr-admin');
  const adminFilter = getProposalScopeFilter(adminSession);
  assert(
    Object.keys(adminFilter).length === 0,
    'Scope filter ADMIN/KA_PPM/DIREKTUR memiliki akses lintas prodi ({})'
  );

  // --- 2. DTO Blind Review Tests (Tahap PROPOSAL) ---
  console.log('\n--- 2. Pengujian Blind Review & BOPLA Protection ---');
  const mockProposalProposalStage = {
    id: 'prop-001',
    no_agenda: 'AG-2026-001',
    no_registrasi: 'PL-2026-RK-001',
    judul: 'Penelitian Kriptografi Pascakuantum',
    skema: 'PDP',
    tahap: 'PROPOSAL',
    status: 'PENILAIAN_REVIEWER',
    prodi: 'Rekayasa Kriptografi',
    file_url: 'https://storage/original-with-metadata.pdf',
    sanitized_file_url: 'https://storage/clean-sanitized.pdf',
    skor_rata_rata: null,
    is_bypass: false,
    alasan_bypass: null,
    created_at: new Date(),
    ketua: {
      id: 'usr-budi',
      nama_lengkap: 'Dr. Budi Santoso',
      nip_npm: '198503152010121001',
      email: 'budi@poltekssn.ac.id',
      gelar: 'Ph.D.',
    },
    members: [
      {
        id: 'mem-1',
        user_id: 'usr-taruna',
        peran_tim: 'Anggota Taruna',
        user: { nama_lengkap: 'Reza Firmansyah', nip_npm: '222110045' },
      },
    ],
    reviews: [
      {
        id: 'rev-1',
        reviewer_id: 'usr-reviewer-1',
        reviewer_slot: 1,
        skor: 85,
        catatan: 'Catatan Reviewer 1 yang rahasia',
        is_locked: true,
      },
      {
        id: 'rev-2',
        reviewer_id: 'usr-reviewer-2',
        reviewer_slot: 2,
        skor: 70,
        catatan: 'Catatan Reviewer 2 yang rahasia',
        is_locked: false,
      },
    ],
  };

  // Reviewer 1 mengakses tahap PROPOSAL
  const dtoForReviewer1 = sanitizeProposalDto(mockProposalProposalStage, Role.REVIEWER, 'usr-reviewer-1');
  assert(
    dtoForReviewer1.ketua?.nama_lengkap === '[PENELAAHAN ANONIM]',
    'Blind Review: Nama ketua harus disamarkan menjadi [PENELAAHAN ANONIM]'
  );
  assert(
    dtoForReviewer1.ketua?.nip_npm === undefined && dtoForReviewer1.ketua?.email === undefined,
    'Blind Review: NIP/NPM dan email ketua harus dihapus dari respons'
  );
  assert(
    Array.isArray(dtoForReviewer1.members) && dtoForReviewer1.members.length === 0,
    'Blind Review: Anggota tim harus dikosongkan ([]) pada tahap PROPOSAL'
  );
  assert(
    dtoForReviewer1.file_url === 'https://storage/clean-sanitized.pdf',
    'Blind Review: file_url asli digantikan oleh sanitized_file_url (bebas metadata)'
  );

  // Reviewer 1 hanya boleh melihat ulasan miliknya sendiri
  assert(
    dtoForReviewer1.reviews?.length === 1 && dtoForReviewer1.reviews[0]?.reviewer_slot === 1,
    'Isolasi Skor: Reviewer 1 HANYA dapat melihat ulasan slot 1 miliknya'
  );
  assert(
    !dtoForReviewer1.reviews?.some((r) => r.catatan === 'Catatan Reviewer 2 yang rahasia'),
    'Isolasi Skor: Catatan dan skor Reviewer 2 tidak bocor ke Reviewer 1'
  );

  // --- 3. DTO Tahap LAPORAN (Identitas Dibuka) ---
  console.log('\n--- 3. Pengujian DTO Tahap LAPORAN ---');
  const mockProposalReportStage = {
    ...mockProposalProposalStage,
    tahap: 'LAPORAN',
    status: 'DISETUJUI',
    skor_rata_rata: 85.0,
  };

  const dtoForReviewerInReport = sanitizeProposalDto(mockProposalReportStage, Role.REVIEWER, 'usr-reviewer-1');
  assert(
    dtoForReviewerInReport.ketua?.nama_lengkap === 'Dr. Budi Santoso',
    'Tahap LAPORAN: Identitas pengusul dibuka kembali sesuai Perdir Poltek SSN'
  );
  assert(
    dtoForReviewerInReport.members?.length === 1,
    'Tahap LAPORAN: Anggota tim ditampilkan secara transparan'
  );

  // --- 4. Zod Input Allowlist Tests (Anti-Mass Assignment) ---
  console.log('\n--- 4. Pengujian Anti-Mass Assignment (Zod Allowlist) ---');

  // Payload legal
  const legalProposalInput = {
    judul: 'Pengembangan Algoritma Enkripsi Baru',
    skema: 'Penelitian Dosen Pemula',
    prodi: 'Rekayasa Kriptografi',
    file_url: 'https://storage/dokumen.pdf',
  };
  const parsedLegal = createProposalSchema.safeParse(legalProposalInput);
  assert(parsedLegal.success, 'Payload pengajuan legal berhasil divalidasi');

  // Payload dengan injeksi kolom sistem
  const maliciousProposalInput = {
    ...legalProposalInput,
    status: 'DISETUJUI', // Upaya bypass approval
    is_bypass: true,     // Upaya bypass direktur
    skor_rata_rata: 99.9, // Upaya manipulasi nilai
    no_registrasi: 'OK-PP-999',
  };
  const parsedMalicious = createProposalSchema.safeParse(maliciousProposalInput);
  assert(
    !parsedMalicious.success,
    'Anti-Mass Assignment: Percobaan menyuntikkan status, is_bypass, skor_rata_rata DITOLAK oleh Zod .strict()'
  );

  // Validasi Bypass Direktur: wajib alasan minimal 10 karakter
  const validBypass = directorBypassSchema.safeParse({
    alasan_bypass: 'Penugasan khusus dari BSSN untuk kebutuhan pertahanan siber strategis nasional.',
  });
  assert(validBypass.success, 'Alasan bypass Direktur yang komprehensif diterima');

  const shortBypass = directorBypassSchema.safeParse({
    alasan_bypass: 'perintah', // < 10 karakter
  });
  assert(!shortBypass.success, 'Alasan bypass Direktur < 10 karakter ditolak');

  // Validasi Update Mandiri User: hanya no_hp yang diizinkan
  const validUserUpdate = userSelfUpdateSchema.safeParse({ no_hp: '081234567890' });
  assert(validUserUpdate.success, 'Pembaruan mandiri no_hp format benar diterima');

  const maliciousUserUpdate = userSelfUpdateSchema.safeParse({
    no_hp: '081234567890',
    nama_lengkap: 'Hacker Name',
    nip_npm: '000000000',
    role: 'ADMIN',
  });
  assert(!maliciousUserUpdate.success, 'Pembaruan mandiri dengan kolom nama/nip/role DITOLAK oleh .strict()');

  console.log(`\n========================================`);
  console.log(`Hasil Pengujian: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runRbacTests().catch(console.error);
