import { NextRequest, NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { getCurrentSession, SessionWithUser } from '@/lib/auth/session';
import { extractClientIp, logAuditEvent } from '@/lib/audit';

export interface RoleAuthSuccess {
  authorized: true;
  session: SessionWithUser;
  user: SessionWithUser['user'];
  activeRole: Role;
  clientIp: string;
}

export interface RoleAuthFailure {
  authorized: false;
  response: NextResponse;
  clientIp: string;
}

export type RoleAuthResult = RoleAuthSuccess | RoleAuthFailure;

/**
 * Server Guard berprinsip Default Deny untuk memverifikasi autentikasi sesi
 * dan otorisasi peran aktif (active_role) terhadap daftar peran yang diizinkan (allowedRoles).
 *
 * Jika tidak berhak:
 * - Menolak permintaan dengan status HTTP 403 Forbidden (atau 401 Unauthorized jika belum login).
 * - Mencatat peristiwa pelanggaran akses secara otomatis ke audit_logs.
 */
export async function requireRole(
  request: NextRequest | Request,
  allowedRoles: Role[],
  actionContext?: string
): Promise<RoleAuthResult> {
  const clientIp = extractClientIp(request);

  // Ekstrak token dari header cookie request jika ada
  let tokenFromReq: string | undefined;
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)session_token=([^;]+)/);
    if (match) tokenFromReq = match[1];
  }

  // 1. Validasi Autentikasi Sesi (Default Deny)
  const session = await getCurrentSession(tokenFromReq);
  if (!session) {
    await logAuditEvent({
      actor_id: null,
      active_role: null,
      ip_address: clientIp,
      action_type: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      target_id: actionContext ?? request.url,
      status_code: 401,
      details: 'Percobaan akses endpoint terproteksi tanpa sesi autentikasi yang valid.',
    });

    return {
      authorized: false,
      clientIp,
      response: NextResponse.json(
        { error: 'Sesi telah kedaluwarsa atau tidak terautentikasi' },
        { status: 401 }
      ),
    };
  }

  const activeRole = session.active_role as Role;

  // 2. Verifikasi Integritas: Pastikan active_role benar-benar dimiliki pengguna
  const isRoleOwned = session.user.roles.some((r) => r.role === activeRole);
  if (!isRoleOwned) {
    await logAuditEvent({
      actor_id: session.user.id,
      active_role: activeRole,
      ip_address: clientIp,
      action_type: 'ROLE_SPOOFING_DETECTED',
      target_id: actionContext ?? request.url,
      status_code: 403,
      details: `Integritas sesi gagal: peran aktif '${activeRole}' tidak terdaftar pada tabel user_roles milik pengguna.`,
    });

    return {
      authorized: false,
      clientIp,
      response: NextResponse.json(
        { error: 'Akses ditolak: integritas peran tidak valid' },
        { status: 403 }
      ),
    };
  }

  // 3. Verifikasi Otorisasi: Pastikan peran aktif termasuk dalam daftar yang diizinkan
  const isAllowed = allowedRoles.includes(activeRole);
  if (!isAllowed) {
    await logAuditEvent({
      actor_id: session.user.id,
      active_role: activeRole,
      ip_address: clientIp,
      action_type: 'ACCESS_DENIED_RBAC',
      target_id: actionContext ?? request.url,
      status_code: 403,
      details: `Akses ditolak untuk peran '${activeRole}'. Endpoint ini hanya mengizinkan peran: [${allowedRoles.join(', ')}].`,
    });

    return {
      authorized: false,
      clientIp,
      response: NextResponse.json(
        { error: 'Akses ditolak: Anda tidak memiliki wewenang untuk tindakan ini' },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    session,
    user: session.user,
    activeRole,
    clientIp,
  };
}
