
'use client';

import { createContext, useContext, useState, useEffect, type PropsWithChildren } from 'react';
import type { Epic, Story, Sprint, StoryStatus, Employee } from '@/types';
import { 
  epics as initialEpics, 
  stories as initialStories, 
  sprints as initialSprints,
  employees as initialEmployees
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
  moveStoryToSprint: (storyId: string, sprintId: string | null) => void;
  moveStoryToEpic: (storyId: string, epicId: string | null) => void;
  moveStoryStatus: (storyId: string, newStatus: StoryStatus) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: PropsWithChildren) {
  const [epics, setEpics] = useState<Epic[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load data from localStorage on mount (client-side only)
  useEffect(() => {
    try {
      const storedEpics = window.localStorage.getItem('project_epics');
      setEpics(storedEpics ? JSON.parse(storedEpics) : initialEpics);
      
      const storedStories = window.localStorage.getItem('project_stories');
      setStories(storedStories ? JSON.parse(storedStories) : initialStories);

      const storedSprints = window.localStorage.getItem('project_sprints');
      setSprints(storedSprints ? JSON.parse(storedSprints) : initialSprints);

      const storedEmployees = window.localStorage.getItem('project_employees');
      setEmployees(storedEmployees ? JSON.parse(storedEmployees) : initialEmployees);

    } catch (error) {
      console.error("Failed to load data from localStorage, using initial data.", error);
      setEpics(initialEpics);
      setStories(initialStories);
      setSprints(initialSprints);
      setEmployees(initialEmployees);
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

  return (
    <ProjectContext.Provider value={{ epics, setEpics, stories, setStories, sprints, setSprints, employees, setEmployees, moveStoryToSprint, moveStoryStatus, moveStoryToEpic }}>
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
