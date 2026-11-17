import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { mockStore } from '@/lib/mockStore';
import { getCurrentSession } from '@/lib/auth/session';
import { extractClientIp, logAuditEvent } from '@/lib/audit';

/**
 * Skema Zod Ketat untuk Pembaruan Profil (Anti-Mass Assignment / Kontrol 2.1.1)
 * HANYA mengizinkan pembaruan field 'no_hp'.
 * Atribut identitas akademik/kepegawaian (nip_npm, nama_lengkap, gelar, prodi, kelompok_keilmuan, role)
 * bersifat READ-ONLY dan ditolak oleh .strict() jika dikirimkan oleh klien.
 */
const updateProfileSchema = z
  .object({
    no_hp: z
      .string()
      .trim()
      .regex(
        /^(08|\+628|628)[0-9]{8,12}$/,
        'Format nomor HP tidak valid (harus diawali 08, 628, atau +628 dengan panjang 10-14 digit)'
      ),
  })
  .strict();

export async function GET(request: NextRequest) {
  let tokenFromReq: string | undefined;
  const cookieHeader = request.headers?.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)session_token=([^;]+)/);
    if (match) tokenFromReq = match[1];
  }

  const session = await getCurrentSession(tokenFromReq);
  if (!session) {
    return NextResponse.json(
      { error: 'Sesi telah kedaluwarsa atau tidak terautentikasi' },
      { status: 401 }
    );
  }

  let user: any = null;
  try {
    user = await prisma.user.findUnique({
      where: { id: session.user_id },
      select: {
        id: true,
        nip_npm: true,
        email: true,
        nama_lengkap: true,
        gelar: true,
        prodi: true,
        kelompok_keilmuan: true,
        kelas: true,
        no_hp: true,
        roles: { select: { role: true } },
      },
    });
  } catch {
    user = mockStore.users.find((u) => u.id === session.user_id);
  }

  if (!user) {
    return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      ...user,
      roles: user.roles?.map((r: any) => r.role || r) || [],
    },
  });
}

export async function PATCH(request: NextRequest) {
  const clientIp = extractClientIp(request);

  // 1. Verifikasi Sesi
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
      { status: 401 }
    );
  }

  // 2. Parsing Body JSON
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Format permintaan JSON tidak valid' },
      { status: 400 }
    );
  }

  // 3. Validasi Skema Ketat (.strict() menolak manipulasi atribut selain no_hp)
  const parseResult = updateProfileSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error:
          'Atribut tidak diizinkan diubah atau format tidak valid. Hanya kolom no_hp yang dapat diperbarui secara mandiri.',
        details: parseResult.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { no_hp } = parseResult.data;

  // 4. Perbarui data nomor HP pada pengguna
  let updatedUser: any = null;
  try {
    updatedUser = await prisma.user.update({
      where: { id: session.user_id },
      data: { no_hp },
      select: {
        id: true,
        nip_npm: true,
        nama_lengkap: true,
        no_hp: true,
      },
    });
  } catch {
    const userInMock = mockStore.users.find((u) => u.id === session.user_id);
    if (userInMock) {
      userInMock.no_hp = no_hp;
      updatedUser = {
        id: userInMock.id,
        nip_npm: userInMock.nip_npm,
        nama_lengkap: userInMock.nama_lengkap,
        no_hp: userInMock.no_hp,
      };
    }
  }

  // 5. Catat ke Audit Log
  await logAuditEvent({
    actor_id: session.user_id,
    active_role: session.active_role,
    ip_address: clientIp,
    action_type: 'USER_PROFILE_UPDATE',
    target_id: session.user_id,
    status_code: 200,
    details: `Pengguna berhasil memperbarui nomor HP menjadi '${no_hp}'.`,
  });

  return NextResponse.json({
    success: true,
    message: 'Profil berhasil diperbarui',
    data: updatedUser,
  });
}
