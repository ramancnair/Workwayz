
'use client';

import { createContext, useContext, useState, useEffect, type PropsWithChildren } from 'react';
import type { Epic, Story, Sprint, StoryStatus, Employee, TestCase } from '@/types';
import { 
  epics as initialEpics, 
  stories as initialStories, 
  sprints as initialSprints,
  employees as initialEmployees,
  testCases as initialTestCases
} from '@/lib/mock-data';

interface ProjectContextType {
  epics: Epic[];
  setEpics: React.Dispatch<React.SetStateAction<Epic[]>>;
  stories: Story[];
  setStories: React.Dispatch<React.SetStateAction<Story[]>>;
  sprints: Sprint[];
  setSprints: React.Dispatch<React.SetStateAction<Sprint[]>>;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  testCases: TestCase[];
  setTestCases: React.Dispatch<React.SetStateAction<TestCase[]>>;
  moveStoryToSprint: (storyId: string, sprintId: string | null) => void;
  moveStoryToEpic: (storyId: string, epicId: string | null) => void;
  moveStoryStatus: (storyId: string, newStatus: StoryStatus) => void;
  deleteStory: (storyId: string) => void;
  deleteEpic: (epicId: string) => void;
  updateEpic: (epicId: string, data: Partial<Omit<Epic, 'id'>>) => void;
  updateSprint: (sprintId: string, data: Partial<Omit<Sprint, 'id'>>) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: PropsWithChildren) {
  const [epics, setEpics] = useState<Epic[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load data from localStorage on mount (client-side only)
  useEffect(() => {
    try {
      const storedEpics = window.localStorage.getItem('project_epics');
      setEpics(storedEpics ? JSON.parse(storedEpics) : initialEpics);
      
      const storedStories = window.localStorage.getItem('project_stories');
      const parsedStories = storedStories ? JSON.parse(storedStories) : initialStories;
      const migratedStories = parsedStories.map((story: Story) => ({
        ...story,
        itemType: story.itemType || 'Story',
      }));
      setStories(migratedStories);

      const storedSprints = window.localStorage.getItem('project_sprints');
      setSprints(storedSprints ? JSON.parse(storedSprints) : initialSprints);

      const storedEmployees = window.localStorage.getItem('project_employees');
      setEmployees(storedEmployees ? JSON.parse(storedEmployees) : initialEmployees);
      
      const storedTestCases = window.localStorage.getItem('project_test_cases');
      setTestCases(storedTestCases ? JSON.parse(storedTestCases) : initialTestCases);

    } catch (error) {
      console.error("Failed to load data from localStorage, using initial data.", error);
      setEpics(initialEpics);
      setStories(initialStories);
      setSprints(initialSprints);
      setEmployees(initialEmployees);
      setTestCases(initialTestCases);
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      window.localStorage.setItem('project_epics', JSON.stringify(epics));
    }
  }, [epics, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      window.localStorage.setItem('project_stories', JSON.stringify(stories));
    }
  }, [stories, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      window.localStorage.setItem('project_sprints', JSON.stringify(sprints));
    }
  }, [sprints, isInitialized]);
  
  useEffect(() => {
    if (isInitialized) {
      window.localStorage.setItem('project_employees', JSON.stringify(employees));
    }
  }, [employees, isInitialized]);
  
  useEffect(() => {
    if (isInitialized) {
      window.localStorage.setItem('project_test_cases', JSON.stringify(testCases));
    }
  }, [testCases, isInitialized]);


  const moveStoryToSprint = (storyId: string, sprintId: string | null) => {
    setStories((prevStories) =>
      prevStories.map((story) =>
        story.id === storyId ? { ...story, sprintId } : story
      )
    );
  };

  const moveStoryStatus = (storyId: string, newStatus: StoryStatus) => {
    setStories((prevStories) =>
      prevStories.map((story) =>
        story.id === storyId ? { ...story, status: newStatus } : story
      )
    );
  };
  
  const moveStoryToEpic = (storyId: string, epicId: string | null) => {
    setStories(prevStories => 
      prevStories.map(story => 
        story.id === storyId ? { ...story, epicId: epicId || undefined } : story
      )
    );
  };

  const deleteStory = (storyId: string) => {
    setStories((prevStories) =>
      prevStories.filter((story) => story.id !== storyId)
    );
  };

  const deleteEpic = (epicId: string) => {
    // Set stories with this epicId to unassigned
    setStories(prevStories =>
      prevStories.map(story =>
        story.epicId === epicId ? { ...story, epicId: undefined } : story
      )
    );
    // Remove the epic
    setEpics(prevEpics => prevEpics.filter(epic => epic.id !== epicId));
  };

  const updateEpic = (epicId: string, data: Partial<Omit<Epic, 'id'>>) => {
    setEpics(prevEpics =>
      prevEpics.map(epic => (epic.id === epicId ? { ...epic, ...data } : epic))
    );
  };

  const updateSprint = (sprintId: string, data: Partial<Omit<Sprint, 'id'>>) => {
    setSprints(prevSprints =>
      prevSprints.map(sprint => (sprint.id === sprintId ? { ...sprint, ...data } : sprint))
    );
  };

  return (
    <ProjectContext.Provider value={{ epics, setEpics, stories, setStories, sprints, setSprints, employees, setEmployees, testCases, setTestCases, moveStoryToSprint, moveStoryStatus, moveStoryToEpic, deleteStory, deleteEpic, updateEpic, updateSprint }}>
      {isInitialized ? children : null}
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
