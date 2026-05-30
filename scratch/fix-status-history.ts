import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const PROJECT_ID = 'P2600013';

async function run() {
  const email = 'temp-admin-script@example.com';
  const password = 'TemporaryPassword123!';

  try {
    // Authenticate
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
      if (e.code === 'auth/email-already-in-use') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        throw e;
      }
    }
    console.log('Authenticated.');

    // Fetch all stories
    const storiesCol = collection(db, 'projects', PROJECT_ID, 'stories');
    const snapshot = await getDocs(storiesCol);
    console.log(`Found ${snapshot.size} items in stories collection.`);

    const now = new Date().toISOString();
    const batch = writeBatch(db);
    let count = 0;

    snapshot.forEach((document) => {
      const docRef = doc(db, 'projects', PROJECT_ID, 'stories', document.id);

      // Replace statusHistory entirely with a single clean "To Do" entry
      batch.update(docRef, {
        statusHistory: [{ fromStatus: null, toStatus: 'To Do', date: now }],
        // Clear stale date fields that no longer apply
        developmentStartDate: null,
        completionDate: null,
        closedAt: null,
      });
      count++;
    });

    console.log(`Resetting statusHistory for ${count} items...`);
    await batch.commit();
    console.log('Done! All statusHistory arrays have been replaced with a single clean "To Do" entry.');

    // Verification pass
    const verifySnapshot = await getDocs(storiesCol);
    let allClean = true;
    verifySnapshot.forEach((document) => {
      const data = document.data();
      if (!Array.isArray(data.statusHistory) || data.statusHistory.length !== 1) {
        console.error(`FAIL: ${document.id} has ${data.statusHistory?.length ?? 0} history entries`);
        allClean = false;
      }
      if (data.statusHistory?.[0]?.toStatus !== 'To Do') {
        console.error(`FAIL: ${document.id} history entry is not "To Do"`);
        allClean = false;
      }
      if (data.status !== 'To Do') {
        console.error(`FAIL: ${document.id} status is "${data.status}" not "To Do"`);
        allClean = false;
      }
    });

    if (allClean) {
      console.log('VERIFICATION PASSED: All items have clean statusHistory and status === "To Do".');
    } else {
      console.log('VERIFICATION FAILED: Some items have issues (see above).');
    }

  } catch (error) {
    console.error('Script failed:', error);
  }
}

run();
