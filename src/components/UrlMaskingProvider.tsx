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
    if (pathname && pathname.startsWith('/setup-wizard')) {
      return;
    }

    // Record the real active route for session refresh restoration
    if (pathname && pathname !== '/' && pathname !== '/login') {
      try {
        sessionStorage.setItem('workwayz_real_route', pathname);
      } catch (_) {}
    }

    const maskToRoot = () => {
      if (typeof window === 'undefined') return;
      if (window.location.pathname !== '/' && !window.location.pathname.startsWith('/setup-wizard')) {
        try {
          isReplacingRef.current = true;
          window.history.replaceState(window.history.state, '', '/');
        } catch (err) {
          console.warn('[UrlMaskingProvider] Failed to mask URL:', err);
        } finally {
          isReplacingRef.current = false;
        }
      }
    };

    // Execute immediately and on subsequent ticks after Next.js finishes router reconciliation
    maskToRoot();
    const t1 = setTimeout(maskToRoot, 50);
    const t2 = setTimeout(maskToRoot, 150);
    const t3 = setTimeout(maskToRoot, 400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [pathname]);

  // Hook into history pushState / replaceState to catch Next.js router navigations
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);

    const maskUrl = () => {
      if (window.location.pathname !== '/' && !window.location.pathname.startsWith('/setup-wizard')) {
        try {
          originalReplaceState(window.history.state, '', '/');
        } catch (_) {}
      }
    };

    window.history.pushState = function (data, unused, url) {
      const res = originalPushState(data, unused, url);
      if (url && typeof url === 'string' && !url.startsWith('/setup-wizard') && url !== '/' && url !== '/login') {
        try {
          sessionStorage.setItem('workwayz_real_route', url);
        } catch (_) {}
      }
      setTimeout(maskUrl, 0);
      return res;
    };

    window.history.replaceState = function (data, unused, url) {
      const res = originalReplaceState(data, unused, url);
      if (url && typeof url === 'string' && !url.startsWith('/setup-wizard') && url !== '/' && url !== '/login') {
        try {
          sessionStorage.setItem('workwayz_real_route', url);
        } catch (_) {}
      }
      setTimeout(maskUrl, 0);
      return res;
    };

    const handlePopState = () => {
      setTimeout(maskUrl, 0);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return null;
}
