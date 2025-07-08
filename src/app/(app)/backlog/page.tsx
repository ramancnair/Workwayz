
'use client';

import { useState, useEffect } from 'react';
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
  DialogDescription,
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
import { PlusCircle, ChevronDown, Trash2, Star, Edit } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Epic, Story, Sprint, Employee } from '@/types';
import { Badge } from '@/components/ui/badge';
import { useProject } from '@/context/ProjectContext';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const epicFormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional(),
});

const storyFormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
  epicId: z.string().optional(),
  assigneeId: z.string().optional(),
});

function StoryCard({
  story,
  epic,
  assignee,
  onClick,
}: {
  story: Story;
  epic?: Epic;
  assignee?: Employee;
  onClick: () => void;
}) {
  return (
    <Card
      className="bg-card cursor-pointer transition-all hover:bg-muted/80 hover:shadow-md"
      onClick={onClick}
    >
      <CardHeader className="p-4">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
             <p className="text-xs font-semibold text-muted-foreground">{story.storyId}</p>
             <p className="font-semibold break-words">{story.title}</p>
          </div>
          {assignee && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={assignee.avatar}
                      alt={`${assignee.firstName} ${assignee.lastName}`}
                      data-ai-hint="developer avatar"
                    />
                    <AvatarFallback>{assignee.firstName?.charAt(0)}</AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Assigned to {assignee.firstName} {assignee.lastName}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex justify-between items-center">
            {epic && <Badge variant="secondary">{epic.title}</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function BacklogPage() {
  const { epics, setEpics, stories, setStories, sprints, setSprints, employees, moveStoryToSprint, moveStoryToEpic } = useProject();
  const [addEpicOpen, setAddEpicOpen] = useState(false);
  const [addStoryOpen, setAddStoryOpen] = useState(false);
  const [sprintToDelete, setSprintToDelete] = useState<Sprint | null>(null);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);

  const developers = employees.filter(e => e.role === 'Developer');

  const epicForm = useForm<z.infer<typeof epicFormSchema>>({
    resolver: zodResolver(epicFormSchema),
    defaultValues: { title: '', description: '' },
  });

  const storyForm = useForm<z.infer<typeof storyFormSchema>>({
    resolver: zodResolver(storyFormSchema),
    defaultValues: { title: '', description: '', acceptanceCriteria: '', epicId: 'unassigned', assigneeId: 'unassigned' },
  });

  const editStoryForm = useForm<z.infer<typeof storyFormSchema>>({
    resolver: zodResolver(storyFormSchema),
  });

  useEffect(() => {
    if (selectedStory) {
      editStoryForm.reset({
        title: selectedStory.title,
        description: selectedStory.description || '',
        acceptanceCriteria: selectedStory.acceptanceCriteria || '',
        epicId: selectedStory.epicId || 'unassigned',
        assigneeId: selectedStory.assigneeId || 'unassigned',
      });
    }
  }, [selectedStory, editStoryForm]);

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
    const newIdNumber = stories.length > 0 
        ? Math.max(...stories.map(s => parseInt(s.storyId.replace('ST-', '')))) + 1
        : 1;

    const newStory: Story = {
      id: `story${Date.now()}`,
      storyId: `ST-${newIdNumber}`,
      sprintId: null,
      title: values.title,
      description: values.description || '',
      acceptanceCriteria: values.acceptanceCriteria,
      assigneeId: values.assigneeId === 'unassigned' ? undefined : values.assigneeId,
      epicId: values.epicId === 'unassigned' ? undefined : values.epicId,
      status: 'To Do',
    };
    setStories([...stories, newStory]);
    storyForm.reset();
    setAddStoryOpen(false);
  };
  
  const onEditStorySubmit = (values: z.infer<typeof storyFormSchema>) => {
    if (!selectedStory) return;

    setStories(currentStories =>
      currentStories.map(story =>
        story.id === selectedStory.id
          ? {
              ...story,
              title: values.title,
              description: values.description,
              acceptanceCriteria: values.acceptanceCriteria,
              assigneeId: values.assigneeId === 'unassigned' ? undefined : values.assigneeId,
              epicId: values.epicId === 'unassigned' ? undefined : values.epicId,
            }
          : story
      )
    );
    setSelectedStory(null);
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
            <DialogContent className="sm:max-w-[600px]">
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
                    name="acceptanceCriteria"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Acceptance Criteria</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Define acceptance criteria for this story..." {...field} />
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
                          <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                              <SelectTrigger>
                                  <SelectValue placeholder="Assign to an epic" />
                              </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {epics.map(epic => (
                                  <SelectItem key={epic.id} value={epic.id}>{epic.title}</SelectItem>
                              ))}
                              </SelectContent>
                          </Select>
                          <FormMessage />
                          </FormItem>
                      )}
                  />
                  <FormField
                      control={storyForm.control}
                      name="assigneeId"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Assignee</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                              <SelectTrigger>
                                  <SelectValue placeholder="Assign to a developer" />
                              </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {developers.map(dev => (
                                  <SelectItem key={dev.id} value={dev.id}>{dev.firstName} {dev.lastName}</SelectItem>
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
              <Accordion type="multiple" className="w-full" defaultValue={epics.map(e => e.id).concat('unassigned')}>
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
                              <div className="flex items-center justify-between">
                                <span className="font-semibold">{epic.title}</span>
                                <Badge variant="secondary">{totalStories} {totalStories === 1 ? 'story' : 'stories'}</Badge>
                              </div>
                               <div className="flex items-center gap-2 mt-2" title={`${doneStories} of ${totalStories} stories completed`}>
                                  <Progress value={donePercentage} className="h-2" />
                                  <span className="text-xs font-semibold text-muted-foreground">{donePercentage}%</span>
                              </div>
                          </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-2">
                          {backlogStoriesInEpic.length > 0 ? (
                          backlogStoriesInEpic.map((story) => {
                            const epic = epics.find((e) => e.id === story.epicId);
                            const assignee = employees.find((d) => d.id === story.assigneeId);
                            return (
                              <div key={story.id} className="relative group">
                                <StoryCard
                                    story={story}
                                    epic={epic}
                                    assignee={assignee}
                                    onClick={() => setSelectedStory(story)}
                                />
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="sm" className="h-7">
                                            Change Epic <ChevronDown className="ml-1 h-4 w-4" />
                                          </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => moveStoryToEpic(story.id, null)}>
                                          Unassigned
                                        </DropdownMenuItem>
                                        {epics
                                        .filter((e) => e.id !== story.epicId)
                                        .map((e) => (
                                            <DropdownMenuItem
                                            key={e.id}
                                            onClick={() => moveStoryToEpic(story.id, e.id)}
                                            >
                                            {e.title}
                                            </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            )
                          })
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
                    <AccordionTrigger>
                      <div className="flex justify-between items-center w-full">
                        <span>Unassigned Stories</span>
                        <Badge variant="secondary">{(storiesByEpic['unassigned'] || []).length} {(storiesByEpic['unassigned'] || []).length === 1 ? 'story' : 'stories'}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-2">
                      {(storiesByEpic['unassigned'] || []).map((story) => {
                          const epic = epics.find((e) => e.id === story.epicId);
                          const assignee = employees.find((d) => d.id === story.assigneeId);
                          return (
                             <div key={story.id} className="relative group">
                                <StoryCard
                                    story={story}
                                    epic={epic}
                                    assignee={assignee}
                                    onClick={() => setSelectedStory(story)}
                                />
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="sm" className="h-7">
                                            Change Epic <ChevronDown className="ml-1 h-4 w-4" />
                                          </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                         <DropdownMenuItem onClick={() => moveStoryToEpic(story.id, null)}>
                                          Unassigned
                                        </DropdownMenuItem>
                                        {epics
                                        .filter((e) => e.id !== story.epicId)
                                        .map((e) => (
                                            <DropdownMenuItem
                                            key={e.id}
                                            onClick={() => moveStoryToEpic(story.id, e.id)}
                                            >
                                            {e.title}
                                            </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                          )
                      })}
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
                       <TooltipProvider>
                         <Tooltip>
                          <TooltipTrigger asChild>
                            <span tabIndex={sprint.isCurrent ? -1 : 0}>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSprintToDelete(sprint)}
                                className="h-8 w-8"
                                disabled={sprint.isCurrent}
                                aria-label="Delete sprint"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {sprint.isCurrent && (
                            <TooltipContent>
                              <p>Cannot delete the current sprint.</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                       </TooltipProvider>
                  </div>
              </div>
              <div className="overflow-y-auto flex-1 -mr-4 pr-4 space-y-2">
                {stories
                  .filter((story) => story.sprintId === sprint.id)
                  .map((story) => {
                    const epic = epics.find((e) => e.id === story.epicId);
                    const assignee = employees.find((d) => d.id === story.assigneeId);
                    return (
                        <StoryCard
                            key={story.id}
                            story={story}
                            epic={epic}
                            assignee={assignee}
                            onClick={() => setSelectedStory(story)}
                        />
                    )
                  })}
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

      <Dialog open={!!selectedStory} onOpenChange={(isOpen) => !isOpen && setSelectedStory(null)}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedStory && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Story</DialogTitle>
                <DialogDescription>
                  Make changes to your story here. Click save when you're done.
                </DialogDescription>
              </DialogHeader>
              <Form {...editStoryForm}>
                <form onSubmit={editStoryForm.handleSubmit(onEditStorySubmit)} className="space-y-4">
                   <FormItem>
                    <FormLabel>Story ID</FormLabel>
                    <FormControl>
                      <Input readOnly value={selectedStory.storyId} />
                    </FormControl>
                  </FormItem>
                  <FormField
                    control={editStoryForm.control}
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
                    control={editStoryForm.control}
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
                    control={editStoryForm.control}
                    name="acceptanceCriteria"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Acceptance Criteria</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Define acceptance criteria for this story..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editStoryForm.control}
                    name="epicId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Epic</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Assign to an epic" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {epics.map((epic) => (
                              <SelectItem key={epic.id} value={epic.id}>
                                {epic.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editStoryForm.control}
                    name="assigneeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assignee</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Assign to a developer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {developers.map((dev) => (
                              <SelectItem key={dev.id} value={dev.id}>
                                {dev.firstName} {dev.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter className="sm:justify-between pt-4">
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                            Move to Sprint <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {selectedStory.sprintId !== null && (
                            <DropdownMenuItem onClick={() => {
                                moveStoryToSprint(selectedStory.id, null);
                                setSelectedStory(null);
                            }}>
                                Backlog
                            </DropdownMenuItem>
                            )}
                            {sprints
                            .filter((sprint) => sprint.id !== selectedStory.sprintId)
                            .map((sprint) => (
                                <DropdownMenuItem
                                key={sprint.id}
                                onClick={() => {
                                    moveStoryToSprint(selectedStory.id, sprint.id);
                                    setSelectedStory(null);
                                }}
                                >
                                {sprint.title}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                        </DropdownMenu>

                    <Button type="submit">Save Changes</Button>
                  </DialogFooter>
                </form>
              </Form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
