
import { db } from './firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';

const SUBCOLLECTIONS = [
  'epics', 'stories', 'sprints', 'employees', 'testCases', 'risks', 
  'assumptions', 'issues', 'dependencies', 'kanbanColumns', 'holidays', 
  'releases', 'impactedSystems', 'worklogs', 'worklogSubmissions', 'settings',
  'horizontals', 'initialImpactedSystems', 'initialHorizontals', 'fixedCosts',
  'environments', 'codeRepositories', 'testPlans', 'documents', 'paymentMilestones'
];

async function deleteCollection(collectionPath: string, batch: any) {
  const collectionRef = collection(db!, collectionPath);
  const snapshot = await getDocs(collectionRef);
  
  if (snapshot.size === 0) {
    return;
  }
  
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
}

export async function deleteProjectAndSubcollections(projectId: string) {
  if (!db) {
    throw new Error("Firestore is not initialized.");
  }

  const projectRef = doc(db, 'projects', projectId);
  const batch = writeBatch(db);

  // Recursively delete all known subcollections
  for (const subcollectionName of SUBCOLLECTIONS) {
    const collectionPath = `projects/${projectId}/${subcollectionName}`;
    const subcollectionRef = collection(db, collectionPath);
    const subcollectionSnapshot = await getDocs(subcollectionRef);
    subcollectionSnapshot.forEach(subDoc => {
        batch.delete(subDoc.ref);
    });
  }

  // Finally, delete the project document itself
  batch.delete(projectRef);

  // Note: We are not committing the batch here.
  // The calling function (e.g., deletePortfolio) is responsible for committing.
  // This allows multiple project deletions to be part of a single transaction.
  // However, for standalone project deletion, this must be committed.
  // Let's modify this to commit if it's not part of a larger batch.
  // A cleaner way is to just pass the batch and let the caller handle it.
  
  // For the sake of this function's original purpose, let's assume it should commit.
  await batch.commit();
}
