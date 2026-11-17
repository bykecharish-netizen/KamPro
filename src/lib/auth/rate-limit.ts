/**
 * Rate Limiter untuk mitigasi Brute Force pada endpoint login (OWASP ASVS v5.0.0 Level 1)
 * Kebijakan: Maksimal 5 kali percobaan gagal per 15 menit berdasarkan kombinasi IP dan NIP/NPM.
 */

interface RateLimitRecord {
  failedAttempts: number;
  windowStart: number;
  blockedUntil: number | null;
}

const RATE_LIMIT_STORE = new Map<string, RateLimitRecord>();

export const MAX_FAILED_ATTEMPTS = 5;
export const WINDOW_MS = 15 * 60 * 1000; // 15 menit

/**
 * Menghasilkan kunci unik berdasarkan kombinasi IP dan NIP/NPM
 */
export function getRateLimitKey(ip: string, identifier: string): string {
  const sanitizedIp = (ip || 'unknown').trim();
  const sanitizedIdentifier = (identifier || 'unknown').trim().toLowerCase();
  return `${sanitizedIp}:${sanitizedIdentifier}`;
}

export interface RateLimitStatus {
  isBlocked: boolean;
  remainingAttempts: number;
  retryAfterSeconds?: number;
}

/**
 * Memeriksa status rate limit untuk kombinasi IP dan NIP/NPM tertentu
 */
export function checkRateLimit(ip: string, identifier: string): RateLimitStatus {
  const key = getRateLimitKey(ip, identifier);
  const now = Date.now();
  const record = RATE_LIMIT_STORE.get(key);

  if (!record) {
    return {
      isBlocked: false,
      remainingAttempts: MAX_FAILED_ATTEMPTS,
    };
  }

  // Jika window 15 menit sudah kedaluwarsa, bersihkan record
  if (now - record.windowStart > WINDOW_MS) {
    RATE_LIMIT_STORE.delete(key);
    return {
      isBlocked: false,
      remainingAttempts: MAX_FAILED_ATTEMPTS,
    };
  }

  // Jika sedang diblokir
  if (record.blockedUntil && record.blockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return {
      isBlocked: true,
      remainingAttempts: 0,
      retryAfterSeconds,
    };
  }

  const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - record.failedAttempts);
  return {
    isBlocked: remaining <= 0,
    remainingAttempts: remaining,
  };
}

/**
 * Mencatat percobaan gagal login dan memperbarui status blokir jika batas terlampaui
 */
export function recordFailedAttempt(ip: string, identifier: string): RateLimitStatus {
  const key = getRateLimitKey(ip, identifier);
  const now = Date.now();
  let record = RATE_LIMIT_STORE.get(key);

  if (!record || now - record.windowStart > WINDOW_MS) {
    record = {
      failedAttempts: 1,
      windowStart: now,
      blockedUntil: null,
    };
  } else {
    record.failedAttempts += 1;
  }

  if (record.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    // Blokir hingga akhir jendela waktu 15 menit
    record.blockedUntil = record.windowStart + WINDOW_MS;
  }

  RATE_LIMIT_STORE.set(key, record);

  const isBlocked = record.failedAttempts >= MAX_FAILED_ATTEMPTS;
  const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - record.failedAttempts);
  const retryAfterSeconds = isBlocked
    ? Math.ceil(((record.blockedUntil ?? (record.windowStart + WINDOW_MS)) - now) / 1000)
    : undefined;

  return {
    isBlocked,
    remainingAttempts: remaining,
    retryAfterSeconds,
  };
}

/**
 * Mereset catatan kegagalan setelah login berhasil
 */
export function resetRateLimit(ip: string, identifier: string): void {
  const key = getRateLimitKey(ip, identifier);
  RATE_LIMIT_STORE.delete(key);
}

// Pruning berkala setiap 5 menit agar memori tetap bersih
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of RATE_LIMIT_STORE.entries()) {
      if (now - record.windowStart > WINDOW_MS) {
        RATE_LIMIT_STORE.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}
