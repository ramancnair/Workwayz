'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'sidebar_open';

/**
 * Reads and persists the sidebar open/collapsed state in localStorage so it
 * survives page navigation and route transitions across both the portfolio
 * layout and the per-project layout.
 */
export function useSidebarPersistedState() {
  const [open, setOpenState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });

  const setOpen = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setOpenState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, String(next));
      }
      return next;
    });
  }, []);

  return { open, setOpen };
}
