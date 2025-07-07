import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Task } from '@/types';
import { PropsWithChildren } from 'react';

interface TaskCardProps extends PropsWithChildren {
  task: Task;
}

export function TaskCard({ task, children }: TaskCardProps) {
  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="text-base">{task.title}</CardTitle>
        <CardDescription>{task.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={task.assignee.avatar} alt={task.assignee.name} data-ai-hint="developer avatar" />
              <AvatarFallback>{task.assignee.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{task.assignee.name}</span>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Badge variant="secondary">{task.storyId}</Badge>
        {children}
      </CardFooter>
    </Card>
  );
}
