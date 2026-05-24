const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function listProjects() {
  try {
    const querySnapshot = await getDocs(collection(db, 'projects'));
    console.log(`Found ${querySnapshot.size} projects:`);
    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data();
      console.log(`- [${docSnap.id}]: "${data.name}" (${data.pricingModel || 'N/A'}) - Status: ${data.status}`);
      
      const pmColRef = collection(db, 'projects', docSnap.id, 'paymentMilestones');
      const pmSnapshot = await getDocs(pmColRef);
      console.log(`  Milestones (${pmSnapshot.size}):`);
      pmSnapshot.forEach(pmDoc => {
        const pmData = pmDoc.data();
        console.log(`    * [${pmData.milestoneId}]: "${pmData.name}" - Amount: $${pmData.amount}`);
      });
    }
  } catch (err) {
    console.error("Error listing projects:", err.message);
  }
}

listProjects().then(() => process.exit(0));
