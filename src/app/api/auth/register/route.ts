import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { mockStore } from '@/lib/mockStore';
import { hashPassword, validatePassword } from '@/lib/auth/password';
import { logAuditEvent, extractClientIp, sanitizeLogInput } from '@/lib/audit';
import { verifyMasterRegistrationEligibility } from '@/services/profileService';
import { Role } from '@prisma/client';

const registerSchema = z
  .object({
    role_type: z
      .enum(['TARUNA', 'DOSEN_PENGUSUL', 'REVIEWER', 'KAPRODI'])
      .default('TARUNA'),
    nip_npm: z
      .string()
      .trim()
      .min(5, 'NIP/NPM minimal 5 karakter')
      .max(30, 'NIP/NPM maksimal 30 karakter'),
    email: z
      .string()
      .trim()
      .email('Format email tidak valid')
      .max(100, 'Email maksimal 100 karakter'),
    nama_lengkap: z
      .string()
      .trim()
      .min(3, 'Nama lengkap minimal 3 karakter')
      .max(150, 'Nama lengkap maksimal 150 karakter'),
    gelar: z.string().trim().max(50).optional(),
    prodi: z.string().trim().min(2, 'Program studi wajib dipilih'),
    kelompok_keilmuan: z.string().trim().max(100).optional(),
    kelas: z.string().trim().max(20).optional(),
    no_hp: z
      .string()
      .trim()
      .regex(/^(08|\+628)[0-9]{8,12}$/, 'Format nomor HP tidak valid (contoh: 081234567890)')
      .optional()
      .or(z.literal('')),
    password: z
      .string()
      .min(8, 'Kata sandi minimal 8 karakter')
      .max(128, 'Kata sandi maksimal 128 karakter'),
  })
  .strict();

export async function POST(request: NextRequest) {
  const clientIp = extractClientIp(request);

  try {
    const rawBody = await request.json();
    const parseResult = registerSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: parseResult.error.issues[0]?.message || 'Data registrasi tidak valid',
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const {
      role_type,
      nip_npm,
      email,
      nama_lengkap,
      gelar,
      prodi,
      kelompok_keilmuan,
      kelas,
      no_hp,
      password,
    } = parseResult.data;

    // Pemetaan kategori pendaftaran ke Peran Sistem (RBAC)
    let assignedRole: Role = Role.PENGUSUL;
    if (role_type === 'REVIEWER') {
      assignedRole = Role.REVIEWER;
    } else if (role_type === 'KAPRODI') {
      assignedRole = Role.KAPRODI;
    } else {
      assignedRole = Role.PENGUSUL; // TARUNA dan DOSEN_PENGUSUL bertindak sebagai Pengusul Proposal
    }

    const cleanIdentifier = sanitizeLogInput(nip_npm);

    // 1. Verifikasi Master SDM / Siakad & Anti-Eskalasi Peran Ilegal (Kontrol 2.3.1)
    const eligibility = verifyMasterRegistrationEligibility(nip_npm, role_type);
    if (!eligibility.eligible) {
      await logAuditEvent({
        actor_id: null,
        active_role: null,
        ip_address: clientIp,
        action_type: 'REGISTER_UNAUTHORIZED_IDENTITY_ATTEMPT',
        target_id: cleanIdentifier,
        status_code: 403,
        details: `Upaya pendaftaran ditolak: ${eligibility.reason}`,
      });

      return NextResponse.json(
        { error: eligibility.reason },
        { status: 403 }
      );
    }

    // 2. Validasi Kebijakan Kata Sandi (Anti-Weak & Anti-Leaked Password ASVS V2.1.7)
    const passValidation = validatePassword(password, nip_npm);
    if (!passValidation.isValid) {
      return NextResponse.json(
        { error: passValidation.error },
        { status: 400 }
      );
    }

    // Gunakan data master untuk atribut profil terverifikasi (Auto-Fill Master Profil)
    const verifiedMaster = eligibility.masterData!;
    const finalNama = (nama_lengkap && nama_lengkap.trim() !== '') ? nama_lengkap.trim() : verifiedMaster.nama_lengkap;
    const finalGelar = verifiedMaster.gelar || gelar || null;
    const finalProdi = (prodi && prodi.trim() !== '') ? prodi.trim() : verifiedMaster.prodi;
    const finalKelompok = kelompok_keilmuan || verifiedMaster.kelompok_keilmuan || null;
    const finalKelas = (kelas && kelas.trim() !== '') ? kelas.trim() : (verifiedMaster.kelas || null);

    // 3. Periksa apakah NIP/NPM atau Email sudah terdaftar
    let isDuplicate = false;
    try {
      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            { nip_npm },
            { email: { equals: email, mode: 'insensitive' } },
          ],
        },
      });
      if (existing) isDuplicate = true;
    } catch {
      isDuplicate = mockStore.users.some(
        (u) =>
          u.nip_npm === nip_npm ||
          u.email.toLowerCase() === email.toLowerCase()
      );
    }

    if (isDuplicate) {
      await logAuditEvent({
        actor_id: null,
        active_role: null,
        ip_address: clientIp,
        action_type: 'REGISTER_DUPLICATE_ATTEMPT',
        target_id: cleanIdentifier,
        status_code: 409,
        details: `Upaya registrasi gagal: NIP/NPM atau email '${cleanIdentifier}' sudah terdaftar di sistem.`,
      });

      return NextResponse.json(
        { error: 'NIP/NPM atau email sudah terdaftar di sistem.' },
        { status: 409 }
      );
    }

    // 4. Hash Password dengan bcrypt cost 12
    const password_hash = await hashPassword(password, nip_npm);

    // 5. Simpan User Baru ke Database / MockStore
    let newUser: any = null;
    try {
      newUser = await prisma.user.create({
        data: {
          nip_npm,
          email: email.toLowerCase(),
          password_hash,
          nama_lengkap: finalNama,
          gelar: finalGelar,
          prodi: finalProdi,
          kelompok_keilmuan: finalKelompok,
          kelas: finalKelas,
          no_hp: no_hp || null,
          is_active: true,
          roles: {
            create: [{ role: assignedRole }],
          },
        },
        include: {
          roles: true,
        },
      });
    } catch {
      const newMockId = `u-new-${Date.now()}`;
      newUser = {
        id: newMockId,
        nip_npm,
        email: email.toLowerCase(),
        password_hash,
        nama_lengkap: finalNama,
        gelar: finalGelar,
        prodi: finalProdi,
        kelompok_keilmuan: finalKelompok,
        kelas: finalKelas,
        no_hp: no_hp || null,
        is_active: true,
        created_at: new Date(),
        roles: [
          {
            id: `r-new-${Date.now()}`,
            user_id: newMockId,
            role: assignedRole,
          },
        ],
      };
      mockStore.users.push(newUser);
    }

    // 4. Catat ke Audit Log Permanen
    await logAuditEvent({
      actor_id: newUser.id,
      active_role: assignedRole,
      ip_address: clientIp,
      action_type: 'USER_REGISTRATION',
      target_id: newUser.id,
      status_code: 201,
      details: `Pendaftaran akun mandiri baru berhasil untuk '${nama_lengkap}' (${nip_npm}) dengan peran ${assignedRole} dari prodi ${prodi}.`,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Registrasi akun berhasil. Silakan masuk menggunakan NIP/NPM dan kata sandi Anda.',
        data: {
          id: newUser.id,
          nip_npm: newUser.nip_npm,
          nama_lengkap: newUser.nama_lengkap,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error saat registrasi user:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal memproses registrasi' },
      { status: 500 }
    );
  }
}
