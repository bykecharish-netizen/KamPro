# SIM-PKM Poltek SSN — Login Page Design Tokens & UI Architecture Guide

Dokumen ini merupakan catatan presisi mengenai token desain, konfigurasi tipografi, palet warna, struktur komponen kartu login, dan aset gambar yang diekstrak langsung dari artefak desain Stitch:
- **Project ID**: `12761714142751520956` (Poltek SSN SIM-PKM Portal)
- **Screen ID**: `91b6870934d54ac5871134250db05a17`
- **Screen Title**: `SIM-PKM Poltek SSN — Halaman Masuk`
- **Source Files**:
  - [login-page.html](file:///c:/SEMESTER%205/KEAMANAN%20PEMROGRAMAN/AplikasiKeamananPemrograman/docs/stitch/login-page.html)
  - [login-page.png](file:///c:/SEMESTER%205/KEAMANAN%20PEMROGRAMAN/AplikasiKeamananPemrograman/docs/stitch/login-page.png) / [login-page.jpg](file:///c:/SEMESTER%205/KEAMANAN%20PEMROGRAMAN/AplikasiKeamananPemrograman/docs/stitch/login-page.jpg)

---

## 1. Tipografi & Font Configuration

### Google Fonts CDN
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

### Font Families
| Token | Nama Font | Fallback | Penggunaan | Bobot (Weights) |
|---|---|---|---|---|
| `font-sans` | **Plus Jakarta Sans** | `sans-serif` | Body text, headings, label, placeholder, CTA button | 400, 500, 600, 700, 800 |
| `font-mono` | **JetBrains Mono** | `monospace` | Input NIM/NIDN, countdown lockout, status pill, recovery input | 400, 500, 600 |

---

## 2. Palet Warna & Token Visual (Color Palette)

### Warna Institusional Resmi
| Token | Hex Code | Deskripsi & Penggunaan |
|---|---|---|
| `ssn.navy` | `#061E45` | Biru tua siber institusional, latar belakang kanvas body & pill header |
| `ssn.dark` | `#0F172A` | Slate 900 gelap, warna tombol submit login utama & tab aktif peran |
| `sky-500` / `sky-600` | `#0EA5E9` / `#0284C7` | Aksen fokus border input, ring fokus, link bantuan, icon recovery |
| `emerald-400` / `emerald-600` | `#34D399` / `#059669` | Indikator status online (pulsing dot) & status konfirmasi pemulihan |
| `amber-50` / `amber-800` | `#FFFBEB` / `#92400E` | Banner lockout brute-force rate-limiting (ASVS V2.2.1) |
| `red-50` / `red-700` | `#FEF2F2` / `#B91C1C` | Banner error anti-enumerasi (ASVS V2.2.2) |

---

## 3. Aset Gambar & Media

| Aset | Deskripsi & URL Tersemat |
|---|---|
| **Latar Belakang Siber Resolusi Tinggi** | Foto institusi/siber dengan orientasi asimetris kanan: <br>`https://lh3.googleusercontent.com/aida-public/AB6AXuDGAzg57VPPh_u8BDd1Na8uTEcURGhPkbvElhaj2aW9cad4MK4co1ZLP82ylAHSDOb0MJ1E8cnkyiivNUOJX2JAOH_QXeLGTLVSAU4nWtiZvmsdiUwevbNwOezvRkIIu1BV_upbv5UZ7HsxQQLCTV3NCOaFzRIcy860OyGExwO--2O84_mEkT_8wmK6wtIfS1YklxcrqP9_gMmeHWSAkbJ3JyVZUy2ceEdZwhfYkfQ3W5R2w8dTuRLcbA` |
| **Logo Resmi Poltek SSN** | Lambang resmi institusi (w-11 h-11 object-contain): <br>`https://lh3.googleusercontent.com/aida-public/AB6AXuD5RTdwx26o6DLl9b8fQu2mMbPNtnAPiT9pLP9ikUEFL1tmVBA7im5bww_EfcmudoatKXPeyJywBXCMo6iZ8udjXsvjPUrLpmNMV24AZ11S9ffp-QZLa8MF8UTyhKHyWGgBYlb3UssdEGVz-OKD5nTFnbjOj2HhDVREvSru0YW8XhkIgyfvYwYZNdOavBlcTvo18o_fst4ctKupu9V947UJ1h-CFKMUg95xFQ7hraEWN5s-Yp5Ce0X6zA` |

---

## 4. Struktur Komponen & Layout Grid

### Tata Letak Asimetris Layar
```text
┌────────────────────────────────────────────────────────────────────────┐
│ [← Kembali ke Beranda]                   [● STATUS: ONLINE • TAHUN 2026]│
│                                                                        │
│                                                                        │
│   (Kanvas Visual Ilustrasi Siber              ┌──────────────────────┐ │
│    Poltek SSN Bebas Halangan 60%)             │ KARTU LOGIN KACA     │ │
│                                               │ - Logo & Brand       │ │
│                                               │ - Tab 4 Peran        │ │
│                                               │ - Alert ASVS         │ │
│                                               │ - Input NIM / NIDN   │ │
│                                               │ - Input Password     │ │
│                                               │ - Checkbox Hygiene   │ │
│                                               │ - Tombol Masuk       │ │
│                                               │ - Footer TLS         │ │
│                                               └──────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### Rincian Komponen Utama
1. **Header Bar Melayang**:
   - Class: `absolute top-6 left-6 right-6 z-20 flex justify-between items-center pointer-events-auto`
   - Tombol Kiri: `inline-flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-full bg-[#061E45]/75 backdrop-blur-md border border-white/25 text-white text-xs font-medium hover:bg-[#061E45] transition shadow-sm group`
   - Pill Kanan: `inline-flex items-center gap-2 whitespace-nowrap px-4 py-2 rounded-full bg-[#061E45]/75 backdrop-blur-md border border-white/25 text-white text-xs font-mono shadow-sm`
2. **Glassmorphic Login Card**:
   - Class: `w-full max-w-[420px] bg-white/95 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_rgba(6,30,69,0.18)] rounded-2xl p-7 sm:p-8 transition-all`
   - Padding & Radius: `rounded-2xl p-7 sm:p-8`
3. **Role Selector Tabs (Segmented Control)**:
   - Container: `bg-slate-100 p-1 rounded-xl grid grid-cols-4 gap-1 mb-1`
   - Active Tab: `bg-[#0F172A] text-white shadow-sm font-semibold text-xs py-2 rounded-lg text-center transition-all cursor-pointer`
   - Inactive Tab: `text-slate-600 hover:text-slate-900 font-medium text-xs py-2 rounded-lg text-center transition-all cursor-pointer`
   - Label Dinamis:
     - `taruna`: `NIM (Nomor Induk Mahasiswa)` (placeholder: `Masukkan NIM (contoh: 2120014)`)
     - `dosen` / `reviewer` / `admin`: `NIDN / NIP` (placeholder: `Masukkan NIDN atau NIP`)
4. **Input Fields dengan Ikon SVG Sisi Kiri**:
   - Class Input: `w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm bg-white hover:bg-white focus:bg-white border border-slate-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 rounded-xl outline-none text-slate-800 placeholder:text-slate-400 transition-all font-mono`
   - Ikon Sisi Kiri: `absolute left-3.5 pointer-events-none text-slate-400`
   - Tombol Mata (Toggle Password): `absolute right-3.5 text-slate-400 hover:text-slate-600`
5. **Session Hygiene Checkbox (OWASP ASVS V3.2 & V3.3)**:
   - Checkbox: `w-4 h-4 mt-0.5 rounded text-sky-600 focus:ring-sky-500 border-slate-300`
   - Label: `Ingat sesi ini di perangkat ini`
   - Peringatan: `Jangan aktifkan pada komputer laboratorium atau perangkat bersama.`
6. **Tombol Masuk (CTA Button)**:
   - Class: `w-full mt-3 py-3 px-4 bg-[#0F172A] hover:bg-slate-800 active:scale-[0.99] text-white font-semibold rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`
7. **Footer Keamanan**:
   - Border-top: `border-t border-slate-100 pt-5 mt-6 flex flex-col items-center gap-1.5 text-center`
   - Teks: `🔒 Koneksi Terenkripsi TLS • Direktorat PPM Poltek SSN`
   - Bantuan: `Butuh bantuan akun? Hubungi Admin PPM`
8. **Modal Pemulihan Kata Sandi Anti-Enumerasi (OWASP ASVS V2.5)**:
   - Dialog Backdrop: `fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4`
   - Dialog Card: `relative bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-white/80 animate-fade-in`
   - Input: `Identitas atau Email Institusi` (`Contoh: 2120014 atau nama@poltekssn.ac.id`)
   - Respons Anti-Enumerasi Generik:
     `Permintaan Diterima: Jika identitas atau email terdaftar dalam pangkalan data SIM-PKM, tautan instruksi pemulihan telah dikirimkan ke alamat email dinas Anda.`

---

## 5. Pemetaan Kompatibilitas dengan `src/app/login/page.tsx`

Halaman `src/app/login/page.tsx` yang telah dibangun telah mengimplementasikan seluruh atribut, pola interaksi, dan kelas CSS ini:
- Terhubung langsung dengan `POST /api/auth/login` (mengembalikan uniform error dan menangani lockout rate-limit 429).
- Terintegrasi dengan form toggle password dan modal pemulihan kata sandi anti-enumerasi.
- Kompatibel dengan layout Next.js 16 App Router dan tema Tailwind CSS v4.
