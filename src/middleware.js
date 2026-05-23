import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Role checks
    if (path.startsWith('/instructor') && token?.role !== 'INSTRUCTOR' && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/auth/signin?error=AccessDenied', req.url));
    }

    if (path.startsWith('/admin') && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/auth/signin?error=AccessDenied', req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    '/classroom/:path*',
    '/instructor/:path*',
    '/admin/:path*',
  ],
};
