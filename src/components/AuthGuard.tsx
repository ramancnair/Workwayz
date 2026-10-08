'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { db, doc, onSnapshot } from '@/lib/db-provider';
import { ShieldAlert } from 'lucide-react';
import { getPageNameForRoute, hasPagePermission, getPermittedFallbackRoute } from '@/lib/permissions';
import { validateSession } from '@/lib/session';

function ResetPasswordScreen({ user, onComplete }: { user: any; onComplete: () => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isFirebaseLoaded, setIsFirebaseLoaded] = useState(false);

  // If Firebase is the provider, we listen to auth state to make sure currentUser is loaded
  useEffect(() => {
    if (user?.authProvider === 'firebase') {
      const { auth } = require('@/lib/firebase');
      const { onAuthStateChanged } = require('firebase/auth');
      if (auth) {
        const unsubscribe = onAuthStateChanged(auth, (fbUser: any) => {
          if (fbUser) {
            setIsFirebaseLoaded(true);
          }
        });
        return () => unsubscribe();
      }
    } else {
      setIsFirebaseLoaded(true);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword === 'P@ssw0rd' || newPassword.toLowerCase() === 'p@ssw0rd') {
      setError('New password cannot be the same as the default password (P@ssw0rd). Please enter a new password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { changeUserPassword } = await import('@/lib/auth-utils');
      const res = await changeUserPassword(newPassword, user.authProvider);
      
      if (res.success) {
        // Clear needsPasswordReset in database
        try {
          const { db, doc, updateDoc } = await import('@/lib/db-provider');
          const targetId = user?.empId || user?.id;
          if (db && targetId) {
            await updateDoc(doc(db, 'employees', targetId), { needsPasswordReset: false });
          }
        } catch (_) {}

        // Success! Update local storage
        const userStr = localStorage.getItem('projectflow_user');
        if (userStr) {
          const parsed = JSON.parse(userStr);
          parsed.needsPasswordReset = false;
          localStorage.setItem('projectflow_user', JSON.stringify(parsed));
        }
        onComplete();
      } else {
        setError(res.error || 'Failed to update password.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card text-card-foreground shadow-lg rounded-lg border border-border p-6 space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Reset Your Password</h2>
          <p className="text-sm text-muted-foreground">
            For security, you must reset your default password before you can use the system.
          </p>
        </div>
        
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-md font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="new-password">New Password</label>
            <input
              id="new-password"
              type="password"
              placeholder=""
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="confirm-password">Confirm Password</label>
            <input
              id="confirm-password"
              type="password"
              placeholder=""
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || (user?.authProvider === 'firebase' && !isFirebaseLoaded)}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4 w-full"
          >
            {isSubmitting ? 'Updating...' : (user?.authProvider === 'firebase' && !isFirebaseLoaded) ? 'Connecting session...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

function AccessDeniedScreen({ pageName, onGoHome }: { pageName: string; onGoHome: () => void }) {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card text-card-foreground shadow-xl rounded-xl border border-border p-6 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Access Denied</h2>
          <p className="text-sm text-muted-foreground">
            You do not have permission to view the <span className="font-semibold text-foreground">{pageName}</span> page.
          </p>
          <p className="text-xs text-muted-foreground/80">
            If you believe this is an error, please contact your system administrator to update your role permissions.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={onGoHome}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 py-2 w-full cursor-pointer"
          >
            Go to My Projects
          </button>
        </div>
      </div>
    </div>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [needsReset, setNeedsReset] = useState(false);
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [customPageAccess, setCustomPageAccess] = useState<Record<string, boolean> | null>(null);
  const [accessChecked, setAccessChecked] = useState(false);

  useEffect(() => {
    const isPublicPath =
      pathname === '/login' || pathname === '/signup' || pathname === '/' || pathname === '/setup-wizard';

    const { isValid, session } = validateSession(true);

    if (!isValid || !session) {
      setIsAuthenticated(false);
      setNeedsReset(false);
      setSessionUser(null);
      if (!isPublicPath) {
        router.push('/login');
      }
    } else {
      setSessionUser(session);
      if (session.needsPasswordReset) {
        setNeedsReset(true);
      } else {
        setNeedsReset(false);
      }

      setIsAuthenticated(true);
    }
  }, [pathname, router]);

  useEffect(() => {
    if (!sessionUser?.accessLevel || sessionUser.accessLevel === 'Administrator' || sessionUser.accessLevel === 'Super Admin' || !db) {
      setAccessChecked(true);
      return;
    }

    setAccessChecked(false);
    let resolved = false;

    // Safety timeout: if Firestore takes more than 500ms (e.g. offline/mock/test mode), fallback immediately to defaults
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        setAccessChecked(true);
      }
    }, 500);

    const docRef = doc(db, 'accessControl', sessionUser.accessLevel);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot: any) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          if (snapshot.exists()) {
            setCustomPageAccess(snapshot.data()?.pageAccess || {});
          } else {
            setCustomPageAccess({});
          }
          setAccessChecked(true);
        }
      },
      (err: any) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          console.warn('[AuthGuard] Error listening to accessControl:', err);
          setAccessChecked(true);
        }
      }
    );

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [sessionUser?.accessLevel]);

  const isPublicPath = pathname === '/login' || pathname === '/signup' || pathname === '/' || pathname === '/setup-wizard';
  const requiredPageName = getPageNameForRoute(pathname);
  const isPermissionAllowed = !requiredPageName || hasPagePermission(sessionUser?.accessLevel, requiredPageName, customPageAccess);

  useEffect(() => {
    if (isAuthenticated && !isPublicPath && accessChecked && !isPermissionAllowed) {
      const fallback = getPermittedFallbackRoute(pathname, sessionUser?.accessLevel, customPageAccess);
      if (fallback && fallback !== pathname) {
        router.replace(fallback);
      }
    }
  }, [isAuthenticated, isPublicPath, accessChecked, isPermissionAllowed, pathname, sessionUser?.accessLevel, customPageAccess, router]);

  if (isAuthenticated === null || (isAuthenticated && !isPublicPath && !accessChecked && sessionUser?.accessLevel !== 'Administrator' && sessionUser?.accessLevel !== 'Super Admin')) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated && !isPublicPath) {
    return null;
  }

  if (needsReset && !isPublicPath) {
    return <ResetPasswordScreen user={sessionUser} onComplete={() => setNeedsReset(false)} />;
  }

  if (isAuthenticated && !isPublicPath && accessChecked && !isPermissionAllowed) {
    const fallback = getPermittedFallbackRoute(pathname, sessionUser?.accessLevel, customPageAccess);
    if (fallback && fallback !== pathname) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      );
    }
    return <AccessDeniedScreen pageName={requiredPageName || 'Requested'} onGoHome={() => router.push('/my-projects')} />;
  }

  return <>{children}</>;
}
