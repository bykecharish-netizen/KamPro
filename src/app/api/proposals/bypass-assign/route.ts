import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mockStore } from '@/lib/mockStore';
import { requireRole } from '@/lib/rbac/requireRole';
import { directorBypassSchema } from '@/lib/rbac/dto';
import { logAuditEvent } from '@/lib/audit';
import { Role } from '@prisma/client';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const authResult = await requireRole(
    request,
    [Role.DIREKTUR],
    'BYPASS_ASSIGN'
  );

  if (!authResult.authorized) {
    return authResult.response;
  }

  const { user, clientIp } = authResult;

  try {
    const rawBody = await request.json();
    const { proposal_id, judul, skema = 'Penelitian Strategis (Bypass)', prodi, ketua_id, alasan_bypass } = rawBody;

    // 1. Validasi Alasan Kebijakan Bypass Tertulis (Wajib Diisi Minimal 10 Karakter)
    const parseResult = directorBypassSchema.safeParse({ alasan_bypass });
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error:
            'Alasan kebijakan bypass penugasan langsung wajib diisi minimal 10 karakter untuk rekam jejak audit (CWE-778 & OWASP ASVS).',
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const cleanAlasan = parseResult.data.alasan_bypass;

    // Skenario A: Bypass pada Proposal yang Sudah Ada di Sistem
    if (proposal_id) {
      let existingProposal: any = null;
      try {
        existingProposal = await prisma.proposal.findUnique({
          where: { id: proposal_id },
        });
      } catch {
        existingProposal = mockStore.proposals.find((p) => p.id === proposal_id);
      }

      if (!existingProposal) {
        return NextResponse.json(
          { error: 'Proposal tidak ditemukan' },
          { status: 404 }
        );
      }

      let updatedProposal: any = null;
      try {
        updatedProposal = await prisma.proposal.update({
          where: { id: proposal_id },
          data: {
            is_bypass: true,
            alasan_bypass: cleanAlasan,
            status: 'DISETUJUI',
          },
        });
      } catch {
        existingProposal.is_bypass = true;
        existingProposal.alasan_bypass = cleanAlasan;
        existingProposal.status = 'DISETUJUI';
        updatedProposal = existingProposal;
      }

      // Catat ke Audit Log Permanen
      await logAuditEvent({
        actor_id: user.id,
        active_role: Role.DIREKTUR,
        ip_address: clientIp,
        action_type: 'DIRECTOR_BYPASS_ASSIGN',
        target_id: existingProposal.id,
        status_code: 200,
        details: `Direktur (${user.nama_lengkap}) mengeksekusi Penugasan Langsung (Bypass) pada proposal '${existingProposal.judul}'. Alasan kebijakan wajib: "${cleanAlasan}".`,
      });

      return NextResponse.json({
        success: true,
        message: 'Penugasan langsung (Bypass) berhasil dieksekusi dan dicatat di audit log.',
        data: updatedProposal,
      });
    }

    // Skenario B: Pembuatan Usulan Penugasan Strategis Top-Down Baru oleh Direktur
    if (!judul || judul.trim().length < 5) {
      return NextResponse.json(
        { error: 'Judul penugasan langsung minimal 5 karakter' },
        { status: 400 }
      );
    }

    const targetKetuaId = ketua_id || user.id;
    const targetProdi = prodi || user.prodi || 'Rekayasa Keamanan Siber';
    const currentYear = new Date().getFullYear();
    const countTotal = await prisma.proposal.count().catch(() => mockStore.proposals.length);
    const seq = String(countTotal + 1).padStart(4, '0');
    const randomSalt = crypto.randomBytes(2).toString('hex').toUpperCase();

    const noAgenda = `AGD-BYPASS-${currentYear}-${seq}`;
    const noRegistrasi = `OK-DIR-${currentYear}-${seq}-${randomSalt}`;

    let newProposal: any = null;
    try {
      newProposal = await prisma.proposal.create({
        data: {
          no_agenda: noAgenda,
          no_registrasi: noRegistrasi,
          judul: judul.trim(),
          skema: skema.trim(),
          tahap: 'PROPOSAL',
          status: 'DISETUJUI', // Langsung berstatus disetujui untuk riset strategis
          ketua_id: targetKetuaId,
          prodi: targetProdi,
          file_url: '/uploads/proposals/bypass-mandate.pdf',
          sanitized_file_url: '/uploads/proposals/bypass-mandate.pdf',
          skor_rata_rata: 95.0,
          is_bypass: true,
          alasan_bypass: cleanAlasan,
        },
      });
    } catch {
      newProposal = {
        id: `prop-bypass-${Date.now()}`,
        no_agenda: noAgenda,
        no_registrasi: noRegistrasi,
        judul: judul.trim(),
        skema: skema.trim(),
        tahap: 'PROPOSAL',
        status: 'DISETUJUI',
        ketua_id: targetKetuaId,
        prodi: targetProdi,
        file_url: '/uploads/proposals/bypass-mandate.pdf',
        sanitized_file_url: '/uploads/proposals/bypass-mandate.pdf',
        skor_rata_rata: 95.0,
        is_bypass: true,
        alasan_bypass: cleanAlasan,
        created_at: new Date(),
        members: [],
        reviews: [],
      };
      mockStore.proposals.unshift(newProposal);
    }

    // Catat ke Audit Log Permanen
    await logAuditEvent({
      actor_id: user.id,
      active_role: Role.DIREKTUR,
      ip_address: clientIp,
      action_type: 'DIRECTOR_BYPASS_ASSIGN',
      target_id: newProposal.id,
      status_code: 200,
      details: `Direktur (${user.nama_lengkap}) menerbitkan Penugasan Langsung (Bypass Top-Down) untuk riset strategis: '${newProposal.judul}'. Alasan kebijakan wajib: "${cleanAlasan}".`,
    });

    return NextResponse.json({
      success: true,
      message: 'Penugasan strategis langsung (Bypass) berhasil diterbitkan dan dicatat permanen di audit log.',
      data: newProposal,
    });
  } catch (error: any) {
    console.error('Error saat mengeksekusi bypass Direktur:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal mengeksekusi bypass Direktur' },
      { status: 500 }
    );
  }
}
