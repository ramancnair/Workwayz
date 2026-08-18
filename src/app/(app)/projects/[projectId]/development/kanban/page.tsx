

'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/PageHeader';
import type { Story, Epic, StoryStatus, User, WorkItemType, KanbanColumn, Environment, ImpactedSystem, Release, Sprint, Priority, BugSeverity, TestCase } from '@/types';
import { Columns, ChevronDown, Clock, BookOpen, Bug, CheckSquare, GitCommit, TrendingUp, Trash2, Ban, Edit, Flag, ArrowLeft, ClipboardList, Circle, CheckCircle, Search } from 'lucide-react';
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
import { cn, getSprintDisplayId } from '@/lib/utils';
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

const getColumnForBugStatus = (status: string, columns: KanbanColumn[]): string => {
  const doneColName = columns.find(c => c.isDoneColumn)?.name || 'Done';
  const inQaColName = columns.find(c => c.name === 'In QA' || c.name === 'QA')?.name || 'In QA';
  const firstColName = columns[0]?.name || 'To Do';

  if (status === 'In Triage' || status === 'Defect Backlog' || status === 'Open' || status === 'Reopened') return firstColName;
  if (status === 'In Progress') return 'In Progress';
  if (status === 'Retest' || status === 'Resolved') return inQaColName;
  if (status === 'Closed') return doneColName;
  return status;
};


const storyFormSchema = z.object({
  title: z.string().min(1, 'Title is required.').max(60, 'Title cannot exceed 60 characters.'),
  description: z.string().max(300, 'Description cannot exceed 300 characters.').optional(),
  acceptanceCriteria: z.string().optional(),
  epicId: z.string().optional(),
  parentStoryId: z.string().optional(),
  assigneeId: z.string().optional(),
  estimatedHours: z.coerce.number().optional(),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low', 'Backburner']).optional(),
  foundInTestPlanId: z.string().optional(),
  relatedBugId: z.string().optional(),
  impactedSystemIds: z.array(z.string()).optional(),
  attachments: z.string().optional(),
  status: z.string().optional(),
  sprintId: z.string().optional(),
  releaseId: z.string().optional(),
  predecessorId: z.string().optional(),
  createdAt: z.date().optional(),
  closedAt: z.date().optional(),
  relatedTestCaseId: z.string().optional(),
});

const subTaskFormSchema = z.object({
    title: z.string().min(1, 'Title is required.').max(60, 'Title cannot exceed 60 characters.'),
    description: z.string().max(300, 'Description cannot exceed 300 characters.').optional(),
    impactedSystemId: z.string().optional(),
    estimatedHours: z.coerce.number().optional(),
    assigneeId: z.string().optional(),
    status: z.string(),
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

  const displayEffort = useMemo(() => {
    if (['Requirement/Story', 'Feature Change', 'Task'].includes(story.itemType)) {
      if (subTasks.length > 0 || bugs.length > 0) {
        return [...subTasks, ...bugs].reduce((sum, item) => sum + (item.estimatedHours || 0), 0);
      }
    }
    return story.estimatedHours;
  }, [story.itemType, story.estimatedHours, subTasks, bugs]);


  return (
    <Collapsible>
    <Card className={cn("bg-card", className)}>
      <div className="p-4">
        <div className="flex justify-between items-start gap-2">
            <div className="flex-1 space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    {showSubItems ? (
                      <CollapsibleTrigger asChild>
                          <button type="button" className="focus:outline-none">
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
                              <button type="button" className="focus:outline-none">
                                <Circle className={cn("h-3 w-3 cursor-pointer", priorityStyles[story.priority])} />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                            <p>{story.priority} Priority</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                    )}
                    <p className="text-xs font-semibold text-muted-foreground truncate">
                    {parentStory ? `${parentStory.storyId} > ${story.storyId}` : story.storyId}
                    </p>
                    {isReadyForDev && <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />}
                </div>
                <p className="font-semibold break-words text-sm">{story.title}</p>
                {epic && (
                  <div className="pt-1">
                    <Badge variant="secondary" className="max-w-full truncate inline-block text-[10px] px-2 py-0.5">
                      {epic.title}
                    </Badge>
                  </div>
                )}
            </div>
            <div className="flex items-center flex-shrink-0">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}>
                    <Edit className="h-4 w-4" />
                </Button>
            </div>
        </div>
      </div>
      <CardFooter className="flex justify-between items-center p-4 pt-0 gap-2" onClick={(e) => e.stopPropagation()}>
         <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground min-w-0">
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
            {displayEffort !== undefined && (
                <div className="flex items-center gap-1 whitespace-nowrap" title="Development effort">
                    <Clock className="h-3 w-3" />
                    <span>{displayEffort}h</span>
                </div>
            )}
            {showSubItems && (
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer">
                  {subTasks.length > 0 && (
                    <div className="flex items-center gap-1 whitespace-nowrap" title={`${subTasks.length} sub-tasks`}>
                      <CheckSquare className="h-3 w-3" />
                      <span>{subTasks.length}</span>
                    </div>
                  )}
                  {bugs.length > 0 && (
                    <div className="flex items-center gap-1 whitespace-nowrap" title={`${bugs.length} bugs`}>
                      <Bug className="h-3 w-3" />
                      <span>{bugs.length}</span>
                    </div>
                  )}
                </div>
              </CollapsibleTrigger>
            )}
          </div>
        <div className="flex items-center gap-1 flex-shrink-0">
            {onStatusChange && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 text-xs px-2">
                        Move <ChevronDown className="ml-1 h-3 w-3" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {columns.filter(col => {
                            const currentColumnName = story.itemType === 'Bug' ? getColumnForBugStatus(story.status, columns) : story.status;
                            return col.name !== currentColumnName;
                        }).map(col => {
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
                    <div key={item.id} className="flex flex-col gap-1 py-1.5 border-b border-border/40 last:border-0 min-w-0">
                        <div className="flex items-start gap-2 min-w-0">
                            <ItemIcon className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span 
                                className="font-medium cursor-pointer hover:underline truncate flex-1 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSubItemClick(item);
                                }}
                            >
                                [{item.storyId}] {item.title}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground pl-5" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                {impactedSystem && (
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 truncate max-w-[100px]">
                                        {impactedSystem.name}
                                    </Badge>
                                )}
                                {item.estimatedHours ? (
                                    <span className="flex items-center gap-0.5 whitespace-nowrap">
                                        <Clock className="h-2.5 w-2.5" />
                                        {item.estimatedHours}h
                                    </span>
                                ) : null}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Badge variant="outline" className="cursor-pointer text-[9px] px-1.5 py-0 h-4 bg-background whitespace-nowrap">
                                  {item.status}
                                </Badge>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                                {(item.itemType === 'Bug' 
                                  ? ['In Triage', 'Defect Backlog', 'In Progress', 'Retest', 'Closed']
                                  : statusOptions).filter(s => s !== item.status).map(status => (
                                  <DropdownMenuItem key={status} onSelect={() => onSubItemStatusChange(item.id, status)}>
                                    {status}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
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
  const { stories, epics, sprints, kanbanColumns, moveStoryStatus, moveStoryToSprint, employees: users, updateStory, deleteStory, environments, impactedSystems, releasesAndMilestones, holidays, weeklyOffDays, projectSettings, testCases, testDate, testPlans, updateTestCase, deleteTestCase } = useProject();
  const { toast } = useToast();
  
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('all');
  const [viewBy, setViewBy] = useState<'story' | 'sub-task'>('story');
  const [selectionStack, setSelectionStack] = useState<Story[]>([]);
  const selectedStory = selectionStack[selectionStack.length - 1] || null;
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);
  const [deletingStory, setDeletingStory] = useState<Story | null>(null);
  const [isEditStorySubmitting, setIsEditStorySubmitting] = useState(false);
  const [editParentStoryText, setEditParentStoryText] = useState('');
  const releases = releasesAndMilestones.filter(r => r.itemType === 'Release');
  const [testCaseInputText, setTestCaseInputText] = useState('');
  const [relatedBugInputText, setRelatedBugInputText] = useState('');
  const [editPredecessorText, setEditPredecessorText] = useState('');

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

  const relatedBugOptions = useMemo(() => stories.filter(s => s.itemType === 'Bug').map(b => ({
    value: b.id,
    label: `[${b.storyId}] ${b.title}`,
  })), [stories]);

  const predecessorOptions = useMemo(() => stories.filter(s => s.id !== selectedStory?.id && s.itemType !== 'Sub Task').map(s => ({
    value: s.id,
    label: `[${s.storyId}] ${s.title}`,
  })), [stories, selectedStory]);

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
      const relBug = stories.find(b => b.id === selectedStory.relatedBugId);
      setRelatedBugInputText(relBug ? `[${relBug.storyId}] ${relBug.title}` : '');
      const predStory = stories.find(s => s.id === selectedStory.predecessorId);
      setEditPredecessorText(predStory ? `[${predStory.storyId}] ${predStory.title}` : '');

      editStoryForm.reset({
        title: selectedStory.title,
        description: selectedStory.description || '',
        acceptanceCriteria: selectedStory.acceptanceCriteria || '',
        epicId: !isSubItem ? selectedStory.epicId || 'unassigned' : undefined,
        parentStoryId: isSubItem ? selectedStory.parentStoryId || undefined : undefined,
        assigneeId: selectedStory.assigneeId || 'unassigned',
        estimatedHours: selectedStory.estimatedHours,
        priority: selectedStory.priority || 'Medium',
        foundInTestPlanId: selectedStory.foundInTestPlanId || 'unassigned',
        relatedBugId: selectedStory.relatedBugId || 'unassigned',
        impactedSystemIds: selectedStory.impactedSystemIds || [],
        attachments: selectedStory.attachments || '',
        status: selectedStory.status,
        sprintId: selectedStory.sprintId || 'backlog',
        releaseId: selectedStory.releaseId || 'unassigned',
        predecessorId: selectedStory.predecessorId || 'unassigned',
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
        priority: values.priority as Priority | undefined,
        relatedBugId: values.relatedBugId === 'unassigned' ? undefined : values.relatedBugId,
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

  const selectedStoryTestCases = useMemo(() => {
    if (!selectedStory) return [];
    return testCases.filter(tc => tc.storyId === selectedStory.id && !tc.isDeleted);
  }, [selectedStory, testCases]);

  const subItemsEffort = useMemo(() => {
    if (!selectedStory) return 0;
    return selectedStorySubItems.subTasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0) + 
           selectedStorySubItems.bugs.reduce((sum, bug) => sum + (bug.estimatedHours || 0), 0);
  }, [selectedStory, selectedStorySubItems]);

  const isEffortReadOnly = useMemo(() => {
    if (!selectedStory) return false;
    return subItemsEffort > 0;
  }, [selectedStory, subItemsEffort]);
  
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
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 h-full flex flex-col min-w-0 overflow-hidden">
        <PageHeader title={`Kanban Board: [${getSprintDisplayId(currentSprint)}] ${currentSprint.title}`} description={`Move work items to change their status.`}>
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
          {sortedColumns.map((column, columnIndex) => {
            // Primary match: story's status matches this column exactly.
            // Fallback: if a story's status doesn't match ANY column (e.g. legacy 'In Development'
            // from older autogenerated data), show it in the first non-done column so it
            // remains visible and actionable rather than silently disappearing from the board.
            const allColumnNames = new Set(sortedColumns.map(c => c.name));
            const firstNonDoneColumn = sortedColumns.find(c => !c.isDoneColumn);
            const itemsInColumn = sprintStories.filter((story) => {
              const currentStatus = story.itemType === 'Bug' ? getColumnForBugStatus(story.status, sortedColumns) : story.status;
              if (currentStatus === column.name) return true;
              // Orphaned status: doesn't belong to any column
              if (!allColumnNames.has(currentStatus) && firstNonDoneColumn && column.id === firstNonDoneColumn.id) return true;
              return false;
            });
            return (
              <div key={column.id} className="bg-muted/50 rounded-lg p-4 h-full flex flex-col min-w-[320px] w-1/3">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Columns className="mr-2 h-5 w-5" />
                  {column.name}
                  <span className="ml-2 bg-primary text-primary-foreground h-6 w-6 rounded-full flex items-center justify-center text-sm">
                    {itemsInColumn.length}
                  </span>
                </h3>
                <div className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden min-w-0">
                  {itemsInColumn.map((story) => {
                      const epic = epics.find(e => e.id === story.epicId);
                      const assignee = users.find(u => u.id === story.assigneeId);
                      const parentStory = story.parentStoryId ? allStoriesById[story.parentStoryId] : undefined;
                      const subItems = subItemsByStoryId[story.id] || [];
                      const activeSubItems = subItems.filter(sub => !sub.isDeleted);
                      const allSubItemsDone = activeSubItems.length === 0 || activeSubItems.every(sub => sub.status === doneColumnName);

                      const isMoveToDoneDisabled = ['Requirement/Story', 'Feature Change', 'Task'].includes(story.itemType) && !allSubItemsDone;

                      return (
                        <div key={story.id}>
                          <StoryCard 
                            story={story} 
                            epic={epic}
                            assignee={assignee}
                            parentStory={parentStory}
                            columns={sortedColumns}
                            onStatusChange={(newStatus) => {
                               let finalStatus = newStatus;
                               if (story.itemType === 'Bug') {
                                   const doneColName = sortedColumns.find(c => c.isDoneColumn)?.name || 'Done';
                                   const inQaColName = sortedColumns.find(c => c.name === 'In QA' || c.name === 'QA')?.name || 'In QA';
                                   
                                   if (newStatus === doneColName) {
                                       finalStatus = 'Closed';
                                   } else if (newStatus === inQaColName) {
                                       finalStatus = 'Resolved';
                                   } else if (newStatus === 'In Progress') {
                                       finalStatus = 'In Progress';
                                   } else {
                                       finalStatus = 'Open';
                                   }
                               }
                               moveStoryStatus(story.id, finalStatus as StoryStatus);
                             }} 
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
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col overflow-hidden" bypassScrollWrapper={true}>
          {selectedStory && (
            <>
              {selectedStory.itemType === 'Sub Task' ? (
                <Form {...subTaskForm}>
                  <form onSubmit={subTaskForm.handleSubmit(onEditSubTaskSubmit)} className="flex flex-col h-full max-h-[90vh] overflow-hidden">
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
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
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
                                                    <SelectContent><SelectItem value="unassigned">None</SelectItem>{impactedSystems.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
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
                                                {[...kanbanFilteredUsersForSubTasks].filter(e => !e.isDeleted && e.isEnabled !== false && !!e.empId && e.empId.trim() !== '').sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, undefined, { numeric: true, sensitivity: 'base' })).map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.empId.trim()})</SelectItem>)}
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
                                            <FormItem><FormLabel>Effort (hours)</FormLabel><FormControl><Input type="number" placeholder="" {...field} value={field.value ?? ''}/></FormControl><FormMessage/></FormItem>
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
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isEditStorySubmitting}>
                            {isEditStorySubmitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                  </form>
                </Form>
              ) : (
                <Form {...editStoryForm}>
                  <form onSubmit={editStoryForm.handleSubmit(onEditStorySubmit)} className="flex flex-col h-full max-h-[90vh] overflow-hidden">
                    <DialogHeader>
                      <DialogTitle>Edit {selectedStory.itemType}</DialogTitle>
                      <DialogDescription>
                        Make changes to your {selectedStory.itemType.toLowerCase()} here. Click save when you're done.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
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
                                  <TabsTrigger value="testCases">
                                      Test Cases
                                      <Badge variant="secondary" className="ml-2">
                                          {selectedStoryTestCases.length}
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
                                  {['Requirement/Story', 'Task', 'Bug', 'Feature Change'].includes(selectedStory.itemType) ? (
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
                                        name="foundInTestPlanId"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Found In Test Plan</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                                              <FormControl>
                                                <SelectTrigger>
                                                  <SelectValue placeholder="Select a Test Plan" />
                                                </SelectTrigger>
                                              </FormControl>
                                              <SelectContent>
                                                <SelectItem value="unassigned">None</SelectItem>
                                                {testPlans.map(tp => (
                                                  <SelectItem key={tp.id} value={tp.id}>{tp.name}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                      <FormField
                                        control={editStoryForm.control}
                                        name={"severity" as any}
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Severity</FormLabel>
                                            <Select onValueChange={field.onChange} value={(field.value as string) || ''}>
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
                                      <FormField
                                        control={editStoryForm.control}
                                        name="relatedBugId"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Related / Original Bug</FormLabel>
                                            <FormControl>
                                              <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                                <Input
                                                  list="bug-options-kanban"
                                                  placeholder="Search for a bug..."
                                                  className="pl-9"
                                                  value={relatedBugInputText}
                                                  onChange={(e) => {
                                                    const text = e.target.value;
                                                    setRelatedBugInputText(text);
                                                    const matchingOption = relatedBugOptions.find(opt => opt.label === text);
                                                    field.onChange(matchingOption ? matchingOption.value : 'unassigned');
                                                  }}
                                                  onBlur={() => {
                                                    const matchingOption = relatedBugOptions.find(opt => opt.label === relatedBugInputText);
                                                    if (!matchingOption) {
                                                      setRelatedBugInputText('');
                                                      field.onChange('unassigned');
                                                    }
                                                  }}
                                                />
                                              </div>
                                            </FormControl>
                                            <datalist id="bug-options-kanban">
                                              {relatedBugOptions.filter(opt => opt.value !== selectedStory?.id).map(opt => <option key={opt.value} value={opt.label} />)}
                                            </datalist>
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
                                            {(selectedStory?.itemType === 'Bug' ? ['In Triage', 'Defect Backlog', 'In Progress', 'Retest', 'Closed'] : statusOptions).map((p) => (
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
                                                              <Input 
                                                                  type="date" 
                                                                  disabled
                                                                  value={field.value instanceof Date && !isNaN(field.value.getTime()) ? field.value.toISOString().split('T')[0] : ''}
                                                                  onChange={(e) => {
                                                                      const val = e.target.value;
                                                                      field.onChange(val ? new Date(val) : undefined);
                                                                  }}
                                                              />
                                                          </FormControl>
                                                         <FormMessage />
                                                     </FormItem>
                                                 )} />
                                                 <FormField control={editStoryForm.control} name="closedAt" render={({ field }) => (
                                                     <FormItem>
                                                         <FormLabel>Closed On</FormLabel>
                                                         <FormControl>
                                                             <Input 
                                                                 type="date" 
                                                                 value={field.value instanceof Date && !isNaN(field.value.getTime()) ? field.value.toISOString().split('T')[0] : ''}
                                                                 onChange={(e) => {
                                                                     const val = e.target.value;
                                                                     field.onChange(val ? new Date(val) : undefined);
                                                                 }}
                                                             />
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
                                              <FormLabel>Effort (hours)</FormLabel>
                                              <FormControl>
                                              <Input type="number" placeholder="" {...field} value={isEffortReadOnly ? subItemsEffort : (field.value ?? '')} readOnly={isEffortReadOnly} />
                                              </FormControl>
                                              {isEffortReadOnly && <p className="text-xs text-muted-foreground">Effort is calculated from linked sub-tasks.</p>}
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
                          <TabsContent value="testCases">
                             <div className="space-y-4 pt-4">
                                  {selectedStoryTestCases.length > 0 ? (
                                      <div className="space-y-2 rounded-md border p-2">
                                      {selectedStoryTestCases.map(tc => (
                                          <div key={tc.id} className="flex items-center justify-between text-sm p-2 hover:bg-muted/50 rounded-md">
                                              <div className='flex items-center gap-2 min-w-0 flex-1'>
                                                  <Badge variant="secondary" className="shrink-0">{tc.testCaseId}</Badge>
                                                  <span className="font-medium truncate cursor-pointer hover:underline text-primary" onClick={() => setEditingTestCase(tc)}>{tc.title}</span>
                                              </div>
                                              <Badge variant="outline" className="ml-2 shrink-0">{tc.type}</Badge>
                                          </div>
                                      ))}
                                      </div>
                                  ) : (
                                      <p className="text-sm text-muted-foreground italic px-2 text-center py-4">No test cases linked.</p>
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
                    </div>
                    <DialogFooter className="flex justify-between items-center px-6 py-4 border-t">
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
                                    moveStoryToSprint?.(selectedStory.id, null);
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
                                        moveStoryToSprint?.(selectedStory.id, sprint.id);
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
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <TestCaseEditDialog
        testCase={editingTestCase}
        isOpen={!!editingTestCase}
        onClose={() => setEditingTestCase(null)}
        onSave={async (data) => {
          if (editingTestCase) {
            return await updateTestCase(editingTestCase.id, data);
          }
          return false;
        }}
        onDelete={async () => {
          if (editingTestCase) {
            return await deleteTestCase(editingTestCase.id);
          }
          return false;
        }}
        releases={releases}
        sprints={sprints}
      />
    </>
  );
}

function TestCaseEditDialog({
  testCase,
  isOpen,
  onClose,
  onSave,
  onDelete,
  releases,
  sprints,
}: {
  testCase: TestCase | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedData: Partial<TestCase>) => Promise<boolean>;
  onDelete?: () => Promise<boolean>;
  releases: any[];
  sprints: any[];
}) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'Functional' | 'Non-functional'>('Functional');
  const [description, setDescription] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [releaseId, setReleaseId] = useState('unassigned');
  const [sprintId, setSprintId] = useState('backlog');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (testCase) {
      setTitle(testCase.title || '');
      setType(testCase.type || 'Functional');
      setDescription(testCase.description || '');
      setExpectedResult(testCase.expectedResult || '');
      setReleaseId(testCase.releaseId || 'unassigned');
      setSprintId(testCase.sprintId || 'backlog');
    }
  }, [testCase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testCase) return;
    setIsSubmitting(true);
    const success = await onSave({
      title,
      type,
      description,
      expectedResult,
      releaseId: releaseId === 'unassigned' ? undefined : releaseId,
      sprintId: sprintId === 'backlog' ? undefined : sprintId,
    });
    if (success) {
      onClose();
    }
    setIsSubmitting(false);
  };

  if (!testCase) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Test Case: {testCase.testCaseId}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2 overflow-y-auto max-h-[calc(90vh-140px)] px-1">
          <div className="space-y-2">
            <Label htmlFor="tc-title">Title</Label>
            <Input id="tc-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tc-type">Type</Label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger id="tc-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Functional">Functional</SelectItem>
                  <SelectItem value="Non-functional">Non-functional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tc-sprint">Sprint</Label>
              <Select value={sprintId} onValueChange={setSprintId}>
                <SelectTrigger id="tc-sprint"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="backlog">Backlog</SelectItem>
                  {sprints.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tc-release">Release</Label>
            <Select value={releaseId} onValueChange={setReleaseId}>
              <SelectTrigger id="tc-release"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {releases.map((r) => (
                  <SelectItem key={r.id} value={r.id}>[{r.releaseId}] {r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tc-desc">Description (Steps)</Label>
            <Textarea id="tc-desc" value={description} onChange={(e) => setDescription(e.target.value)} required rows={4} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tc-expected">Expected Result</Label>
            <Textarea id="tc-expected" value={expectedResult} onChange={(e) => setExpectedResult(e.target.value)} required rows={3} />
          </div>
          <DialogFooter className="pt-2 flex flex-row justify-between items-center w-full">
            {onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={async () => {
                  if (window.confirm('Are you sure you want to delete this test case?')) {
                    setIsSubmitting(true);
                    const success = await onDelete();
                    if (success) {
                      onClose();
                    }
                    setIsSubmitting(false);
                  }
                }}
                disabled={isSubmitting}
              >
                Delete
              </Button>
            )}
            <div className="flex items-center space-x-2 ml-auto">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}




