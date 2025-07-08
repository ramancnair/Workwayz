
'use client';

import { PageHeader } from '@/components/PageHeader';
import { StoryCard } from '@/components/kanban/TaskCard';
import type { StoryStatus } from '@/types';
import { Columns, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useProject } from '@/context/ProjectContext';

const columns: StoryStatus[] = ['To Do', 'In Progress', 'Done'];

export default function KanbanPage() {
  const { stories, epics, sprints, moveStoryStatus } = useProject();
  
  const currentSprint = sprints.find((s) => s.isCurrent);
  
  const sprintStories = currentSprint
      ? stories.filter((story) => story.sprintId === currentSprint.id)
      : [];
      
  if (!currentSprint) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 h-full flex flex-col">
        <PageHeader title="Kanban Board" description="No active sprint found."></PageHeader>
        <div className="flex flex-1 items-center justify-center bg-muted/50 rounded-lg">
            <p className="text-lg text-muted-foreground">There is no active sprint. Please set a current sprint in the backlog.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 h-full flex flex-col">
      <PageHeader title={`Kanban Board: ${currentSprint.title}`} description="Move stories to change their status." />
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
        {columns.map((status) => (
          <div key={status} className="bg-muted/50 rounded-lg p-4 h-full flex flex-col">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Columns className="mr-2 h-5 w-5" />
              {status}
              <span className="ml-2 bg-primary text-primary-foreground h-6 w-6 rounded-full flex items-center justify-center text-sm">
                {sprintStories.filter((story) => story.status === status).length}
              </span>
            </h3>
            <div className="flex-1 space-y-4 overflow-y-auto">
              {sprintStories
                .filter((story) => story.status === status)
                .map((story) => {
                  const epic = epics.find(e => e.id === story.epicId);
                  return (
                  <StoryCard key={story.id} story={story} epic={epic}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          Move to
                          <ChevronDown className="h-4 w-4 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {columns
                          .filter((col) => col !== story.status)
                          .map((col) => (
                            <DropdownMenuItem key={col} onClick={() => moveStoryStatus(story.id, col)}>
                              {col}
                            </DropdownMenuItem>
                          ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </StoryCard>
                )})}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
