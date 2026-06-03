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
  //    NEXT_PUBLIC_AUTH_PROVIDER is baked into the client bundle at build time.
  //    When the provider changes, the server restarts and re-bakes the bundle, so
  //    any session written under the old provider will fail this check.
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

  return true;
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const isPublicPath =
      pathname === '/login' || pathname === '/signup' || pathname === '/' || pathname === '/setup-wizard';

    const valid = validateSession();

    if (!valid) {
      setIsAuthenticated(false);
      if (!isPublicPath) {
        router.push('/login');
      }
    } else {
      setIsAuthenticated(true);
    }
  }, [router, pathname]);

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

  return <>{children}</>;
}
