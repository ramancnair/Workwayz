

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/PageHeader';
import { Button, buttonVariants } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { PlusCircle, Edit, Trash2, Star, ChevronLeft, ChevronRight, ChevronDown, BookOpen, Bug, CheckSquare, GitCommit, Clock, CornerDownRight, Flag } from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { useToast } from '@/hooks/use-toast';
import { type Sprint, type Story, type Epic, type WorkItemType, User, BugCriticality, ImpactedSystem } from '@/types';
import { DatePicker } from '@/components/ui/datepicker';
import { cn } from '@/lib/utils';
import { Card, CardFooter, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { format, parseISO } from 'date-fns';

const sprintSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

const workItemIcons: Record<WorkItemType, React.ElementType> = {
  'Requirement/Story': BookOpen,
  Bug: Bug,
  'Task': CheckSquare,
  'Feature Change': GitCommit,
  'Sub Task': CheckSquare,
};

const bugCriticalities: BugCriticality[] = ['Low', 'Medium', 'High', 'Critical'];

const storyFormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
  epicId: z.string().optional(),
  parentStoryId: z.string().optional(),
  assigneeId: z.string().optional(),
  estimatedHours: z.coerce.number().optional(),
  criticality: z.enum(bugCriticalities).optional(),
  environmentId: z.string().optional(),
});

const subTaskFormSchema = z.object({
    title: z.string().min(1, 'Title is required.'),
    description: z.string().optional(),
    impactedSystemId: z.string().optional(),
    estimatedHours: z.coerce.number().optional(),
    assigneeId: z.string().optional(),
});


function StoryItemCard({ 
    story, 
    epic,
    assignee,
    subItems,
    onMove, 
    onEdit,
    onSubItemClick,
}: { 
    story: Story, 
    epic?: Epic, 
    assignee?: User,
    subItems?: Story[],
    onMove: (sprintId: string | null) => void,
    onEdit: () => void;
    onSubItemClick: (story: Story) => void;
}) {
  const { sprints } = useProject();
  const Icon = workItemIcons[story.itemType];
  const subTasks = subItems?.filter(i => i.itemType === 'Sub Task') || [];
  const bugs = subItems?.filter(i => i.itemType === 'Bug') || [];
  const hasEffort = story.estimatedHours && story.estimatedHours > 0;

  return (
    <Collapsible>
      <Card className="bg-card">
         <div className="p-4">
            <div className="flex justify-between items-start">
                <CollapsibleTrigger className="flex-1 pr-2 text-left space-y-1">
                    <div className="flex items-center gap-2">
                        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                        <p className="text-xs font-semibold text-muted-foreground">{story.storyId}</p>
                        {hasEffort && <Flag className="h-4 w-4 text-green-500" />}
                    </div>
                    <p className="font-semibold break-words">{story.title}</p>
                </CollapsibleTrigger>
                <div className="flex items-center gap-1 flex-shrink-0">
                    {epic && <Badge variant="secondary">{epic.title}</Badge>}
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                        <Edit className="h-4 w-4" />
                    </Button>
                </div>
            </div>
          </div>
        <CardFooter className="flex justify-between items-center p-4 pt-0">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {assignee && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <Avatar className="h-6 w-6">
                                <AvatarImage src={assignee.avatar} alt={`${assignee.firstName} ${assignee.lastName}`} data-ai-hint="developer avatar"/>
                                <AvatarFallback>{assignee.firstName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </TooltipTrigger>
                        <TooltipContent><p>Assigned to {assignee.firstName} {assignee.lastName}</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
            {story.estimatedHours !== undefined && (
                <div className="flex items-center gap-1" title="Development effort">
                    <Clock className="h-3 w-3" />
                    <span>{story.estimatedHours}h</span>
                </div>
            )}
            {(subTasks.length > 0 || bugs.length > 0) && (
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer">
                  {subTasks.length > 0 && (
                    <div className="flex items-center gap-1" title={`${subTasks.length} sub-tasks`}>
                      <CheckSquare className="h-3 w-3" />
                      <span>{subTasks.length}</span>
                    </div>
                  )}
                  {bugs.length > 0 && (
                    <div className="flex items-center gap-1" title={`${bugs.length} bugs`}>
                      <Bug className="h-3 w-3" />
                      <span>{bugs.length}</span>
                    </div>
                  )}
                </div>
              </CollapsibleTrigger>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7" onClick={(e) => e.stopPropagation()}>
                Move <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {story.sprintId !== null && (
                <DropdownMenuItem onClick={() => onMove(null)}>
                  Backlog
                </DropdownMenuItem>
              )}
              {sprints
                .filter((sprint) => sprint.id !== story.sprintId)
                .map((sprint) => (
                  <DropdownMenuItem key={sprint.id} onClick={() => onMove(sprint.id)}>
                    {sprint.title}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardFooter>
        <CollapsibleContent>
            <div className="px-6 pb-4 space-y-2">
                {(subTasks.length > 0 || bugs.length > 0) && <Separator />}
                {[...subTasks, ...bugs].map(item => {
                    const ItemIcon = workItemIcons[item.itemType];
                    return (
                        <div key={item.id} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <ItemIcon className="h-3 w-3 text-muted-foreground" />
                                <span 
                                    className="font-medium cursor-pointer hover:underline"
                                    onClick={() => onSubItemClick(item)}
                                >
                                    [{item.storyId}] {item.title}
                                </span>
                            </div>
                            <Badge variant="outline">{item.status}</Badge>
                        </div>
                    )
                })}
            </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}


function SprintColumn({ 
  sprint, 
  stories,
  onEdit,
  onDelete,
  onSetCurrent,
  onPrev,
  onNext,
  showNav,
  onMoveStory,
  onEditStory
}: { 
  sprint: Sprint, 
  stories: Story[],
  onEdit: (sprint: Sprint) => void,
  onDelete: (sprint: Sprint) => void,
  onSetCurrent: (sprintId: string) => void,
  onPrev: () => void,
  onNext: () => void,
  showNav: boolean,
  onMoveStory: (storyId: string, sprintId: string | null) => void;
  onEditStory: (story: Story) => void;
}) {
    const { epics, employees, stories: allStories } = useProject();

     const subItemsByStoryId = useMemo(() => allStories.reduce((acc, story) => {
        if (['Bug', 'Sub Task'].includes(story.itemType) && story.parentStoryId) {
            if (!acc[story.parentStoryId]) {
                acc[story.parentStoryId] = [];
            }
            acc[story.parentStoryId].push(story);
        }
        return acc;
      }, {} as Record<string, Story[]>), [allStories]);

    return (
        <div className="bg-muted/50 rounded-lg p-4 h-full flex flex-col min-w-[320px] w-full">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-2">
                {showNav && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPrev}>
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                )}
                <h3 className="text-lg font-semibold">{sprint.title}</h3>
                 {showNav && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onNext}>
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                )}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onSetCurrent(sprint.id)}>
                  <Star className={cn("h-4 w-4", sprint.isCurrent && "fill-yellow-400 text-yellow-500")} />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(sprint)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(sprint)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
            {(sprint.startDate && sprint.endDate) && (
              <div className="text-xs text-muted-foreground mb-4 pl-1">
                  {format(parseISO(sprint.startDate), 'MMM d')} - {format(parseISO(sprint.endDate), 'MMM d, yyyy')}
              </div>
            )}
            <div className="flex-1 space-y-4 overflow-y-auto">
                {stories.map(story => {
                     const epic = epics.find(e => e.id === story.epicId);
                     const assignee = employees.find(e => e.id === story.assigneeId);
                     const subItems = subItemsByStoryId[story.id] || [];
                     return (
                        <div key={story.id}>
                            <StoryItemCard 
                                story={story} 
                                epic={epic}
                                assignee={assignee}
                                subItems={subItems}
                                onMove={(newSprintId) => onMoveStory(story.id, newSprintId)}
                                onEdit={() => onEditStory(story)}
                                onSubItemClick={onEditStory}
                            />
                        </div>
                     );
                })}
            </div>
        </div>
    )
}

export default function GroomingPage() {
    const { 
        stories, 
        epics,
        employees,
        sprints,
        projectSettings,
        impactedSystems,
        addStory,
        moveStoryToSprint,
        addSprint,
        updateSprint,
        deleteSprint,
        setCurrentSprint,
        updateStory,
        environments,
    } = useProject();
    const { toast } = useToast();
    
    const [isSprintDialogOpen, setIsSprintDialogOpen] = useState(false);
    const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
    const [deletingSprint, setDeletingSprint] = useState<Sprint | null>(null);
    const [editingStory, setEditingStory] = useState<Story | null>(null);
    const [visibleSprintIndex, setVisibleSprintIndex] = useState(0);
    const [isEditStorySubmitting, setEditStorySubmitting] = useState(false);
    const [showAddSubTask, setShowAddSubTask] = useState(false);

    const backlogItems = useMemo(() => {
        return stories.filter(story => !story.sprintId && ['Requirement/Story', 'Task', 'Feature Change'].includes(story.itemType));
    }, [stories]);
    
     const subItemsByStoryId = useMemo(() => stories.reduce((acc, story) => {
        if (['Bug', 'Sub Task'].includes(story.itemType) && story.parentStoryId) {
            if (!acc[story.parentStoryId]) {
                acc[story.parentStoryId] = [];
            }
            acc[story.parentStoryId].push(story);
        }
        return acc;
      }, {} as Record<string, Story[]>), [stories]);

    const sprintsWithStories = useMemo(() => {
        return sprints.map(sprint => ({
            ...sprint,
            stories: stories.filter(story => story.sprintId === sprint.id && ['Requirement/Story', 'Task', 'Feature Change'].includes(story.itemType)),
        })).sort((a,b) => new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime());
    }, [sprints, stories]);
    
    useEffect(() => {
        const currentSprintIdx = sprintsWithStories.findIndex(s => s.isCurrent);
        if (currentSprintIdx !== -1) {
            setVisibleSprintIndex(currentSprintIdx);
        } else if (sprintsWithStories.length > 0) {
            setVisibleSprintIndex(0);
        }
    }, [sprintsWithStories]);

    const sprintForm = useForm<z.infer<typeof sprintSchema>>({
        resolver: zodResolver(sprintSchema),
        defaultValues: {
            title: '',
        },
    });
    
    const editStoryForm = useForm<z.infer<typeof storyFormSchema>>({
        resolver: zodResolver(storyFormSchema),
    });

    const subTaskForm = useForm<z.infer<typeof subTaskFormSchema>>({
        resolver: zodResolver(subTaskFormSchema),
        defaultValues: {
          title: '',
          description: '',
          impactedSystemId: 'unassigned',
          estimatedHours: 0,
          assigneeId: 'unassigned',
        }
    });

    const watchedStartDate = useWatch({ control: sprintForm.control, name: "startDate" });

    React.useEffect(() => {
        if (isSprintDialogOpen) {
            if (editingSprint) {
                sprintForm.reset({
                    title: editingSprint.title,
                    startDate: editingSprint.startDate ? new Date(editingSprint.startDate) : undefined,
                    endDate: editingSprint.endDate ? new Date(editingSprint.endDate) : undefined,
                });
            } else {
                sprintForm.reset({
                    title: '',
                    startDate: undefined,
                    endDate: undefined,
                });
            }
        }
    }, [isSprintDialogOpen, editingSprint, sprintForm]);
    
    useEffect(() => {
        if (!editingStory) {
          setShowAddSubTask(false);
          subTaskForm.reset();
        } else if (editingStory.itemType === 'Sub Task') {
            subTaskForm.reset({
                title: editingStory.title,
                description: editingStory.description || '',
                impactedSystemId: editingStory.impactedSystemId || 'unassigned',
                estimatedHours: editingStory.estimatedHours,
                assigneeId: editingStory.assigneeId || 'unassigned',
            });
        } else {
             editStoryForm.reset({
                title: editingStory.title,
                description: editingStory.description || '',
                acceptanceCriteria: editingStory.acceptanceCriteria || '',
                epicId: ['Task', 'Requirement/Story', 'Feature Change'].includes(editingStory.itemType) ? editingStory.epicId || 'unassigned' : undefined,
                parentStoryId: ['Bug'].includes(editingStory.itemType) ? editingStory.parentStoryId || 'unassigned' : undefined,
                assigneeId: editingStory.assigneeId || 'unassigned',
                estimatedHours: editingStory.estimatedHours,
                criticality: editingStory.criticality || 'Medium',
                environmentId: editingStory.environmentId || 'unassigned',
            });
        }
    }, [editingStory, editStoryForm, subTaskForm]);


    React.useEffect(() => {
        if (watchedStartDate && projectSettings?.sprintDurationInWeeks) {
            const newEndDate = new Date(watchedStartDate);
            newEndDate.setDate(newEndDate.getDate() + projectSettings.sprintDurationInWeeks * 7 - 1);
            sprintForm.setValue("endDate", newEndDate);
        }
    }, [watchedStartDate, projectSettings?.sprintDurationInWeeks, sprintForm]);
    
    const handleSprintSubmit = async (values: z.infer<typeof sprintSchema>) => {
        const success = editingSprint
            ? await updateSprint(editingSprint.id, values)
            : await addSprint(values);

        if (success) {
            toast({ title: 'Success', description: `Sprint ${editingSprint ? 'updated' : 'created'}.` });
            setIsSprintDialogOpen(false);
            setEditingSprint(null);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: `Could not ${editingSprint ? 'update' : 'create'} sprint.` });
        }
    };
    
    const onEditStorySubmit = async (values: z.infer<typeof storyFormSchema>) => {
        if (!editingStory) return;
        setEditStorySubmitting(true);
        
        const isSubItem = ['Bug'].includes(editingStory.itemType);

        const success = await updateStory(editingStory.id, {
            title: values.title,
            description: values.description,
            acceptanceCriteria: values.acceptanceCriteria,
            assigneeId: values.assigneeId === 'unassigned' ? undefined : values.assigneeId,
            epicId: !isSubItem ? (values.epicId === 'unassigned' ? undefined : values.epicId) : undefined,
            parentStoryId: isSubItem ? (values.parentStoryId === 'unassigned' ? undefined : values.parentStoryId) : undefined,
            estimatedHours: values.estimatedHours,
            criticality: editingStory.itemType === 'Bug' ? values.criticality : undefined,
            environmentId: values.environmentId === 'unassigned' ? undefined : values.environmentId,
        });

        if (success) {
          setEditingStory(null);
          toast({ title: 'Success', description: 'Story updated.' });
        } else {
          toast({ variant: "destructive", title: `Error Editing ${editingStory.itemType}`, description: "Could not save your changes." });
        }
        setEditStorySubmitting(false);
    };

    const onEditSubTaskSubmit = async (values: z.infer<typeof subTaskFormSchema>) => {
        if (!editingStory || editingStory.itemType !== 'Sub Task') return;
        setEditStorySubmitting(true);
        
        const success = await updateStory(editingStory.id, {
            title: values.title,
            description: values.description,
            impactedSystemId: values.impactedSystemId === 'unassigned' ? undefined : values.impactedSystemId,
            estimatedHours: values.estimatedHours,
            assigneeId: values.assigneeId === 'unassigned' ? undefined : values.assigneeId,
        });

        if (success) {
            setEditingStory(null);
        } else {
            toast({ variant: "destructive", title: "Error Editing Sub Task", description: "Could not save your changes." });
        }
        setEditStorySubmitting(false);
    };

    const handleAddSubTask = async (values: z.infer<typeof subTaskFormSchema>) => {
      if (!editingStory) return;

      const newSubTask: Omit<Story, 'id' | 'storyId'> = {
          title: values.title,
          description: values.description || '',
          itemType: 'Sub Task',
          status: 'To Do',
          epicId: editingStory.epicId, // Inherit epic
          parentStoryId: editingStory.id, // Link to parent story
          sprintId: editingStory.sprintId, // Inherit sprint
          releaseId: editingStory.releaseId, // Inherit release
          impactedSystemId: values.impactedSystemId === 'unassigned' ? undefined : values.impactedSystemId,
          estimatedHours: values.estimatedHours,
          assigneeId: values.assigneeId === 'unassigned' ? undefined : values.assigneeId,
      };

      const success = await addStory(newSubTask, 'SUB');
      if (success) {
          toast({ title: 'Success', description: 'Sub-task added.' });
          subTaskForm.reset();
          setShowAddSubTask(false);
      } else {
          toast({ variant: "destructive", title: "Error", description: "Could not add sub-task." });
      }
    };


    const handleDeleteConfirm = async () => {
        if (!deletingSprint) return;
        const success = await deleteSprint(deletingSprint.id);
        if (success) {
            toast({ title: 'Success', description: 'Sprint deleted.' });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete sprint.' });
        }
        setDeletingSprint(null);
    }
    
    const handleSetCurrentSprint = async (sprintId: string) => {
        const success = await setCurrentSprint(sprintId);
        if (success) {
            toast({ title: 'Success', description: 'Current sprint updated.' });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not set current sprint.' });
        }
    };

    const nextSprint = () => {
        setVisibleSprintIndex((prevIndex) => (prevIndex + 1) % sprintsWithStories.length);
    };

    const prevSprint = () => {
        setVisibleSprintIndex((prevIndex) => (prevIndex - 1 + sprintsWithStories.length) % sprintsWithStories.length);
    };
    
    const selectedStorySubItems = useMemo(() => {
        if (!editingStory) return { subTasks: [], bugs: [] };
        const allSubItems = subItemsByStoryId[editingStory.id] || [];
        return {
          subTasks: allSubItems.filter(item => item.itemType === 'Sub Task'),
          bugs: allSubItems.filter(item => item.itemType === 'Bug'),
        };
    }, [editingStory, subItemsByStoryId]);

    const parentStories = useMemo(() => stories.filter(s => ['Requirement/Story', 'Feature Change'].includes(s.itemType)), [stories]);
    const sortedEnvironments = useMemo(() => [...environments].sort((a,b) => a.order - b.order), [environments]);


    return (
        <>
            <div className="flex-1 flex flex-col space-y-4 p-4 md:p-8 pt-6 h-full">
                <PageHeader
                    title="Grooming Board"
                    description="Plan your sprints by organizing the backlog."
                >
                    <Button onClick={() => { setEditingSprint(null); setIsSprintDialogOpen(true); }}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create Sprint
                    </Button>
                </PageHeader>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
                    {/* Backlog Column */}
                    <div className="bg-muted/50 rounded-lg p-4 h-full flex flex-col">
                        <h3 className="text-lg font-semibold mb-4">Backlog</h3>
                        <div className="flex-1 space-y-4 overflow-y-auto">
                            {backlogItems.map(story => {
                                const epic = epics.find(e => e.id === story.epicId);
                                const assignee = employees.find(e => e.id === story.assigneeId);
                                const subItems = subItemsByStoryId[story.id] || [];
                                return (
                                    <div key={story.id}>
                                        <StoryItemCard 
                                            story={story} 
                                            epic={epic}
                                            assignee={assignee}
                                            subItems={subItems}
                                            onMove={(newSprintId) => moveStoryToSprint(story.id, newSprintId)}
                                            onEdit={() => setEditingStory(story)}
                                            onSubItemClick={setEditingStory}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Sprint Column */}
                    <div className="h-full flex flex-col">
                    {sprintsWithStories.length > 0 ? (
                        <SprintColumn 
                            key={sprintsWithStories[visibleSprintIndex].id} 
                            sprint={sprintsWithStories[visibleSprintIndex]} 
                            stories={sprintsWithStories[visibleSprintIndex].stories} 
                            onEdit={(sprint) => { setEditingSprint(sprint); setIsSprintDialogOpen(true); }}
                            onDelete={(sprint) => setDeletingSprint(sprint)}
                            onSetCurrent={handleSetCurrentSprint}
                            onPrev={prevSprint}
                            onNext={nextSprint}
                            showNav={sprintsWithStories.length > 1}
                            onMoveStory={moveStoryToSprint}
                            onEditStory={setEditingStory}
                        />
                    ) : (
                        <div className="bg-muted/50 rounded-lg p-4 h-full flex flex-col items-center justify-center">
                            <p className="text-muted-foreground">No sprints created yet.</p>
                        </div>
                    )}
                    </div>
                </div>
            </div>

        <Dialog open={isSprintDialogOpen} onOpenChange={(isOpen) => { if(!isOpen) setEditingSprint(null); setIsSprintDialogOpen(isOpen); }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingSprint ? 'Edit Sprint' : 'Create New Sprint'}</DialogTitle>
                </DialogHeader>
                <Form {...sprintForm}>
                    <form onSubmit={sprintForm.handleSubmit(handleSprintSubmit)} className="space-y-4">
                        <FormField
                            control={sprintForm.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sprint Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="E.g., Sprint 1" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={sprintForm.control}
                            name="startDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Start Date</FormLabel>
                                    <FormControl>
                                        <DatePicker date={field.value} setDate={field.onChange} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={sprintForm.control}
                            name="endDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>End Date</FormLabel>
                                    <FormControl>
                                        <DatePicker date={field.value} setDate={field.onChange} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit">{editingSprint ? 'Save Changes' : 'Create Sprint'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
        
        <AlertDialog open={!!deletingSprint} onOpenChange={(isOpen) => !isOpen && setDeletingSprint(null)}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the sprint and move all its items back to the backlog.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                onClick={handleDeleteConfirm}
                className={cn(buttonVariants({ variant: 'destructive' }))}
                >
                Continue
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Dialog open={!!editingStory} onOpenChange={(isOpen) => !isOpen && setEditingStory(null)}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            {editingStory && (
                <>
                {editingStory.itemType === 'Sub Task' ? (
                <>
                  <DialogHeader>
                    <DialogTitle>Edit Sub Task</DialogTitle>
                    <DialogDescription>Make changes to your sub task here.</DialogDescription>
                  </DialogHeader>
                  <Form {...subTaskForm}>
                    <form onSubmit={subTaskForm.handleSubmit(onEditSubTaskSubmit)} className="space-y-4">
                        <FormField control={subTaskForm.control} name="title" render={({field}) => (
                            <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Sub-task title" {...field}/></FormControl><FormMessage/></FormItem>
                        )}/>
                        <FormField control={subTaskForm.control} name="description" render={({field}) => (
                            <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Describe sub-task..." {...field}/></FormControl><FormMessage/></FormItem>
                        )}/>
                        <FormField control={subTaskForm.control} name="impactedSystemId" render={({field}) => (
                            <FormItem><FormLabel>Impacted System</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a system"/></SelectTrigger></FormControl>
                                    <SelectContent><SelectItem value="unassigned">None</SelectItem>{impactedSystems.map(s=><SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                                </Select>
                            <FormMessage/></FormItem>
                        )}/>
                        <FormField control={subTaskForm.control} name="assigneeId" render={({field}) => (
                           <FormItem>
                            <FormLabel>Assigned To</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Assign a resource"/></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage/>
                           </FormItem>
                        )}/>
                        <FormField control={subTaskForm.control} name="estimatedHours" render={({field}) => (
                            <FormItem><FormLabel>Effort (hours)</FormLabel><FormControl><Input type="number" placeholder="0" {...field} value={field.value ?? ''}/></FormControl><FormMessage/></FormItem>
                        )}/>
                        <DialogFooter>
                            <Button type="submit" disabled={isEditStorySubmitting}>
                                {isEditStorySubmitting ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                  </Form>
                </>
              ) : (
                <>
                <DialogHeader>
                    <DialogTitle>Edit {editingStory.itemType}</DialogTitle>
                    <DialogDescription>
                    Make changes to your {editingStory.itemType.toLowerCase()} here. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                <Form {...editStoryForm}>
                    <form onSubmit={editStoryForm.handleSubmit(onEditStorySubmit)} className="space-y-4">
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
                    <Tabs defaultValue="details" className="w-full">
                        <TabsList>
                            <TabsTrigger value="details">Details</TabsTrigger>
                            <TabsTrigger value="subTasks">
                                Sub-Tasks
                                <Badge variant="secondary" className="ml-2">
                                    {selectedStorySubItems.subTasks.length}
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger value="bugs">
                                Bugs
                                <Badge variant="secondary" className="ml-2">
                                    {selectedStorySubItems.bugs.length}
                                </Badge>
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="details" className="pt-4">
                        <div className="space-y-4">
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
                            {['Requirement/Story', 'Feature Change', 'Task'].includes(editingStory.itemType) ? (
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
                                    <FormLabel>Related Item</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Link to a story or feature change" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                        <SelectItem value="unassigned">None</SelectItem>
                                        {parentStories.map(story => (
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
                            {editingStory.itemType === 'Bug' && (
                                <>
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
                                     <FormField
                                        control={editStoryForm.control}
                                        name="environmentId"
                                        render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>Environment</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                                                <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select an environment" />
                                                </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                <SelectItem value="unassigned">None</SelectItem>
                                                {sortedEnvironments.map(env => (
                                                    <SelectItem key={env.id} value={env.id}>{env.name}</SelectItem>
                                                ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </>
                            )}
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
                        </TabsContent>
                         <TabsContent value="subTasks">
                             <div className="space-y-4 pt-4">
                                {selectedStorySubItems.subTasks.length > 0 ? (
                                    <div className="space-y-2 rounded-md border p-2">
                                    {selectedStorySubItems.subTasks.map(item => {
                                        const ItemIcon = workItemIcons[item.itemType];
                                        return (
                                            <div key={item.id} className="flex items-center justify-between text-sm">
                                                <div className='flex items-center gap-2'>
                                                    {ItemIcon && <ItemIcon className="h-4 w-4 text-muted-foreground" />}
                                                    <span className="cursor-pointer hover:underline" onClick={() => setEditingStory(item)}>[{item.storyId}] {item.title}</span>
                                                </div>
                                                <Badge variant="outline">{item.status}</Badge>
                                            </div>
                                        )
                                    })}
                                    </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground italic px-2">No sub-tasks linked.</p>
                                )}
                                {showAddSubTask ? (
                                    <div className='border p-4 mt-2 rounded-md'>
                                        <Form {...subTaskForm}>
                                            <div className='space-y-4'>
                                                <FormField control={subTaskForm.control} name="title" render={({field}) => (
                                                    <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Sub-task title" {...field}/></FormControl><FormMessage/></FormItem>
                                                )}/>
                                                <FormField control={subTaskForm.control} name="description" render={({field}) => (
                                                    <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Describe sub-task..." {...field}/></FormControl><FormMessage/></FormItem>
                                                )}/>
                                                <FormField control={subTaskForm.control} name="impactedSystemId" render={({field}) => (
                                                    <FormItem><FormLabel>Impacted System</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                                                            <FormControl><SelectTrigger><SelectValue placeholder="Select a system"/></SelectTrigger></FormControl>
                                                            <SelectContent><SelectItem value="unassigned">None</SelectItem>{impactedSystems.map(s=><SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    <FormMessage/></FormItem>
                                                )}/>
                                                <FormField control={subTaskForm.control} name="assigneeId" render={({field}) => (
                                                   <FormItem>
                                                    <FormLabel>Assigned To</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                                                      <FormControl><SelectTrigger><SelectValue placeholder="Assign a resource"/></SelectTrigger></FormControl>
                                                      <SelectContent>
                                                        <SelectItem value="unassigned">Unassigned</SelectItem>
                                                        {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}
                                                      </SelectContent>
                                                    </Select>
                                                    <FormMessage/>
                                                   </FormItem>
                                                )}/>
                                                <FormField control={subTaskForm.control} name="estimatedHours" render={({field}) => (
                                                    <FormItem><FormLabel>Effort (hours)</FormLabel><FormControl><Input type="number" placeholder="0" {...field} value={field.value ?? ''}/></FormControl><FormMessage/></FormItem>
                                                )}/>
                                                <div className='flex justify-end gap-2'>
                                                  <Button variant="ghost" onClick={() => setShowAddSubTask(false)}>Cancel</Button>
                                                  <Button type="button" onClick={subTaskForm.handleSubmit(handleAddSubTask)}>Save Sub Task</Button>
                                                </div>
                                            </div>
                                        </Form>
                                    </div>
                                ) : (
                                    <Button variant="outline" size="sm" className="mt-2" onClick={() => setShowAddSubTask(true)}><PlusCircle className="mr-2 h-4 w-4"/> Add Sub-Task</Button>
                                )}
                            </div>
                        </TabsContent>
                        <TabsContent value="bugs">
                           <div className="space-y-4 pt-4">
                                {selectedStorySubItems.bugs.length > 0 ? (
                                    <div className="space-y-2 rounded-md border p-2">
                                    {selectedStorySubItems.bugs.map(item => {
                                        const ItemIcon = workItemIcons[item.itemType];
                                        return (
                                            <div key={item.id} className="flex items-center justify-between text-sm">
                                                <div className='flex items-center gap-2'>
                                                    {ItemIcon && <ItemIcon className="h-4 w-4 text-muted-foreground" />}
                                                    <span className="cursor-pointer hover:underline" onClick={() => setEditingStory(item)}>[{item.storyId}] {item.title}</span>
                                                </div>
                                                <Badge variant="outline">{item.status}</Badge>
                                            </div>
                                        )
                                    })}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground italic px-2">No bugs linked.</p>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                    <DialogFooter>
                        <Button type="submit" disabled={isEditStorySubmitting}>
                        {isEditStorySubmitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                    </form>
                </Form>
                </>
                )}
                </>
            )}
            </DialogContent>
        </Dialog>
        </>
    );
}




