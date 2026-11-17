import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  let tokenFromReq: string | undefined;
  const cookieHeader = request?.headers?.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)session_token=([^;]+)/);
    if (match) tokenFromReq = match[1];
  }

  const session = await getCurrentSession(tokenFromReq);

  if (!session) {
    const errorRes = NextResponse.json(
      { error: 'Tidak terautentikasi atau sesi telah kedaluwarsa' },
      { status: 401 }
    );
    errorRes.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    return errorRes;
  }

  // DTO profil aman tanpa menyertakan password_hash (Anti-BOPLA / ASVS Level 1)
  const userResponse = {
    id: session.user.id,
    nip_npm: session.user.nip_npm,
    email: session.user.email,
    nama_lengkap: session.user.nama_lengkap,
    gelar: session.user.gelar,
    prodi: session.user.prodi,
    kelompok_keilmuan: session.user.kelompok_keilmuan,
    kelas: session.user.kelas,
    no_hp: session.user.no_hp,
    is_active: session.user.is_active,
    roles: session.user.roles.map((r: any) => r.role || r),
    active_role: session.active_role,
  };

  const response = NextResponse.json(
    { user: userResponse },
    { status: 200 }
  );

  // Pasang header Cache-Control: no-store (Anti-Browser Cache Leakage OWASP ASVS)
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

  return response;
}
