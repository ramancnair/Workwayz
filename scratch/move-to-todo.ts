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
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const PROJECT_ID = 'P2600013'; // Autogen Project 13

async function run() {
  const email = 'temp-admin-script@example.com';
  const password = 'TemporaryPassword123!';

  try {
    console.log(`Authenticating as ${email}...`);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      console.log('Created new temp user.');
    } catch (createErr: any) {
      if (createErr.code === 'auth/email-already-in-use') {
        await signInWithEmailAndPassword(auth, email, password);
        console.log('Signed in as temp user.');
      } else {
        throw createErr;
      }
    }

    console.log(`Fetching all stories/tasks/bugs for project ${PROJECT_ID}...`);
    const storiesColRef = collection(db, 'projects', PROJECT_ID, 'stories');
    const querySnapshot = await getDocs(storiesColRef);
    console.log(`Found ${querySnapshot.size} total items in stories collection.`);

    const batch = writeBatch(db);
    let updateCount = 0;
    const itemTypeCounts: Record<string, number> = {};

    const now = new Date().toISOString();

    querySnapshot.forEach((document) => {
      const data = document.data();
      const id = document.id;
      const currentStatus = data.status;
      const itemType = data.itemType || 'Unknown';
      const storyId = data.storyId || 'No ID';

      // Initialize counter for this item type
      if (!itemTypeCounts[itemType]) {
        itemTypeCounts[itemType] = 0;
      }

      if (currentStatus !== 'To Do') {
        const docRef = doc(db, 'projects', PROJECT_ID, 'stories', id);
        
        // Build new status history
        const statusHistory = Array.isArray(data.statusHistory) ? [...data.statusHistory] : [];
        statusHistory.push({
          fromStatus: currentStatus || null,
          toStatus: 'To Do',
          date: now
        });

        const updatePayload: any = {
          status: 'To Do',
          statusHistory: statusHistory,
          developmentStartDate: null,
          completionDate: null
        };

        if (itemType === 'Bug') {
          updatePayload.closedAt = null;
        }

        batch.update(docRef, updatePayload);
        updateCount++;
        itemTypeCounts[itemType]++;
        console.log(`- Queueing ${itemType} [${storyId}] to 'To Do' (was '${currentStatus}')`);
      }
    });

    if (updateCount > 0) {
      console.log(`Committing batch update for ${updateCount} items...`);
      await batch.commit();
      console.log('Batch update completed successfully!');
      console.log('Summary of moved items by type:');
      for (const [type, count] of Object.entries(itemTypeCounts)) {
        console.log(`- ${type}: ${count}`);
      }
    } else {
      console.log('All items are already in "To Do" state. No updates needed.');
    }

  } catch (error) {
    console.error('Failed to update stories:', error);
  }
}

run();
