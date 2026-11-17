import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mockStore } from '@/lib/mockStore';
import { requireRole } from '@/lib/rbac/requireRole';
import { assertProposalInScope } from '@/lib/rbac/scopeFilter';
import { assertNoConflictOfInterest } from '@/lib/rbac/coiGuard';
import { verifyPassword } from '@/lib/auth/password';
import { submitReviewSchema } from '@/lib/rbac/dto';
import { sanitizeHtml } from '@/lib/sanitization';
import { logAuditEvent } from '@/lib/audit';
import { Role } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  const { proposalId } = await params;

  const authResult = await requireRole(
    request,
    [Role.REVIEWER],
    `SUBMIT_REVIEW_${proposalId}`
  );

  if (!authResult.authorized) {
    return authResult.response;
  }

  const { user, session, clientIp } = authResult;

  // 1. Verifikasi Otorisasi Berkas Sisi Server (Anti-IDOR / BOLA)
  const isAllowed = await assertProposalInScope(
    proposalId,
    session,
    'SUBMIT_REVIEW',
    clientIp
  );

  if (!isAllowed) {
    return NextResponse.json(
      { error: 'Akses ditolak: Anda tidak memiliki wewenang menelaah proposal ini' },
      { status: 403 }
    );
  }

  // 2. Verifikasi Anti-Konflik Kepentingan (Anti-COI Guard)
  const coiCheck = await assertNoConflictOfInterest(
    proposalId,
    user.id,
    user.id,
    clientIp
  );

  if (coiCheck.hasConflict) {
    return NextResponse.json(
      {
        error: 'Akses ditolak akibat Konflik Kepentingan.',
        details: coiCheck.reason,
      },
      { status: 403 }
    );
  }

  try {
    const rawBody = await request.json();
    const { password, ...reviewData } = rawBody;

    // 3. Validasi Skema Input Zod Allowlist (Anti-Mass Assignment)
    const parseResult = submitReviewSchema.safeParse(reviewData);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Format data penilaian tidak valid',
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { skor, catatan, is_locked } = parseResult.data;
    const sanitizedCatatan = sanitizeHtml(catatan);

    // 4. Validasi Konfirmasi Ulang Password Saat Mengunci Penilaian (is_locked = true)
    if (is_locked) {
      if (!password || typeof password !== 'string') {
        return NextResponse.json(
          {
            error:
              'Konfirmasi kata sandi wajib diisi sebagai tanda tangan digital saat mengunci penilaian resmi.',
          },
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

      const isPasswordValid = await verifyPassword(password, passwordHash);
      if (!isPasswordValid) {
        await logAuditEvent({
          actor_id: user.id,
          active_role: Role.REVIEWER,
          ip_address: clientIp,
          action_type: 'REVIEW_LOCK_AUTH_FAILED',
          target_id: proposalId,
          status_code: 401,
          details: `Kegagalan otentikasi penguncian review: Kata sandi yang dimasukkan oleh Reviewer ${user.nama_lengkap} salah.`,
        });

        return NextResponse.json(
          { error: 'Kata sandi konfirmasi salah. Penguncian penilaian ditolak.' },
          { status: 401 }
        );
      }
    }

    // 5. Simpan Skor dan Catatan HANYA pada slot reviewer_id yang ditugaskan
    let existingReview: any = null;
    try {
      existingReview = await prisma.proposalReview.findUnique({
        where: {
          proposal_id_reviewer_id: {
            proposal_id: proposalId,
            reviewer_id: user.id,
          },
        },
      });
    } catch {
      const p = mockStore.proposals.find((p) => p.id === proposalId);
      if (p) {
        existingReview = p.reviews.find((r) => r.reviewer_id === user.id);
      }
    }

    if (!existingReview) {
      return NextResponse.json(
        {
          error:
            'Akses ditolak: Anda tidak tercatat dalam penugasan resmi sebagai penelaah berkas ini.',
        },
        { status: 403 }
      );
    }

    if (existingReview.is_locked) {
      return NextResponse.json(
        {
          error:
            'Penilaian ini telah dikunci permanen sebelumnya dan tidak dapat diubah lagi.',
        },
        { status: 400 }
      );
    }

    // 6. Update Penilaian di Database / MockStore
    const now = new Date();
    let updatedReview: any = null;
    let allReviewsForProposal: any[] = [];
    let updatedProposal: any = null;

    try {
      updatedReview = await prisma.proposalReview.update({
        where: { id: existingReview.id },
        data: {
          skor,
          catatan: sanitizedCatatan,
          is_locked,
          submitted_at: is_locked ? now : null,
        },
      });

      allReviewsForProposal = await prisma.proposalReview.findMany({
        where: { proposal_id: proposalId },
      });
    } catch {
      existingReview.skor = skor;
      existingReview.catatan = sanitizedCatatan;
      existingReview.is_locked = is_locked;
      existingReview.submitted_at = is_locked ? now : null;
      updatedReview = existingReview;

      const p = mockStore.proposals.find((p) => p.id === proposalId);
      if (p) {
        allReviewsForProposal = p.reviews;
      }
    }

    // 7. Hitung Ulang skor_rata_rata Proposal jika Seluruh Slot Terkunci
    const allSlotsLocked =
      allReviewsForProposal.length > 0 &&
      allReviewsForProposal.every((r) => r.is_locked && r.skor !== null);

    let newAverageScore: number | null = null;
    let nextStatus = '';

    if (allSlotsLocked) {
      const sum = allReviewsForProposal.reduce((acc, curr) => acc + (curr.skor || 0), 0);
      newAverageScore = Math.round((sum / allReviewsForProposal.length) * 10) / 10;

      // Aturan alur bisnis PRD:
      // Jika skor < 60: Status berubah ke REVISI (Pengusul dapat mengunggah revisi)
      // Jika skor >= 60: Status berubah ke MENUNGGU_PENETAPAN (Siap disahkan oleh Direktur)
      nextStatus = newAverageScore < 60 ? 'REVISI' : 'MENUNGGU_PENETAPAN';

      try {
        updatedProposal = await prisma.proposal.update({
          where: { id: proposalId },
          data: {
            skor_rata_rata: newAverageScore,
            status: nextStatus,
          },
        });
      } catch {
        const p = mockStore.proposals.find((p) => p.id === proposalId);
        if (p) {
          p.skor_rata_rata = newAverageScore;
          p.status = nextStatus;
          updatedProposal = p;
        }
      }
    }

    // 8. Catat ke Audit Log Permanen
    await logAuditEvent({
      actor_id: user.id,
      active_role: Role.REVIEWER,
      ip_address: clientIp,
      action_type: is_locked ? 'REVIEW_LOCKED_AND_SIGNED' : 'REVIEW_DRAFT_SAVED',
      target_id: proposalId,
      status_code: 200,
      details: `Penelaah ${user.nama_lengkap} (Slot ${existingReview.reviewer_slot}) menyimpan penilaian (Skor: ${skor}). Status Kunci: ${
        is_locked ? 'DIKUNCI' : 'DRAFT'
      }.${
        allSlotsLocked
          ? ` Seluruh slot penelaah terkunci. Skor rata-rata direkapitulasi: ${newAverageScore} (Status baru: ${nextStatus}).`
          : ''
      }`,
    });

    return NextResponse.json({
      success: true,
      message: is_locked
        ? 'Penilaian berhasil dikunci dan disahkan secara digital.'
        : 'Draft penilaian berhasil disimpan.',
      data: {
        review: updatedReview,
        is_all_locked: allSlotsLocked,
        skor_rata_rata: newAverageScore,
        proposal_status: updatedProposal ? updatedProposal.status : undefined,
      },
    });
  } catch (error: any) {
    console.error('Error saat menyimpan review:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memproses penilaian' },
      { status: 500 }
    );
  }
}
