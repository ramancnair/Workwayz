
import { db } from './firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';

const SUBCOLLECTIONS = [
  'epics', 'stories', 'sprints', 'employees', 'testCases', 'risks', 
  'assumptions', 'issues', 'dependencies', 'kanbanColumns', 'holidays', 
  'releases', 'impactedSystems', 'worklogs', 'worklogSubmissions', 'settings'
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
    await deleteCollection(collectionPath, batch);
  }

  // Finally, delete the project document itself
  batch.delete(projectRef);

  await batch.commit();
}
