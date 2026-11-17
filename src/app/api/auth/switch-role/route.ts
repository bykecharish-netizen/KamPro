import { NextRequest, NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { mockStore } from '@/lib/mockStore';
import { getCurrentSession } from '@/lib/auth/session';
import { extractClientIp, logAuditEvent } from '@/lib/audit';
import { switchRoleSchema } from '@/lib/validation/authSchemas';

export { switchRoleSchema };

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
};

export async function POST(request: NextRequest) {
  const clientIp = extractClientIp(request);

  // 1. Verifikasi Sesi Aktif
  let tokenFromReq: string | undefined;
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)session_token=([^;]+)/);
    if (match) tokenFromReq = match[1];
  }

  const session = await getCurrentSession(tokenFromReq);
  if (!session) {
    return NextResponse.json(
      { error: 'Sesi telah kedaluwarsa atau tidak terautentikasi' },
      { status: 401, headers: NO_CACHE_HEADERS }
    );
  }

  // 2. Parsing & Normalisasi Payload
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Format permintaan tidak valid' },
      { status: 400, headers: NO_CACHE_HEADERS }
    );
  }

  // Dukung normalisasi jika klien lama mengirimkan atribut { role: '...' }
  if (typeof body === 'object' && body !== null) {
    const raw = body as Record<string, unknown>;
    if (!raw.targetRole && raw.role) {
      raw.targetRole = raw.role;
      delete raw.role;
    }
  }

  const parsed = switchRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Peran yang dipilih tidak valid' },
      { status: 400, headers: NO_CACHE_HEADERS }
    );
  }

  const targetRole = parsed.data.targetRole as Role;

  // 3. Validasi Otorisasi: Wajib periksa ke tabel user_roles di database bahwa user_id benar-benar memiliki targetRole
  let hasRole = false;
  try {
    const userRoleRecord = await prisma.userRole.findFirst({
      where: {
        user_id: session.user.id,
        role: targetRole,
      },
    });
    hasRole = !!userRoleRecord;
  } catch {
    // Fallback verifikasi in-memory mock store
    hasRole = session.user.roles.some((r) => r.role === targetRole);
  }

  if (!hasRole) {
    // Catat upaya pergantian peran ilegal ke audit log (OWASP ASVS 403 Forbidden)
    await logAuditEvent({
      actor_id: session.user.id,
      active_role: session.active_role,
      ip_address: clientIp,
      action_type: 'SWITCH_ROLE_FORBIDDEN',
      target_id: targetRole,
      status_code: 403,
      details: `Upaya tidak sah beralih ke peran '${targetRole}'. Peran tidak terdaftar pada tabel user_roles milik pengguna.`,
    });

    return NextResponse.json(
      { error: 'Peran tidak diizinkan untuk akun ini' },
      { status: 403, headers: NO_CACHE_HEADERS }
    );
  }

  // 4. Perbarui active_role pada tabel sessions
  const previousRole = session.active_role;
  try {
    await prisma.session.update({
      where: { id: session.id },
      data: {
        active_role: targetRole,
        last_activity_at: new Date(),
      },
    });
  } catch {
    const sess = mockStore.sessions.get(session.token_hash);
    if (sess) {
      sess.active_role = targetRole;
      sess.last_activity_at = new Date();
    }
  }

  // 5. Catat Pergantian Peran Sukses ke Audit Log
  await logAuditEvent({
    actor_id: session.user.id,
    active_role: targetRole,
    ip_address: clientIp,
    action_type: 'SWITCH_ROLE_SUCCESS',
    target_id: targetRole,
    status_code: 200,
    details: `Pengguna ${session.user.nama_lengkap} (${session.user.nip_npm}) berhasil beralih peran dari ${previousRole} ke ${targetRole}.`,
  });

  return NextResponse.json(
    {
      message: 'Peran berhasil diubah',
      active_role: targetRole,
    },
    { status: 200, headers: NO_CACHE_HEADERS }
  );
}
