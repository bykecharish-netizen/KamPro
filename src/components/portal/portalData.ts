export type PortalRoleMode = 'GUEST' | 'TARUNA' | 'DOSEN' | 'REVIEWER' | 'ADMIN';
export type SchemeCode = 'PKM-KC' | 'PKM-RE' | 'PKM-PI' | 'PKM-K';
export type ProposalStatusLabel = 'Disetujui' | 'Menunggu Verifikasi' | 'Perlu Revisi';

export interface PortalUserDto {
  id: string;
  nip_npm: string;
  nama_lengkap: string;
  gelar: string | null;
  prodi: string | null;
  roles: string[];
  active_role: string;
}

export interface PkmSchemeItem {
  code: SchemeCode;
  title: string;
  focus: string;
  registeredTeams: number;
  maxTeams: number;
}

export interface TimelinePhase {
  step: string;
  title: string;
  period: string;
  description: string;
  status: 'Selesai' | 'Berlangsung' | 'Akan Datang';
}

export interface GuideDocument {
  id: string;
  code: string;
  title: string;
  meta: string;
  href: string;
  filename: string;
}

export interface WorkspaceProposalRow {
  id: string;
  code: string;
  scheme: SchemeCode;
  title: string;
  teamLead: string;
  prodi: string;
  supervisor: string;
  status: ProposalStatusLabel;
  assignedToRole: PortalRoleMode[];
}

export const PKM_SCHEMES: PkmSchemeItem[] = [
  {
    code: 'PKM-KC',
    title: 'Karsa Cipta',
    focus: 'Prototipe & Sistem Terapan',
    registeredTeams: 24,
    maxTeams: 28,
  },
  {
    code: 'PKM-RE',
    title: 'Riset Eksakta',
    focus: 'Penelitian Kriptografi & Siber',
    registeredTeams: 18,
    maxTeams: 24,
  },
  {
    code: 'PKM-PI',
    title: 'Penerapan Iptek',
    focus: 'Solusi Digital Mitra',
    registeredTeams: 12,
    maxTeams: 24,
  },
  {
    code: 'PKM-K',
    title: 'Kewirausahaan',
    focus: 'Produk Inovasi Komersial',
    registeredTeams: 15,
    maxTeams: 20,
  },
];

export const PUBLIC_WORKFLOW_STEPS = [
  {
    number: '1',
    title: 'Pendaftaran Akun & Tim',
    desc: 'Aktivasi akun menggunakan NPM/NIP resmi dan penyusunan susunan anggota tim lintas program studi.',
  },
  {
    number: '2',
    title: 'Unggah Berkas Proposal',
    desc: 'Pengisian identitas usulan dan pengunggahan naskah proposal dalam format PDF sesuai panduan PKM 2026.',
  },
  {
    number: '3',
    title: 'Verifikasi Dosen Pembimbing',
    desc: 'Pemeriksaan kelengkapan administrasi, kesesuaian format, dan persetujuan oleh dosen pendamping.',
  },
  {
    number: '4',
    title: 'Penilaian Seleksi Internal',
    desc: 'Evaluasi substansi proposal oleh tim penelaah internal UPPM untuk penetapan usulan yang didanai.',
  },
];

export const TIMELINE_PHASES: TimelinePhase[] = [
  {
    step: '01',
    title: 'Sosialisasi & Pendaftaran Akun',
    period: '01 — 15 Oktober 2026',
    description: 'Pendaftaran akun sivitas akademika dan pembentukan kelompok pengusul PKM 2026.',
    status: 'Selesai',
  },
  {
    step: '02',
    title: 'Penerimaan Proposal Tahap Internal',
    period: '16 Oktober — 02 Desember 2026',
    description: 'Unggah naskah proposal pada empat skema PKM yang dibuka serta persetujuan dosen pembimbing.',
    status: 'Berlangsung',
  },
  {
    step: '03',
    title: 'Penilaian & Desk Evaluation',
    period: '03 — 18 Desember 2026',
    description: 'Penelaahan administratif dan penilaian substansi proposal oleh tim reviewer internal Poltek SSN.',
    status: 'Akan Datang',
  },
  {
    step: '04',
    title: 'Pengumuman & Penetapan Usulan',
    period: '22 Desember 2026',
    description: 'Penetapan daftar tim lolos seleksi internal untuk diusulkan ke tingkat nasional.',
    status: 'Akan Datang',
  },
];

export const OFFICIAL_GUIDES: GuideDocument[] = [
  {
    id: 'guide-main',
    code: 'PEDOMAN-2026',
    title: 'Buku Panduan Teknis PKM Internal Poltek SSN 2026',
    meta: 'Format PDF • Revisi 1.2 • Unit PPM Poltek SSN',
    href: '/docs/panduan-pkm-2026.pdf',
    filename: 'Buku-Pedoman-PKM-Poltek-SSN-2026.pdf',
  },
  {
    id: 'guide-approval',
    code: 'LAMPIRAN-01',
    title: 'Format Lembar Pengesahan Usulan PKM',
    meta: 'Format PDF • Standar Administrasi Proposal',
    href: '/docs/template-pengesahan-pkm-2026.pdf',
    filename: 'Format-Lembar-Pengesahan-PKM-2026.pdf',
  },
  {
    id: 'guide-rubric',
    code: 'FORM-FO-018',
    title: 'Pedoman Rubrik Penilaian Reviewer Internal',
    meta: 'Format PDF • Acuan Penilaian Substansi',
    href: '/docs/rubrik-penilaian-reviewer-2026.pdf',
    filename: 'Rubrik-Penilaian-Reviewer-PKM-2026.pdf',
  },
];

/**
 * Data pratinjau untuk mode simulasi peran.
 * Tidak pernah dirender saat halaman berada pada tampilan Publik/Tamu.
 */
export const DEMO_WORKSPACE_PROPOSALS: WorkspaceProposalRow[] = [
  {
    id: 'sim-1',
    code: 'PKM-KC-2026-014',
    scheme: 'PKM-KC',
    title: 'Purwarupa Modul Keamanan Perangkat Keras Berbasis RISC-V untuk Jaringan Sensor IoT',
    teamLead: 'Aditya Pratama',
    prodi: 'Rekayasa Keamanan Siber',
    supervisor: 'Dr. Budi Santoso, M.Kom.',
    status: 'Perlu Revisi',
    assignedToRole: ['TARUNA', 'DOSEN', 'ADMIN'],
  },
  {
    id: 'sim-2',
    code: 'PKM-RE-2026-009',
    scheme: 'PKM-RE',
    title: 'Analisis Ketahanan Algoritma Kriptografi Pasca-Kuantum Kyber-768 pada Perangkat Tertanam',
    teamLead: 'Reza Firmansyah',
    prodi: 'Rekayasa Kriptografi',
    supervisor: 'Dr. Siti Aminah, M.Sc.',
    status: 'Menunggu Verifikasi',
    assignedToRole: ['TARUNA', 'DOSEN', 'REVIEWER', 'ADMIN'],
  },
  {
    id: 'sim-3',
    code: 'PKM-PI-2026-005',
    scheme: 'PKM-PI',
    title: 'Penerapan Sistem Pemantauan Anomali Jaringan untuk Infrastruktur Digital Mitra Daerah',
    teamLead: 'Nabila Syifa',
    prodi: 'Rekayasa Perangkat Keras Kriptografi',
    supervisor: 'Dedi Gunawan, S.T., M.Eng.',
    status: 'Menunggu Verifikasi',
    assignedToRole: ['REVIEWER', 'ADMIN'],
  },
  {
    id: 'sim-4',
    code: 'PKM-K-2026-011',
    scheme: 'PKM-K',
    title: 'Pengembangan Perangkat Pembelajaran Forensik Digital Modular untuk Sekolah Menengah Kejuruan',
    teamLead: 'Boyke Charish',
    prodi: 'Rekayasa Keamanan Siber',
    supervisor: 'Dr. Budi Santoso, M.Kom.',
    status: 'Disetujui',
    assignedToRole: ['TARUNA', 'DOSEN', 'REVIEWER', 'ADMIN'],
  },
  {
    id: 'sim-5',
    code: 'PKM-KC-2026-021',
    scheme: 'PKM-KC',
    title: 'Sistem Deteksi Dini Serangan Jaringan Berbasis Pemantauan Paket Real-Time',
    teamLead: 'Farhan Hidayat',
    prodi: 'Rekayasa Keamanan Siber',
    supervisor: 'Dr. Ir. Ahmad Dahlan, M.T.',
    status: 'Menunggu Verifikasi',
    assignedToRole: ['DOSEN', 'ADMIN'],
  },
  {
    id: 'sim-6',
    code: 'PKM-RE-2026-017',
    scheme: 'PKM-RE',
    title: 'Optimasi Pembangkit Bilangan Acak Berbasis Derau Optik Berbiaya Rendah',
    teamLead: 'Salsa Oktaviani',
    prodi: 'Rekayasa Kriptografi',
    supervisor: 'Maya Lestari, S.Si., M.Kom.',
    status: 'Disetujui',
    assignedToRole: ['REVIEWER', 'ADMIN'],
  },
];

export function mapServerRoleToPortalMode(role?: string | null): PortalRoleMode {
  switch (role) {
    case 'ADMIN':
    case 'KA_PPM':
    case 'DIREKTUR':
      return 'ADMIN';
    case 'REVIEWER':
      return 'REVIEWER';
    case 'KAPRODI':
      return 'DOSEN';
    case 'PENGUSUL':
      return 'TARUNA';
    default:
      return 'GUEST';
  }
}

export function getRoleDisplayLabel(mode: PortalRoleMode): string {
  switch (mode) {
    case 'TARUNA':
      return 'Taruna';
    case 'DOSEN':
      return 'Dosen';
    case 'REVIEWER':
      return 'Reviewer';
    case 'ADMIN':
      return 'Admin';
    default:
      return 'Publik';
  }
}

export function sanitizeSearchInput(raw: string): string {
  return raw
    .replace(/[<>'"`;\\]/g, '')
    .replace(/[\r\n\t]/g, ' ')
    .slice(0, 80);
}
