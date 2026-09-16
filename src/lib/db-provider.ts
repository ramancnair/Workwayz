import * as FB from 'firebase/firestore';
import * as SB from './supabase-firestore-adapter';
import { db as fbDb, auth as fbAuth } from './firebase';

const isSupa = process.env.NEXT_PUBLIC_DB_PROVIDER === 'supabase';

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
  if (isSupa) {
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

export const collection = (isSupa ? SB.collection : FB.collection) as any;
export const doc = (isSupa ? SB.doc : FB.doc) as any;
export const addDoc = (isSupa ? SB.addDoc : FB.addDoc) as any;
export const setDoc = (isSupa ? SB.setDoc : FB.setDoc) as any;
export const updateDoc = (isSupa ? SB.updateDoc : FB.updateDoc) as any;
export const deleteDoc = (isSupa ? SB.deleteDoc : FB.deleteDoc) as any;
export const getDoc = (isSupa ? SB.getDoc : FB.getDoc) as any;
export const query = (isSupa ? SB.query : FB.query) as any;
export const where = (isSupa ? SB.where : FB.where) as any;
export const getDocs = (isSupa ? SB.getDocs : FB.getDocs) as any;
export const writeBatch = (isSupa ? SB.writeBatch : FB.writeBatch) as any;
export const arrayUnion = (isSupa ? SB.arrayUnion : FB.arrayUnion) as any;
export const arrayRemove = (isSupa ? SB.arrayRemove : FB.arrayRemove) as any;
export const onSnapshot = safeOnSnapshot as any;
export const Timestamp = (isSupa ? SB.Timestamp : FB.Timestamp) as any;
export const orderBy = (isSupa ? SB.orderBy : FB.orderBy) as any;
export const collectionGroup = (isSupa ? SB.collectionGroup : FB.collectionGroup) as any;

import { supabase } from './supabase';
export const db = (isSupa ? supabase : fbDb) as any;
export type Firestore = any;

