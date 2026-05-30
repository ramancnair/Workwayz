import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
  const email = 'temp-admin-script@example.com';
  const password = 'TemporaryPassword123!';

  try {
    console.log(`Attempting to sign in/up as ${email}...`);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      console.log('Successfully created new temp user!');
    } catch (createErr: any) {
      if (createErr.code === 'auth/email-already-in-use') {
        await signInWithEmailAndPassword(auth, email, password);
        console.log('Successfully signed in as existing temp user!');
      } else {
        throw createErr;
      }
    }

    console.log('Fetching projects from Firestore...');
    const querySnapshot = await getDocs(collection(db, 'projects'));
    console.log(`Found ${querySnapshot.size} projects:`);
    querySnapshot.forEach((doc) => {
      console.log(`- ID: ${doc.id}, Data:`, JSON.stringify(doc.data()));
    });
  } catch (error) {
    console.error('Failed:', error);
  }
}

run();
