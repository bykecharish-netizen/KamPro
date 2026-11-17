import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * [Kontrol 2.3.1 - No Skipping Steps]
 * Middleware Gerbang Pertama Sisi Server (Edge/Server-side Guard)
 * Memastikan alur navigasi terkunci rapat:
 * 1. Halaman /dashboard wajib memiliki cookie session_token, jika tidak alihkan langsung ke /login.
 * 2. Endpoint API terproteksi (/api/proposals, /api/reviews, /api/users) wajib memiliki cookie session_token.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get('session_token')?.value;

  // 1. Proteksi Halaman Portal / Dasbor
  if (pathname.startsWith('/dashboard')) {
    if (!sessionToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Proteksi Endpoint API Terproteksi (Defense-in-depth sebelum masuk requireRole)
  const isProtectedApi =
    pathname.startsWith('/api/proposals') ||
    pathname.startsWith('/api/reviews') ||
    pathname.startsWith('/api/users') ||
    pathname.startsWith('/api/auth/switch-role');

  if (isProtectedApi && !sessionToken) {
    return NextResponse.json(
      { error: 'Sesi telah kedaluwarsa atau tidak terautentikasi (401 Unauthorized)' },
      {
        status: 401,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/proposals/:path*',
    '/api/reviews/:path*',
    '/api/users/:path*',
    '/api/auth/switch-role',
  ],
};
