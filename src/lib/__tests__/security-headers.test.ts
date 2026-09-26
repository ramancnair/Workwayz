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

    // 1. Content Security Policy
    const csp = headersMap.get('content-security-policy');
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("style-src 'self'");
    expect(csp).toContain("img-src 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("object-src 'none'");

    // 2. Anti-clickjacking Header
    expect(headersMap.get('x-frame-options')).toBe('DENY');

    // 3. MIME-type Sniffing Protection
    expect(headersMap.get('x-content-type-options')).toBe('nosniff');

    // 4. Referrer Policy
    expect(headersMap.get('referrer-policy')).toBe('strict-origin-when-cross-origin');

    // 5. Strict Transport Security
    expect(headersMap.get('strict-transport-security')).toContain('max-age=');

    // 6. Permissions Policy
    expect(headersMap.get('permissions-policy')).toBeDefined();
  });
});
