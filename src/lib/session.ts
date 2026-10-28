/**
 * Shared session validation and management utilities for Workwayz.
 * Ensures consistent session validation between Login, AuthGuard, and SessionManager.
 */

export const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours
export const USER_STORAGE_KEY = 'projectflow_user';
export const ACTIVITY_STORAGE_KEY = 'projectflow_last_activity';
export const SESSION_COOKIE_NAME = 'workwayz_session_active';
/** Pre-rename cookie name; only cleaned up on logout so no stale cookie lingers. */
const LEGACY_SESSION_COOKIE_NAME = 'projectflow_session_active';

export interface UserSession {
  name: string;
  email: string;
  accessLevel: string;
  empId?: string;
  uid?: string;
  avatar?: string;
  authProvider?: string;
  issuedAt?: number;
  rememberMe?: boolean;
  needsPasswordReset?: boolean;
  [key: string]: any;
}

export interface SessionValidationResult {
  isValid: boolean;
  session: UserSession | null;
  reason?: string;
}

/**
 * Only an explicit `rememberMe: true` makes a session survive a browser restart.
 * Missing/false means the session is bound to the current browser session.
 */
export function isRememberedSession(session: Pick<UserSession, 'rememberMe'> | null | undefined): boolean {
  return session?.rememberMe === true;
}

/**
 * Marks the current browser session as active. This is a session cookie (no expiry), so the
 * browser discards it when it is closed. Required for sessions where rememberMe is not set.
 */
export function markBrowserSessionActive(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${SESSION_COOKIE_NAME}=true; path=/; SameSite=Lax`;
}

function hasBrowserSessionMarker(): boolean {
  if (typeof document === 'undefined') return false;
  return (document.cookie || '')
    .split(';')
    .some((part) => part.trim() === `${SESSION_COOKIE_NAME}=true`);
}

/**
 * Validates the current session stored in localStorage.
 *
 * Checks:
 * 1. Structural integrity: Valid JSON with email and identifier (uid or empId).
 * 2. Absolute TTL expiry: Reject sessions older than SESSION_TTL_MS (24h).
 * 3. Browser session: Unless rememberMe is true, the session is only valid while the browser
 *    session cookie exists (i.e. it is rejected after the browser has been closed).
 * 4. Inactivity timeout: When rememberMe is not true, reject sessions where last activity
 *    exceeds INACTIVITY_TIMEOUT_MS (2h), with protections for fresh logins.
 *
 * @param cleanIfInvalid If true, purges localStorage when the session is determined to be invalid/expired.
 */
export function validateSession(cleanIfInvalid: boolean = true): SessionValidationResult {
  if (typeof window === 'undefined') {
    return { isValid: false, session: null, reason: 'SSR' };
  }

  const userStr = localStorage.getItem(USER_STORAGE_KEY);
  if (!userStr) {
    return { isValid: false, session: null, reason: 'No session' };
  }

  let session: UserSession;
  try {
    session = JSON.parse(userStr);
  } catch {
    if (cleanIfInvalid) {
      clearSession();
    }
    return { isValid: false, session: null, reason: 'Invalid JSON' };
  }

  // 1. Structural check: Must have email and at least one identifier
  const hasId = Boolean((session.uid && session.uid.trim()) || (session.empId && session.empId.trim()));
  if (!session.email || !session.email.trim() || !hasId) {
    if (cleanIfInvalid) {
      console.warn('[validateSession] Session rejected: missing required fields (email, uid/empId).');
      clearSession();
    }
    return { isValid: false, session: null, reason: 'Missing required credentials' };
  }

  const now = Date.now();
  const issuedAt = session.issuedAt || 0;

  // 2. Absolute TTL expiry check (24 hours)
  if (issuedAt > 0 && now - issuedAt > SESSION_TTL_MS) {
    if (cleanIfInvalid) {
      console.warn('[validateSession] Session rejected: expired timestamp (TTL).');
      clearSession();
    }
    return { isValid: false, session: null, reason: 'Session expired (TTL)' };
  }

  // 3 & 4. Non-remembered sessions: browser-session marker + inactivity timeout
  if (!isRememberedSession(session)) {
    // 3. The session cookie is discarded when the browser closes, ending the login.
    if (!hasBrowserSessionMarker()) {
      if (cleanIfInvalid) {
        console.warn('[validateSession] Session rejected: browser session ended and remember me not set.');
        clearSession();
      }
      return { isValid: false, session: null, reason: 'Browser session ended' };
    }

    // 4. Inactivity timeout
    const lastActivityStr = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    const lastActivity = lastActivityStr ? parseInt(lastActivityStr, 10) : 0;

    // Safety: If login was issued within the last 60 seconds, it cannot be timed out
    const isFreshLogin = issuedAt > 0 && now - issuedAt < 60_000;

    if (!isFreshLogin && lastActivity > 0 && now - lastActivity > INACTIVITY_TIMEOUT_MS) {
      // If the session was issued less than 2 hours ago, the old lastActivity was from a prior session!
      if (issuedAt > 0 && now - issuedAt < INACTIVITY_TIMEOUT_MS) {
        localStorage.setItem(ACTIVITY_STORAGE_KEY, now.toString());
      } else {
        if (cleanIfInvalid) {
          console.warn('[validateSession] Session rejected: timed out due to inactivity.');
          clearSession();
        }
        return { isValid: false, session: null, reason: 'Inactivity timeout' };
      }
    }
  }

  return { isValid: true, session };
}

/**
 * Completely clears local storage keys and session cookies.
 */
export function clearSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(ACTIVITY_STORAGE_KEY);
    sessionStorage.removeItem('workwayz_real_route');
    document.cookie = `${SESSION_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    document.cookie = `${LEGACY_SESSION_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  } catch {}
}
