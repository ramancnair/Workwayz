'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Validates the session stored in localStorage against:
 * 1. Structural integrity — must be valid JSON with required fields
 * 2. Provider binding  — session must have been issued by the current active auth provider
 * 3. Expiry            — sessions older than SESSION_TTL_MS are rejected
 *
 * Returns true only if the session passes ALL checks.
 * Side effect: removes the key from localStorage if invalid.
 */
function validateSession(): boolean {
  const userStr = localStorage.getItem('projectflow_user');
  if (!userStr) return false;

  let session: Record<string, any>;
  try {
    session = JSON.parse(userStr);
  } catch {
    localStorage.removeItem('projectflow_user');
    return false;
  }

  // 1. Structural check — must have at minimum an email and uid
  if (!session.email || !session.uid) {
    console.warn('[AuthGuard] Session rejected: missing required fields (email, uid).');
    localStorage.removeItem('projectflow_user');
    return false;
  }

  // 2. Expiry check — sessions without issuedAt are legacy/pre-fix; treat as expired
  const issuedAt: number | undefined = session.issuedAt;
  if (!issuedAt || Date.now() - issuedAt > SESSION_TTL_MS) {
    console.warn('[AuthGuard] Session rejected: expired or missing issuedAt timestamp.');
    localStorage.removeItem('projectflow_user');
    return false;
  }

  // 3. Auth provider binding — the session must have been issued for the current provider.
  const activeProvider = process.env.NEXT_PUBLIC_AUTH_PROVIDER || 'firebase';
  const sessionProvider: string | undefined = session.authProvider;

  if (!sessionProvider || sessionProvider !== activeProvider) {
    console.warn(
      `[AuthGuard] Session rejected: provider mismatch. ` +
      `Session was issued for "${sessionProvider}" but active provider is "${activeProvider}".`
    );
    localStorage.removeItem('projectflow_user');
    return false;
  }

  // 4. Remember me check — if rememberMe is false, we require projectflow_session_active in sessionStorage
  const rememberMe = session.rememberMe !== false;
  if (!rememberMe && typeof window !== 'undefined' && !sessionStorage.getItem('projectflow_session_active')) {
    console.warn('[AuthGuard] Session rejected: rememberMe is false and browser session has ended.');
    localStorage.removeItem('projectflow_user');
    return false;
  }

  return true;
}

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

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { changeUserPassword } = await import('@/lib/auth-utils');
      const res = await changeUserPassword(newPassword, user.authProvider);
      
      if (res.success) {
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
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="confirm-password">Confirm Password</label>
            <input
              id="confirm-password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [needsReset, setNeedsReset] = useState(false);
  const [sessionUser, setSessionUser] = useState<any>(null);

  useEffect(() => {
    const isPublicPath =
      pathname === '/login' || pathname === '/signup' || pathname === '/' || pathname === '/setup-wizard';

    const valid = validateSession();

    if (!valid) {
      setIsAuthenticated(false);
      setNeedsReset(false);
      if (!isPublicPath) {
        router.push('/login');
      }
    } else {
      setIsAuthenticated(true);
      
      // Check if session user needs password reset
      const userStr = localStorage.getItem('projectflow_user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          setSessionUser(user);
          if (user.needsPasswordReset && !isPublicPath) {
            setNeedsReset(true);
          } else {
            setNeedsReset(false);
          }
        } catch {
          setNeedsReset(false);
        }
      }
    }
  }, [router, pathname, isAuthenticated]);

  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const isPublicPath = pathname === '/login' || pathname === '/signup' || pathname === '/' || pathname === '/setup-wizard';
  if (!isAuthenticated && !isPublicPath) {
    return null;
  }

  if (needsReset && !isPublicPath) {
    return <ResetPasswordScreen user={sessionUser} onComplete={() => setNeedsReset(false)} />;
  }

  return <>{children}</>;
}
