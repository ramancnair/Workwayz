

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
import { PlusCircle, ChevronDown, Trash2, Star, Edit, BookOpen, Bug, CheckSquare, GitCommit, TrendingUp, Clock, CornerDownRight, ThumbsUp, ChevronsRight } from 'lucide-react';
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
import type { Epic, Story, Sprint, Employee, WorkItemType, BugCriticality } from '@/types';
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
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const workItemIcons: Record<WorkItemType, React.ElementType> = {
  Story: BookOpen,
  Bug: Bug,
  Task: CheckSquare,
  Change: GitCommit,
  Improvement: TrendingUp,
};

const workItemTypes: WorkItemType[] = ['Story', 'Bug', 'Task', 'Change', 'Improvement'];
const bugCriticalities: BugCriticality[] = ['Low', 'Medium', 'High', 'Critical'];

const epicFormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional(),
});

const storyFormSchema = z.object({
  itemType: z.enum(workItemTypes),
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
  epicId: z.string().optional(),
  parentStoryId: z.string().optional(),
  assigneeId: z.string().optional(),
  estimatedHours: z.coerce.number().optional(),
  criticality: z.enum(bugCriticalities).optional(),
  releaseId: z.string().optional(),
});

const sprintFormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

function StoryCard({ story, epic, assignee, onClick, className }: { story: Story; epic?: Epic; assignee?: Employee; onClick: () => void; className?: string; }) {
  const Icon = workItemIcons[story.itemType];

  return (
    <Card
      className={cn("bg-card cursor-pointer transition-all hover:bg-muted/80 hover:shadow-md", className)}
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
          {story.estimatedHours !== undefined && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{story.estimatedHours}h</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SubItemsDisplay({ items, onCardClick, employees, title }: { items: Story[], onCardClick: (story: Story) => void, employees: Employee[], title: string }) {
    if (items.length === 0) return null;

    return (
        <Collapsible>
            <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start mt-1 text-xs text-muted-foreground">
                    <ChevronsRight className="h-4 w-4 mr-2" />
                    {items.length} {title}
                </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="pl-6 pt-2 space-y-2">
                    {items.map(subItem => {
                        const subItemAssignee = employees.find((d) => d.id === subItem.assigneeId);
                        return (
                            <div key={subItem.id} className="flex items-start gap-2">
                                <CornerDownRight className="h-4 w-4 mt-5 text-muted-foreground" />
                                <div className="flex-1">
                                    <StoryCard
                                        story={subItem}
                                        assignee={subItemAssignee}
                                        onClick={() => onCardClick(subItem)}
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}


export default function BacklogPage() {
  const { 
    epics, 
    stories, 
    sprints, 
    employees, 
    releasesAndMilestones,
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
    projectSettings,
  } = useProject();
  
  const { toast } = useToast();

  const [addEpicOpen, setAddEpicOpen] = useState(false);
  const [addRequirementOpen, setAddRequirementOpen] = useState(false);
  const [addSprintOpen, setAddSprintOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [editingEpic, setEditingEpic] = useState<Epic | null>(null);
  
  const [isAddEpicSubmitting, setAddEpicSubmitting] = useState(false);
  const [isEditEpicSubmitting, setEditEpicSubmitting] = useState(false);
  const [isAddSprintSubmitting, setAddSprintSubmitting] = useState(false);
  const [isEditSprintSubmitting, setEditSprintSubmitting] = useState(false);
  const [isAddStorySubmitting, setAddStorySubmitting] = useState(false);
  const [isEditStorySubmitting, setEditStorySubmitting] = useState(false);

  const [sprintToDelete, setSprintToDelete] = useState<Sprint | null>(null);
  const [epicToDelete, setEpicToDelete] = useState<Epic | null>(null);
  const [deletingStory, setDeletingStory] = useState<Story | null>(null);

  const releases = releasesAndMilestones.filter(r => r.itemType === 'Release');
  
  const addEpicForm = useForm<z.infer<typeof epicFormSchema>>({
    resolver: zodResolver(epicFormSchema),
    defaultValues: { title: '', description: '' },
  });
  
  const editEpicForm = useForm<z.infer<typeof epicFormSchema>>({
    resolver: zodResolver(epicFormSchema),
  });

  const addStoryForm = useForm<z.infer<typeof storyFormSchema>>({
    resolver: zodResolver(storyFormSchema),
    defaultValues: { itemType: 'Story', title: '', description: '', acceptanceCriteria: '', epicId: 'unassigned', parentStoryId: 'unassigned', assigneeId: 'unassigned', estimatedHours: 0, criticality: 'Medium', releaseId: 'unassigned' },
  });
  
  const watchedItemType = useWatch({ control: addStoryForm.control, name: 'itemType' });

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
    if (!addEpicOpen) {
      addEpicForm.reset();
      setAddEpicSubmitting(false);
    }
  }, [addEpicOpen, addEpicForm]);

  useEffect(() => {
    if (!editingEpic) {
      setEditEpicSubmitting(false);
    } else {
      editEpicForm.reset(editingEpic);
    }
  }, [editingEpic, editEpicForm]);
  
  useEffect(() => {
    if (!editingSprint) {
      setEditSprintSubmitting(false);
    } else {
       editSprintForm.reset({
        title: editingSprint.title,
        startDate: editingSprint.startDate ? format(new Date(editingSprint.startDate), 'yyyy-MM-dd') : '',
        endDate: editingSprint.endDate ? format(new Date(editingSprint.endDate), 'yyyy-MM-dd') : '',
      });
    }
  }, [editingSprint, editSprintForm]);
  
  useEffect(() => {
    if (addSprintOpen) {
      const { sprintDurationInWeeks = 2, sprintStartDay = 1 } = projectSettings || {};
      const latestSprintEnd = sprints.length > 0 
        ? new Date(Math.max(...sprints.map(s => s.endDate ? new Date(s.endDate).getTime() : 0)))
        : new Date();

      let nextStartDate = new Date(latestSprintEnd);
      if (sprints.length > 0) {
        nextStartDate.setDate(nextStartDate.getDate() + 1);
      }
      
      while (nextStartDate.getDay() !== sprintStartDay) {
        nextStartDate.setDate(nextStartDate.getDate() + 1);
      }

      const nextEndDate = new Date(nextStartDate);
      nextEndDate.setDate(nextStartDate.getDate() + (sprintDurationInWeeks * 7) - 1);
      
      addSprintForm.reset({ 
        title: `Sprint ${sprints.length + 1}`,
        startDate: format(nextStartDate, 'yyyy-MM-dd'),
        endDate: format(nextEndDate, 'yyyy-MM-dd'),
       });
    } else {
      addSprintForm.reset();
      setAddSprintSubmitting(false);
    }
  }, [addSprintOpen, sprints, projectSettings, addSprintForm]);

  useEffect(() => {
    if (!selectedStory) {
      setEditStorySubmitting(false);
    } else {
      editStoryForm.reset({
        itemType: selectedStory.itemType,
        title: selectedStory.title,
        description: selectedStory.description || '',
        acceptanceCriteria: selectedStory.acceptanceCriteria || '',
        epicId: selectedStory.itemType === 'Story' ? selectedStory.epicId || 'unassigned' : undefined,
        parentStoryId: selectedStory.itemType !== 'Story' ? selectedStory.epicId || 'unassigned' : undefined,
        assigneeId: selectedStory.assigneeId || 'unassigned',
        estimatedHours: selectedStory.estimatedHours,
        criticality: selectedStory.criticality || 'Medium',
        releaseId: selectedStory.releaseId || 'unassigned',
      });
    }
  }, [selectedStory, editStoryForm]);
  
  useEffect(() => {
    if (!addRequirementOpen) {
      addStoryForm.reset();
      setAddStorySubmitting(false);
    }
  }, [addRequirementOpen, addStoryForm]);

  const onAddSprintSubmit = async (values: z.infer<typeof sprintFormSchema>) => {
    setAddSprintSubmitting(true);
    const success = await addSprint({
      title: values.title,
      startDate: values.startDate ? new Date(values.startDate) : undefined,
      endDate: values.endDate ? new Date(values.endDate) : undefined,
    });
    if (success) {
      setAddSprintOpen(false);
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not create sprint." });
    }
    setAddSprintSubmitting(false);
  };
  
  const onEditSprintSubmit = async (values: z.infer<typeof sprintFormSchema>) => {
    if (!editingSprint) return;
    setEditSprintSubmitting(true);
    const success = await updateSprint(editingSprint.id, {
      title: values.title,
      startDate: values.startDate ? new Date(values.startDate) : undefined,
      endDate: values.endDate ? new Date(values.endDate) : undefined,
    });
    if (success) {
      setEditingSprint(null);
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not update sprint." });
    }
    setEditSprintSubmitting(false);
  };
  
  const onAddEpicSubmit = async (values: z.infer<typeof epicFormSchema>) => {
    setAddEpicSubmitting(true);
    const success = await addEpic({
      title: values.title,
      description: values.description || '',
    });
    if (success) {
      setAddEpicOpen(false);
    } else {
      toast({ variant: "destructive", title: "Error", description: `Epic "${values.title}" already exists.` });
    }
    setAddEpicSubmitting(false);
  };
  
  const onEditEpicSubmit = async (values: z.infer<typeof epicFormSchema>) => {
    if (!editingEpic) return;
    setEditEpicSubmitting(true);
    const success = await updateEpic(editingEpic.id, values);
    if (success) {
      setEditingEpic(null);
    } else {
      toast({ variant: "destructive", title: "Error", description: `Epic "${values.title}" already exists.` });
    }
    setEditEpicSubmitting(false);
  };

  const onAddStorySubmit = async (values: z.infer<typeof storyFormSchema>) => {
    setAddStorySubmitting(true);
    
    const newStory: Omit<Story, 'id' | 'storyId'> = {
      sprintId: null,
      title: values.title,
      description: values.description || '',
      itemType: values.itemType,
      acceptanceCriteria: values.acceptanceCriteria,
      assigneeId: values.assigneeId === 'unassigned' ? undefined : values.assigneeId,
      epicId: values.itemType === 'Story' 
        ? (values.epicId === 'unassigned' ? undefined : values.epicId)
        : (values.parentStoryId === 'unassigned' ? undefined : values.parentStoryId),
      status: 'To Do',
      estimatedHours: values.estimatedHours,
      criticality: values.itemType === 'Bug' ? values.criticality : undefined,
      releaseId: values.releaseId === 'unassigned' ? undefined : values.releaseId,
    };
    const success = await addStory(newStory);
    if (success) {
      setAddRequirementOpen(false);
    } else {
      toast({ variant: "destructive", title: `Error Creating ${values.itemType}`, description: `Could not save your ${values.itemType.toLowerCase()}.` });
    }
    setAddStorySubmitting(false);
  };
  
  const onEditStorySubmit = async (values: z.infer<typeof storyFormSchema>) => {
    if (!selectedStory) return;
    setEditStorySubmitting(true);
    
    const success = await updateStory(selectedStory.id, {
        title: values.title,
        description: values.description,
        acceptanceCriteria: values.acceptanceCriteria,
        assigneeId: values.assigneeId === 'unassigned' ? undefined : values.assigneeId,
        epicId: selectedStory.itemType === 'Story' 
            ? (values.epicId === 'unassigned' ? undefined : values.epicId) 
            : (values.parentStoryId === 'unassigned' ? undefined : values.parentStoryId),
        estimatedHours: values.estimatedHours,
        criticality: selectedStory.itemType === 'Bug' ? values.criticality : undefined,
        releaseId: values.releaseId === 'unassigned' ? undefined : values.releaseId,
    });
    if (success) {
      setSelectedStory(null);
    } else {
      toast({ variant: "destructive", title: `Error Editing ${selectedStory.itemType}`, description: "Could not save your changes." });
    }
    setEditStorySubmitting(false);
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

  const backlogStories = stories.filter((story) => story.sprintId === null || story.sprintId === undefined);
  
  const subItemsByParentId = stories.reduce((acc, story) => {
      if (['Bug', 'Task', 'Change', 'Improvement'].includes(story.itemType) && story.epicId) {
          if (!acc[story.epicId]) {
              acc[story.epicId] = [];
          }
          acc[story.epicId].push(story);
      }
      return acc;
  }, {} as Record<string, Story[]>);

  const backlogItemsByEpic = backlogStories.reduce((acc, story) => {
    // Exclude sub-items from top-level grouping if their parent is also in the backlog
    if (['Bug', 'Task', 'Change', 'Improvement'].includes(story.itemType) && story.epicId && backlogStories.some(s => s.id === story.epicId)) {
        return acc;
    }

    const key = story.epicId || 'unassigned';
    if (!acc[key]) {
        acc[key] = [];
    }
    acc[key].push(story);
    return acc;
  }, {} as Record<string, Story[]>);
  
  const epicsAndUnassigned = useMemo(() => {
    const epicMap: Record<string, Epic> = {};
    epics.forEach(e => {
        epicMap[e.id] = e;
    });

    const unassignedStories = backlogItemsByEpic['unassigned'] || [];
    if (unassignedStories.length > 0) {
        epicMap['unassigned'] = { id: 'unassigned', title: 'Unassigned', description: 'Items not assigned to any epic.' };
    }

    return Object.values(epicMap).sort((a, b) => {
        if (a.id === 'unassigned') return 1;
        if (b.id === 'unassigned') return -1;
        return a.title.localeCompare(b.title);
    });
  }, [epics, backlogItemsByEpic]);
  
  const storiesInSprintToDelete = sprintToDelete ? stories.filter(story => story.sprintId === sprintToDelete.id).length : 0;
  const storiesInEpicToDelete = epicToDelete ? stories.filter(story => story.epicId === epicToDelete.id).length : 0;
  
  const selectedStorySubItems = selectedStory && subItemsByParentId[selectedStory.id] ? subItemsByParentId[selectedStory.id] : [];

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
                    <Button type="submit" disabled={isAddEpicSubmitting}>
                      {isAddEpicSubmitting ? 'Creating...' : 'Create Epic'}
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
                        <FormItem>
                            <FormLabel>Start Date</FormLabel>
                            <FormControl>
                                <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={addSprintForm.control}
                        name="endDate"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>End Date</FormLabel>
                            <FormControl>
                                <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={isAddSprintSubmitting}>
                        {isAddSprintSubmitting ? 'Creating...' : 'Create Sprint'}
                      </Button>
                    </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
          </Dialog>
          
          <Dialog open={addRequirementOpen} onOpenChange={setAddRequirementOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Requirement
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Add New Requirement</DialogTitle>
              </DialogHeader>
              <Form {...addStoryForm}>
                <form onSubmit={addStoryForm.handleSubmit(onAddStorySubmit)} className="space-y-4">
                  <FormField
                    control={addStoryForm.control}
                    name="itemType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a requirement type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {workItemTypes.map(itemType => (
                              <SelectItem key={itemType} value={itemType}>
                                {itemType}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addStoryForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder={`${watchedItemType} title`} {...field} />
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
                          <Textarea placeholder={`Describe the ${watchedItemType.toLowerCase()}...`} {...field} />
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
                          <Textarea placeholder={`Define acceptance criteria for this ${watchedItemType.toLowerCase()}...`} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {watchedItemType === 'Story' ? (
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
                  ) : (
                    <FormField
                      control={addStoryForm.control}
                      name="parentStoryId" 
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Parent Story</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                              <FormControl>
                              <SelectTrigger>
                                  <SelectValue placeholder="Link to a story" />
                              </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                              <SelectItem value="unassigned">None</SelectItem>
                              {stories.filter(s => s.itemType === 'Story').map(story => (
                                  <SelectItem key={story.id} value={story.id}>[{story.storyId}] {story.title}</SelectItem>
                              ))}
                              </SelectContent>
                          </Select>
                          <FormMessage />
                          </FormItem>
                      )}
                    />
                  )}
                  <FormField
                      control={addStoryForm.control}
                      name="assigneeId"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Assignee</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                              <FormControl>
                              <SelectTrigger>
                                  <SelectValue placeholder="Assign to a resource" />
                              </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {employees.map(emp => (
                                  <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>
                              ))}
                              </SelectContent>
                          </Select>
                          <FormMessage />
                          </FormItem>
                      )}
                  />
                  </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={addStoryForm.control}
                      name="releaseId"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Release</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                              <FormControl>
                              <SelectTrigger>
                                  <SelectValue placeholder="Assign to a release" />
                              </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {releases.map(release => (
                                  <SelectItem key={release.id} value={release.id}>[{release.releaseId}] {release.name}</SelectItem>
                              ))}
                              </SelectContent>
                          </Select>
                          <FormMessage />
                          </FormItem>
                      )}
                    />
                    <FormField
                      control={addStoryForm.control}
                      name="estimatedHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Hours</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="0" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                   {watchedItemType === 'Bug' && (
                    <FormField
                      control={addStoryForm.control}
                      name="criticality"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Criticality</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Set criticality" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {bugCriticalities.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <DialogFooter>
                    <Button type="submit" disabled={isAddStorySubmitting}>
                      {isAddStorySubmitting ? 'Creating...' : `Create ${watchedItemType}`}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </PageHeader>
        <div className="flex-1 flex flex-col gap-8">
            {/* Backlog Section */}
            <div className="bg-muted/50 rounded-lg p-4 flex flex-col">
                <h3 className="text-lg font-semibold mb-4">Backlog</h3>
                <div className="overflow-y-auto flex-1 -mr-4 pr-4">
                  <Accordion type="multiple" className="w-full" defaultValue={epicsAndUnassigned.map(e => e.id)}>
                    {epicsAndUnassigned.map((epic) => {
                      const isUnassignedEpic = epic.id === 'unassigned';
                      
                      const allStoriesInEpic = stories.filter(s => s.epicId === epic.id);
                      const totalEpicItemsCount = allStoriesInEpic.length;
                      const doneEpicItemsCount = allStoriesInEpic.filter(s => s.status === 'Done').length;
      
                      const donePercentage = totalEpicItemsCount > 0 ? Math.round((doneEpicItemsCount / totalEpicItemsCount) * 100) : 0;

                      const backlogItemsForGroup = backlogItemsByEpic[epic.id] || [];

                      return (
                          <AccordionItem value={epic.id} key={epic.id}>
                          <AccordionTrigger>
                              <div className="flex-1 text-left pr-2">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold">{epic.title}</span>
                                    <Badge variant="secondary">{backlogItemsForGroup.length} {backlogItemsForGroup.length === 1 ? 'item' : 'items'}</Badge>
                                  </div>
                                  {!isUnassignedEpic && totalEpicItemsCount > 0 && (
                                    <div className="flex items-center gap-2 mt-2" title={`${doneEpicItemsCount} of ${totalEpicItemsCount} stories completed`}>
                                        <Progress value={donePercentage} className="h-2" />
                                        <span className="text-xs font-semibold text-muted-foreground">{donePercentage}%</span>
                                    </div>
                                  )}
                              </div>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-2">
                              {backlogItemsForGroup.length > 0 ? (
                                backlogItemsForGroup.map((story) => {
                                  const storyEpic = epics.find((e) => e.id === story.epicId);
                                  const assignee = employees.find((d) => d.id === story.assigneeId);
                                  const subItems = (subItemsByParentId[story.id] || []).filter(item => !item.sprintId);
                                  
                                  return (
                                    <div key={story.id}>
                                      <div className="relative group">
                                          <StoryCard
                                              story={story}
                                              epic={storyEpic}
                                              assignee={assignee}
                                              onClick={() => setSelectedStory(story)}
                                          />
                                          {story.itemType === 'Story' && (
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
                                          )}
                                      </div>
                                      <SubItemsDisplay items={subItems} onCardClick={setSelectedStory} employees={employees} title="Related Items" />
                                    </div>
                                  )
                                })
                              ) : (
                                <p className="text-sm text-muted-foreground italic px-2">
                                    No items for this epic in the backlog.
                                </p>
                              )}
                              {!isUnassignedEpic && (
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
                              )}
                          </AccordionContent>
                          </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>
            </div>

            {/* Sprints Section */}
            <div className="bg-muted/50 rounded-lg p-4 flex flex-col">
              <h3 className="text-lg font-semibold mb-4">Sprints</h3>
              <Accordion type="multiple" className="w-full" defaultValue={sprints.map(s => s.id)}>
                {sprints.map((sprint) => {
                   const sprintItems = stories.filter((story) => story.sprintId === sprint.id);
                   const topLevelSprintItems = sprintItems.filter(item => 
                       item.itemType === 'Story' || 
                       !sprintItems.some(parent => parent.id === item.epicId)
                   );

                  return (
                    <AccordionItem value={sprint.id} key={sprint.id}>
                      <div className="flex items-center justify-between py-4">
                        <AccordionTrigger className="flex-1 p-0 hover:no-underline">
                          <div className="flex flex-col items-start text-left">
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
                        </AccordionTrigger>
                        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
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
                      <AccordionContent>
                        <div className="space-y-2">
                          {topLevelSprintItems.length > 0 ? (
                            topLevelSprintItems.map((story) => {
                              const epic = epics.find((e) => e.id === story.epicId);
                              const assignee = employees.find((d) => d.id === story.assigneeId);
                              const subItems = sprintItems.filter(item => item.epicId === story.id);
                              
                              return (
                                <div key={story.id}>
                                    <StoryCard
                                        story={story}
                                        epic={epic}
                                        assignee={assignee}
                                        onClick={() => setSelectedStory(story)}
                                    />
                                    <SubItemsDisplay items={subItems} onCardClick={setSelectedStory} employees={employees} title="Related Items" />
                                </div>
                              );
                            })
                          ) : (
                               <p className="text-sm text-muted-foreground italic px-2">
                                  No items in this sprint.
                              </p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            </div>
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
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedStory.itemType === 'Story' ? (
                     <FormField
                      control={editStoryForm.control}
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
                  ) : (
                    <FormField
                      control={editStoryForm.control}
                      name="parentStoryId"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Related Story</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                              <FormControl>
                              <SelectTrigger>
                                  <SelectValue placeholder="Link to a story" />
                              </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                              <SelectItem value="unassigned">None</SelectItem>
                              {stories.filter(s => s.itemType === 'Story').map(story => (
                                  <SelectItem key={story.id} value={story.id}>[{story.storyId}] {story.title}</SelectItem>
                              ))}
                              </SelectContent>
                          </Select>
                          <FormMessage />
                          </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={editStoryForm.control}
                    name="assigneeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assignee</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Assign to a resource" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {employees.map((emp) => (
                              <SelectItem key={emp.id} value={emp.id}>
                                {emp.firstName} {emp.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField
                      control={editStoryForm.control}
                      name="releaseId"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Release</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                              <FormControl>
                              <SelectTrigger>
                                  <SelectValue placeholder="Assign to a release" />
                              </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {releases.map(release => (
                                  <SelectItem key={release.id} value={release.id}>[{release.releaseId}] {release.name}</SelectItem>
                              ))}
                              </SelectContent>
                          </Select>
                          <FormMessage />
                          </FormItem>
                      )}
                    />
                     <FormField
                      control={editStoryForm.control}
                      name="estimatedHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estimated Hours</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="0" {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  {selectedStory.itemType === 'Bug' && (
                    <FormField
                      control={editStoryForm.control}
                      name="criticality"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Criticality</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Set criticality" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {bugCriticalities.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {selectedStory.itemType === 'Story' && selectedStorySubItems.length > 0 && (
                    <div>
                        <Separator className="my-4" />
                        <h4 className="text-sm font-medium mb-2">Related Items</h4>
                        <div className="space-y-2 rounded-md border p-2">
                        {selectedStorySubItems.map(item => {
                            const ItemIcon = workItemIcons[item.itemType];
                            return (
                                <div key={item.id} className="flex items-center justify-between text-sm">
                                    <div className='flex items-center gap-2'>
                                        {ItemIcon && <ItemIcon className="h-4 w-4 text-muted-foreground" />}
                                        <span>{item.storyId}: {item.title}</span>
                                    </div>
                                    <Badge variant="outline">{item.status}</Badge>
                                </div>
                            )
                        })}
                        </div>
                    </div>
                  )}

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
                                  if (!selectedStory) return;
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
                                      if (!selectedStory) return;
                                      moveStoryToSprint(selectedStory.id, sprint.id);
                                      setSelectedStory(null);
                                  }}
                                  >
                                  {sprint.title}
                                  </DropdownMenuItem>
                              ))}
                          </DropdownMenuContent>
                      </DropdownMenu>
                      <Button type="submit" disabled={isEditStorySubmitting}>
                        {isEditStorySubmitting ? 'Saving...' : 'Save Changes'}
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
                <Button type="submit" disabled={isEditEpicSubmitting}>
                  {isEditEpicSubmitting ? 'Saving...' : 'Save Changes'}
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
                    <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                            <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={editSprintForm.control}
                    name="endDate"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                            <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={isEditSprintSubmitting}>
                    {isEditSprintSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>

    </>
  );
}
