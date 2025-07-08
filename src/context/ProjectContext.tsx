
'use client';

import { createContext, useContext, useState, type PropsWithChildren } from 'react';
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
  moveStoryToEpic: (storyId: string, epicId: string | null) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: PropsWithChildren) {
  const [epics, setEpics] = useState<Epic[]>(initialEpics);
  const [stories, setStories] = useState<Story[]>(initialStories);
  const [sprints, setSprints] = useState<Sprint[]>(initialSprints);

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
    setStories((prevStories) =>
      prevStories.map((story) =>
        story.id === storyId ? { ...story, epicId: epicId ?? undefined } : story
      )
    );
  };

  return (
    <ProjectContext.Provider value={{ epics, setEpics, stories, setStories, sprints, setSprints, moveStoryToSprint, moveStoryStatus, moveStoryToEpic }}>
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
