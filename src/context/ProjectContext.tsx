
'use client';

import { createContext, useContext, useState, useEffect, type PropsWithChildren } from 'react';
import type { Epic, Story, Sprint, StoryStatus, Employee, TestCase } from '@/types';
import { 
    epics as mockEpics, 
    stories as mockStories, 
    sprints as mockSprints, 
    employees as mockEmployees, 
    testCases as mockTestCases 
} from '@/lib/mock-data';
import { v4 as uuidv4 } from 'uuid';

interface ProjectContextType {
  epics: Epic[];
  stories: Story[];
  sprints: Sprint[];
  employees: Employee[];
  testCases: TestCase[];
  
  // Story actions
  addStory: (story: Omit<Story, 'id' | 'storyId'>) => Promise<boolean>;
  updateStory: (storyId: string, data: Partial<Omit<Story, 'id'>>) => Promise<boolean>;
  deleteStory: (storyId: string) => Promise<boolean>;
  moveStoryToSprint: (storyId: string, sprintId: string | null) => Promise<boolean>;
  moveStoryStatus: (storyId: string, newStatus: StoryStatus) => Promise<boolean>;
  moveStoryToEpic: (storyId: string, epicId: string | null) => Promise<boolean>;

  // Epic actions
  addEpic: (epic: Omit<Epic, 'id'>) => Promise<boolean>;
  updateEpic: (epicId: string, data: Partial<Omit<Epic, 'id'>>) => Promise<boolean>;
  deleteEpic: (epicId: string) => Promise<boolean>;

  // Sprint actions
  addSprint: (sprint: Omit<Sprint, 'id' | 'isCurrent'>) => Promise<boolean>;
  updateSprint: (sprintId: string, data: Partial<Omit<Sprint, 'id' | 'isCurrent'>>) => Promise<boolean>;
  deleteSprint: (sprintId: string) => Promise<boolean>;
  setCurrentSprint: (sprintId: string) => Promise<boolean>;

  // Employee actions
  addEmployee: (employee: Omit<Employee, 'id'>) => Promise<boolean>;
  updateEmployee: (employeeId: string, data: Partial<Omit<Employee, 'id'>>) => Promise<boolean>;
  deleteEmployee: (employeeId: string) => Promise<boolean>;

  // TestCase actions
  addTestCase: (testCase: Omit<TestCase, 'id' | 'testCaseId'>) => Promise<boolean>;
  updateTestCase: (testCaseId: string, data: Partial<Omit<TestCase, 'id'>>) => Promise<boolean>;
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
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedEpics = localStorage.getItem('epics');
      const storedStories = localStorage.getItem('stories');
      const storedSprints = localStorage.getItem('sprints');
      const storedEmployees = localStorage.getItem('employees');
      const storedTestCases = localStorage.getItem('testCases');

      setEpics(storedEpics ? JSON.parse(storedEpics) : mockEpics);
      setStories(storedStories ? JSON.parse(storedStories) : mockStories);
      setSprints(storedSprints ? JSON.parse(storedSprints) : mockSprints);
      setEmployees(storedEmployees ? JSON.parse(storedEmployees) : mockEmployees);
      setTestCases(storedTestCases ? JSON.parse(storedTestCases) : mockTestCases);
    } catch (error) {
      console.error("Failed to load data from localStorage, falling back to mock data.", error);
      setEpics(mockEpics);
      setStories(mockStories);
      setSprints(mockSprints);
      setEmployees(mockEmployees);
      setTestCases(mockTestCases);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('epics', JSON.stringify(epics));
      localStorage.setItem('stories', JSON.stringify(stories));
      localStorage.setItem('sprints', JSON.stringify(sprints));
      localStorage.setItem('employees', JSON.stringify(employees));
      localStorage.setItem('testCases', JSON.stringify(testCases));
    }
  }, [epics, stories, sprints, employees, testCases, isLoaded]);

  const createAsyncCallback = <T extends any[], R>(fn: (...args: T) => R) => {
    return async (...args: T): Promise<R> => {
      try {
        return Promise.resolve(fn(...args));
      } catch (e) {
        console.error("Operation failed", e);
        throw e;
      }
    };
  };

  // Story Actions
  const addStory = createAsyncCallback((story: Omit<Story, 'id' | 'storyId'>) => {
    setStories(prev => {
        const newIdNumber =
        prev.length > 0
            ? Math.max(
                0,
                ...prev
                .map(doc => doc.storyId)
                .filter(id => id && typeof id === 'string')
                .map(id => parseInt(id.replace('ST-', ''), 10) || 0)
            ) + 1
            : 1;

        const newStory: Story = {
            ...story,
            id: uuidv4(),
            storyId: `ST-${newIdNumber}`,
        };
        return [...prev, newStory];
    });
    return true;
  });

  const updateStory = createAsyncCallback((storyId: string, data: Partial<Omit<Story, 'id'>>) => {
    setStories(prev => prev.map(s => s.id === storyId ? { ...s, ...data } : s));
    return true;
  });

  const deleteStory = createAsyncCallback((storyId: string) => {
    setStories(prev => prev.filter(s => s.id !== storyId));
    return true;
  });

  const moveStoryToSprint = createAsyncCallback((storyId: string, sprintId: string | null) => {
    setStories(prev => prev.map(s => s.id === storyId ? { ...s, sprintId } : s));
    return true;
  });

  const moveStoryStatus = createAsyncCallback((storyId: string, newStatus: StoryStatus) => {
    setStories(prev => prev.map(s => s.id === storyId ? { ...s, status: newStatus } : s));
    return true;
  });
  
  const moveStoryToEpic = createAsyncCallback((storyId: string, epicId: string | null) => {
    setStories(prev => prev.map(s => s.id === storyId ? { ...s, epicId: epicId || undefined } : s));
    return true;
  });

  // Epic Actions
  const addEpic = createAsyncCallback((epic: Omit<Epic, 'id'>) => {
    setEpics(prev => [...prev, { ...epic, id: uuidv4() }]);
    return true;
  });

  const updateEpic = createAsyncCallback((epicId: string, data: Partial<Omit<Epic, 'id'>>) => {
    setEpics(prev => prev.map(e => e.id === epicId ? { ...e, ...data } : e));
    return true;
  });

  const deleteEpic = createAsyncCallback((epicId: string) => {
    setEpics(prev => prev.filter(e => e.id !== epicId));
    setStories(prev => prev.map(s => s.epicId === epicId ? { ...s, epicId: undefined } : s));
    return true;
  });

  // Sprint Actions
  const addSprint = createAsyncCallback((sprint: Omit<Sprint, 'id' | 'isCurrent'>) => {
    const newSprint: Sprint = { ...sprint, id: uuidv4(), isCurrent: false };
    setSprints(prev => [...prev, newSprint]);
    return true;
  });

  const updateSprint = createAsyncCallback((sprintId: string, data: Partial<Omit<Sprint, 'id'>>) => {
    setSprints(prev => prev.map(s => s.id === sprintId ? { ...s, ...data } : s));
    return true;
  });

  const deleteSprint = createAsyncCallback((sprintId: string) => {
    setSprints(prev => prev.filter(s => s.id !== sprintId));
    setStories(prev => prev.map(s => s.sprintId === sprintId ? { ...s, sprintId: null } : s));
    return true;
  });

  const setCurrentSprint = createAsyncCallback((sprintId: string) => {
    setSprints(prev => prev.map(s => ({ ...s, isCurrent: s.id === sprintId })));
    return true;
  });

  // Employee Actions
  const addEmployee = createAsyncCallback((employee: Omit<Employee, 'id'>) => {
    setEmployees(prev => [...prev, { ...employee, id: uuidv4() }]);
    return true;
  });

  const updateEmployee = createAsyncCallback((employeeId: string, data: Partial<Omit<Employee, 'id'>>) => {
    setEmployees(prev => prev.map(e => e.id === employeeId ? { ...e, ...data } : e));
    return true;
  });
  
  const deleteEmployee = createAsyncCallback((employeeId: string) => {
    setEmployees(prev => prev.filter(e => e.id !== employeeId));
    return true;
  });

  // TestCase Actions
  const addTestCase = createAsyncCallback((testCase: Omit<TestCase, 'id' | 'testCaseId'>) => {
    setTestCases(prev => {
        const newIdNumber =
        prev.length > 0
            ? Math.max(
                0,
                ...prev
                .map(doc => doc.testCaseId)
                .filter(id => id && typeof id === 'string')
                .map(id => parseInt(id.replace('TC-', ''), 10) || 0)
            ) + 1
            : 1;

        const newTestCase: TestCase = {
            ...testCase,
            id: uuidv4(),
            testCaseId: `TC-${newIdNumber}`,
        };
        return [...prev, newTestCase];
    });
    return true;
  });

  const updateTestCase = createAsyncCallback((testCaseId: string, data: Partial<Omit<TestCase, 'id'>>) => {
    setTestCases(prev => prev.map(tc => tc.id === testCaseId ? { ...tc, ...data } : tc));
    return true;
  });

  const deleteTestCase = createAsyncCallback((testCaseId: string) => {
    setTestCases(prev => prev.filter(tc => tc.id !== testCaseId));
    return true;
  });
  
  const value: ProjectContextType = {
    epics,
    stories,
    sprints,
    employees,
    testCases,
    isLoading: !isLoaded,
    error: null,
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

  if (!isLoaded) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading project data...</p>
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
