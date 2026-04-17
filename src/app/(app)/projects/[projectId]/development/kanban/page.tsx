

'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/PageHeader';
import type { Story, Epic, StoryStatus, User, WorkItemType, KanbanColumn, Environment, ImpactedSystem, Release, Sprint, Priority, BugSeverity } from '@/types';
import { Columns, ChevronDown, Clock, BookOpen, Bug, CheckSquare, GitCommit, TrendingUp, Trash2, Ban, Edit, Flag, ArrowLeft, ClipboardList, Circle, CheckCircle } from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { format, parseISO, differenceInDays, eachDayOfInterval, isSameDay } from 'date-fns';
import { DatePicker } from '@/components/ui/datepicker';

const workItemIcons: Record<WorkItemType, React.ElementType> = {
  'Requirement/Story': BookOpen,
  'Bug': Bug,
  'Task': CheckSquare,
  'Feature Change': GitCommit,
  'Sub Task': CheckSquare,
};

const statusOptions: StoryStatus[] = ['To Do', 'In Progress', 'Done'];
const priorities: Priority[] = ['Critical', 'High', 'Medium', 'Low', 'Backburner'];
const severities: BugSeverity[] = ['Critical', 'High', 'Medium', 'Low'];

const priorityStyles: Record<Priority, string> = {
    'Critical': 'text-red-500 fill-red-500',
    'High': 'text-orange-400 fill-orange-400',
    'Medium': 'text-yellow-500 fill-yellow-500',
    'Low': 'text-green-500 fill-green-500',
    'Backburner': 'text-gray-500 fill-gray-500',
};


const storyFormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
  epicId: z.string().optional(),
  parentStoryId: z.string().optional(),
  assigneeId: z.string().optional(),
  estimatedHours: z.coerce.number().optional(),
  priority: z.enum(priorities).optional(),
  severity: z.enum(severities).optional(),
  environmentId: z.string().optional(),
  impactedSystemIds: z.array(z.string()).optional(),
  attachments: z.string().optional(),
  status: z.enum(statusOptions).optional(),
  sprintId: z.string().optional(),
  releaseId: z.string().optional(),
  createdAt: z.date().optional(),
  closedAt: z.date().optional(),
  relatedTestCaseId: z.string().optional(),
});

const subTaskFormSchema = z.object({
    title: z.string().min(1, 'Title is required.'),
    description: z.string().optional(),
    impactedSystemId: z.string().optional(),
    estimatedHours: z.coerce.number().optional(),
    assigneeId: z.string().optional(),
    status: z.enum(statusOptions),
    sprintId: z.string().optional(),
    releaseId: z.string().optional(),
});

function StoryCard({ 
  story, 
  epic, 
  assignee,
  parentStory, 
  columns, 
  onStatusChange, 
  onEdit, 
  className, 
  isMoveToDoneDisabled, 
  subItems, 
  onSubItemClick, 
  onSubItemStatusChange,
}: { 
  story: Story; 
  epic?: Epic; 
  assignee?: User;
  parentStory?: Story; 
  columns: KanbanColumn[]; 
  onStatusChange?: (newStatus: StoryStatus) => void; 
  onEdit: () => void; 
  className?: string; 
  isMoveToDoneDisabled?: boolean; 
  subItems?: Story[], 
  onSubItemClick: (story: Story) => void; 
  onSubItemStatusChange: (storyId: string, newStatus: StoryStatus) => void;
}) {

  const Icon = workItemIcons[story.itemType];
  const doneColumn = columns.find(c => c.isDoneColumn);
  
  const subTasks = subItems?.filter(i => i.itemType === 'Sub Task') || [];
  const bugs = subItems?.filter(i => i.itemType === 'Bug') || [];
  const showSubItems = story.itemType !== 'Bug' && (subTasks.length > 0 || bugs.length > 0);
  
  const isReadyForDev = useMemo(() => {
    if (!story.estimatedHours || story.estimatedHours <= 0) return false;
    if (!story.impactedSystemIds || story.impactedSystemIds.length === 0) return true; // No systems, so ready
    
    const subTaskSystemIds = new Set(subTasks.map(st => st.impactedSystemId).filter(Boolean));
    return story.impactedSystemIds.every(id => subTaskSystemIds.has(id));
  }, [story.estimatedHours, story.impactedSystemIds, subTasks]);


  return (
    <Collapsible>
    <Card className={cn("bg-card", className)}>
      <div className="p-4">
        <div className="flex justify-between items-start">
            <div className="flex-1 pr-2 space-y-1">
                <div className="flex items-center gap-2">
                    {showSubItems ? (
                      <CollapsibleTrigger asChild>
                          <button>
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </button>
                      </CollapsibleTrigger>
                    ) : (
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    )}
                     {story.priority && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button>
                                <Circle className={cn("h-3 w-3 cursor-pointer", priorityStyles[story.priority])} />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                            <p>{story.priority} Priority</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                    )}
                    <p className="text-xs font-semibold text-muted-foreground">
                    {parentStory ? `${parentStory.storyId} > ${story.storyId}` : story.storyId}
                    </p>
                    {isReadyForDev && <CheckCircle className="h-4 w-4 text-green-500" />}
                </div>
                <p className="font-semibold break-words">{story.title}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
                {epic && <Badge variant="secondary">{epic.title}</Badge>}
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}>
                    <Edit className="h-4 w-4" />
                </Button>
            </div>
        </div>
      </div>
      <CardFooter className="flex justify-between items-center p-4 pt-0" onClick={(e) => e.stopPropagation()}>
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
            {showSubItems && (
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
        <div className="flex items-center gap-1">
            {onStatusChange && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7">
                        Move <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {columns.filter(col => col.name !== story.status).map(col => {
                            const isDoneAndDisabled = doneColumn && col.id === doneColumn.id && isMoveToDoneDisabled;

                            if (isDoneAndDisabled) {
                                return (
                                    <TooltipProvider key={col.id}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="w-full">
                                                    <DropdownMenuItem disabled>
                                                        <Ban className="mr-2 h-4 w-4" />
                                                        Move to {col.name}
                                                    </DropdownMenuItem>
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Complete all sub-items first.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )
                            }

                            return (
                                <DropdownMenuItem key={col.id} onClick={() => onStatusChange(col.name)}>
                                    Move to {col.name}
                                </DropdownMenuItem>
                            )
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
      </CardFooter>
      <CollapsibleContent>
        <div className="px-4 pb-4 space-y-2">
            {(subTasks.length > 0 || bugs.length > 0) && <Separator />}
            {[...subTasks, ...bugs].map(item => {
                const ItemIcon = workItemIcons[item.itemType];
                const impactedSystem = useProject().impactedSystems.find(s => s.id === item.impactedSystemId);

                return (
                    <div key={item.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-x-2 text-xs">
                        <ItemIcon className="h-3 w-3 text-muted-foreground" />
                        <span 
                            className="font-medium cursor-pointer hover:underline truncate"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSubItemClick(item);
                            }}
                        >
                            [{item.storyId}] {item.title}
                        </span>
                        <Badge variant="outline" className="w-20 justify-center truncate">{impactedSystem?.name || 'N/A'}</Badge>
                        <span className="w-12 text-center text-muted-foreground">{item.estimatedHours || 0}h</span>
                         <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Badge variant="outline" className="cursor-pointer w-20 justify-center">{item.status}</Badge>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                            {statusOptions.filter(s => s !== item.status).map(status => (
                              <DropdownMenuItem key={status} onSelect={() => onSubItemStatusChange(item.id, status)}>
                                {status}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            })}
        </div>
      </CollapsibleContent>
    </Card>
    </Collapsible>
  );
}


export default function KanbanPage() {
  const { stories, epics, sprints, kanbanColumns, moveStoryStatus, moveStoryToSprint, employees: users, updateStory, deleteStory, environments, impactedSystems, releasesAndMilestones, holidays, weeklyOffDays, projectSettings, testCases, testDate } = useProject();
  const { toast } = useToast();
  
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('all');
  const [viewBy, setViewBy] = useState<'story' | 'sub-task' | 'bug'>('story');
  const [selectionStack, setSelectionStack] = useState<Story[]>([]);
  const selectedStory = selectionStack[selectionStack.length - 1] || null;
  const [deletingStory, setDeletingStory] = useState<Story | null>(null);
  const [isEditStorySubmitting, setIsEditStorySubmitting] = useState(false);
  const [editParentStoryText, setEditParentStoryText] = useState('');
  const releases = releasesAndMilestones.filter(r => r.itemType === 'Release');
  const [testCaseInputText, setTestCaseInputText] = useState('');

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
          status: 'To Do',
          sprintId: 'backlog',
          releaseId: 'unassigned',
      }
  });

  const kanbanWatchedImpactedSystemId = useWatch({ control: subTaskForm.control, name: 'impactedSystemId' });
  const kanbanFilteredUsersForSubTasks = useMemo(() => {
    if (!kanbanWatchedImpactedSystemId || kanbanWatchedImpactedSystemId === 'unassigned') return users;
    return users.filter(emp => emp.capabilities?.includes(kanbanWatchedImpactedSystemId));
  }, [users, kanbanWatchedImpactedSystemId]);

  const calculateBusinessDays = useCallback((startStr?: string, endStr?: string): number => {
    if(!startStr || !endStr) return 0;
    try {
        const start = parseISO(startStr);
        const end = parseISO(endStr);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
            return 0;
        }

        const holidayDates = holidays.map(h => new Date(h.date));

        const interval = eachDayOfInterval({ start, end });
        
        const businessDays = interval.filter(day => {
            const dayOfWeek = day.getDay();
            const isWeekend = weeklyOffDays.includes(dayOfWeek);
            const isHoliday = holidayDates.some(holiday => isSameDay(day, holiday));
            return !isWeekend && !isHoliday;
        });

        return businessDays.length;
    } catch(e) {
        console.error("Error calculating business days", e);
        return 0;
    }
  }, [holidays, weeklyOffDays]);
  
  const actualEffortInHours = useMemo(() => {
    if (!selectedStory) return null;
    // For parent stories, actual effort is sum of sub-tasks' actual effort
    if (['Requirement/Story', 'Feature Change', 'Task'].includes(selectedStory.itemType)) {
        const subTasks = stories.filter(s => s.parentStoryId === selectedStory.id && s.itemType === 'Sub Task');
        if (subTasks.length === 0) return null; // Or show based on parent dates if no sub-tasks?

        return subTasks.reduce((total, task) => {
            if (!task.developmentStartDate || !task.completionDate) return total;
            const start = parseISO(task.developmentStartDate);
            const end = parseISO(task.completionDate);
            const days = calculateBusinessDays(start.toISOString(), end.toISOString());
            const hoursPerDay = projectSettings?.manDayToHours || 8;
            return total + (days * hoursPerDay);
        }, 0);
    }
    
    // For sub-tasks or bugs, calculate based on own dates
    if (!selectedStory?.developmentStartDate || !selectedStory?.completionDate) return null;
    const start = parseISO(selectedStory.developmentStartDate);
    const end = parseISO(selectedStory.completionDate);
    const days = calculateBusinessDays(start.toISOString(), end.toISOString());
    const hoursPerDay = projectSettings?.manDayToHours || 8;
    return days * hoursPerDay;

}, [selectedStory, stories, calculateBusinessDays, projectSettings]);

  const handleSetSelectedStory = (story: Story | null) => {
    if (story) {
        setSelectionStack([story]);
    } else {
        setSelectionStack([]);
    }
  };
  
  const handleDrillDown = (story: Story) => {
    setSelectionStack(prev => [...prev, story]);
  }
  
  const handleGoBack = () => {
    setSelectionStack(prev => prev.slice(0, prev.length - 1));
  }


  const allStoriesById = useMemo(() => stories.reduce((acc, story) => {
    acc[story.id] = story;
    return acc;
  }, {} as Record<string, Story>), [stories]);
  
  const subItemsByStoryId = useMemo(() => stories.reduce((acc, story) => {
    if (['Bug', 'Sub Task'].includes(story.itemType) && story.parentStoryId) {
        if (!acc[story.parentStoryId]) {
            acc[story.parentStoryId] = [];
        }
        acc[story.parentStoryId].push(story);
    }
    return acc;
  }, {} as Record<string, Story[]>), [stories]);

  const parentStories = useMemo(() => stories.filter(s => ['Requirement/Story'].includes(s.itemType)), [stories]);
  const parentStoryOptions = useMemo(() => parentStories.map(s => ({
    value: s.id,
    label: `[${s.storyId}] ${s.title}`
  })), [parentStories]);

  const testCaseOptions = useMemo(() => testCases.map(tc => ({
    value: tc.id,
    label: `[${tc.testCaseId}] ${tc.title}`,
  })), [testCases]);

  useEffect(() => {
    if (!selectedStory) {
        setIsEditStorySubmitting(false);
        return;
    }
    if (selectedStory.itemType === 'Sub Task') {
       subTaskForm.reset({
            title: selectedStory.title,
            description: selectedStory.description || '',
            impactedSystemId: selectedStory.impactedSystemId || 'unassigned',
            estimatedHours: selectedStory.estimatedHours,
            assigneeId: selectedStory.assigneeId || 'unassigned',
            status: selectedStory.status,
            sprintId: selectedStory.sprintId || 'backlog',
            releaseId: selectedStory.releaseId || 'unassigned',
        });
    } else {
      const isSubItem = ['Bug', 'Feature Change', 'Task'].includes(selectedStory.itemType);
      
      const testCase = testCases.find(tc => tc.id === selectedStory.relatedTestCaseId);
      setTestCaseInputText(testCase ? `[${testCase.testCaseId}] ${testCase.title}` : '');

      editStoryForm.reset({
        title: selectedStory.title,
        description: selectedStory.description || '',
        acceptanceCriteria: selectedStory.acceptanceCriteria || '',
        epicId: !isSubItem ? selectedStory.epicId || 'unassigned' : undefined,
        parentStoryId: isSubItem ? selectedStory.parentStoryId || undefined : undefined,
        assigneeId: selectedStory.assigneeId || 'unassigned',
        estimatedHours: selectedStory.estimatedHours,
        priority: selectedStory.priority || 'Medium',
        severity: selectedStory.severity || 'Medium',
        environmentId: selectedStory.environmentId || 'unassigned',
        impactedSystemIds: selectedStory.impactedSystemIds || [],
        attachments: selectedStory.attachments || '',
        status: selectedStory.status,
        sprintId: selectedStory.sprintId || 'backlog',
        releaseId: selectedStory.releaseId || 'unassigned',
        createdAt: selectedStory.createdAt ? parseISO(selectedStory.createdAt) : undefined,
        closedAt: selectedStory.closedAt ? parseISO(selectedStory.closedAt) : undefined,
        relatedTestCaseId: selectedStory.relatedTestCaseId,
      });
      if (isSubItem && selectedStory.parentStoryId) {
          const parent = parentStoryOptions.find(p => p.value === selectedStory.parentStoryId);
          setEditParentStoryText(parent?.label || '');
      } else {
          setEditParentStoryText('');
      }
    }
  }, [selectedStory, editStoryForm, subTaskForm, parentStoryOptions, testCases]);

  const onEditStorySubmit = async (values: z.infer<typeof storyFormSchema>) => {
    if (!selectedStory) return;
    setIsEditStorySubmitting(true);
    const success = await updateStory(selectedStory.id, {
        ...values,
        createdAt: values.createdAt ? values.createdAt.toISOString() : undefined,
        closedAt: values.closedAt ? values.closedAt.toISOString() : undefined,
    });
    if (success) {
        handleSetSelectedStory(null);
    } else {
        toast({ variant: "destructive", title: `Error Editing ${selectedStory.itemType}`, description: "Could not save your changes." });
    }
    setIsEditStorySubmitting(false);
};
  
  const onEditSubTaskSubmit = async (values: z.infer<typeof subTaskFormSchema>) => {
    if (!selectedStory || selectedStory.itemType !== 'Sub Task') return;
    setIsEditStorySubmitting(true);
    
    const success = await updateStory(selectedStory.id, {
        ...values,
    });

    if (success) {
        handleSetSelectedStory(null);
    } else {
        toast({ variant: "destructive", title: "Error Editing Sub Task", description: "Could not save your changes." });
    }
    setIsEditStorySubmitting(false);
  };

  const handleDeleteStory = (storyId: string) => {
    setDeletingStory(null);
    deleteStory(storyId).then(success => {
        if (!success) toast({ variant: "destructive", title: "Error", description: "Could not delete story." });
    });
  };
  
  const currentSprint = useMemo(() => sprints.find((s) => s.isCurrent), [sprints]);
  
  const baseSprintStories = useMemo(() => currentSprint
      ? stories.filter((story) => story.sprintId === currentSprint.id)
      : [], [stories, currentSprint]);

  const sprintStories = useMemo(() => {
    let filteredByView: Story[];

    if (viewBy === 'story') {
        filteredByView = baseSprintStories.filter(story => ['Requirement/Story', 'Task', 'Feature Change'].includes(story.itemType));
    } else if (viewBy === 'sub-task') {
        filteredByView = baseSprintStories.filter(story => story.itemType === 'Sub Task');
    } else if (viewBy === 'bug') {
        filteredByView = baseSprintStories.filter(story => story.itemType === 'Bug');
    } else {
        filteredByView = [];
    }
    
    return selectedAssigneeId === 'all'
      ? filteredByView
      : filteredByView.filter(story => story.assigneeId === selectedAssigneeId);
  }, [baseSprintStories, selectedAssigneeId, viewBy]);


 const selectedStorySubItems = useMemo(() => {
    if (!selectedStory) return { subTasks: [], bugs: [], logs: [] };
    const allSubItems = subItemsByStoryId[selectedStory.id] || [];
    return {
      subTasks: allSubItems.filter(item => item.itemType === 'Sub Task'),
      bugs: allSubItems.filter(item => item.itemType === 'Bug'),
      logs: selectedStory.statusHistory?.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()) || [],
    };
  }, [selectedStory, subItemsByStoryId]);
  
  const sortedEnvironments = useMemo(() => [...environments].sort((a,b) => a.order - b.order), [environments]);


  if (!currentSprint) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 h-full flex flex-col">
        <PageHeader title="Kanban Board" description="No active sprint found."></PageHeader>
        <div className="flex flex-1 items-center justify-center bg-muted/50 rounded-lg">
            <p className="text-lg text-muted-foreground">There is no active sprint. Please set a current sprint in the backlog.</p>
        </div>
      </div>
    );
  }

  const sprintAssigneeIds = new Set(baseSprintStories.map(story => story.assigneeId).filter(Boolean));
  const sprintAssignees = users.filter(emp => sprintAssigneeIds.has(emp.id));

  const sortedColumns = kanbanColumns.sort((a, b) => a.order - b.order);
  const doneColumnName = sortedColumns.find(c => c.isDoneColumn)?.name || 'Done';

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 h-full flex flex-col">
        <PageHeader title={`Kanban Board: ${currentSprint.title}`} description={`Move work items to change their status.`}>
          <div className="flex items-center gap-2">
            <div className="grid gap-2">
                <Label htmlFor="view-by-filter">View</Label>
                <Select value={viewBy} onValueChange={(v) => setViewBy(v as any)}>
                    <SelectTrigger id="view-by-filter" className="w-[180px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="story">Stories</SelectItem>
                        <SelectItem value="sub-task">Sub-tasks</SelectItem>
                        <SelectItem value="bug">Bugs</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="assignee-filter">Assignee</Label>
                <Select value={selectedAssigneeId} onValueChange={setSelectedAssigneeId}>
                  <SelectTrigger id="assignee-filter" className="w-[200px]">
                    <SelectValue placeholder="Filter by assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assignees</SelectItem>
                    {sprintAssignees.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>
          </div>
        </PageHeader>
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
          {sortedColumns.map((column) => {
            const itemsInColumn = sprintStories.filter((story) => story.status === column.name);
            return (
              <div key={column.id} className="bg-muted/50 rounded-lg p-4 h-full flex flex-col min-w-[320px] w-1/3">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Columns className="mr-2 h-5 w-5" />
                  {column.name}
                  <span className="ml-2 bg-primary text-primary-foreground h-6 w-6 rounded-full flex items-center justify-center text-sm">
                    {itemsInColumn.length}
                  </span>
                </h3>
                <div className="flex-1 space-y-4 overflow-y-auto">
                  {itemsInColumn.map((story) => {
                      const epic = epics.find(e => e.id === story.epicId);
                      const assignee = users.find(u => u.id === story.assigneeId);
                      const parentStory = story.parentStoryId ? allStoriesById[story.parentStoryId] : undefined;
                      const subItems = subItemsByStoryId[story.id] || [];
                      const allSubItemsDone = subItems.every(sub => sub.status === doneColumnName);

                      const isMoveToDoneDisabled = ['Requirement/Story', 'Feature Change'].includes(story.itemType) && !allSubItemsDone;

                      return (
                        <div key={story.id}>
                          <StoryCard 
                            story={story} 
                            epic={epic}
                            assignee={assignee}
                            parentStory={parentStory}
                            columns={sortedColumns}
                            onStatusChange={(newStatus) => moveStoryStatus(story.id, newStatus)} 
                            onEdit={() => handleSetSelectedStory(story)}
                            isMoveToDoneDisabled={isMoveToDoneDisabled}
                            subItems={subItems}
                            onSubItemClick={handleDrillDown}
                            onSubItemStatusChange={(storyId, newStatus) => updateStory(storyId, { status: newStatus })}
                          />
                        </div>
                      );
                  })}
                </div>
              </div>
          )})}
        </div>
      </div>

      <Dialog open={!!selectedStory} onOpenChange={(isOpen) => !isOpen && handleSetSelectedStory(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          {selectedStory && (
            <>
              {selectedStory.itemType === 'Sub Task' ? (
                <>
                  <DialogHeader>
                    <div className="flex items-center gap-2">
                        {selectionStack.length > 1 && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleGoBack}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        )}
                        <DialogTitle>Edit Sub Task</DialogTitle>
                    </div>
                    <DialogDescription>Make changes to your sub task here.</DialogDescription>
                  </DialogHeader>
                  <Form {...subTaskForm}>
                    <form onSubmit={subTaskForm.handleSubmit(onEditSubTaskSubmit)} className="space-y-4 py-4">
                        <FormField control={subTaskForm.control} name="title" render={({field}) => (
                            <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Sub-task title" {...field}/></FormControl><FormMessage/></FormItem>
                        )}/>
                        <Tabs defaultValue="details" className="w-full">
                            <TabsList>
                                <TabsTrigger value="details">Details</TabsTrigger>
                                <TabsTrigger value="logs">Logs</TabsTrigger>
                            </TabsList>
                            <TabsContent value="details" className="pt-4">
                                <div className="space-y-4">
                                    <FormField control={subTaskForm.control} name="description" render={({field}) => (
                                        <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Describe sub-task..." {...field}/></FormControl><FormMessage/></FormItem>
                                    )}/>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField control={subTaskForm.control} name="impactedSystemId" render={({field}) => (
                                            <FormItem><FormLabel>Impacted System</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a system"/></SelectTrigger></FormControl>
                                                    <SelectContent><SelectItem value="unassigned">None</SelectItem>{users.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
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
                                                {kanbanFilteredUsersForSubTasks.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}
                                            </SelectContent>
                                            </Select>
                                            <FormMessage/>
                                        </FormItem>
                                        )}/>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <FormField
                                        control={subTaskForm.control}
                                        name="status"
                                        render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>Status</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                {statusOptions.map((p) => (
                                                    <SelectItem key={p} value={p}>
                                                    {p}
                                                    </SelectItem>
                                                ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                        />
                                        <FormField control={subTaskForm.control} name="estimatedHours" render={({field}) => (
                                            <FormItem><FormLabel>Effort (hours)</FormLabel><FormControl><Input type="number" placeholder="0" {...field} value={field.value ?? ''}/></FormControl><FormMessage/></FormItem>
                                        )}/>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField control={subTaskForm.control} name="sprintId" render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>Sprint</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || 'backlog'}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Assign to a sprint" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                <SelectItem value="backlog">Backlog</SelectItem>
                                                {sprints.map(sprint => (
                                                    <SelectItem key={sprint.id} value={sprint.id}>{sprint.title}</SelectItem>
                                                ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={subTaskForm.control} name="releaseId" render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>Release</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Assign to a release" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                                {releases.map(release => (
                                                    <SelectItem key={release.id} value={release.id}>[{release.releaseId}] {release.name}</SelectItem>
                                                ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>
                                </div>
                            </TabsContent>
                            <TabsContent value="logs">
                                <div className="space-y-2 pt-4 max-h-96 overflow-y-auto">
                                    {selectedStorySubItems.logs.length > 0 ? (
                                        selectedStorySubItems.logs.map((log, index) => (
                                            <div key={index} className="flex items-center justify-between text-sm p-2 border-b">
                                                <span>Status changed to <strong>{log.toStatus}</strong> from <strong>{log.fromStatus || 'None'}</strong></span>
                                                <span className="text-muted-foreground">{format(new Date(log.date), 'PP pp')}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic px-2">No status changes logged.</p>
                                    )}
                                    {selectedStory?.estimatedHours && (
                                        <div className="flex items-center justify-between text-sm p-2 border-t font-semibold">
                                            <span>Planned Effort:</span>
                                            <span>{selectedStory.estimatedHours} {selectedStory.estimatedHours === 1 ? 'hour' : 'hours'}</span>
                                        </div>
                                    )}
                                     {actualEffortInHours !== null && (
                                        <div className="flex items-center justify-between text-sm p-2 border-t font-semibold">
                                            <span>Actual Effort:</span>
                                            <span>{actualEffortInHours.toFixed(2)} hours</span>
                                        </div>
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
              ) : (
                <>
                <DialogHeader>
                  <DialogTitle>Edit {selectedStory.itemType}</DialogTitle>
                  <DialogDescription>
                    Make changes to your {selectedStory.itemType.toLowerCase()} here. Click save when you're done.
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
                              {!['Task', 'Bug'].includes(selectedStory.itemType) && (
                                <>
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
                                </>
                              )}
                               <TabsTrigger value="logs">
                                    Logs
                                    <Badge variant="secondary" className="ml-2">
                                        {selectedStorySubItems.logs.length}
                                    </Badge>
                                </TabsTrigger>
                          </TabsList>
                          <TabsContent value="details" className="pt-4">
                              <div className="space-y-4">
                                  {['Requirement/Story', 'Feature Change', 'Task', 'Bug'].includes(selectedStory.itemType) && (
                                    <FormField
                                        control={editStoryForm.control}
                                        name="impactedSystemIds"
                                        render={() => (
                                        <FormItem>
                                            <FormLabel>Impacted Systems</FormLabel>
                                            <div className="grid grid-cols-2 gap-2 p-2 border rounded-md">
                                            {impactedSystems.map((system) => (
                                                <FormField
                                                key={system.id}
                                                control={editStoryForm.control}
                                                name="impactedSystemIds"
                                                render={({ field }) => {
                                                    return (
                                                    <FormItem
                                                        key={system.id}
                                                        className="flex flex-row items-start space-x-3 space-y-0"
                                                    >
                                                        <FormControl>
                                                        <Checkbox
                                                            checked={field.value?.includes(system.id)}
                                                            onCheckedChange={(checked) => {
                                                            return checked
                                                                ? field.onChange([...(field.value || []), system.id])
                                                                : field.onChange(
                                                                    field.value?.filter(
                                                                    (value) => value !== system.id
                                                                    )
                                                                )
                                                            }}
                                                        />
                                                        </FormControl>
                                                        <FormLabel className="font-normal">
                                                        {system.name}
                                                        </FormLabel>
                                                    </FormItem>
                                                    )
                                                }}
                                                />
                                            ))}
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                  )}
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
                                  {['Requirement/Story', 'Task'].includes(selectedStory.itemType) ? (
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
                                  ) : null}
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
                                              {users.map((emp) => (
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
                                  {['Feature Change', 'Bug'].includes(selectedStory.itemType) ? (
                                    <FormField
                                      control={editStoryForm.control}
                                      name={selectedStory.itemType === 'Bug' ? 'relatedTestCaseId' : 'parentStoryId'}
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>{selectedStory.itemType === 'Bug' ? 'Related Test Case' : 'Parent Item'}</FormLabel>
                                          <FormControl>
                                            <Input
                                              list={selectedStory.itemType === 'Bug' ? "testcase-options" : "parent-story-options-edit"}
                                              placeholder={selectedStory.itemType === 'Bug' ? "Link to a test case" : "Link to a story or feature change"}
                                              value={selectedStory.itemType === 'Bug' ? testCaseInputText : editParentStoryText}
                                              onChange={(e) => {
                                                const text = e.target.value;
                                                const options = selectedStory.itemType === 'Bug' ? testCaseOptions : parentStoryOptions;
                                                if(selectedStory.itemType === 'Bug') setTestCaseInputText(text);
                                                else setEditParentStoryText(text);

                                                const matchingOption = options.find(
                                                  (opt) => opt.label === text
                                                );
                                                field.onChange(
                                                  matchingOption ? matchingOption.value : undefined
                                                );
                                              }}
                                              onBlur={() => {
                                                 const options = selectedStory.itemType === 'Bug' ? testCaseOptions : parentStoryOptions;
                                                 const text = selectedStory.itemType === 'Bug' ? testCaseInputText : editParentStoryText;
                                                const matchingOption = options.find(
                                                  (opt) => opt.label === text
                                                );
                                                if (!matchingOption) {
                                                   if(selectedStory.itemType === 'Bug') setTestCaseInputText('');
                                                   else setEditParentStoryText('');
                                                  field.onChange(undefined);
                                                }
                                              }}
                                            />
                                          </FormControl>
                                          <datalist id={selectedStory.itemType === 'Bug' ? "testcase-options" : "parent-story-options-edit"}>
                                            {(selectedStory.itemType === 'Bug' ? testCaseOptions : parentStoryOptions).map((opt) => (
                                              <option key={opt.value} value={opt.label} />
                                            ))}
                                          </datalist>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  ) : null}
                                  <FormField
                                    control={editStoryForm.control}
                                    name="priority"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Priority</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                          <FormControl>
                                            <SelectTrigger>
                                              <SelectValue placeholder="Set priority" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            {priorities.map((p) => (
                                              <SelectItem key={p} value={p}>
                                                <div className="flex items-center gap-2">
                                                  <Circle className={cn('h-3 w-3', priorityStyles[p])} />
                                                  <span>{p}</span>
                                                </div>
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                   {selectedStory.itemType === 'Bug' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                      <FormField
                                        control={editStoryForm.control}
                                        name="severity"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Severity</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                              <FormControl>
                                                <SelectTrigger>
                                                  <SelectValue placeholder="Set severity" />
                                                </SelectTrigger>
                                              </FormControl>
                                              <SelectContent>
                                                {severities.map((s) => (
                                                  <SelectItem key={s} value={s}>
                                                    {s}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                    </div>
                                  )}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <FormField
                                    control={editStoryForm.control}
                                    name="status"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                          <FormControl>
                                            <SelectTrigger>
                                              <SelectValue />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            {statusOptions.map((p) => (
                                              <SelectItem key={p} value={p}>
                                                {p}
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
                                  </div>
                                  {selectedStory.itemType === 'Bug' && (
                                      <>
                                          
                                           <FormField
                                              control={editStoryForm.control}
                                              name="attachments"
                                              render={({ field }) => (
                                              <FormItem>
                                                  <FormLabel>Attachments</FormLabel>
                                                  <FormControl>
                                                  <Textarea placeholder="Paste attachment URLs, one per line." {...field} />
                                                  </FormControl>
                                                  <FormMessage />
                                              </FormItem>
                                              )}
                                          />
                                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                               <FormField control={editStoryForm.control} name="createdAt" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Created On</FormLabel>
                                                        <FormControl>
                                                            <DatePicker date={field.value} setDate={field.onChange} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                                <FormField control={editStoryForm.control} name="closedAt" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Closed On</FormLabel>
                                                        <FormControl>
                                                            <DatePicker date={field.value} setDate={field.onChange} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )} />
                                            </div>
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
                                  <div className="space-y-2 rounded-md border p-2">
                                  {selectedStorySubItems.subTasks.length > 0 ? (
                                    selectedStorySubItems.subTasks.map(item => {
                                        const ItemIcon = workItemIcons[item.itemType];
                                        const system = impactedSystems.find(s => s.id === item.impactedSystemId);
                                        return (
                                            <div key={item.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-x-2 text-sm p-2 hover:bg-muted/50 rounded-md">
                                                <ItemIcon className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium cursor-pointer hover:underline truncate" onClick={() => handleDrillDown(item)}>[{item.storyId}] {item.title}</span>
                                                <Badge variant="outline" className="w-24 justify-center truncate">{system?.name || 'N/A'}</Badge>
                                                <Badge variant="secondary" className="justify-center">{item.estimatedHours || 0}h</Badge>
                                                <Badge variant="outline" className="w-24 justify-center">{item.status}</Badge>
                                            </div>
                                        )
                                    })
                                  ) : (
                                    <p className="text-sm text-muted-foreground italic px-2 py-4 text-center">No sub-tasks linked.</p>
                                  )}
                                  </div>
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
                                                      <span className="cursor-pointer hover:underline" onClick={() => handleDrillDown(item)}>[{item.storyId}] {item.title}</span>
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
                          <TabsContent value="logs">
                            <div className="space-y-2 pt-4 max-h-96 overflow-y-auto">
                                {selectedStorySubItems.logs.length > 0 ? (
                                    selectedStorySubItems.logs.map((log, index) => (
                                        <div key={index} className="flex items-center justify-between text-sm p-2 border-b">
                                            <span>Status changed to <strong>{log.toStatus}</strong> from <strong>{log.fromStatus || 'None'}</strong></span>
                                            <span className="text-muted-foreground">{format(new Date(log.date), 'PP pp')}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground italic px-2">No status changes logged.</p>
                                )}
                                {selectedStory?.estimatedHours && (
                                    <div className="flex items-center justify-between text-sm p-2 border-t font-semibold">
                                        <span>Planned Effort:</span>
                                        <span>{selectedStory.estimatedHours} {selectedStory.estimatedHours === 1 ? 'hour' : 'hours'}</span>
                                    </div>
                                )}
                                {actualEffortInHours !== null && (
                                    <div className="flex items-center justify-between text-sm p-2 border-t font-semibold">
                                        <span>Actual Effort:</span>
                                        <span>{actualEffortInHours.toFixed(2)} hours</span>
                                    </div>
                                )}
                            </div>
                          </TabsContent>
                      </Tabs>
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
                                    handleSetSelectedStory(null);
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
                                    handleSetSelectedStory(null);
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
                                        handleSetSelectedStory(null);
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}



