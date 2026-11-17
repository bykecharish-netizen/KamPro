# SIM-PKM Poltek SSN — Design Tokens & UI Architecture Guide

Dokumen ini merupakan spesifikasi token desain, konfigurasi tipografi, palet warna, layout grid, dan arsitektur komponen yang diekstrak secara presisi dari artefak desain Stitch:
- **Project ID**: `12761714142751520956` (Poltek SSN SIM-PKM Portal)
- **Screen ID**: `73ad8a0e497f4eb08b9a6a2437ea11b5`
- **Screen Title**: `SIM-PKM Poltek SSN — Unified Portal, Login & Role Dashboard`
- **Source Files**: 
  - [unified-portal.html](file:///c:/SEMESTER%205/KEAMANAN%20PEMROGRAMAN/AplikasiKeamananPemrograman/docs/stitch/unified-portal.html)
  - [unified-portal.png](file:///c:/SEMESTER%205/KEAMANAN%20PEMROGRAMAN/AplikasiKeamananPemrograman/docs/stitch/unified-portal.png) / [unified-portal.jpg](file:///c:/SEMESTER%205/KEAMANAN%20PEMROGRAMAN/AplikasiKeamananPemrograman/docs/stitch/unified-portal.jpg)

---

## 1. Tipografi & Font Configuration

### Google Fonts CDN
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

### Font Families
| Token | Nama Font | Fallback | Penggunaan Utama | Bobot (Weights) |
|---|---|---|---|---|
| `font-sans` | **Plus Jakarta Sans** | `sans-serif` | Body text, headings, buttons, label | 400, 500, 600, 700, 800 |
| `font-mono` | **JetBrains Mono** | `monospace` | NIP/NIM badges, kode proposal, status ASVS, metadata, timeline dates | 400, 500, 600, 700 |

### Tailwind CSS Font Family Configuration
```javascript
fontFamily: {
  sans: ['"Plus Jakarta Sans"', 'sans-serif'],
  mono: ['"JetBrains Mono"', 'monospace'],
}
```

---

## 2. Iconography (Google Material Symbols)

### CDN Link
```html
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
```

### CSS Variation Settings
```css
.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20;
  vertical-align: middle;
}
```

### Katalog Ikon Utama
- **Navigasi & Status**: `arrow_forward`, `arrow_back`, `close`, `download`, `file_download`, `event`
- **Keamanan & Otorisasi**: `security`, `lock`, `lock_clock`, `lock_reset`, `verified_user`, `verified`, `badge`
- **Peran & Dashboard**:
  - Taruna: `assignment`, `add_circle`, `menu_book`, `note_add`, `rate_review`
  - Dosen: `verified`, `history`, `visibility`
  - Reviewer: `fact_check`, `rule`
  - Admin: `admin_panel_settings`, `group_add`, `tune`
- **Form & Input**: `visibility`, `visibility_off`, `error`

---

## 3. Palet Warna & Token Visual (Color Palette)

### Warna Institusional Resmi (Poltek SSN Palette)
| Token | Hex Code | Deskripsi & Konteks Penggunaan |
|---|---|---|
| `poltek.navy` | `#0F172A` | Slate 900 gelap, warna tombol autentikasi utama, header kartu skema RE |
| `poltek.deep` | `#061E45` | Biru tua siber pekat, background dasar body dan fondasi kanvas portal |
| `poltek.sky` | `#0284C7` | Sky 600 aksen aktif, border aktif sidebar, badge PKM-KC, highlight tombol |
| `poltek.cyan` | `#06B6D4` | Cyan 500 siber terang, aksen subtitle, border skema PKM-PI |
| `poltek.gold` | `#D97706` | Amber 600 aksen emas, peringatan kuota, status terkunci, skema PKM-K |

### Tailwind Config Object
```javascript
colors: {
  poltek: {
    navy: '#0F172A',
    deep: '#061E45',
    sky: '#0284C7',
    cyan: '#06B6D4',
    gold: '#D97706',
  }
}
```

### Backgrounds & Gradients
- **Full-bleed Sovereign Background**:
  - Base: `#061E45`
  - Gradient: `bg-gradient-to-b from-[#0B1E3B] via-[#081528] to-[#040C18]`
- **Top Testing Bar**:
  - `bg-slate-950/90 text-white backdrop-blur-md border-b border-sky-500/20`
- **Institutional Topbar / Header**:
  - `bg-slate-900/80 backdrop-blur-md border-b border-white/10`
- **Main Editorial Card (Glassmorphic)**:
  - `bg-white/95 backdrop-blur-xl rounded-t-3xl border border-white/70 shadow-[0_-12px_45px_rgba(6,30,69,0.18)]`
  - Top Hairline Accent: `bg-gradient-to-r from-sky-500 via-cyan-400 to-indigo-600` (tinggi 3px)
- **Login Floating Card (Asymmetric Right)**:
  - `bg-white/95 backdrop-blur-2xl rounded-3xl shadow-[0_25px_60px_rgba(6,30,69,0.35)] border border-white/80`
- **OWASP ASVS Access Control Boundary Locked Card**:
  - `bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950 border border-slate-800 text-white`

### Skema Warna Bidang PKM
| Skema PKM | Nama Skema | Border Color | Badge BG | Badge Text | Lab / Fokus |
|---|---|---|---|---|---|
| **PKM-KC** | Karsa Cipta | `#0284C7` (Sky) | `bg-sky-50` | `text-sky-700` | Lab Kriptografi |
| **PKM-RE** | Riset Eksakta | `#0F172A` (Navy) | `bg-slate-100` | `text-slate-800` | Lab Siber |
| **PKM-PI** | Penerapan Iptek | `#06B6D4` (Cyan) | `bg-cyan-50` | `text-cyan-700` | Mitra Siber Desa |
| **PKM-K** | Kewirausahaan | `#D97706` (Gold) | `bg-amber-50` | `text-amber-700` | Inkubator Siber |

---

## 4. Layout Grid & Tata Letak Responsif

### Struktur Hierarki Layar
```text
┌────────────────────────────────────────────────────────────────────────┐
│ Interactive Dev & ASVS Testing Bar (Fixed Top 0, font-mono text-xs)    │
├────────────────────────────────────────────────────────────────────────┤
│ Transparent Top Header Navigation (Fixed Top 7, h-16, backdrop-blur)   │
├────────────────────────────────────────────────────────────────────────┤
│ Hero Stage (Reserved Top 42vh, Badge Siber, Judul Portal, Tagline)    │
├────────────────────────────────────────────────────────────────────────┤
│ Main Editorial White Card Container (max-w-6xl mx-auto)                │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Hero Banner Image (w-full h-80 sm:h-80 lg:h-96, overlay gradient)   │ │
│ ├────────────────────────────────┬───────────────────────────────────┤ │
│ │ ASIDE: Sidebar Nav (3 Cols)    │ MAIN: Content Area (9 Cols)       │ │
│ │ - Institutional Emblem Header  │ - Split Section Header            │ │
│ │ - Context-Aware Nav Links      │ - Key Indicators Strip (4 Metric) │ │
│ │ - Bottom Info & Panduan Button │ - Skema & Kuota Grid (4 Cards)    │ │
│ │                                │ - ASVS Locked Boundary Card       │ │
│ │                                │ - Linimasa Seleksi Grid (4 Steps) │ │
│ │                                │ - Institutional Micro Footer      │ │
│ └────────────────────────────────┴───────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### 12-Column Grid Split
- **Desktop (`lg`)**:
  - Sidebar: `lg:col-span-3` (padding `p-6`, background `bg-slate-50/50`, border-r `border-slate-200/80`)
  - Content: `lg:col-span-9` (padding `p-6 lg:p-8`, flex-col justify-between)
- **Mobile / Tablet**:
  - Sidebar menumpuk di atas (`col-span-1 border-b border-slate-200/80`)
  - Content di bawahnya

---

## 5. Spesifikasi Gateway Autentikasi (`/login`)

### Posisi Asimetris
- Layout: `flex items-center justify-end px-4 sm:px-8 lg:px-20 py-24`
- Lebar Kartu: `w-full max-w-[460px]`
- Posisi kartu di sisi kanan mempertahankan 60% sisi kiri agar ilustrasi siber, logo, dan bendera institusi tetap terlihat jelas.

### Komponen Form Login
1. **Role Selector Tabs (4 Tab Segmented Control)**:
   - Container: `grid grid-cols-4 gap-1 p-1 bg-slate-100/90 rounded-xl`
   - Active Tab: `bg-white text-sky-700 font-semibold shadow-sm`
   - Inactive Tab: `text-slate-600 hover:text-slate-900`
   - Tab Roles: `Taruna`, `Dosen`, `Reviewer`, `Admin`
2. **Dynamic Identity Label & Placeholder**:
   - Taruna: `NIM (Nomor Induk Mahasiswa)` → placeholder `Masukkan NIM (contoh: 2120014)`
   - Non-Taruna: `NIDN / NIP` → placeholder `Masukkan NIDN atau NIP`
3. **Password Input**:
   - Tipe dinamis (`password` / `text`) dengan ikon `visibility` / `visibility_off`
   - Link `Lupa kata sandi?` membuka modal pemulihan anti-enumerasi
4. **Session Hygiene Checkbox (ASVS V3.2)**:
   - Label: `Ingat sesi ini di perangkat ini`
   - Subtext peringatan: `Hindari mengaktifkan pada komputer laboratorium/bersama.`
5. **Tombol Submit Otentikasi**:
   - `bg-[#0F172A] hover:bg-slate-800 text-white font-semibold rounded-xl` dengan ikon `verified_user`
6. **Demo Quick-Fill Buttons (Evaluator Access)**:
   - Taruna (`2120014`), Dosen Pembimbing (`198103142008121002`), Reviewer (`197908222005011003`), Admin PPM (`198506192010121001`)

### Standar Keamanan OWASP ASVS pada UI Login
- **ASVS V2.2.2 (Anti-Enumeration Error)**:
  - Banner merah (`bg-rose-50 border-rose-200 text-rose-800`)
  - Pesan seragam: `"Kredensial atau peran yang dipilih tidak valid. Silakan periksa kembali."` (tidak membedakan apakah username atau password yang salah).
- **ASVS V2.2.1 (Brute-Force Rate Limiting & Lockout)**:
  - Muncul setelah 5x percobaan gagal: banner kuning (`bg-amber-50 border-amber-200 text-amber-900`)
  - Countdown aktif: `"Sistem terkunci selama X detik demi keamanan akun institusi."`
  - Tombol submit dinonaktifkan (`disabled`, `opacity-50 cursor-not-allowed`).

---

## 6. Spesifikasi Modal & Dialog

### 1. Modal Pemulihan Kata Sandi (`#forgot-modal`)
- Container: `bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl`
- Input: `Identitas Taruna/Pegawai`
- Anti-Enumeration Feedback (`#forgot-success-box`):
  - `"Permintaan Terkirim (ASVS V2.5): Jika identitas terdaftar, instruksi pemulihan berbatas waktu telah dikirim ke email institusi Anda."`

### 2. Modal Panduan & Pedoman PKM 2026 (`#guidance-modal`)
- Container: `bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl`
- File Items:
  1. Buku Panduan Teknis PKM Internal Poltek SSN 2026 (`PDF • 3.4 MB`)
  2. Format Lembar Pengesahan Resmi (`ZIP • 1.1 MB • LaTeX & DOCX`)
  3. Pedoman Rubrik Penilaian Reviewer Internal (`PDF • 1.8 MB`)

### 3. Modal Formulir Pengajuan Usulan Baru (`#proposal-modal`)
- Container: `bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl`
- Fields:
  - Skema PKM (Select: PKM-KC, PKM-RE, PKM-PI, PKM-K)
  - Judul Proposal (Input Text)
  - Dosen Pembimbing (Select Dosen)
  - Berkas Draft Proposal (.PDF maks 10MB)

---

## 7. Aset Eksternal & Gambar

| Aset | URL Tersemat |
|---|---|
| **Logo Resmi Poltek SSN** | `https://lh3.googleusercontent.com/aida-public/AB6AXuARYfXaAwCGtJHkMtFS-XKajJdyl12tmIb3mHc0mKSvDs2Fl5rCss5BPgDnLpSKiaGZiERJdjEQ4g6gTxkBqfYUy-KySh3TbkDSyKewIaGU4wsxUYn3zwK0wHvBOeNKYhC0Zoqi4FQEC_t9abgIei8-D5i_GCK2B-D4h3AtPNrk7eAhBjZWilne9fjOwbGImDuQ8hZEOKdxY-ZBU4t-z8fhP6EDJmY_gOpGdh9CzGQSEh3CS7_PhC7j2g` |
| **Hero Illustration (Pengabdian Siber)** | `https://lh3.googleusercontent.com/aida-public/AB6AXuAEtbtQqXVBDqoPkQ1iP1YCf7OwgItwzjWaPJdCR7nX4TExTfLajHv_1bX9A3nQJVrnZ5Vl6aum5-nQW45GyBpWXW4wp8S9qfwDfshnGePRacvO7O_gKMjpUDuPgKZPqBc3wpzkabYBEqKMCV6FRG8NlDCNssWUuPHrJ7p7hW28O2oBKnUPFptudH5a6FjjYgcKGDpI5eWoS7ckxgFul06jCcvG9uzihT3KInJvdlWdQNKDXoUm0Bt1Mg` |

---

## 8. Pemetaan Integrasi ke Next.js (App Router)

### Rencana Dekomposisi Komponen
1. **`src/app/globals.css`**:
   - Definisikan custom colors (`--color-poltek-navy`, `--color-poltek-deep`, dll.)
   - Font variation settings untuk Material Symbols
   - Custom scrollbar styling
2. **`src/components/layout/AppHeader.tsx`**:
   - Top Testing / Dev ribbon
   - Header navigasi dengan logo Poltek SSN, badge versi `v2.6-PROD`, navigasi publik, dan tombol CTA Masuk
3. **`src/components/layout/SidebarNav.tsx`**:
   - Dynamic sidebar navigation berdasarkan peran aktif (`PENGUSUL`, `KAPRODI`, `REVIEWER`, `KA_PPM`, `DIREKTUR`, `ADMIN`)
4. **`src/components/auth/LoginCard.tsx`**:
   - Form otentikasi terhubung dengan API endpoint `POST /api/auth/login`
   - Role selector tab yang otomatis menyesuaikan active_role saat login
   - Rate limiting alert visual terhubung dengan header `Retry-After` / in-memory store
5. **`src/components/dashboard/`**:
   - `TarunaView.tsx` (Status tahapan stepper, proposal tim saya, catatan pembimbing)
   - `DosenView.tsx` (Persetujuan bimbingan, tabel proposal antrean)
   - `ReviewerView.tsx` (Tugas telaah rubrik 7 kriteria, isolasi skor)
   - `AdminView.tsx` (Distribusi kuota, plotting reviewer, verifikasi berkas)
6. **`src/components/modals/`**:
   - `PasswordRecoveryModal.tsx`
   - `GuidanceDownloadModal.tsx`
   - `NewProposalModal.tsx`
