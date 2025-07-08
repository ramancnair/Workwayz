
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Story, Epic } from '@/types';
import { PropsWithChildren } from 'react';

interface StoryCardProps extends PropsWithChildren {
  story: Story;
  epic?: Epic;
}

export function StoryCard({ story, epic, children }: StoryCardProps) {
  return (
    <Card className="bg-card">
      <CardHeader>
        <p className="text-xs font-semibold text-muted-foreground">{story.storyId}</p>
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
