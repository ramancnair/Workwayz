
'use client';

import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { StoryStatus } from '@/types';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const statusStyles: Record<StoryStatus, string> = {
  'To Do': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  'In Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Done': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

export default function BugListPage() {
  const { stories, employees } = useProject();
  const bugs = stories.filter(story => story.itemType === 'Bug');

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="Bug List" description="A list of all bugs reported in the project." />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Related Story</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bugs.map((bug) => {
              const assignee = employees.find(e => e.id === bug.assigneeId);
              const relatedStory = stories.find(s => s.id === bug.epicId); // Assuming epicId holds related story for now
              return (
                <TableRow key={bug.id}>
                  <TableCell className="font-medium">{bug.storyId}</TableCell>
                  <TableCell>{bug.title}</TableCell>
                  <TableCell>
                    <Badge className={cn('font-semibold', statusStyles[bug.status])}>
                      {bug.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={assignee.avatar} alt={`${assignee.firstName} ${assignee.lastName}`} data-ai-hint="developer avatar" />
                          <AvatarFallback>{assignee.firstName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {assignee.firstName} {assignee.lastName}
                      </div>
                    ) : "Unassigned"}
                  </TableCell>
                   <TableCell>
                    {relatedStory ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                              <Badge variant="secondary">{relatedStory.storyId}</Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{relatedStory.title}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ): 'N/A'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
