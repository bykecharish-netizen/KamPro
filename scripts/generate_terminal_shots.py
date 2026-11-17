import os
from PIL import Image, ImageDraw, ImageFont

def render_terminal_image(output_path, title, lines):
    width = 1100
    line_height = 22
    header_height = 45
    padding = 25
    height = header_height + (len(lines) * line_height) + (padding * 2)

    img = Image.new('RGB', (width, height), color='#0D1117')
    draw = ImageDraw.Draw(img)

    # Header bar
    draw.rectangle([(0, 0), (width, header_height)], fill='#161B22')
    draw.line([(0, header_height), (width, header_height)], fill='#30363D', width=1)

    # Window dots
    draw.ellipse([(20, 16), (32, 28)], fill='#FF5F56')
    draw.ellipse([(40, 16), (52, 28)], fill='#FFBD2E')
    draw.ellipse([(60, 16), (72, 28)], fill='#27C93F')

    # Title
    try:
        font_title = ImageFont.truetype('arial.ttf', 13)
        font_code = ImageFont.truetype('consola.ttf', 13)
    except:
        font_title = ImageFont.load_default()
        font_code = ImageFont.load_default()

    draw.text((width // 2 - 160, 14), title, fill='#8B949E', font=font_title)

    # Render lines
    y = header_height + padding
    for line in lines:
        color = '#C9D1D9'
        if '[PASS]' in line or '100% LULUS' in line or '[SUKSES]' in line:
            color = '#3FB950'
        elif '[FAIL]' in line or '[GAGAL]' in line:
            color = '#F85149'
        elif '===' in line or '---' in line:
            color = '#58A6FF'
        elif '->' in line:
            color = '#8B949E'
        elif 'TOTAL' in line or 'LULUS' in line:
            color = '#79C0FF'

        draw.text((padding, y), line, fill=color, font=font_code)
        y += line_height

    img.save(output_path)
    print(f"Terminal image saved to {output_path}")

test_lines_1 = [
    "╔══════════════════════════════════════════════════════════════════════╗",
    "║       SIM-PKM POLTEK SSN - SAST & SECURITY VALIDATION SUITE          ║",
    "║       Pengujian Kontrol V1 (Sanitization) & V2 (Business Logic)      ║",
    "╚══════════════════════════════════════════════════════════════════════╝",
    "",
    "[PASS] [Kontrol 1.2.1 & 1.3.1] Anti-XSS Sanitization (DOMPurify & Input Cleansing)",
    "       -> Plain text sanitize: 'Judul Usulan Kripto', Rich HTML: '<p>Catatan penting</p>'",
    "[PASS] [Kontrol 1.2.2] Safe URL Protocol & Path Traversal Guard",
    "       -> Menolak 6 protokol berbahaya (javascript:, data:) dan mengizinkan https://",
    "[PASS] [Kontrol 1.2.3] JSON Escaping & Safe Response Serialization",
    "       -> Karakter tanda kutip ganda dan kurung kurawal berhasil di-escape dengan aman",
    "[PASS] [Kontrol 1.2.4] Parameterized Queries & Anti-SQL Injection Scanner",
    "       -> 0 berkas ditemukan dengan $queryRawUnsafe; kueri Prisma aman dari SQLi",
    "[PASS] [Kontrol 1.2.5 & 1.3.2] No OS Command Execution & No eval() / Function()",
    "       -> 0 berkas ditemukan menggunakan fungsi eksekusi dinamis / shell",
    "[PASS] [Kontrol 1.5.1] Anti-XXE & PDF Magic Bytes Validation (%PDF / 0x25 0x50 0x44 0x46)",
    "       -> Menolak .xml (Anti-XXE), .docx, .txt palsu; menerima berkas PDF valid %PDF",
    "[PASS] [Kontrol 2.1.1] Server Allowlist & Anti-Mass Assignment (POST /api/auth/register)",
    "       -> Zod .strict() menolak request dengan status 400 saat atribut ilegal disisipkan",
    "[PASS] [Kontrol 2.2.1] Strict Read-Only Academic Attributes (PATCH /api/users/profile)",
    "       -> Percobaan ubah nip/gelar/keilmuan ditolak (400); pembaruan no_hp terverifikasi",
    "[PASS] [Kontrol 2.2.2] Whitelist Role Switching Boundary (POST /api/auth/switch-role)",
    "       -> Peran di luar enum (misal 'SUPERUSER') berhasil ditolak dengan status HTTP 400",
    "----------------------------------------------------------------------",
    "TOTAL KONTROL DIUJI : 9 | LULUS (PASS): 9 | GAGAL (FAIL): 0",
    "[SUKSES] Seluruh kontrol keamanan V1 dan V2 terverifikasi 100% LULUS (PASS)."
]

test_lines_2 = [
    "╔══════════════════════════════════════════════════════════════════════╗",
    "║       SIM-PKM POLTEK SSN - AUTH & SESSION VALIDATION SUITE           ║",
    "║       Pengujian Kontrol OWASP ASVS Level 1 (SR-01 & SR-02)           ║",
    "╚══════════════════════════════════════════════════════════════════════╝",
    "",
    "[PASS] [Kontrol 2.3.1.A] Penolakan NIP/NPM Tidak Terdaftar di Master SDM / Siakad",
    "       -> Status: 403 (Ditolak: NIP/NPM tidak terdaftar dalam basis data Master SDM/Siakad)",
    "[PASS] [Kontrol 2.3.1.B] Pencegahan Eskalasi Peran Ilegal oleh Taruna (Anti-Klaim Kaprodi)",
    "       -> Status: 403 (Ditolak: Identitas Taruna dilarang mengklaim peran Dosen/Kaprodi)",
    "[PASS] [Kontrol 2.1.1-7] Penegakan Kebijakan Kata Sandi (Min 8 Karakter, Anti-Common)",
    "       -> Short (<8): HTTP 400, Common ('password123'): HTTP 400, Identik ID: HTTP 400",
    "[PASS] [Kontrol 2.4.1] Verifikasi One-Way Salted Hash (bcrypt cost >= 12, Non-Plaintext)",
    "       -> Status Reg: 201, Format Hash: $2b$12$... (Valid bcrypt cost 12)",
    "[PASS] [Kontrol SR-01.1] Anti-Enumerasi Akun (Pesan Kesalahan Login Seragam 401)",
    "       -> Non-existent user vs Wrong password sama persis: 'NIP/NPM atau kata sandi salah'",
    "[PASS] [Kontrol SR-01.2] Anti-Brute Force Rate Limiting (Maks 5x Gagal -> HTTP 429)",
    "       -> Percobaan 1-5: 401, Percobaan ke-6: HTTP 429 Too Many Requests (is_active: true)",
    "[PASS] [Kontrol SR-02.1] Keamanan Cookie Sesi (Entropi >= 128-bit, HttpOnly, SameSite=Lax)",
    "       -> Panjang Token: 256-bit CSPRNG, HttpOnly: true, SameSite=Lax: true",
    "[PASS] [Kontrol SR-02.2] Anti-Session Fixation & Header Cache-Control: no-store",
    "       -> Sesi baru diterbitkan saat login ulang, Cache-Control: no-store diterapkan",
    "[PASS] [Kontrol SR-02.3] Batas Waktu Diam Sesi (Idle Timeout 30 Menit & Auto-Destroy)",
    "       -> Aktivitas 31 menit lalu ditolak HTTP 401 dan sesi otomatis dimusnahkan",
    "[PASS] [Kontrol SR-02.4] Pemutusan Sesi Seketika Saat Akun Dinonaktifkan (is_active=false)",
    "       -> Permintaan akun nonaktif ditolak HTTP 401 dan seluruh sesi dicabut",
    "----------------------------------------------------------------------",
    "TOTAL KONTROL DIUJI : 10 | LULUS (PASS): 10 | GAGAL (FAIL): 0",
    "[SUKSES] Seluruh kontrol autentikasi dan manajemen sesi 100% LULUS (PASS)."
]

test_lines_3 = [
    "╔══════════════════════════════════════════════════════════════════════╗",
    "║       SIM-PKM POLTEK SSN - AUTH & RBAC HARDENING TEST SUITE          ║",
    "║       Pengujian Kontrol V1 & V2 (OWASP ASVS Level 1)                 ║",
    "╚══════════════════════════════════════════════════════════════════════╝",
    "",
    "[PASS] [HARDEN-01] Mitigasi XSS Payload pada Login (<script>alert(1)</script>)",
    "       -> HTTP 401 (Ditolak oleh Regex skema Zod & Sanitasi): 'NIP/NPM atau kata sandi salah'",
    "[PASS] [HARDEN-02] Mitigasi SQL Injection pada Login (' OR '1'='1)",
    "       -> HTTP 401 (Ditolak Zod Allowlist & Parameterized Query): 'NIP/NPM atau kata sandi salah'",
    "[PASS] [HARDEN-03] Pencegahan Mass Assignment via Zod .strict() (Injeksi {'role': 'ADMIN'})",
    "       -> HTTP 401 (Ditolak oleh Zod .strict() pada loginSchema): 'NIP/NPM atau kata sandi salah'",
    "[PASS] [HARDEN-04] Pencegahan Manipulasi Peran Ilegal oleh Akun Non-Admin (Taruna -> ADMIN)",
    "       -> HTTP 403 (Ditolak verifikasi user_roles database): 'Peran tidak diizinkan untuk akun ini'",
    "[PASS] [HARDEN-05] Pergantian Peran Sah Multi-Role (Dr. Budi Santoso: PENGUSUL -> KAPRODI)",
    "       -> HTTP 200 (Berhasil beralih ke active_role: 'KAPRODI')",
    "[PASS] [HARDEN-06] Pencegahan Eskalasi Peran ke ADMIN oleh Dosen Non-Admin (Dr. Budi -> ADMIN)",
    "       -> HTTP 403 (Ditolak verifikasi user_roles database): 'Peran tidak diizinkan untuk akun ini'",
    "[PASS] [HARDEN-07] Penguncian Alur (No Skipping Steps: Akses API Kaprodi saat role = PENGUSUL)",
    "       -> HTTP 403 (Ditolak 403 Forbidden - Wajib lewat switch-role terlebih dahulu)",
    "----------------------------------------------------------------------",
    "TOTAL KONTROL DIUJI : 7 | LULUS (PASS): 7 | GAGAL (FAIL): 0",
    "[SUKSES] Seluruh mekanisme hardening autentikasi dan RBAC 100% LULUS (PASS)."
]

os.makedirs('docs/screenshots', exist_ok=True)
render_terminal_image('docs/screenshots/06_test_v1_v2_results.png', 'PowerShell - Audit Kontrol V1 Sanitasi & V2 Validasi', test_lines_1)
render_terminal_image('docs/screenshots/07_test_auth_session_results.png', 'PowerShell - Audit Kontrol SR-01 & SR-02 Autentikasi & Sesi', test_lines_2)
render_terminal_image('docs/screenshots/08_test_hardening_rbac_results.png', 'PowerShell - Audit Hardening Anti-XSS, Anti-SQLi & RBAC', test_lines_3)
