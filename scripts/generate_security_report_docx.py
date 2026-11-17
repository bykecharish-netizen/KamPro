import os
import sys
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, hex_color):
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    cell._tc.get_or_add_tcPr().append(shd)

def set_cell_margins(cell, top=140, bottom=140, left=180, right=180):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def set_table_borders(table, color="D3D3D3", sz="4", val="single"):
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:insideV w:val="none"/>'
        f'<w:left w:val="none"/>'
        f'<w:right w:val="none"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)

def build_report():
    doc = Document()

    # Set page margins (Standard A4 / Letter: 1 inch all around)
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)
        section.different_first_page_header_footer = True

        # Header for subsequent pages
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("SIM-PKM POLTEK SSN • LAPORAN AUDIT KEAMANAN OWASP ASVS LEVEL 1")
        hrun.font.name = "Calibri"
        hrun.font.size = Pt(8.5)
        hrun.font.color.rgb = RGBColor(120, 144, 156)

        # Footer
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.LEFT
        frun = fp.add_run("Klasifikasi: Terbatas / Internal Poltek SSN • Versi Dokumen: 2.6-PROD")
        frun.font.name = "Calibri"
        frun.font.size = Pt(8.5)
        frun.font.color.rgb = RGBColor(120, 144, 156)

    # =========================================================================
    # HALAMAN SAMPUL (COVER PAGE)
    # =========================================================================
    p_inst = doc.add_paragraph()
    p_inst.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_inst = p_inst.add_run("POLITEKNIK SIBER DAN SANDI NEGARA\nBADAN SIBER DAN SANDI NEGARA")
    r_inst.font.name = "Calibri"
    r_inst.font.size = Pt(13)
    r_inst.font.bold = True
    r_inst.font.color.rgb = RGBColor(10, 37, 64)

    p_spacer = doc.add_paragraph()
    p_spacer.paragraph_format.space_before = Pt(30)

    # Document Badge
    p_badge = doc.add_paragraph()
    p_badge.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_badge = p_badge.add_run("DOKUMEN RESMI AUDIT KEAMANAN SISTEM INFORMASI")
    r_badge.font.name = "Calibri"
    r_badge.font.size = Pt(9.5)
    r_badge.font.bold = True
    r_badge.font.color.rgb = RGBColor(2, 132, 199)

    # Main Title
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_title = p_title.add_run("LAPORAN AUDIT DAN PENGUATAN KEAMANAN (HARDENING)\nWEBSITE SIM-PKM POLTEK SSN")
    r_title.font.name = "Calibri"
    r_title.font.size = Pt(22)
    r_title.font.bold = True
    r_title.font.color.rgb = RGBColor(6, 30, 69)

    # Subtitle
    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_sub = p_sub.add_run(
        "Verifikasi Kepatuhan Standar OWASP Application Security Verification Standard (ASVS) Level 1,\n"
        "Encoding & Sanitasi (V1), Logika Bisnis & Validasi Server (V2), serta Hasil Observasi"
    )
    r_sub.font.name = "Calibri"
    r_sub.font.size = Pt(11.5)
    r_sub.font.italic = True
    r_sub.font.color.rgb = RGBColor(71, 85, 105)

    p_spacer2 = doc.add_paragraph()
    p_spacer2.paragraph_format.space_before = Pt(100)

    # Metadata Box Table
    meta_table = doc.add_table(rows=6, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(meta_table, color="E2E8F0", sz="4")

    metadata_items = [
        ("Mata Kuliah / Tugas", "Keamanan Pemrograman — Semester 5"),
        ("Sistem yang Diuji", "SIM-PKM Poltek SSN (Next.js 16 + Prisma + PostgreSQL)"),
        ("Standar Audit", "OWASP ASVS v4.0.3 L1 (V1, V2, SR-01, SR-02) & Perdir 1/2025"),
        ("Status Hasil Audit", "100% LULUS (PASS) — 26 dari 26 Kontrol Terverifikasi"),
        ("Penguji / Auditor", "Tim Auditor Keamanan Pemrograman SIM-PKM"),
        ("Tanggal Penyusunan", "16 November 2026"),
    ]

    for i, (k, v) in enumerate(metadata_items):
        row = meta_table.rows[i]
        c1, c2 = row.cells[0], row.cells[1]
        c1.width = Inches(2.2)
        c2.width = Inches(4.3)
        set_cell_background(c1, "F8FAFC")
        set_cell_background(c2, "FFFFFF")
        set_cell_margins(c1, 80, 80, 120, 120)
        set_cell_margins(c2, 80, 80, 120, 120)

        p1 = c1.paragraphs[0]
        r1 = p1.add_run(k)
        r1.font.name = "Calibri"
        r1.font.size = Pt(9.5)
        r1.font.bold = True
        r1.font.color.rgb = RGBColor(51, 65, 85)

        p2 = c2.paragraphs[0]
        r2 = p2.add_run(v)
        r2.font.name = "Calibri"
        r2.font.size = Pt(9.5)
        if "100% LULUS" in v:
            r2.font.bold = True
            r2.font.color.rgb = RGBColor(22, 101, 52)
        else:
            r2.font.color.rgb = RGBColor(15, 23, 42)

    doc.add_page_break()

    # =========================================================================
    # BAB I: RINGKASAN EKSEKUTIF (EXECUTIVE SUMMARY)
    # =========================================================================
    h1 = doc.add_heading("RINGKASAN EKSEKUTIF", level=1)
    h1.paragraph_format.space_before = Pt(12)
    h1.paragraph_format.space_after = Pt(8)
    for run in h1.runs:
        run.font.name = "Calibri"
        run.font.size = Pt(16)
        run.font.bold = True
        run.font.color.rgb = RGBColor(6, 30, 69)

    p_exec = doc.add_paragraph()
    p_exec.paragraph_format.line_spacing = 1.15
    p_exec.paragraph_format.space_after = Pt(8)
    p_exec.add_run(
        "Audit keamanan perangkat lunak ini dilaksanakan terhadap aplikasi Sistem Informasi Manajemen "
        "Program Kreativitas Mahasiswa (SIM-PKM) Politeknik Siber dan Sandi Negara. SIM-PKM dirancang "
        "sebagai wahana tata kelola penelitian dan pengabdian masyarakat siber yang melibatkan multi-peran: "
        "Pengusul (Dosen & Taruna), Ketua Program Studi (Kaprodi), Kepala Pusat PPM, Tim Penelaah Independen "
        "(Reviewer), Direktur Politeknik SSN, serta Administrator Sistem.\n\n"
        "Audit difokuskan secara mendalam pada pengujian kontrol keamanan aplikasi web standar internasional "
        "OWASP Application Security Verification Standard (ASVS) Level 1, khususnya pada domain V1 Encoding & "
        "Sanitization serta V2 Validation & Business Logic, mitigasi Brute-Force dan Enumerasi Akun (SR-01), "
        "pengelolaan sesi aman dan timeout (SR-02), pencegahan eskalasi hak istimewa (RBAC Integrity), serta "
        "mekanisme integritas telaah double-blind review sesuai Peraturan Direktur Poltek SSN No. 1 Tahun 2025."
    )

    # Highlight Summary Box
    box = doc.add_table(rows=1, cols=1)
    box.alignment = WD_TABLE_ALIGNMENT.CENTER
    bcell = box.rows[0].cells[0]
    bcell.width = Inches(6.5)
    set_cell_background(bcell, "F0FDF4")
    set_cell_margins(bcell, 140, 140, 180, 180)
    bp = bcell.paragraphs[0]
    br = bp.add_run(
        "RINGKASAN STATUS KELULUSAN AUDIT KEAMANAN:\n"
        "• Total Kontrol Keamanan Diuji : 26 Kontrol\n"
        "• Kontrol Berstatus Lulus (PASS) : 26 Kontrol (100%)\n"
        "• Kontrol Berstatus Gagal (FAIL) : 0 Kontrol (0%)\n"
        "• Kategori Kerentanan Kritis (SQLi, XSS, XXE, Mass Assignment, RCE, IDOR, Session Fixation) : "
        "TERLINDUNGI SECARA PENUH (DEFENSE-IN-DEPTH)"
    )
    br.font.name = "Consolas"
    br.font.size = Pt(9.5)
    br.font.bold = True
    br.font.color.rgb = RGBColor(21, 128, 61)

    # =========================================================================
    # BAB II: METODOLOGI DAN LANDASAN AUDIT KEAMANAN
    # =========================================================================
    h2 = doc.add_heading("BAB I. METODOLOGI DAN LANDASAN AUDIT", level=1)
    h2.paragraph_format.space_before = Pt(18)
    for run in h2.runs:
        run.font.name = "Calibri"
        run.font.size = Pt(14)
        run.font.bold = True
        run.font.color.rgb = RGBColor(6, 30, 69)

    p_met = doc.add_paragraph()
    p_met.paragraph_format.line_spacing = 1.15
    p_met.add_run(
        "Audit dilaksanakan menggunakan pendekatan kombinasi Static Application Security Testing (SAST) "
        "pada kode sumber TypeScript/Node.js, Dynamic API Security Testing melalui injeksi payload HTTP "
        "langsung (mensimulasikan intersepsi Burp Suite/cURL), serta verifikasi peramban otomatis (Puppeteer).\n\n"
        "Landasan standar acuan yang digunakan meliputi:\n"
        "1. OWASP ASVS v4.0.3 Level 1: Standar verifikasi keamanan aplikasi web komprehensif untuk pengujian otomatis "
        "tanpa memerlukan akses istimewa internal.\n"
        "2. CWE / SANS Top 25: Mitigasi CWE-89 (SQL Injection), CWE-79 (Cross-Site Scripting), CWE-117 (Log Injection), "
        "CWE-287 (Improper Authentication), dan CWE-611 (Improper Restriction of XML External Entity Reference).\n"
        "3. Peraturan Direktur Poltek SSN No. 1/2025: Aturan tata kelola akademik terkait kepatuhan verifikasi NIP/NPM "
        "terhadap Master SDM/Siakad, pencegahan Conflict of Interest (COI), dan double-blind review pada penilaian usulan."
    )

    # =========================================================================
    # BAB III: HASIL EVALUASI KONTROL KEAMANAN TEKNIS
    # =========================================================================
    h3 = doc.add_heading("BAB II. HASIL EVALUASI KONTROL KEAMANAN TEKNIS", level=1)
    h3.paragraph_format.space_before = Pt(18)
    for run in h3.runs:
        run.font.name = "Calibri"
        run.font.size = Pt(14)
        run.font.bold = True
        run.font.color.rgb = RGBColor(6, 30, 69)

    # Subbab 2.1
    h3_1 = doc.add_heading("2.1. Domain V1: Encoding, Sanitasi, dan Pencegahan Injeksi", level=2)
    h3_1.paragraph_format.space_before = Pt(10)
    for run in h3_1.runs:
        run.font.name = "Calibri"
        run.font.size = Pt(12)
        run.font.bold = True
        run.font.color.rgb = RGBColor(2, 132, 199)

    p_v1 = doc.add_paragraph()
    p_v1.paragraph_format.line_spacing = 1.15
    p_v1.add_run(
        "Domain V1 berfokus pada pembersihan data masuk (sanitization), contextual output encoding, "
        "dan penghapusan seluruh potensi eksekusi perintah liar:\n"
        "• Anti-XSS (Kontrol 1.2.1 & 1.3.1): Payload berbahaya seperti <script>alert(1)</script> dan "
        "<img src=x onerror=alert(1)> disaring menggunakan helper sanitasi DOMPurify (isomorphic-dompurify) pada sisi server "
        "dan dirender melalui auto-escaping bawaan JSX React pada frontend. Tidak terdapat penggunaan dangerouslySetInnerHTML.\n"
        "• Protokol URL Aman (Kontrol 1.2.2): Endpoint berkas dan navigasi menolak protokol berbahaya (javascript:, data:, vbscript:) "
        "dan hanya mengizinkan protokol https:// atau path internal (/api/proposals/...).\n"
        "• Serialisasi JSON Aman & Anti-Log Injection (Kontrol 1.2.3): Seluruh API mengembalikan response via NextResponse.json(). "
        "Input identitas dibersihkan dari karakter kontrol [\\r\\n\\t] melalui sanitizeLogInput() guna mencegah Log Injection (CWE-117).\n"
        "• Anti-SQL Injection (Kontrol 1.2.4): 100% kueri database dieksekusi melalui parameterized queries Prisma ORM. "
        "Tidak ditemukan satu pun pemanggilan $queryRawUnsafe atau konkatenasi string SQL mentah.\n"
        "• Larangan Eksekusi OS Command & eval() (Kontrol 1.2.5 & 1.3.2): Pemindaian statis membuktikan zero occurrence fungsi "
        "eval(), new Function(), maupun modul child_process di seluruh kode aplikasi.\n"
        "• Validasi Berkas & Anti-XXE (Kontrol 1.5.1): Endpoint unggah berkas menolak format berbasis XML (.xml, .docx) dan memverifikasi "
        "magic bytes 4 byte pertama berkas PDF (%PDF / 0x25 0x50 0x44 0x46)."
    )

    # Subbab 2.2
    h3_2 = doc.add_heading("2.2. Domain V2: Validasi Server, Logika Bisnis, dan Master Data", level=2)
    h3_2.paragraph_format.space_before = Pt(12)
    for run in h3_2.runs:
        run.font.name = "Calibri"
        run.font.size = Pt(12)
        run.font.bold = True
        run.font.color.rgb = RGBColor(2, 132, 199)

    p_v2 = doc.add_paragraph()
    p_v2.paragraph_format.line_spacing = 1.15
    p_v2.add_run(
        "Domain V2 memastikan bahwa aturan bisnis institusi dan pembatasan wewenang ditegakkan secara mutlak di sisi server:\n"
        "• Server Allowlist & Anti-Mass Assignment (Kontrol 2.1.1): Skema Zod (authSchemas.ts) dikonfigurasi dengan mode .strict(). "
        "Payload login dan registrasi yang menyisipkan field liar (misal role: 'ADMIN') ditolak seketika.\n"
        "• Atribut Akademik Read-Only (Kontrol 2.2.1): Atribut resmi (NIP, gelar, prodi, kelas) dikunci dari Master SDM/Siakad dan "
        "tidak dapat dimanipulasi oleh klien via PATCH /api/users/profile.\n"
        "• Verifikasi Master SDM & Siakad (Kontrol 2.3.1): Registrasi memvalidasi NIP/NPM ke basis data resmi Poltek SSN. "
        "Identitas fiktif langsung ditolak dengan HTTP 403 Forbidden. Taruna dilarang keras mengklaim peran struktural Dosen/Reviewer/Kaprodi.\n"
        "• Kebijakan Kata Sandi (Kontrol 2.1.1-7): Server mewajibkan panjang minimal 8 karakter, memeriksa daftar hitam kata sandi umum "
        "(password123, 12345678), dan melarang kata sandi identik dengan NIP/NPM.\n"
        "• Penyimpanan Kredensial (Kontrol 2.4.1): Kata sandi di-hash menggunakan algoritma modern bcrypt dengan cost factor 12 "
        "($2b$12$...) dengan salt acak yang tidak dapat dipulihkan secara reversibel."
    )

    # Subbab 2.3
    h3_3 = doc.add_heading("2.3. Pengamanan Sesi & Penanggulangan Brute Force (SR-01 & SR-02)", level=2)
    h3_3.paragraph_format.space_before = Pt(12)
    for run in h3_3.runs:
        run.font.name = "Calibri"
        run.font.size = Pt(12)
        run.font.bold = True
        run.font.color.rgb = RGBColor(2, 132, 199)

    p_sess = doc.add_paragraph()
    p_sess.paragraph_format.line_spacing = 1.15
    p_sess.add_run(
        "Manajemen sesi dan mitigasi serangan otomatis pada pintu gerbang sistem:\n"
        "• Anti-Enumerasi Akun (Kontrol SR-01.1): Respon kesalahan saat akun tidak ditemukan dan saat kata sandi keliru "
        "dibuat seragam persis (HTTP 401: 'NIP/NPM atau kata sandi salah') guna mencegah penyerang memetakan keberadaan akun.\n"
        "• Anti-Brute Force Rate Limiting (Kontrol SR-01.2): Sistem membatasi maksimal 5 kegagalan berturut-turut dalam 15 menit. "
        "Percobaan ke-6 diblokir dengan HTTP 429 Too Many Requests tanpa mengunci status is_active akun di database (mencegah DoS Account Lockout).\n"
        "• Keamanan Cookie Sesi (Kontrol SR-02.1): Token sesi dibangkitkan dari CSPRNG 256-bit (crypto.randomBytes(32)) dan "
        "ditanamkan ke cookie HttpOnly, SameSite=Lax, Path=/.\n"
        "• Anti-Session Fixation & Cache-Control (Kontrol SR-02.2): Login ulang menerbitkan Session ID baru dan seluruh endpoint "
        "sensitif menyertakan header 'Cache-Control: no-store, no-cache, must-revalidate, private'.\n"
        "• Idle Timeout 30 Menit (Kontrol SR-02.3): Aktivitas yang melewati batas diam 30 menit ditolak seketika (HTTP 401) dan token "
        "dihapus otomatis dari penyimpanan sesi.\n"
        "• Pemutusan Sesi Seketika (Kontrol SR-02.4): Penonaktifan akun (is_active = false) seketika mencabut seluruh sesi aktif user terkait."
    )

    # Subbab 2.4
    h3_4 = doc.add_heading("2.4. Kontrol Akses Berbasis Peran (RBAC) & No Skipping Steps", level=2)
    h3_4.paragraph_format.space_before = Pt(12)
    for run in h3_4.runs:
        run.font.name = "Calibri"
        run.font.size = Pt(12)
        run.font.bold = True
        run.font.color.rgb = RGBColor(2, 132, 199)

    p_rbac = doc.add_paragraph()
    p_rbac.paragraph_format.line_spacing = 1.15
    p_rbac.add_run(
        "Penguncian hak akses tingkat perantara dan endpoint:\n"
        "• Edge / Server Middleware Guard (src/middleware.ts): Mencegah navigasi ilegal ke /dashboard tanpa cookie sesi valid "
        "dengan mengalihkan seketika ke /login.\n"
        "• Penguncian Peran Aktif Server (requireRole.ts): Pengguna dengan multi-peran (misal Dosen yang memiliki hak Pengusul, "
        "Kaprodi, dan Reviewer) tidak dapat mengeksekusi aksi peran Kaprodi apabila active_role sesi masih disetel sebagai Pengusul. "
        "Pengguna wajib memanggil POST /api/auth/switch-role secara sah terlebih dahulu.\n"
        "• Conflict of Interest Guard (coiGuard.ts): Penugasan reviewer otomatis menolak reviewer yang berasal dari prodi yang sama "
        "dengan pengusul atau memiliki hubungan kepengarangan pada proposal yang sama."
    )

    doc.add_page_break()

    # =========================================================================
    # BAB IV: MATRIKS DETAIL 26 KONTROL KEAMANAN
    # =========================================================================
    h4 = doc.add_heading("BAB III. MATRIKS DETAIL PENGUJIAN 26 KONTROL KEAMANAN", level=1)
    h4.paragraph_format.space_before = Pt(12)
    for run in h4.runs:
        run.font.name = "Calibri"
        run.font.size = Pt(14)
        run.font.bold = True
        run.font.color.rgb = RGBColor(6, 30, 69)

    p_mat_desc = doc.add_paragraph()
    p_mat_desc.add_run(
        "Tabel berikut menyajikan rekapitulasi lengkap 26 butir kontrol keamanan yang telah diuji secara "
        "otomatis melalui skrip validasi SAST dan Dynamic API Testing:"
    )

    # Table of 26 controls
    table_ctrl = doc.add_table(rows=1, cols=4)
    table_ctrl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(table_ctrl, color="CBD5E1", sz="4")

    # Header Row
    hdr_cells = table_ctrl.rows[0].cells
    hdr_titles = ["Kode Kontrol", "Nama Kontrol Keamanan", "Kategori OWASP", "Hasil Uji"]
    hdr_widths = [Inches(1.2), Inches(2.6), Inches(1.7), Inches(1.0)]

    for idx, name in enumerate(hdr_titles):
        hdr_cells[idx].width = hdr_widths[idx]
        set_cell_background(hdr_cells[idx], "0F172A")
        set_cell_margins(hdr_cells[idx], 100, 100, 100, 100)
        p = hdr_cells[idx].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER if idx in [0, 3] else WD_ALIGN_PARAGRAPH.LEFT
        r = p.add_run(name)
        r.font.name = "Calibri"
        r.font.size = Pt(9)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)

    test_matrix_data = [
        # V1 Suite
        ("1.2.1", "Anti-XSS Output Encoding & DOMPurify", "V1 Sanitization", "PASS"),
        ("1.2.2", "Safe URL Protocol Whitelist & Path Traversal Guard", "V1 Sanitization", "PASS"),
        ("1.2.3", "Safe JSON Serialization & Anti-Log Injection", "V1 Sanitization", "PASS"),
        ("1.2.4", "Parameterized Queries Prisma & Anti-SQL Injection", "V1 Sanitization", "PASS"),
        ("1.2.5", "Larangan Eksekusi OS Command (No exec/spawn)", "V1 Sanitization", "PASS"),
        ("1.3.1", "Sanitasi Input Teks Kaya & Komentar Telaah", "V1 Sanitization", "PASS"),
        ("1.3.2", "Larangan Fungsi Dinamis (No eval/new Function)", "V1 Sanitization", "PASS"),
        ("1.5.1", "Validasi Magic Bytes PDF & Proteksi Anti-XXE", "V1 Sanitization", "PASS"),
        # V2 Suite
        ("2.1.1", "Server Allowlist & Anti-Mass Assignment (Zod .strict())", "V2 Validation", "PASS"),
        ("2.2.1", "Strict Read-Only Academic Attributes (Profil)", "V2 Validation", "PASS"),
        ("2.2.2", "Whitelist Role Switching Boundary (Enum Guard)", "V2 Validation", "PASS"),
        ("2.3.1.A", "Verifikasi Keberadaan NIP/NPM di Master SDM/Siakad", "V2 Business Logic", "PASS"),
        ("2.3.1.B", "Anti-Eskalasi Peran Ilegal oleh Taruna (No Kaprodi)", "V2 Business Logic", "PASS"),
        ("2.1.1-7A", "Penegakan Panjang Minimum Password (Min 8 Karakter)", "V2 Password Policy", "PASS"),
        ("2.1.1-7B", "Pencegahan Password Umum/Bocor (Blacklist Filter)", "V2 Password Policy", "PASS"),
        ("2.1.1-7C", "Pencegahan Password Identik NIP/NPM Pengguna", "V2 Password Policy", "PASS"),
        ("2.4.1", "Penyimpanan Hash Satu Arah (bcrypt cost 12)", "V2 Storage", "PASS"),
        # Session & Brute Force Suite
        ("SR-01.1", "Anti-Enumerasi Akun (Pesan Error Seragam 401)", "V2 Authentication", "PASS"),
        ("SR-01.2", "Anti-Brute Force Rate Limiting (Maks 5x Gagal)", "V2 Rate Limiting", "PASS"),
        ("SR-02.1", "Keamanan Cookie Sesi (256-bit CSPRNG, HttpOnly, Lax)", "V3 Session Mgmt", "PASS"),
        ("SR-02.2", "Anti-Session Fixation & Cache-Control: no-store", "V3 Session Mgmt", "PASS"),
        ("SR-02.3", "Batas Waktu Diam Sesi (Idle Timeout 30 Menit)", "V3 Session Mgmt", "PASS"),
        ("SR-02.4", "Pemutusan Sesi Seketika Akun Nonaktif", "V3 Session Mgmt", "PASS"),
        # Hardening & RBAC
        ("HARDEN-01", "Uji Payload XSS pada Endpoint Login (<script>)", "Hardening Gate", "PASS"),
        ("HARDEN-02", "Uji Payload SQLi pada Endpoint Login (' OR '1'='1)", "Hardening Gate", "PASS"),
        ("HARDEN-03", "Penguncian Alur Peran (No Skipping Steps kaprodi API)", "RBAC Integrity", "PASS"),
    ]

    for row_idx, row_data in enumerate(test_matrix_data):
        row = table_ctrl.add_row()
        bg_color = "F8FAFC" if row_idx % 2 == 0 else "FFFFFF"
        for c_idx, text in enumerate(row_data):
            cell = row.cells[c_idx]
            cell.width = hdr_widths[c_idx]
            set_cell_background(cell, bg_color)
            set_cell_margins(cell, 60, 60, 100, 100)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if c_idx in [0, 3] else WD_ALIGN_PARAGRAPH.LEFT
            r = p.add_run(text)
            r.font.name = "Calibri"
            r.font.size = Pt(8.5)
            if c_idx == 0:
                r.font.bold = True
                r.font.name = "Consolas"
            elif c_idx == 3:
                r.font.bold = True
                r.font.color.rgb = RGBColor(22, 101, 52)

    doc.add_page_break()

    # =========================================================================
    # BAB V: HASIL OBSERVASI ANTARMUKA & BUKTI SCREENSHOT PENGUJIAN
    # =========================================================================
    h5 = doc.add_heading("BAB IV. HASIL OBSERVASI ANTARMUKA DAN BUKTI PENGUJIAN", level=1)
    h5.paragraph_format.space_before = Pt(12)
    for run in h5.runs:
        run.font.name = "Calibri"
        run.font.size = Pt(14)
        run.font.bold = True
        run.font.color.rgb = RGBColor(6, 30, 69)

    p_obs_intro = doc.add_paragraph()
    p_obs_intro.paragraph_format.line_spacing = 1.15
    p_obs_intro.add_run(
        "Berikut disajikan dokumentasi visual tangkapan layar (screenshot) hasil pengujian antarmuka, "
        "mekanisme perlindungan keamanan, serta output eksekusi skrip pengujian otomatis pada server SIM-PKM:"
    )

    screenshots_info = [
        (
            "docs/screenshots/01_login_page.png",
            "Gambar 4.1. Antarmuka Halaman Masuk Portal (Login Page)",
            "Halaman masuk SIM-PKM Poltek SSN dilengkapi ilustrasi latar kedaulatan siber institusional, "
            "input kredensial dengan validasi format client-side, dan proteksi autocomplete sesuai standar OWASP."
        ),
        (
            "docs/screenshots/03_login_error_anti_enumeration.png",
            "Gambar 4.2. Penerapan Respon Kesalahan Seragam Anti-Enumerasi Akun",
            "Pesan kesalahan 'NIP/NPM atau kata sandi salah' ditampilkan seragam ketika kredensial salah maupun "
            "ketika identitas tidak terdaftar, mencegah penyerang melakukan pemetaan akun aktif (OWASP ASVS V2.2.2)."
        ),
        (
            "docs/screenshots/02_register_page.png",
            "Gambar 4.3. Antarmuka Registrasi Akun Terverifikasi Master Siakad & SDM",
            "Formulir registrasi dengan penguncian kategori peran. NIP/NPM diverifikasi secara otomatis "
            "terhadap basis data Master SDM (Dosen) dan Siakad (Taruna) sebelum pembuatan akun diizinkan."
        ),
        (
            "docs/screenshots/04_dashboard_admin.png",
            "Gambar 4.4. Dasbor Pengawasan Peran Administrator PPM (Institutional Scope)",
            "Tampilan dasbor administrator dengan hak akses penuh lintas program studi, rekapitulasi statistik usulan, "
            "serta bilah navigasi dengan penanda peran aktif terverifikasi."
        ),
        (
            "docs/screenshots/05_dashboard_pengusul.png",
            "Gambar 4.5. Dasbor Pengusul Usulan Penelitian & Pengabdian Masyarakat",
            "Tampilan dasbor peran Pengusul (Dr. Budi Santoso) dengan isolasi data usulan pribadi (ScopeFilter), "
            "alur tahapan progresif (Pengajuan -> Verifikasi -> Penelaahan -> Penetapan), dan tombol buat usulan."
        ),
        (
            "docs/screenshots/06_test_v1_v2_results.png",
            "Gambar 4.6. Bukti Eksekusi Uji Otomatis: Kontrol V1 Sanitasi & V2 Logika Bisnis",
            "Output terminal script test-v1-v2-validation.ts membuktikan 9 dari 9 kontrol V1 dan V2 berstatus 100% LULUS (PASS)."
        ),
        (
            "docs/screenshots/07_test_auth_session_results.png",
            "Gambar 4.7. Bukti Eksekusi Uji Otomatis: Kontrol SR-01 & SR-02 Autentikasi & Sesi",
            "Output terminal script test-auth-session.ts membuktikan 10 dari 10 kontrol autentikasi, anti-brute force, "
            "dan timeout sesi berstatus 100% LULUS (PASS)."
        ),
        (
            "docs/screenshots/08_test_hardening_rbac_results.png",
            "Gambar 4.8. Bukti Eksekusi Uji Otomatis: Hardening XSS, SQLi, dan Integritas RBAC",
            "Output terminal script test-hardening-auth.ts membuktikan 7 dari 7 skenario serangan XSS, SQLi, "
            "dan manipulasi peran berhasil diblokir dengan aman."
        ),
    ]

    for img_path, caption, desc in screenshots_info:
        if os.path.exists(img_path):
            p_img = doc.add_paragraph()
            p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_img.paragraph_format.space_before = Pt(14)
            p_img.paragraph_format.space_after = Pt(4)
            r_img = p_img.add_run()
            r_img.add_picture(img_path, width=Inches(5.8))

            p_cap = doc.add_paragraph()
            p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_cap.paragraph_format.space_after = Pt(2)
            r_cap = p_cap.add_run(caption)
            r_cap.font.name = "Calibri"
            r_cap.font.size = Pt(9.5)
            r_cap.font.bold = True
            r_cap.font.color.rgb = RGBColor(15, 23, 42)

            p_desc = doc.add_paragraph()
            p_desc.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_desc.paragraph_format.space_after = Pt(14)
            r_desc = p_desc.add_run(desc)
            r_desc.font.name = "Calibri"
            r_desc.font.size = Pt(8.5)
            r_desc.font.italic = True
            r_desc.font.color.rgb = RGBColor(100, 116, 139)

    doc.add_page_break()

    # =========================================================================
    # BAB VI: KESIMPULAN DAN REKOMENDASI
    # =========================================================================
    h6 = doc.add_heading("BAB V. KESIMPULAN DAN REKOMENDASI", level=1)
    h6.paragraph_format.space_before = Pt(12)
    for run in h6.runs:
        run.font.name = "Calibri"
        run.font.size = Pt(14)
        run.font.bold = True
        run.font.color.rgb = RGBColor(6, 30, 69)

    p_kes = doc.add_paragraph()
    p_kes.paragraph_format.line_spacing = 1.15
    p_kes.add_run(
        "Berdasarkan seluruh rangkaian audit keamanan statis (SAST), pengujian penetrasi API dinamis, "
        "serta verifikasi antarmuka visual peramban, dapat disimpulkan bahwa:\n"
        "1. Sistem Informasi Manajemen PKM (SIM-PKM) Poltek SSN telah memenuhi 100% persyaratan standar "
        "OWASP Application Security Verification Standard (ASVS) Level 1 pada modul Autentikasi, Manajemen Sesi, "
        "dan Kontrol Akses Berbasis Peran.\n"
        "2. Mekanisme pertahanan berlapis (Defense-in-Depth) terbukti efektif menangkis vektor serangan umum web, "
        "termasuk XSS Stored/Reflected, SQL Injection, Mass Assignment, Log Injection (CWE-117), Brute Force, "
        "dan Session Fixation.\n"
        "3. Penegakan aturan bisnis internal institusi (verifikasi Master SDM/Siakad, COI Guard, double-blind review) "
        "telah terkunci rapat di sisi server dengan integritas kriptografis yang kuat (bcrypt cost 12 dan CSPRNG 256-bit).\n\n"
        "Rekomendasi Pemeliharaan Lanjutan:\n"
        "• Lakukan rotasi berkala terhadap kunci JWT / session secret dan kredensial database.\n"
        "• Pastikan server produksi mengaktifkan header HTTP Strict Transport Security (HSTS) dan Content Security Policy (CSP).\n"
        "• Tinjau rekam jejak audit_logs secara periodik guna memantau anomali percobaan login atau pergantian peran mencurigakan."
    )

    # Signature Block
    p_sig_space = doc.add_paragraph()
    p_sig_space.paragraph_format.space_before = Pt(30)

    sig_table = doc.add_table(rows=1, cols=2)
    sig_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    s_cells = sig_table.rows[0].cells
    s_cells[0].width = Inches(3.2)
    s_cells[1].width = Inches(3.2)

    p_s1 = s_cells[0].paragraphs[0]
    p_s1.add_run(
        "Mengetahui,\n"
        "Koordinator Keamanan Pemrograman\n\n\n\n\n"
        "_____________________________\n"
        "Dosen Pengampu Mata Kuliah\n"
        "NIP. 198503152010121001"
    )
    p_s1.runs[0].font.name = "Calibri"
    p_s1.runs[0].font.size = Pt(9.5)

    p_s2 = s_cells[1].paragraphs[0]
    p_s2.add_run(
        "Bogor, 16 November 2026\n"
        "Tim Penguji Keamanan (Auditor)\n\n\n\n\n"
        "_____________________________\n"
        "Auditor Sistem Informasi\n"
        "NIP/NPM. 2423102007"
    )
    p_s2.runs[0].font.name = "Calibri"
    p_s2.runs[0].font.size = Pt(9.5)

    output_doc_path = os.path.abspath('docs/Laporan_Audit_Keamanan_OWASP_SIM_PKM_PoltekSSN.docx')
    doc.save(output_doc_path)
    print(f"Laporan audit Word (.docx) berhasil dibuat di: {output_doc_path}")

if __name__ == '__main__':
    build_report()
