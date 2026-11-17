import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mockStore } from '@/lib/mockStore';
import { requireRole } from '@/lib/rbac/requireRole';
import { assertProposalInScope } from '@/lib/rbac/scopeFilter';
import { verifyPassword } from '@/lib/auth/password';
import { generateApprovalQR } from '@/services/documentService';
import { logAuditEvent } from '@/lib/audit';
import { Role } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authResult = await requireRole(
    request,
    [Role.DIREKTUR],
    `APPROVE_FUNDING_${id}`
  );

  if (!authResult.authorized) {
    return authResult.response;
  }

  const { user, session, clientIp } = authResult;

  // 1. Verifikasi Otorisasi Berkas Sisi Server (Anti-IDOR / BOLA)
  const isAllowed = await assertProposalInScope(
    id,
    session,
    'APPROVE_FUNDING',
    clientIp
  );

  if (!isAllowed) {
    return NextResponse.json(
      { error: 'Akses ditolak: Anda tidak memiliki wewenang atas proposal ini' },
      { status: 403 }
    );
  }

  // 2. Ambil Proposal dari Database / MockStore
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

  try {
    const rawBody = await request.json();
    const { password, catatan = '' } = rawBody;

    // 3. Wajibkan Konfirmasi Ulang Password Pengguna (Tanda Tangan Digital Internal BSrE)
    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        {
          error:
            'Konfirmasi kata sandi pimpinan wajib diisi sebagai tanda tangan digital penetapan dana resmi.',
        },
        { status: 400 }
      );
    }

    // Ambil hash password Direktur
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

    const isPasswordValid = await verifyPassword(password, passwordHash);
    if (!isPasswordValid) {
      await logAuditEvent({
        actor_id: user.id,
        active_role: Role.DIREKTUR,
        ip_address: clientIp,
        action_type: 'FUNDING_APPROVAL_AUTH_FAILED',
        target_id: proposal.id,
        status_code: 401,
        details: `Kegagalan otentikasi pengesahan pendanaan: Kata sandi yang dimasukkan oleh Direktur ${user.nama_lengkap} salah.`,
      });

      return NextResponse.json(
        { error: 'Kata sandi konfirmasi salah. Pengesahan penetapan pendanaan ditolak.' },
        { status: 401 }
      );
    }

    // 4. Bangkitkan Bukti QR Code Validasi Digital Internal
    const now = new Date();
    const qrCodeDataUrl = await generateApprovalQR(
      proposal.id,
      user.id,
      now,
      'SK_PENETAPAN_PENDANAAN_DIREKTUR_POLTEK_SSN'
    );

    // 5. Perbarui Status Proposal ke DISETUJUI
    let updatedProposal: any = null;
    try {
      updatedProposal = await prisma.proposal.update({
        where: { id: proposal.id },
        data: {
          status: 'DISETUJUI',
        },
      });
    } catch {
      proposal.status = 'DISETUJUI';
      updatedProposal = proposal;
    }

    // 6. Catat ke Audit Log Permanen
    await logAuditEvent({
      actor_id: user.id,
      active_role: Role.DIREKTUR,
      ip_address: clientIp,
      action_type: 'DIRECTOR_FUNDING_APPROVED',
      target_id: proposal.id,
      status_code: 200,
      details: `Direktur (${user.nama_lengkap}) secara resmi mengesahkan penetapan pendanaan untuk proposal '${proposal.judul}' (${proposal.no_registrasi || proposal.no_agenda}). Catatan: ${catatan || '-'}. QR Code verifikasi telah diterbitkan.`,
    });

    return NextResponse.json({
      success: true,
      message: 'Penetapan pendanaan akhir berhasil disahkan oleh Direktur Poltek SSN.',
      qr_code: qrCodeDataUrl,
      data: updatedProposal,
    });
  } catch (error: any) {
    console.error('Error saat menetapkan pendanaan:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memproses penetapan pendanaan' },
      { status: 500 }
    );
  }
}
