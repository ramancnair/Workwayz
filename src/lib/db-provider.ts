import * as FB from 'firebase/firestore';
import * as SB from './supabase-firestore-adapter';
import { db as fbDb, auth as fbAuth } from './firebase';
import { supabase } from './supabase';

let _runtimeDbProvider: string | null = null;

export function setRuntimeDbProvider(provider: string | null) {
  _runtimeDbProvider = provider;
  if (typeof window !== 'undefined' && provider) {
    try {
      localStorage.setItem('projectflow_db_provider', provider);
    } catch {}
  }
}

export function isSupabaseActive(): boolean {
  if (_runtimeDbProvider) {
    return _runtimeDbProvider === 'supabase' || _runtimeDbProvider === 'postgres';
  }
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('projectflow_db_provider');
    if (cached) return cached === 'supabase' || cached === 'postgres';
  }
  const envVal = process.env.NEXT_PUBLIC_DB_PROVIDER || process.env.NEXT_PUBLIC_DATABASE_PROVIDER;
  if (envVal) return envVal === 'supabase' || envVal === 'postgres';

  if (typeof window === 'undefined') {
    try {
      const fs = require('fs');
      const { getProfilesPath } = require('./config-paths');
      const connsPath = getProfilesPath();
      if (fs.existsSync(connsPath)) {
        const conns = JSON.parse(fs.readFileSync(connsPath, 'utf8'));
        const activeDb = conns.database?.find((p: any) => p.isActive) || conns.database?.[0];
        if (activeDb?.provider) {
          return activeDb.provider === 'supabase' || activeDb.provider === 'postgres';
        }
      }
    } catch {}
  }
  return false;
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

export function getActiveDb(): any {
  if (isSupabaseActive()) return supabase;
  return fbDb;
}

export function unwrapDb(val: any): any {
  if (!val || typeof val !== 'object') return val;
  if ('_delegate' in val) {
    return val._delegate || null;
  }
  return val;
}

export const collection = ((...args: any[]) => {
  if (isSupabaseActive()) return (SB.collection as any)(...args);
  const unwrapped = args.map((a, i) => (i === 0 ? unwrapDb(a) : a));
  if (!unwrapped[0]) {
    console.warn('[db-provider] collection() called before database initialization.');
    return null;
  }
  return (FB.collection as any)(...unwrapped);
}) as typeof FB.collection;

export const doc = ((...args: any[]) => {
  if (isSupabaseActive()) return (SB.doc as any)(...args);
  const unwrapped = args.map((a, i) => (i === 0 ? unwrapDb(a) : a));
  if (!unwrapped[0]) {
    console.warn('[db-provider] doc() called before database initialization.');
    return null;
  }
  return (FB.doc as any)(...unwrapped);
}) as typeof FB.doc;

export const addDoc = ((ref: any, ...rest: any[]) => {
  if (isSupabaseActive()) return (SB.addDoc as any)(ref, ...rest);
  if (!ref) return Promise.reject(new Error("Cannot addDoc to an uninitialized collection"));
  return (FB.addDoc as any)(ref, ...rest);
}) as typeof FB.addDoc;

export const setDoc = ((ref: any, ...rest: any[]) => {
  if (isSupabaseActive()) return (SB.setDoc as any)(ref, ...rest);
  if (!ref) return Promise.reject(new Error("Cannot setDoc on an uninitialized document"));
  return (FB.setDoc as any)(ref, ...rest);
}) as typeof FB.setDoc;

export const updateDoc = ((ref: any, ...rest: any[]) => {
  if (isSupabaseActive()) return (SB.updateDoc as any)(ref, ...rest);
  if (!ref) return Promise.reject(new Error("Cannot updateDoc on an uninitialized document"));
  return (FB.updateDoc as any)(ref, ...rest);
}) as typeof FB.updateDoc;

export const deleteDoc = ((ref: any, ...rest: any[]) => {
  if (isSupabaseActive()) return (SB.deleteDoc as any)(ref, ...rest);
  if (!ref) return Promise.reject(new Error("Cannot deleteDoc on an uninitialized document"));
  return (FB.deleteDoc as any)(ref, ...rest);
}) as typeof FB.deleteDoc;

export const getDoc = ((ref: any, ...rest: any[]) => {
  if (isSupabaseActive()) return (SB.getDoc as any)(ref, ...rest);
  if (!ref) {
    return Promise.resolve({
      exists: () => false,
      data: () => undefined,
      id: '',
    } as any);
  }
  return (FB.getDoc as any)(ref, ...rest);
}) as typeof FB.getDoc;

export const query = ((ref: any, ...rest: any[]) => {
  if (isSupabaseActive()) return (SB.query as any)(ref, ...rest);
  if (!ref) return null;
  return (FB.query as any)(ref, ...rest);
}) as typeof FB.query;

export const where = ((...args: any[]) => isSupabaseActive() ? (SB.where as any)(...args) : (FB.where as any)(...args)) as typeof FB.where;

export const getDocs = ((ref: any, ...rest: any[]) => {
  if (isSupabaseActive()) return (SB.getDocs as any)(ref, ...rest);
  if (!ref) {
    return Promise.resolve({
      empty: true,
      docs: [],
      size: 0,
      forEach: () => {},
    } as any);
  }
  return (FB.getDocs as any)(ref, ...rest);
}) as typeof FB.getDocs;

export const writeBatch = ((...args: any[]) => {
  if (isSupabaseActive()) return (SB.writeBatch as any)(...args);
  const unwrapped = args.map((a, i) => (i === 0 ? unwrapDb(a) : a));
  if (!unwrapped[0]) {
    return {
      set: () => {},
      update: () => {},
      delete: () => {},
      commit: async () => {},
    } as any;
  }
  return (FB.writeBatch as any)(...unwrapped);
}) as typeof FB.writeBatch;

export const arrayUnion = ((...args: any[]) => isSupabaseActive() ? (SB.arrayUnion as any)(...args) : (FB.arrayUnion as any)(...args)) as typeof FB.arrayUnion;
export const arrayRemove = ((...args: any[]) => isSupabaseActive() ? (SB.arrayRemove as any)(...args) : (FB.arrayRemove as any)(...args)) as typeof FB.arrayRemove;
export const onSnapshot = safeOnSnapshot as any;
export const orderBy = ((...args: any[]) => isSupabaseActive() ? (SB.orderBy as any)(...args) : (FB.orderBy as any)(...args)) as typeof FB.orderBy;

export const collectionGroup = ((...args: any[]) => {
  if (isSupabaseActive()) return (SB.collectionGroup as any)(...args);
  const unwrapped = args.map((a, i) => (i === 0 ? unwrapDb(a) : a));
  if (!unwrapped[0]) return null;
  return (FB.collectionGroup as any)(...unwrapped);
}) as typeof FB.collectionGroup;

export const runTransaction = ((firestore: any, ...rest: any[]) => {
  if (isSupabaseActive()) return (SB as any).runTransaction ? (SB as any).runTransaction(firestore, ...rest) : Promise.resolve();
  const unwrapped = unwrapDb(firestore);
  if (!unwrapped) return Promise.reject(new Error("Cannot runTransaction on uninitialized firestore"));
  return (FB.runTransaction as any)(unwrapped, ...rest);
}) as typeof FB.runTransaction;

export const Timestamp = FB.Timestamp;

export const db = new Proxy({} as any, {
  has(_target, prop: string | symbol) {
    if (prop === '_delegate') return true;
    const activeDb = getActiveDb();
    return activeDb ? (prop in activeDb) : false;
  },
  get(_target, prop: string | symbol) {
    const activeDb = getActiveDb();
    if (prop === '_delegate') {
      return unwrapDb(activeDb);
    }
    if (!activeDb) return undefined;
    const value = (activeDb as any)[prop];
    return typeof value === 'function' ? value.bind(activeDb) : value;
  }
}) as any;

export type Firestore = any;
