import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV !== 'production';

  // Extract explicit Supabase host if configured
  const rawSupaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  let supaHost = '';
  try {
    if (rawSupaUrl && rawSupaUrl.startsWith('http')) {
      supaHost = new URL(rawSupaUrl).host;
    }
  } catch {}

  const supaConnect = supaHost ? `https://${supaHost} wss://${supaHost}` : '';
  const supaImg = supaHost ? `https://${supaHost}` : '';

  // Strict script-src with nonces and strict-dynamic:
  // In production, 'unsafe-eval' is completely excluded.
  // In dev, 'unsafe-eval' is permitted for React Fast Refresh and HMR.
  const scriptDirectives = isDev
    ? `'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`
    : `'self' 'nonce-${nonce}' 'strict-dynamic'`;

  // Policy without any wildcard '*' directives
  const cspHeader = `
    default-src 'self';
    script-src ${scriptDirectives};
    style-src 'self' 'nonce-${nonce}' 'unsafe-inline';
    style-src-attr 'unsafe-inline';
    style-src-elem 'self' 'nonce-${nonce}' 'unsafe-inline';
    img-src 'self' data: blob: https://placehold.co https://lh3.googleusercontent.com https://avatars.githubusercontent.com ${supaImg};
    font-src 'self' data:;
    connect-src 'self' https://identitytoolkit.googleapis.com https://firestore.googleapis.com https://securetoken.googleapis.com https://api.github.com ${supaConnect} http://localhost:3000 http://127.0.0.1:3000;
    frame-ancestors 'none';
    form-action 'self';
    object-src 'none';
    base-uri 'self';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), browsing-topics=()');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');

  return response;
}

// Backward compatibility alias
export { proxy as middleware };

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes handle their own CORS / response format)
     * - _next/static (static chunks and bundles)
     * - _next/image (image optimization endpoints)
     * - favicon.ico (favicon file)
     */
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
