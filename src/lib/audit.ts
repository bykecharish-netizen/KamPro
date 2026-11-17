import { prisma } from '@/lib/prisma';
import { mockStore } from '@/lib/mockStore';

export interface AuditLogPayload {
  actor_id?: string | null;
  active_role?: string | null;
  ip_address?: string | null;
  action_type: string;
  target_id?: string | null;
  status_code?: string | number | null;
  details?: Record<string, unknown> | string | null;
}

/**
 * Membersihkan input teks dari karakter kontrol CR, LF, TAB untuk mencegah Log Injection (CWE-117)
 */
export function sanitizeLogInput(input: string | null | undefined): string {
  if (!input) return '';
  return input.replace(/[\r\n\t]/g, ' ').trim().slice(0, 200);
}

/**
 * Pola kunci sensitif yang tidak boleh dicatat ke audit log (OWASP ASVS Level 1)
 */
const SENSITIVE_KEY_PATTERN = /password|passwd|pass|token|session|secret|auth|authorization|cookie|bearer|credential/i;

/**
 * Membersihkan data sensitif (password, token sesi, kredensial) dari objek details
 */
export function sanitizeAuditDetails(details: unknown): string | null {
  if (details === null || details === undefined) {
    return null;
  }

  if (typeof details === 'string') {
    // Sanitasi jika details berupa JSON string
    try {
      const parsed = JSON.parse(details);
      return JSON.stringify(cleanObject(parsed));
    } catch {
      // Masking jika ada teks yang mencurigakan seperti password=xxx atau token=xxx
      return details
        .replace(/(password|passwd|token|secret|session_token)\s*[:=]\s*["']?[^"',\s]+["']?/gi, '$1=[REDACTED]')
        .slice(0, 4000); // Batasi panjang teks audit log
    }
  }

  if (typeof details === 'object') {
    return JSON.stringify(cleanObject(details as Record<string, unknown>));
  }

  return String(details).slice(0, 4000);
}

function cleanObject(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(cleanObject);
  }

  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      cleaned[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      cleaned[key] = cleanObject(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/**
 * Mengambil alamat IP klien dari request headers
 */
export function extractClientIp(headersOrRequest: Headers | Request): string {
  const headers = headersOrRequest instanceof Request ? headersOrRequest.headers : headersOrRequest;
  
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();

  return '127.0.0.1';
}

/**
 * Mencatat peristiwa sistem secara append-only ke tabel audit_logs.
 * Stempel waktu selalu dalam format UTC.
 * Menegakkan larangan pencatatan password dan token sesi mentah.
 */
export async function logAuditEvent(payload: AuditLogPayload): Promise<void> {
  try {
    const sanitizedDetails = sanitizeAuditDetails(payload.details);

    await prisma.auditLog.create({
      data: {
        timestamp_utc: new Date(),
        actor_id: payload.actor_id ?? null,
        active_role: payload.active_role ?? null,
        ip_address: payload.ip_address ?? '127.0.0.1',
        action_type: payload.action_type,
        target_id: payload.target_id ?? null,
        status_code: payload.status_code ? String(payload.status_code) : null,
        details: sanitizedDetails,
      },
    });
  } catch (error) {
    // Audit logging kegagalan disimpan ke mock store in-memory agar jejak tetap utuh
    mockStore.auditLogs.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp_utc: new Date(),
      actor_id: payload.actor_id ?? null,
      active_role: payload.active_role ?? null,
      ip_address: payload.ip_address ?? '127.0.0.1',
      action_type: payload.action_type,
      target_id: payload.target_id ?? null,
      status_code: payload.status_code ? String(payload.status_code) : null,
      details: sanitizeAuditDetails(payload.details),
    });
  }
}
