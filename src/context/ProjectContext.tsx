


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
  getDoc,
  setDoc,
} from 'firebase/firestore';
import type { Epic, Story, Sprint, StoryStatus, Employee, TestCase, Risk, Assumption, Issue, Dependency, KanbanColumn, Holiday, ProjectSettings, ImpactedSystem } from '@/types';
import { arrayMove } from '@dnd-kit/sortable';

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
  assumptions: Assumption[];
  issues: Issue[];
  dependencies: Dependency[];
  kanbanColumns: KanbanColumn[];
  holidays: Holiday[];
  weeklyOffDays: number[];
  impactedSystems: ImpactedSystem[];
  
  // Story actions
  addStory: (story: Omit<Story, 'id' | 'storyId'>, prefix?: string) => Promise<boolean>;
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
  updateEmployeeLeaves: (employeeId: string, leaveDates: string[]) => Promise<boolean>;

  // TestCase actions
  addTestCase: (testCase: Omit<TestCase, 'id' | 'testCaseId'>) => Promise<boolean>;
  updateTestCase: (testCaseId: string, data: Partial<Omit<TestCase, 'id' | 'testCaseId'>>) => Promise<boolean>;
  deleteTestCase: (testCaseId: string) => Promise<boolean>;

  // Risk actions
  addRisk: (risk: Omit<Risk, 'id' | 'riskId'>) => Promise<boolean>;
  updateRisk: (riskId: string, data: Partial<Omit<Risk, 'id' | 'riskId'>>) => Promise<boolean>;
  deleteRisk: (riskId: string) => Promise<boolean>;
  
  // Assumption actions
  addAssumption: (assumption: Omit<Assumption, 'id' | 'assumptionId' | 'validationDate'> & { validationDate?: Date }) => Promise<boolean>;
  updateAssumption: (assumptionId: string, data: Partial<Omit<Assumption, 'id' | 'assumptionId'| 'validationDate'> & { validationDate?: Date }>) => Promise<boolean>;
  deleteAssumption: (assumptionId: string) => Promise<boolean>;

  // Issue actions
  addIssue: (issue: Omit<Issue, 'id' | 'issueId' | 'reportedDate' | 'resolvedDate'> & { reportedDate: Date, resolvedDate?: Date }) => Promise<boolean>;
  updateIssue: (issueId: string, data: Partial<Omit<Issue, 'id' | 'issueId' | 'reportedDate' | 'resolvedDate'> & { resolvedDate?: Date }>) => Promise<boolean>;
  deleteIssue: (issueId: string) => Promise<boolean>;

  // Dependency actions
  addDependency: (dependency: Omit<Dependency, 'id' | 'dependencyId' | 'expectedByDate'> & { expectedByDate: Date }) => Promise<boolean>;
  updateDependency: (dependencyId: string, data: Partial<Omit<Dependency, 'id' | 'dependencyId'| 'expectedByDate'> & { expectedByDate?: Date }>) => Promise<boolean>;
  deleteDependency: (dependencyId: string) => Promise<boolean>;

  // Kanban Column actions
  addKanbanColumn: (column: Omit<KanbanColumn, 'id' | 'isDefault' | 'isDoneColumn'>) => Promise<boolean>;
  updateKanbanColumn: (columnId: string, data: Partial<Omit<KanbanColumn, 'id'>>) => Promise<boolean>;
  deleteKanbanColumn: (columnId: string) => Promise<boolean>;
  updateKanbanColumnOrder: (oldIndex: number, newIndex: number) => Promise<boolean>;
  
  // Holiday/Settings actions
  setWeeklyOffDays: (days: number[]) => Promise<boolean>;
  addHoliday: (holiday: Omit<Holiday, 'id'>) => Promise<boolean>;
  updateHoliday: (id: string, data: Partial<Omit<Holiday, 'id'>>) => Promise<boolean>;
  deleteHoliday: (id: string) => Promise<boolean>;

  // Impacted System actions
  addImpactedSystem: (system: Omit<ImpactedSystem, 'id'>) => Promise<boolean>;
  updateImpactedSystem: (systemId: string, data: Partial<Omit<ImpactedSystem, 'id'>>) => Promise<boolean>;
  deleteImpactedSystem: (systemId: string) => Promise<boolean>;

  isLoading: boolean;
  error: string | null;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const defaultKanbanColumns: Omit<KanbanColumn, 'id'>[] = [
  { name: 'To Do', order: 0, isDefault: true, isDoneColumn: false },
  { name: 'In Progress', order: 1, isDefault: true, isDoneColumn: false },
  { name: 'Done', order: 2, isDefault: true, isDoneColumn: true },
];

export function ProjectProvider({ children }: PropsWithChildren) {
  const [epics, setEpics] = useState<Epic[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [kanbanColumns, setKanbanColumns] = useState<KanbanColumn[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [impactedSystems, setImpactedSystems] = useState<ImpactedSystem[]>([]);
  const [projectSettings, setProjectSettings] = useState<ProjectSettings>({ id: 'main', weeklyOffDays: [0, 6] });
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
        { name: 'assumptions', setState: setAssumptions },
        { name: 'issues', setState: setIssues },
        { name: 'dependencies', setState: setDependencies },
        { name: 'kanbanColumns', setState: setKanbanColumns },
        { name: 'holidays', setState: setHolidays },
        { name: 'impactedSystems', setState: setImpactedSystems },
    ];
    
    // Listener for project settings
    const settingsDocRef = doc(db, 'projectSettings', 'main');
    const unsubSettings = onSnapshot(settingsDocRef, (doc) => {
      if (doc.exists()) {
        setProjectSettings({ id: doc.id, ...doc.data() } as ProjectSettings);
      } else {
        // Initialize settings if they don't exist
        setDoc(settingsDocRef, { weeklyOffDays: [0, 6] }).catch(e => console.error("Failed to set default project settings", e));
      }
    });

    const unsubscribers = collections.map(({ name, setState }) => {
        const q = query(collection(db, name));
        return onSnapshot(q, 
            (querySnapshot) => {
                // Special handling for kanbanColumns to ensure defaults
                if (name === 'kanbanColumns' && querySnapshot.empty) {
                    const batch = writeBatch(db);
                    defaultKanbanColumns.forEach(col => {
                        const docRef = doc(collection(db, 'kanbanColumns'));
                        batch.set(docRef, col);
                    });
                    batch.commit().catch(e => console.error("Failed to set default Kanban columns", e));
                    return; // The snapshot listener will re-fire with the new data
                }

                const data = querySnapshot.docs.map(doc => {
                    const docData = doc.data();
                    const convertTimestamp = (field: any) => {
                      if (field && typeof field.toDate === 'function') {
                        return field.toDate().toISOString();
                      }
                      return field;
                    }
                    
                    const dateFields: Record<string, string[]> = {
                        stories: ['startDate', 'endDate'],
                        sprints: ['startDate', 'endDate'],
                        employees: ['onboardingDate', 'offloadingDate', 'leaveDates'],
                        assumptions: ['validationDate'],
                        issues: ['reportedDate', 'resolvedDate'],
                        dependencies: ['expectedByDate'],
                        holidays: ['date'],
                    };

                    if (dateFields[name]) {
                        dateFields[name].forEach(field => {
                            if (Array.isArray(docData[field])) {
                                docData[field] = docData[field].map(convertTimestamp);
                            } else {
                                docData[field] = convertTimestamp(docData[field]);
                            }
                        });
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

    return () => {
      unsubscribers.forEach(unsub => unsub());
      unsubSettings();
    }
  }, []);

  // One-time effect to assign random impacted systems to tasks that don't have one
  useEffect(() => {
    if (isLoading || impactedSystems.length === 0) return;

    const tasksWithoutSystem = stories.filter(
      (story) => story.itemType === 'Task' && !story.impactedSystemId
    );

    if (tasksWithoutSystem.length > 0) {
      const batch = writeBatch(db);
      tasksWithoutSystem.forEach((task) => {
        const randomSystem = impactedSystems[Math.floor(Math.random() * impactedSystems.length)];
        const taskRef = doc(db, 'stories', task.id);
        batch.update(taskRef, { impactedSystemId: randomSystem.id });
      });

      batch.commit().catch((err) => {
        console.error('Failed to assign random impacted systems to tasks:', err);
      });
    }
  }, [isLoading, stories, impactedSystems]);


  // Story Actions
  const addStory = async (story: Omit<Story, 'id' | 'storyId'>, prefixOverride?: string): Promise<boolean> => {
    if (!db) return false;
    try {
        const storiesSnapshot = await getDocs(collection(db, 'stories'));
        const newIdNumber = storiesSnapshot.size > 0
            ? Math.max(0, ...storiesSnapshot.docs
                .map(doc => doc.data().storyId)
                .filter((id: string | undefined) => id && typeof id === 'string')
                .map((id: string) => parseInt(id.replace(/^[A-Z]+-/, ''), 10) || 0)
            ) + 1
            : 1;

        const defaultPrefix = story.itemType === 'Task' ? 'TASK' : 'ST';
        const prefix = prefixOverride || defaultPrefix;
        const storyId = `${prefix}-${newIdNumber}`;

        const { startDate, endDate, ...rest } = story;
        const payload: any = { ...rest, storyId };
        if (startDate) payload.startDate = Timestamp.fromDate(new Date(startDate));
        if (endDate) payload.endDate = Timestamp.fromDate(new Date(endDate));


        // If it's a sub-item (Bug/Task) linked to a story, inherit the sprint
        if (['Bug', 'Task'].includes(story.itemType) && story.epicId) {
            const parentStory = stories.find(s => s.id === story.epicId);
            if (parentStory && parentStory.sprintId) {
                payload.sprintId = parentStory.sprintId;
            }
        }
        
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
      const { startDate, endDate, ...rest } = data;
      const payload: any = { ...rest };
      if (data.hasOwnProperty('startDate')) payload.startDate = startDate ? Timestamp.fromDate(new Date(startDate)) : null;
      if (data.hasOwnProperty('endDate')) payload.endDate = endDate ? Timestamp.fromDate(new Date(endDate)) : null;

      await updateDoc(doc(db, 'stories', storyId), sanitizeForFirestore(payload));
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

  const moveStoryToSprint = async (storyId: string, sprintId: string | null): Promise<boolean> => {
    if (!db) return false;
    try {
      const batch = writeBatch(db);
      const storyRef = doc(db, 'stories', storyId);
  
      // 1. Move the parent story
      batch.update(storyRef, { sprintId });
  
      // 2. Find and move all related sub-items (Bugs and Tasks)
      // Note: `epicId` on a Bug/Task is used to link to the parent Story ID
      const q = query(collection(db, 'stories'), where('epicId', '==', storyId));
      const subItemsSnapshot = await getDocs(q);
  
      subItemsSnapshot.forEach(subItemDoc => {
        batch.update(doc(db, 'stories', subItemDoc.id), { sprintId });
      });
  
      await batch.commit();
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to move story and sub-items to sprint.", { storyId, sprintId, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };
  
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

  const updateEmployeeLeaves = async (employeeId: string, leaveDates: string[]): Promise<boolean> => {
    if (!db) return false;
    try {
        const employeeRef = doc(db, 'employees', employeeId);
        await updateDoc(employeeRef, {
            leaveDates: leaveDates.map(date => Timestamp.fromDate(new Date(date)))
        });
        return true;
    } catch (e) {
        console.error("Firebase Error: Failed to update employee leaves.", e);
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
  
  // Assumption Actions
  const addAssumption = async (assumption: Omit<Assumption, 'id' | 'assumptionId' | 'validationDate'> & { validationDate?: Date }): Promise<boolean> => {
    if (!db) return false;
    try {
      const snapshot = await getDocs(collection(db, 'assumptions'));
      const newId = `A-${snapshot.size + 1}`;
      const payload: any = { ...assumption, assumptionId: newId };
      if (assumption.validationDate) payload.validationDate = Timestamp.fromDate(assumption.validationDate);
      await addDoc(collection(db, 'assumptions'), sanitizeForFirestore(payload));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to add assumption.", { code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  const updateAssumption = async (id: string, data: Partial<Omit<Assumption, 'id' | 'assumptionId'| 'validationDate'> & { validationDate?: Date }>): Promise<boolean> => {
    if (!db) return false;
    try {
      const { validationDate, ...rest } = data;
      const payload: any = { ...rest };
      if (data.hasOwnProperty('validationDate')) payload.validationDate = validationDate ? Timestamp.fromDate(validationDate) : null;
      await updateDoc(doc(db, 'assumptions', id), sanitizeForFirestore(payload));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to update assumption.", { id, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  const deleteAssumption = async (id: string): Promise<boolean> => {
    if (!db) return false;
    try {
      await deleteDoc(doc(db, 'assumptions', id));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to delete assumption.", { id, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  // Issue Actions
  const addIssue = async (issue: Omit<Issue, 'id' | 'issueId' | 'reportedDate' | 'resolvedDate'> & { reportedDate: Date, resolvedDate?: Date }): Promise<boolean> => {
    if (!db) return false;
    try {
      const snapshot = await getDocs(collection(db, 'issues'));
      const newId = `I-${snapshot.size + 1}`;
      const payload: any = { ...issue, issueId: newId };
      payload.reportedDate = Timestamp.fromDate(issue.reportedDate);
      if (issue.resolvedDate) payload.resolvedDate = Timestamp.fromDate(issue.resolvedDate);
      await addDoc(collection(db, 'issues'), sanitizeForFirestore(payload));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to add issue.", { code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  const updateIssue = async (id: string, data: Partial<Omit<Issue, 'id' | 'issueId' | 'reportedDate' | 'resolvedDate'> & { resolvedDate?: Date }>): Promise<boolean> => {
    if (!db) return false;
    try {
      const { resolvedDate, ...rest } = data;
      const payload: any = { ...rest };
      if (data.hasOwnProperty('resolvedDate')) payload.resolvedDate = resolvedDate ? Timestamp.fromDate(resolvedDate) : null;
      await updateDoc(doc(db, 'issues', id), sanitizeForFirestore(payload));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to update issue.", { id, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };
  
  const deleteIssue = async (id: string): Promise<boolean> => {
    if (!db) return false;
    try {
      await deleteDoc(doc(db, 'issues', id));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to delete issue.", { id, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  // Dependency Actions
  const addDependency = async (dependency: Omit<Dependency, 'id' | 'dependencyId' | 'expectedByDate'> & { expectedByDate: Date }): Promise<boolean> => {
    if (!db) return false;
    try {
      const snapshot = await getDocs(collection(db, 'dependencies'));
      const newId = `D-${snapshot.size + 1}`;
      const payload: any = { ...dependency, dependencyId: newId };
      payload.expectedByDate = Timestamp.fromDate(dependency.expectedByDate);
      await addDoc(collection(db, 'dependencies'), sanitizeForFirestore(payload));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to add dependency.", { code: e.code, message: e.message, fullError: e });
      return false;
    }
  };
  
  const updateDependency = async (id: string, data: Partial<Omit<Dependency, 'id' | 'dependencyId' | 'expectedByDate'> & { expectedByDate?: Date }>): Promise<boolean> => {
    if (!db) return false;
    try {
      const { expectedByDate, ...rest } = data;
      const payload: any = { ...rest };
      if (data.hasOwnProperty('expectedByDate')) payload.expectedByDate = expectedByDate ? Timestamp.fromDate(expectedByDate) : null;
      await updateDoc(doc(db, 'dependencies', id), sanitizeForFirestore(payload));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to update dependency.", { id, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  const deleteDependency = async (id: string): Promise<boolean> => {
     if (!db) return false;
    try {
      await deleteDoc(doc(db, 'dependencies', id));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to delete dependency.", { id, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  // Kanban Column Actions
  const addKanbanColumn = async (column: Omit<KanbanColumn, 'id' | 'isDefault' | 'isDoneColumn'>): Promise<boolean> => {
    if (!db) return false;
    try {
      const payload = { ...column, isDefault: false, isDoneColumn: false };
      await addDoc(collection(db, 'kanbanColumns'), sanitizeForFirestore(payload));
      return true;
    } catch (e) {
      console.error("Firebase Error: Failed to add Kanban column.", e);
      return false;
    }
  };
  
  const updateKanbanColumn = async (columnId: string, data: Partial<Omit<KanbanColumn, 'id'>>): Promise<boolean> => {
    if (!db) return false;
    try {
      const columnRef = doc(db, 'kanbanColumns', columnId);
      await updateDoc(columnRef, sanitizeForFirestore(data));
      return true;
    } catch (e) {
      console.error("Firebase Error: Failed to update Kanban column.", e);
      return false;
    }
  };

  const deleteKanbanColumn = async (columnId: string): Promise<boolean> => {
    if (!db) return false;
    try {
      await deleteDoc(doc(db, 'kanbanColumns', columnId));
      return true;
    } catch (e) {
      console.error("Firebase Error: Failed to delete Kanban column.", e);
      return false;
    }
  };

  const updateKanbanColumnOrder = async (oldIndex: number, newIndex: number): Promise<boolean> => {
    if (!db) return false;
    const sortedColumns = [...kanbanColumns].sort((a, b) => a.order - b.order);
    const movedColumns = arrayMove(sortedColumns, oldIndex, newIndex);
    
    // Optimistically update local state
    setKanbanColumns(movedColumns.map((col, index) => ({ ...col, order: index })));

    try {
        const batch = writeBatch(db);
        movedColumns.forEach((column, index) => {
            const docRef = doc(db, 'kanbanColumns', column.id);
            batch.update(docRef, { order: index });
        });
        await batch.commit();
        return true;
    } catch (e) {
        console.error("Firebase Error: Failed to update Kanban column order.", e);
        // Revert local state on error
        setKanbanColumns(sortedColumns);
        return false;
    }
  };

  // Holiday/Settings Actions
  const setWeeklyOffDays = async (days: number[]): Promise<boolean> => {
    if (!db) return false;
    try {
      const settingsRef = doc(db, 'projectSettings', 'main');
      await setDoc(settingsRef, { weeklyOffDays: days }, { merge: true });
      return true;
    } catch (e) {
      console.error("Firebase Error: Failed to set weekly off days.", e);
      return false;
    }
  };

  const addHoliday = async (holiday: Omit<Holiday, 'id'>): Promise<boolean> => {
    if (!db) return false;
    try {
      const payload: any = { ...holiday };
      if (holiday.date) payload.date = Timestamp.fromDate(new Date(holiday.date));
      await addDoc(collection(db, 'holidays'), sanitizeForFirestore(payload));
      return true;
    } catch (e) {
      console.error("Firebase Error: Failed to add holiday.", e);
      return false;
    }
  };

  const updateHoliday = async (id: string, data: Partial<Omit<Holiday, 'id'>>): Promise<boolean> => {
    if (!db) return false;
    try {
      const payload: any = { ...data };
      if (data.date) payload.date = Timestamp.fromDate(new Date(data.date));
      await updateDoc(doc(db, 'holidays', id), sanitizeForFirestore(payload));
      return true;
    } catch (e) {
      console.error("Firebase Error: Failed to update holiday.", e);
      return false;
    }
  };

  const deleteHoliday = async (id: string): Promise<boolean> => {
    if (!db) return false;
    try {
      await deleteDoc(doc(db, 'holidays', id));
      return true;
    } catch (e) {
      console.error("Firebase Error: Failed to delete holiday.", e);
      return false;
    }
  };

  // Impacted System Actions
  const addImpactedSystem = async (system: Omit<ImpactedSystem, 'id'>): Promise<boolean> => {
    if (!db) return false;
    try {
      await addDoc(collection(db, 'impactedSystems'), sanitizeForFirestore(system));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to add impacted system.", { code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  const updateImpactedSystem = async (systemId: string, data: Partial<Omit<ImpactedSystem, 'id'>>): Promise<boolean> => {
    if (!db) return false;
    try {
      await updateDoc(doc(db, 'impactedSystems', systemId), sanitizeForFirestore(data));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to update impacted system.", { id: systemId, code: e.code, message: e.message, fullError: e });
      return false;
    }
  };

  const deleteImpactedSystem = async (systemId: string): Promise<boolean> => {
    if (!db) return false;
    try {
      await deleteDoc(doc(db, 'impactedSystems', systemId));
      return true;
    } catch (e: any) {
      console.error("Firebase Error: Failed to delete impacted system.", { id: systemId, code: e.code, message: e.message, fullError: e });
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
    assumptions,
    issues,
    dependencies,
    kanbanColumns,
    holidays,
    weeklyOffDays: projectSettings.weeklyOffDays,
    impactedSystems,
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
    updateEmployeeLeaves,
    addTestCase,
    updateTestCase,
    deleteTestCase,
    addRisk,
    updateRisk,
    deleteRisk,
    addAssumption,
    updateAssumption,
    deleteAssumption,
    addIssue,
    updateIssue,
    deleteIssue,
    addDependency,
    updateDependency,
    deleteDependency,
    addKanbanColumn,
    updateKanbanColumn,
    deleteKanbanColumn,
    updateKanbanColumnOrder,
    setWeeklyOffDays,
    addHoliday,
    updateHoliday,
    deleteHoliday,
    addImpactedSystem,
    updateImpactedSystem,
    deleteImpactedSystem,
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

    
