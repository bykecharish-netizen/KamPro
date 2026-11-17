import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export class FileValidationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'FileValidationError';
    this.statusCode = statusCode;
  }
}

export interface SavedFileInfo {
  fileName: string;
  filePath: string;
  fileUrl: string;
  fileSize: number;
}

/**
 * Validasi ketat berkas PDF (Kontrol 1.5.1 - Anti-XXE & PDF Magic Bytes)
 * 1. Menolak format non-PDF (.xml, .docx, .xlsx, .txt, dll)
 * 2. Menolak berkas yang diganti namanya ke .pdf namun bukan PDF sah
 * 3. Memverifikasi 4 byte pertama %PDF (0x25 0x50 0x44 0x46)
 * 4. Memverifikasi MIME type application/pdf
 */
export function validatePdfFile(
  fileBuffer: Buffer | Uint8Array,
  fileName: string,
  mimeType?: string
): void {
  // 1. Validasi Ekstensi
  const ext = path.extname(fileName).toLowerCase();
  if (ext !== '.pdf') {
    throw new FileValidationError(
      `Format ekstensi berkas '${ext}' tidak didukung. Hanya berkas PDF (.pdf) yang diizinkan.`,
      415
    );
  }

  // 2. Validasi MIME Type jika diberikan
  if (mimeType) {
    const cleanMime = mimeType.toLowerCase().split(';')[0].trim();
    if (cleanMime !== 'application/pdf') {
      throw new FileValidationError(
        `Tipe media '${mimeType}' tidak didukung. Berkas wajib berupa 'application/pdf'.`,
        415
      );
    }
  }

  // 3. Batas Ukuran (10MB)
  const MAX_SIZE = 10 * 1024 * 1024;
  if (fileBuffer.byteLength > MAX_SIZE) {
    throw new FileValidationError('Ukuran berkas melebihi batas maksimal 10MB.', 400);
  }

  if (fileBuffer.byteLength < 4) {
    throw new FileValidationError('Berkas PDF tidak valid atau kosong.', 400);
  }

  // 4. Validasi Magic Bytes: 4 byte pertama wajib %PDF (0x25 0x50 0x44 0x46)
  const bytes = Buffer.from(fileBuffer.slice(0, 4));
  const isPdfMagic =
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46;   // F

  if (!isPdfMagic) {
    throw new FileValidationError(
      'Format berkas rusak atau palsu. Magic bytes berkas bukan PDF yang sah (%PDF / 0x25 0x50 0x44 0x46).',
      415
    );
  }
}

/**
 * Validasi dan simpan file PDF ke penyimpanan lokal
 * Menerapkan standar keamanan:
 * 1. Ukuran maksimal 10MB
 * 2. Validasi magic bytes PDF (%PDF / 0x25 0x50 0x44 0x46)
 * 3. Sanitasi nama file acak untuk mencegah path traversal (CWE-22)
 */
export async function saveProposalFile(
  fileBuffer: Buffer | Uint8Array,
  originalName: string,
  subFolder = 'proposals',
  mimeType?: string
): Promise<SavedFileInfo> {
  // Validasi ketat PDF
  validatePdfFile(fileBuffer, originalName, mimeType);

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', subFolder);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const fileExt = path.extname(originalName).toLowerCase() || '.pdf';
  const randomSuffix = crypto.randomBytes(12).toString('hex');
  const safeFileName = `doc-${Date.now()}-${randomSuffix}${fileExt}`;
  const fullFilePath = path.join(uploadDir, safeFileName);

  await fs.promises.writeFile(fullFilePath, fileBuffer);

  const fileUrl = `/uploads/${subFolder}/${safeFileName}`;

  return {
    fileName: safeFileName,
    filePath: fullFilePath,
    fileUrl,
    fileSize: fileBuffer.byteLength,
  };
}
