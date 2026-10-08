'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { INACTIVITY_TIMEOUT_MS, ACTIVITY_STORAGE_KEY, USER_STORAGE_KEY, clearSession } from '@/lib/session';

export function SessionManager() {
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    if (typeof window !== 'undefined' && (window as any).__isLoggingOut) {
      return;
    }
    if (typeof window !== 'undefined') {
      (window as any).__isLoggingOut = true;
    }

    try {
      try {
        const { unsubscribeAllListeners } = await import('@/lib/db-provider');
        unsubscribeAllListeners();
      } catch {}

      const userStr = localStorage.getItem(USER_STORAGE_KEY);
      const sessionProvider = userStr ? (() => { try { return JSON.parse(userStr).authProvider; } catch { return null; } })() : null;

      clearSession();

      if (sessionProvider === 'supabase') {
        try {
          const { supabase } = await import('@/lib/supabase');
          await supabase?.auth.signOut();
        } catch (supaErr) {
          console.warn('[SessionManager] Supabase signOut failed:', supaErr);
        }
      } else if (auth) {
        const { signOut } = await import('firebase/auth');
        await signOut(auth);
      }
      
      window.location.href = '/login';
    } catch (error) {
      console.error("Error during timeout logout:", error);
      clearSession();
      window.location.href = '/login';
    }
  }, []);

  useEffect(() => {
    let activityInterval: NodeJS.Timeout;
    let throttleTimeout: NodeJS.Timeout | null = null;
    let isRememberMe = false;
    let issuedAt = 0;

    // 1. Check if we need to track activity based on rememberMe flag
    const userStr = localStorage.getItem(USER_STORAGE_KEY);
    if (!userStr) return; // Not logged in

    try {
      const session = JSON.parse(userStr);
      isRememberMe = session.rememberMe !== false;
      issuedAt = session.issuedAt || 0;
    } catch {
      // Ignore parse errors, AuthGuard handles invalid sessions
    }

    // Only apply the 2-hour inactivity timeout if rememberMe is false
    if (isRememberMe) {
      return;
    }

    const now = Date.now();
    const lastActivityStr = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    const lastActivity = lastActivityStr ? parseInt(lastActivityStr, 10) : 0;
    const isFreshLogin = issuedAt > 0 && now - issuedAt < 60_000;

    // Initialize last activity if missing, if it predates login timestamp, or if login is brand new
    if (!lastActivity || isFreshLogin || (issuedAt > 0 && lastActivity < issuedAt)) {
      localStorage.setItem(ACTIVITY_STORAGE_KEY, now.toString());
    }

    const updateActivity = () => {
      if (throttleTimeout) return;

      // Throttle localStorage writes to at most once every 5 seconds
      throttleTimeout = setTimeout(() => {
        localStorage.setItem(ACTIVITY_STORAGE_KEY, Date.now().toString());
        throttleTimeout = null;
      }, 5000);
    };

    const checkInactivity = () => {
      const currentActivityStr = localStorage.getItem(ACTIVITY_STORAGE_KEY);
      const currentTime = Date.now();
      if (!currentActivityStr) {
        localStorage.setItem(ACTIVITY_STORAGE_KEY, currentTime.toString());
        return;
      }

      const currentActivity = parseInt(currentActivityStr, 10);

      // Safety guard: If the session was created recently (within INACTIVITY_TIMEOUT_MS),
      // it cannot have genuinely timed out due to 2 hours of inactivity.
      // Refresh current activity if it was stale or predates issuedAt.
      if (issuedAt > 0 && currentTime - issuedAt < INACTIVITY_TIMEOUT_MS) {
        if (currentActivity < issuedAt || currentTime - currentActivity > INACTIVITY_TIMEOUT_MS) {
          localStorage.setItem(ACTIVITY_STORAGE_KEY, currentTime.toString());
          return;
        }
      }

      if (currentTime - currentActivity > INACTIVITY_TIMEOUT_MS) {
        console.warn('[SessionManager] Session timed out due to inactivity.');
        handleLogout();
      }
    };

    // 2. Cross-tab logout sync
    const handleStorageChange = (e: StorageEvent) => {
      // If user session is removed from another tab, force logout here
      if (e.key === USER_STORAGE_KEY && !e.newValue) {
        router.push('/login');
      }
    };

    // Bind event listeners
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach((event) => {
      window.addEventListener(event, updateActivity, { passive: true });
    });
    window.addEventListener('storage', handleStorageChange);

    // Initial check and periodic polling every 1 minute
    checkInactivity();
    activityInterval = setInterval(checkInactivity, 60 * 1000);

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(activityInterval);
      if (throttleTimeout) clearTimeout(throttleTimeout);
    };
  }, [handleLogout, router]);

  return null;
}
