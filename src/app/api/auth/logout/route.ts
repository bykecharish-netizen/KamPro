import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  SESSION_COOKIE_NAME,
  destroySession,
  clearSessionCookie,
  validateSession,
} from '@/lib/auth/session';
import { extractClientIp, logAuditEvent } from '@/lib/audit';

export async function POST(request: NextRequest) {
  const clientIp = extractClientIp(request);
  let sessionToken: string | undefined;

  try {
    const cookieStore = await cookies();
    sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  } catch {
    // Dipanggil di luar request context
  }

  if (!sessionToken) {
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)session_token=([^;]+)/);
      if (match) sessionToken = match[1];
    }
  }

  if (sessionToken) {
    // Ambil informasi sesi sebelum dihapus untuk pencatatan audit log
    const session = await validateSession(sessionToken);

    // 1. Hapus rekaman sesi di basis data
    await destroySession(sessionToken);

    // 2. Catat aktivitas logout ke audit log
    if (session) {
      await logAuditEvent({
        actor_id: session.user.id,
        active_role: session.active_role,
        ip_address: clientIp,
        action_type: 'LOGOUT',
        target_id: session.id,
        status_code: 200,
        details: `Pengguna ${session.user.nama_lengkap} (${session.user.nip_npm}) berhasil keluar. Sesi ditutup.`,
      });
    }
  }

  // 3. Bersihkan cookie sesi di peramban
  await clearSessionCookie();

  const response = NextResponse.json(
    { message: 'Logout berhasil' },
    { status: 200 }
  );

  response.cookies.set('session_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
