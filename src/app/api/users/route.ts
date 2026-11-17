import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mockStore } from '@/lib/mockStore';
import { getCurrentSession } from '@/lib/auth/session';
import { Role } from '@prisma/client';

export async function GET(request: NextRequest) {
  let tokenFromReq: string | undefined;
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)session_token=([^;]+)/);
    if (match) tokenFromReq = match[1];
  }

  const session = await getCurrentSession(tokenFromReq);
  if (!session) {
    return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const roleQuery = searchParams.get('role');
  const searchQuery = searchParams.get('q');

  try {
    const whereClause: any = {
      is_active: true,
    };

    if (roleQuery && Object.values(Role).includes(roleQuery as Role)) {
      whereClause.roles = {
        some: {
          role: roleQuery as Role,
        },
      };
    }

    if (searchQuery && searchQuery.trim() !== '') {
      const q = searchQuery.trim();
      whereClause.OR = [
        { nip_npm: { contains: q, mode: 'insensitive' } },
        { nama_lengkap: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        nip_npm: true,
        nama_lengkap: true,
        gelar: true,
        prodi: true,
        kelompok_keilmuan: true,
        kelas: true,
        roles: {
          select: {
            role: true,
          },
        },
      },
      orderBy: {
        nama_lengkap: 'asc',
      },
      take: 50,
    });

    const formattedUsers = users.map((u) => ({
      id: u.id,
      nip_npm: u.nip_npm,
      nama_lengkap: u.nama_lengkap,
      gelar: u.gelar,
      prodi: u.prodi,
      kelompok_keilmuan: u.kelompok_keilmuan,
      kelas: u.kelas,
      roles: u.roles.map((r) => r.role),
    }));

    return NextResponse.json({
      success: true,
      data: formattedUsers,
    });
  } catch {
    // Fallback in-memory mock store
    let users = mockStore.users.filter((u) => u.is_active);

    if (roleQuery && Object.values(Role).includes(roleQuery as Role)) {
      users = users.filter((u) => u.roles.some((r) => r.role === roleQuery));
    }

    if (searchQuery && searchQuery.trim() !== '') {
      const q = searchQuery.trim().toLowerCase();
      users = users.filter(
        (u) =>
          u.nip_npm.toLowerCase().includes(q) ||
          u.nama_lengkap.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }

    const formattedUsers = users.map((u) => ({
      id: u.id,
      nip_npm: u.nip_npm,
      nama_lengkap: u.nama_lengkap,
      gelar: u.gelar,
      prodi: u.prodi,
      kelompok_keilmuan: u.kelompok_keilmuan,
      kelas: u.kelas,
      roles: u.roles.map((r) => r.role),
    }));

    return NextResponse.json({
      success: true,
      data: formattedUsers,
    });
  }
}

