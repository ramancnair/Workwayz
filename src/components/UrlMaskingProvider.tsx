'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * UrlMaskingProvider
 * 
 * Ensures that the browser address bar always remains clean at the root URL ('/')
 * across all internal pages in Workwayz (Full Root URL Masking), while storing
 * the real active route in sessionStorage so that browser refreshes (F5) reload
 * the exact active page seamlessly.
 */
export function UrlMaskingProvider() {
  const pathname = usePathname();
  const isReplacingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Do not mask setup wizard
    if (pathname.startsWith('/setup-wizard')) {
      return;
    }

    // Record the real active route for session refresh restoration
    if (pathname && pathname !== '/' && pathname !== '/login') {
      try {
        sessionStorage.setItem('workwayz_real_route', pathname);
      } catch (_) {}
    }

    // Mask the address bar to root '/'
    if (window.location.pathname !== '/') {
      try {
        isReplacingRef.current = true;
        window.history.replaceState(window.history.state, '', '/');
      } catch (err) {
        console.warn('[UrlMaskingProvider] Failed to mask URL:', err);
      } finally {
        isReplacingRef.current = false;
      }
    }
  }, [pathname]);

  return null;
}
