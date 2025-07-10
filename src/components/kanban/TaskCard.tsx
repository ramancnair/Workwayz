

import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Story, Epic, WorkItemType } from '@/types';
import { PropsWithChildren } from 'react';
import { BookOpen, Bug, CheckSquare, GitCommit, TrendingUp } from 'lucide-react';

const workItemIcons: Record<WorkItemType, React.ElementType> = {
  Story: BookOpen,
  Bug: Bug,
  Task: CheckSquare,
  Change: GitCommit,
  Improvement: TrendingUp,
};

interface StoryCardProps extends PropsWithChildren {
  story: Story;
  epic?: Epic;
}

export function StoryCard({ story, epic, children }: StoryCardProps) {
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
        {children}
      </CardFooter>
    </Card>
  );
}
