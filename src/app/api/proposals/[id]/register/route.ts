import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mockStore } from '@/lib/mockStore';
import { requireRole } from '@/lib/rbac/requireRole';
import { assertProposalInScope } from '@/lib/rbac/scopeFilter';
import { logAuditEvent } from '@/lib/audit';
import { Role } from '@prisma/client';

/**
 * Menghasilkan Nomor Registrasi otomatis berdasarkan skema usulan:
 * - PL     : Penelitian Lanjutan / Dasar / PDP
 * - OK-PK  : Pengabdian kepada Masyarakat / PKM-KC
 * - OK-PP  : Riset Eksakta / PKM-RE / Penelitian Terapan
 * - OK-PKP : Penerapan Iptek / Kemitraan / PKM-PI
 * - OK-PRP : Kewirausahaan / Rekayasa Produk / PKM-K
 */
function determineRegistrationPrefix(skema: string): string {
  const s = skema.toUpperCase();

  if (s.includes('PKM-KC') || s.includes('KARSA CIPTA') || s.includes('OK-PK')) {
    return 'OK-PK';
  }
  if (s.includes('PKM-RE') || s.includes('RISET EKSAKTA') || s.includes('OK-PP')) {
    return 'OK-PP';
  }
  if (s.includes('PKM-PI') || s.includes('PENERAPAN IPTEK') || s.includes('OK-PKP') || s.includes('KEMITRAAN')) {
    return 'OK-PKP';
  }
  if (s.includes('PKM-K') || s.includes('KEWIRAUSAHAAN') || s.includes('OK-PRP') || s.includes('PRODUK')) {
    return 'OK-PRP';
  }
  if (s.includes('LANJUTAN') || s.includes('PDP') || s.includes('DASAR') || s.includes('PL')) {
    return 'PL';
  }

  return 'OK-PK'; // Default fallback
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authResult = await requireRole(
    request,
    [Role.KA_PPM],
    `REGISTER_PROPOSAL_${id}`
  );

  if (!authResult.authorized) {
    return authResult.response;
  }

  const { user, session, clientIp } = authResult;

  // 1. Verifikasi Otorisasi Berkas Sisi Server (Anti-IDOR / BOLA)
  const isAllowed = await assertProposalInScope(
    id,
    session,
    'REGISTER_PROPOSAL',
    clientIp
  );

  if (!isAllowed) {
    return NextResponse.json(
      { error: 'Akses ditolak: Anda tidak memiliki wewenang mengelola berkas ini' },
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

  // Jika sudah memiliki nomor registrasi, kembalikan data yang ada
  if (proposal.no_registrasi) {
    return NextResponse.json({
      success: true,
      message: 'Proposal sudah memiliki Nomor Registrasi resmi.',
      no_registrasi: proposal.no_registrasi,
      data: proposal,
    });
  }

  // 3. Bangkitkan Nomor Registrasi Otomatis Sesuai Skema
  const prefix = determineRegistrationPrefix(proposal.skema);
  const currentYear = new Date().getFullYear();

  // Hitung urutan registrasi
  let countWithPrefix = 0;
  try {
    countWithPrefix = await prisma.proposal.count({
      where: {
        no_registrasi: {
          startsWith: `${prefix}-${currentYear}`,
        },
      },
    });
  } catch {
    countWithPrefix = mockStore.proposals.filter(
      (p) => p.no_registrasi && p.no_registrasi.startsWith(`${prefix}-${currentYear}`)
    ).length;
  }

  const seq = String(countWithPrefix + 1).padStart(4, '0');
  const noRegistrasi = `${prefix}-${currentYear}-${seq}`;

  // 4. Perbarui Proposal
  let updated: any = null;
  const targetStatus =
    proposal.status === 'MENUNGGU_REGISTRASI_PPM'
      ? 'TERVERIFIKASI_ADMIN'
      : proposal.status;

  try {
    updated = await prisma.proposal.update({
      where: { id },
      data: {
        no_registrasi: noRegistrasi,
        status: targetStatus,
      },
    });
  } catch {
    proposal.no_registrasi = noRegistrasi;
    proposal.status = targetStatus;
    updated = proposal;
  }

  // 5. Catat ke Audit Log
  await logAuditEvent({
    actor_id: user.id,
    active_role: Role.KA_PPM,
    ip_address: clientIp,
    action_type: 'REGISTER_PROPOSAL',
    target_id: proposal.id,
    status_code: 200,
    details: `Ka. Pusat PPM (${user.nama_lengkap}) menerbitkan Nomor Registrasi '${noRegistrasi}' untuk proposal '${proposal.judul}'.`,
  });

  return NextResponse.json({
    success: true,
    message: `Nomor Registrasi ${noRegistrasi} berhasil diterbitkan.`,
    no_registrasi: noRegistrasi,
    data: updated,
  });
}
