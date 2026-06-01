import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function run() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const colRef = collection(db, 'accessControl');
  const snapshot = await getDocs(colRef);

  const data: Record<string, any> = {};
  snapshot.forEach(doc => {
    data[doc.id] = doc.data().pageAccess;
  });

  console.log('--- CURRENT SETTINGS START ---');
  console.log(JSON.stringify(data, null, 2));
  console.log('--- CURRENT SETTINGS END ---');
}

run().catch(console.error);
