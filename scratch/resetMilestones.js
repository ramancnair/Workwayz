const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, deleteDoc, addDoc } = require('firebase/firestore');
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

const activeMonths = [
  'May 2026',
  'June 2026',
  'July 2026',
  'August 2026',
  'September 2026',
  'October 2026',
  'November 2026'
];

async function resetMilestones() {
  const projectId = 'P2600001';
  const milestonesColRef = collection(db, 'projects', projectId, 'paymentMilestones');

  console.log(`\n--- Fetching current milestones for ${projectId} ---`);
  const snapshot = await getDocs(milestonesColRef);
  console.log(`Found ${snapshot.size} current milestones. Deleting...`);
  
  for (const docSnap of snapshot.docs) {
    await deleteDoc(doc(db, 'projects', projectId, 'paymentMilestones', docSnap.id));
    console.log(`Deleted milestone: ${docSnap.id}`);
  }

  console.log(`\n--- Creating new monthly milestones for ${projectId} ---`);
  const todayStr = new Date().toISOString().split('T')[0];

  for (let i = 0; i < activeMonths.length; i++) {
    const monthName = activeMonths[i];
    const milestoneId = `PM-${i + 1}`;
    
    const newMilestone = {
      milestoneId,
      name: monthName,
      amount: 0,
      billingPercentage: 0,
      status: 'TBD',
      attachments: '',
      statusHistory: [
        {
          status: 'TBD',
          date: todayStr
        }
      ]
    };
    
    const docRef = await addDoc(milestonesColRef, newMilestone);
    console.log(`Created milestone ${milestoneId} (${monthName}) in doc ${docRef.id}`);
  }

  console.log('\nMilestones successfully reset and pre-populated!');
}

resetMilestones().then(() => process.exit(0)).catch(err => {
  console.error("Failed to reset milestones:", err);
  process.exit(1);
});
