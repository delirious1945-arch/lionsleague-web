import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Allow static files, logo, and player images
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/players') ||
    pathname.startsWith('/logo.png') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  const session = request.cookies.get('lions_session');
  const isAuthenticated = Boolean(session?.value);

  // If unauthenticated and trying to access any page other than root
  if (!isAuthenticated && pathname !== '/') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
