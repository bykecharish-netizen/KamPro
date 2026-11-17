import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitasi HTML menggunakan DOMPurify untuk konten kaya teks (misal: Catatan Telaah Reviewer).
 * Membuang tag berbahaya seperti <script>, <iframe>, <object>, <embed>, serta atribut on* (onerror, onload).
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty || typeof dirty !== 'string') return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'b',
      'i',
      'em',
      'strong',
      'a',
      'p',
      'br',
      'ul',
      'ol',
      'li',
      'blockquote',
      'code',
      'pre',
      'span',
    ],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class'],
    ALLOW_DATA_ATTR: false,
  }).trim();
}

/**
 * Sanitasi teks murni (plain text, misal: Judul Proposal, Nama, NIP/NPM).
 * Menghapus SELURUH tag HTML dan karakter injeksi sehingga tidak menyisakan tag HTML apa pun.
 */
export function sanitizePlainText(dirty: string | null | undefined): string {
  if (!dirty || typeof dirty !== 'string') return '';
  // 1. Bersihkan via DOMPurify tanpa mengizinkan tag apa pun
  const cleaned = DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
  // 2. Bersihkan karakter kontrol CRLF yang berpotensi log/header injection
  return cleaned.replace(/[\r\n\t]/g, ' ').trim();
}

/**
 * Validasi URL Aman (Kontrol 1.2.2 - Safe URL)
 * Menolak protokol berbahaya seperti javascript:, data:, vbscript:, file:
 * HANYA mengizinkan:
 * 1. Protokol aman: https://
 * 2. Path internal aplikasi: diawali /api/ atau /uploads/ (tanpa path traversal '..')
 */
export function isSafeUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();

  // Tolak protokol berbahaya eksplisit
  const dangerousProtocols = /^(javascript|data|vbscript|file|about):/i;
  if (dangerousProtocols.test(trimmed)) {
    return false;
  }

  // Izinkan path internal yang aman (tanpa path traversal '..')
  if (trimmed.startsWith('/api/') || trimmed.startsWith('/uploads/')) {
    if (trimmed.includes('..')) {
      return false; // Mencegah Path Traversal (CWE-22)
    }
    return true;
  }

  // Izinkan URL eksternal HANYA dengan protokol HTTPS
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Helper validasi URL aman yang melempar exception jika URL tidak aman
 */
export function assertSafeUrl(url: string | null | undefined): string {
  if (!isSafeUrl(url)) {
    throw new Error(
      'Tautan dokumen tidak aman. Hanya protokol https:// atau path internal (/api/, /uploads/) yang diizinkan.'
    );
  }
  return url!.trim();
}
