# Product Requirements Document (PRD)

## Sistem Informasi Manajemen Penelitian dan Pengabdian kepada Masyarakat (SIM-PPM / PKM) — Politeknik Siber dan Sandi Negara

## 1. Ringkasan Produk & Fokus Integrasi

Aplikasi web berbasis peran (*Role-Based Access Control*) untuk mengelola siklus pengajuan proposal, validasi berjenjang, penilaian penelaah, hingga penetapan pendanaan PKM/PPM sesuai ketentuan Perdir Poltek SSN Nomor 1 Tahun 2025 dengan standar keamanan **OWASP ASVS v5.0.0 Level 1**.

* **Fokus Pengembangan**: Mengintegrasikan desain antarmuka (UI) yang sudah ada dengan logika autentikasi, manajemen sesi, otorisasi peran (*RBAC*), dan aturan bisnis alur kerja aplikasi (*tanpa perancangan skema database*).
* **Standar Keamanan**: OWASP ASVS Level 1 (autentikasi sesi aman, validasi otorisasi sisi server pada setiap *request*, dan isolasi data antarperan).
* **Penyederhanaan Fungsional**:
  * Integrasi SSO eksternal disederhanakan menjadi login lokal berbasis NIP/NPM atau email dinas.
  * Integrasi TTE BSrE disederhanakan menjadi persetujuan digital internal (konfirmasi ulang kata sandi saat mengesahkan dokumen) yang menghasilkan tanda QR validasi dan jejak *audit log*.

## 2. Spesifikasi Identitas, Login, & Manajemen Sesi

Modul autentikasi memastikan pengguna masuk secara aman sekaligus mengotomatiskan pengisian profil akademik dan kepegawaian pada komponen formulir yang sudah tersedia.

1. **Identitas Unik Internal**: Pengguna masuk menggunakan `NIP`, `NPM`, atau email dinas yang dipetakan ke `user_id` internal permanen agar riwayat pekerjaan tidak tertukar saat data profil diperbarui.
2. **Standar Kata Sandi & Hashing**:
   * Panjang kata sandi minimal 8 karakter (disarankan 15+ karakter) dan dicek terhadap daftar kata sandi umum/bocor.
   * Kata sandi diproses menggunakan fungsi *one-way salted hash* `bcrypt` (`cost` $\ge 10$) atau `Argon2id`.
   * Kredensial dikirim melalui metode `HTTP POST`.
3. **Mitigasi Brute Force & Enumerasi Akun**:
   * Pesan kesalahan login disamakan menjadi: *"NIP/NPM atau kata sandi salah"*.
   * Pembatasan laju percobaan (*rate limiting*) maksimal 5 kali percobaan gagal per 15 menit.
4. **Manajemen Tiket Sesi**:
   * Server menerbitkan `Session ID` acak minimal 128-bit (CSPRNG) baru setiap kali login berhasil untuk mencegah *Session Fixation*.
   * Disimpan dalam cookie beratribut `HttpOnly`, `Secure`, dan `SameSite=Lax`.
   * Batas waktu diam (*idle timeout*) 30 menit dan pemutusan sesi seketika saat pengguna *logout* atau akun dinonaktifkan.
5. **Auto-Fill Profil Master**:
   * Atribut Nama Lengkap, Gelar, NIP/NPM, Prodi, Kelompok Keilmuan, dan Kelas ditarik otomatis ke formulir proposal dan pencarian anggota tim dengan status baca-saja (*read-only*).
   * Atribut Nomor HP dapat diperbarui secara mandiri oleh pengguna dan wajib tervalidasi sebelum pengajuan.
6. **Satu Akun Multi-Peran (*Role Switcher*)**:
   * Pengguna yang memiliki lebih dari satu peran (misalnya Dosen Pengusul sekaligus Kaprodi atau Reviewer) cukup menggunakan satu akun dan berpindah konteks peran melalui komponen *Role Switcher* di bilah navigasi atas (*topbar*).

## 3. Matriks Peran & Kewenangan (RBAC)

| Peran (*Role*) | Kewenangan Utama (*Permissions*) | Batasan Kewenangan (*Restrictions*) |
| :--- | :--- | :--- |
| **Pengusul** *(Dosen / Taruna / Tendik)* | Mengajukan proposal baru, memilih anggota tim via NIP/NPM, memantau progres berkas miliknya sendiri, mengunggah laporan, dan mengunggah revisi jika skor evaluasi $< 60$. | Tidak dapat melihat proposal milik pengusul lain di luar timnya; tidak dapat menyetujui atau menilai proposal. |
| **Ketua Program Studi (Kaprodi)** | Melihat daftar usulan dari program studinya sendiri dan memberikan validasi kesesuaian Capaian Pembelajaran Lulusan (CPL). | Tidak dapat melihat atau memvalidasi usulan dari program studi lain. |
| **Kepala / Pengelola Pusat PPM** | Memverifikasi kelengkapan administrasi, menerbitkan Nomor Agenda dan Nomor Registrasi otomatis (`PL`, `OK-PK`, `OK-PP`, `OK-PKP`, `OK-PRP`), menunjuk Reviewer 1–3, dan merekap skor akhir. | Tidak dapat mengubah hasil skor yang sudah dikunci oleh Reviewer. |
| **Penelaah / Reviewer (1, 2, 3)** | Mengisi skor penilaian dan catatan telaah pada formulir evaluasi (`FO-018` / `FO-021`) untuk berkas yang ditugaskan kepadanya serta mengesahkan hasil penilaian. | Tidak dapat melihat identitas pengusul saat tahap Proposal (*blind review*) dan tidak dapat melihat skor Reviewer lain sebelum rekapitulasi. |
| **Direktur / Pimpinan** | Mengesahkan penetapan pendanaan akhir dan mengeksekusi penugasan langsung (*bypass top-down*) untuk penelitian strategis. | Fitur *bypass* wajib disertai pengisian alasan kebijakan tertulis yang tercatat permanen di *audit log*. |
| **Admin Sistem** | Mengelola registrasi akun baru, mengatur penempatan prodi dan multi-peran, menonaktifkan akun keluar, serta memantau *audit log*. | Dilarang melihat atau menetapkan kata sandi pengguna secara langsung; dilarang menghapus atau mengubah rekaman *audit log*. |

## 4. Aturan Bisnis & Keamanan Backend (*Guardrails*)

Setiap *endpoint* API atau *service layer* wajib menegakkan aturan berikut di sisi server:

* **Validasi Otorisasi Server (*Default Deny*)**: *Middleware* backend wajib memeriksa tiket sesi dan peran aktif pada setiap *request*. Permintaan yang tidak sesuai kewenangan langsung ditolak dengan status `403 Forbidden`.
* **Isolasi Data (Anti-IDOR / BOLA)**: Penyaringan data di server wajib terikat pada identitas sesi aktif (Pengusul hanya mengakses berkas timnya, Kaprodi hanya mengakses berkas prodinya, dan Reviewer hanya mengakses berkas yang ditugaskan kepadanya).
* **Pencegahan Konflik Kepentingan Otomatis**: Sistem wajib memblokir penunjukan maupun akses baca/nilai apabila `NIP` Reviewer tercatat sebagai Ketua atau Anggota Tim pada berkas usulan terkait.
* **Blind Review Otomatis**: Pada tahap `PROPOSAL` (`FO-016` / `FO-019`), respons API menyembunyikan nama pengusul, NIP/NPM, dan metadata dokumen dari antarmuka Reviewer. Identitas pengusul baru dibuka pada tahap `LAPORAN` (`FO-023` / `FO-018`).
* **Isolasi Nilai & Pembatasan Properti (Anti-BOPLA)**:
  * Skor dari Reviewer 1, 2, dan 3 diisolasi sehingga tidak saling terlihat sebelum seluruh penelaah mengunci penilaian.
  * Gunakan *allowlist* pada *payload* input agar pengguna tidak dapat memanipulasi atribut `role` atau `status` melalui pengiriman data langsung.
* **Pencatatan Audit Log Permanen**: Mencatat waktu standar `UTC`, `actor_id`, `active_role`, `ip_address`, `action_type`, dan `status_code` untuk peristiwa login, gagal akses, validasi CPL, penilaian, *bypass* Direktur, serta perubahan akun tanpa pernah menyimpan kata sandi atau token sesi.

## 5. Rencana Integrasi Desain UI Existing

Hubungkan aset dan halaman antarmuka yang sudah tersedia dengan state aplikasi dan aturan otorisasi berikut:

1. **Integrasi Halaman Login**:
   * Sambungkan form login yang ada ke endpoint autentikasi `POST`.
   * Tampilkan pesan kesalahan generik dari server tanpa membocorkan status terdaftar/tidaknya akun.
2. **Integrasi Navigasi & Topbar**:
   * Ikat menu pada **Sidebar Kiri** agar merender item navigasi secara kondisional sesuai peran yang sedang aktif.
   * Aktifkan komponen **Role Switcher** di *topbar* untuk pengguna multi-peran agar dapat mengganti konteks sesi secara instan dan memperbarui tampilan dasbor.
   * Hubungkan profil pengguna pada **Banner Sapaan** agar menampilkan nama, gelar, dan peran aktif dari data sesi.
3. **Integrasi Dasbor & Komponen Tugas Saya**:
   * Ikat **3 Kartu Ringkasan Metrik** (*Menunggu Tindakan*, *Sedang Diproses*, *Selesai*) dengan data berkas yang sudah difilter sesuai kewenangan peran aktif.
   * Integrasikan **Tabel Daftar Pekerjaan** (tab filter, Nomor Agenda/Registrasi, bilah progres tahapan) dengan tombol aksi kontekstual:
     * *Pengusul*: Tombol `Unggah Revisi` hanya muncul jika status evaluasi mengembalikan skor rata-rata $< 60$.
     * *Kaprodi*: Tombol `Validasi CPL` pada berkas berstatus menunggu validasi prodi.
     * *Ka. Pusat PPM*: Tombol `Terbitkan No. Registrasi` dan `Tunjuk Reviewer`.
     * *Reviewer*: Tombol `Nilai Berkas` dengan tampilan anonim pada tahap proposal.
     * *Direktur*: Tombol `Tetapkan Pendanaan` dan modal `Penugasan Langsung (Bypass)` dengan input alasan wajib.

## 6. Urutan Eksekusi Vibecoding

Lakukan integrasi kode secara bertahap dalam empat iterasi berikut:

1. **Iterasi 1 — Autentikasi & Data Mock Sesi**: Sambungkan halaman login yang sudah ada dengan mekanisme autentikasi (`bcrypt`, cookie sesi `HttpOnly`, *rate limiting*, *idle timeout* 30 menit) menggunakan data *mock* in-memory untuk keenam peran (termasuk 1 akun Dosen multi-peran).
2. **Iterasi 2 — Integrasi Sidebar, Topbar Role Switcher, & Middleware RBAC**: Hubungkan komponen sidebar dan *Role Switcher* di desain yang sudah ada dengan state sesi aktif, serta pasang *middleware* penjaga rute (`403 Forbidden`).
3. **Iterasi 3 — Integrasi Alur Pengajuan, Auto-Fill, & Validasi Berjenjang**: Hubungkan formulir pengajuan (*auto-fill* profil & cari anggota via NIP/NPM) serta tabel *Tugas Saya* dengan aksi validasi CPL Kaprodi dan penerbitan Nomor Registrasi otomatis (`PL`, `OK-PK`, `OK-PP`, `OK-PKP`, `OK-PRP`) oleh Ka. Pusat PPM.
4. **Iterasi 4 — Blind Review, Revisi ($< 60$), Bypass Direktur, & Audit Log**: Integrasikan penyamaran identitas pada mode Reviewer tahap proposal, isolasi skor antar-Reviewer, pembukaan tombol revisi otomatis jika skor $< 60$, fitur *bypass* Direktur beserta alasan wajib, dan tampilan riwayat *Audit Log* untuk Admin.