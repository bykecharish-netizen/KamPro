import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

export interface MockUser {
  id: string;
  nip_npm: string;
  email: string;
  password_hash: string;
  nama_lengkap: string;
  gelar: string | null;
  prodi: string | null;
  kelompok_keilmuan: string | null;
  kelas: string | null;
  no_hp: string | null;
  is_active: boolean;
  created_at: Date;
  roles: Array<{ id: string; user_id: string; role: Role }>;
}

export interface MockSession {
  id: string;
  user_id: string;
  token_hash: string;
  active_role: string;
  last_activity_at: Date;
  expires_at: Date;
}

export interface MockProposal {
  id: string;
  no_agenda: string | null;
  no_registrasi: string | null;
  judul: string;
  skema: string;
  tahap: string;
  status: string;
  ketua_id: string;
  prodi: string;
  file_url: string;
  sanitized_file_url: string | null;
  skor_rata_rata: number | null;
  is_bypass: boolean;
  alasan_bypass: string | null;
  created_at: Date;
  members: Array<{
    id: string;
    proposal_id: string;
    user_id: string;
    peran_tim: string;
  }>;
  reviews: Array<{
    id: string;
    proposal_id: string;
    reviewer_id: string;
    reviewer_slot: number;
    skor: number | null;
    catatan: string | null;
    is_locked: boolean;
    submitted_at: Date | null;
  }>;
}

// Password default 'Password123!#' di-hash dengan bcrypt
const DEFAULT_HASH = bcrypt.hashSync('Password123!#', 10);

const USERS: MockUser[] = [
  {
    id: 'u-dosen-1',
    nip_npm: '198503152010121001',
    email: 'budi.santoso@poltekssn.ac.id',
    password_hash: DEFAULT_HASH,
    nama_lengkap: 'Dr. Budi Santoso',
    gelar: 'S.ST., M.Kom., Ph.D.',
    prodi: 'Rekayasa Kriptografi',
    kelompok_keilmuan: 'Kriptografi Terapan',
    kelas: null,
    no_hp: '081234567890',
    is_active: true,
    created_at: new Date('2026-01-01T00:00:00Z'),
    roles: [
      { id: 'r-1', user_id: 'u-dosen-1', role: Role.PENGUSUL },
      { id: 'r-2', user_id: 'u-dosen-1', role: Role.KAPRODI },
      { id: 'r-3', user_id: 'u-dosen-1', role: Role.REVIEWER },
    ],
  },
  {
    id: 'u-kappm-1',
    nip_npm: '197801012003121002',
    email: 'ahmad.dahlan@poltekssn.ac.id',
    password_hash: DEFAULT_HASH,
    nama_lengkap: 'Dr. Ir. Ahmad Dahlan',
    gelar: 'M.T.',
    prodi: 'Rekayasa Keamanan Siber',
    kelompok_keilmuan: 'Keamanan Jaringan & Sistem',
    kelas: null,
    no_hp: '081234567891',
    is_active: true,
    created_at: new Date('2026-01-01T00:00:00Z'),
    roles: [{ id: 'r-4', user_id: 'u-kappm-1', role: Role.KA_PPM }],
  },
  {
    id: 'u-direktur-1',
    nip_npm: '197205201998031001',
    email: 'hendra.kusuma@poltekssn.ac.id',
    password_hash: DEFAULT_HASH,
    nama_lengkap: 'Marsekal Pertama TNI Hendra Kusuma',
    gelar: 'S.Sos., M.Si.',
    prodi: 'Poltek SSN',
    kelompok_keilmuan: 'Manajemen Pertahanan Siber',
    kelas: null,
    no_hp: '081234567892',
    is_active: true,
    created_at: new Date('2026-01-01T00:00:00Z'),
    roles: [{ id: 'r-5', user_id: 'u-direktur-1', role: Role.DIREKTUR }],
  },
  {
    id: 'u-admin-1',
    nip_npm: '199208142015031003',
    email: 'admin.ppm@poltekssn.ac.id',
    password_hash: DEFAULT_HASH,
    nama_lengkap: 'Rian Pratama',
    gelar: 'S.Kom.',
    prodi: 'Pusat PPM',
    kelompok_keilmuan: 'Administrasi Sistem Informasi',
    kelas: null,
    no_hp: '081234567893',
    is_active: true,
    created_at: new Date('2026-01-01T00:00:00Z'),
    roles: [{ id: 'r-6', user_id: 'u-admin-1', role: Role.ADMIN }],
  },
  {
    id: 'u-rev-1',
    nip_npm: '198007122005011002',
    email: 'siti.aminah@poltekssn.ac.id',
    password_hash: DEFAULT_HASH,
    nama_lengkap: 'Dr. Siti Aminah',
    gelar: 'S.Si., M.Sc.',
    prodi: 'Rekayasa Perangkat Keras Kriptografi',
    kelompok_keilmuan: 'Hardware Security & Embedded Systems',
    kelas: null,
    no_hp: '081234567894',
    is_active: true,
    created_at: new Date('2026-01-01T00:00:00Z'),
    roles: [{ id: 'r-7', user_id: 'u-rev-1', role: Role.REVIEWER }],
  },
  {
    id: 'u-rev-2',
    nip_npm: '198811252014021002',
    email: 'dedi.gunawan@poltekssn.ac.id',
    password_hash: DEFAULT_HASH,
    nama_lengkap: 'Dedi Gunawan',
    gelar: 'S.T., M.Eng.',
    prodi: 'Rekayasa Keamanan Siber',
    kelompok_keilmuan: 'Forensik Digital & Analisis Malware',
    kelas: null,
    no_hp: '081234567895',
    is_active: true,
    created_at: new Date('2026-01-01T00:00:00Z'),
    roles: [{ id: 'r-8', user_id: 'u-rev-2', role: Role.REVIEWER }],
  },
  {
    id: 'u-taruna-1',
    nip_npm: '2120014',
    email: 'reza.firmansyah@poltekssn.ac.id',
    password_hash: DEFAULT_HASH,
    nama_lengkap: 'Reza Firmansyah',
    gelar: null,
    prodi: 'Rekayasa Kriptografi',
    kelompok_keilmuan: 'Kriptografi Terapan',
    kelas: 'K-41',
    no_hp: '081234567896',
    is_active: true,
    created_at: new Date('2026-01-01T00:00:00Z'),
    roles: [{ id: 'r-9', user_id: 'u-taruna-1', role: Role.PENGUSUL }],
  },
  {
    id: 'u-taruna-2',
    nip_npm: '222110088',
    email: 'aditya.pratama@poltekssn.ac.id',
    password_hash: DEFAULT_HASH,
    nama_lengkap: 'Aditya Pratama',
    gelar: null,
    prodi: 'Rekayasa Keamanan Siber',
    kelompok_keilmuan: 'Keamanan Jaringan',
    kelas: 'K-42',
    no_hp: '081234567897',
    is_active: true,
    created_at: new Date('2026-01-01T00:00:00Z'),
    roles: [{ id: 'r-10', user_id: 'u-taruna-2', role: Role.PENGUSUL }],
  },
];

const PROPOSALS: MockProposal[] = [
  {
    id: 'prop-1',
    no_agenda: 'AGD-2026-001',
    no_registrasi: 'PL-2026-RK-001',
    judul: 'Implementasi Skema Enkripsi Homomorfik pada Protokol Pertukaran Kunci Berbasis Kisi (Lattice-Based Cryptography)',
    skema: 'PDP',
    tahap: 'PROPOSAL',
    status: 'PENILAIAN_REVIEWER',
    ketua_id: 'u-dosen-1',
    prodi: 'Rekayasa Kriptografi',
    file_url: '/uploads/proposals/prop-2026-001.pdf',
    sanitized_file_url: '/uploads/proposals/sanitized-prop-2026-001.pdf',
    skor_rata_rata: null,
    is_bypass: false,
    alasan_bypass: null,
    created_at: new Date('2026-01-15T08:00:00Z'),
    members: [
      {
        id: 'pm-1',
        proposal_id: 'prop-1',
        user_id: 'u-taruna-1',
        peran_tim: 'Anggota Taruna',
      },
    ],
    reviews: [
      {
        id: 'pr-1',
        proposal_id: 'prop-1',
        reviewer_id: 'u-rev-1',
        reviewer_slot: 1,
        skor: 82.5,
        catatan: 'Metodologi penelitian berbasis kisi sangat mutakhir. Perjelas parameter benchmark hardware.',
        is_locked: false,
        submitted_at: null,
      },
      {
        id: 'pr-2',
        proposal_id: 'prop-1',
        reviewer_id: 'u-rev-2',
        reviewer_slot: 2,
        skor: 78.0,
        catatan: 'Kesesuaian roadmap penelitian prodi Kriptografi sangat kuat. Luaran paten/jurnal terukur.',
        is_locked: false,
        submitted_at: null,
      },
    ],
  },
  {
    id: 'prop-2',
    no_agenda: 'AGD-2025-089',
    no_registrasi: 'OK-PK-2025-RK-012',
    judul: 'Analisis Ketahanan Protokol Otentikasi Lightweight IoT Terhadap Serangan Side-Channel DPA',
    skema: 'PKM-KC',
    tahap: 'LAPORAN',
    status: 'DISETUJUI',
    ketua_id: 'u-taruna-1',
    prodi: 'Rekayasa Kriptografi',
    file_url: '/uploads/proposals/lap-2025-089.pdf',
    sanitized_file_url: '/uploads/proposals/sanitized-lap-2025-089.pdf',
    skor_rata_rata: 85.5,
    is_bypass: false,
    alasan_bypass: null,
    created_at: new Date('2025-11-10T09:00:00Z'),
    members: [
      {
        id: 'pm-2',
        proposal_id: 'prop-2',
        user_id: 'u-dosen-1',
        peran_tim: 'Dosen Pembimbing',
      },
    ],
    reviews: [
      {
        id: 'pr-3',
        proposal_id: 'prop-2',
        reviewer_id: 'u-rev-1',
        reviewer_slot: 1,
        skor: 86.0,
        catatan: 'Laporan pengujian side-channel komprehensif.',
        is_locked: true,
        submitted_at: new Date('2025-11-20T10:00:00Z'),
      },
      {
        id: 'pr-4',
        proposal_id: 'prop-2',
        reviewer_id: 'u-rev-2',
        reviewer_slot: 2,
        skor: 85.0,
        catatan: 'Hasil analisis sinyal DPA valid.',
        is_locked: true,
        submitted_at: new Date('2025-11-21T14:30:00Z'),
      },
    ],
  },
  {
    id: 'prop-3',
    no_agenda: 'AGD-2026-003',
    no_registrasi: null,
    judul: 'Sistem Deteksi Intrusi Berbasis Deep Learning pada Arsitektur SCADA Gardu Induk',
    skema: 'PKM-KC',
    tahap: 'PROPOSAL',
    status: 'MENUNGGU_VALIDASI_PRODI',
    ketua_id: 'u-taruna-1',
    prodi: 'Rekayasa Kriptografi',
    file_url: '/uploads/proposals/prop-scada.pdf',
    sanitized_file_url: '/uploads/proposals/prop-scada.pdf',
    skor_rata_rata: null,
    is_bypass: false,
    alasan_bypass: null,
    created_at: new Date('2026-02-01T10:30:00Z'),
    members: [
      {
        id: 'pm-3',
        proposal_id: 'prop-3',
        user_id: 'u-dosen-1',
        peran_tim: 'Dosen Pembimbing',
      },
    ],
    reviews: [],
  },
  {
    id: 'prop-4',
    no_agenda: 'AGD-2026-004',
    no_registrasi: 'OK-PRP-2026-0007',
    judul: 'Platform Audit Kerentanan Smart Contract Otomatis Berbasis Static Bytecode Analysis',
    skema: 'PKM-KC',
    tahap: 'PROPOSAL',
    status: 'REVISI',
    ketua_id: 'u-taruna-1',
    prodi: 'Rekayasa Kriptografi',
    file_url: '/uploads/proposals/prop-smartcontract.pdf',
    sanitized_file_url: '/uploads/proposals/prop-smartcontract.pdf',
    skor_rata_rata: 54.5,
    is_bypass: false,
    alasan_bypass: null,
    created_at: new Date('2026-01-20T11:00:00Z'),
    members: [
      {
        id: 'pm-4',
        proposal_id: 'prop-4',
        user_id: 'u-dosen-1',
        peran_tim: 'Dosen Pembimbing',
      },
    ],
    reviews: [
      {
        id: 'pr-5',
        proposal_id: 'prop-4',
        reviewer_id: 'u-rev-1',
        reviewer_slot: 1,
        skor: 55.0,
        catatan: 'Kajian formal verification belum tajam. Perbaiki metodologi bytecode disassembler.',
        is_locked: true,
        submitted_at: new Date('2026-02-10T12:00:00Z'),
      },
      {
        id: 'pr-6',
        proposal_id: 'prop-4',
        reviewer_id: 'u-rev-2',
        reviewer_slot: 2,
        skor: 54.0,
        catatan: 'Perlu pengujian benchmark gas cost dan pembuktian soundness teorema.',
        is_locked: true,
        submitted_at: new Date('2026-02-11T15:00:00Z'),
      },
    ],
  },
  {
    id: 'prop-5',
    no_agenda: 'AGD-2026-005',
    no_registrasi: null,
    judul: 'Rancang Bangun Hardware Security Token Berbasis ESP32 untuk Pengamanan Desa Digital',
    skema: 'PKM-PI',
    tahap: 'PROPOSAL',
    status: 'MENUNGGU_REGISTRASI_PPM',
    ketua_id: 'u-dosen-1',
    prodi: 'Rekayasa Kriptografi',
    file_url: '/uploads/proposals/prop-esp32.pdf',
    sanitized_file_url: '/uploads/proposals/prop-esp32.pdf',
    skor_rata_rata: null,
    is_bypass: false,
    alasan_bypass: null,
    created_at: new Date('2026-02-05T09:15:00Z'),
    members: [
      {
        id: 'pm-5',
        proposal_id: 'prop-5',
        user_id: 'u-taruna-1',
        peran_tim: 'Anggota Taruna',
      },
    ],
    reviews: [],
  },
];

const SESSIONS: Map<string, MockSession> = new Map();
const AUDIT_LOGS: any[] = [];

// Simpan data di globalThis agar persisten selama server berjalan
const globalStore = globalThis as unknown as {
  __mockUsers?: MockUser[];
  __mockProposals?: MockProposal[];
  __mockSessions?: Map<string, MockSession>;
  __mockAuditLogs?: any[];
};

if (!globalStore.__mockUsers) {
  globalStore.__mockUsers = [...USERS];
}
if (!globalStore.__mockProposals) {
  globalStore.__mockProposals = [...PROPOSALS];
}
if (!globalStore.__mockSessions) {
  globalStore.__mockSessions = SESSIONS;
}
if (!globalStore.__mockAuditLogs) {
  globalStore.__mockAuditLogs = AUDIT_LOGS;
}

export const mockStore = {
  users: globalStore.__mockUsers!,
  proposals: globalStore.__mockProposals!,
  sessions: globalStore.__mockSessions!,
  auditLogs: globalStore.__mockAuditLogs!,
};
