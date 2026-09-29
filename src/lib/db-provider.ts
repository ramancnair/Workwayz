import * as FB from 'firebase/firestore';
import * as SB from './supabase-firestore-adapter';
import { db as fbDb, auth as fbAuth } from './firebase';
import { supabase } from './supabase';

export function isSupabaseActive(): boolean {
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('projectflow_db_provider');
    if (cached) return cached === 'supabase' || cached === 'postgres';
  }
  const envVal = process.env.NEXT_PUBLIC_DB_PROVIDER || process.env.NEXT_PUBLIC_DATABASE_PROVIDER;
  return envVal === 'supabase' || envVal === 'postgres';
}

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
  if (isSupabaseActive()) {
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

export const collection = ((...args: any[]) => isSupabaseActive() ? (SB.collection as any)(...args) : (FB.collection as any)(...args)) as typeof FB.collection;
export const doc = ((...args: any[]) => isSupabaseActive() ? (SB.doc as any)(...args) : (FB.doc as any)(...args)) as typeof FB.doc;
export const addDoc = ((...args: any[]) => isSupabaseActive() ? (SB.addDoc as any)(...args) : (FB.addDoc as any)(...args)) as typeof FB.addDoc;
export const setDoc = ((...args: any[]) => isSupabaseActive() ? (SB.setDoc as any)(...args) : (FB.setDoc as any)(...args)) as typeof FB.setDoc;
export const updateDoc = ((...args: any[]) => isSupabaseActive() ? (SB.updateDoc as any)(...args) : (FB.updateDoc as any)(...args)) as typeof FB.updateDoc;
export const deleteDoc = ((...args: any[]) => isSupabaseActive() ? (SB.deleteDoc as any)(...args) : (FB.deleteDoc as any)(...args)) as typeof FB.deleteDoc;
export const getDoc = ((...args: any[]) => isSupabaseActive() ? (SB.getDoc as any)(...args) : (FB.getDoc as any)(...args)) as typeof FB.getDoc;
export const query = ((...args: any[]) => isSupabaseActive() ? (SB.query as any)(...args) : (FB.query as any)(...args)) as typeof FB.query;
export const where = ((...args: any[]) => isSupabaseActive() ? (SB.where as any)(...args) : (FB.where as any)(...args)) as typeof FB.where;
export const getDocs = ((...args: any[]) => isSupabaseActive() ? (SB.getDocs as any)(...args) : (FB.getDocs as any)(...args)) as typeof FB.getDocs;
export const writeBatch = ((...args: any[]) => isSupabaseActive() ? (SB.writeBatch as any)(...args) : (FB.writeBatch as any)(...args)) as typeof FB.writeBatch;
export const arrayUnion = ((...args: any[]) => isSupabaseActive() ? (SB.arrayUnion as any)(...args) : (FB.arrayUnion as any)(...args)) as typeof FB.arrayUnion;
export const arrayRemove = ((...args: any[]) => isSupabaseActive() ? (SB.arrayRemove as any)(...args) : (FB.arrayRemove as any)(...args)) as typeof FB.arrayRemove;
export const onSnapshot = safeOnSnapshot as any;
export const orderBy = ((...args: any[]) => isSupabaseActive() ? (SB.orderBy as any)(...args) : (FB.orderBy as any)(...args)) as typeof FB.orderBy;
export const collectionGroup = ((...args: any[]) => isSupabaseActive() ? (SB.collectionGroup as any)(...args) : (FB.collectionGroup as any)(...args)) as typeof FB.collectionGroup;

export const Timestamp = FB.Timestamp;

export const db = new Proxy({} as any, {
  get(_target, prop: string) {
    const activeDb = isSupabaseActive() ? supabase : fbDb;
    if (!activeDb) return undefined;
    const value = (activeDb as any)[prop];
    return typeof value === 'function' ? value.bind(activeDb) : value;
  }
}) as any;

export type Firestore = any;
