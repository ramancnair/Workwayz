'use client';

import { useState, useEffect } from 'react';
import { db, doc, onSnapshot } from '@/lib/db-provider';
import { hasPagePermission } from '@/lib/permissions';

export function usePermissions() {
  const [userRole, setUserRole] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('projectflow_user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          return user.accessLevel || 'Team Member';
        } catch {
          return 'Team Member';
        }
      }
      return 'Team Member';
    }
    return null;
  });
  const [customPageAccess, setCustomPageAccess] = useState<Record<string, boolean> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userRole === null) {
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('projectflow_user') : null;
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          setUserRole(user.accessLevel || 'Team Member');
        } catch {
          setUserRole('Team Member');
        }
      } else {
        setUserRole('Team Member');
      }
    }
  }, [userRole]);

  useEffect(() => {
    if (!userRole || userRole === 'Administrator' || userRole === 'Super Admin' || !db) {
      setIsLoading(false);
      return;
    }

    const docRef = doc(db, 'accessControl', userRole);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot: any) => {
        if (snapshot.exists()) {
          setCustomPageAccess(snapshot.data()?.pageAccess || {});
        } else {
          setCustomPageAccess({});
        }
        setIsLoading(false);
      },
      (err: any) => {
        console.warn('[usePermissions] Error loading accessControl:', err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userRole]);

  const hasAccess = (pageName: string): boolean => {
    if (!userRole) return true;
    return hasPagePermission(userRole, pageName, customPageAccess);
  };

  return { userRole, customPageAccess, hasAccess, isLoading };
}
