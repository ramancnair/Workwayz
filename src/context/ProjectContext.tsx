
'use client';

import { createContext, useContext, useState, useEffect, type PropsWithChildren } from 'react';
import type { Epic, Story, Sprint, StoryStatus, Employee, TestCase, TestCaseStatus, TestCaseType, WorkItemType } from '@/types';
import { 
  epics as initialEpics, 
  stories as initialStories, 
  sprints as initialSprints,
  employees as initialEmployees,
  testCases as initialTestCases
} from '@/lib/mock-data';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  writeBatch,
  getDocs,
  Timestamp,
  query,
  where,
  documentId,
} from 'firebase/firestore';

interface ProjectContextType {
  epics: Epic[];
  stories: Story[];
  sprints: Sprint[];
  employees: Employee[];
  testCases: TestCase[];
  
  // Story actions
  addStory: (story: Omit<Story, 'id' | 'storyId'> & { storyId?: string }) => Promise<void>;
  updateStory: (storyId: string, data: Partial<Omit<Story, 'id'>>) => Promise<void>;
  deleteStory: (storyId: string) => Promise<void>;
  moveStoryToSprint: (storyId: string, sprintId: string | null) => Promise<void>;
  moveStoryStatus: (storyId: string, newStatus: StoryStatus) => Promise<void>;
  moveStoryToEpic: (storyId: string, epicId: string | null) => Promise<void>;

  // Epic actions
  addEpic: (epic: Omit<Epic, 'id'>) => Promise<void>;
  updateEpic: (epicId: string, data: Partial<Omit<Epic, 'id'>>) => Promise<void>;
  deleteEpic: (epicId: string) => Promise<void>;

  // Sprint actions
  addSprint: (sprint: Omit<Sprint, 'id' | 'isCurrent'>) => Promise<void>;
  updateSprint: (sprintId: string, data: Partial<Omit<Sprint, 'id' | 'isCurrent'>>) => Promise<void>;
  deleteSprint: (sprintId: string) => Promise<void>;
  setCurrentSprint: (sprintId: string) => Promise<void>;

  // Employee actions
  addEmployee: (employee: Omit<Employee, 'id'>) => Promise<void>;
  updateEmployee: (employeeId: string, data: Partial<Omit<Employee, 'id'>>) => Promise<void>;
  deleteEmployee: (employeeId: string) => Promise<void>;

  // TestCase actions
  addTestCase: (testCase: Omit<TestCase, 'id' | 'testCaseId'> & { testCaseId?: string }) => Promise<void>;
  updateTestCase: (testCaseId: string, data: Partial<Omit<TestCase, 'id'>>) => Promise<void>;
  deleteTestCase: (testCaseId: string) => Promise<void>;

  isLoading: boolean;
  error: string | null;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const convertTimestamps = (data: any) => {
  const converted: { [key: string]: any } = {};
  for (const key in data) {
    if (data[key] instanceof Timestamp) {
      converted[key] = data[key].toDate().toISOString();
    } else {
      converted[key] = data[key];
    }
  }
  return converted;
};

export function ProjectProvider({ children }: PropsWithChildren) {
  const [epics, setEpics] = useState<Epic[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const seedDatabase = async () => {
      const epicsSnap = await getDocs(collection(db, 'epics'));
      if (epicsSnap.empty) {
        console.log('Empty database, seeding with initial data...');
        const batch = writeBatch(db);

        const collectionsToSeed: { [key: string]: any[] } = {
          epics: initialEpics,
          stories: initialStories,
          sprints: initialSprints,
          employees: initialEmployees,
          testCases: initialTestCases,
        };

        for (const [collectionName, data] of Object.entries(collectionsToSeed)) {
          data.forEach(item => {
            const { id, ...rest } = item;
            const docRef = doc(db, collectionName, id);
            batch.set(docRef, rest);
          });
        }
        
        await batch.commit();
        console.log('Database seeded.');
      }
    };

    const setupListeners = async () => {
      try {
        await seedDatabase();

        const unsubEpics = onSnapshot(collection(db, 'epics'), (snapshot) => {
            setEpics(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Epic)));
        });

        const unsubStories = onSnapshot(collection(db, 'stories'), (snapshot) => {
            setStories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Story)));
        });

        const unsubSprints = onSnapshot(collection(db, 'sprints'), (snapshot) => {
            setSprints(snapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as Sprint)));
        });
        
        const unsubEmployees = onSnapshot(collection(db, 'employees'), (snapshot) => {
            setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...convertTimestamps(doc.data()) } as Employee)));
        });

        const unsubTestCases = onSnapshot(collection(db, 'testCases'), (snapshot) => {
            setTestCases(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TestCase)));
        });

        setIsLoading(false);

        return () => {
            unsubEpics();
            unsubStories();
            unsubSprints();
            unsubEmployees();
            unsubTestCases();
        };
      } catch (err: any) {
        console.error("Firestore Initialization Error:", err);
        setError("Could not connect to the database. Please check your Firebase project configuration and security rules.");
        setIsLoading(false);
        return () => {};
      }
    };

    const unsubscribePromise = setupListeners();

    return () => {
        unsubscribePromise.then(unsub => unsub && unsub());
    };
  }, []);

  // Story Actions
  const addStory = async (story: Omit<Story, 'id' | 'storyId'> & { storyId?: string }) => {
     const storiesCollection = collection(db, 'stories');
     const snapshot = await getDocs(storiesCollection);
     const newIdNumber =
      snapshot.docs.length > 0
        ? Math.max(
            0,
            ...snapshot.docs
              .map(doc => doc.data().storyId)
              .filter(id => id && typeof id === 'string')
              .map(id => parseInt(id.replace('ST-', ''), 10) || 0)
          ) + 1
        : 1;
    
    const newStory = {
        ...story,
        storyId: `ST-${newIdNumber}`
    }
    await addDoc(storiesCollection, newStory);
  };
  const updateStory = async (storyId: string, data: Partial<Omit<Story, 'id'>>) => {
    await updateDoc(doc(db, 'stories', storyId), data);
  };
  const deleteStory = async (storyId: string) => {
    await deleteDoc(doc(db, 'stories', storyId));
  };
  const moveStoryToSprint = async (storyId: string, sprintId: string | null) => {
    await updateDoc(doc(db, 'stories', storyId), { sprintId });
  };
  const moveStoryStatus = async (storyId: string, newStatus: StoryStatus) => {
    await updateDoc(doc(db, 'stories', storyId), { status: newStatus });
  };
  const moveStoryToEpic = async (storyId: string, epicId: string | null) => {
    await updateDoc(doc(db, 'stories', storyId), { epicId });
  };
  
  // Epic Actions
  const addEpic = async (epic: Omit<Epic, 'id'>) => {
    await addDoc(collection(db, 'epics'), epic);
  };
  const updateEpic = async (epicId: string, data: Partial<Omit<Epic, 'id'>>) => {
    await updateDoc(doc(db, 'epics', epicId), data);
  };
  const deleteEpic = async (epicId: string) => {
    const batch = writeBatch(db);
    // Delete the epic
    batch.delete(doc(db, 'epics', epicId));
    // Find stories in the epic and unassign them
    const q = query(collection(db, 'stories'), where('epicId', '==', epicId));
    const storiesSnap = await getDocs(q);
    storiesSnap.forEach(storyDoc => {
      batch.update(storyDoc.ref, { epicId: null });
    });
    await batch.commit();
  };
  
  // Sprint Actions
  const addSprint = async (sprint: Omit<Sprint, 'id' | 'isCurrent'>) => {
    await addDoc(collection(db, 'sprints'), { ...sprint, isCurrent: false });
  };
  const updateSprint = async (sprintId: string, data: Partial<Omit<Sprint, 'id' | 'isCurrent'>>) => {
    const sprintData: {[key: string]: any} = {...data};
    if (data.startDate) sprintData.startDate = Timestamp.fromDate(new Date(data.startDate));
    if (data.endDate) sprintData.endDate = Timestamp.fromDate(new Date(data.endDate));
    await updateDoc(doc(db, 'sprints', sprintId), sprintData);
  };
  const deleteSprint = async (sprintId: string) => {
    const batch = writeBatch(db);
    // Delete the sprint
    batch.delete(doc(db, 'sprints', sprintId));
    // Find stories in the sprint and move them to backlog
    const q = query(collection(db, 'stories'), where('sprintId', '==', sprintId));
    const storiesSnap = await getDocs(q);
    storiesSnap.forEach(storyDoc => {
      batch.update(storyDoc.ref, { sprintId: null });
    });
    await batch.commit();
  };
  const setCurrentSprint = async (sprintId: string) => {
     const batch = writeBatch(db);
     const sprintsSnap = await getDocs(collection(db, 'sprints'));
     sprintsSnap.forEach(sprintDoc => {
        batch.update(sprintDoc.ref, { isCurrent: sprintDoc.id === sprintId });
     });
     await batch.commit();
  };

  // Employee Actions
  const addEmployee = async (employee: Omit<Employee, 'id'>) => {
    await addDoc(collection(db, 'employees'), employee);
  };
  const updateEmployee = async (employeeId: string, data: Partial<Omit<Employee, 'id'>>) => {
     const employeeData: {[key: string]: any} = {...data};
     if (data.onboardingDate) employeeData.onboardingDate = Timestamp.fromDate(new Date(data.onboardingDate));
     if (data.offloadingDate) employeeData.offloadingDate = Timestamp.fromDate(new Date(data.offloadingDate));
    await updateDoc(doc(db, 'employees', employeeId), employeeData);
  };
  const deleteEmployee = async (employeeId: string) => {
    await deleteDoc(doc(db, 'employees', employeeId));
  };
  
  // TestCase Actions
  const addTestCase = async (testCase: Omit<TestCase, 'id' | 'testCaseId'> & { testCaseId?: string }) => {
    const testCasesCollection = collection(db, 'testCases');
    const snapshot = await getDocs(testCasesCollection);
    const newIdNumber =
      snapshot.docs.length > 0
        ? Math.max(
            0,
            ...snapshot.docs
              .map(doc => doc.data().testCaseId)
              .filter(id => id && typeof id === 'string')
              .map(id => parseInt(id.replace('TC-', ''), 10) || 0)
          ) + 1
        : 1;
    const newTestCase = {
        ...testCase,
        testCaseId: `TC-${newIdNumber}`
    }
    await addDoc(testCasesCollection, newTestCase);
  };
  const updateTestCase = async (testCaseId: string, data: Partial<Omit<TestCase, 'id'>>) => {
    await updateDoc(doc(db, 'testCases', testCaseId), data);
  };
  const deleteTestCase = async (testCaseId: string) => {
    await deleteDoc(doc(db, 'testCases', testCaseId));
  };

  const value: ProjectContextType = {
    epics,
    stories,
    sprints,
    employees,
    testCases,
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
      <div className="flex h-screen w-full items-center justify-center bg-background p-4">
        <div className="w-full max-w-lg rounded-lg border border-destructive bg-card p-6 text-center shadow-lg">
          <h1 className="text-xl font-bold text-destructive">Database Connection Failed</h1>
          <p className="mt-2 text-sm text-card-foreground">{error}</p>
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
