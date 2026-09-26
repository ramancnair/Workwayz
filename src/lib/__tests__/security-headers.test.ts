import { describe, it, expect } from 'vitest';
import nextConfig from '../../../next.config';

describe('Security Configuration and Headers (OWASP Hardening)', () => {
  it('should disable poweredByHeader to avoid X-Powered-By leakage', () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it('should disable productionBrowserSourceMaps to avoid comment and source exposure', () => {
    expect(nextConfig.productionBrowserSourceMaps).toBe(false);
  });

  it('should configure subresource integrity (SRI) in experimental options', () => {
    expect(nextConfig.experimental?.sri).toBeDefined();
    expect(nextConfig.experimental?.sri?.algorithm).toBe('sha384');
  });

  it('should configure required security headers for all routes', async () => {
    expect(typeof nextConfig.headers).toBe('function');
    const headersList = await nextConfig.headers!();

    const globalRule = headersList.find((rule: any) => rule.source === '/:path*');
    expect(globalRule).toBeDefined();

    const headersMap = new Map<string, string>();
    for (const h of globalRule.headers) {
      headersMap.set(h.key.toLowerCase(), h.value);
    }

    // 1. Anti-clickjacking Header
    expect(headersMap.get('x-frame-options')).toBe('DENY');

    // 2. MIME-type Sniffing Protection
    expect(headersMap.get('x-content-type-options')).toBe('nosniff');

    // 3. Referrer Policy
    expect(headersMap.get('referrer-policy')).toBe('strict-origin-when-cross-origin');

    // 4. Strict Transport Security
    expect(headersMap.get('strict-transport-security')).toContain('max-age=');

    // 5. Permissions Policy
    expect(headersMap.get('permissions-policy')).toBeDefined();

    // 6. Cross-Origin Opener Policy
    expect(headersMap.get('cross-origin-opener-policy')).toBe('same-origin');
  });

  it('should generate dynamic nonce-based Content-Security-Policy in middleware without wildcards', async () => {
    const { middleware } = await import('../../middleware');
    const { NextRequest } = await import('next/server');

    const req = new NextRequest('http://localhost:3000/login');
    const res = middleware(req);

    const csp = res.headers.get('content-security-policy');
    expect(csp).toBeDefined();

    // Must contain nonce and strict-dynamic
    expect(csp).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
    expect(csp).toContain("'strict-dynamic'");

    // Must not contain wildcard '*' in connect-src or img-src
    const directives = csp!.split(';').map(d => d.trim());
    const connectSrc = directives.find(d => d.startsWith('connect-src'));
    const imgSrc = directives.find(d => d.startsWith('img-src'));

    expect(connectSrc).toBeDefined();
    expect(connectSrc).not.toContain('*');

    expect(imgSrc).toBeDefined();
    expect(imgSrc).not.toContain('*');

    // Must contain frame-ancestors 'none' and base-uri 'self'
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("object-src 'none'");

    // Request headers must receive x-nonce
    const forwardedNonce = res.headers.get('content-security-policy')?.match(/'nonce-([^']+)'/)?.[1];
    expect(forwardedNonce).toBeDefined();
  });
});
