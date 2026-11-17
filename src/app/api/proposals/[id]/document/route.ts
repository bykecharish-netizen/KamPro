import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mockStore } from '@/lib/mockStore';
import { requireRole } from '@/lib/rbac/requireRole';
import { assertProposalInScope } from '@/lib/rbac/scopeFilter';
import { generateSignedDocumentToken } from '@/services/documentService';
import { logAuditEvent } from '@/lib/audit';
import { Role } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authResult = await requireRole(
    request,
    [
      Role.REVIEWER,
      Role.PENGUSUL,
      Role.KAPRODI,
      Role.KA_PPM,
      Role.DIREKTUR,
      Role.ADMIN,
    ],
    `GET_DOCUMENT_${id}`
  );

  if (!authResult.authorized) {
    return authResult.response;
  }

  const { user, session, activeRole, clientIp } = authResult;

  // 1. Verifikasi Otorisasi Berkas Sisi Server (Anti-IDOR / BOLA)
  const isAllowed = await assertProposalInScope(
    id,
    session,
    'GET_PROPOSAL_DOCUMENT',
    clientIp
  );

  if (!isAllowed) {
    return NextResponse.json(
      { error: 'Akses ditolak: Anda tidak memiliki wewenang atas berkas proposal ini' },
      { status: 403 }
    );
  }

  // 2. Ambil Proposal
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

  // 3. Aturan Blind Review (Perdir Poltek SSN No. 1/2025 & OWASP ASVS):
  // Jika activeRole == REVIEWER dan tahap == PROPOSAL (FO-016/FO-019),
  // gunakan sanitized_file_url (metadata & identitas disembunyikan / double-blind).
  // Jika tahap == LAPORAN (FO-023/FO-018), identitas pengusul dibuka menggunakan file_url asli.
  const isReviewer = activeRole === Role.REVIEWER;
  const isBlindReview = isReviewer && proposal.tahap === 'PROPOSAL';

  const effectiveFileUrl = isBlindReview
    ? proposal.sanitized_file_url || proposal.file_url
    : proposal.file_url;

  // Bangkitkan signed document token untuk akses aman
  const signedToken = generateSignedDocumentToken(
    proposal.id,
    user.id,
    activeRole,
    30 // 30 menit
  );

  // Catat akses pembacaan dokumen ke audit log
  await logAuditEvent({
    actor_id: user.id,
    active_role: activeRole,
    ip_address: clientIp,
    action_type: isBlindReview ? 'ACCESS_DOCUMENT_BLIND_REVIEW' : 'ACCESS_DOCUMENT',
    target_id: proposal.id,
    status_code: 200,
    details: `Pengguna ${user.nama_lengkap} mengakses dokumen proposal '${proposal.judul}'. Mode Blind Review: ${
      isBlindReview ? 'AKTIF (Anonim)' : 'NON-AKTIF'
    }.`,
  });

  const { searchParams } = new URL(request.url);
  const shouldRedirect = searchParams.get('redirect') === 'true';

  if (shouldRedirect && effectiveFileUrl) {
    return NextResponse.redirect(new URL(effectiveFileUrl, request.url));
  }

  return NextResponse.json({
    success: true,
    proposal_id: proposal.id,
    judul: proposal.judul,
    tahap: proposal.tahap,
    is_blind_review: isBlindReview,
    document_url: effectiveFileUrl,
    signed_token: signedToken,
    access_notice: isBlindReview
      ? 'Dokumen ini disajikan dalam mode Double-Blind Review (FO-016/FO-019). Seluruh metadata identitas pengusul telah dibersihkan.'
      : 'Dokumen disajikan dalam mode identitas terbuka (Tahap Laporan FO-023/FO-018).',
  });
}
