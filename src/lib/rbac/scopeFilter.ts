import { Prisma, Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { mockStore } from '@/lib/mockStore';
import type { SessionWithUser } from '@/lib/auth/session';
import { logAuditEvent } from '@/lib/audit';

/**
 * Menghasilkan klausa WHERE Prisma otomatis berdasarkan konteks sesi server aktif
 * untuk mencegah kerentanan IDOR (Insecure Direct Object Reference) dan BOLA (Broken Object Level Authorization).
 *
 * Aturan Otorisasi Data Sisi Server (OWASP ASVS Level 1):
 * - PENGUSUL: Hanya proposal milik sendiri (ketua_id == user.id) atau di mana user menjadi anggota tim (proposal_members).
 * - KAPRODI: Hanya proposal yang sesuai dengan Program Studi Kaprodi (prodi == user.prodi).
 * - REVIEWER: Hanya proposal yang ditugaskan kepadanya di tabel proposal_reviews (reviewer_id == user.id).
 * - KA_PPM, DIREKTUR, ADMIN: Akses lintas prodi untuk pengawasan, penetapan, dan tata kelola sistem.
 */
export function getProposalScopeFilter(
  session: SessionWithUser,
  extraWhere?: Prisma.ProposalWhereInput
): Prisma.ProposalWhereInput {
  const activeRole = session.active_role as Role;
  const userId = session.user.id;
  const userProdi = session.user.prodi;

  let roleFilter: Prisma.ProposalWhereInput;

  switch (activeRole) {
    case Role.PENGUSUL:
      // Hanya proposal miliknya sebagai ketua atau sebagai anggota tim
      roleFilter = {
        OR: [
          { ketua_id: userId },
          { members: { some: { user_id: userId } } },
        ],
      };
      break;

    case Role.KAPRODI:
      // Hanya proposal yang terdaftar di program studinya
      roleFilter = {
        prodi: userProdi && userProdi.trim() !== '' ? userProdi : '___UNASSIGNED_PRODI___',
      };
      break;

    case Role.REVIEWER:
      // Hanya proposal yang secara resmi ditugaskan kepada penelaah ini
      roleFilter = {
        reviews: {
          some: {
            reviewer_id: userId,
          },
        },
      };
      break;

    case Role.KA_PPM:
    case Role.DIREKTUR:
    case Role.ADMIN:
      // Akses institusional lintas program studi
      roleFilter = {};
      break;

    default:
      // Prinsip Default Deny: jika peran tidak dikenali, kunci akses ke 0 hasil
      roleFilter = { id: '___FORBIDDEN_SCOPE___' };
      break;
  }

  if (!extraWhere || Object.keys(extraWhere).length === 0) {
    return roleFilter;
  }

  // Gabungkan roleFilter dengan kondisi filter tambahan pemohon menggunakan AND
  return {
    AND: [roleFilter, extraWhere],
  };
}

/**
 * Memeriksa apakah satu proposal tertentu berada dalam lingkup hak akses sesi pengguna.
 * Mencegah IDOR saat pengguna mencoba membaca atau mengubah proposal berdasarkan ID di URL.
 */
export async function isProposalInScope(
  proposalId: string,
  session: SessionWithUser
): Promise<boolean> {
  if (!proposalId) return false;

  try {
    const scopedWhere = getProposalScopeFilter(session, { id: proposalId });
    const count = await prisma.proposal.count({
      where: scopedWhere,
    });
    return count > 0;
  } catch {
    // Fallback in-memory mock store
    const activeRole = session.active_role as Role;
    const userId = session.user.id;
    const userProdi = session.user.prodi;
    const prop = mockStore.proposals.find((p) => p.id === proposalId);
    if (!prop) return false;

    switch (activeRole) {
      case Role.PENGUSUL:
        return prop.ketua_id === userId || prop.members.some((m) => m.user_id === userId);
      case Role.KAPRODI:
        return prop.prodi === userProdi;
      case Role.REVIEWER:
        return prop.reviews.some((r) => r.reviewer_id === userId);
      case Role.KA_PPM:
      case Role.DIREKTUR:
      case Role.ADMIN:
        return true;
      default:
        return false;
    }
  }
}

/**
 * Memastikan proposal berada dalam lingkup hak akses pengguna.
 * Jika melanggar, otomatis mencatat pelanggaran IDOR ke tabel audit_logs.
 */
export async function assertProposalInScope(
  proposalId: string,
  session: SessionWithUser,
  actionContext = 'ACCESS_PROPOSAL',
  clientIp = '127.0.0.1'
): Promise<boolean> {
  const allowed = await isProposalInScope(proposalId, session);

  if (!allowed) {
    await logAuditEvent({
      actor_id: session.user.id,
      active_role: session.active_role,
      ip_address: clientIp,
      action_type: 'IDOR_ACCESS_BLOCKED',
      target_id: proposalId,
      status_code: 403,
      details: `Upaya akses objek di luar kewenangan (IDOR/BOLA) terdeteksi. Proposal '${proposalId}' berada di luar lingkup peran '${session.active_role}'.`,
    });
    return false;
  }

  return true;
}
