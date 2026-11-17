import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Memulai proses seeding basis data SIM-PPM Poltek SSN...');

  // Hash password default dengan cost 12
  const defaultPassword = 'Password123!#';
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

  // 1. Akun Dosen Multi-Peran (PENGUSUL, KAPRODI, REVIEWER)
  const dosenMultiPeran = await prisma.user.upsert({
    where: { nip_npm: '198503152010121001' },
    update: {},
    create: {
      nip_npm: '198503152010121001',
      email: 'budi.santoso@poltekssn.ac.id',
      password_hash: passwordHash,
      nama_lengkap: 'Dr. Budi Santoso',
      gelar: 'S.ST., M.Kom., Ph.D.',
      prodi: 'Rekayasa Kriptografi',
      kelompok_keilmuan: 'Kriptografi Terapan',
      kelas: null,
      no_hp: '081234567890',
      is_active: true,
      roles: {
        create: [
          { role: Role.PENGUSUL },
          { role: Role.KAPRODI },
          { role: Role.REVIEWER },
        ],
      },
    },
  });

  // 2. Akun Kepala Pusat PPM (KA_PPM)
  const kaPpm = await prisma.user.upsert({
    where: { nip_npm: '197801012003121002' },
    update: {},
    create: {
      nip_npm: '197801012003121002',
      email: 'ahmad.dahlan@poltekssn.ac.id',
      password_hash: passwordHash,
      nama_lengkap: 'Dr. Ir. Ahmad Dahlan',
      gelar: 'M.T.',
      prodi: 'Rekayasa Keamanan Siber',
      kelompok_keilmuan: 'Keamanan Jaringan & Sistem',
      kelas: null,
      no_hp: '081234567891',
      is_active: true,
      roles: {
        create: [{ role: Role.KA_PPM }],
      },
    },
  });

  // 3. Akun Direktur (DIREKTUR)
  const direktur = await prisma.user.upsert({
    where: { nip_npm: '197205201998031001' },
    update: {},
    create: {
      nip_npm: '197205201998031001',
      email: 'hendra.kusuma@poltekssn.ac.id',
      password_hash: passwordHash,
      nama_lengkap: 'Marsekal Pertama TNI Hendra Kusuma',
      gelar: 'S.Sos., M.Si.',
      prodi: 'Poltek SSN',
      kelompok_keilmuan: 'Manajemen Pertahanan Siber',
      kelas: null,
      no_hp: '081234567892',
      is_active: true,
      roles: {
        create: [{ role: Role.DIREKTUR }],
      },
    },
  });

  // 4. Akun Admin Sistem (ADMIN)
  const admin = await prisma.user.upsert({
    where: { nip_npm: '199208142015031003' },
    update: {},
    create: {
      nip_npm: '199208142015031003',
      email: 'admin.ppm@poltekssn.ac.id',
      password_hash: passwordHash,
      nama_lengkap: 'Rian Pratama',
      gelar: 'S.Kom.',
      prodi: 'Pusat PPM',
      kelompok_keilmuan: 'Administrasi Sistem Informasi',
      kelas: null,
      no_hp: '081234567893',
      is_active: true,
      roles: {
        create: [{ role: Role.ADMIN }],
      },
    },
  });

  // 5. Akun Reviewer Tambahan 1 (REVIEWER)
  const reviewer1 = await prisma.user.upsert({
    where: { nip_npm: '198207102008122001' },
    update: {},
    create: {
      nip_npm: '198207102008122001',
      email: 'siti.aminah@poltekssn.ac.id',
      password_hash: passwordHash,
      nama_lengkap: 'Dr. Siti Aminah',
      gelar: 'S.Si., M.Sc.',
      prodi: 'Rekayasa Perangkat Keras Kriptografi',
      kelompok_keilmuan: 'Hardware Security & Embedded Systems',
      kelas: null,
      no_hp: '081234567894',
      is_active: true,
      roles: {
        create: [{ role: Role.REVIEWER }],
      },
    },
  });

  // 6. Akun Reviewer Tambahan 2 (REVIEWER)
  const reviewer2 = await prisma.user.upsert({
    where: { nip_npm: '198811252014021002' },
    update: {},
    create: {
      nip_npm: '198811252014021002',
      email: 'dedi.gunawan@poltekssn.ac.id',
      password_hash: passwordHash,
      nama_lengkap: 'Dedi Gunawan',
      gelar: 'S.T., M.Eng.',
      prodi: 'Rekayasa Keamanan Siber',
      kelompok_keilmuan: 'Forensik Digital & Analisis Malware',
      kelas: null,
      no_hp: '081234567895',
      is_active: true,
      roles: {
        create: [{ role: Role.REVIEWER }],
      },
    },
  });

  // 7. Akun Taruna Pengusul (PENGUSUL)
  const taruna = await prisma.user.upsert({
    where: { nip_npm: '222110045' },
    update: {},
    create: {
      nip_npm: '222110045',
      email: 'taruna.reza@poltekssn.ac.id',
      password_hash: passwordHash,
      nama_lengkap: 'Reza Firmansyah',
      gelar: null,
      prodi: 'Rekayasa Kriptografi',
      kelompok_keilmuan: 'Kriptografi Terapan',
      kelas: 'K-41',
      no_hp: '081234567896',
      is_active: true,
      roles: {
        create: [{ role: Role.PENGUSUL }],
      },
    },
  });

  console.log('✅ Berhasil menyemai 7 akun pengguna master (beserta multi-peran).');

  // 8. Dummy Proposal 1: Tahap PROPOSAL (Sedang dinilai oleh Reviewer)
  const proposal1 = await prisma.proposal.upsert({
    where: { no_agenda: 'AG-2026-001' },
    update: {},
    create: {
      no_agenda: 'AG-2026-001',
      no_registrasi: 'PL-2026-RK-001',
      judul: 'Implementasi Skema Enkripsi Homomorfik pada Protokol Pertukaran Kunci Berbasis Kisi (Lattice-Based Cryptography)',
      skema: 'Penelitian Dosen Pemula (PDP)',
      tahap: 'PROPOSAL',
      status: 'PENILAIAN_REVIEWER',
      ketua_id: dosenMultiPeran.id,
      prodi: 'Rekayasa Kriptografi',
      file_url: 'https://storage.poltekssn.ac.id/proposals/prop-2026-001.pdf',
      sanitized_file_url: 'https://storage.poltekssn.ac.id/proposals/sanitized-prop-2026-001.pdf',
      skor_rata_rata: null,
      is_bypass: false,
      alasan_bypass: null,
      members: {
        create: [
          {
            user_id: taruna.id,
            peran_tim: 'Anggota Taruna',
          },
        ],
      },
      reviews: {
        create: [
          {
            reviewer_id: reviewer1.id,
            reviewer_slot: 1,
            skor: 82.5,
            catatan: 'Metodologi penelitian berbasis kisi sangat mutakhir. Perjelas parameter benchmark hardware.',
            is_locked: false,
          },
          {
            reviewer_id: reviewer2.id,
            reviewer_slot: 2,
            skor: 78.0,
            catatan: 'Kesesuaian roadmap penelitian prodi Kriptografi sangat kuat. Luaran target paten/jurnal terukur.',
            is_locked: false,
          },
        ],
      },
    },
  });

  // 9. Dummy Proposal 2: Tahap LAPORAN (Sudah selesai dinilai dan disetujui)
  const proposal2 = await prisma.proposal.upsert({
    where: { no_agenda: 'AG-2025-089' },
    update: {},
    create: {
      no_agenda: 'AG-2025-089',
      no_registrasi: 'OK-PK-2025-RK-012',
      judul: 'Analisis Ketahanan Protokol Otentikasi Lightweight IoT Terhadap Serangan Side-Channel DPA',
      skema: 'Penelitian Terapan (PT)',
      tahap: 'LAPORAN',
      status: 'DISETUJUI',
      ketua_id: taruna.id,
      prodi: 'Rekayasa Kriptografi',
      file_url: 'https://storage.poltekssn.ac.id/laporan/lap-2025-089.pdf',
      sanitized_file_url: 'https://storage.poltekssn.ac.id/laporan/sanitized-lap-2025-089.pdf',
      skor_rata_rata: 85.5,
      is_bypass: false,
      alasan_bypass: null,
      members: {
        create: [
          {
            user_id: dosenMultiPeran.id,
            peran_tim: 'Dosen Pembimbing',
          },
        ],
      },
      reviews: {
        create: [
          {
            reviewer_id: reviewer1.id,
            reviewer_slot: 1,
            skor: 86.0,
            catatan: 'Laporan pengujian side-channel sangat komprehensif. Hasil uji lab memenuhi standar.',
            is_locked: true,
            submitted_at: new Date('2025-11-20T10:00:00Z'),
          },
          {
            reviewer_id: reviewer2.id,
            reviewer_slot: 2,
            skor: 85.0,
            catatan: 'Hasil analisis sinyal DPA valid dan luaran publikasi SINTA 2 telah tercapai.',
            is_locked: true,
            submitted_at: new Date('2025-11-21T14:30:00Z'),
          },
        ],
      },
    },
  });

  // 10. Dummy Proposal 3: Tahap PROPOSAL - Status MENUNGGU_VALIDASI_PRODI
  // Untuk pengujian Validasi CPL oleh Kaprodi
  await prisma.proposal.upsert({
    where: { no_agenda: 'AGD-2026-003' },
    update: {},
    create: {
      no_agenda: 'AGD-2026-003',
      no_registrasi: null,
      judul: 'Sistem Deteksi Intrusi Berbasis Deep Learning pada Arsitektur SCADA Gardu Induk',
      skema: 'PKM-KC',
      tahap: 'PROPOSAL',
      status: 'MENUNGGU_VALIDASI_PRODI',
      ketua_id: taruna.id,
      prodi: 'Rekayasa Kriptografi',
      file_url: 'https://storage.poltekssn.ac.id/proposals/prop-scada.pdf',
      sanitized_file_url: 'https://storage.poltekssn.ac.id/proposals/prop-scada.pdf',
      skor_rata_rata: null,
      is_bypass: false,
      members: {
        create: [
          {
            user_id: dosenMultiPeran.id,
            peran_tim: 'Dosen Pembimbing',
          },
        ],
      },
    },
  });

  // 11. Dummy Proposal 4: Tahap PROPOSAL - Status REVISI (Skor < 60)
  // Untuk pengujian Unggah Revisi Pengusul
  await prisma.proposal.upsert({
    where: { no_agenda: 'AGD-2026-004' },
    update: {},
    create: {
      no_agenda: 'AGD-2026-004',
      no_registrasi: 'OK-PRP-2026-0007',
      judul: 'Platform Audit Kerentanan Smart Contract Otomatis Berbasis Static Bytecode Analysis',
      skema: 'PKM-KC',
      tahap: 'PROPOSAL',
      status: 'REVISI',
      ketua_id: taruna.id,
      prodi: 'Rekayasa Kriptografi',
      file_url: 'https://storage.poltekssn.ac.id/proposals/prop-smartcontract.pdf',
      sanitized_file_url: 'https://storage.poltekssn.ac.id/proposals/prop-smartcontract.pdf',
      skor_rata_rata: 54.5,
      is_bypass: false,
      members: {
        create: [
          {
            user_id: dosenMultiPeran.id,
            peran_tim: 'Dosen Pembimbing',
          },
        ],
      },
      reviews: {
        create: [
          {
            reviewer_id: reviewer1.id,
            reviewer_slot: 1,
            skor: 55.0,
            catatan: 'Kajian formal verification belum tajam. Perbaiki metodologi bytecode disassembler.',
            is_locked: true,
          },
          {
            reviewer_id: reviewer2.id,
            reviewer_slot: 2,
            skor: 54.0,
            catatan: 'Perlu pengujian benchmark gas cost dan pembuktian soundness teorema.',
            is_locked: true,
          },
        ],
      },
    },
  });

  // 12. Dummy Proposal 5: Tahap PROPOSAL - Status MENUNGGU_REGISTRASI_PPM
  // Untuk pengujian Terbitkan No. Registrasi dan Tunjuk Reviewer oleh Ka. PPM
  await prisma.proposal.upsert({
    where: { no_agenda: 'AGD-2026-005' },
    update: {},
    create: {
      no_agenda: 'AGD-2026-005',
      no_registrasi: null,
      judul: 'Rancang Bangun Hardware Security Token Berbasis ESP32 untuk Pengamanan Desa Digital',
      skema: 'PKM-PI',
      tahap: 'PROPOSAL',
      status: 'MENUNGGU_REGISTRASI_PPM',
      ketua_id: dosenMultiPeran.id,
      prodi: 'Rekayasa Kriptografi',
      file_url: 'https://storage.poltekssn.ac.id/proposals/prop-esp32.pdf',
      sanitized_file_url: 'https://storage.poltekssn.ac.id/proposals/prop-esp32.pdf',
      skor_rata_rata: null,
      is_bypass: false,
      members: {
        create: [
          {
            user_id: taruna.id,
            peran_tim: 'Anggota Taruna',
          },
        ],
      },
    },
  });

  // 13. Audit Log inisial untuk penelusuran aktivitas
  await prisma.auditLog.createMany({
    data: [
      {
        timestamp_utc: new Date(),
        actor_id: admin.id,
        active_role: 'ADMIN',
        ip_address: '127.0.0.1',
        action_type: 'SYSTEM_SEED',
        target_id: 'SYSTEM_INIT',
        status_code: '200',
        details: 'Initial database seeding for SIM-PPM Poltek SSN with 7 users and 2 dummy proposals completed.',
      },
      {
        timestamp_utc: new Date(),
        actor_id: kaPpm.id,
        active_role: 'KA_PPM',
        ip_address: '127.0.0.1',
        action_type: 'NOMOR_AGENDA_ASSIGNED',
        target_id: proposal1.id,
        status_code: '200',
        details: 'Penerbitan Nomor Agenda AG-2026-001 dan Nomor Registrasi PL-2026-RK-001.',
      },
    ],
  });

  console.log('✅ Berhasil menyemai 2 data proposal (tahap PROPOSAL & LAPORAN) beserta rekam audit log.');
  console.log('🎉 Seeding basis data SIM-PPM selesai dengan sukses!');
}

main()
  .catch((e) => {
    console.error('❌ Terjadi kesalahan saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
