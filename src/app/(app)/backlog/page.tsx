
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/PageHeader';
import { Button, buttonVariants } from '@/components/ui/button';
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
import { PlusCircle, ChevronDown, Trash2, Star, Edit, BookOpen, Bug, CheckSquare, GitCommit, TrendingUp } from 'lucide-react';
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
import type { Epic, Story, Sprint, Employee, WorkItemType } from '@/types';
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
import { cn } from '@/lib/utils';
import { DatePicker } from '@/components/ui/datepicker';
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast"

const workItemIcons: Record<WorkItemType, React.ElementType> = {
  Story: BookOpen,
  Bug: Bug,
  Task: CheckSquare,
  Change: GitCommit,
  Improvement: TrendingUp,
};

const workItemTypes: WorkItemType[] = ['Story', 'Bug', 'Task', 'Change', 'Improvement'];

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

const sprintFormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
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
  const Icon = workItemIcons[story.itemType];
  return (
    <Card
      className="bg-card cursor-pointer transition-all hover:bg-muted/80 hover:shadow-md"
      onClick={onClick}
    >
      <CardHeader className="p-4">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
              <p className="text-xs font-semibold text-muted-foreground">{story.storyId}</p>
            </div>
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
  const { 
    epics, 
    stories, 
    sprints, 
    employees, 
    moveStoryToSprint, 
    moveStoryToEpic, 
    deleteStory, 
    deleteEpic, 
    updateEpic, 
    updateSprint,
    addEpic,
    addSprint,
    deleteSprint,
    setCurrentSprint,
    addStory,
    updateStory,
  } = useProject();
  
  const { toast } = useToast();

  const [addEpicOpen, setAddEpicOpen] = useState(false);
  const [addStoryOpen, setAddStoryOpen] = useState(false);
  const [addSprintOpen, setAddSprintOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [editingEpic, setEditingEpic] = useState<Epic | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [sprintToDelete, setSprintToDelete] = useState<Sprint | null>(null);
  const [epicToDelete, setEpicToDelete] = useState<Epic | null>(null);
  const [deletingStory, setDeletingStory] = useState<Story | null>(null);
  
  const [itemTypeToAdd, setItemTypeToAdd] = useState<WorkItemType>('Story');
  const developers = employees.filter(e => e.role === 'Developer');

  const addEpicForm = useForm<z.infer<typeof epicFormSchema>>({
    resolver: zodResolver(epicFormSchema),
    defaultValues: { title: '', description: '' },
  });
  
  const editEpicForm = useForm<z.infer<typeof epicFormSchema>>({
    resolver: zodResolver(epicFormSchema),
  });

  const addStoryForm = useForm<z.infer<typeof storyFormSchema>>({
    resolver: zodResolver(storyFormSchema),
    defaultValues: { title: '', description: '', acceptanceCriteria: '', epicId: 'unassigned', assigneeId: 'unassigned' },
  });

  const editStoryForm = useForm<z.infer<typeof storyFormSchema>>({
    resolver: zodResolver(storyFormSchema),
  });

  const addSprintForm = useForm<z.infer<typeof sprintFormSchema>>({
    resolver: zodResolver(sprintFormSchema),
    defaultValues: { title: '' },
  });
  
  const editSprintForm = useForm<z.infer<typeof sprintFormSchema>>({
    resolver: zodResolver(sprintFormSchema),
  });

  useEffect(() => {
    if (!addEpicOpen) addEpicForm.reset({ title: '', description: '' });
  }, [addEpicOpen, addEpicForm]);

  useEffect(() => {
    if (editingEpic) {
      editEpicForm.reset(editingEpic);
    }
  }, [editingEpic, editEpicForm]);
  
  useEffect(() => {
    if (editingSprint) {
      editSprintForm.reset({
        title: editingSprint.title,
        startDate: editingSprint.startDate ? new Date(editingSprint.startDate) : undefined,
        endDate: editingSprint.endDate ? new Date(editingSprint.endDate) : undefined,
      });
    }
  }, [editingSprint, editSprintForm]);
  
  useEffect(() => {
    if (!addSprintOpen) {
      addSprintForm.reset({ title: `Sprint ${sprints.length + 1}`, startDate: undefined, endDate: undefined });
    }
  }, [addSprintOpen, sprints.length, addSprintForm]);

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
  
  useEffect(() => {
    if (!addStoryOpen) {
      addStoryForm.reset({ title: '', description: '', acceptanceCriteria: '', epicId: 'unassigned', assigneeId: 'unassigned' });
    }
  }, [addStoryOpen, addStoryForm]);

  const onAddSprintSubmit = async (values: z.infer<typeof sprintFormSchema>) => {
    setIsSubmitting(true);
    const success = await addSprint({
      title: values.title,
      startDate: values.startDate?.toISOString(),
      endDate: values.endDate?.toISOString(),
    });
    if (success) {
      setAddSprintOpen(false);
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not create sprint." });
    }
    setIsSubmitting(false);
  };
  
  const onEditSprintSubmit = async (values: z.infer<typeof sprintFormSchema>) => {
    if (!editingSprint) return;
    setIsSubmitting(true);
    const success = await updateSprint(editingSprint.id, {
      title: values.title,
      startDate: values.startDate?.toISOString(),
      endDate: values.endDate?.toISOString(),
    });
    if (success) {
      setEditingSprint(null);
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not update sprint." });
    }
    setIsSubmitting(false);
  };
  
  const onAddEpicSubmit = async (values: z.infer<typeof epicFormSchema>) => {
    setIsSubmitting(true);
    const success = await addEpic({
      title: values.title,
      description: values.description || '',
    });
    if (success) {
      setAddEpicOpen(false);
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not create epic." });
    }
    setIsSubmitting(false);
  };
  
  const onEditEpicSubmit = async (values: z.infer<typeof epicFormSchema>) => {
    if (!editingEpic) return;
    setIsSubmitting(true);
    const success = await updateEpic(editingEpic.id, values);
    if (success) {
      setEditingEpic(null);
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not update epic." });
    }
    setIsSubmitting(false);
  };

  const onAddStorySubmit = async (values: z.infer<typeof storyFormSchema>) => {
    setIsSubmitting(true);
    const newStory: Omit<Story, 'id' | 'storyId'> = {
      sprintId: null,
      title: values.title,
      description: values.description || '',
      itemType: itemTypeToAdd,
      acceptanceCriteria: values.acceptanceCriteria,
      assigneeId: values.assigneeId === 'unassigned' ? undefined : values.assigneeId,
      epicId: values.epicId === 'unassigned' ? undefined : values.epicId,
      status: 'To Do',
    };
    const success = await addStory(newStory);
    if (success) {
      setAddStoryOpen(false);
    } else {
      toast({ variant: "destructive", title: `Error Creating ${itemTypeToAdd}`, description: `Could not save your ${itemTypeToAdd.toLowerCase()}.` });
    }
    setIsSubmitting(false);
  };
  
  const onEditStorySubmit = async (values: z.infer<typeof storyFormSchema>) => {
    if (!selectedStory) return;
    setIsSubmitting(true);
    const success = await updateStory(selectedStory.id, {
        title: values.title,
        description: values.description,
        acceptanceCriteria: values.acceptanceCriteria,
        assigneeId: values.assigneeId === 'unassigned' ? undefined : values.assigneeId,
        epicId: values.epicId === 'unassigned' ? undefined : values.epicId,
    });
    if (success) {
      setSelectedStory(null);
    } else {
      toast({ variant: "destructive", title: `Error Editing ${selectedStory.itemType}`, description: "Could not save your changes." });
    }
    setIsSubmitting(false);
  };
  
  const handleDeleteStory = (storyId: string) => {
    setDeletingStory(null);
    deleteStory(storyId).then(success => {
        if (!success) toast({ variant: "destructive", title: "Error", description: "Could not delete story." });
    });
  };
    
  const handleDeleteSprint = (sprintId: string) => {
    setSprintToDelete(null);
    deleteSprint(sprintId).then(success => {
        if (!success) toast({ variant: "destructive", title: "Error", description: "Could not delete sprint." });
    });
  };
  
  const handleDeleteEpic = (epicId: string) => {
    setEpicToDelete(null);
    deleteEpic(epicId).then(success => {
        if (!success) toast({ variant: "destructive", title: "Error", description: "Could not delete epic." });
    });
  };

  const handleSetCurrentSprint = (sprintId: string) => {
    setCurrentSprint(sprintId).then(success => {
        if (!success) toast({ variant: "destructive", title: "Error", description: "Could not set current sprint." });
    });
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
  const storiesInEpicToDelete = epicToDelete ? stories.filter(story => story.epicId === epicToDelete.id).length : 0;

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
              <Form {...addEpicForm}>
                <form onSubmit={addEpicForm.handleSubmit(onAddEpicSubmit)} className="space-y-4">
                  <FormField
                    control={addEpicForm.control}
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
                    control={addEpicForm.control}
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
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Creating...' : 'Create Epic'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={addSprintOpen} onOpenChange={setAddSprintOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Sprint
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Sprint</DialogTitle>
                </DialogHeader>
                <Form {...addSprintForm}>
                    <form onSubmit={addSprintForm.handleSubmit(onAddSprintSubmit)} className="space-y-4">
                    <FormField
                        control={addSprintForm.control}
                        name="title"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                            <Input placeholder="Sprint title" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={addSprintForm.control}
                        name="startDate"
                        render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Start Date</FormLabel>
                            <DatePicker date={field.value} setDate={field.onChange} />
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={addSprintForm.control}
                        name="endDate"
                        render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>End Date</FormLabel>
                            <DatePicker date={field.value} setDate={field.onChange} />
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Creating...' : 'Create Sprint'}
                      </Button>
                    </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
          </Dialog>
          
          <Dialog open={addStoryOpen} onOpenChange={setAddStoryOpen}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Requirement
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {workItemTypes.map(itemType => (
                  <DropdownMenuItem key={itemType} onClick={() => { setItemTypeToAdd(itemType); setAddStoryOpen(true); addStoryForm.reset(); }}>
                    {itemType}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add New {itemTypeToAdd}</DialogTitle>
              </DialogHeader>
              <Form {...addStoryForm}>
                <form onSubmit={addStoryForm.handleSubmit(onAddStorySubmit)} className="space-y-4">
                  <FormField
                    control={addStoryForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder={`${itemTypeToAdd} title`} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addStoryForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder={`Describe the ${itemTypeToAdd.toLowerCase()}...`} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addStoryForm.control}
                    name="acceptanceCriteria"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Acceptance Criteria</FormLabel>
                        <FormControl>
                          <Textarea placeholder={`Define acceptance criteria for this ${itemTypeToAdd.toLowerCase()}...`} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                      control={addStoryForm.control}
                      name="epicId"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Epic</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
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
                      control={addStoryForm.control}
                      name="assigneeId"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Assignee</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
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
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Creating...' : `Create ${itemTypeToAdd}`}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
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
                           <div className="pt-4 px-4 flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setEditingEpic(epic)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Epic
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setEpicToDelete(epic)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Epic
                            </Button>
                          </div>
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
              <div className="flex justify-between items-center mb-2 sticky top-0 bg-muted/50 pt-1 pb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{sprint.title}</h3>
                        {sprint.isCurrent && <Badge>Current</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {sprint.startDate && sprint.endDate
                        ? `${format(new Date(sprint.startDate), 'MMM d')} - ${format(new Date(sprint.endDate), 'MMM d, yyyy')}`
                        : 'No dates set'}
                    </p>
                  </div>
                  <div className="flex items-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
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
                          </TooltipTrigger>
                          <TooltipContent><p>Set as current sprint</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setEditingSprint(sprint)} className="h-8 w-8">
                                <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Edit sprint</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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
                          {sprint.isCurrent ? (
                            <TooltipContent>
                              <p>Cannot delete the current sprint.</p>
                            </TooltipContent>
                          ) : (
                            <TooltipContent>
                              <p>Delete sprint</p>
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
              onClick={() => sprintToDelete && handleDeleteSprint(sprintToDelete.id)}
              className={cn(buttonVariants({ variant: 'destructive' }))}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!epicToDelete} onOpenChange={(isOpen) => !isOpen && setEpicToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
               {epicToDelete && storiesInEpicToDelete > 0
                ? `This epic contains ${storiesInEpicToDelete} ${storiesInEpicToDelete === 1 ? 'story' : 'stories'}. Deleting the epic will mark them as unassigned. This action cannot be undone.`
                : `This will permanently delete the epic "${epicToDelete?.title}". This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => epicToDelete && handleDeleteEpic(epicToDelete.id)}
               className={cn(buttonVariants({ variant: 'destructive' }))}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingStory} onOpenChange={(isOpen) => !isOpen && setDeletingStory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the story "{deletingStory?.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingStory && handleDeleteStory(deletingStory.id)}
               className={cn(buttonVariants({ variant: 'destructive' }))}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!selectedStory} onOpenChange={setSelectedStory}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedStory && (
            <>
              <DialogHeader>
                <DialogTitle>Edit {selectedStory.itemType}</DialogTitle>
                <DialogDescription>
                  Make changes to your {selectedStory.itemType.toLowerCase()} here. Click save when you're done.
                </DialogDescription>
              </DialogHeader>
              <Form {...editStoryForm}>
                <form onSubmit={editStoryForm.handleSubmit(onEditStorySubmit)} className="space-y-4">
                   <FormItem>
                    <FormLabel>ID</FormLabel>
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

                  <DialogFooter className="flex justify-between items-center pt-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => {
                              if (selectedStory) {
                                  setDeletingStory(selectedStory);
                                  setSelectedStory(null);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete {selectedStory.itemType}</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete {selectedStory.itemType}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <div className="flex items-center gap-2">
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
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </DialogFooter>
                </form>
              </Form>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!editingEpic} onOpenChange={setEditingEpic}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Epic</DialogTitle>
          </DialogHeader>
          <Form {...editEpicForm}>
            <form onSubmit={editEpicForm.handleSubmit(onEditEpicSubmit)} className="space-y-4">
              <FormField
                control={editEpicForm.control}
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
                control={editEpicForm.control}
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
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!editingSprint} onOpenChange={setEditingSprint}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Sprint</DialogTitle>
            </DialogHeader>
            <Form {...editSprintForm}>
                <form onSubmit={editSprintForm.handleSubmit(onEditSprintSubmit)} className="space-y-4">
                <FormField
                    control={editSprintForm.control}
                    name="title"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                        <Input placeholder="Sprint title" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={editSprintForm.control}
                    name="startDate"
                    render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Start Date</FormLabel>
                        <DatePicker date={field.value} setDate={field.onChange} />
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={editSprintForm.control}
                    name="endDate"
                    render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>End Date</FormLabel>
                        <DatePicker date={field.value} setDate={field.onChange} />
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>

    </>
  );
}
