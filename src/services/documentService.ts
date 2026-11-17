import { PDFDocument } from 'pdf-lib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { saveProposalFile, SavedFileInfo } from '@/lib/storage';

/**
 * Service untuk manipulasi dokumen PDF dan pembangkitan QR Code tanda tangan digital
 * Standar Keamanan: OWASP ASVS v5.0.0 Level 1 & Perdir Poltek SSN No. 1/2025
 */

/**
 * 1. Menghapus metadata penulis/creator/title pada salinan PDF untuk Double-Blind Review (FO-016/FO-019)
 */
export async function sanitizePdfMetadata(inputPdfBuffer: Buffer | Uint8Array): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(inputPdfBuffer);

  // Bersihkan seluruh metadata identitas penulis dan perangkat
  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setKeywords([]);
  pdfDoc.setProducer('SIM-PPM Poltek SSN (Sanitized for Double-Blind Review)');
  pdfDoc.setCreator('SIM-PPM Poltek SSN Anon System');
  pdfDoc.setCreationDate(new Date(0));
  pdfDoc.setModificationDate(new Date(0));

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Membuat dan menyimpan salinan berkas proposal yang telah dibersihkan metadatanya
 * untuk disimpan ke tabel proposals.sanitized_file_url
 */
export async function createSanitizedProposalFile(
  originalFileBuffer: Buffer,
  originalFileName: string
): Promise<SavedFileInfo> {
  const sanitizedBuffer = await sanitizePdfMetadata(originalFileBuffer);
  const cleanName = `sanitized-${originalFileName}`;
  return saveProposalFile(sanitizedBuffer, cleanName, 'proposals');
}

/**
 * 2. Helper generateApprovalQR(proposalId, actorId, timestamp, details)
 * Menghasilkan bukti pengesahan digital internal berupa QR Code berbasis SHA-256 HMAC/Digest
 */
export async function generateApprovalQR(
  proposalId: string,
  actorId: string,
  timestamp: Date | string = new Date(),
  details = 'DIGITAL_APPROVAL_INTERNAL'
): Promise<string> {
  const tsIso = timestamp instanceof Date ? timestamp.toISOString() : new Date(timestamp).toISOString();
  const rawPayload = `${proposalId}:${actorId}:${tsIso}:${details}`;
  const verificationDigest = crypto.createHash('sha256').update(rawPayload).digest('hex');

  const qrData = JSON.stringify({
    institution: 'Politeknik Siber dan Sandi Negara',
    system: 'SIM-PPM / PKM',
    proposal_id: proposalId,
    signer_id: actorId,
    signed_at: tsIso,
    action: details,
    digest: verificationDigest.slice(0, 32),
  });

  // Hasilkan QR Code dalam format Data URL PNG Base64
  return QRCode.toDataURL(qrData, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 256,
    color: {
      dark: '#0A2540', // Navy Poltek SSN
      light: '#FFFFFF',
    },
  });
}

/**
 * Menghasilkan token tanda tangan bertanda waktu (Signed URL) sederhana untuk pengunduhan berkas
 * Mencegah pengunduhan liar tanpa sesi terverifikasi
 */
export function generateSignedDocumentToken(
  proposalId: string,
  userId: string,
  role: string,
  expiresInMinutes = 30
): string {
  const expires = Date.now() + expiresInMinutes * 60 * 1000;
  const payload = `${proposalId}|${userId}|${role}|${expires}`;
  const secret = process.env.SESSION_SECRET || 'poltek-ssn-doc-secret-2026';
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const token = Buffer.from(JSON.stringify({ p: proposalId, u: userId, r: role, exp: expires, s: sig })).toString('base64url');
  return token;
}

/**
 * Verifikasi signed document token
 */
export function verifySignedDocumentToken(
  token: string
): { isValid: boolean; proposalId?: string; userId?: string; role?: string } {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.exp || Date.now() > parsed.exp) {
      return { isValid: false };
    }
    const secret = process.env.SESSION_SECRET || 'poltek-ssn-doc-secret-2026';
    const payload = `${parsed.p}|${parsed.u}|${parsed.r}|${parsed.exp}`;
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    if (parsed.s !== expectedSig) {
      return { isValid: false };
    }
    return {
      isValid: true,
      proposalId: parsed.p,
      userId: parsed.u,
      role: parsed.r,
    };
  } catch {
    return { isValid: false };
  }
}
