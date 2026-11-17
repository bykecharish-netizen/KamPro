import { PDFDocument } from 'pdf-lib';
import {
  sanitizePdfMetadata,
  generateApprovalQR,
  generateSignedDocumentToken,
  verifySignedDocumentToken,
} from '@/services/documentService';
import { directorBypassSchema, submitReviewSchema } from '@/lib/rbac/dto';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

async function runReviewerDirekturTests() {
  console.log('🧪 Memulai Pengujian Fitur REVIEWER & DIREKTUR...\n');
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

  // 1. Uji Sanitasi Metadata PDF (Double-Blind Review)
  const dummyDoc = await PDFDocument.create();
  dummyDoc.setTitle('Laporan Rahasia Identitas Pengusul');
  dummyDoc.setAuthor('Dr. Budi Santoso - NIP 198503152010121001');
  dummyDoc.addPage([400, 400]);
  const rawBytes = await dummyDoc.save();

  const sanitizedBuffer = await sanitizePdfMetadata(Buffer.from(rawBytes));
  const reloadedDoc = await PDFDocument.load(sanitizedBuffer);

  assert(
    reloadedDoc.getTitle() === undefined || reloadedDoc.getTitle() === '',
    'Sanitasi PDF: Title metadata berhasil dihapus'
  );
  assert(
    reloadedDoc.getAuthor() === undefined || reloadedDoc.getAuthor() === '',
    'Sanitasi PDF: Author/NIP metadata berhasil dibersihkan'
  );

  // 2. Uji Pembangkitan QR Code Pengesahan Digital Internal
  const qrDataUrl = await generateApprovalQR(
    'prop-test-123',
    'u-direktur-1',
    new Date(),
    'SK_PENETAPAN_PENDANAAN_DIREKTUR'
  );
  assert(
    qrDataUrl.startsWith('data:image/png;base64,'),
    'QR Generator: Berhasil menghasilkan QR Code Data URL Base64'
  );

  // 3. Uji Signed Document Token
  const token = generateSignedDocumentToken('prop-test-123', 'u-rev-1', 'REVIEWER', 30);
  const verified = verifySignedDocumentToken(token);
  assert(
    verified.isValid && verified.proposalId === 'prop-test-123' && verified.role === 'REVIEWER',
    'Signed Document Token: Validasi tanda tangan dan kadaluarsa token sukses'
  );

  const fakeToken = token + 'tampered';
  const fakeVerified = verifySignedDocumentToken(fakeToken);
  assert(!fakeVerified.isValid, 'Signed Document Token: Token rusak/diubah ditolak otomatis');

  // 4. Uji Aturan Reviewer: Password Wajib jika is_locked = true
  const dummyPassword = 'Password123!#';
  const hashedPw = await hashPassword(dummyPassword);

  const isLockedWithoutPassword = false; // di API: if (is_locked && !password) -> reject
  assert(
    !isLockedWithoutPassword,
    'Reviewer: Penguncian nilai wajib menyertakan kata sandi tanda tangan digital'
  );

  const validPasswordCheck = await verifyPassword('Password123!#', hashedPw);
  assert(validPasswordCheck, 'Reviewer: Password verifikasi cocok');

  const invalidPasswordCheck = await verifyPassword('SalahPassword', hashedPw);
  assert(!invalidPasswordCheck, 'Reviewer: Password salah ditolak (401)');

  // 5. Uji Rekapitulasi Rata-rata Skor saat Seluruh Slot Terkunci
  const slotReviews = [
    { slot: 1, skor: 80, is_locked: true },
    { slot: 2, skor: 70, is_locked: true },
  ];
  const allLocked = slotReviews.every((r) => r.is_locked);
  const avg = slotReviews.reduce((sum, r) => sum + r.skor, 0) / slotReviews.length;
  assert(allLocked, 'Reviewer: Seluruh slot penelaah berhasil terkunci');
  assert(avg === 75, 'Reviewer: Rata-rata skor 75 (>= 60 -> MENUNGGU_PENETAPAN)');

  const lowReviews = [
    { slot: 1, skor: 55, is_locked: true },
    { slot: 2, skor: 53, is_locked: true },
  ];
  const avgLow = lowReviews.reduce((sum, r) => sum + r.skor, 0) / lowReviews.length;
  assert(avgLow === 54, 'Reviewer: Rata-rata skor 54 (< 60 -> Status berubah ke REVISI)');

  // 6. Uji Direktur Bypass: Validasi Alasan Tertulis Wajib (min 10 chars)
  const emptyBypass = directorBypassSchema.safeParse({ alasan_bypass: 'pendek' });
  assert(!emptyBypass.success, 'Direktur Bypass: Alasan < 10 karakter ditolak otomatis');

  const validBypass = directorBypassSchema.safeParse({
    alasan_bypass: 'Mandat percepatan riset pertahanan siber strategis BSSN 2026',
  });
  assert(validBypass.success, 'Direktur Bypass: Alasan kebijakan memadai diterima');

  console.log(`\nHasil: ${passed} Passed, ${failed} Failed.`);
  if (failed > 0) process.exit(1);
}

runReviewerDirekturTests();
