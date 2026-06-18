import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

const ipRequests = new Map();
const windowMs = 60000; // 1 minute window
const maxRequests = 500; // 500 requests limit

export async function middleware(req) {
  const hostname = req.nextUrl.hostname;

  // Redirect Vercel domains to the custom domain (upgradeskills.co.in)
  if (hostname.endsWith('.vercel.app')) {
    return NextResponse.redirect(
      `https://upgradeskills.co.in${req.nextUrl.pathname}${req.nextUrl.search}`,
      301
    );
  }

  const now = Date.now();
  const path = req.nextUrl.pathname;

  // Redirect legacy 404 paths to new active paths (SEO Migration redirects)
  const legacyRedirects = {
    '/about-us': '/',
    '/about': '/',
    '/contact-us': '/',
    '/contact': '/',
    '/shop': '/courses',
    '/student-registration': '/auth/signup',
    '/teach-with-us': '/instructor',
    '/privacy-policy': '/',
    '/privacy': '/',
    '/terms-conditions': '/',
    '/terms': '/'
  };

  if (legacyRedirects[path]) {
    return NextResponse.redirect(
      new URL(legacyRedirects[path], req.url),
      301
    );
  }

  // 1. IP-Based Rate Limiting to prevent DoS/DDoS attacks
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.ip || '127.0.0.1';
  const isLocalhost = ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip.endsWith('127.0.0.1');
  
  if (!isLocalhost) {
    // Guard map size to prevent memory leaks from long-running server instances
    if (ipRequests.size > 10000) {
      ipRequests.clear();
    }

    let ipData = ipRequests.get(ip);
    if (!ipData || now > ipData.resetTime) {
      ipData = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    ipData.count++;
    ipRequests.set(ip, ipData);

    if (ipData.count > maxRequests) {
      return new NextResponse('Too Many Requests. Access restricted to protect server resources.', {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((ipData.resetTime - now) / 1000).toString(),
          'Content-Type': 'text/plain; charset=utf-8',
        },
      });
    }
  }

  // 2. Route Authentication & Authorization Guards
  const isProtectedPath = path.startsWith('/classroom') || path.startsWith('/instructor') || path.startsWith('/admin');
  
  let response;
  if (isProtectedPath) {
    const token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET
    });

    if (!token) {
      const signInUrl = new URL('/auth/signin', req.url);
      signInUrl.searchParams.set('callbackUrl', req.url);
      response = NextResponse.redirect(signInUrl);
    } else {
      // Role Checks
      if (path.startsWith('/instructor') && token.role !== 'INSTRUCTOR' && token.role !== 'ADMIN') {
        response = NextResponse.redirect(new URL('/auth/signin?error=AccessDenied', req.url));
      } else if (path.startsWith('/admin') && token.role !== 'ADMIN') {
        response = NextResponse.redirect(new URL('/auth/signin?error=AccessDenied', req.url));
      } else {
        response = NextResponse.next();
      }
    }
  } else {
    response = NextResponse.next();
  }

  // 3. Security Hardening Headers (OWASP Best Practices)
  response.headers.set('X-Frame-Options', 'DENY'); // Clickjacking protection
  response.headers.set('X-Content-Type-Options', 'nosniff'); // MIME Sniffing protection
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin'); // Protect user referrer info
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()'); // Restrict hardware features
  response.headers.set('X-XSS-Protection', '1; mode=block'); // Legacy XSS filter activation
  
  // Content Security Policy (CSP) to block malicious scripts and injections
  response.headers.set('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://cdn.jsdelivr.net https://www.youtube.com https://s.ytimg.com https://www.googletagmanager.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://api.razorpay.com https://vitals.vercel-insights.com https://*.youtube.com https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com; " +
    "font-src 'self' data: https://fonts.gstatic.com; " +
    "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://www.youtube.com https://www.youtube-nocookie.com; " +
    "object-src 'none';"
  );

  // Force HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (png, svg, jpg, webp, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
