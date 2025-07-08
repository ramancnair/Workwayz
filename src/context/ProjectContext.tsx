'use client';

import { createContext, useContext, useState, useEffect, type PropsWithChildren } from 'react';
import type { Epic, Story, Sprint, StoryStatus } from '@/types';
import { epics as initialEpics, stories as initialStories, sprints as initialSprints } from '@/lib/mock-data';

interface ProjectContextType {
  epics: Epic[];
  setEpics: React.Dispatch<React.SetStateAction<Epic[]>>;
  stories: Story[];
  setStories: React.Dispatch<React.SetStateAction<Story[]>>;
  sprints: Sprint[];
  setSprints: React.Dispatch<React.SetStateAction<Sprint[]>>;
  moveStoryToSprint: (storyId: string, sprintId: string | null) => void;
  moveStoryStatus: (storyId: string, newStatus: StoryStatus) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: PropsWithChildren) {
  const [epics, setEpics] = useState<Epic[]>(initialEpics);
  const [stories, setStories] = useState<Story[]>(initialStories);
  const [sprints, setSprints] = useState<Sprint[]>(initialSprints);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load data from localStorage on mount (client-side only)
  useEffect(() => {
    try {
      const storedEpics = window.localStorage.getItem('project_epics');
      if (storedEpics) {
        setEpics(JSON.parse(storedEpics));
      }
      const storedStories = window.localStorage.getItem('project_stories');
      if (storedStories) {
        setStories(JSON.parse(storedStories));
      }
      const storedSprints = window.localStorage.getItem('project_sprints');
      if (storedSprints) {
        setSprints(JSON.parse(storedSprints));
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
    }
    setIsInitialized(true);
  }, []);

  // Save epics to localStorage when they change
  useEffect(() => {
    if (isInitialized) {
      window.localStorage.setItem('project_epics', JSON.stringify(epics));
    }
  }, [epics, isInitialized]);

  // Save stories to localStorage when they change
  useEffect(() => {
    if (isInitialized) {
      window.localStorage.setItem('project_stories', JSON.stringify(stories));
    }
  }, [stories, isInitialized]);

  // Save sprints to localStorage when they change
  useEffect(() => {
    if (isInitialized) {
      window.localStorage.setItem('project_sprints', JSON.stringify(sprints));
    }
  }, [sprints, isInitialized]);

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

  return (
    <ProjectContext.Provider value={{ epics, setEpics, stories, setStories, sprints, setSprints, moveStoryToSprint, moveStoryStatus }}>
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
