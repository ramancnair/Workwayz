'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';

const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours
const ACTIVITY_STORAGE_KEY = 'projectflow_last_activity';
const USER_STORAGE_KEY = 'projectflow_user';

export function SessionManager() {
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    try {
      if (typeof window !== 'undefined') {
        (window as any).__isLoggingOut = true;
      }
      try {
        const { unsubscribeAllListeners } = await import('@/lib/db-provider');
        unsubscribeAllListeners();
      } catch {}

      const userStr = localStorage.getItem(USER_STORAGE_KEY);
      const sessionProvider = userStr ? (() => { try { return JSON.parse(userStr).authProvider; } catch { return null; } })() : null;

      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(ACTIVITY_STORAGE_KEY);
      document.cookie = "projectflow_session_active=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

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

    // Initialize last activity if missing or if it predates the current session's login timestamp
    const lastActivityStr = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    const lastActivity = lastActivityStr ? parseInt(lastActivityStr, 10) : 0;
    if (!lastActivity || (issuedAt > 0 && lastActivity < issuedAt)) {
      localStorage.setItem(ACTIVITY_STORAGE_KEY, Date.now().toString());
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
      if (!currentActivityStr) {
        localStorage.setItem(ACTIVITY_STORAGE_KEY, Date.now().toString());
        return;
      }

      const currentActivity = parseInt(currentActivityStr, 10);
      if (issuedAt > 0 && currentActivity < issuedAt) {
        localStorage.setItem(ACTIVITY_STORAGE_KEY, Date.now().toString());
        return;
      }

      if (Date.now() - currentActivity > INACTIVITY_TIMEOUT_MS) {
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
