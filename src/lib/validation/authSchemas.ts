import { z } from 'zod';

export const ALLOWED_ROLES = [
  'PENGUSUL',
  'KAPRODI',
  'KA_PPM',
  'REVIEWER',
  'DIREKTUR',
  'ADMIN',
] as const;

export type AllowedRole = (typeof ALLOWED_ROLES)[number];

/**
 * Regex Identifier Resmi Poltek SSN:
 * 1. NIP Pegawai / Dosen: angka 3 hingga 20 digit (contoh: 198503152010121001)
 * 2. NPM Taruna: angka 3 hingga 20 digit (contoh: 222110088)
 * 3. Email Dinas: format email standar institusi (contoh: budi.santoso@poltekssn.ac.id)
 * 
 * Melarang keras karakter berbahaya seperti tag HTML (< >), tanda kutip (' "),
 * spasi, tanda kurung, karakter kontrol, dan simbol injeksi lainnya.
 */
export const IDENTIFIER_REGEX = /^(?:[0-9]{3,20}|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/;

/**
 * [Kontrol 2.1.1, 2.2.1, 2.2.2]
 * Skema validasi Login dengan Allowlist ketat (.strict())
 * Menolak Mass Assignment (misalnya payload injeksi {"role": "ADMIN"}).
 */
export const loginSchema = z
  .object({
    identifier: z
      .string()
      .trim()
      .min(3, 'Identifier minimal 3 karakter')
      .max(100, 'Identifier maksimal 100 karakter')
      .regex(
        IDENTIFIER_REGEX,
        'Format identifier tidak valid. Gunakan nomor NIP/NPM resmi atau alamat email dinas'
      ),
    password: z
      .string()
      .min(8, 'Kata sandi minimal 8 karakter')
      .max(128, 'Kata sandi maksimal 128 karakter'),
  })
  .strict();

/**
 * [Kontrol 2.2.2]
 * Skema validasi Pergantian Peran Aktif (Switch Role) dengan Allowlist ketat (.strict())
 * Mengunci nilai targetRole ke enum peran resmi yang diakui sistem.
 */
export const switchRoleSchema = z
  .object({
    targetRole: z.enum(ALLOWED_ROLES, {
      message: 'Peran yang dipilih tidak valid atau berada di luar allowlist sistem',
    }),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;
export type SwitchRoleInput = z.infer<typeof switchRoleSchema>;
