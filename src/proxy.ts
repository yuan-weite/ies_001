import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { COOKIE_NAME, verifySessionToken } from '@/lib/session-token';

const PUBLIC_PATHS = new Set(['/login', '/forgot-password', '/reset-password']);

function isDevMailbox(pathname: string): boolean {
  return pathname === '/dev/emails';
}

function redirectTo(request: NextRequest, pathname: string) {
  const response = NextResponse.redirect(new URL(pathname, request.url), 303);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/dev') && process.env.NODE_ENV === 'production') {
    return new NextResponse('Not Found', { status: 404 });
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  const devMailbox = process.env.NODE_ENV !== 'production' && isDevMailbox(pathname);
  const isPublic = PUBLIC_PATHS.has(pathname) || devMailbox;

  if (session?.mustChangePassword) {
    const allowed =
      pathname === '/change-password' ||
      pathname === '/session/continue' ||
      pathname === '/login';
    if (!allowed) return redirectTo(request, '/change-password');
  } else if (!session && !isPublic) {
    return redirectTo(request, '/login');
  }

  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
};
