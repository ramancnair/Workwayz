
'use client';

import { createContext, useContext, useState, useEffect, type PropsWithChildren } from 'react';
import { db } from '@/lib/firebase';
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
} from 'firebase/firestore';
import type { Epic, Story, Sprint, StoryStatus, Employee, TestCase } from '@/types';

interface ProjectContextType {
  epics: Epic[];
  stories: Story[];
  sprints: Sprint[];
  employees: Employee[];
  testCases: TestCase[];
  
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) {
        setError("Firebase not configured. Please check your .env.local file.");
        setIsLoading(false);
        return;
    }

    const collections: { name: string, setState: React.Dispatch<any> }[] = [
        { name: 'epics', setState: setEpics },
        { name: 'stories', setState: setStories },
        { name: 'sprints', setState: setSprints },
        { name: 'employees', setState: setEmployees },
        { name: 'testCases', setState: setTestCases },
    ];
    
    const unsubscribers = collections.map(({ name, setState }) => {
        const q = query(collection(db, name));
        return onSnapshot(q, 
            (querySnapshot) => {
                const data = querySnapshot.docs.map(doc => {
                    const docData = doc.data();
                    // Convert Firestore Timestamps to ISO strings for client-side use
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
                setError(`Failed to connect to the database. Please check your Firebase configuration and security rules. (Collection: ${name})`);
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

        const payload: any = { ...story, storyId: `ST-${newIdNumber}` };
        Object.keys(payload).forEach(key => { if (payload[key] === undefined) delete payload[key]; });

        await addDoc(collection(db, 'stories'), payload);
        return true;
    } catch (e) {
        console.error("Error adding story: ", e);
        return false;
    }
  };

  const updateStory = async (storyId: string, data: Partial<Omit<Story, 'id' | 'storyId'>>): Promise<boolean> => {
    if (!db) return false;
    try {
      const payload: any = { ...data };
      Object.keys(payload).forEach(key => { if (payload[key] === undefined) delete payload[key]; });
      await updateDoc(doc(db, 'stories', storyId), payload);
      return true;
    } catch (e) {
      console.error("Error updating story: ", e);
      return false;
    }
  };

  const deleteStory = async (storyId: string): Promise<boolean> => {
    if (!db) return false;
    try {
      await deleteDoc(doc(db, 'stories', storyId));
      return true;
    } catch (e) {
      console.error("Error deleting story: ", e);
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
      const payload: any = { ...epic };
      Object.keys(payload).forEach(key => { if (payload[key] === undefined) delete payload[key]; });
      await addDoc(collection(db, 'epics'), payload);
      return true;
    } catch (e) {
      console.error("Error adding epic: ", e);
      return false;
    }
  };

  const updateEpic = async (epicId: string, data: Partial<Omit<Epic, 'id'>>): Promise<boolean> => {
    if (!db) return false;
    try {
      const payload: any = { ...data };
      Object.keys(payload).forEach(key => { if (payload[key] === undefined) delete payload[key]; });
      await updateDoc(doc(db, 'epics', epicId), payload);
      return true;
    } catch (e) {
      console.error("Error updating epic: ", e);
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
    } catch (e) {
      console.error("Error deleting epic: ", e);
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
      await addDoc(collection(db, 'sprints'), payload);
      return true;
    } catch (e) {
      console.error("Error adding sprint: ", e);
      return false;
    }
  };

  const updateSprint = async (sprintId: string, data: { title: string, startDate?: Date, endDate?: Date }): Promise<boolean> => {
    if (!db) return false;
    try {
      const payload: any = { title: data.title };
      payload.startDate = data.startDate ? Timestamp.fromDate(data.startDate) : null;
      payload.endDate = data.endDate ? Timestamp.fromDate(data.endDate) : null;
      await updateDoc(doc(db, 'sprints', sprintId), payload);
      return true;
    } catch (e) {
      console.error("Error updating sprint: ", e);
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
    } catch (e) {
        console.error("Error deleting sprint: ", e);
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
    } catch (e) {
        console.error("Error setting current sprint: ", e);
        return false;
    }
  };

  // Employee Actions
  const addEmployee = async (employee: Omit<Employee, 'id' | 'onboardingDate' | 'offloadingDate'> & { onboardingDate?: Date, offloadingDate?: Date }): Promise<boolean> => {
    if (!db) return false;
    try {
        const { onboardingDate, offloadingDate, ...rest } = employee;
        const payload: any = { ...rest, avatar: 'https://placehold.co/40x40.png' };
        
        Object.keys(payload).forEach(key => { if (payload[key] === undefined || Number.isNaN(payload[key])) delete payload[key]; });

        if (onboardingDate) payload.onboardingDate = Timestamp.fromDate(onboardingDate);
        if (offloadingDate) payload.offloadingDate = Timestamp.fromDate(offloadingDate);
        await addDoc(collection(db, 'employees'), payload);
        return true;
    } catch (e) {
        console.error("Error adding employee: ", e);
        return false;
    }
  };

  const updateEmployee = async (employeeId: string, data: Partial<Omit<Employee, 'id' | 'onboardingDate' | 'offloadingDate'> & { onboardingDate?: Date, offloadingDate?: Date }>): Promise<boolean> => {
    if (!db) return false;
    try {
        const { onboardingDate, offloadingDate, ...rest } = data;
        const payload: any = { ...rest };
        
        Object.keys(payload).forEach(key => { if (payload[key] === undefined || Number.isNaN(payload[key])) delete payload[key]; });

        if (data.hasOwnProperty('onboardingDate')) payload.onboardingDate = onboardingDate ? Timestamp.fromDate(onboardingDate) : null;
        if (data.hasOwnProperty('offloadingDate')) payload.offloadingDate = offloadingDate ? Timestamp.fromDate(offloadingDate) : null;

        await updateDoc(doc(db, 'employees', employeeId), payload);
        return true;
    } catch (e) {
      console.error("Error updating employee: ", e);
      return false;
    }
  };
  
  const deleteEmployee = async (employeeId: string): Promise<boolean> => {
    if (!db) return false;
    try {
      await deleteDoc(doc(db, 'employees', employeeId));
      return true;
    } catch (e) {
      console.error("Error deleting employee: ", e);
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

        const payload: any = { ...testCase, testCaseId: `TC-${newIdNumber}` };
        Object.keys(payload).forEach(key => { if (payload[key] === undefined) delete payload[key]; });

        await addDoc(collection(db, 'testCases'), payload);
        return true;
    } catch (e) {
        console.error("Error adding test case: ", e);
        return false;
    }
  };

  const updateTestCase = async (testCaseId: string, data: Partial<Omit<TestCase, 'id' | 'testCaseId'>>): Promise<boolean> => {
    if (!db) return false;
    try {
      const payload: any = { ...data };
      Object.keys(payload).forEach(key => { if (payload[key] === undefined) delete payload[key]; });
      await updateDoc(doc(db, 'testCases', testCaseId), payload);
      return true;
    } catch (e) {
      console.error("Error updating test case: ", e);
      return false;
    }
  };

  const deleteTestCase = async (testCaseId: string): Promise<boolean> => {
    if (!db) return false;
    try {
      await deleteDoc(doc(db, 'testCases', testCaseId));
      return true;
    } catch (e) {
      console.error("Error deleting test case: ", e);
      return false;
    }
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
            <div className="flex h-screen w-full items-center justify-center bg-background p-8">
                <div className="max-w-2xl rounded-lg border border-destructive bg-destructive/10 p-6 text-center text-destructive-foreground">
                    <h2 className="text-2xl font-bold">Database Connection Error</h2>
                    <p className="mt-2 text-destructive-foreground/80">{error}</p>
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
