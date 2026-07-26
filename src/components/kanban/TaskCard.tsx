

'use client';

import React from 'react';
import { Card, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Story, Epic, WorkItemType } from '@/types';
import { BookOpen, Bug, CheckSquare, GitCommit } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const workItemIcons: Record<WorkItemType, React.ElementType> = {
  'Requirement/Story': BookOpen,
  Bug: Bug,
  'Task': CheckSquare,
  'Feature Change': GitCommit,
  'Sub Task': CheckSquare,
};

interface StoryCardProps {
  story: Story;
  epic?: Epic;
}

export function StoryCard({ story, epic }: StoryCardProps) {
  const Icon = workItemIcons[story.itemType];
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: story.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className="bg-card cursor-grab active:cursor-grabbing">
        <CardHeader className="p-4">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
            <p className="text-xs font-semibold text-muted-foreground">{story.storyId}</p>
          </div>
          <CardTitle className="text-base">{story.title}</CardTitle>
        </CardHeader>
        <CardFooter className="flex justify-between items-center p-4 pt-0">
          {epic ? <Badge variant="secondary">{epic.title}</Badge> : <div />}
        </CardFooter>
      </Card>
    </div>
  );
}
