import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mockStore } from '@/lib/mockStore';
import { verifyPassword } from '@/lib/auth/password';
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from '@/lib/auth/rate-limit';
import { createSession, setSessionCookie } from '@/lib/auth/session';
import { extractClientIp, logAuditEvent, sanitizeLogInput } from '@/lib/audit';
import { loginSchema } from '@/lib/validation/authSchemas';

const UNIFORM_AUTH_ERROR = 'NIP/NPM atau kata sandi salah';

export { loginSchema };

export async function POST(request: NextRequest) {
  const clientIp = extractClientIp(request);

  // 1. Parsing body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Format permintaan tidak valid' },
      {
        status: 400,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' },
      }
    );
  }

  // Izinkan variasi field 'nip_npm' atau 'email' jika klien mengirimkannya
  if (typeof body === 'object' && body !== null) {
    const rawBody = body as Record<string, unknown>;
    if (!rawBody.identifier && (rawBody.nip_npm || rawBody.email)) {
      rawBody.identifier = rawBody.nip_npm || rawBody.email;
      delete rawBody.nip_npm;
      delete rawBody.email;
    }
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    // Sanitasi input mentah untuk audit log pencegah Log Injection (CWE-117)
    const rawIdentifier =
      typeof body === 'object' && body !== null
        ? String((body as Record<string, unknown>).identifier || '')
        : '';
    const cleanId = sanitizeLogInput(rawIdentifier);

    await logAuditEvent({
      actor_id: null,
      active_role: null,
      ip_address: clientIp,
      action_type: 'LOGIN_INVALID_PAYLOAD',
      target_id: cleanId || 'UNKNOWN',
      status_code: 401,
      details: 'Payload login tidak memenuhi format skema Zod (anti-enumeration).',
    });

    return NextResponse.json(
      { error: UNIFORM_AUTH_ERROR },
      {
        status: 401,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' },
      }
    );
  }

  const inputIdentifier = parsed.data.identifier;
  const sanitizedIdentifier = sanitizeLogInput(inputIdentifier);

  // 2. Pemeriksaan Rate Limiting (Maks 5 gagal per 15 menit per IP + identifier)
  const rateLimitStatus = checkRateLimit(clientIp, inputIdentifier);
  if (rateLimitStatus.isBlocked) {
    await logAuditEvent({
      actor_id: null,
      active_role: null,
      ip_address: clientIp,
      action_type: 'LOGIN_BLOCKED_RATE_LIMIT',
      target_id: sanitizedIdentifier,
      status_code: 429,
      details: `Percobaan login diblokir karena melebihi batas 5x gagal per 15 menit. Retry in ${rateLimitStatus.retryAfterSeconds}s.`,
    });

    return NextResponse.json(
      {
        error: 'Terlalu banyak percobaan login gagal. Silakan coba lagi dalam 15 menit.',
        retryAfterSeconds: rateLimitStatus.retryAfterSeconds,
      },
      {
        status: 429,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' },
      }
    );
  }

  // 3. Pencarian Akun Pengguna via Prisma ORM (Parameterized Query - ASVS v5.0.0-1.2.4)
  let user: any = null;
  try {
    user = await prisma.user.findFirst({
      where: {
        OR: [
          { nip_npm: inputIdentifier },
          { email: { equals: inputIdentifier, mode: 'insensitive' } },
        ],
      },
      include: {
        roles: true,
      },
    });
  } catch {
    // Fallback in-memory mock store
    user = mockStore.users.find(
      (u) =>
        u.nip_npm === inputIdentifier ||
        u.email.toLowerCase() === inputIdentifier.toLowerCase()
    );
  }

  // 4. Verifikasi Akun is_active === true dan bcrypt.compare
  const isPasswordValid =
    user && user.is_active
      ? await verifyPassword(parsed.data.password, user.password_hash)
      : false;

  if (!user || !user.is_active || !isPasswordValid) {
    // Catat kegagalan ke in-memory rate limiter
    recordFailedAttempt(clientIp, inputIdentifier);

    // Catat kegagalan login ke audit log dengan sanitasi Log Injection
    await logAuditEvent({
      actor_id: user?.id ?? null,
      active_role: null,
      ip_address: clientIp,
      action_type: 'LOGIN_FAILED',
      target_id: sanitizedIdentifier,
      status_code: 401,
      details: `Percobaan login gagal untuk identifier: ${sanitizedIdentifier}. Kredensial tidak cocok atau akun nonaktif.`,
    });

    // Pesan kesalahan seragam untuk mencegah Enumerasi Akun (OWASP ASVS V2.2.2)
    return NextResponse.json(
      { error: UNIFORM_AUTH_ERROR },
      {
        status: 401,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' },
      }
    );
  }

  // 5. Login Berhasil: Reset Rate Limiting
  resetRateLimit(clientIp, inputIdentifier);

  // Tentukan peran aktif awal dari peran utama yang terdaftar untuk akun ini
  const userRoles = user.roles.map((r: any) => r.role);
  const defaultRole = userRoles[0] || 'PENGUSUL';

  // 6. Terbitkan Sesi Baru (CSPRNG 256-bit / 32 bytes) untuk mencegah Session Fixation
  const { token, session } = await createSession(user.id, defaultRole);

  // 7. Tanamkan Token Sesi ke Cookie HTTP-Only (SameSite=Lax, Path=/, Secure di production)
  await setSessionCookie(token);

  // 8. Catat Audit Log Keberhasilan Login
  await logAuditEvent({
    actor_id: user.id,
    active_role: defaultRole,
    ip_address: clientIp,
    action_type: 'LOGIN_SUCCESS',
    target_id: session.id,
    status_code: 200,
    details: `Pengguna ${user.nama_lengkap} (${user.nip_npm}) berhasil masuk dengan peran ${defaultRole}.`,
  });

  // 9. Kembalikan Respons Profil & Peran Sesi dengan Set-Cookie dan Cache-Control: no-store
  const response = NextResponse.json(
    {
      message: 'Login berhasil',
      user: {
        id: user.id,
        nip_npm: user.nip_npm,
        email: user.email,
        nama_lengkap: user.nama_lengkap,
        gelar: user.gelar,
        prodi: user.prodi,
        kelompok_keilmuan: user.kelompok_keilmuan,
        kelas: user.kelas,
        no_hp: user.no_hp,
        roles: userRoles,
        active_role: defaultRole,
      },
    },
    { status: 200 }
  );

  response.cookies.set('session_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 60,
  });

  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

  return response;
}
