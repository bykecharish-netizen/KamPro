import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function createPdf(filePath: string, title: string, lines: string[]) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page.drawRectangle({ x: 0, y: 760, width: 595.28, height: 82, color: rgb(0.024, 0.118, 0.271) });
  page.drawText('POLITEKNIK SIBER DAN SANDI NEGARA', {
    x: 48,
    y: 805,
    size: 11,
    font: fontBold,
    color: rgb(0.85, 0.92, 1),
  });
  page.drawText('DIREKTORAT PENELITIAN & PENGABDIAN KEPADA MASYARAKAT (PPM)', {
    x: 48,
    y: 786,
    size: 9,
    font: fontReg,
    color: rgb(0.4, 0.78, 0.95),
  });

  page.drawText(title, {
    x: 48,
    y: 715,
    size: 15,
    font: fontBold,
    color: rgb(0.06, 0.09, 0.16),
  });
  page.drawLine({
    start: { x: 48, y: 702 },
    end: { x: 547, y: 702 },
    thickness: 1.5,
    color: rgb(0.01, 0.52, 0.78),
  });

  let y = 674;
  for (const line of lines) {
    page.drawText(line, {
      x: 48,
      y,
      size: 10.5,
      font: fontReg,
      color: rgb(0.18, 0.23, 0.31),
    });
    y -= 20;
  }

  page.drawText('Sanata Paroksharta Bhakti — Dokumen Resmi SIM-PKM Poltek SSN 2026', {
    x: 48,
    y: 40,
    size: 8.5,
    font: fontReg,
    color: rgb(0.45, 0.52, 0.6),
  });

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, await pdfDoc.save());
}

async function main() {
  await createPdf('public/docs/panduan-pkm-2026.pdf', 'Buku Panduan Teknis PKM Internal Poltek SSN 2026', [
    'Edisi Revisi 1.2 — Tahun Anggaran 2026',
    '',
    '1. SKEMA PKM AKTIF:',
    '   - PKM-KC (Karsa Cipta): Kuota 28 Tim (Lab Kriptografi & Siber)',
    '   - PKM-RE (Riset Eksakta): Kuota 24 Tim (Lab Pengujian Sandi)',
    '   - PKM-PI (Penerapan Iptek): Kuota 24 Tim (Mitra Strategis)',
    '   - PKM-K  (Kewirausahaan): Kuota 20 Tim (Inkubator Inovasi)',
    '',
    '2. ALUR PENGAJUAN & VALIDASI:',
    '   Tahap 01: Registrasi & Pembentukan Tim Taruna terverifikasi Siakad.',
    '   Tahap 02: Unggah Proposal format PDF (maksimal 10 MB, header %PDF valid).',
    '   Tahap 03: Verifikasi & Persetujuan Akademik oleh Dosen Pembimbing / Kaprodi.',
    '   Tahap 04: Penilaian Substansi Double-Blind oleh Tim Reviewer Internal PPM.',
    '',
    '3. STANDAR KEAMANAN DOKUMEN (OWASP ASVS LEVEL 1):',
    '   Seluruh metadata penulis dibersihkan otomatis saat tahap Double-Blind Review.',
  ]);

  await createPdf('public/docs/template-pengesahan-pkm-2026.pdf', 'Format Lembar Pengesahan Usulan PKM 2026', [
    'Standar Belmawa Dikti & Direktorat PPM Poltek SSN',
    '',
    '1. Judul Kegiatan   : ..............................................................',
    '2. Bidang PKM       : [ ] PKM-KC  [ ] PKM-RE  [ ] PKM-PI  [ ] PKM-K',
    '3. Ketua Pelaksana  : Nama Lengkap / NPM / Program Studi',
    '4. Dosen Pendamping : Nama Lengkap & Gelar / NIP / Kelompok Keilmuan',
    '5. Pengesahan Digital Internal: Tervalidasi melalui QR Code SIM-PKM.',
  ]);

  await createPdf('public/docs/rubrik-penilaian-reviewer-2026.pdf', 'Pedoman Rubrik Penilaian Reviewer Internal (FO-018 / FO-021)', [
    'Direktorat Penelitian dan Pengabdian Masyarakat — Poltek SSN',
    '',
    'Komponen Penilaian Substansi (Skala 0 - 100):',
    '  - Kreativitas, Orisinalitas & Inovasi Siber / Sandi (30%)',
    '  - Ketajaman Perumusan Masalah & Metodologi Ilmiah (25%)',
    '  - Kelayakan Implementasi & Potensi Luaran (25%)',
    '  - Kesesuaian Format & Rencana Anggaran Biaya (20%)',
    '',
    'Ambang Batas Revisi: Proposal dengan skor rata-rata < 60 wajib mengunggah revisi.',
  ]);

  console.log('PDF guides created successfully.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
