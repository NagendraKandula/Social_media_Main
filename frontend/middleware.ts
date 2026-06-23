// frontend/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // 1. Check if the user has an access token in their cookies
  const token = req.cookies.get('access_token')?.value;

  // 2. Define your public routes (pages anyone can visit without logging in)
  const publicPaths = [
    '/Auth/login',
    '/Auth/register',
    '/Auth/forgot-password',
    '/Auth/preloading',
    '/',
    '/Home',
  ];
  const isPublicPath = publicPaths.includes(req.nextUrl.pathname);

  // 3. SECURITY RULE: If no token and trying to access a private page -> Redirect to Login
  if (!token && !isPublicPath) {
    return NextResponse.redirect(new URL('/Auth/login', req.url));
  }

  // 4. UX RULE: If they ARE logged in but try to go to the login/register page -> Send them to Landing
  if (token && (req.nextUrl.pathname === '/Auth/login' || req.nextUrl.pathname === '/Auth/register')) {
    return NextResponse.redirect(new URL('/Landing', req.url));
  }

  // 5. Otherwise, let them proceed normally
  return NextResponse.next();
}

// 6. Define which paths this middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, images (public files ending in .png, .jpg, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)',
  ],
};
