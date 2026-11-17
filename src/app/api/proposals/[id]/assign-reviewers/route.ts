import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mockStore } from '@/lib/mockStore';
import { requireRole } from '@/lib/rbac/requireRole';
import { assertProposalInScope } from '@/lib/rbac/scopeFilter';
import { validateReviewerAssignments } from '@/lib/rbac/coiGuard';
import { assignReviewersSchema } from '@/lib/rbac/dto';
import { logAuditEvent } from '@/lib/audit';
import { Role } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authResult = await requireRole(
    request,
    [Role.KA_PPM],
    `ASSIGN_REVIEWERS_${id}`
  );

  if (!authResult.authorized) {
    return authResult.response;
  }

  const { user, session, clientIp } = authResult;

  // 1. Verifikasi Otorisasi Berkas Sisi Server (Anti-IDOR / BOLA)
  const isAllowed = await assertProposalInScope(
    id,
    session,
    'ASSIGN_REVIEWERS',
    clientIp
  );

  if (!isAllowed) {
    return NextResponse.json(
      { error: 'Akses ditolak: Anda tidak memiliki wewenang mengelola berkas ini' },
      { status: 403 }
    );
  }

  // 2. Ambil Proposal dari Database
  let proposal: any = null;
  try {
    proposal = await prisma.proposal.findUnique({
      where: { id },
      include: {
        ketua: true,
        members: true,
      },
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

    // 3. Validasi Skema Input Zod Allowlist (1-3 penelaah, slot 1-3)
    const parseResult = assignReviewersSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Format penugasan penelaah tidak valid',
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { assignments } = parseResult.data;

    // 4. Penegakan Aturan Anti-Konflik Kepentingan (Anti-COI Guard)
    const coiCheck = await validateReviewerAssignments(
      proposal.id,
      assignments,
      user.id,
      clientIp
    );

    if (!coiCheck.isValid) {
      return NextResponse.json(
        {
          error: 'Penunjukan penelaah ditolak otomatis oleh sistem (Konflik Kepentingan terdeteksi).',
          details: coiCheck.errors,
        },
        { status: 403 }
      );
    }

    // 5. Simpan Penugasan Penelaah (Slot 1, 2, 3) dalam Transaksi Database
    try {
      await prisma.$transaction(async (tx) => {
        // Hapus penugasan lama untuk proposal ini jika ada pembaruan
        await tx.proposalReview.deleteMany({
          where: { proposal_id: proposal.id },
        });

        // Masukkan penugasan baru
        for (const item of assignments) {
          await tx.proposalReview.create({
            data: {
              proposal_id: proposal.id,
              reviewer_id: item.reviewer_id,
              reviewer_slot: item.reviewer_slot,
              skor: null,
              catatan: null,
              is_locked: false,
            },
          });
        }

        // Perbarui status proposal ke PENILAIAN_REVIEWER
        await tx.proposal.update({
          where: { id: proposal.id },
          data: {
            status: 'PENILAIAN_REVIEWER',
          },
        });
      });
    } catch {
      proposal.reviews = assignments.map((item, idx) => ({
        id: `pr-${Date.now()}-${idx}`,
        proposal_id: proposal.id,
        reviewer_id: item.reviewer_id,
        reviewer_slot: item.reviewer_slot,
        skor: null,
        catatan: null,
        is_locked: false,
        submitted_at: null,
      }));
      proposal.status = 'PENILAIAN_REVIEWER';
    }

    // 6. Catat ke Audit Log Permanen
    await logAuditEvent({
      actor_id: user.id,
      active_role: Role.KA_PPM,
      ip_address: clientIp,
      action_type: 'ASSIGN_REVIEWERS',
      target_id: proposal.id,
      status_code: 200,
      details: `Ka. Pusat PPM (${user.nama_lengkap}) menugaskan ${assignments.length} penelaah untuk proposal '${proposal.judul}'. Lolos pemeriksaan Anti-COI.`,
    });

    return NextResponse.json({
      success: true,
      message: `Berhasil menugaskan ${assignments.length} penelaah tanpa konflik kepentingan.`,
    });
  } catch (error: any) {
    console.error('Error saat menugaskan reviewer:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memproses penugasan penelaah' },
      { status: 500 }
    );
  }
}
