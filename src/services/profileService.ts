/**
 * Service Komponen Master Profil & SDM / Siakad (Poltek SSN)
 * Sesuai spesifikasi docs/techstack.md & PRD.md Kontrol 2.3.1
 * 
 * Bertanggung jawab untuk:
 * 1. Memverifikasi NIP/NPM terhadap Master SDM (Dosen/Tendik) dan Siakad (Taruna)
 * 2. Mencegah eskalasi peran ilegal (misal: Taruna mengklaim peran KAPRODI/REVIEWER/DIREKTUR)
 * 3. Menarik data profil master secara read-only untuk auto-fill
 */

export interface MasterEntity {
  nip_npm: string;
  nama_lengkap: string;
  gelar: string | null;
  prodi: string;
  kelompok_keilmuan: string | null;
  kelas: string | null;
  entity_type: 'TARUNA' | 'DOSEN' | 'PEGAWAI';
  allowed_roles: string[];
}

// Basis Data Master SDM & Siakad Resmi Poltek SSN
export const MASTER_SDM_SIAKAD: MasterEntity[] = [
  // 1. Dosen Tetap / Struktural
  {
    nip_npm: '198503152010121001',
    nama_lengkap: 'Dr. Budi Santoso',
    gelar: 'S.ST., M.Kom., Ph.D.',
    prodi: 'Rekayasa Kriptografi',
    kelompok_keilmuan: 'Kriptografi Terapan',
    kelas: null,
    entity_type: 'DOSEN',
    allowed_roles: ['PENGUSUL', 'KAPRODI', 'REVIEWER'],
  },
  {
    nip_npm: '197801012003121002',
    nama_lengkap: 'Dr. Ir. Ahmad Dahlan',
    gelar: 'M.T.',
    prodi: 'Rekayasa Keamanan Siber',
    kelompok_keilmuan: 'Keamanan Jaringan & Sistem',
    kelas: null,
    entity_type: 'DOSEN',
    allowed_roles: ['KA_PPM'],
  },
  {
    nip_npm: '197205201998031001',
    nama_lengkap: 'Marsekal Pertama TNI Hendra Kusuma',
    gelar: 'S.Sos., M.Si.',
    prodi: 'Poltek SSN',
    kelompok_keilmuan: 'Manajemen Pertahanan Siber',
    kelas: null,
    entity_type: 'DOSEN',
    allowed_roles: ['DIREKTUR'],
  },
  {
    nip_npm: '199208142015031003',
    nama_lengkap: 'Rian Pratama',
    gelar: 'S.Kom.',
    prodi: 'Pusat PPM',
    kelompok_keilmuan: 'Administrasi Sistem Informasi',
    kelas: null,
    entity_type: 'PEGAWAI',
    allowed_roles: ['ADMIN'],
  },
  {
    nip_npm: '198007122005011002',
    nama_lengkap: 'Dr. Siti Aminah',
    gelar: 'S.Si., M.Sc.',
    prodi: 'Rekayasa Perangkat Keras Kriptografi',
    kelompok_keilmuan: 'Hardware Security & Embedded Systems',
    kelas: null,
    entity_type: 'DOSEN',
    allowed_roles: ['REVIEWER', 'PENGUSUL'],
  },
  {
    nip_npm: '198811252014021002',
    nama_lengkap: 'Dedi Gunawan',
    gelar: 'S.T., M.Eng.',
    prodi: 'Rekayasa Keamanan Siber',
    kelompok_keilmuan: 'Forensik Digital & Analisis Malware',
    kelas: null,
    entity_type: 'DOSEN',
    allowed_roles: ['REVIEWER', 'PENGUSUL'],
  },
  // Calon Dosen Pendaftar Baru (Tercatat di Master SDM)
  {
    nip_npm: '198901012015011099',
    nama_lengkap: 'Farhan Prasetyo',
    gelar: 'S.ST., M.T.',
    prodi: 'Rekayasa Keamanan Siber',
    kelompok_keilmuan: 'Forensik Digital & Analisis Malware',
    kelas: null,
    entity_type: 'DOSEN',
    allowed_roles: ['REVIEWER', 'PENGUSUL'],
  },
  {
    nip_npm: '198705122011011005',
    nama_lengkap: 'Maya Lestari',
    gelar: 'S.Si., M.Kom.',
    prodi: 'Rekayasa Kriptografi',
    kelompok_keilmuan: 'Kriptografi Terapan',
    kelas: null,
    entity_type: 'DOSEN',
    allowed_roles: ['KAPRODI', 'PENGUSUL'],
  },
  // 2. Taruna (Siakad)
  {
    nip_npm: '2120014',
    nama_lengkap: 'Reza Firmansyah',
    gelar: null,
    prodi: 'Rekayasa Kriptografi',
    kelompok_keilmuan: 'Kriptografi Terapan',
    kelas: 'K-41',
    entity_type: 'TARUNA',
    allowed_roles: ['PENGUSUL'],
  },
  {
    nip_npm: '222110045',
    nama_lengkap: 'Reza Firmansyah',
    gelar: null,
    prodi: 'Rekayasa Kriptografi',
    kelompok_keilmuan: 'Kriptografi Terapan',
    kelas: 'K-41',
    entity_type: 'TARUNA',
    allowed_roles: ['PENGUSUL'],
  },
  {
    nip_npm: '222110088',
    nama_lengkap: 'Aditya Pratama',
    gelar: null,
    prodi: 'Rekayasa Keamanan Siber',
    kelompok_keilmuan: 'Keamanan Jaringan',
    kelas: 'K-42',
    entity_type: 'TARUNA',
    allowed_roles: ['PENGUSUL'],
  },
  {
    nip_npm: '222110099',
    nama_lengkap: 'Nabila Syifa',
    gelar: null,
    prodi: 'Rekayasa Perangkat Keras Kriptografi',
    kelompok_keilmuan: 'Hardware Security',
    kelas: 'K-43',
    entity_type: 'TARUNA',
    allowed_roles: ['PENGUSUL'],
  },
  {
    nip_npm: '2423102007',
    nama_lengkap: 'Boyke Charish',
    gelar: null,
    prodi: 'Rekayasa Keamanan Siber',
    kelompok_keilmuan: 'Keamanan Jaringan & Sistem',
    kelas: 'Tingkat III / Kelas Siber',
    entity_type: 'TARUNA',
    allowed_roles: ['PENGUSUL'],
  },
];

/**
 * Mencari data master berdasarkan NIP atau NPM
 */
export function findMasterEntity(nip_npm: string): MasterEntity | null {
  const cleanId = nip_npm.trim().toLowerCase();
  return (
    MASTER_SDM_SIAKAD.find((m) => m.nip_npm.toLowerCase() === cleanId) || null
  );
}

export interface MasterEligibilityResult {
  eligible: boolean;
  reason?: string;
  masterData?: MasterEntity;
}

/**
 * Validasi Kelayakan Registrasi & Anti-Klaim Peran Ilegal (Kontrol 2.3.1)
 */
export function verifyMasterRegistrationEligibility(
  nip_npm: string,
  roleType: 'TARUNA' | 'DOSEN_PENGUSUL' | 'REVIEWER' | 'KAPRODI'
): MasterEligibilityResult {
  const master = findMasterEntity(nip_npm);

  // 1. Verifikasi keberadaan di Master SDM / Siakad
  if (!master) {
    return {
      eligible: false,
      reason: `NIP/NPM '${nip_npm}' tidak terdaftar dalam basis data Master SDM / Siakad Poltek SSN. Hubungi Bagian Administrasi Akademik.`,
    };
  }

  // 2. Proteksi Anti-Eskalasi: Taruna DILARANG mengklaim peran struktural/reviewer
  if (master.entity_type === 'TARUNA') {
    if (roleType === 'KAPRODI' || roleType === 'REVIEWER') {
      return {
        eligible: false,
        reason: `Akses ditolak: Identitas '${nip_npm}' tercatat sebagai Taruna/Mahasiswa di Siakad dan dilarang mengklaim peran Dosen/Reviewer/Kaprodi.`,
      };
    }
  }

  // 3. Dosen/Pegawai DILARANG mendaftar sebagai Taruna
  if (master.entity_type === 'DOSEN' && roleType === 'TARUNA') {
    return {
      eligible: false,
      reason: `Akses ditolak: NIP '${nip_npm}' tercatat sebagai Dosen di Master SDM dan tidak dapat mendaftar sebagai Taruna.`,
    };
  }

  // 4. Periksa apakah peran diizinkan untuk Dosen tersebut
  if (roleType === 'KAPRODI' && !master.allowed_roles.includes('KAPRODI')) {
    return {
      eligible: false,
      reason: `Akses ditolak: NIP '${nip_npm}' tidak memiliki penugasan aktif sebagai Ketua Program Studi di Master SDM.`,
    };
  }

  if (roleType === 'REVIEWER' && !master.allowed_roles.includes('REVIEWER')) {
    return {
      eligible: false,
      reason: `Akses ditolak: NIP '${nip_npm}' tidak terdaftar dalam SK Penelaah/Reviewer resmi di Master SDM.`,
    };
  }

  return {
    eligible: true,
    masterData: master,
  };
}
