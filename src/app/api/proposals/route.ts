import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mockStore } from '@/lib/mockStore';
import { requireRole } from '@/lib/rbac/requireRole';
import { getProposalScopeFilter } from '@/lib/rbac/scopeFilter';
import { sanitizeProposalListDto } from '@/lib/rbac/dto';
import { saveProposalFile, FileValidationError } from '@/lib/storage';
import { sanitizePlainText, isSafeUrl } from '@/lib/sanitization';
import { logAuditEvent, extractClientIp } from '@/lib/audit';
import { Role } from '@prisma/client';
import crypto from 'crypto';

/**
 * GET /api/proposals
 * Mengembalikan daftar proposal sesuai scopeFilter dan response DTO peran aktif,
 * beserta ringkasan metrik untuk 3 kartu statistik (Menunggu Tindakan, Sedang Diproses, Selesai).
 */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(
    request,
    [
      Role.PENGUSUL,
      Role.KAPRODI,
      Role.KA_PPM,
      Role.REVIEWER,
      Role.DIREKTUR,
      Role.ADMIN,
    ],
    'GET_PROPOSALS_LIST'
  );

  if (!authResult.authorized) {
    return authResult.response;
  }

  const { session, user, activeRole } = authResult;

  // Terapkan ScopeFilter server-side (Anti-IDOR / BOLA)
  const whereScope = getProposalScopeFilter(session);

  let proposals: any[] = [];
  try {
    proposals = await prisma.proposal.findMany({
      where: whereScope,
      include: {
        ketua: {
          select: {
            id: true,
            nip_npm: true,
            nama_lengkap: true,
            gelar: true,
            email: true,
            prodi: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                nip_npm: true,
                nama_lengkap: true,
                gelar: true,
                email: true,
                prodi: true,
              },
            },
          },
        },
        reviews: {
          include: {
            reviewer: {
              select: {
                id: true,
                nama_lengkap: true,
                gelar: true,
              },
            },
          },
          orderBy: {
            reviewer_slot: 'asc',
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  } catch {
    // Fallback in-memory mock store
    const filteredMock = mockStore.proposals.filter((p) => {
      if (activeRole === Role.PENGUSUL) {
        return p.ketua_id === user.id || p.members.some((m) => m.user_id === user.id);
      }
      if (activeRole === Role.KAPRODI) {
        return p.prodi === user.prodi;
      }
      if (activeRole === Role.REVIEWER) {
        return p.reviews.some((r) => r.reviewer_id === user.id);
      }
      return true; // KA_PPM, DIREKTUR, ADMIN
    });

    proposals = filteredMock.map((p) => {
      const ketuaUser = mockStore.users.find((u) => u.id === p.ketua_id);
      return {
        ...p,
        ketua: ketuaUser
          ? {
              id: ketuaUser.id,
              nip_npm: ketuaUser.nip_npm,
              nama_lengkap: ketuaUser.nama_lengkap,
              gelar: ketuaUser.gelar,
              email: ketuaUser.email,
              prodi: ketuaUser.prodi,
            }
          : null,
        members: p.members.map((m) => {
          const mUser = mockStore.users.find((u) => u.id === m.user_id);
          return {
            ...m,
            user: mUser
              ? {
                  id: mUser.id,
                  nip_npm: mUser.nip_npm,
                  nama_lengkap: mUser.nama_lengkap,
                  gelar: mUser.gelar,
                  email: mUser.email,
                  prodi: mUser.prodi,
                }
              : null,
          };
        }),
        reviews: p.reviews.map((r) => {
          const revUser = mockStore.users.find((u) => u.id === r.reviewer_id);
          return {
            ...r,
            reviewer: revUser
              ? {
                  id: revUser.id,
                  nama_lengkap: revUser.nama_lengkap,
                  gelar: revUser.gelar,
                }
              : null,
          };
        }),
      };
    });
  }

  // Hitung metrik 3 kartu statistik sesuai konteks peran aktif
  let countPending = 0;
  let countInProgress = 0;
  let countDone = 0;

  const categorizedProposals = proposals.map((prop) => {
    let category: 'PENDING' | 'IN_PROGRESS' | 'DONE' = 'IN_PROGRESS';

    switch (activeRole) {
      case Role.PENGUSUL:
        if (prop.status === 'REVISI' || prop.status === 'DRAFT') {
          category = 'PENDING';
        } else if (['DISETUJUI', 'SELESAI', 'DITOLAK'].includes(prop.status)) {
          category = 'DONE';
        } else {
          category = 'IN_PROGRESS';
        }
        break;

      case Role.KAPRODI:
        if (prop.status === 'MENUNGGU_VALIDASI_PRODI') {
          category = 'PENDING';
        } else if (['DISETUJUI', 'SELESAI', 'DITOLAK'].includes(prop.status)) {
          category = 'DONE';
        } else {
          category = 'IN_PROGRESS';
        }
        break;

      case Role.KA_PPM:
        if (
          prop.status === 'MENUNGGU_REGISTRASI_PPM' ||
          !prop.no_registrasi ||
          prop.reviews.length === 0
        ) {
          category = 'PENDING';
        } else if (['DISETUJUI', 'SELESAI', 'DITOLAK'].includes(prop.status)) {
          category = 'DONE';
        } else {
          category = 'IN_PROGRESS';
        }
        break;

      case Role.REVIEWER:
        const userReview = prop.reviews.find((r: any) => r.reviewer_id === user.id);
        if (userReview && !userReview.is_locked) {
          category = 'PENDING';
        } else if (prop.status === 'DISETUJUI' || (userReview && userReview.is_locked)) {
          category = 'DONE';
        } else {
          category = 'IN_PROGRESS';
        }
        break;

      case Role.DIREKTUR:
        if (prop.status === 'MENUNGGU_PENETAPAN') {
          category = 'PENDING';
        } else if (['DISETUJUI', 'SELESAI'].includes(prop.status)) {
          category = 'DONE';
        } else {
          category = 'IN_PROGRESS';
        }
        break;

      default:
        if (['DRAFT', 'MENUNGGU_VALIDASI_PRODI', 'REVISI'].includes(prop.status)) {
          category = 'PENDING';
        } else if (['DISETUJUI', 'SELESAI'].includes(prop.status)) {
          category = 'DONE';
        } else {
          category = 'IN_PROGRESS';
        }
        break;
    }

    if (category === 'PENDING') countPending++;
    else if (category === 'IN_PROGRESS') countInProgress++;
    else countDone++;

    return {
      ...prop,
      category,
    };
  });

  // Terapkan DTO Sanitasi (Blind Review & Isolasi Skor)
  const sanitized = sanitizeProposalListDto(
    categorizedProposals,
    activeRole,
    user.id
  );

  // Gabungkan category ke hasil DTO
  const result = sanitized.map((item, idx) => ({
    ...item,
    category: categorizedProposals[idx].category,
  }));

  return NextResponse.json({
    success: true,
    metrics: {
      countPending,
      countInProgress,
      countDone,
      total: result.length,
    },
    data: result,
  });
}

/**
 * POST /api/proposals
 * Fitur PENGUSUL:
 * - Auto-fill identitas ketua dari sesi server
 * - Simpan anggota tim berdasarkan NIP/NPM yang dipilih
 * - Simpan file PDF ke private storage
 * - Bangkitkan no_agenda otomatis
 * - Catat ke audit_logs
 */
export async function POST(request: NextRequest) {
  const authResult = await requireRole(
    request,
    [Role.PENGUSUL],
    'CREATE_PROPOSAL'
  );

  if (!authResult.authorized) {
    return authResult.response;
  }

  const { user, clientIp } = authResult;

  try {
    const contentType = request.headers.get('content-type') || '';
    let judul = '';
    let skema = 'PKM-KC';
    let fileUrl = '';
    let anggotaList: Array<{ user_id: string; peran_tim: string }> = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      judul = (formData.get('judul') as string) || '';
      skema = (formData.get('skema') as string) || 'PKM-KC';
      const rawAnggota = formData.get('anggota') as string;
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json(
          { error: 'Berkas draft proposal PDF wajib diunggah' },
          { status: 400 }
        );
      }

      if (!file.name.toLowerCase().endsWith('.pdf')) {
        return NextResponse.json(
          { error: 'Hanya berkas berformat .PDF yang diizinkan' },
          { status: 415 }
        );
      }

      if (file.type && file.type.toLowerCase().split(';')[0].trim() !== 'application/pdf') {
        return NextResponse.json(
          { error: `Tipe MIME '${file.type}' tidak didukung. Hanya application/pdf yang diizinkan.` },
          { status: 415 }
        );
      }

      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const saved = await saveProposalFile(fileBuffer, file.name, 'proposals', file.type);
      fileUrl = saved.fileUrl;

      if (rawAnggota) {
        try {
          const parsed = JSON.parse(rawAnggota);
          if (Array.isArray(parsed)) {
            anggotaList = parsed;
          }
        } catch {
          // Abaikan jika parsing gagal
        }
      }
    } else {
      const body = await request.json();
      judul = body.judul;
      skema = body.skema;
      fileUrl = body.file_url;
      if (Array.isArray(body.anggota_ids)) {
        anggotaList = body.anggota_ids;
      }
    }

    // Sanitasi Judul Proposal untuk Mencegah XSS (Kontrol 1.2.1 & 1.3.1)
    judul = sanitizePlainText(judul);

    if (!judul || judul.trim().length < 5) {
      return NextResponse.json(
        { error: 'Judul proposal minimal 5 karakter' },
        { status: 400 }
      );
    }

    if (!fileUrl) {
      return NextResponse.json(
        { error: 'Tautan atau berkas proposal wajib disertakan' },
        { status: 400 }
      );
    }

    // Validasi Safe URL (Kontrol 1.2.2)
    if (!isSafeUrl(fileUrl)) {
      return NextResponse.json(
        {
          error:
            'Tautan berkas dokumen tidak aman. Hanya protokol https:// atau path internal (/api/, /uploads/) yang diizinkan.',
        },
        { status: 400 }
      );
    }

    // Auto-fill dari sesi server
    const ketuaId = user.id;
    const prodi = user.prodi || 'Rekayasa Kriptografi';

    // Bangkitkan no_agenda otomatis: misal AGD-2026-XXXX
    const currentYear = new Date().getFullYear();
    const countTotal = await prisma.proposal.count();
    const sequence = String(countTotal + 1).padStart(4, '0');
    const randomSalt = crypto.randomBytes(2).toString('hex').toUpperCase();
    const noAgenda = `AGD-${currentYear}-${sequence}-${randomSalt}`;

    // Buat proposal dengan transaksi database (fallback mock store jika offline)
    let newProposal: any = null;
    try {
      newProposal = await prisma.$transaction(async (tx) => {
        const proposal = await tx.proposal.create({
          data: {
            no_agenda: noAgenda,
            no_registrasi: null, // Diterbitkan kemudian oleh Ka. Pusat PPM
            judul: judul.trim(),
            skema: skema.trim(),
            tahap: 'PROPOSAL',
            status: 'MENUNGGU_VALIDASI_PRODI', // Alur Perdir: Pengusul -> Validasi CPL Kaprodi
            ketua_id: ketuaId,
            prodi,
            file_url: fileUrl,
            sanitized_file_url: fileUrl, // Salinan siap blind review
            skor_rata_rata: null,
            is_bypass: false,
          },
        });

        // Simpan anggota tim jika ada
        if (anggotaList.length > 0) {
          for (const item of anggotaList) {
            if (item.user_id && item.user_id !== ketuaId) {
              await tx.proposalMember.create({
                data: {
                  proposal_id: proposal.id,
                  user_id: item.user_id,
                  peran_tim: item.peran_tim || 'Anggota Tim',
                },
              }).catch(() => null);
            }
          }
        }

        return proposal;
      });
    } catch {
      newProposal = {
        id: `prop-${Date.now()}`,
        no_agenda: noAgenda,
        no_registrasi: null,
        judul: judul.trim(),
        skema: skema.trim(),
        tahap: 'PROPOSAL',
        status: 'MENUNGGU_VALIDASI_PRODI',
        ketua_id: ketuaId,
        prodi,
        file_url: fileUrl,
        sanitized_file_url: fileUrl,
        skor_rata_rata: null,
        is_bypass: false,
        alasan_bypass: null,
        created_at: new Date(),
        members: anggotaList.map((item, idx) => ({
          id: `pm-${Date.now()}-${idx}`,
          proposal_id: `prop-${Date.now()}`,
          user_id: item.user_id,
          peran_tim: item.peran_tim || 'Anggota Tim',
        })),
        reviews: [],
      };
      mockStore.proposals.unshift(newProposal);
    }

    // Catat ke audit log permanen
    await logAuditEvent({
      actor_id: user.id,
      active_role: Role.PENGUSUL,
      ip_address: clientIp,
      action_type: 'CREATE_PROPOSAL',
      target_id: newProposal.id,
      status_code: 201,
      details: `Pengajuan usulan proposal baru: '${newProposal.judul}' dengan No. Agenda: '${noAgenda}' oleh ${user.nama_lengkap}`,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Proposal berhasil diajukan dan menunggu validasi CPL Kaprodi',
        data: newProposal,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof FileValidationError || error.name === 'FileValidationError') {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 415 }
      );
    }
    console.error('Error saat membuat proposal:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal membuat proposal' },
      { status: 500 }
    );
  }
}
