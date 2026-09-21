import * as FB from 'firebase/firestore';
import * as SB from './supabase-firestore-adapter';
import { db as fbDb, auth as fbAuth } from './firebase';

import { supabase } from './supabase';

/**
 * Dynamically resolves whether Supabase or Firebase is the active database provider.
 * Works across both server-side SSR and client-side (using injected window.__PROJECTFLOW_CONFIG__).
 */
export function getIsSupa(): boolean {
  if (typeof window !== 'undefined') {
    const winCfg = (window as any).__PROJECTFLOW_CONFIG__;
    if (winCfg?.dbProvider) {
      return winCfg.dbProvider === 'supabase';
    }
    // If Supabase URL or anon key exists on window or client, default to Supabase
    if (winCfg?.supabaseUrl) return true;
  }

  // Server-side / process.env check
  if (process.env.NEXT_PUBLIC_DB_PROVIDER === 'supabase' || process.env.NEXT_PUBLIC_DATABASE_PROVIDER === 'supabase') {
    return true;
  }
  if (process.env.NEXT_PUBLIC_DB_PROVIDER === 'firebase' || process.env.NEXT_PUBLIC_DATABASE_PROVIDER === 'firebase') {
    return false;
  }

  // Check server-side filesystem if running in Node
  if (typeof window === 'undefined') {
    try {
      const req = eval('require');
      const fs = req('fs');
      const path = req('path');
      const connsPath = path.join(process.cwd(), 'connections.json');
      if (fs.existsSync(connsPath)) {
        const conns = JSON.parse(fs.readFileSync(connsPath, 'utf8'));
        const active = conns.database?.find((p: any) => p.isActive) || conns.database?.[0];
        if (active?.provider === 'supabase') return true;
        if (active?.provider === 'firebase') return false;
      }
    } catch {}
  }

  // If Firebase has no project ID configured, default to Supabase
  if (!fbDb) {
    return true;
  }

  return true; // Default to Supabase for modern ProjectFlow instances
}

// Kept for backwards-compatibility where static boolean was expected
export const isSupa = true;

// Global registry of active snapshot listeners to allow clean, instant detachment on logout
const activeListeners = new Set<() => void>();

export function unsubscribeAllListeners() {
  activeListeners.forEach((unsub) => {
    try {
      unsub();
    } catch {
      // safe ignore
    }
  });
  activeListeners.clear();
}

/**
 * Enhanced onSnapshot that:
 * 1. Automatically registers listeners into an active registry so they can be unsubscribed instantly on logout.
 * 2. Shields callers from "Missing or insufficient permissions" errors when the user logs out or session is torn down.
 * 3. Ensures an error callback is always provided to prevent Firebase from throwing unhandled rejections.
 */
const safeFbOnSnapshot = (ref: any, ...args: any[]) => {
  if (!ref) return () => {};

  let options: any = undefined;
  let onNext: any = undefined;
  let onError: any = undefined;
  let onCompletion: any = undefined;

  if (typeof args[0] === 'function') {
    onNext = args[0];
    onError = args[1];
    onCompletion = args[2];
  } else if (typeof args[0] === 'object' && args[0] !== null && typeof args[0].next === 'function') {
    const origObserver = args[0];
    const safeObserver = {
      ...origObserver,
      error: (err: any) => {
        const isPermissionDenied =
          err?.code === 'permission-denied' ||
          String(err?.message || '').toLowerCase().includes('permission') ||
          String(err?.message || '').toLowerCase().includes('insufficient');
        const isLoggingOut =
          typeof window !== 'undefined' &&
          ((window as any).__isLoggingOut || !fbAuth?.currentUser);

        if (isPermissionDenied && isLoggingOut) {
          return;
        }
        if (typeof origObserver.error === 'function') {
          origObserver.error(err);
        } else {
          console.warn('[onSnapshot] Firestore listener error:', err?.message || err);
        }
      },
    };
    const unsub = FB.onSnapshot(ref, safeObserver as any);
    const wrapped = () => {
      activeListeners.delete(wrapped);
      try {
        if (typeof unsub === 'function') unsub();
      } catch {}
    };
    activeListeners.add(wrapped);
    return wrapped;
  } else if (typeof args[0] === 'object' && typeof args[1] === 'object' && args[1] !== null && typeof args[1].next === 'function') {
    options = args[0];
    const origObserver = args[1];
    const safeObserver = {
      ...origObserver,
      error: (err: any) => {
        const isPermissionDenied =
          err?.code === 'permission-denied' ||
          String(err?.message || '').toLowerCase().includes('permission') ||
          String(err?.message || '').toLowerCase().includes('insufficient');
        const isLoggingOut =
          typeof window !== 'undefined' &&
          ((window as any).__isLoggingOut || !fbAuth?.currentUser);

        if (isPermissionDenied && isLoggingOut) {
          return;
        }
        if (typeof origObserver.error === 'function') {
          origObserver.error(err);
        } else {
          console.warn('[onSnapshot] Firestore listener error:', err?.message || err);
        }
      },
    };
    const unsub = FB.onSnapshot(ref, options, safeObserver as any);
    const wrapped = () => {
      activeListeners.delete(wrapped);
      try {
        if (typeof unsub === 'function') unsub();
      } catch {}
    };
    activeListeners.add(wrapped);
    return wrapped;
  } else if (typeof args[0] === 'object' && typeof args[1] === 'function') {
    options = args[0];
    onNext = args[1];
    onError = args[2];
    onCompletion = args[3];
  }

  const safeOnError = (err: any) => {
    const isPermissionDenied =
      err?.code === 'permission-denied' ||
      String(err?.message || '').toLowerCase().includes('permission') ||
      String(err?.message || '').toLowerCase().includes('insufficient');
    const isLoggingOut =
      typeof window !== 'undefined' &&
      ((window as any).__isLoggingOut || !fbAuth?.currentUser);

    if (isPermissionDenied && isLoggingOut) {
      // Expected teardown event during or after logout — suppress cleanly
      return;
    }
    if (typeof onError === 'function') {
      onError(err);
    } else {
      console.warn('[onSnapshot] Firestore listener error:', err?.message || err);
    }
  };

  const originalUnsub = options
    ? FB.onSnapshot(ref, options, onNext, safeOnError, onCompletion)
    : FB.onSnapshot(ref, onNext, safeOnError, onCompletion);

  const wrappedUnsub = () => {
    activeListeners.delete(wrappedUnsub);
    try {
      if (typeof originalUnsub === 'function') originalUnsub();
    } catch {}
  };

  activeListeners.add(wrappedUnsub);
  return wrappedUnsub;
};

const safeOnSnapshot = (ref: any, ...args: any[]) => {
  if (getIsSupa()) {
    const unsub = (SB.onSnapshot as any)(ref, ...args);
    const wrapped = () => {
      activeListeners.delete(wrapped);
      try {
        if (typeof unsub === 'function') unsub();
      } catch {}
    };
    activeListeners.add(wrapped);
    return wrapped;
  }
  return safeFbOnSnapshot(ref, ...args);
};

export const collection = ((...args: any[]) => ((getIsSupa() ? SB.collection : FB.collection) as any)(...args)) as any;
export const doc = ((...args: any[]) => ((getIsSupa() ? SB.doc : FB.doc) as any)(...args)) as any;
export const addDoc = ((...args: any[]) => ((getIsSupa() ? SB.addDoc : FB.addDoc) as any)(...args)) as any;
export const setDoc = ((...args: any[]) => ((getIsSupa() ? SB.setDoc : FB.setDoc) as any)(...args)) as any;
export const updateDoc = ((...args: any[]) => ((getIsSupa() ? SB.updateDoc : FB.updateDoc) as any)(...args)) as any;
export const deleteDoc = ((...args: any[]) => ((getIsSupa() ? SB.deleteDoc : FB.deleteDoc) as any)(...args)) as any;
export const getDoc = ((...args: any[]) => ((getIsSupa() ? SB.getDoc : FB.getDoc) as any)(...args)) as any;
export const query = ((...args: any[]) => ((getIsSupa() ? SB.query : FB.query) as any)(...args)) as any;
export const where = ((...args: any[]) => ((getIsSupa() ? SB.where : FB.where) as any)(...args)) as any;
export const getDocs = ((...args: any[]) => ((getIsSupa() ? SB.getDocs : FB.getDocs) as any)(...args)) as any;
export const writeBatch = ((...args: any[]) => ((getIsSupa() ? SB.writeBatch : FB.writeBatch) as any)(...args)) as any;
export const arrayUnion = ((...args: any[]) => ((getIsSupa() ? SB.arrayUnion : FB.arrayUnion) as any)(...args)) as any;
export const arrayRemove = ((...args: any[]) => ((getIsSupa() ? SB.arrayRemove : FB.arrayRemove) as any)(...args)) as any;
export const onSnapshot = safeOnSnapshot as any;
export const orderBy = ((...args: any[]) => ((getIsSupa() ? SB.orderBy : FB.orderBy) as any)(...args)) as any;
export const collectionGroup = ((...args: any[]) => ((getIsSupa() ? SB.collectionGroup : FB.collectionGroup) as any)(...args)) as any;

const dummyTimestampTarget = function() {};
export const Timestamp = new Proxy(dummyTimestampTarget as any, {
  get(_target, prop) {
    const TargetClass = getIsSupa() ? SB.Timestamp : FB.Timestamp;
    if (!TargetClass) return undefined;
    return (TargetClass as any)[prop];
  },
  construct(_target, args) {
    const TargetClass = getIsSupa() ? SB.Timestamp : FB.Timestamp;
    return new (TargetClass as any)(...args);
  }
}) as any;

export const db = new Proxy({} as any, {
  get(_target, prop: string | symbol) {
    if (prop === 'then') return undefined;
    const targetDb = getIsSupa() ? supabase : fbDb;
    if (!targetDb) return undefined;
    const value = (targetDb as any)[prop];
    return typeof value === 'function' ? value.bind(targetDb) : value;
  }
}) as any;

export type Firestore = any;

