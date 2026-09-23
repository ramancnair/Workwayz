import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig: any = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Server-side fallback to connections.json if process.env is not yet populated
if (!firebaseConfig.projectId && typeof window === 'undefined') {
  try {
    const fs = require('fs');
    const path = require('path');
    const dataP = path.join(process.cwd(), 'data', 'connections.json');
    const rootP = path.join(process.cwd(), 'connections.json');
    const connsPath = fs.existsSync(dataP) ? dataP : rootP;
    if (fs.existsSync(connsPath)) {
      const conns = JSON.parse(fs.readFileSync(connsPath, 'utf8'));
      const activeDb = conns.database?.find((p: any) => p.isActive) || conns.database?.[0];
      if (activeDb && activeDb.provider === 'firebase' && activeDb.projectId) {
        firebaseConfig.projectId = activeDb.projectId;
        firebaseConfig.apiKey = activeDb.apiKey || firebaseConfig.apiKey;
        firebaseConfig.authDomain = activeDb.authDomain || `${activeDb.projectId}.firebaseapp.com`;
        firebaseConfig.storageBucket = activeDb.storageBucket || `${activeDb.projectId}.firebasestorage.app`;
      }
    }
  } catch (e) {
    // Non-fatal
  }
}

let app;
if (firebaseConfig.projectId && getApps().length === 0) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (e) {
    console.error("Firebase initialization error", e);
  }
} else if (getApps().length > 0) {
  app = getApp();
}

const db = app ? getFirestore(app) : null;
const auth = (app && firebaseConfig.apiKey) ? getAuth(app) : null;

export { db, auth, firebaseConfig };
