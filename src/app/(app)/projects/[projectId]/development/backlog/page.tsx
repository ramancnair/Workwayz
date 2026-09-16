'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
import { PlusCircle, ChevronDown, Trash2, Star, Edit, BookOpen, Bug, CheckSquare, GitCommit, TrendingUp, Clock, CornerDownRight, ThumbsUp, ChevronsRight, X, FolderUp, Tag, Library, ArrowLeft, Bot, Package, Move, Circle, CheckCircle, ChevronRight, Search, Layers } from 'lucide-react';
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
import type { Epic, Story, Sprint, User, WorkItemType, StoryStatus, ImpactedSystem, Release, Priority, StatusHistoryItem, BugSeverity, TestCase } from '@/types';
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
import { cn, getUserInitials, matchSearchQuery } from '@/lib/utils';
import { format, parseISO, differenceInDays, eachDayOfInterval, isSameDay } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/datepicker';
import { getAiStorySuggestions } from '@/app/actions';


const workItemIcons: Record<WorkItemType, React.ElementType> = {
  'Requirement/Story': BookOpen,
  Bug: Bug,
  'Task': CheckSquare,
  'Feature Change': GitCommit,
  'Sub Task': CheckSquare,
};

const workItemTypes: WorkItemType[] = ['Requirement/Story', 'Feature Change', 'Task', 'Bug'];
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


const epicFormSchema = z.object({
  title: z.string().min(1, 'Title is required.').max(60, 'Title cannot exceed 60 characters.'),
  description: z.string().max(300, 'Description cannot exceed 300 characters.').optional(),
});

const storyFormSchema = z.object({
  itemType: z.enum(['Requirement/Story', 'Bug', 'Task', 'Feature Change', 'Sub Task']),
  title: z.string().min(1, 'Title is required.').max(60, 'Title cannot exceed 60 characters.'),
  description: z.string().max(300, 'Description cannot exceed 300 characters.').optional(),
  acceptanceCriteria: z.string().optional(),
  epicId: z.string().optional(),
  parentStoryId: z.string().optional(),
  reporterId: z.string().optional(),
  assigneeId: z.string().optional(),
  estimatedHours: z.coerce.number().optional(),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low', 'Backburner']).optional(),
  severity: z.enum(['Critical', 'High', 'Medium', 'Low']).optional(),
  releaseId: z.string().optional(),
  foundInTestPlanId: z.string().optional(),
  relatedBugId: z.string().optional(),
  impactedSystemIds: z.array(z.string()).optional(),
  attachments: z.string().optional(),
  sprintId: z.string().optional(),
  relatedTestCaseId: z.string().optional(),
  predecessorId: z.string().optional(),
  createdAt: z.date().optional(),
  closedAt: z.date().optional(),
});

const subTaskFormSchema = z.object({
    title: z.string().min(1, 'Title is required').max(60, 'Title cannot exceed 60 characters.'),
    description: z.string().max(300, 'Description cannot exceed 300 characters.').optional(),
    impactedSystemId: z.string().optional(),
    estimatedHours: z.coerce.number().optional(),
    assigneeId: z.string().optional(),
    status: z.string(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    sprintId: z.string().optional(),
    releaseId: z.string().optional(),
}).refine(data => {
    if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
    }
    return true;
}, {
    message: "End date must be on or after start date.",
    path: ['endDate'],
});

const bulkMoveSchema = z.object({
  targetEpicId: z.string().optional(),
  targetReleaseId: z.string().optional(),
});


function StoryCard({ story, epic, assignee, onClick, className, subItems, sprint, release, onSubItemClick, isSelected, onSelectionChange }: { story: Story; epic?: Epic; assignee?: User; onClick: () => void; className?: string, subItems?: Story[], sprint?: Sprint | null, release?: Release | null, onSubItemClick: (item: Story) => void; isSelected: boolean; onSelectionChange: (checked: boolean) => void; }) {
  const Icon = workItemIcons[story.itemType];
  const subTasks = useMemo(() => subItems?.filter(i => i.itemType === 'Sub Task') || [], [subItems]);
  const bugs = useMemo(() => subItems?.filter(i => i.itemType === 'Bug') || [], [subItems]);
  
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
      <Card
        className={cn("bg-card cursor-pointer transition-all hover:bg-muted/80 hover:shadow-md relative group", className)}
        onClick={onClick}
        data-state={isSelected ? "selected" : "unselected"}
      >
        <CardHeader className="p-4">
          <div className="flex justify-between items-start gap-2">
            <div className="flex items-start gap-3">
              <Checkbox checked={isSelected} onCheckedChange={onSelectionChange} className="mt-1" onClick={(e) => e.stopPropagation()} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                   <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                           <button onClick={(e) => e.stopPropagation()}>
                            <Circle className={cn("h-3 w-3 cursor-pointer", story.priority ? priorityStyles[story.priority] : 'text-gray-500 fill-gray-500')} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{story.priority || 'No'} Priority</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  <p className="text-xs font-semibold text-muted-foreground">{story.storyId}</p>
                  {isReadyForDev && <CheckCircle className="h-4 w-4 text-green-500" />}
                </div>
                <p className="font-semibold break-words">{story.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
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
                        <AvatarFallback className="text-xs">{getUserInitials(assignee.firstName, assignee.lastName)}</AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Assigned to {assignee.firstName} {assignee.lastName}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
               <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex justify-between items-center text-xs text-muted-foreground">
              <div className='flex items-center gap-2 flex-wrap'>
                  {epic && <Badge variant="secondary">{epic.title}</Badge>}
                  {sprint ? (
                      <Badge variant="outline" className="border-blue-500 text-blue-500">
                          <FolderUp className="h-3 w-3 mr-1" />
                          {sprint.title}
                      </Badge>
                  ) : (
                      <Badge variant="outline" className="border-blue-500 text-blue-500">
                          <Library className="h-3 w-3 mr-1" />
                          Backlog
                      </Badge>
                  )}
                  {release && (
                     <Badge variant="outline" className="border-purple-500 text-purple-500">
                        <Package className="h-3 w-3 mr-1" />
                        {release.releaseId}
                     </Badge>
                  )}
                  {story.status && (
                       <Badge variant="outline">
                          <Tag className="h-3 w-3 mr-1" />
                          {story.status}
                      </Badge>
                  )}
              </div>
              <div className="flex items-center gap-4">
                  {(subTasks.length > 0 || bugs.length > 0) && (
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center gap-2 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                        {subTasks.length > 0 && (
                          <div className="flex items-center gap-1" title={`${subTasks.length} sub-tasks`}>
                            <CheckSquare className="h-3 w-3" />
                            <span>{subTasks.length}</span>
                          </div>
                        )}
                        {bugs.length > 0 && (
                          <div className="flex items-center gap-1" title={`${bugs.length} defects`}>
                            <Bug className="h-3 w-3" />
                            <span>{bugs.length}</span>
                          </div>
                        )}
                      </div>
                    </CollapsibleTrigger>
                  )}
                  {displayEffort !== undefined && (
                  <div className="flex items-center gap-1" title="Development effort">
                      <Clock className="h-3 w-3" />
                      <span>{displayEffort}h</span>
                  </div>
                  )}
              </div>
          </div>
        </CardContent>
        <CollapsibleContent>
            <div className="px-4 pb-4 space-y-2">
                {(subTasks.length > 0 || bugs.length > 0) && <Separator />}
                {[...subTasks, ...bugs].map(item => {
                    const ItemIcon = workItemIcons[item.itemType];
                    return (
                        <div key={item.id} className="flex items-center justify-between text-xs pl-4">
                            <div className="flex items-center gap-2">
                                <ItemIcon className="h-3 w-3 text-muted-foreground" />
                                 <span
                                    className="font-medium cursor-pointer hover:underline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSubItemClick(item);
                                    }}
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


export default function BacklogPage() {
  const { 
    project,
    epics: rawEpics, 
    stories, 
    sprints: rawSprints, 
    employees: rawUsers, 
    releasesAndMilestones,
    impactedSystems: rawImpactedSystems,
    moveStoryToSprint, 
    moveStoryToEpic, 
    deleteStory, 
    deleteEpic, 
    updateEpic, 
    addEpic,
    addStory,
    updateStory,
    bulkDeleteStories,
    bulkMoveStories,
    holidays,
    weeklyOffDays,
    projectSettings,
    testCases,
    testPlans: rawTestPlans,
    testDate,
    updateTestCase,
    deleteTestCase,
  } = useProject();

  const epics = useMemo(() => rawEpics.filter(e => e && e.id && typeof e.id === 'string' && e.id.trim() !== ''), [rawEpics]);
  const sprints = useMemo(() => rawSprints.filter(s => s && s.id && typeof s.id === 'string' && s.id.trim() !== ''), [rawSprints]);
  const users = useMemo(() => rawUsers.filter(u => u && u.id && typeof u.id === 'string' && u.id.trim() !== ''), [rawUsers]);
  const testPlans = useMemo(() => rawTestPlans.filter(tp => tp && tp.id && typeof tp.id === 'string' && tp.id.trim() !== ''), [rawTestPlans]);
  const impactedSystems = useMemo(() => rawImpactedSystems.filter(s => s && s.id && typeof s.id === 'string' && s.id.trim() !== ''), [rawImpactedSystems]);
  
  const { toast } = useToast();

  const [addEpicOpen, setAddEpicOpen] = useState(false);
  const [addRequirementOpen, setAddRequirementOpen] = useState(false);
  
  const [selectionStack, setSelectionStack] = useState<Story[]>([]);
  const selectedStory = selectionStack[selectionStack.length - 1] || null;
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);

  const [editingEpic, setEditingEpic] = useState<Epic | null>(null);
  
  const [isAddEpicSubmitting, setAddEpicSubmitting] = useState(false);
  const [isEditEpicSubmitting, setEditEpicSubmitting] = useState(false);
  const [isAddStorySubmitting, setAddStorySubmitting] = useState(false);
  const [isEditStorySubmitting, setIsEditStorySubmitting] = useState(false);

  const [epicToDelete, setEpicToDelete] = useState<Epic | null>(null);
  const [deleteEpicItems, setDeleteEpicItems] = useState(false);
  const [showAddSubTask, setShowAddSubTask] = useState(false);
  const [isAiGenOpen, setIsAiGenOpen] = useState(false);
  const [isAiGenSubmitting, setIsAiGenSubmitting] = useState(false);
  
  const [selectedStories, setSelectedStories] = useState<string[]>([]);
  const [storiesToDelete, setStoriesToDelete] = useState<string[]>([]);
  const [storiesToMove, setStoriesToMove] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<'epic' | 'sprint'>('epic');

  useEffect(() => {
    setSelectedStories(prev => prev.filter(id => stories.some(s => s.id === id && !s.isDeleted)));
  }, [stories]);

  const [addParentStoryText, setAddParentStoryText] = useState('');
  const [editParentStoryText, setEditParentStoryText] = useState('');
  const [testCaseInputText, setTestCaseInputText] = useState('');
  const [relatedBugInputText, setRelatedBugInputText] = useState('');
  const [addPredecessorText, setAddPredecessorText] = useState('');
  const [editPredecessorText, setEditPredecessorText] = useState('');

  const releases = useMemo(() => releasesAndMilestones.filter(r => r && r.itemType === 'Release' && r.id && typeof r.id === 'string' && r.id.trim() !== ''), [releasesAndMilestones]);

  const calculateBusinessDays = useCallback((start: Date, end: Date): number => {
    if(!start || !end) return 0;
    const holidayDates = holidays.map(h => parseISO(h.date));
    const interval = eachDayOfInterval({ start, end });
    
    return interval.filter(day => {
      const dayOfWeek = day.getDay();
      const isWeekend = weeklyOffDays.includes(dayOfWeek);
      const isHoliday = holidayDates.some(h => isSameDay(day, h));
      return !isWeekend && !isHoliday;
    }).length;
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
            const days = calculateBusinessDays(start, end);
            const hoursPerDay = projectSettings?.manDayToHours || 8;
            return total + (days * hoursPerDay);
        }, 0);
    }
    
    // For sub-tasks or bugs, calculate based on own dates
    if (!selectedStory?.developmentStartDate || !selectedStory?.completionDate) return null;
    const start = parseISO(selectedStory.developmentStartDate);
    const end = parseISO(selectedStory.completionDate);
    const days = calculateBusinessDays(start, end);
    const hoursPerDay = projectSettings?.manDayToHours || 8;
    return days * hoursPerDay;

}, [selectedStory, stories, calculateBusinessDays, projectSettings]);

  const addEpicForm = useForm<z.infer<typeof epicFormSchema>>({
    resolver: zodResolver(epicFormSchema),
    defaultValues: { title: '', description: '' },
  });
  
  const editEpicForm = useForm<z.infer<typeof epicFormSchema>>({
    resolver: zodResolver(epicFormSchema),
  });

  const addStoryForm = useForm<z.infer<typeof storyFormSchema>>({
    resolver: zodResolver(storyFormSchema),
    defaultValues: { itemType: 'Requirement/Story', title: '', description: '', acceptanceCriteria: '', epicId: 'unassigned', parentStoryId: '', reporterId: 'unassigned', assigneeId: 'unassigned', estimatedHours: 0, priority: 'Medium', severity: 'Medium', releaseId: 'unassigned', foundInTestPlanId: 'unassigned', relatedBugId: 'unassigned', impactedSystemIds: [], attachments: '', sprintId: 'backlog', relatedTestCaseId: 'unassigned', predecessorId: 'unassigned' },
  });
  
  const projStart = useMemo(() => project?.startDate ? format(parseISO(project.startDate), 'yyyy-MM-dd') : undefined, [project?.startDate]);
  const projEnd = useMemo(() => project?.endDate ? format(parseISO(project.endDate), 'yyyy-MM-dd') : undefined, [project?.endDate]);

  const dynamicSubTaskSchema = useMemo(() => {
    return subTaskFormSchema.superRefine((data, ctx) => {
      if (projStart && data.startDate && data.startDate < projStart) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Start date cannot be before project start date (${format(parseISO(projStart), 'dd MMM yyyy')}).`,
          path: ['startDate'],
        });
      }
      if (projEnd && data.startDate && data.startDate > projEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Start date cannot be after project end date (${format(parseISO(projEnd), 'dd MMM yyyy')}).`,
          path: ['startDate'],
        });
      }
      if (projStart && data.endDate && data.endDate < projStart) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `End date cannot be before project start date (${format(parseISO(projStart), 'dd MMM yyyy')}).`,
          path: ['endDate'],
        });
      }
      if (projEnd && data.endDate && data.endDate > projEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `End date cannot be after project end date (${format(parseISO(projEnd), 'dd MMM yyyy')}).`,
          path: ['endDate'],
        });
      }
    });
  }, [projStart, projEnd, project]);

  const subTaskForm = useForm<z.infer<typeof subTaskFormSchema>>({
    resolver: zodResolver(dynamicSubTaskSchema),
    defaultValues: {
      title: '',
      description: '',
      impactedSystemId: 'unassigned',
      estimatedHours: 0,
      assigneeId: 'unassigned',
      status: 'To Do',
      startDate: '',
      endDate: '',
      sprintId: 'backlog',
      releaseId: 'unassigned',
    }
  });

  const bulkMoveForm = useForm<z.infer<typeof bulkMoveSchema>>({
    resolver: zodResolver(bulkMoveSchema),
    defaultValues: { targetEpicId: 'no_change', targetReleaseId: 'no_change' }
  });
  
  const watchedItemType = useWatch({ control: addStoryForm.control, name: 'itemType' });
  
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


  const editStoryForm = useForm<z.infer<typeof storyFormSchema>>({
    resolver: zodResolver(storyFormSchema),
  });
  
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
      editEpicForm.reset({
        ...editingEpic,
        title: (editingEpic.title || '').slice(0, 60),
        description: (editingEpic.description || '').slice(0, 300),
      });
    }
  }, [editingEpic, editEpicForm]);
  
  useEffect(() => {
      if (!selectedStory) {
          setIsEditStorySubmitting(false);
          setShowAddSubTask(false);
          subTaskForm.reset();
          return;
      }
  
      if (selectedStory.itemType === 'Sub Task') {
          subTaskForm.reset({
              title: (selectedStory.title || '').slice(0, 60),
              description: (selectedStory.description || '').slice(0, 300),
              impactedSystemId: selectedStory.impactedSystemId || 'unassigned',
              estimatedHours: selectedStory.estimatedHours,
              assigneeId: selectedStory.assigneeId || 'unassigned',
              status: selectedStory.status || 'To Do',
              startDate: selectedStory.startDate ? format(new Date(selectedStory.startDate), 'yyyy-MM-dd') : '',
              endDate: selectedStory.endDate ? format(new Date(selectedStory.endDate), 'yyyy-MM-dd') : '',
              sprintId: selectedStory.sprintId || 'backlog',
              releaseId: selectedStory.releaseId || 'unassigned',
          });
      } else {
          const isSubItem = ['Bug', 'Feature Change', 'Task'].includes(selectedStory.itemType);
          const testCase = testCases.find(tc => tc.id === selectedStory.relatedTestCaseId);
          setTestCaseInputText(testCase ? `[${testCase.testCaseId}] ${testCase.title}` : '');
          const relBug = stories.find(b => b.id === selectedStory.relatedBugId);
          setRelatedBugInputText(relBug ? `[${relBug.storyId}] ${relBug.title}` : '');
          editStoryForm.reset({
              itemType: selectedStory.itemType,
              title: (selectedStory.title || '').slice(0, 60),
              description: (selectedStory.description || '').slice(0, 300),
              acceptanceCriteria: selectedStory.acceptanceCriteria || '',
              epicId: selectedStory.epicId || 'unassigned',
              parentStoryId: isSubItem ? selectedStory.parentStoryId || undefined : undefined,
              reporterId: selectedStory.reporterId || 'unassigned',
              assigneeId: selectedStory.assigneeId || 'unassigned',
              estimatedHours: selectedStory.estimatedHours,
              priority: selectedStory.priority || 'Medium',
              severity: selectedStory.severity || 'Medium',
              releaseId: selectedStory.releaseId || 'unassigned',
              sprintId: selectedStory.sprintId || 'backlog',
              foundInTestPlanId: selectedStory.foundInTestPlanId || 'unassigned',
              relatedBugId: selectedStory.relatedBugId || 'unassigned',
              impactedSystemIds: selectedStory.impactedSystemIds || [],
              attachments: selectedStory.attachments || '',
              relatedTestCaseId: selectedStory.relatedTestCaseId || 'unassigned',
              predecessorId: selectedStory.predecessorId || 'unassigned',
              status: selectedStory.status || 'To Do',
              resolution: selectedStory.resolution || 'none',
              createdAt: selectedStory.createdAt ? parseISO(selectedStory.createdAt) : undefined,
              closedAt: selectedStory.closedAt ? parseISO(selectedStory.closedAt) : undefined,
          });
          if (isSubItem && selectedStory.parentStoryId) {
              const parent = parentStoryOptions.find(p => p.value === selectedStory.parentStoryId);
              setEditParentStoryText(parent?.label || '');
          } else {
              setEditParentStoryText('');
          }
          const predStory = stories.find(s => s.id === selectedStory.predecessorId);
          setEditPredecessorText(predStory ? `[${predStory.storyId}] ${predStory.title}` : '');
      }
  }, [selectedStory, editStoryForm, subTaskForm, parentStoryOptions, testCases, stories]);
  
  useEffect(() => {
    if (!addRequirementOpen) {
      addStoryForm.reset();
      setAddStorySubmitting(false);
      setAddParentStoryText('');
      setTestCaseInputText('');
      setRelatedBugInputText('');
      setAddPredecessorText('');
    }
  }, [addRequirementOpen, addStoryForm]);

  useEffect(() => {
    if (!epicToDelete) {
        setDeleteEpicItems(false);
    }
  }, [epicToDelete]);

  const onAiGenSubmit = async () => {
    if (!project?.summary) {
      toast({ variant: 'destructive', title: 'Error', description: 'Project summary is required to generate stories.' });
      return;
    }
    setIsAiGenSubmitting(true);
    try {
      const result = await getAiStorySuggestions({
        projectSummary: project.summary,
        impactedSystems: impactedSystems.map(s => ({ id: s.id, name: s.name })),
      });
  
      const res = result as any;
      if (res.error) {
        throw new Error(res.error);
      }
  
      for (const story of (res.stories || [])) {
        const storyPayload: Omit<Story, 'id' | 'storyId'> = {
          title: story.title,
          description: story.description,
          acceptanceCriteria: story.acceptanceCriteria,
          itemType: 'Requirement/Story',
          status: 'To Do',
          priority: story.priority,
          estimatedHours: story.estimatedHours,
          impactedSystemIds: story.impactedSystemIds,
        };
        const storyRef = await addStory(storyPayload, 'ST') as any;
  
        if (storyRef && story.subTasks) {
          for (const subTask of story.subTasks) {
            const subTaskPayload: Omit<Story, 'id' | 'storyId'> = {
              title: subTask.title,
              description: '',
              itemType: 'Sub Task',
              status: 'To Do',
              parentStoryId: storyRef.id || storyRef,
              estimatedHours: subTask.estimatedHours,
              impactedSystemId: subTask.impactedSystemId,
            };
            await addStory(subTaskPayload, 'SUB');
          }
        }
      }
      toast({ title: 'Success', description: `${(res.stories || []).length} stories and their sub-tasks generated.` });
      setIsAiGenOpen(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'An unknown error occurred.' });
    } finally {
      setIsAiGenSubmitting(false);
    }
  };
  
  const onAddEpicSubmit = async (values: z.infer<typeof epicFormSchema>) => {
    setAddEpicSubmitting(true);
    try {
        const success = await addEpic({
            title: values.title,
            description: values.description || '',
        });
        if (success) {
            setAddEpicOpen(false);
        } else {
             toast({ variant: "destructive", title: "Error", description: `An epic with this title may already exist.` });
        }
    } catch (e: any) {
         toast({ variant: "destructive", title: "Error", description: e.message || "An unknown error occurred." });
    } finally {
        setAddEpicSubmitting(false);
    }
  };
  
  const onEditEpicSubmit = async (values: z.infer<typeof epicFormSchema>) => {
    if (!editingEpic) return;
    setEditEpicSubmitting(true);
    try {
        const success = await updateEpic(editingEpic.id, values);
        if (success) {
          setEditingEpic(null);
        } else {
          toast({ variant: "destructive", title: "Error", description: `An epic with this title may already exist.` });
        }
    } catch (e: any) {
        toast({ variant: "destructive", title: "Error", description: e.message || "An unknown error occurred." });
    } finally {
        setEditEpicSubmitting(false);
    }
  };

  const onAddStorySubmit = async (values: z.infer<typeof storyFormSchema>) => {
    setAddStorySubmitting(true);
    try {
        let parentStory: Story | undefined;
        if (['Bug', 'Feature Change'].includes(values.itemType) && values.parentStoryId) {
          parentStory = stories.find(s => s.id === values.parentStoryId);
        }

        const newStory: Omit<Story, 'id' | 'storyId'> = {
          title: values.title,
          description: values.description || '',
          itemType: values.itemType as WorkItemType,
          acceptanceCriteria: values.acceptanceCriteria,
          reporterId: values.reporterId === 'unassigned' ? undefined : values.reporterId,
          assigneeId: values.assigneeId === 'unassigned' ? undefined : values.assigneeId,
          epicId: ['Task', 'Requirement/Story'].includes(values.itemType) ? (values.epicId === 'unassigned' ? undefined : values.epicId) : (parentStory?.epicId),
          parentStoryId: ['Bug', 'Feature Change'].includes(values.itemType) ? (values.parentStoryId || undefined) : undefined,
          relatedTestCaseId: values.relatedTestCaseId === 'unassigned' ? undefined : values.relatedTestCaseId,
          status: 'To Do',
          estimatedHours: values.estimatedHours,
          priority: values.priority as Priority | undefined,
          severity: values.severity as BugSeverity | undefined,
          sprintId: parentStory?.sprintId || (values.sprintId === 'backlog' ? null : values.sprintId),
          releaseId: parentStory?.releaseId || (values.releaseId === 'unassigned' ? undefined : values.releaseId),
          foundInTestPlanId: values.foundInTestPlanId === 'unassigned' ? undefined : values.foundInTestPlanId,
          relatedBugId: values.relatedBugId === 'unassigned' ? undefined : values.relatedBugId,
          impactedSystemIds: values.impactedSystemIds,
          attachments: values.attachments,
          isDeleted: false,
          deletedAt: null,
          createdAt: values.createdAt ? values.createdAt.toISOString() : undefined,
          closedAt: values.closedAt ? values.closedAt.toISOString() : undefined,
        };

        await addStory(newStory);
        setAddRequirementOpen(false);
        
    } catch(e: any) {
        toast({ variant: "destructive", title: "Error", description: e.message || "An unknown error occurred." });
    } finally {
        setAddStorySubmitting(false);
    }
  };
  
const onEditStorySubmit = async (values: z.infer<typeof storyFormSchema>) => {
    if (!selectedStory) return;
    setIsEditStorySubmitting(true);
    const isClosed = selectedStory.status === 'Closed' || selectedStory.status === 'Done';
    const success = await updateStory(selectedStory.id, {
        ...values,
        itemType: values.itemType as WorkItemType | undefined,
        priority: values.priority as Priority | undefined,
        severity: values.severity as BugSeverity | undefined,
        assigneeId: values.assigneeId === 'unassigned' ? undefined : (values.assigneeId || undefined),
        relatedTestCaseId: values.relatedTestCaseId === 'unassigned' ? undefined : values.relatedTestCaseId,
        foundInTestPlanId: values.foundInTestPlanId === 'unassigned' ? undefined : values.foundInTestPlanId,
        relatedBugId: values.relatedBugId === 'unassigned' ? undefined : values.relatedBugId,
        createdAt: values.createdAt ? values.createdAt.toISOString() : undefined,
        closedAt: isClosed ? (values.closedAt ? values.closedAt.toISOString() : new Date().toISOString()) : null as any,
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
    
    if (projStart && values.startDate && values.startDate < projStart) {
      toast({ variant: "destructive", title: "Invalid Date", description: `Start date cannot be before project start date (${format(parseISO(projStart), 'dd MMM yyyy')}).` });
      setIsEditStorySubmitting(false);
      return;
    }
    if (projEnd && values.startDate && values.startDate > projEnd) {
      toast({ variant: "destructive", title: "Invalid Date", description: `Start date cannot be after project end date (${format(parseISO(projEnd), 'dd MMM yyyy')}).` });
      setIsEditStorySubmitting(false);
      return;
    }
    if (projStart && values.endDate && values.endDate < projStart) {
      toast({ variant: "destructive", title: "Invalid Date", description: `End date cannot be before project start date (${format(parseISO(projStart), 'dd MMM yyyy')}).` });
      setIsEditStorySubmitting(false);
      return;
    }
    if (projEnd && values.endDate && values.endDate > projEnd) {
      toast({ variant: "destructive", title: "Invalid Date", description: `End date cannot be after project end date (${format(parseISO(projEnd), 'dd MMM yyyy')}).` });
      setIsEditStorySubmitting(false);
      return;
    }
    
    const success = await updateStory(selectedStory.id, {
        ...values,
        assigneeId: values.assigneeId === 'unassigned' ? undefined : (values.assigneeId || undefined),
        startDate: values.startDate ? new Date(values.startDate).toISOString() : undefined,
        endDate: values.endDate ? new Date(values.endDate).toISOString() : undefined,
    });

    if (success) {
        handleSetSelectedStory(null);
    } else {
        toast({ variant: "destructive", title: "Error Editing Sub Task", description: "Could not save your changes." });
    }
    setIsEditStorySubmitting(false);
};


const handleAddSubTask = async (values: z.infer<typeof subTaskFormSchema>) => {
    if (!selectedStory) return;

    if (projStart && values.startDate && values.startDate < projStart) {
      toast({ variant: "destructive", title: "Invalid Date", description: `Start date cannot be before project start date (${format(parseISO(projStart), 'dd MMM yyyy')}).` });
      return;
    }
    if (projEnd && values.startDate && values.startDate > projEnd) {
      toast({ variant: "destructive", title: "Invalid Date", description: `Start date cannot be after project end date (${format(parseISO(projEnd), 'dd MMM yyyy')}).` });
      return;
    }
    if (projStart && values.endDate && values.endDate < projStart) {
      toast({ variant: "destructive", title: "Invalid Date", description: `End date cannot be before project start date (${format(parseISO(projStart), 'dd MMM yyyy')}).` });
      return;
    }
    if (projEnd && values.endDate && values.endDate > projEnd) {
      toast({ variant: "destructive", title: "Invalid Date", description: `End date cannot be after project end date (${format(parseISO(projEnd), 'dd MMM yyyy')}).` });
      return;
    }

    const newSubTask: Omit<Story, 'id' | 'storyId'> = {
        title: values.title,
        description: values.description || '',
        itemType: 'Sub Task',
        status: 'To Do',
        epicId: selectedStory.epicId, // Inherit epic
        parentStoryId: selectedStory.id, // Link to parent story
        sprintId: selectedStory.sprintId, // Inherit sprint
        releaseId: selectedStory.releaseId, // Inherit release
        impactedSystemId: values.impactedSystemId === 'unassigned' ? undefined : values.impactedSystemId,
        estimatedHours: values.estimatedHours,
        assigneeId: values.assigneeId === 'unassigned' ? undefined : values.assigneeId,
        startDate: values.startDate ? new Date(values.startDate).toISOString() : undefined,
        endDate: values.endDate ? new Date(values.endDate).toISOString() : undefined,
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
    
  const handleDeleteEpic = (epicId: string) => {
    deleteEpic(epicId, deleteEpicItems).then(success => {
        if (!success) {
            toast({ variant: "destructive", title: "Error", description: "Could not delete epic." });
        } else {
            toast({ title: "Success", description: "Epic and related items handled." });
        }
    });
    setEpicToDelete(null);
  };
  
  const handleBulkDelete = async () => {
    const success = await bulkDeleteStories(storiesToDelete);
    if(success) {
      toast({ title: 'Success', description: `${storiesToDelete.length} ${storiesToDelete.length === 1 ? 'story' : 'stories'} moved to trash.` });
      setSelectedStories(prev => prev.filter(id => !storiesToDelete.includes(id)));
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not delete stories." });
    }
    setStoriesToDelete([]);
  };

  const handleBulkMove = async (values: z.infer<typeof bulkMoveSchema>) => {
    let epicId: string | null | undefined = undefined;
    if (values.targetEpicId === 'unassigned') epicId = null;
    else if (values.targetEpicId && values.targetEpicId !== 'no_change') epicId = values.targetEpicId;

    let releaseId: string | null | undefined = undefined;
    if (values.targetReleaseId === 'unassigned') releaseId = null;
    else if (values.targetReleaseId && values.targetReleaseId !== 'no_change') releaseId = values.targetReleaseId;

    if (epicId === undefined && releaseId === undefined) {
      toast({ title: 'No changes selected.' });
      setStoriesToMove([]);
      bulkMoveForm.reset();
      return;
    }

    const success = await bulkMoveStories(storiesToMove, epicId, releaseId);
    if(success) {
      toast({ title: 'Success', description: `${storiesToMove.length} ${storiesToMove.length === 1 ? 'story' : 'stories'} moved successfully.` });
      setSelectedStories(prev => prev.filter(id => !storiesToMove.includes(id)));
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not move stories." });
    }
    setStoriesToMove([]);
    bulkMoveForm.reset();
  }

  const allWorkItems = stories.filter((story) => {
    const isSubItem = story.itemType === 'Sub Task' || (story.itemType === 'Bug' && story.parentStoryId);
    return !isSubItem && !story.isDeleted;
  });

  const subItemsByParentId = stories.reduce((acc, story) => {
      if (story.parentStoryId) {
          if (!acc[story.parentStoryId]) {
              acc[story.parentStoryId] = [];
          }
          acc[story.parentStoryId].push(story);
      }
      return acc;
  }, {} as Record<string, Story[]>);

  const backlogItemsByEpic = allWorkItems.reduce((acc, story) => {
    const key = story.epicId || 'unassigned';
    if (!acc[key]) {
        acc[key] = [];
    }
    acc[key].push(story);
    return acc;
  }, {} as Record<string, Story[]>);

  const backlogItemsBySprint = useMemo(() => {
    return allWorkItems.reduce((acc, story) => {
      const key = (story.sprintId && story.sprintId !== 'backlog') ? story.sprintId : 'backlog';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(story);
      return acc;
    }, {} as Record<string, Story[]>);
  }, [allWorkItems]);

  const inSprintCount = useMemo(() => allWorkItems.filter(s => s.sprintId && s.sprintId !== 'backlog').length, [allWorkItems]);
  const inBacklogCount = useMemo(() => allWorkItems.filter(s => !s.sprintId || s.sprintId === 'backlog').length, [allWorkItems]);

  const sprintGroups = useMemo(() => {
    const sortedProjectSprints = [...sprints].sort((a, b) => {
      const statusWeight: Record<string, number> = {
        'Current': 1,
        'Yet to Start': 2,
        'Completed': 4,
        'Cancelled': 5,
      };
      const weightA = statusWeight[a.status || 'Yet to Start'] || 3;
      const weightB = statusWeight[b.status || 'Yet to Start'] || 3;
      if (weightA !== weightB) return weightA - weightB;
      if (a.startDate && b.startDate) {
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      }
      return a.title.localeCompare(b.title, undefined, { numeric: true });
    });

    const activeOrUpcomingSprints = sortedProjectSprints.filter(s => s.status !== 'Completed' && s.status !== 'Cancelled');
    const completedOrCancelledSprints = sortedProjectSprints.filter(s => s.status === 'Completed' || s.status === 'Cancelled');

    const groups: Array<{
      id: string;
      title: string;
      status?: SprintStatus | 'Backlog';
      startDate?: string;
      endDate?: string;
      isBacklog?: boolean;
    }> = [];

    activeOrUpcomingSprints.forEach(s => {
      groups.push({
        id: s.id,
        title: s.title,
        status: s.status || 'Yet to Start',
        startDate: s.startDate,
        endDate: s.endDate,
        isBacklog: false,
      });
    });

    groups.push({
      id: 'backlog',
      title: 'Product Backlog',
      status: 'Backlog',
      isBacklog: true,
    });

    completedOrCancelledSprints.forEach(s => {
      const count = (backlogItemsBySprint[s.id] || []).length;
      if (count > 0) {
        groups.push({
          id: s.id,
          title: s.title,
          status: s.status || 'Completed',
          startDate: s.startDate,
          endDate: s.endDate,
          isBacklog: false,
        });
      }
    });

    return groups;
  }, [sprints, backlogItemsBySprint]);
  
  const epicsAndUnassigned = useMemo(() => {
    // Always show all epics so newly created (empty) epics are visible immediately.
    let displayEpics: (Epic | { id: string; title: string; description: string; })[] = [...epics];

    const unassignedStoriesExist = (backlogItemsByEpic['unassigned'] || []).length > 0;

    if (unassignedStoriesExist) {
        displayEpics.push({ id: 'unassigned', title: 'Unassigned', description: 'Items not assigned to any epic.' });
    }

    return displayEpics.sort((a, b) => {
        if (a.id === 'unassigned') return 1;
        if (b.id === 'unassigned') return -1;
        return a.title.localeCompare(b.title);
    });
  }, [epics, backlogItemsByEpic]);
  
  const epicToDeleteStoryCount = epicToDelete ? stories.filter(story => story.epicId === epicToDelete.id).length : 0;
  
  const selectedStoriesInList = (list: Story[]) => {
    const ids = list.map(s => s.id);
    return selectedStories.filter(id => ids.includes(id));
  };

  const handleToggleSelectAllInList = (list: Story[]) => {
    const ids = list.map(s => s.id);
    const selectedInList = selectedStoriesInList(list);

    if (selectedInList.length === ids.length) {
      setSelectedStories(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedStories(prev => [...new Set([...prev, ...ids])]);
    }
  };

  const selectedStoriesInEpic = (epicId: string) => {
    return selectedStoriesInList(backlogItemsByEpic[epicId] || []);
  };
  
  const handleToggleSelectAll = (epicId: string, storiesInEpic: Story[]) => {
    handleToggleSelectAllInList(storiesInEpic);
  };

  const selectedStorySubItems = useMemo(() => {
    if (!selectedStory) return { devTasks: [], bugs: [], subTasks: [], logs: [] };
    const allSubItems = subItemsByParentId[selectedStory.id] || [];
    return {
      devTasks: allSubItems.filter(item => item.itemType === 'Task'),
      bugs: allSubItems.filter(item => item.itemType === 'Bug'),
      subTasks: allSubItems.filter(item => item.itemType === 'Sub Task'),
      logs: selectedStory.statusHistory?.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()) || [],
    };
  }, [selectedStory, subItemsByParentId]);

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

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 h-full flex flex-col">
        <PageHeader
          title="Product Backlog"
          description="Manage your epics and stories."
        >
          <Dialog open={isAiGenOpen} onOpenChange={setIsAiGenOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Bot className="mr-2 h-4 w-4" />
                    AI Req Gen
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Generate Stories with AI</DialogTitle>
                    <DialogDescription>
                        The AI will analyze the project summary to generate relevant user stories, sub-tasks, and estimates. Do you want to proceed?
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsAiGenOpen(false)}>Cancel</Button>
                    <Button onClick={onAiGenSubmit} disabled={isAiGenSubmitting}>
                        {isAiGenSubmitting ? 'Generating...' : 'Proceed'}
                    </Button>
                </DialogFooter>
            </DialogContent>
          </Dialog>

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
                          <Input placeholder="Epic title" {...field} maxLength={60} />
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
                          <Textarea placeholder="Describe the epic..." {...field} maxLength={300} />
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

          <Dialog open={addRequirementOpen} onOpenChange={setAddRequirementOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Requirement
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Add New Requirement</DialogTitle>
              </DialogHeader>
              <Form {...addStoryForm}>
                <form onSubmit={addStoryForm.handleSubmit(onAddStorySubmit)} className="space-y-4 py-4">
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
                                    {itemType === 'Bug' ? 'Defect' : itemType}
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
                            <Input placeholder={watchedItemType === 'Bug' ? 'Defect title' : `${watchedItemType} title`} {...field} maxLength={60} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <div className="space-y-4 pt-4">
                        <FormField
                            control={addStoryForm.control}
                            name="description"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>{watchedItemType === 'Bug' ? 'Description (Steps to Reproduce)' : 'Description'}</FormLabel>
                                <FormControl>
                                <Textarea placeholder={watchedItemType === 'Bug' ? 'Steps to reproduce: Nav to the affected module, perform standard actions, observe the critical issue.' : `Describe the ${watchedItemType.toLowerCase()}...`} {...field} maxLength={300} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        {['Requirement/Story', 'Feature Change', 'Task'].includes(watchedItemType) && (
                        <FormField
                            control={addStoryForm.control}
                            name="impactedSystemIds"
                            render={() => (
                            <FormItem>
                                <FormLabel>Impacted Systems</FormLabel>
                                <div className="grid grid-cols-2 gap-2 p-2 border rounded-md">
                                {impactedSystems.map((system) => (
                                    <FormField
                                    key={system.id}
                                    control={addStoryForm.control}
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
                            control={addStoryForm.control}
                            name="acceptanceCriteria"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>{watchedItemType === 'Bug' ? 'Expected Result' : 'Acceptance Criteria'}</FormLabel>
                                <FormControl>
                                <Textarea placeholder={watchedItemType === 'Bug' ? 'Describe what should happen...' : `Define acceptance criteria for this ${watchedItemType.toLowerCase()}...`} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {['Requirement/Story', 'Task', 'Bug', 'Feature Change'].includes(watchedItemType) ? (
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
                        ) : null}
                        {watchedItemType === 'Bug' && (
                            <FormField
                            control={addStoryForm.control}
                            name="reporterId"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Reporter</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a reporter" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                    {[...users].filter(emp => !emp.isDeleted && emp.isEnabled !== false && !!emp.empId && emp.empId.trim() !== '').sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, undefined, { numeric: true, sensitivity: 'base' })).map(emp => (
                                        <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.empId.trim()})</SelectItem>
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
                                    {[...users].filter(emp => !emp.isDeleted && emp.isEnabled !== false && !!emp.empId && emp.empId.trim() !== '').sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, undefined, { numeric: true, sensitivity: 'base' })).map(emp => (
                                        <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.empId.trim()})</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        </div>
                        {['Feature Change', 'Bug'].includes(watchedItemType) ? (
                          <FormField
                          control={addStoryForm.control}
                          name="parentStoryId" 
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>{watchedItemType === 'Feature Change' ? 'Original Requirement' : 'Related Story'}</FormLabel>
                              <FormControl>
                                  <Input 
                                      list="parent-story-options-add"
                                      placeholder="Link to a story or feature change"
                                      value={addParentStoryText}
                                      onChange={(e) => {
                                          const text = e.target.value;
                                          setAddParentStoryText(text);
                                          const matchingOption = parentStoryOptions.find(opt => opt.label === text);
                                          field.onChange(matchingOption ? matchingOption.value : undefined);
                                      }}
                                      onBlur={() => {
                                          const matchingOption = parentStoryOptions.find(opt => opt.label === addParentStoryText);
                                          if (!matchingOption) {
                                              setAddParentStoryText('');
                                              field.onChange(undefined);
                                          }
                                      }}
                                  />
                              </FormControl>
                              <datalist id="parent-story-options-add">
                                {parentStoryOptions
                                  .filter(opt => matchSearchQuery(opt.label, addParentStoryText))
                                  .map(opt => <option key={opt.value} value={opt.label} />)}
                              </datalist>
                              <FormMessage />
                              </FormItem>
                          )}
                          />
                        ) : null}
                        {watchedItemType === 'Bug' && (
                          <FormField
                          control={addStoryForm.control}
                          name="relatedTestCaseId" 
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>Related Test Case</FormLabel>
                              <FormControl>
                                  <Input 
                                      list="testcase-options-add"
                                      placeholder="Link to a test case"
                                      value={testCaseInputText}
                                      onChange={(e) => {
                                          const text = e.target.value;
                                          setTestCaseInputText(text);
                                          const matchingOption = testCaseOptions.find(opt => opt.label === text);
                                          field.onChange(matchingOption ? matchingOption.value : undefined);
                                      }}
                                      onBlur={() => {
                                          const matchingOption = testCaseOptions.find(opt => opt.label === testCaseInputText);
                                          if (!matchingOption) {
                                              setTestCaseInputText('');
                                              field.onChange(undefined);
                                          }
                                      }}
                                  />
                              </FormControl>
                              <datalist id="testcase-options-add">
                                  {testCaseOptions
                                    .filter(opt => matchSearchQuery(opt.label, testCaseInputText))
                                    .map(opt => <option key={opt.value} value={opt.label} />)}
                              </datalist>
                              <FormMessage />
                              </FormItem>
                          )}
                          />
                        )}
                         <FormField
                            control={addStoryForm.control}
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
                                        <Circle className={cn("h-3 w-3", priorityStyles[p])} />
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
                        {watchedItemType === 'Bug' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={addStoryForm.control}
                                    name="foundInTestPlanId"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Found In Test Cycle</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                                        <FormControl>
                                            <SelectTrigger>
                                            <SelectValue placeholder="Select a test cycle" />
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
                                  control={addStoryForm.control}
                                  name="relatedBugId"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Related / Original Defect</FormLabel>
                                      <FormControl>
                                        <div className="relative">
                                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                          <Input
                                            list="bug-options-add"
                                            placeholder="Search for a defect..."
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
                                      <datalist id="bug-options-add">
                                        {relatedBugOptions
                                          .filter(opt => matchSearchQuery(opt.label, relatedBugInputText))
                                          .map(opt => <option key={opt.value} value={opt.label} />)}
                                      </datalist>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                    control={addStoryForm.control}
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
                                <FormLabel>Effort (hours)</FormLabel>
                                <FormControl>
                                    <Input type="number" step="any" placeholder="0.00" {...field} value={field.value || ''} className="font-mono" />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        </div>
                        {watchedItemType === 'Bug' && (
                            <>
                            <FormField
                                control={addStoryForm.control}
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
                                <FormField control={addStoryForm.control} name="createdAt" render={({ field }) => (
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
                                 <FormField control={addStoryForm.control} name="closedAt" render={({ field }) => (
                                     <FormItem>
                                         <FormLabel>Closed On</FormLabel>
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
                             </div>
                            </>
                        )}
                    </div>
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Group by:</span>
            <Tabs value={groupBy} onValueChange={(val) => setGroupBy(val as 'epic' | 'sprint')} className="h-8">
              <TabsList className="h-8 p-1 bg-muted/70">
                <TabsTrigger value="epic" className="h-6 px-3 text-xs flex items-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  By Epic
                </TabsTrigger>
                <TabsTrigger value="sprint" className="h-6 px-3 text-xs flex items-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <FolderUp className="h-3.5 w-3.5 text-blue-500" />
                  By Sprint
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <Badge variant="outline" className="font-normal text-muted-foreground">
              Total: <span className="font-semibold text-foreground ml-1">{allWorkItems.length}</span>
            </Badge>
            <Badge variant="outline" className="font-normal border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20">
              In Sprints: <span className="font-semibold ml-1">{inSprintCount}</span>
            </Badge>
            <Badge variant="outline" className="font-normal border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20">
              Backlog: <span className="font-semibold ml-1">{inBacklogCount}</span>
            </Badge>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto pr-2">
          {groupBy === 'epic' ? (
            <Accordion type="multiple" className="w-full space-y-3" key="by-epic" defaultValue={epicsAndUnassigned.map(e => e.id)}>
              {epicsAndUnassigned.map((epic) => {
                const isUnassignedEpic = epic.id === 'unassigned';
                const allStoriesInEpic = stories.filter(s => s.epicId === epic.id);
                const totalEpicItemsCount = allStoriesInEpic.length;
                const doneEpicItemsCount = allStoriesInEpic.filter(s => s.status === 'Done').length;
                const donePercentage = totalEpicItemsCount > 0 ? Math.round((doneEpicItemsCount / totalEpicItemsCount) * 100) : 0;
                const backlogItemsForGroup = backlogItemsByEpic[epic.id] || [];
                const selectedCount = selectedStoriesInEpic(epic.id).length;
                const inSprintInEpic = backlogItemsForGroup.filter(s => s.sprintId && s.sprintId !== 'backlog').length;
                const inBacklogInEpic = backlogItemsForGroup.filter(s => !s.sprintId || s.sprintId === 'backlog').length;

                if (backlogItemsForGroup.length === 0 && isUnassignedEpic && epics.length > 0) return null;

                return (
                    <AccordionItem value={epic.id} key={epic.id} className="bg-muted/50 rounded-lg border">
                      <div className="flex items-center justify-between w-full [&>h3]:flex-1 [&>h3]:min-w-0">
                        <AccordionTrigger className="w-full p-2 group" hideChevron>
                            <div className="flex items-center gap-3 md:gap-4 flex-1 flex-wrap">
                                <ChevronRight className="h-5 w-5 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                                <span className="font-semibold">{epic.title}</span>
                                <Badge variant="secondary">{backlogItemsForGroup.length} {backlogItemsForGroup.length === 1 ? 'item' : 'items'}</Badge>
                                {backlogItemsForGroup.length > 0 && (
                                  <span className="text-xs text-muted-foreground hidden lg:inline">
                                    ({inSprintInEpic} in sprint, {inBacklogInEpic} backlog)
                                  </span>
                                )}
                                {!isUnassignedEpic && totalEpicItemsCount > 0 && (
                                <div className="flex items-center gap-2" title={`${doneEpicItemsCount} of ${totalEpicItemsCount} stories completed`}>
                                    <Progress value={donePercentage} className="h-2 w-24" />
                                    <span className="text-xs font-semibold text-muted-foreground">{donePercentage}%</span>
                                </div>
                                )}
                            </div>
                        </AccordionTrigger>
                        {!isUnassignedEpic && (
                        <div className="flex items-center gap-1 flex-shrink-0 pr-3 ml-auto">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-muted-foreground hover:text-foreground" 
                              onClick={(e) => { e.stopPropagation(); setEditingEpic(epic as Epic); }}
                              title="Edit Epic"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-muted-foreground hover:text-destructive" 
                              onClick={(e) => { e.stopPropagation(); setEpicToDelete(epic as Epic); }}
                              title="Delete Epic"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                        )}
                      </div>
                    <AccordionContent className="px-4 pb-4">
                         <div className="flex items-center justify-between pb-2 border-y py-2 mb-2">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                    id={`select-all-${epic.id}`}
                                    checked={selectedCount > 0 && selectedCount === backlogItemsForGroup.length}
                                    onCheckedChange={() => handleToggleSelectAll(epic.id, backlogItemsForGroup)}
                                />
                                <Label htmlFor={`select-all-${epic.id}`} className="text-sm font-medium">
                                    {selectedCount > 0 ? `${selectedCount} selected` : 'Select All'}
                                </Label>
                            </div>
                            {selectedCount > 0 && (
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setStoriesToMove(selectedStoriesInEpic(epic.id))}>
                                        <Move className="mr-2 h-4 w-4" />
                                        Move
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => setStoriesToDelete(selectedStoriesInEpic(epic.id))}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </Button>
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                          {backlogItemsForGroup.length > 0 ? (
                            backlogItemsForGroup.map((story) => {
                              const storyEpic = epics.find((e) => e.id === story.epicId);
                              const assignee = users.find((d) => d.id === story.assigneeId);
                              const sprint = sprints.find(s => s.id === story.sprintId);
                              const release = releases.find(r => r.id === story.releaseId);
                              const subItems = subItemsByParentId[story.id] || [];
                              
                              return (
                                <div key={story.id}>
                                  <StoryCard
                                      story={story}
                                      epic={storyEpic}
                                      assignee={assignee}
                                      onClick={() => handleSetSelectedStory(story)}
                                      subItems={subItems}
                                      sprint={sprint}
                                      release={release}
                                      onSubItemClick={(item) => handleDrillDown(item)}
                                      isSelected={selectedStories.includes(story.id)}
                                      onSelectionChange={(checked) => {
                                          setSelectedStories(prev => checked ? [...prev, story.id] : prev.filter(id => id !== story.id));
                                      }}
                                  />
                                </div>
                              )
                            })
                          ) : (
                            <p className="text-sm text-muted-foreground italic px-2">
                                No items for this epic in the backlog.
                            </p>
                          )}
                        </div>
                    </AccordionContent>
                    </AccordionItem>
                );
              })}
            </Accordion>
          ) : (
            <Accordion type="multiple" className="w-full space-y-3" key="by-sprint" defaultValue={sprintGroups.map(s => s.id)}>
              {sprintGroups.map((sprintGroup) => {
                const itemsForSprint = backlogItemsBySprint[sprintGroup.id] || [];
                const totalSprintItemsCount = itemsForSprint.length;
                const doneSprintItemsCount = itemsForSprint.filter(s => s.status === 'Done').length;
                const donePercentage = totalSprintItemsCount > 0 ? Math.round((doneSprintItemsCount / totalSprintItemsCount) * 100) : 0;
                const selectedCount = selectedStoriesInList(itemsForSprint).length;
                const sprintEffort = itemsForSprint.reduce((sum, item) => sum + (item.estimatedHours || 0), 0);

                return (
                  <AccordionItem value={sprintGroup.id} key={sprintGroup.id} className="bg-muted/50 rounded-lg border">
                    <div className="flex items-center">
                      <AccordionTrigger className="flex-1 p-2 group" hideChevron>
                        <div className="flex items-center gap-3 md:gap-4 flex-1 flex-wrap">
                          <ChevronRight className="h-5 w-5 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                          <span className="font-semibold">{sprintGroup.title}</span>

                          {/* Status Badge */}
                          {sprintGroup.isBacklog ? (
                            <Badge variant="outline" className="border-amber-500/60 text-amber-600 dark:text-amber-400 bg-amber-500/10 flex items-center gap-1">
                              <Library className="h-3 w-3" />
                              Backlog
                            </Badge>
                          ) : sprintGroup.status === 'Current' ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Current Sprint
                            </Badge>
                          ) : sprintGroup.status === 'Yet to Start' ? (
                            <Badge variant="outline" className="border-blue-500 text-blue-500">
                              Upcoming
                            </Badge>
                          ) : sprintGroup.status === 'Completed' ? (
                            <Badge variant="secondary">Completed</Badge>
                          ) : null}

                          {/* Date range */}
                          {sprintGroup.startDate && sprintGroup.endDate && (
                            <span className="text-xs text-muted-foreground hidden sm:inline">
                              {format(parseISO(sprintGroup.startDate), 'MMM d')} - {format(parseISO(sprintGroup.endDate), 'MMM d, yyyy')}
                            </span>
                          )}

                          {/* Item count */}
                          <Badge variant="secondary">
                            {totalSprintItemsCount} {totalSprintItemsCount === 1 ? 'item' : 'items'}
                          </Badge>

                          {/* Effort */}
                          {sprintEffort > 0 && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {sprintEffort}h
                            </span>
                          )}

                          {/* Progress */}
                          {!sprintGroup.isBacklog && totalSprintItemsCount > 0 && (
                            <div className="flex items-center gap-2" title={`${doneSprintItemsCount} of ${totalSprintItemsCount} items completed`}>
                              <Progress value={donePercentage} className="h-2 w-24" />
                              <span className="text-xs font-semibold text-muted-foreground">{donePercentage}%</span>
                            </div>
                          )}
                        </div>
                      </AccordionTrigger>
                    </div>
                    <AccordionContent className="px-4 pb-4">
                      <div className="flex items-center justify-between pb-2 border-y py-2 mb-2">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`select-all-sprint-${sprintGroup.id}`}
                            checked={selectedCount > 0 && selectedCount === itemsForSprint.length}
                            onCheckedChange={() => handleToggleSelectAllInList(itemsForSprint)}
                          />
                          <Label htmlFor={`select-all-sprint-${sprintGroup.id}`} className="text-sm font-medium">
                            {selectedCount > 0 ? `${selectedCount} selected` : 'Select All'}
                          </Label>
                        </div>
                        {selectedCount > 0 && (
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setStoriesToMove(selectedStoriesInList(itemsForSprint))}>
                              <Move className="mr-2 h-4 w-4" />
                              Move
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => setStoriesToDelete(selectedStoriesInList(itemsForSprint))}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        {itemsForSprint.length > 0 ? (
                          itemsForSprint.map((story) => {
                            const storyEpic = epics.find((e) => e.id === story.epicId);
                            const assignee = users.find((d) => d.id === story.assigneeId);
                            const sprint = sprints.find(s => s.id === story.sprintId);
                            const release = releases.find(r => r.id === story.releaseId);
                            const subItems = subItemsByParentId[story.id] || [];

                            return (
                              <div key={story.id}>
                                <StoryCard
                                  story={story}
                                  epic={storyEpic}
                                  assignee={assignee}
                                  onClick={() => handleSetSelectedStory(story)}
                                  subItems={subItems}
                                  sprint={sprint}
                                  release={release}
                                  onSubItemClick={(item) => handleDrillDown(item)}
                                  isSelected={selectedStories.includes(story.id)}
                                  onSelectionChange={(checked) => {
                                    setSelectedStories(prev => checked ? [...prev, story.id] : prev.filter(id => id !== story.id));
                                  }}
                                />
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-sm text-muted-foreground italic px-2">
                            {sprintGroup.isBacklog ? 'No items in the backlog.' : 'No items planned for this sprint.'}
                          </p>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </div>
      </div>

      <Dialog open={!!editingEpic} onOpenChange={(isOpen) => !isOpen && setEditingEpic(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Epic</DialogTitle>
            <DialogDescription>
              Make changes to your epic here. Click save when you&apos;re done.
            </DialogDescription>
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
                      <Input placeholder="Epic title" {...field} maxLength={60} />
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
                      <Textarea placeholder="Describe the epic..." {...field} maxLength={300} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingEpic(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isEditEpicSubmitting}>
                  {isEditEpicSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!epicToDelete} onOpenChange={(isOpen) => !isOpen && setEpicToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
               {epicToDelete && epicToDeleteStoryCount > 0
                ? `This epic contains ${epicToDeleteStoryCount} ${epicToDeleteStoryCount === 1 ? 'story' : 'stories'}. Deleting the epic will mark them as unassigned. This action cannot be undone.`
                : `This will permanently delete the epic "${epicToDelete?.title}". This action cannot be undone.`}
            </AlertDialogDescription>
            {epicToDelete && epicToDeleteStoryCount > 0 && (
                <div className="flex items-center space-x-2 pt-4">
                    <Checkbox
                        id="delete-epic-items"
                        checked={deleteEpicItems}
                        onCheckedChange={(checked) => setDeleteEpicItems(!!checked)}
                    />
                    <label
                        htmlFor="delete-epic-items"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                       Also move all items within this epic to the trash.
                    </label>
                </div>
            )}
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
      
      <AlertDialog open={storiesToDelete.length > 0} onOpenChange={(isOpen) => !isOpen && setStoriesToDelete([])}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Delete Selected Stories?</AlertDialogTitle>
                <AlertDialogDescription>
                    Are you sure you want to move {storiesToDelete.length} item(s) to the trash?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleBulkDelete} className={buttonVariants({ variant: 'destructive' })}>
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Dialog open={storiesToMove.length > 0} onOpenChange={(isOpen) => !isOpen && setStoriesToMove([])}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Reassign Stories</DialogTitle>
                <DialogDescription>
                    Select a new epic to move the selected stories to.
                </DialogDescription>
            </DialogHeader>
            <Form {...bulkMoveForm}>
                <form onSubmit={bulkMoveForm.handleSubmit(handleBulkMove)} className="space-y-4">
                    <FormField
                         control={bulkMoveForm.control}
                         name="targetEpicId"
                         render={({ field }) => (
                             <FormItem>
                                 <FormLabel>Epic</FormLabel>
                                 <Select onValueChange={field.onChange} defaultValue={field.value}>
                                     <FormControl>
                                         <SelectTrigger>
                                             <SelectValue placeholder="Select an epic" />
                                         </SelectTrigger>
                                     </FormControl>
                                     <SelectContent>
                                         <SelectItem value="no_change">No Change</SelectItem>
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
                         control={bulkMoveForm.control}
                         name="targetReleaseId"
                         render={({ field }) => (
                             <FormItem>
                                 <FormLabel>Release</FormLabel>
                                 <Select onValueChange={field.onChange} defaultValue={field.value}>
                                     <FormControl>
                                         <SelectTrigger>
                                             <SelectValue placeholder="Select a release" />
                                         </SelectTrigger>
                                     </FormControl>
                                     <SelectContent>
                                         <SelectItem value="no_change">No Change</SelectItem>
                                         <SelectItem value="unassigned">Unassigned</SelectItem>
                                         {releases.map(release => (
                                             <SelectItem key={release.id} value={release.id}>{release.releaseId} - {release.name}</SelectItem>
                                         ))}
                                     </SelectContent>
                                 </Select>
                                 <FormMessage />
                             </FormItem>
                         )}
                     />
                    <DialogFooter>
                        <Button type="submit">Apply Changes</Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedStory} onOpenChange={(open) => !open && handleSetSelectedStory(null)}>
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
                            <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Sub-task title" {...field} maxLength={60} /></FormControl><FormMessage/></FormItem>
                        )}/>
                        <Tabs defaultValue="details" className="w-full">
                            <TabsList variant="folder">
                                <TabsTrigger variant="folder" value="details">Details</TabsTrigger>
                                <TabsTrigger variant="folder" value="logs">
                                    Logs
                                    <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0 h-4">
                                        {selectedStorySubItems.logs.length}
                                    </Badge>
                                </TabsTrigger>
                            </TabsList>
                            <TabsContent value="details" className="pt-4 focus-visible:outline-none">
                                <div className="space-y-4">
                                    <FormField control={subTaskForm.control} name="description" render={({field}) => (
                                        <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Describe sub-task..." {...field} maxLength={300} /></FormControl><FormMessage/></FormItem>
                                    )}/>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                                {users.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}
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
                                            <FormItem><FormLabel>Effort (hours)</FormLabel><FormControl><Input type="number" step="any" placeholder="0.00" {...field} value={field.value ?? ''} className="font-mono" /></FormControl><FormMessage/></FormItem>
                                        )}/>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField control={subTaskForm.control} name="startDate" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Start Date</FormLabel>
                                                <FormControl><Input type="date" {...field} value={field.value || ''} min={projStart} max={projEnd} /></FormControl>
                                                {projStart && projEnd && (
                                                  <p className="text-[11px] text-muted-foreground">
                                                    Project: {format(parseISO(projStart), 'dd MMM yyyy')} - {format(parseISO(projEnd), 'dd MMM yyyy')}
                                                  </p>
                                                )}
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={subTaskForm.control} name="endDate" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>End Date</FormLabel>
                                                <FormControl><Input type="date" {...field} value={field.value || ''} min={projStart} max={projEnd} /></FormControl>
                                                {projStart && projEnd && (
                                                  <p className="text-[11px] text-muted-foreground">
                                                    Project: {format(parseISO(projStart), 'dd MMM yyyy')} - {format(parseISO(projEnd), 'dd MMM yyyy')}
                                                  </p>
                                                )}
                                                <FormMessage />
                                            </FormItem>
                                        )} />
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
              ) : selectedStory.itemType === 'Bug' ? (
                <Form {...editStoryForm}>
                  <form onSubmit={editStoryForm.handleSubmit(onEditStorySubmit)} className="flex flex-col h-full max-h-[90vh] overflow-hidden">
                    <DialogHeader>
                      <div className="flex items-center gap-2">
                        {selectionStack.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleGoBack}>
                            <ArrowLeft className="h-4 w-4" />
                          </Button>
                        )}
                        <DialogTitle>Edit Defect</DialogTitle>
                      </div>
                      <DialogDescription>
                        Make changes to the defect details here.
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
                              <Input placeholder="Defect title" {...field} maxLength={60} />
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
                            <FormLabel>Description (Steps to Reproduce)</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Steps to reproduce: Nav to the affected module, perform standard actions, observe the critical issue." {...field} maxLength={300} />
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
                            <FormLabel>Expected Result</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Describe what should happen..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={editStoryForm.control}
                          name="reporterId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Reporter</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select a reporter" /></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="unassigned">Unassigned</SelectItem>
                                  {[...users].filter(emp => !emp.isDeleted && emp.isEnabled !== false && !!emp.empId && emp.empId.trim() !== '').sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, undefined, { numeric: true, sensitivity: 'base' })).map(emp => (
                                    <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.empId.trim()})</SelectItem>
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
                              <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Assign someone" /></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="unassigned">Unassigned</SelectItem>
                                  {[...users].filter(emp => !emp.isDeleted && emp.isEnabled !== false && !!emp.empId && emp.empId.trim() !== '').sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, undefined, { numeric: true, sensitivity: 'base' })).map(emp => (
                                    <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.empId.trim()})</SelectItem>
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
                          name="parentStoryId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Related Story</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                  <Input
                                    list="parent-story-options-defect-edit-backlog"
                                    placeholder="Search for a story/requirement..."
                                    className="pl-9"
                                    value={editParentStoryText}
                                    onChange={(e) => {
                                      const text = e.target.value;
                                      setEditParentStoryText(text);
                                      const matchingOption = parentStoryOptions.find(opt => opt.label === text);
                                      field.onChange(matchingOption ? matchingOption.value : undefined);
                                    }}
                                    onBlur={() => {
                                      const matchingOption = parentStoryOptions.find(opt => opt.label === editParentStoryText);
                                      if (!matchingOption) {
                                        setEditParentStoryText('');
                                        field.onChange(undefined);
                                      }
                                    }}
                                  />
                                </div>
                              </FormControl>
                              <datalist id="parent-story-options-defect-edit-backlog">
                                {parentStoryOptions
                                  .filter(opt => matchSearchQuery(opt.label, editParentStoryText))
                                  .map(opt => <option key={opt.value} value={opt.label} />)}
                              </datalist>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={editStoryForm.control}
                          name="relatedTestCaseId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Related Test Case</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                  <Input
                                    list="testcase-options-defect-edit-backlog"
                                    placeholder="Search for a test case..."
                                    className="pl-9"
                                    value={testCaseInputText}
                                    onChange={(e) => {
                                      const text = e.target.value;
                                      setTestCaseInputText(text);
                                      const matchingOption = testCaseOptions.find(opt => opt.label === text);
                                      field.onChange(matchingOption ? matchingOption.value : undefined);
                                    }}
                                    onBlur={() => {
                                      const matchingOption = testCaseOptions.find(opt => opt.label === testCaseInputText);
                                      if (!matchingOption) {
                                        setTestCaseInputText('');
                                        field.onChange(undefined);
                                      }
                                    }}
                                  />
                                </div>
                              </FormControl>
                              <datalist id="testcase-options-defect-edit-backlog">
                                {testCaseOptions
                                  .filter(opt => matchSearchQuery(opt.label, testCaseInputText))
                                  .map(opt => <option key={opt.value} value={opt.label} />)}
                              </datalist>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={editStoryForm.control}
                          name="sprintId"
                          render={({ field }) => (
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
                          )}
                        />
                        <FormField
                          control={editStoryForm.control}
                          name="releaseId"
                          render={({ field }) => (
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
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={editStoryForm.control}
                          name="foundInTestPlanId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Found In Test Cycle</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select a Test Cycle" /></SelectTrigger></FormControl>
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
                          name="relatedBugId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Related / Original Defect</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                  <Input
                                    list="bug-options-defect-edit-backlog"
                                    placeholder="Search for a defect..."
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
                              <datalist id="bug-options-defect-edit-backlog">
                                {relatedBugOptions
                                  .filter(opt => opt.value !== selectedStory?.id)
                                  .filter(opt => matchSearchQuery(opt.label, relatedBugInputText))
                                  .map(opt => <option key={opt.value} value={opt.label} />)}
                              </datalist>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={editStoryForm.control}
                          name="severity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Severity</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || 'Medium'}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Set severity" /></SelectTrigger></FormControl>
                                <SelectContent>
                                  {['Critical', 'High', 'Medium', 'Low'].map(s => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
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
                              <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Assign to an epic" /></SelectTrigger></FormControl>
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
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={editStoryForm.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status</FormLabel>
                              <Select
                                onValueChange={(val) => {
                                  field.onChange(val);
                                  if (val === 'Closed' || val === 'Done') {
                                    editStoryForm.setValue('closedAt', new Date());
                                  } else {
                                    editStoryForm.setValue('closedAt', undefined);
                                  }
                                }}
                                value={field.value}
                              >
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                  {['To Triage', 'Triaged', 'In Progress', 'Ready For Test', 'Closed'].map(st => (
                                    <SelectItem key={st} value={st}>{st}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={editStoryForm.control}
                          name="resolution"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Resolution</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || 'none'}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select resolution" /></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  {['Invalid', 'Need Help', 'Duplicate', "Won't Fix", 'Cannot Reproduce'].map(r => (
                                    <SelectItem key={r} value={r}>{r}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
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
                        <FormField
                          control={editStoryForm.control}
                          name="createdAt"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Created On</FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  disabled
                                  value={field.value instanceof Date && !isNaN(field.value.getTime()) ? field.value.toISOString().split('T')[0] : (typeof field.value === 'string' && field.value ? field.value.split('T')[0] : '')}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={editStoryForm.control}
                          name="closedAt"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Closed On</FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  disabled
                                  value={field.value instanceof Date && !isNaN(field.value.getTime()) ? field.value.toISOString().split('T')[0] : (typeof field.value === 'string' && field.value ? field.value.split('T')[0] : '')}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
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
                      <div className="flex items-center gap-2">
                        {selectionStack.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleGoBack}>
                            <ArrowLeft className="h-4 w-4" />
                          </Button>
                        )}
                        <DialogTitle>Edit {selectedStory.itemType}</DialogTitle>
                      </div>
                      <DialogDescription>
                        Make changes to your {selectedStory.itemType.toLowerCase()} here. Click save when you&apos;re done.
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
                          <Input placeholder="Story title" {...field} maxLength={60} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                    <Tabs defaultValue="details" className="w-full">
                         <TabsList variant="folder">
                            <TabsTrigger variant="folder" value="details">Details</TabsTrigger>
                            {['Requirement/Story', 'Feature Change', 'Task'].includes(selectedStory.itemType) && (
                                <>
                                    <TabsTrigger variant="folder" value="subTasks">
                                        Sub-Tasks
                                        <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0 h-4">
                                            {selectedStorySubItems.subTasks.length}
                                        </Badge>
                                    </TabsTrigger>
                                    <TabsTrigger variant="folder" value="bugs">
                                        Defects
                                        <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0 h-4">
                                            {selectedStorySubItems.bugs.length}
                                        </Badge>
                                    </TabsTrigger>
                                    <TabsTrigger variant="folder" value="testCases">
                                        Test Cases
                                        <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0 h-4">
                                            {selectedStoryTestCases.length}
                                        </Badge>
                                    </TabsTrigger>
                                </>
                            )}
                             <TabsTrigger variant="folder" value="logs">
                                Logs
                                <Badge variant="secondary" className="ml-2 text-xs px-1.5 py-0 h-4">
                                    {selectedStorySubItems.logs.length}
                                </Badge>
                            </TabsTrigger>
                        </TabsList>
                    <TabsContent value="details" className="pt-4 focus-visible:outline-none">
                      <div className="space-y-4">
                        {['Requirement/Story', 'Feature Change', 'Task'].includes(selectedStory.itemType) && (
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
                                <Textarea placeholder="Describe the story..." {...field} maxLength={300} />
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
                        {['Requirement/Story', 'Task', 'Feature Change'].includes(selectedStory.itemType) ? (
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
                                    {[...users].filter(emp => !emp.isDeleted && emp.isEnabled !== false && !!emp.empId && emp.empId.trim() !== '').sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, undefined, { numeric: true, sensitivity: 'base' })).map((emp) => (
                                    <SelectItem key={emp.id} value={emp.id}>
                                        {emp.firstName} {emp.lastName} ({emp.empId.trim()})
                                    </SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        </div>
                        {selectedStory.itemType === 'Feature Change' ? (
                          <FormField
                          control={editStoryForm.control}
                          name="parentStoryId" 
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>Original Requirement</FormLabel>
                              <FormControl>
                                  <Input 
                                      list="parent-story-options-edit"
                                      placeholder="Link to a story or feature change"
                                      value={editParentStoryText}
                                      onChange={(e) => {
                                          const text = e.target.value;
                                          setEditParentStoryText(text);
                                          const matchingOption = parentStoryOptions.find(opt => opt.label === text);
                                          field.onChange(matchingOption ? matchingOption.value : undefined);
                                      }}
                                      onBlur={() => {
                                          const matchingOption = parentStoryOptions.find(opt => opt.label === editParentStoryText);
                                          if (!matchingOption) {
                                              setEditParentStoryText('');
                                              field.onChange(undefined);
                                          }
                                      }}
                                  />
                              </FormControl>
                              <datalist id="parent-story-options-edit">
                                  {parentStoryOptions
                                    .filter(opt => matchSearchQuery(opt.label, editParentStoryText))
                                    .map(opt => <option key={opt.value} value={opt.label} />)}
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
                                        <Circle className={cn("h-3 w-3", priorityStyles[p])} />
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField
                                 control={editStoryForm.control}
                                 name="sprintId"
                                 render={({ field }) => (
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
                             <FormField
                             control={editStoryForm.control}
                             name="estimatedHours"
                             render={({ field }) => (
                                 <FormItem>
                                 <FormLabel>Effort (hours)</FormLabel>
                                 <FormControl>
                                     <Input type="number" step="any" placeholder="0.00" {...field} value={isEffortReadOnly ? subItemsEffort : (field.value ?? '')} readOnly={isEffortReadOnly} className="font-mono" />
                                 </FormControl>
                                 {isEffortReadOnly && <p className="text-xs text-muted-foreground">Effort is calculated from linked sub-tasks.</p>}
                                 </FormItem>
                             )}
                             />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={editStoryForm.control}
                                name="predecessorId"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Predecessor Item</FormLabel>
                                    <FormControl>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                        <Input
                                            list="predecessor-options-edit"
                                            placeholder="Select predecessor requirement..."
                                            className="pl-9"
                                            value={editPredecessorText}
                                            onChange={(e) => {
                                                const text = e.target.value;
                                                setEditPredecessorText(text);
                                                const matchingOption = predecessorOptions.find(opt => opt.label === text);
                                                field.onChange(matchingOption ? matchingOption.value : 'unassigned');
                                            }}
                                            onBlur={() => {
                                                const matchingOption = predecessorOptions.find(opt => opt.label === editPredecessorText);
                                                if (!matchingOption) {
                                                    setEditPredecessorText('');
                                                    field.onChange('unassigned');
                                                }
                                            }}
                                        />
                                    </div>
                                    </FormControl>
                                    <datalist id="predecessor-options-edit">
                                        {predecessorOptions
                                          .filter(opt => matchSearchQuery(opt.label, editPredecessorText))
                                          .map(opt => <option key={opt.value} value={opt.label} />)}
                                    </datalist>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="subTasks">
                        <div className="space-y-4 pt-4">
                            <div>
                                <h4 className="text-sm font-medium mb-2">Sub-Tasks</h4>
                                {selectedStorySubItems.subTasks.length > 0 ? (
                                    <div className="space-y-2 rounded-md border p-2">
                                    {selectedStorySubItems.subTasks.map(item => {
                                        const ItemIcon = workItemIcons[item.itemType];
                                        return (
                                            <div key={item.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-x-2 text-sm p-2 hover:bg-muted/50 rounded-md">
                                                <ItemIcon className="h-4 w-4 text-muted-foreground" />
                                                <span 
                                                  className="font-medium cursor-pointer hover:underline truncate" 
                                                  onClick={() => handleDrillDown(item)}
                                                >
                                                  [{item.storyId}] {item.title}
                                                </span>
                                                <Badge variant="outline" className="w-24 justify-center truncate">{impactedSystems.find(s => s.id === item.impactedSystemId)?.name || 'N/A'}</Badge>
                                                <Badge variant="secondary" className="justify-center">{item.estimatedHours || 0}h</Badge>
                                                <Badge variant="outline" className="w-24 justify-center">{item.status}</Badge>
                                            </div>
                                        )
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground italic px-2 py-4 text-center">No sub-tasks linked.</p>
                                )}
                            </div>
                            <div>
                                {showAddSubTask ? (
                                     <div className="p-4 border rounded-md space-y-4 mt-4">
                                         <h4 className="font-semibold text-sm">Add Sub-Task</h4>
                                         <Form {...subTaskForm}>
                                             <div className="space-y-4">
                                                 <FormField control={subTaskForm.control} name="title" render={({field}) => (
                                                     <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Sub-task title" {...field} maxLength={60}/></FormControl><FormMessage/></FormItem>
                                                 )}/>
                                                 <FormField control={subTaskForm.control} name="description" render={({field}) => (
                                                     <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Describe sub-task..." {...field} maxLength={300} /></FormControl><FormMessage/></FormItem>
                                                 )}/>
                                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                                             {users.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}
                                                             </SelectContent>
                                                         </Select>
                                                         <FormMessage/>
                                                         </FormItem>
                                                     )}/>
                                                 </div>
                                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                     <FormField control={subTaskForm.control} name="status" render={({ field }) => (
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
                                                         <FormMessage/>
                                                     </FormItem>
                                                     )}/>
                                                 </div>
                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                      <FormField control={subTaskForm.control} name="startDate" render={({ field }) => (
                                                          <FormItem>
                                                              <FormLabel>Start Date</FormLabel>
                                                              <FormControl><Input type="date" {...field} value={field.value || ''} min={projStart} max={projEnd} /></FormControl>
                                                              {projStart && projEnd && (
                                                                <p className="text-[11px] text-muted-foreground">
                                                                  Project: {format(parseISO(projStart), 'dd MMM yyyy')} - {format(parseISO(projEnd), 'dd MMM yyyy')}
                                                                </p>
                                                              )}
                                                              <FormMessage />
                                                          </FormItem>
                                                      )} />
                                                      <FormField control={subTaskForm.control} name="endDate" render={({ field }) => (
                                                          <FormItem>
                                                              <FormLabel>End Date</FormLabel>
                                                              <FormControl><Input type="date" {...field} value={field.value || ''} min={projStart} max={projEnd} /></FormControl>
                                                              {projStart && projEnd && (
                                                                <p className="text-[11px] text-muted-foreground">
                                                                  Project: {format(parseISO(projStart), 'dd MMM yyyy')} - {format(parseISO(projEnd), 'dd MMM yyyy')}
                                                                </p>
                                                              )}
                                                              <FormMessage />
                                                          </FormItem>
                                                      )} />
                                                  </div>
                                                  <FormField control={subTaskForm.control} name="estimatedHours" render={({field}) => (
                                                      <FormItem><FormLabel>Effort (hours)</FormLabel><FormControl><Input type="number" step="any" placeholder="0.00" {...field} value={field.value ?? ''} className="font-mono" /></FormControl><FormMessage/></FormItem>
                                                  )}/>
                                                  <div className='flex justify-end gap-2'>
                                                    <Button type="button" variant="ghost" onClick={() => setShowAddSubTask(false)}>Cancel</Button>
                                                    <Button type="button" onClick={subTaskForm.handleSubmit(handleAddSubTask)}>Save Sub Task</Button>
                                                  </div>
                                              </div>
                                          </Form>
                                      </div>
                                 ) : (
                                     <Button variant="outline" size="sm" className="mt-2" onClick={() => setShowAddSubTask(true)}><PlusCircle className="mr-2 h-4 w-4"/> Add Sub-Task</Button>
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
                                       <p className="text-sm text-muted-foreground italic px-2">No defects linked.</p>
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
                    <DialogFooter>
                      <Button type="submit" disabled={isEditStorySubmitting}>
                        {isEditStorySubmitting ? 'Saving...' : 'Save Changes'}
                      </Button>
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






