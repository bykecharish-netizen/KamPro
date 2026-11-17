import crypto from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { mockStore } from '@/lib/mockStore';
import type { Session, User, UserRole } from '@prisma/client';

export const SESSION_COOKIE_NAME = 'session_token';
export const IDLE_TIMEOUT_MINUTES = 30;
export const IDLE_TIMEOUT_MS = IDLE_TIMEOUT_MINUTES * 60 * 1000; // 30 menit (1.800.000 ms)

export type SessionWithUser = Session & {
  user: User & {
    roles: UserRole[];
  };
};

/**
 * Menghasilkan hash SHA-256 dari token sesi untuk disimpan di basis data.
 * Memastikan token mentah tidak tersimpan di database jika terjadi kebocoran (OWASP ASVS Level 1).
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Membuat token sesi baru menggunakan CSPRNG (256-bit / 32 bytes)
 * dan menyimpannya ke tabel sessions dengan batas kedaluwarsa 30 menit.
 */
export async function createSession(
  userId: string,
  defaultRole: string
): Promise<{ token: string; session: Session }> {
  // 1. Bangkitkan token acak CSPRNG 256-bit
  const token = crypto.randomBytes(32).toString('hex');
  const token_hash = hashSessionToken(token);

  const now = new Date();
  const expires_at = new Date(now.getTime() + IDLE_TIMEOUT_MS);

  try {
    // 2. Coba simpan ke PostgreSQL via Prisma
    const session = await prisma.session.create({
      data: {
        user_id: userId,
        token_hash,
        active_role: defaultRole,
        last_activity_at: now,
        expires_at,
      },
    });

    return { token, session };
  } catch (err) {
    // Fallback in-memory mock store
    const session: Session = {
      id: `sess-${Date.now()}`,
      user_id: userId,
      token_hash,
      active_role: defaultRole,
      last_activity_at: now,
      expires_at,
    };
    mockStore.sessions.set(token_hash, session);
    return { token, session };
  }
}

/**
 * Memvalidasi sesi berdasarkan token mentah dari cookie:
 * 1. Memeriksa keberadaan sesi di basis data melalui token_hash
 * 2. Memeriksa status akun (jika is_active == false, sesi dihapus seketika)
 * 3. Memeriksa batas waktu diam (idle timeout 30 menit)
 * 4. Jika valid, memperbarui last_activity_at dan memperpanjang expires_at (sliding window)
 */
export async function validateSession(rawToken: string): Promise<SessionWithUser | null> {
  if (!rawToken || typeof rawToken !== 'string') {
    return null;
  }

  const token_hash = hashSessionToken(rawToken);
  const now = new Date();

  try {
    const session = await prisma.session.findUnique({
      where: { token_hash },
      include: {
        user: {
          include: {
            roles: true,
          },
        },
      },
    });

    if (session) {
      // 1. Pemutusan sesi seketika jika akun dinonaktifkan
      if (!session.user.is_active) {
        await prisma.session.delete({
          where: { id: session.id },
        }).catch(() => null);
        return null;
      }

      // 2. Penegakan idle timeout 30 menit
      const isExpired =
        now.getTime() > session.expires_at.getTime() ||
        now.getTime() - session.last_activity_at.getTime() > IDLE_TIMEOUT_MS;

      if (isExpired) {
        await prisma.session.delete({
          where: { id: session.id },
        }).catch(() => null);
        return null;
      }

      // 3. Perbarui last_activity_at & expires_at (sliding window)
      const newExpiresAt = new Date(now.getTime() + IDLE_TIMEOUT_MS);
      const updatedSession = await prisma.session.update({
        where: { id: session.id },
        data: {
          last_activity_at: now,
          expires_at: newExpiresAt,
        },
        include: {
          user: {
            include: {
              roles: true,
            },
          },
        },
      });

      return updatedSession;
    }
  } catch (err) {
    // Database tidak dapat dijangkau, gunakan mock store
  }

  // Cek di mockStore
  const mockSess = mockStore.sessions.get(token_hash);
  if (!mockSess) return null;

  const mockUser = mockStore.users.find((u) => u.id === mockSess.user_id);
  if (!mockUser || !mockUser.is_active) {
    mockStore.sessions.delete(token_hash);
    return null;
  }

  const isExpired =
    now.getTime() > mockSess.expires_at.getTime() ||
    now.getTime() - mockSess.last_activity_at.getTime() > IDLE_TIMEOUT_MS;

  if (isExpired) {
    mockStore.sessions.delete(token_hash);
    return null;
  }

  mockSess.last_activity_at = now;
  mockSess.expires_at = new Date(now.getTime() + IDLE_TIMEOUT_MS);

  return {
    ...mockSess,
    user: mockUser as any,
  };
}

/**
 * Menghapus sesi dari basis data saat pengguna logout
 */
export async function destroySession(rawToken: string): Promise<void> {
  if (!rawToken) return;

  const token_hash = hashSessionToken(rawToken);
  try {
    await prisma.session.deleteMany({
      where: { token_hash },
    }).catch(() => null);
  } catch {
    // ignore
  }
  mockStore.sessions.delete(token_hash);
}

/**
 * Menanamkan token sesi ke cookie HTTP dengan konfigurasi keamanan OWASP ASVS
 */
export async function setSessionCookie(token: string): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: IDLE_TIMEOUT_MINUTES * 60, // 30 menit dalam detik
    });
  } catch {
    // Abaikan jika dipanggil di luar request context
  }
}

/**
 * Menghapus cookie sesi dari peramban
 */
export async function clearSessionCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
  } catch {
    // Abaikan jika dipanggil di luar request context
  }
}

/**
 * Mengambil sesi saat ini dari cookie request aktif dan memperbarui idle timeout jika valid
 */
export async function getCurrentSession(providedToken?: string): Promise<SessionWithUser | null> {
  let token = providedToken;

  if (!token) {
    try {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
      token = sessionCookie?.value;
    } catch {
      // Abaikan jika dipanggil di luar request context
    }
  }

  if (!token) {
    return null;
  }

  return validateSession(token);
}
