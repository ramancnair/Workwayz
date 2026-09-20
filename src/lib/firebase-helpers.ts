
import { db, getIsSupa } from './db-provider';
import { collection, getDocs, writeBatch, doc } from '@/lib/db-provider';
import { supabase } from './supabase';
import { scheduleListenerNotification } from './supabase-firestore-adapter';

const SUBCOLLECTIONS = [
  'epics', 'stories', 'sprints', 'employees', 'testCases', 'risks', 
  'assumptions', 'issues', 'dependencies', 'kanbanColumns', 'holidays', 
  'releases', 'impactedSystems', 'worklogs', 'worklogSubmissions', 'settings',
  'horizontals', 'initialImpactedSystems', 'initialHorizontals', 'fixedCosts',
  'environments', 'codeRepositories', 'testPlans', 'testCycles', 'documents', 'paymentMilestones'
];

export async function deleteProjectAndSubcollections(projectId: string) {
  if (!db) {
    throw new Error("Database is not initialized.");
  }

  // If using Supabase, execute a single atomic SQL delete covering project and all subcollections
  if (getIsSupa() && supabase) {
    const { error } = await supabase
      .from('firebase_compat')
      .delete()
      .or(`project_id.eq.${projectId},path.eq.projects/${projectId},path.like.projects/${projectId}/%`);

    if (error) throw error;

    // Clean up relational projects table if present
    try {
      await supabase.from('projects').delete().eq('id', projectId);
    } catch {
      // Ignored
    }

    scheduleListenerNotification(`projects/${projectId}`);
    scheduleListenerNotification('projects');
    return;
  }

  // Firebase fallback: fetch all subcollections concurrently in parallel
  const projectRef = doc(db, 'projects', projectId);
  const batch = writeBatch(db);

  await Promise.all(SUBCOLLECTIONS.map(async (subcollectionName) => {
    const collectionPath = `projects/${projectId}/${subcollectionName}`;
    const subcollectionRef = collection(db, collectionPath);
    const subcollectionSnapshot = await getDocs(subcollectionRef);
    subcollectionSnapshot.forEach((subDoc: any) => {
      batch.delete(subDoc.ref);
    });
  }));

  batch.delete(projectRef);
  await batch.commit();
}

