'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusCircle, ChevronDown, Trash2, Star } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Epic, Story, Sprint } from '@/types';
import { Badge } from '@/components/ui/badge';
import { useProject } from '@/context/ProjectContext';
import { Progress } from '@/components/ui/progress';

const epicFormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional(),
});

const storyFormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional(),
  epicId: z.string().optional(),
});

function StoryCard({
  story,
  sprints,
  epics,
  onMoveToSprint,
  onMoveToEpic,
}: {
  story: Story;
  sprints: Sprint[];
  epics: Epic[];
  onMoveToSprint: (storyId: string, sprintId: string | null) => void;
  onMoveToEpic: (storyId: string, epicId: string | null) => void;
}) {
  const epic = epics.find((e) => e.id === story.epicId);
  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="text-base">{story.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">{story.description}</p>
        {epic && <Badge variant="secondary">{epic.title}</Badge>}
      </CardContent>
      <CardContent className="flex justify-end items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Change Epic <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {story.epicId && (
              <DropdownMenuItem onClick={() => onMoveToEpic(story.id, null)}>
                Unassigned
              </DropdownMenuItem>
            )}
            {epics
              .filter((e) => e.id !== story.epicId)
              .map((epic) => (
                <DropdownMenuItem
                  key={epic.id}
                  onClick={() => onMoveToEpic(story.id, epic.id)}
                >
                  {epic.title}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Move to Sprint <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {story.sprintId !== null && (
              <DropdownMenuItem onClick={() => onMoveToSprint(story.id, null)}>
                Backlog
              </DropdownMenuItem>
            )}
            {sprints
              .filter((sprint) => sprint.id !== story.sprintId)
              .map((sprint) => (
                <DropdownMenuItem
                  key={sprint.id}
                  onClick={() => onMoveToSprint(story.id, sprint.id)}
                >
                  {sprint.title}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
}

export default function BacklogPage() {
  const { epics, setEpics, stories, setStories, sprints, setSprints, moveStoryToSprint, moveStoryToEpic } = useProject();
  const [addEpicOpen, setAddEpicOpen] = useState(false);
  const [addStoryOpen, setAddStoryOpen] = useState(false);
  const [sprintToDelete, setSprintToDelete] = useState<Sprint | null>(null);

  const epicForm = useForm<z.infer<typeof epicFormSchema>>({
    resolver: zodResolver(epicFormSchema),
    defaultValues: { title: '', description: '' },
  });

  const storyForm = useForm<z.infer<typeof storyFormSchema>>({
    resolver: zodResolver(storyFormSchema),
    defaultValues: { title: '', description: '', epicId: '' },
  });

  const handleAddSprint = () => {
    const newSprint: Sprint = {
      id: `sprint${sprints.length + 1}`,
      title: `Sprint ${sprints.length + 1}`,
      isCurrent: false,
    };
    setSprints([...sprints, newSprint]);
  };
  
  const handleDeleteSprint = (sprintId: string) => {
    setStories(
      stories.map((story) =>
        story.sprintId === sprintId ? { ...story, sprintId: null } : story
      )
    );
    setSprints(sprints.filter((sprint) => sprint.id !== sprintId));
  };
  
  const handleSetCurrentSprint = (sprintId: string) => {
    setSprints(
      sprints.map((sprint) => ({
        ...sprint,
        isCurrent: sprint.id === sprintId,
      }))
    );
  };

  const onAddEpicSubmit = (values: z.infer<typeof epicFormSchema>) => {
    const newEpic: Epic = {
      id: `epic${Date.now()}`,
      title: values.title,
      description: values.description || '',
    };
    setEpics([...epics, newEpic]);
    epicForm.reset();
    setAddEpicOpen(false);
  };

  const onAddStorySubmit = (values: z.infer<typeof storyFormSchema>) => {
    const newStory: Story = {
      id: `story${Date.now()}`,
      sprintId: null,
      title: values.title,
      description: values.description || '',
      epicId: values.epicId,
      status: 'To Do',
    };
    setStories([...stories, newStory]);
    storyForm.reset();
    setAddStoryOpen(false);
  };

  const backlogStories = stories.filter((story) => story.sprintId === null);

  const storiesByEpic = backlogStories.reduce((acc, story) => {
    const epicId = story.epicId || 'unassigned';
    if (!acc[epicId]) {
      acc[epicId] = [];
    }
    acc[epicId].push(story);
    return acc;
  }, {} as Record<string, Story[]>);

  const storiesInSprintToDelete = sprintToDelete ? stories.filter(story => story.sprintId === sprintToDelete.id).length : 0;

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 h-full flex flex-col">
        <PageHeader
          title="Product Backlog"
          description="Manage your epics, stories, and sprints."
        >
          <Dialog open={addEpicOpen} onOpenChange={setAddEpicOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Epic
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Epic</DialogTitle>
              </DialogHeader>
              <Form {...epicForm}>
                <form onSubmit={epicForm.handleSubmit(onAddEpicSubmit)} className="space-y-4">
                  <FormField
                    control={epicForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Epic title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={epicForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Describe the epic..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit">Create Epic</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          
          <Dialog open={addStoryOpen} onOpenChange={setAddStoryOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Story
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Story</DialogTitle>
              </DialogHeader>
              <Form {...storyForm}>
                <form onSubmit={storyForm.handleSubmit(onAddStorySubmit)} className="space-y-4">
                  <FormField
                    control={storyForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Story title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={storyForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Describe the story..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                      control={storyForm.control}
                      name="epicId"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Epic</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                              <SelectTrigger>
                                  <SelectValue placeholder="Assign to an epic" />
                              </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                              {epics.map(epic => (
                                  <SelectItem key={epic.id} value={epic.id}>{epic.title}</SelectItem>
                              ))}
                              </SelectContent>
                          </Select>
                          <FormMessage />
                          </FormItem>
                      )}
                  />
                  <DialogFooter>
                    <Button type="submit">Create Story</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Button onClick={handleAddSprint}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Sprint
          </Button>
        </PageHeader>

        <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
          {/* Backlog Column */}
          <div className="bg-muted/50 rounded-lg p-4 h-full flex flex-col w-[350px] md:w-[400px] flex-shrink-0">
            <h3 className="text-lg font-semibold mb-4 sticky top-0 bg-muted/50 pt-1 pb-3">
              Backlog
            </h3>
            <div className="overflow-y-auto flex-1 -mr-4 pr-4">
              <Accordion type="multiple" className="w-full">
                 {epics.map((epic) => {
                  const epicStories = stories.filter(story => story.epicId === epic.id);
                  const totalStories = epicStories.length;
                  const doneStories = epicStories.filter(s => s.status === 'Done').length;
                  const donePercentage = totalStories > 0 ? Math.round((doneStories / totalStories) * 100) : 0;
                  
                  const backlogStoriesInEpic = storiesByEpic[epic.id] || [];

                  return (
                      <AccordionItem value={epic.id} key={epic.id}>
                      <AccordionTrigger>
                          <div className="flex-1 text-left pr-2">
                              <span className="font-semibold">{epic.title}</span>
                               <div className="flex items-center gap-2 mt-2" title={`${doneStories} of ${totalStories} stories completed`}>
                                  <Progress value={donePercentage} className="h-2" />
                                  <span className="text-xs font-semibold text-muted-foreground">{donePercentage}%</span>
                              </div>
                          </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4">
                          {backlogStoriesInEpic.length > 0 ? (
                          backlogStoriesInEpic.map((story) => (
                              <StoryCard
                                  key={story.id}
                                  story={story}
                                  sprints={sprints}
                                  epics={epics}
                                  onMoveToSprint={moveStoryToSprint}
                                  onMoveToEpic={moveStoryToEpic}
                              />
                          ))
                          ) : (
                          <p className="text-sm text-muted-foreground italic px-2">
                              No stories from this epic are in the backlog.
                          </p>
                          )}
                      </AccordionContent>
                      </AccordionItem>
                  );
                })}
                {(storiesByEpic['unassigned'] || []).length > 0 && (
                  <AccordionItem value="unassigned" key="unassigned">
                    <AccordionTrigger>Unassigned Stories</AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      {(storiesByEpic['unassigned'] || []).map((story) => (
                        <StoryCard
                          key={story.id}
                          story={story}
                          sprints={sprints}
                          epics={epics}
                          onMoveToSprint={moveStoryToSprint}
                          onMoveToEpic={moveStoryToEpic}
                        />
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            </div>
          </div>

          {/* Sprint Columns */}
          {sprints.map((sprint) => (
            <div
              key={sprint.id}
              className="bg-muted/50 rounded-lg p-4 h-full flex flex-col w-[350px] md:w-[400px] flex-shrink-0"
            >
              <div className="flex justify-between items-center mb-4 sticky top-0 bg-muted/50 pt-1 pb-3">
                  <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{sprint.title}</h3>
                      {sprint.isCurrent && <Badge>Current</Badge>}
                  </div>
                  <div className="flex items-center">
                      <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSetCurrentSprint(sprint.id)}
                          disabled={sprint.isCurrent}
                          className="h-8 w-8"
                          aria-label="Set as current sprint"
                      >
                          <Star className={`h-4 w-4 ${sprint.isCurrent ? 'fill-yellow-400 text-yellow-500' : ''}`} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setSprintToDelete(sprint)} className="h-8 w-8">
                          <Trash2 className="h-4 w-4" />
                      </Button>
                  </div>
              </div>
              <div className="overflow-y-auto flex-1 -mr-4 pr-4 space-y-4">
                {stories
                  .filter((story) => story.sprintId === sprint.id)
                  .map((story) => (
                    <StoryCard
                      key={story.id}
                      story={story}
                      sprints={sprints}
                      epics={epics}
                      onMoveToSprint={moveStoryToSprint}
                      onMoveToEpic={moveStoryToEpic}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <AlertDialog open={!!sprintToDelete} onOpenChange={(isOpen) => !isOpen && setSprintToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {sprintToDelete && storiesInSprintToDelete > 0
                ? `This sprint contains ${storiesInSprintToDelete} ${storiesInSprintToDelete === 1 ? 'story' : 'stories'}. Deleting the sprint will move them back to the backlog. This action cannot be undone.`
                : 'This will permanently delete the sprint. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (sprintToDelete) {
                  handleDeleteSprint(sprintToDelete.id);
                  setSprintToDelete(null);
                }
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
