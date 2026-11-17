import { z } from 'zod';
import { Role } from '@prisma/client';

// ============================================================================
// 1. Zod Allowlist Schemas (Perlindungan Anti-Mass Assignment)
// ============================================================================

/**
 * Skema input pengajuan proposal baru oleh Pengusul.
 * Menggunakan .strict() untuk mencegah penyuntikan kolom sistem:
 * role, status, no_registrasi, no_agenda, is_bypass, skor_rata_rata.
 */
export const createProposalSchema = z
  .object({
    judul: z
      .string()
      .trim()
      .min(5, 'Judul proposal minimal 5 karakter')
      .max(500, 'Judul proposal maksimal 500 karakter'),
    skema: z
      .string()
      .trim()
      .min(2, 'Skema tidak valid'),
    prodi: z
      .string()
      .trim()
      .min(2, 'Program studi tidak valid'),
    file_url: z
      .string()
      .trim()
      .min(1, 'Tautan berkas dokumen wajib disertakan'),
    anggota_ids: z
      .array(
        z.object({
          user_id: z.string().uuid('ID anggota tim harus berformat UUID'),
          peran_tim: z.string().trim().min(2, 'Peran tim wajib diisi'),
        })
      )
      .optional()
      .default([]),
  })
  .strict();

export type CreateProposalInput = z.infer<typeof createProposalSchema>;

/**
 * Skema input pembaruan berkas revisi oleh Pengusul (ketika skor_rata_rata < 60)
 */
export const uploadRevisionSchema = z
  .object({
    file_url: z
      .string()
      .trim()
      .min(1, 'Tautan berkas revisi wajib disertakan'),
    catatan_revisi: z.string().trim().max(1000).optional(),
  })
  .strict();

export type UploadRevisionInput = z.infer<typeof uploadRevisionSchema>;

/**
 * Skema validasi kesesuaian CPL oleh Kaprodi
 */
export const cplValidationSchema = z
  .object({
    is_approved: z.boolean(),
    catatan: z.string().trim().max(1000).optional(),
  })
  .strict();

export type CplValidationInput = z.infer<typeof cplValidationSchema>;

/**
 * Skema penunjukan penelaah oleh Ka. Pusat PPM (Slot 1, 2, 3)
 */
export const assignReviewersSchema = z
  .object({
    assignments: z
      .array(
        z.object({
          reviewer_id: z.string().uuid('ID Reviewer harus berformat UUID'),
          reviewer_slot: z.number().int().min(1).max(3),
        })
      )
      .min(1, 'Minimal 1 penelaah harus ditugaskan')
      .max(3, 'Maksimal 3 penelaah per berkas'),
  })
  .strict();

export type AssignReviewersInput = z.infer<typeof assignReviewersSchema>;

/**
 * Skema input evaluasi skor & catatan oleh Reviewer
 */
export const submitReviewSchema = z
  .object({
    skor: z
      .number()
      .min(0, 'Skor minimal 0')
      .max(100, 'Skor maksimal 100'),
    catatan: z
      .string()
      .trim()
      .min(5, 'Catatan telaah minimal 5 karakter')
      .max(5000, 'Catatan telaah maksimal 5000 karakter'),
    is_locked: z.boolean().default(false),
  })
  .strict();

export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;

/**
 * Skema eksekusi penugasan langsung (Bypass) oleh Direktur
 * Wajib disertai alasan kebijakan tertulis (PRD & OWASP ASVS)
 */
export const directorBypassSchema = z
  .object({
    alasan_bypass: z
      .string()
      .trim()
      .min(10, 'Alasan kebijakan bypass minimal 10 karakter untuk rekam audit')
      .max(2000, 'Alasan kebijakan bypass maksimal 2000 karakter'),
  })
  .strict();

export type DirectorBypassInput = z.infer<typeof directorBypassSchema>;

/**
 * Skema pembaruan nomor registrasi oleh Ka. Pusat PPM
 */
export const assignRegistrationNumberSchema = z
  .object({
    no_agenda: z.string().trim().min(3).max(50).optional(),
    no_registrasi: z.string().trim().min(3).max(50),
  })
  .strict();

export type AssignRegistrationNumberInput = z.infer<typeof assignRegistrationNumberSchema>;

/**
 * Skema pembaruan mandiri data pengguna (hanya nomor HP yang diizinkan diubah mandiri)
 * NIP/NPM, nama, gelar, prodi, kelas, kelompok_keilmuan bersifat BACA-SAJA.
 */
export const userSelfUpdateSchema = z
  .object({
    no_hp: z
      .string()
      .trim()
      .regex(/^(08|\+628)[0-9]{8,12}$/, 'Format nomor HP tidak valid (contoh: 081234567890)'),
  })
  .strict();

export type UserSelfUpdateInput = z.infer<typeof userSelfUpdateSchema>;

// ============================================================================
// 2. DTO Sanitasi Output JSON (Anti-BOPLA & Blind Review Enforcement)
// ============================================================================

export interface SanitizedProposalOutput {
  id: string;
  no_agenda: string | null;
  no_registrasi: string | null;
  judul: string;
  skema: string;
  tahap: string;
  status: string;
  prodi: string;
  file_url: string;
  skor_rata_rata: number | null;
  is_bypass: boolean;
  alasan_bypass: string | null;
  created_at: Date | string;
  ketua?: {
    id?: string;
    nama_lengkap: string;
    nip_npm?: string;
    email?: string;
    gelar?: string | null;
  } | null;
  members?: Array<{
    id: string;
    user_id?: string;
    peran_tim: string;
    user?: {
      nama_lengkap: string;
      gelar?: string | null;
      nip_npm?: string;
    };
  }>;
  reviews?: Array<{
    id?: string;
    reviewer_slot: number;
    skor: number | null;
    catatan: string | null;
    is_locked: boolean;
    submitted_at: Date | string | null;
    reviewer?: {
      nama_lengkap: string;
      gelar?: string | null;
    } | null;
  }>;
}

/**
 * Menyaring objek Proposal sebelum dikirimkan sebagai respons JSON ke klien:
 * 1. Menegakkan Blind Review pada tahap PROPOSAL untuk peran REVIEWER:
 *    - Menyembunyikan nama, NIP/NPM, email ketua dan seluruh anggota tim.
 *    - Menggantikan file_url asli dengan sanitized_file_url (bebas metadata identitas).
 * 2. Mengisolasi skor antar-Reviewer:
 *    - Reviewer hanya dapat melihat skor dan catatannya sendiri.
 *    - Skor penelaah lain disembunyikan sampai direkap oleh Ka. PPM / Direktur.
 */
export function sanitizeProposalDto(
  proposal: any,
  activeRole: Role,
  currentUserId: string
): SanitizedProposalOutput {
  if (!proposal) return proposal;

  const isReviewer = activeRole === Role.REVIEWER;
  const isBlindReviewRequired = isReviewer && proposal.tahap === 'PROPOSAL';

  // 1. Sanitasi URL Dokumen (Gunakan file bersih metadata jika tahap PROPOSAL bagi Reviewer)
  const effectiveFileUrl =
    isBlindReviewRequired && proposal.sanitized_file_url
      ? proposal.sanitized_file_url
      : proposal.file_url;

  // 2. Sanitasi Identitas Tim Pengusul (Blind Review)
  let sanitizedKetua = proposal.ketua
    ? {
        id: isBlindReviewRequired ? undefined : proposal.ketua.id,
        nama_lengkap: isBlindReviewRequired ? '[PENELAAHAN ANONIM]' : proposal.ketua.nama_lengkap,
        nip_npm: isBlindReviewRequired ? undefined : proposal.ketua.nip_npm,
        email: isBlindReviewRequired ? undefined : proposal.ketua.email,
        gelar: isBlindReviewRequired ? null : proposal.ketua.gelar,
      }
    : null;

  let sanitizedMembers = proposal.members
    ? isBlindReviewRequired
      ? [] // Seluruh anggota disembunyikan pada tahap proposal untuk blind review
      : proposal.members.map((m: any) => ({
          id: m.id,
          user_id: m.user_id,
          peran_tim: m.peran_tim,
          user: m.user
            ? {
                nama_lengkap: m.user.nama_lengkap,
                gelar: m.user.gelar,
                nip_npm: m.user.nip_npm,
              }
            : undefined,
        }))
    : undefined;

  // 3. Sanitasi Isolasi Skor Antar-Reviewer
  let sanitizedReviews: SanitizedProposalOutput['reviews'] = undefined;
  if (proposal.reviews && Array.isArray(proposal.reviews)) {
    if (isReviewer) {
      // Reviewer HANYA boleh melihat penilaian miliknya sendiri
      sanitizedReviews = proposal.reviews
        .filter((r: any) => r.reviewer_id === currentUserId)
        .map((r: any) => ({
          id: r.id,
          reviewer_slot: r.reviewer_slot,
          skor: r.skor,
          catatan: r.catatan,
          is_locked: r.is_locked,
          submitted_at: r.submitted_at,
          reviewer: r.reviewer
            ? {
                nama_lengkap: r.reviewer.nama_lengkap,
                gelar: r.reviewer.gelar,
              }
            : null,
        }));
    } else if (activeRole === Role.PENGUSUL) {
      // Pengusul hanya boleh melihat skor rekapitulasi setelah disetujui / masuk tahap revisi
      const isEvaluationFinished =
        proposal.status === 'DISETUJUI' ||
        proposal.status === 'REVISI' ||
        proposal.status === 'SELESAI';

      if (isEvaluationFinished) {
        sanitizedReviews = proposal.reviews.map((r: any) => ({
          reviewer_slot: r.reviewer_slot,
          skor: r.skor,
          catatan: r.catatan,
          is_locked: r.is_locked,
          submitted_at: r.submitted_at,
          reviewer: null, // Identitas penelaah tetap anonim bagi pengusul
        }));
      } else {
        sanitizedReviews = []; // Sembunyikan skor parsial saat penilaian masih berlangsung
      }
    } else {
      // Peran Manajerial (KA_PPM, DIREKTUR, ADMIN, KAPRODI) berhak melihat seluruh ulasan
      sanitizedReviews = proposal.reviews.map((r: any) => ({
        id: r.id,
        reviewer_slot: r.reviewer_slot,
        skor: r.skor,
        catatan: r.catatan,
        is_locked: r.is_locked,
        submitted_at: r.submitted_at,
        reviewer: r.reviewer
          ? {
              nama_lengkap: r.reviewer.nama_lengkap,
              gelar: r.reviewer.gelar,
            }
          : null,
      }));
    }
  }

  return {
    id: proposal.id,
    no_agenda: proposal.no_agenda,
    no_registrasi: proposal.no_registrasi,
    judul: proposal.judul,
    skema: proposal.skema,
    tahap: proposal.tahap,
    status: proposal.status,
    prodi: proposal.prodi,
    file_url: effectiveFileUrl,
    skor_rata_rata: proposal.skor_rata_rata,
    is_bypass: proposal.is_bypass,
    alasan_bypass: proposal.alasan_bypass,
    created_at: proposal.created_at,
    ketua: sanitizedKetua,
    members: sanitizedMembers,
    reviews: sanitizedReviews,
  };
}

/**
 * Menyaring daftar (array) objek proposal
 */
export function sanitizeProposalListDto(
  proposals: any[],
  activeRole: Role,
  currentUserId: string
): SanitizedProposalOutput[] {
  if (!Array.isArray(proposals)) return [];
  return proposals.map((p) => sanitizeProposalDto(p, activeRole, currentUserId));
}
