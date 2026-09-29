import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

export const firebaseConfig: any = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Client-side cache check from localStorage
if (typeof window !== 'undefined' && !firebaseConfig.projectId) {
  try {
    const cachedConfig = localStorage.getItem('projectflow_firebase_config');
    if (cachedConfig) {
      const parsed = JSON.parse(cachedConfig);
      if (parsed.projectId) {
        Object.assign(firebaseConfig, parsed);
      }
    }
  } catch (e) {}
}

// Server-side fallback to connections.json if process.env is not yet populated
if (!firebaseConfig.projectId && typeof window === 'undefined') {
  try {
    const fs = require('fs');
    const path = require('path');
    const connsPath = path.join(process.cwd(), 'connections.json');
    if (fs.existsSync(connsPath)) {
      const conns = JSON.parse(fs.readFileSync(connsPath, 'utf8'));
      const activeDb = conns.database?.find((p: any) => p.isActive) || conns.database?.[0];
      if (activeDb && activeDb.provider === 'firebase' && activeDb.projectId) {
        firebaseConfig.projectId = activeDb.projectId;
        firebaseConfig.apiKey = activeDb.apiKey || firebaseConfig.apiKey;
        firebaseConfig.authDomain = activeDb.authDomain || `${activeDb.projectId}.firebaseapp.com`;
        firebaseConfig.storageBucket = activeDb.storageBucket || `${activeDb.projectId}.firebasestorage.app`;
        firebaseConfig.appId = activeDb.appId || firebaseConfig.appId;
      }
    }
  } catch (e) {
    // Non-fatal
  }
}

let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;

function initApp(): FirebaseApp | null {
  if (_app) return _app;
  if (getApps().length > 0) {
    _app = getApp();
    return _app;
  }
  if (firebaseConfig.projectId) {
    try {
      _app = initializeApp(firebaseConfig);
      return _app;
    } catch (e) {
      console.error("Firebase initialization error", e);
    }
  }
  return null;
}

// Asynchronously bootstrap Firebase from runtime-config if needed
let _fetchPromise: Promise<boolean> | null = null;
export async function initFirebaseClient(): Promise<boolean> {
  if (typeof window === 'undefined') return true;
  if (_app && _db) return true;

  if (_fetchPromise) return _fetchPromise;

  _fetchPromise = fetch('/api/runtime-config')
    .then(r => r.json())
    .then(data => {
      if (data.firebaseProjectId) {
        firebaseConfig.projectId = data.firebaseProjectId;
        firebaseConfig.apiKey = data.firebaseApiKey || firebaseConfig.apiKey;
        firebaseConfig.authDomain = data.firebaseAuthDomain || `${data.firebaseProjectId}.firebaseapp.com`;
        firebaseConfig.appId = data.firebaseAppId || firebaseConfig.appId;
        firebaseConfig.storageBucket = `${data.firebaseProjectId}.firebasestorage.app`;

        try {
          localStorage.setItem('projectflow_firebase_config', JSON.stringify({
            projectId: firebaseConfig.projectId,
            apiKey: firebaseConfig.apiKey,
            authDomain: firebaseConfig.authDomain,
            appId: firebaseConfig.appId,
          }));
        } catch (e) {}

        const appInstance = initApp();
        if (appInstance) {
          _db = getFirestore(appInstance);
          if (firebaseConfig.apiKey) {
            _auth = getAuth(appInstance);
          }
          return true;
        }
      }
      return false;
    })
    .catch(() => false);

  return _fetchPromise;
}

// Initial initialization attempt
initApp();

const dbProxy = new Proxy({} as any, {
  get(_target, prop: string) {
    if (!_db) {
      const a = initApp();
      if (a) _db = getFirestore(a);
    }
    if (!_db) return undefined;
    const value = (_db as any)[prop];
    return typeof value === 'function' ? value.bind(_db) : value;
  }
}) as Firestore;

const authProxy = new Proxy({} as any, {
  get(_target, prop: string) {
    if (!_auth) {
      const a = initApp();
      if (a && firebaseConfig.apiKey) _auth = getAuth(a);
    }
    if (!_auth) return undefined;
    const value = (_auth as any)[prop];
    return typeof value === 'function' ? value.bind(_auth) : value;
  }
}) as Auth;

export { dbProxy as db, authProxy as auth };
