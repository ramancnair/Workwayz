'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { extractRouteFromNextTree } from '@/lib/route-utils';

/**
 * UrlMaskingProvider
 * 
 * Ensures that the browser address bar always remains clean at the root URL ('/')
 * across all internal pages in Workwayz (Full Root URL Masking), while storing
 * the real active route in sessionStorage and history.state so that browser refreshes (F5)
 * and browser back/forward history navigation preserve the exact active page, tab,
 * and sidebar states seamlessly.
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
          const currentState = window.history.state;
          const currentRealRoute =
            currentState?.__workwayz_real_route ||
            (pathname && pathname !== '/' ? pathname : null) ||
            (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('workwayz_real_route') : null);

          const maskedState =
            currentState && typeof currentState === 'object'
              ? { ...currentState, ...(currentRealRoute ? { __workwayz_real_route: currentRealRoute } : {}) }
              : currentRealRoute
              ? { __workwayz_real_route: currentRealRoute }
              : currentState;

          window.history.replaceState(maskedState, '', '/');
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
          const currentState = window.history.state;
          const currentRealRoute =
            currentState?.__workwayz_real_route ||
            (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('workwayz_real_route') : null);

          const maskedState =
            currentState && typeof currentState === 'object'
              ? { ...currentState, ...(currentRealRoute ? { __workwayz_real_route: currentRealRoute } : {}) }
              : currentRealRoute
              ? { __workwayz_real_route: currentRealRoute }
              : currentState;

          originalReplaceState(maskedState, '', '/');
        } catch (_) {}
      }
    };

    window.history.pushState = function (data, unused, url) {
      const realUrl = typeof url === 'string' ? url : url ? String(url) : '';
      const isEligible = realUrl && !realUrl.startsWith('/setup-wizard') && realUrl !== '/' && realUrl !== '/login';

      if (isEligible) {
        try {
          sessionStorage.setItem('workwayz_real_route', realUrl);
        } catch (_) {}
      }

      const enrichedData =
        data && typeof data === 'object'
          ? { ...data, ...(isEligible ? { __workwayz_real_route: realUrl } : {}) }
          : isEligible
          ? { __workwayz_real_route: realUrl }
          : data;

      const res = originalPushState(enrichedData, unused, url);
      setTimeout(maskUrl, 0);
      return res;
    };

    window.history.replaceState = function (data, unused, url) {
      const realUrl = typeof url === 'string' ? url : url ? String(url) : '';
      const isEligible = realUrl && !realUrl.startsWith('/setup-wizard') && realUrl !== '/' && realUrl !== '/login';

      if (isEligible) {
        try {
          sessionStorage.setItem('workwayz_real_route', realUrl);
        } catch (_) {}
      }

      const enrichedData =
        data && typeof data === 'object'
          ? { ...data, ...(isEligible ? { __workwayz_real_route: realUrl } : {}) }
          : isEligible
          ? { __workwayz_real_route: realUrl }
          : data;

      const res = originalReplaceState(enrichedData, unused, url);
      setTimeout(maskUrl, 0);
      return res;
    };

    const handlePopStateCapture = (event: PopStateEvent) => {
      const targetRoute =
        event.state?.__workwayz_real_route ||
        extractRouteFromNextTree(event.state?.__PRIVATE_NEXTJS_INTERNALS_TREE?.tree);

      if (targetRoute && targetRoute !== '/' && targetRoute !== '/login' && !targetRoute.startsWith('/setup-wizard')) {
        try {
          sessionStorage.setItem('workwayz_real_route', targetRoute);
        } catch (_) {}

        // Temporarily set location to real route so Next.js onPopState receives the correct href
        try {
          originalReplaceState(event.state, '', targetRoute);
        } catch (_) {}

        try {
          window.dispatchEvent(new CustomEvent('workwayz-route-change', { detail: { route: targetRoute } }));
        } catch (_) {}
      }

      setTimeout(maskUrl, 0);
      setTimeout(maskUrl, 50);
      setTimeout(maskUrl, 150);
    };

    window.addEventListener('popstate', handlePopStateCapture, true);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', handlePopStateCapture, true);
    };
  }, []);

  return null;
}
