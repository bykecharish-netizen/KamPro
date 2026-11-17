import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mockStore } from '@/lib/mockStore';
import { requireRole } from '@/lib/rbac/requireRole';
import { assertProposalInScope } from '@/lib/rbac/scopeFilter';
import { verifyPassword } from '@/lib/auth/password';
import { logAuditEvent } from '@/lib/audit';
import { Role } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authResult = await requireRole(
    request,
    [Role.KAPRODI],
    `VALIDATE_CPL_${id}`
  );

  if (!authResult.authorized) {
    return authResult.response;
  }

  const { user, session, clientIp } = authResult;

  // 1. Verifikasi Otorisasi Berkas Sisi Server (Anti-IDOR / BOLA)
  const isAllowed = await assertProposalInScope(
    id,
    session,
    'VALIDATE_CPL',
    clientIp
  );

  if (!isAllowed) {
    return NextResponse.json(
      { error: 'Akses ditolak: Proposal ini berada di luar program studi Anda' },
      { status: 403 }
    );
  }

  // 2. Ambil Proposal dari Database
  let proposal: any = null;
  try {
    proposal = await prisma.proposal.findUnique({
      where: { id },
    });
  } catch {
    proposal = mockStore.proposals.find((p) => p.id === id);
  }

  if (!proposal) {
    return NextResponse.json(
      { error: 'Proposal tidak ditemukan' },
      { status: 404 }
    );
  }

  // 3. Validasi Program Studi (Harus Sama dengan Prodi Kaprodi)
  if (proposal.prodi !== user.prodi) {
    await logAuditEvent({
      actor_id: user.id,
      active_role: Role.KAPRODI,
      ip_address: clientIp,
      action_type: 'CROSS_PRODI_VALIDATION_BLOCKED',
      target_id: proposal.id,
      status_code: 403,
      details: `Percobaan validasi CPL lintas prodi diblokir. Proposal prodi: '${proposal.prodi}', Kaprodi prodi: '${user.prodi}'.`,
    });

    return NextResponse.json(
      { error: 'Akses ditolak: Anda hanya dapat memvalidasi usulan dari program studi Anda sendiri.' },
      { status: 403 }
    );
  }

  // 4. Baca Body dan Wajibkan Konfirmasi Kata Sandi (Pengesahan Digital Internal)
  try {
    const body = await request.json();
    const { password, is_approved = true, catatan = '' } = body;

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Konfirmasi kata sandi wajib diisi sebagai tanda tangan digital internal.' },
        { status: 400 }
      );
    }

    // Ambil hash password pengguna
    let passwordHash = '';
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { password_hash: true },
      });
      if (dbUser) passwordHash = dbUser.password_hash;
    } catch {
      const mUser = mockStore.users.find((u) => u.id === user.id);
      if (mUser) passwordHash = mUser.password_hash;
    }

    if (!passwordHash) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 404 });
    }

    const isPasswordValid = await verifyPassword(password, passwordHash);
    if (!isPasswordValid) {
      await logAuditEvent({
        actor_id: user.id,
        active_role: Role.KAPRODI,
        ip_address: clientIp,
        action_type: 'CPL_DIGITAL_SIGNATURE_AUTH_FAILED',
        target_id: proposal.id,
        status_code: 401,
        details: `Kegagalan otentikasi pengesahan digital CPL: Kata sandi yang dimasukkan salah oleh Kaprodi ${user.nama_lengkap}.`,
      });

      return NextResponse.json(
        { error: 'Kata sandi konfirmasi salah. Pengesahan digital CPL ditolak.' },
        { status: 401 }
      );
    }

    // 5. Ubah Status Berkas
    // Jika disetujui: Lanjut ke tahap verifikasi Pusat PPM (MENUNGGU_REGISTRASI_PPM)
    // Jika tidak disetujui: Dikembalikan ke Pengusul (REVISI)
    const targetStatus = is_approved ? 'MENUNGGU_REGISTRASI_PPM' : 'REVISI';

    let updated: any = null;
    try {
      updated = await prisma.proposal.update({
        where: { id },
        data: {
          status: targetStatus,
        },
      });
    } catch {
      proposal.status = targetStatus;
      updated = proposal;
    }

    // 6. Catat ke Audit Log
    await logAuditEvent({
      actor_id: user.id,
      active_role: Role.KAPRODI,
      ip_address: clientIp,
      action_type: is_approved ? 'CPL_VALIDATION_APPROVED' : 'CPL_VALIDATION_REJECTED',
      target_id: proposal.id,
      status_code: 200,
      details: `Kaprodi ${user.nama_lengkap} (${user.prodi}) berhasil memvalidasi kesesuaian CPL proposal '${proposal.judul}'. Hasil: ${
        is_approved ? 'DISETUJUI -> MENUNGGU_REGISTRASI_PPM' : 'REVISI'
      }. Catatan: ${catatan || '-'}`,
    });

    return NextResponse.json({
      success: true,
      message: is_approved
        ? 'Validasi CPL berhasil disahkan dan diteruskan ke verifikasi Pusat PPM.'
        : 'Proposal dikembalikan ke pengusul untuk perbaikan.',
      data: updated,
    });
  } catch (error: any) {
    console.error('Error saat memvalidasi CPL:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memproses validasi CPL' },
      { status: 500 }
    );
  }
}
