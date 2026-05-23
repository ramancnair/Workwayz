const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
};

console.log("Config project ID:", firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  const projectId = 'P2600001';
  
  console.log(`\n--- Fetching employees subcollection for ${projectId} ---`);
  try {
    const querySnapshot = await getDocs(collection(db, 'projects', projectId, 'employees'));
    console.log(`Found ${querySnapshot.size} employees:`);
    querySnapshot.forEach(doc => {
      console.log(`- [${doc.id}]:`, doc.data());
    });
  } catch (err) {
    console.error("Error fetching employees:", err.message);
  }

  console.log(`\n--- Fetching paymentMilestones subcollection for ${projectId} ---`);
  try {
    const querySnapshot = await getDocs(collection(db, 'projects', projectId, 'paymentMilestones'));
    console.log(`Found ${querySnapshot.size} paymentMilestones:`);
    querySnapshot.forEach(doc => {
      console.log(`- [${doc.id}]:`, doc.data());
    });
  } catch (err) {
    console.error("Error fetching paymentMilestones:", err.message);
  }
}

test().then(() => process.exit(0)).catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
