
'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import type { Story, Epic, StoryStatus, Employee, WorkItemType } from '@/types';
import { Columns, ChevronDown } from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Bug, CheckSquare, GitCommit, TrendingUp } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const workItemIcons: Record<WorkItemType, React.ElementType> = {
  Story: BookOpen,
  Bug: Bug,
  Task: CheckSquare,
  Change: GitCommit,
  Improvement: TrendingUp,
};

function StoryCard({ story, epic, onStatusChange }: { story: Story; epic?: Epic; onStatusChange: (newStatus: StoryStatus) => void; }) {

  const Icon = workItemIcons[story.itemType];
  return (
    <Card className="bg-card">
      <CardHeader>
        <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
            <p className="text-xs font-semibold text-muted-foreground">{story.storyId}</p>
        </div>
        <CardTitle className="text-base">{story.title}</CardTitle>
        <CardDescription>{story.description}</CardDescription>
      </CardHeader>
      <CardFooter className="flex justify-between items-center">
        {epic ? (
            <Badge variant="secondary">{epic.title}</Badge>
        ) : <div />}
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                Move <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {columns.filter(col => col !== story.status).map(col => (
                    <DropdownMenuItem key={col} onClick={() => onStatusChange(col)}>
                        Move to {col}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}

const columns: StoryStatus[] = ['To Do', 'In Progress', 'Done'];

export default function KanbanPage() {
  const { stories, epics, sprints, moveStoryStatus, employees } = useProject();
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('all');
  
  const currentSprint = sprints.find((s) => s.isCurrent);
  
  const baseSprintStories = currentSprint
      ? stories.filter((story) => story.sprintId === currentSprint.id)
      : [];

  const sprintStories = selectedAssigneeId === 'all'
    ? baseSprintStories
    : baseSprintStories.filter(story => story.assigneeId === selectedAssigneeId);

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

  const sprintAssigneeIds = new Set(baseSprintStories.map(story => story.assigneeId).filter(Boolean));
  const sprintAssignees = employees.filter(emp => sprintAssigneeIds.has(emp.id));

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 h-full flex flex-col">
      <PageHeader title={`Kanban Board: ${currentSprint.title}`} description={`Move work items to change their status.`}>
        <div className="flex items-center gap-2">
          <Label htmlFor="assignee-filter" className="text-sm font-medium">View by</Label>
          <Select value={selectedAssigneeId} onValueChange={setSelectedAssigneeId}>
            <SelectTrigger id="assignee-filter" className="w-[200px]">
              <SelectValue placeholder="Filter by assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              {sprintAssignees.map(employee => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PageHeader>
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
        {columns.map((status) => {
          const storiesInColumn = sprintStories.filter((story) => story.status === status);
          return (
            <div key={status} className="bg-muted/50 rounded-lg p-4 h-full flex flex-col">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Columns className="mr-2 h-5 w-5" />
                {status}
                <span className="ml-2 bg-primary text-primary-foreground h-6 w-6 rounded-full flex items-center justify-center text-sm">
                  {storiesInColumn.length}
                </span>
              </h3>
              <div className="flex-1 space-y-4 overflow-y-auto">
                {storiesInColumn.map((story) => {
                    const epic = epics.find(e => e.id === story.epicId);
                    return (
                      <StoryCard key={story.id} story={story} epic={epic} onStatusChange={(newStatus) => moveStoryStatus(story.id, newStatus)} />
                    );
                })}
              </div>
            </div>
        )})}
      </div>
    </div>
  );
}
