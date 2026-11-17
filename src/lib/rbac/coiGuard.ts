import { prisma } from '@/lib/prisma';
import { mockStore } from '@/lib/mockStore';
import { logAuditEvent } from '@/lib/audit';

export interface CoiCheckResult {
  hasConflict: boolean;
  reason?: string;
}

/**
 * Memeriksa potensi Konflik Kepentingan (Conflict of Interest - COI) secara otomatis
 * sebelum penunjukan penelaah atau sebelum penelaah mengakses dan menilai proposal.
 *
 * Aturan Pencegahan COI (Perdir Poltek SSN No. 1/2025 & OWASP ASVS):
 * Seorang Reviewer DILARANG ditunjuk atau mengakses berkas jika:
 * 1. reviewer_id sama dengan ketua_id proposal terkait.
 * 2. reviewer_id terdaftar sebagai salah satu anggota tim di proposal_members.
 */
export async function checkConflictOfInterest(
  proposalId: string,
  reviewerId: string
): Promise<CoiCheckResult> {
  if (!proposalId || !reviewerId) {
    return {
      hasConflict: true,
      reason: 'ID Proposal dan ID Penelaah wajib disertakan.',
    };
  }

  try {
    let proposal: any = null;
    try {
      proposal = await prisma.proposal.findUnique({
        where: { id: proposalId },
        select: {
          id: true,
          ketua_id: true,
          judul: true,
          members: {
            select: {
              user_id: true,
            },
          },
        },
      });
    } catch {
      proposal = mockStore.proposals.find((p) => p.id === proposalId);
    }

    if (!proposal) {
      return {
        hasConflict: true,
        reason: 'Proposal tidak ditemukan.',
      };
    }

    // 1. Periksa apakah Reviewer adalah Ketua Tim Pengusul
    if (proposal.ketua_id === reviewerId) {
      return {
        hasConflict: true,
        reason: 'Penelaah tercatat sebagai Ketua Tim Pengusul pada berkas ini (Konflik Kepentingan).',
      };
    }

    // 2. Periksa apakah Reviewer terdaftar sebagai Anggota Tim
    const isMember = proposal.members.some((member: any) => member.user_id === reviewerId);
    if (isMember) {
      return {
        hasConflict: true,
        reason: 'Penelaah tercatat sebagai Anggota Tim Pengusul pada berkas ini (Konflik Kepentingan).',
      };
    }

    return { hasConflict: false };
  } catch (error) {
    console.error('Error saat memeriksa COI pada basis data:', error);
    // Prinsip Fail-Secure / Default Deny: jika basis data tidak dapat dijangkau, anggap berkonflik
    return {
      hasConflict: true,
      reason: 'Pemeriksaan konflik kepentingan gagal pada basis data (Default Deny).',
    };
  }
}

/**
 * Penegakan aturan anti-COI: Jika ditemukan konflik kepentingan,
 * fungsi ini akan mencatat pelanggaran ke audit_logs dan mengembalikan hasil konflik.
 */
export async function assertNoConflictOfInterest(
  proposalId: string,
  reviewerId: string,
  actorId?: string,
  clientIp = '127.0.0.1'
): Promise<CoiCheckResult> {
  const result = await checkConflictOfInterest(proposalId, reviewerId);

  if (result.hasConflict) {
    await logAuditEvent({
      actor_id: actorId ?? reviewerId,
      active_role: 'REVIEWER',
      ip_address: clientIp,
      action_type: 'COI_VIOLATION_BLOCKED',
      target_id: proposalId,
      status_code: 403,
      details: `Penunjukan atau akses penelaahan diblokir otomatis akibat Konflik Kepentingan: ${result.reason}`,
    });
  }

  return result;
}

/**
 * Validasi penunjukan daftar Reviewer (Slot 1, 2, 3) oleh Ka. Pusat PPM:
 * - Memastikan tidak ada reviewer yang melanggar COI.
 * - Memastikan tidak ada reviewer ganda yang ditugaskan pada proposal yang sama.
 * - Memastikan nomor slot berada pada rentang 1 hingga 3.
 */
export async function validateReviewerAssignments(
  proposalId: string,
  assignments: Array<{ reviewer_id: string; reviewer_slot: number }>,
  actorId?: string,
  clientIp = '127.0.0.1'
): Promise<{ isValid: boolean; errors: string[] }> {
  const errors: string[] = [];
  const seenReviewers = new Set<string>();
  const seenSlots = new Set<number>();

  for (const item of assignments) {
    // 1. Validasi slot reviewer (1 - 3)
    if (item.reviewer_slot < 1 || item.reviewer_slot > 3) {
      errors.push(`Slot reviewer ${item.reviewer_slot} tidak valid (harus 1, 2, atau 3).`);
    }

    if (seenSlots.has(item.reviewer_slot)) {
      errors.push(`Slot reviewer ${item.reviewer_slot} ditugaskan lebih dari satu kali.`);
    }
    seenSlots.add(item.reviewer_slot);

    // 2. Validasi duplikasi reviewer pada proposal yang sama
    if (seenReviewers.has(item.reviewer_id)) {
      errors.push(`Penelaah dengan ID '${item.reviewer_id}' ditugaskan pada lebih dari satu slot.`);
    }
    seenReviewers.add(item.reviewer_id);

    // 3. Validasi Konflik Kepentingan (COI)
    const coiResult = await assertNoConflictOfInterest(
      proposalId,
      item.reviewer_id,
      actorId,
      clientIp
    );

    if (coiResult.hasConflict) {
      errors.push(`Penelaah ID '${item.reviewer_id}': ${coiResult.reason}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
