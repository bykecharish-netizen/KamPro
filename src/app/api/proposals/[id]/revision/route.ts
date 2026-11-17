import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mockStore } from '@/lib/mockStore';
import { requireRole } from '@/lib/rbac/requireRole';
import { assertProposalInScope } from '@/lib/rbac/scopeFilter';
import { saveProposalFile, FileValidationError } from '@/lib/storage';
import { sanitizePlainText, isSafeUrl } from '@/lib/sanitization';
import { logAuditEvent } from '@/lib/audit';
import { Role } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authResult = await requireRole(
    request,
    [Role.PENGUSUL],
    `UPLOAD_REVISION_${id}`
  );

  if (!authResult.authorized) {
    return authResult.response;
  }

  const { user, session, clientIp } = authResult;

  // 1. Verifikasi Otorisasi Berkas Sisi Server (Anti-IDOR / BOLA)
  const isAllowed = await assertProposalInScope(
    id,
    session,
    'UPLOAD_REVISION',
    clientIp
  );

  if (!isAllowed) {
    return NextResponse.json(
      { error: 'Akses ditolak: Anda tidak memiliki wewenang atas proposal ini' },
      { status: 403 }
    );
  }

  // 2. Ambil Proposal dari Basis Data
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

  // 3. Aturan Bisnis Ketat: HANYA jika status membutuhkan revisi dan skor_rata_rata < 60
  // Tolak dengan HTTP 403 Forbidden jika skor >= 60
  if (proposal.skor_rata_rata !== null && proposal.skor_rata_rata >= 60) {
    await logAuditEvent({
      actor_id: user.id,
      active_role: Role.PENGUSUL,
      ip_address: clientIp,
      action_type: 'REVISION_BLOCKED_SCORE_EXCEEDS_THRESHOLD',
      target_id: proposal.id,
      status_code: 403,
      details: `Percobaan unggah revisi ditolak: Skor rata-rata proposal adalah ${proposal.skor_rata_rata} (>= 60). Revisi hanya diizinkan untuk skor < 60.`,
    });

    return NextResponse.json(
      {
        error: `Akses ditolak: Unggah berkas revisi hanya diizinkan apabila skor evaluasi di bawah 60. Skor berkas ini adalah ${proposal.skor_rata_rata}.`,
      },
      { status: 403 }
    );
  }

  const isRevisionStatus =
    proposal.status === 'REVISI' ||
    (proposal.skor_rata_rata !== null && proposal.skor_rata_rata < 60);

  if (!isRevisionStatus) {
    return NextResponse.json(
      {
        error: 'Proposal ini tidak dalam status yang membutuhkan revisi.',
      },
      { status: 400 }
    );
  }

  // 4. Proses Berkas Revisi
  const contentType = request.headers.get('content-type') || '';
  let newFileUrl = '';
  let catatanRevisi = '';

  try {
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      catatanRevisi = (formData.get('catatan_revisi') as string) || '';

      if (!file) {
        return NextResponse.json(
          { error: 'Berkas revisi PDF wajib diunggah' },
          { status: 400 }
        );
      }

      if (!file.name.toLowerCase().endsWith('.pdf')) {
        return NextResponse.json(
          { error: 'Hanya berkas format .PDF yang diizinkan' },
          { status: 415 }
        );
      }

      if (file.type && file.type.toLowerCase().split(';')[0].trim() !== 'application/pdf') {
        return NextResponse.json(
          { error: `Tipe media '${file.type}' tidak didukung. Hanya application/pdf yang diizinkan.` },
          { status: 415 }
        );
      }

      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const saved = await saveProposalFile(fileBuffer, file.name, 'revisions', file.type);
      newFileUrl = saved.fileUrl;
    } else {
      const body = await request.json();
      newFileUrl = body.file_url;
      catatanRevisi = body.catatan_revisi || '';
    }

    // Sanitasi catatan revisi
    catatanRevisi = sanitizePlainText(catatanRevisi);

    if (!newFileUrl) {
      return NextResponse.json(
        { error: 'Tautan atau berkas revisi wajib disertakan' },
        { status: 400 }
      );
    }

    // Validasi Safe URL
    if (!isSafeUrl(newFileUrl)) {
      return NextResponse.json(
        {
          error:
            'Tautan berkas dokumen tidak aman. Hanya protokol https:// atau path internal (/api/, /uploads/) yang diizinkan.',
        },
        { status: 400 }
      );
    }

    // 5. Perbarui Proposal
    let updated: any = null;
    try {
      updated = await prisma.proposal.update({
        where: { id },
        data: {
          file_url: newFileUrl,
          sanitized_file_url: newFileUrl,
          status: 'MENUNGGU_VALIDASI_PRODI', // Alur kembali ke validasi atau penelaahan
        },
      });
    } catch {
      proposal.file_url = newFileUrl;
      proposal.sanitized_file_url = newFileUrl;
      proposal.status = 'MENUNGGU_VALIDASI_PRODI';
      updated = proposal;
    }

    // 6. Catat ke Audit Log
    await logAuditEvent({
      actor_id: user.id,
      active_role: Role.PENGUSUL,
      ip_address: clientIp,
      action_type: 'UPLOAD_REVISION',
      target_id: proposal.id,
      status_code: 200,
      details: `Pengusul mengunggah berkas revisi untuk proposal '${proposal.judul}'. Catatan: ${catatanRevisi || '-'}`,
    });

    return NextResponse.json({
      success: true,
      message: 'Berkas revisi berhasil diunggah dan diajukan kembali ke program studi',
      data: updated,
    });
  } catch (error: any) {
    if (error instanceof FileValidationError || error.name === 'FileValidationError') {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 415 }
      );
    }
    console.error('Error saat mengunggah revisi:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memproses unggah revisi' },
      { status: 500 }
    );
  }
}
