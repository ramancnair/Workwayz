
'use client';

import { createContext, useContext, useState, useEffect, type PropsWithChildren } from 'react';
import { db, firebaseConfig } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  query,
  getDocs,
  where,
  Timestamp,
  connectFirestoreEmulator,
  getFirestore,
} from 'firebase/firestore';
import type { Epic, Story, Sprint, StoryStatus, Employee, TestCase, Risk } from '@/types';

// Helper to remove undefined values from an object before sending to Firestore
const sanitizeForFirestore = (data: any) => {
    const sanitized: any = {};
    for (const key in data) {
        if (data[key] !== undefined) {
             if (typeof data[key] === 'number' && !Number.isNaN(data[key])) {
                sanitized[key] = data[key];
            } else if (typeof data[key] !== 'number') {
                sanitized[key] = data[key];
            }
        }
    }
    return sanitized;
};


interface ProjectContextType {
  epics: Epic[];
  stories: Story[];
  sprints: Sprint[];
  employees: Employee[];
  testCases: TestCase[];
  risks: Risk[];
  
  // Story actions
  addStory: (story: Omit<Story, 'id' | 'storyId'>) => Promise<boolean>;
  updateStory: (storyId: string, data: Partial<Omit<Story, 'id' | 'storyId'>>) => Promise<boolean>;
  deleteStory: (storyId: string) => Promise<boolean>;
  moveStoryToSprint: (storyId: string, sprintId: string | null) => Promise<boolean>;
  moveStoryStatus: (storyId: string, newStatus: StoryStatus) => Promise<boolean>;
  moveStoryToEpic: (storyId: string, epicId: string | null) => Promise<boolean>;

  // Epic actions
  addEpic: (epic: Omit<Epic, 'id'>) => Promise<boolean>;
  updateEpic: (epicId: string, data: Partial<Omit<Epic, 'id'>>) => Promise<boolean>;
  deleteEpic: (epicId: string) => Promise<boolean>;

  // Sprint actions
  addSprint: (sprint: { title: string, startDate?: Date, endDate?: Date }) => Promise<boolean>;
  updateSprint: (sprintId: string, data: { title: string, startDate?: Date, endDate?: Date }) => Promise<boolean>;
  deleteSprint: (sprintId: string) => Promise<boolean>;
  setCurrentSprint: (sprintId: string) => Promise<boolean>;

  // Employee actions
  addEmployee: (employee: Omit<Employee, 'id' | 'onboardingDate' | 'offloadingDate'> & { onboardingDate?: Date, offloadingDate?: Date }) => Promise<boolean>;
  updateEmployee: (employeeId: string, data: Partial<Omit<Employee, 'id' | 'onboardingDate' | 'offloadingDate'> & { onboardingDate?: Date, offloadingDate?: Date }>) => Promise<boolean>;
  deleteEmployee: (employeeId: string) => Promise<boolean>;

  // TestCase actions
  addTestCase: (testCase: Omit<TestCase, 'id' | 'testCaseId'>) => Promise<boolean>;
  updateTestCase: (testCaseId: string, data: Partial<Omit<TestCase, 'id' | 'testCaseId'>>) => Promise<boolean>;
  deleteTestCase: (testCaseId: string) => Promise<boolean>;

  // Risk actions
  addRisk: (risk: Omit<Risk, 'id' | 'riskId'>) => Promise<boolean>;
  updateRisk: (riskId: string, data: Partial<Omit<Risk, 'id' | 'riskId'>>) => Promise<boolean>;
  deleteRisk: (riskId: string) => Promise<boolean>;

  isLoading: boolean;
  error: string | null;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: PropsWithChildren) {
  const [epics, setEpics] = useState<Epic[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) {
        setError(`Firebase is not configured correctly. The application is trying to use the Project ID: "${firebaseConfig.projectId || 'your-project-id'}". This is likely a placeholder. Please check your project setup in the Firebase Studio settings to ensure it's correctly linked to a Firebase project.`);
        setIsLoading(false);
        return;
    }

    const collections: { name: string, setState: React.Dispatch<any> }[] = [
        { name: 'epics', setState: setEpics },
        { name: 'stories', setState: setStories },
        { name: 'sprints', setState: setSprints },
        { name: 'employees', setState: setEmployees },
        { name: 'testCases', setState: setTestCases },
        { name: 'risks', setState: setRisks },
    ];
    
    const unsubscribers = collections.map(({ name, setState }) => {
        const q = query(collection(db, name));
        return onSnapshot(q, 
            (querySnapshot) => {
                const data = querySnapshot.docs.map(doc => {
                    const docData = doc.data();
                    const convertTimestamp = (field: any) => {
                      if (field && typeof field.toDate === 'function') {
                        return field.toDate().toISOString();
                      }
                      return field;
                    }

                    if (name === 'sprints') {
                        docData.startDate = convertTimestamp(docData.startDate);
                        docData.endDate = convertTimestamp(docData.endDate);
                    }
                     if (name === 'employees') {
                        docData.onboardingDate = convertTimestamp(docData.onboardingDate);
                        docData.offloadingDate = convertTimestamp(docData.offloadingDate);
                    }
                    return { id: doc.id, ...docData };
                });
                setState(data);
                setIsLoading(false);
            },
            (err) => {
                console.error(`Error fetching ${name}:`, err);
                setError(`Failed to listen to the database. Please check your Firestore security rules. (Collection: ${name}, Error: ${err.message})`);
                setIsLoading(false);
            }
        );
    });

    return () => unsubscribers.forEach(unsub => unsub());
  }, []);

  // Story Actions
  const addStory = async (story: Omit<Story, 'id' | 'storyId'>): Promise<boolean> => {
    if (!db) return false;
    try {
        const storiesSnapshot = await getDocs(collection(db, 'stories'));
        const newIdNumber = storiesSnapshot.size > 0
            ? Math.max(0, ...storiesSnapshot.docs
                .map(doc => doc.data().storyId)
                .filter((id: string | undefined) => id && typeof id === 'string')
                .map((id: string) => parseInt(id.replace('ST-', ''), 10) || 0)
            ) + 1
            : 1;

        const payload = { ...story, storyId: `ST-${newIdNumber}` };
        await addDoc(collection(db, 'stories'), sanitizeForFirestore(payload));
        return true;
    } catch (e: any) {
        console.error("Firebase Error: Failed to add story.", { code: e.code, message: e.message, fullError: e });
        return false;
    }
  };

  const updateStory = async (storyId: string, data: Partial<Omit<Story, 'id' | 'storyId'>>): Promise<boolean> => {
    if (!db) return false;
    try {
      await updateDoc(doc(db, 'stories', storyId), sanitizeForFirestore(data));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to update story.", { id: storyId, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  const deleteStory = async (storyId: string): Promise<boolean> => {
    if (!db) return false;
    try {
      await deleteDoc(doc(db, 'stories', storyId));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to delete story.", { id: storyId, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  const moveStoryToSprint = (storyId: string, sprintId: string | null) => updateStory(storyId, { sprintId });
  const moveStoryStatus = (storyId: string, newStatus: StoryStatus) => updateStory(storyId, { status: newStatus });
  const moveStoryToEpic = (storyId: string, epicId: string | null) => updateStory(storyId, { epicId });
  
  // Epic Actions
  const addEpic = async (epic: Omit<Epic, 'id'>): Promise<boolean> => {
    if (!db) return false;
    try {
      await addDoc(collection(db, 'epics'), sanitizeForFirestore(epic));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to add epic.", { code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  const updateEpic = async (epicId: string, data: Partial<Omit<Epic, 'id'>>): Promise<boolean> => {
    if (!db) return false;
    try {
      await updateDoc(doc(db, 'epics', epicId), sanitizeForFirestore(data));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to update epic.", { id: epicId, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  const deleteEpic = async (epicId: string): Promise<boolean> => {
    if (!db) return false;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'epics', epicId));
      
      const q = query(collection(db, 'stories'), where('epicId', '==', epicId));
      const storiesSnapshot = await getDocs(q);
      storiesSnapshot.forEach(storyDoc => {
        batch.update(doc(db, 'stories', storyDoc.id), { epicId: null });
      });

      await batch.commit();
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to delete epic.", { id: epicId, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  // Sprint Actions
  const addSprint = async (sprint: { title: string, startDate?: Date, endDate?: Date }): Promise<boolean> => {
    if (!db) return false;
    try {
      const payload: any = { title: sprint.title, isCurrent: false };
      if (sprint.startDate) payload.startDate = Timestamp.fromDate(sprint.startDate);
      if (sprint.endDate) payload.endDate = Timestamp.fromDate(sprint.endDate);
      await addDoc(collection(db, 'sprints'), sanitizeForFirestore(payload));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to add sprint.", { code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  const updateSprint = async (sprintId: string, data: { title: string, startDate?: Date, endDate?: Date }): Promise<boolean> => {
    if (!db) return false;
    try {
      const payload: any = { title: data.title };
      payload.startDate = data.startDate ? Timestamp.fromDate(data.startDate) : null;
      payload.endDate = data.endDate ? Timestamp.fromDate(data.endDate) : null;
      await updateDoc(doc(db, 'sprints', sprintId), sanitizeForFirestore(payload));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to update sprint.", { id: sprintId, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  const deleteSprint = async (sprintId: string): Promise<boolean> => {
    if (!db) return false;
    try {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'sprints', sprintId));
        
        const q = query(collection(db, 'stories'), where('sprintId', '==', sprintId));
        const storiesSnapshot = await getDocs(q);
        storiesSnapshot.forEach(storyDoc => {
            batch.update(doc(db, 'stories', storyDoc.id), { sprintId: null });
        });

        await batch.commit();
        return true;
    } catch (e: any) {
        console.error("Firebase Error: Failed to delete sprint.", { id: sprintId, code: e.code, message: e.message, fullError: e });
        return false;
    }
  };

  const setCurrentSprint = async (sprintId: string): Promise<boolean> => {
    if (!db) return false;
    try {
        const batch = writeBatch(db);
        const sprintsSnapshot = await getDocs(collection(db, 'sprints'));
        
        sprintsSnapshot.forEach(sprintDoc => {
            batch.update(doc(db, 'sprints', sprintDoc.id), { isCurrent: sprintDoc.id === sprintId });
        });

        await batch.commit();
        return true;
    } catch (e: any) {
        console.error("Firebase Error: Failed to set current sprint.", { id: sprintId, code: e.code, message: e.message, fullError: e });
        return false;
    }
  };

  // Employee Actions
  const addEmployee = async (employee: Omit<Employee, 'id' | 'onboardingDate' | 'offloadingDate'> & { onboardingDate?: Date, offloadingDate?: Date }): Promise<boolean> => {
    if (!db) return false;
    try {
        const { onboardingDate, offloadingDate, ...rest } = employee;
        const payload: any = { ...rest, avatar: 'https://placehold.co/40x40.png' };
        
        if (onboardingDate) payload.onboardingDate = Timestamp.fromDate(onboardingDate);
        if (offloadingDate) payload.offloadingDate = Timestamp.fromDate(offloadingDate);

        await addDoc(collection(db, 'employees'), sanitizeForFirestore(payload));
        return true;
    } catch (e: any) {
        console.error("Firebase Error: Failed to add employee.", { code: e.code, message: e.message, fullError: e });
        return false;
    }
  };

  const updateEmployee = async (employeeId: string, data: Partial<Omit<Employee, 'id' | 'onboardingDate' | 'offloadingDate'> & { onboardingDate?: Date, offloadingDate?: Date }>): Promise<boolean> => {
    if (!db) return false;
    try {
        const { onboardingDate, offloadingDate, ...rest } = data;
        const payload: any = { ...rest };
        
        if (data.hasOwnProperty('onboardingDate')) payload.onboardingDate = onboardingDate ? Timestamp.fromDate(onboardingDate) : null;
        if (data.hasOwnProperty('offloadingDate')) payload.offloadingDate = offloadingDate ? Timestamp.fromDate(offloadingDate) : null;

        await updateDoc(doc(db, 'employees', employeeId), sanitizeForFirestore(payload));
        return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to update employee.", { id: employeeId, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };
  
  const deleteEmployee = async (employeeId: string): Promise<boolean> => {
    if (!db) return false;
    try {
      await deleteDoc(doc(db, 'employees', employeeId));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to delete employee.", { id: employeeId, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  // TestCase Actions
  const addTestCase = async (testCase: Omit<TestCase, 'id' | 'testCaseId'>): Promise<boolean> => {
    if (!db) return false;
    try {
        const testCasesSnapshot = await getDocs(collection(db, 'testCases'));
        const newIdNumber = testCasesSnapshot.size > 0
            ? Math.max(0, ...testCasesSnapshot.docs
                .map(doc => doc.data().testCaseId)
                .filter((id: string | undefined) => id && typeof id === 'string')
                .map((id: string) => parseInt(id.replace('TC-', ''), 10) || 0)
            ) + 1
            : 1;

        const payload = { ...testCase, testCaseId: `TC-${newIdNumber}` };
        await addDoc(collection(db, 'testCases'), sanitizeForFirestore(payload));
        return true;
    } catch (e: any) {
        console.error("Firebase Error: Failed to add test case.", { code: e.code, message: e.message, fullError: e });
        return false;
    }
  };

  const updateTestCase = async (testCaseId: string, data: Partial<Omit<TestCase, 'id' | 'testCaseId'>>): Promise<boolean> => {
    if (!db) return false;
    try {
      await updateDoc(doc(db, 'testCases', testCaseId), sanitizeForFirestore(data));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to update test case.", { id: testCaseId, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  const deleteTestCase = async (testCaseId: string): Promise<boolean> => {
    if (!db) return false;
    try {
      await deleteDoc(doc(db, 'testCases', testCaseId));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to delete test case.", { id: testCaseId, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  // Risk Actions
  const addRisk = async (risk: Omit<Risk, 'id' | 'riskId'>): Promise<boolean> => {
    if (!db) return false;
    try {
      const risksSnapshot = await getDocs(collection(db, 'risks'));
      const newIdNumber = risksSnapshot.size > 0
        ? Math.max(0, ...risksSnapshot.docs
            .map(doc => doc.data().riskId)
            .filter((id: string | undefined) => id && typeof id === 'string')
            .map((id: string) => parseInt(id.replace('R-', ''), 10) || 0)
        ) + 1
        : 1;

      const payload = { ...risk, riskId: `R-${newIdNumber}` };
      await addDoc(collection(db, 'risks'), sanitizeForFirestore(payload));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to add risk.", { code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  const updateRisk = async (riskId: string, data: Partial<Omit<Risk, 'id' | 'riskId'>>): Promise<boolean> => {
    if (!db) return false;
    try {
      await updateDoc(doc(db, 'risks', riskId), sanitizeForFirestore(data));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to update risk.", { id: riskId, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  const deleteRisk = async (riskId: string): Promise<boolean> => {
    if (!db) return false;
    try {
      await deleteDoc(doc(db, 'risks', riskId));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to delete risk.", { id: riskId, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };
  
  const value: ProjectContextType = {
    epics,
    stories,
    sprints,
    employees,
    testCases,
    risks,
    isLoading,
    error,
    addStory,
    updateStory,
    deleteStory,
    moveStoryToSprint,
    moveStoryStatus,
    moveStoryToEpic,
    addEpic,
    updateEpic,
    deleteEpic,
    addSprint,
    updateSprint,
    deleteSprint,
    setCurrentSprint,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    addTestCase,
    updateTestCase,
    deleteTestCase,
    addRisk,
    updateRisk,
    deleteRisk,
  };
  
    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-muted-foreground">Connecting to database...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background p-8">
                <div className="max-w-2xl rounded-lg border border-destructive bg-destructive/10 p-6 text-center text-destructive">
                    <h2 className="text-2xl font-bold">Database Connection Error</h2>
                    <p className="mt-2 text-destructive/80">{error}</p>
                </div>
            </div>
        );
    }

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
