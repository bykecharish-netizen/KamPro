# Tech Stack & Arsitektur Sistem
## Sistem Informasi Manajemen Penelitian dan Pengabdian kepada Masyarakat (SIM-PPM / PKM) — Politeknik Siber dan Sandi Negara

Dokumen ini mendefinisikan tumpukan teknologi (*tech stack*), pustaka wajib, pembagian komponen sistem, dan struktur folder proyek untuk membangun aplikasi **SIM-PPM / PKM Poltek SSN** dengan standar keamanan **OWASP ASVS v5.0.0 Level 1** menggunakan pendekatan *monolith full-stack* yang optimal untuk *vibecoding*.

---

## 1. Tumpukan Teknologi Inti (*Core Tech Stack*)

| Lapisan Sistem | Teknologi / Pustaka | Fungsi Spesifik & Keselarasan OWASP ASVS Level 1 |
| :--- | :--- | :--- |
| **Framework Full-Stack** | **Next.js (App Router)** + **TypeScript** | Menyatukan antarmuka pengguna (*frontend*) dan *Route Handlers* (`/api/*`) sebagai *Trusted Service Layer* dalam satu repositori untuk mencegah inkonsistensi validasi antara tampilan dan server. |
| **Antarmuka (UI/UX)** | **React** + **Tailwind CSS** + **Lucide React** | Mengintegrasikan desain halaman login (`#F7F9FC`), *sidebar* dinamis, *Role Switcher* di *topbar*, dan tabel *Tugas Saya* secara responsif. |
| **Basis Data & ORM** | **PostgreSQL (Supabase)** + **Prisma ORM** | Menyimpan 7 entitas relasional sesuai ERD dan menegakkan *parameterized queries* secara bawaan untuk mencegah *SQL Injection* (ASVS v5.0.0-1.2.4). |
| **Penyimpanan Berkas** | **Supabase Storage (*Private Bucket*)** | Menyimpan dokumen PDF usulan, revisi, dan laporan secara privat; file hanya dapat diakses melalui *Signed URL* berdurasi singkat setelah lolos validasi peran. |
| **Kriptografi & Sesi** | **`bcryptjs`** (`cost` $\ge 12$) + Node.js **`crypto`** | Melakukan *one-way salted hashing* pada kata sandi (ASVS v5.0.0-11.4.2) serta membangkitkan `Session ID` acak minimal 128-bit (CSPRNG) untuk tiket sesi (ASVS v5.0.0-7.2.3). |
| **Validasi Input & DTO** | **`zod`** | Menerapkan skema *allowlist* ketat pada setiap *payload* API untuk mencegah *Mass Assignment* dan menyaring properti respons JSON guna mencegah *BOPLA* (ASVS v5.0.0-15.3.1 & 15.3.3). |
| **Dokumen & Pengesahan** | **`pdf-lib`** + **`qrcode`** | Menghapus metadata penulis/properti dokumen PDF secara otomatis untuk kebutuhan *blind review* serta menghasilkan kode QR validasi pada persetujuan digital internal. |
| **Hosting & Transport** | **Vercel** | Menyediakan enkripsi saluran **HTTPS/TLS** secara otomatis (ASVS v5.0.0-12.1.1) dan variabel lingkungan terisolasi untuk menyimpan kredensial server. |

---

## 2. Arsitektur Komponen Sistem

Sistem dibagi menjadi lima modul utama agar AI coding dapat menghasilkan kode yang terstruktur dan mudah diuji:

### A. Komponen Antarmuka (`src/app/` & `src/components/`)
* **Halaman Login (`/login`)**: Mengirim kredensial NIP/NPM dan kata sandi via `HTTP POST` dan menampilkan pesan gagal seragam tanpa membocorkan status terdaftar tidaknya akun.
* **Portal App Shell (`(portal)/layout.tsx`)**: Merender menu navigasi *sidebar* secara kondisional berdasarkan peran aktif, menampilkan banner sapaan, serta menyediakan komponen **Role Switcher** di *topbar* bagi pengguna multi-peran.
* **Dasbor Tugas Saya (`/dashboard`)**: Menampilkan 3 kartu ringkasan metrik, tab filter status, bilah progres tahapan, Nomor Agenda/Registrasi berhuruf *monospace* (`PL`, `OK-PK`, `OK-PP`, `OK-PKP`, `OK-PRP`), serta tombol aksi sesuai peran aktif.

### B. Komponen Autentikasi & Manajemen Sesi (`src/lib/auth/`)
* **`password.ts`**: Pembungkus fungsi `bcrypt.hash` dan `bcrypt.compare` serta validasi panjang minimal kata sandi (8 karakter, disarankan 15+ karakter).
* **`rate-limit.ts`**: Pembatas laju percobaan login (*throttling*) maksimal 5 kali gagal per 15 menit per kombinasi IP dan NIP/NPM untuk menahan *brute force* tanpa mengunci akun secara permanen.
* **`session.ts`**: Membuat tiket sesi baru setelah login berhasil (*session regeneration* untuk mencegah *Session Fixation*), menyimpannya dalam cookie berflag `HttpOnly`, `Secure`, dan `SameSite=Lax`, serta menegakkan batas diam (*idle timeout*) 30 menit.

### C. Komponen Middleware & Guardrails Otorisasi (`src/lib/rbac/`)
* **`requireRole.ts`**: *Middleware* backend berprinsip *Default Deny* yang memverifikasi sesi dan peran aktif pada setiap permintaan API, lalu menolak akses tidak sah dengan status `403 Forbidden`.
* **`scopeFilter.ts`**: Pembangun filter kueri Prisma otomatis berdasarkan konteks sesi (`ketua_id` untuk Pengusul, `prodi` untuk Kaprodi, `reviewer_id` untuk Reviewer) guna mencegah *IDOR/BOLA*.
* **`coiGuard.ts`**: Validasi konflik kepentingan otomatis yang memblokir penunjukan maupun akses baca/nilai apabila `user_id` Reviewer tercatat sebagai Ketua atau Anggota Tim pada berkas terkait.
* **`dto.ts`**: Penyaring objek respons (*Data Transfer Object*) untuk menyamarkan identitas pengusul saat tahap `PROPOSAL` (*blind review*) dan mengisolasi skor antar-Reviewer (1, 2, 3) sebelum direkap.

### D. Komponen Logika Bisnis & Dokumen (`src/services/`)
* **`profileService.ts`**: Menarik atribut profil master (`nama_lengkap`, `gelar`, `nip_npm`, `prodi`, `kelompok_keilmuan`, `kelas`) secara baca-saja (*read-only*) untuk *auto-fill* formulir serta memvalidasi pembaruan mandiri `no_hp`.
* **`proposalService.ts`**: Mengelola transisi status alur kerja Perdir Poltek SSN No. 1/2025, pembangkitan Nomor Agenda & Nomor Registrasi otomatis, pembukaan akses unggah revisi saat `skor_rata_rata` $< 60$, dan pencatatan alasan wajib pada fitur *bypass* Direktur.
* **`documentService.ts`**: Membersihkan properti metadata PDF menggunakan `pdf-lib` sebelum disimpan ke `sanitized_file_url` serta memvalidasi konfirmasi kata sandi ulang saat pengesahan dokumen ber-QR.

### E. Komponen Audit Log (`src/lib/audit.ts`)
* **`logAuditEvent()`**: Fungsi pencatatan tambah-saja (*append-only*) ke tabel `audit_logs` dengan stempel waktu `UTC`, `actor_id`, `active_role`, alamat IP, jenis aksi, ID target, dan kode status HTTP, dengan larangan keras mencatat kata sandi atau token sesi mentah.

---

## 3. Struktur Direktori Proyek

```text
sim-ppm-poltekssn/
├── prisma/
│   ├── schema.prisma              # Definisi 7 tabel sesuai ERD_SIM_PPM_Poltek_SSN.md
│   └── seed.ts                    # Data awal 6 peran + 1 akun dosen multi-peran
├── src/
│   ├── app/
│   │   ├── login/
│   │   │   └── page.tsx           # Halaman masuk (#F7F9FC)
│   │   ├── (portal)/              # Rute terproteksi setelah autentikasi
│   │   │   ├── layout.tsx         # App Shell (Sidebar dinamis + Topbar + Role Switcher)
│   │   │   ├── dashboard/         # Dasbor Tugas Saya & ringkasan metrik
│   │   │   ├── proposals/         # Pengajuan auto-fill, validasi CPL, & penilaian
│   │   │   └── admin/             # Manajemen akun, penempatan peran, & audit log
│   │   └── api/
│   │       ├── auth/              # login, logout, switch-role, session
│   │       ├── users/             # pencarian anggota NIP/NPM & update no_hp
│   │       ├── proposals/         # CRUD usulan, validasi CPL, registrasi, bypass, revisi
│   │       ├── reviews/           # input skor terisolasi & rekapitulasi
│   │       └── admin/             # manajemen user/role & pembacaan audit_logs
│   ├── components/                # Komponen UI desain yang sudah diintegrasikan
│   ├── lib/
│   │   ├── prisma.ts              # Singleton instance Prisma Client
│   │   ├── auth/                  # password.ts, rate-limit.ts, session.ts
│   │   ├── rbac/                  # requireRole.ts, scopeFilter.ts, coiGuard.ts, dto.ts
│   │   └── audit.ts               # Pencatatan audit log berstandar UTC
│   └── services/                  # profileService.ts, proposalService.ts, documentService.ts
├── .env                           # Variabel rahasia server (tidak di-commit ke Git)
└── next.config.ts                 # Konfigurasi HTTP security headers
```

---

## 4. Konfigurasi Keamanan Dasar (`OWASP ASVS Level 1`)

1. **Variabel Lingkungan (`.env`)**:
   * `DATABASE_URL` & `DIRECT_URL`: Koneksi PostgreSQL Supabase.
   * `NEXT_PUBLIC_SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY`: Akses server-side ke *private bucket* dokumen (kunci *service role* hanya diakses di backend).
   * `SESSION_SECRET`: Kunci rahasia minimal 32 byte acak untuk penandatanganan sesi.
2. **Header Keamanan HTTP (`next.config.ts`)**:
   * Pasang `Cache-Control: no-store` pada seluruh respons `/api/*` agar data sensitif pekerjaan tidak tersimpan di *cache* peramban bersama (ASVS v5.0.0-14.3.2).
   * Aktifkan `X-Content-Type-Options: nosniff` dan `X-Frame-Options: DENY` untuk mencegah *clickjacking* dan *MIME sniffing*.