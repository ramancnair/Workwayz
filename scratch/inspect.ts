import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
};

console.log("Connecting to Firebase project:", firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  try {
    const projectsSnap = await getDocs(collection(db, 'projects'));
    console.log(`Found ${projectsSnap.size} projects:`);
    for (const projectDoc of projectsSnap.docs) {
      console.log(`\n=================== Project: ${projectDoc.id} ===================`);
      const sprintsSnap = await getDocs(collection(db, 'projects', projectDoc.id, 'sprints'));
      console.log(`Found ${sprintsSnap.size} sprints:`);
      sprintsSnap.forEach(doc => {
        console.log(`- Sprint ID: ${doc.id}, Title: ${doc.data().title}, isCurrent: ${doc.data().isCurrent}`);
      });

      const storiesSnap = await getDocs(collection(db, 'projects', projectDoc.id, 'stories'));
      console.log(`Found ${storiesSnap.size} stories total.`);
      
      const sprint1Stories = storiesSnap.docs.filter(doc => doc.data().sprintId === 'sprint1' || doc.data().sprintId === 'Sprint1');
      console.log(`\nStories in sprint1 (${sprint1Stories.length}):`);
      sprint1Stories.forEach(doc => {
        const data = doc.data();
        console.log(`- [${data.itemType}] ${data.storyId}: ${data.title} (${data.status}), Est: ${data.estimatedHours}h, Parent: ${data.parentStoryId}, isDeleted: ${data.isDeleted}`);
      });

      const allSprintStories = storiesSnap.docs.filter(doc => dataSprintId(doc.data().sprintId));
      console.log(`\nAll stories by sprint:`);
      const sprintMap: Record<string, any[]> = {};
      storiesSnap.forEach(doc => {
        const data = doc.data();
        const sId = data.sprintId || 'backlog';
        if (!sprintMap[sId]) sprintMap[sId] = [];
        sprintMap[sId].push({ id: doc.id, ...data });
      });

      for (const [sId, items] of Object.entries(sprintMap)) {
        console.log(`\nSprint: ${sId} (${items.length} items):`);
        items.forEach(item => {
          console.log(`  * [${item.itemType}] ${item.storyId}: ${item.title} (${item.status}), Est: ${item.estimatedHours}h, Parent: ${item.parentStoryId}, isDeleted: ${item.isDeleted}`);
        });
      }
    }
  } catch (err) {
    console.error("Error inspecting database:", err);
  }
}

function dataSprintId(sId: any) {
  return typeof sId === 'string' && sId !== '';
}

run();
