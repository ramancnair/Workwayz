

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
import { PlusCircle, ChevronDown, Trash2, Star, Edit, BookOpen, Bug, CheckSquare, GitCommit, TrendingUp, Clock, CornerDownRight, ThumbsUp, ChevronsRight, X, FolderUp, Tag, Library, ArrowLeft, Bot, Package, Move, Circle, CheckCircle, ChevronRight } from 'lucide-react';
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
import type { Epic, Story, Sprint, User, WorkItemType, StoryStatus, ImpactedSystem, Release, Priority, StatusHistoryItem } from '@/types';
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
import { format, parseISO, differenceInDays, eachDayOfInterval, isSameDay } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';


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

const priorityStyles: Record<Priority, string> = {
    'Critical': 'text-red-500 fill-red-500',
    'High': 'text-orange-400 fill-orange-400',
    'Medium': 'text-yellow-500 fill-yellow-500',
    'Low': 'text-green-500 fill-green-500',
    'Backburner': 'text-gray-500 fill-gray-500',
};


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
  reporterId: z.string().optional(),
  assigneeId: z.string().optional(),
  estimatedHours: z.coerce.number().optional(),
  priority: z.enum(priorities).optional(),
  releaseId: z.string().optional(),
  environmentId: z.string().optional(),
  impactedSystemIds: z.array(z.string()).optional(),
  attachments: z.string().optional(),
  sprintId: z.string().optional(),
});

const subTaskFormSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    impactedSystemId: z.string().optional(),
    estimatedHours: z.coerce.number().optional(),
    assigneeId: z.string().optional(),
    status: z.enum(statusOptions),
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

const autoGenFormSchema = z.object({
  'Requirement/Story': z.coerce.number().min(0).default(0),
  'Feature Change': z.coerce.number().min(0).default(0),
  'Task': z.coerce.number().min(0).default(0),
  'Bug': z.coerce.number().min(0).default(0),
});

const bulkMoveSchema = z.object({
  targetEpicId: z.string(),
});


function StoryCard({ story, epic, assignee, onClick, className, subItems, sprint, release, onSubItemClick, isSelected, onSelectionChange }: { story: Story; epic?: Epic; assignee?: User; onClick: () => void; className?: string, subItems?: Story[], sprint?: Sprint | null, release?: Release | null, onSubItemClick: (item: Story) => void; isSelected: boolean; onSelectionChange: (checked: boolean) => void; }) {
  const Icon = workItemIcons[story.itemType];
  const subTasks = subItems?.filter(i => i.itemType === 'Sub Task') || [];
  const bugs = subItems?.filter(i => i.itemType === 'Bug') || [];
  
  const isReadyForDev = useMemo(() => {
    if (!story.estimatedHours || story.estimatedHours <= 0) return false;
    if (!story.impactedSystemIds || story.impactedSystemIds.length === 0) return true; // No systems, so ready
    
    const subTaskSystemIds = new Set(subTasks.map(st => st.impactedSystemId).filter(Boolean));
    return story.impactedSystemIds.every(id => subTaskSystemIds.has(id));
  }, [story.estimatedHours, story.impactedSystemIds, subTasks]);

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
                        <AvatarFallback>{assignee.firstName?.charAt(0)}</AvatarFallback>
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
                          <div className="flex items-center gap-1" title={`${bugs.length} bugs`}>
                            <Bug className="h-3 w-3" />
                            <span>{bugs.length}</span>
                          </div>
                        )}
                      </div>
                    </CollapsibleTrigger>
                  )}
                  {story.estimatedHours !== undefined && (
                  <div className="flex items-center gap-1" title="Development effort">
                      <Clock className="h-3 w-3" />
                      <span>{story.estimatedHours}h</span>
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
    epics, 
    stories, 
    sprints, 
    employees: users, 
    releasesAndMilestones,
    environments,
    impactedSystems,
    moveStoryToSprint, 
    moveStoryToEpic, 
    deleteStory, 
    deleteEpic, 
    updateEpic, 
    addEpic,
    addStory,
    updateStory,
    autoGenerateStories,
    bulkDeleteStories,
    bulkMoveStoriesToEpic,
    holidays,
    weeklyOffDays,
    projectSettings
  } = useProject();
  
  const { toast } = useToast();

  const [addEpicOpen, setAddEpicOpen] = useState(false);
  const [addRequirementOpen, setAddRequirementOpen] = useState(false);
  
  const [selectionStack, setSelectionStack] = useState<Story[]>([]);
  const selectedStory = selectionStack[selectionStack.length - 1] || null;

  const [editingEpic, setEditingEpic] = useState<Epic | null>(null);
  
  const [isAddEpicSubmitting, setAddEpicSubmitting] = useState(false);
  const [isEditEpicSubmitting, setEditEpicSubmitting] = useState(false);
  const [isAddStorySubmitting, setAddStorySubmitting] = useState(false);
  const [isEditStorySubmitting, setIsEditStorySubmitting] = useState(false);

  const [epicToDelete, setEpicToDelete] = useState<Epic | null>(null);
  const [deleteEpicItems, setDeleteEpicItems] = useState(false);
  const [showAddSubTask, setShowAddSubTask] = useState(false);
  const [isAutoGenOpen, setIsAutoGenOpen] = useState(false);
  const [isAutoGenSubmitting, setIsAutoGenSubmitting] = useState(false);
  
  const [selectedStories, setSelectedStories] = useState<string[]>([]);
  const [storiesToDelete, setStoriesToDelete] = useState<string[]>([]);
  const [storiesToMove, setStoriesToMove] = useState<string[]>([]);

  const [addParentStoryText, setAddParentStoryText] = useState('');
  const [editParentStoryText, setEditParentStoryText] = useState('');

  const releases = releasesAndMilestones.filter(r => r.itemType === 'Release');

  const calculateBusinessDays = useCallback((start: Date, end: Date): number => {
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
    if (!selectedStory?.developmentStartDate || !selectedStory?.completionDate) return null;
    const start = parseISO(selectedStory.developmentStartDate);
    const end = parseISO(selectedStory.completionDate);
    const days = calculateBusinessDays(start, end);
    const hoursPerDay = projectSettings?.manDayToHours || 8;
    return days * hoursPerDay;
  }, [selectedStory, calculateBusinessDays, projectSettings]);

  const addEpicForm = useForm<z.infer<typeof epicFormSchema>>({
    resolver: zodResolver(epicFormSchema),
    defaultValues: { title: '', description: '' },
  });
  
  const editEpicForm = useForm<z.infer<typeof epicFormSchema>>({
    resolver: zodResolver(epicFormSchema),
  });

  const addStoryForm = useForm<z.infer<typeof storyFormSchema>>({
    resolver: zodResolver(storyFormSchema),
    defaultValues: { itemType: 'Requirement/Story', title: '', description: '', acceptanceCriteria: '', epicId: 'unassigned', parentStoryId: '', reporterId: 'unassigned', assigneeId: 'unassigned', estimatedHours: 0, priority: 'Medium', releaseId: 'unassigned', environmentId: 'unassigned', impactedSystemIds: [], attachments: '', sprintId: 'backlog' },
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
      startDate: '',
      endDate: '',
      sprintId: 'backlog',
      releaseId: 'unassigned',
    }
  });

  const autoGenForm = useForm<z.infer<typeof autoGenFormSchema>>({
    resolver: zodResolver(autoGenFormSchema),
    defaultValues: {
      'Requirement/Story': 0,
      'Feature Change': 0,
      'Task': 0,
      'Bug': 0,
    }
  });
  
  const bulkMoveForm = useForm<z.infer<typeof bulkMoveSchema>>({
    resolver: zodResolver(bulkMoveSchema),
  });
  
  const watchedItemType = useWatch({ control: addStoryForm.control, name: 'itemType' });
  const watchedImpactedSystem = useWatch({ control: subTaskForm.control, name: 'impactedSystemId' });
  
  const filteredAssignees = useMemo(() => {
    if (!watchedImpactedSystem || watchedImpactedSystem === 'unassigned') {
      return users;
    }
    const system = impactedSystems.find(s => s.id === watchedImpactedSystem);
    if (!system) return users;
    return users.filter(user => 
      user.role === 'Lead' || 
      user.capabilities?.includes(system.id)
    );
  }, [watchedImpactedSystem, users, impactedSystems]);

  const parentStories = useMemo(() => stories.filter(s => ['Requirement/Story'].includes(s.itemType)), [stories]);
  const parentStoryOptions = useMemo(() => parentStories.map(s => ({
    value: s.id,
    label: `[${s.storyId}] ${s.title}`
  })), [parentStories]);

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
      editEpicForm.reset(editingEpic);
    }
  }, [editingEpic, editEpicForm]);
  
    useEffect(() => {
    if (!selectedStory) {
        setIsEditStorySubmitting(false);
        setShowAddSubTask(false);
        subTaskForm.reset();
    } else if (selectedStory.itemType === 'Sub Task') {
        subTaskForm.reset({
            title: selectedStory.title,
            description: selectedStory.description || '',
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
        const isSubItem = ['Bug', 'Feature Change'].includes(selectedStory.itemType);
        editStoryForm.reset({
            itemType: selectedStory.itemType,
            title: selectedStory.title,
            description: selectedStory.description || '',
            acceptanceCriteria: selectedStory.acceptanceCriteria || '',
            epicId: !isSubItem ? selectedStory.epicId || 'unassigned' : undefined,
            parentStoryId: isSubItem ? selectedStory.parentStoryId || undefined : undefined,
            reporterId: selectedStory.reporterId || 'unassigned',
            assigneeId: selectedStory.assigneeId || 'unassigned',
            estimatedHours: selectedStory.estimatedHours,
            priority: selectedStory.priority || 'Medium',
            releaseId: selectedStory.releaseId || 'unassigned',
            sprintId: selectedStory.sprintId || 'backlog',
            environmentId: selectedStory.environmentId || 'unassigned',
            impactedSystemIds: selectedStory.impactedSystemIds || [],
            attachments: selectedStory.attachments || '',
        });
        if (isSubItem && selectedStory.parentStoryId) {
            const parent = parentStoryOptions.find(p => p.value === selectedStory.parentStoryId);
            setEditParentStoryText(parent?.label || '');
        } else {
            setEditParentStoryText('');
        }
    }
  }, [selectedStory, editStoryForm, subTaskForm, parentStoryOptions]);
  
  useEffect(() => {
    if (!addRequirementOpen) {
      addStoryForm.reset();
      setAddStorySubmitting(false);
      setAddParentStoryText('');
    }
  }, [addRequirementOpen, addStoryForm]);

  useEffect(() => {
    if (!epicToDelete) {
        setDeleteEpicItems(false);
    }
  }, [epicToDelete]);

  const onAutoGenSubmit = async (values: z.infer<typeof autoGenFormSchema>) => {
    setIsAutoGenSubmitting(true);
    try {
        const success = await autoGenerateStories(values);
        if(success) {
            toast({ title: "Success", description: "Test data generated successfully."});
            setIsAutoGenOpen(false);
        } else {
            toast({ variant: "destructive", title: "Error", description: "Could not generate test data." });
        }
    } catch (e: any) {
        toast({ variant: "destructive", title: "Error", description: e.message || "An unknown error occurred." });
    } finally {
        setIsAutoGenSubmitting(false);
    }
  }
  
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
          itemType: values.itemType,
          acceptanceCriteria: values.acceptanceCriteria,
          reporterId: values.reporterId === 'unassigned' ? undefined : values.reporterId,
          assigneeId: values.assigneeId === 'unassigned' ? undefined : values.assigneeId,
          epicId: ['Task', 'Requirement/Story'].includes(values.itemType) ? (values.epicId === 'unassigned' ? undefined : values.epicId) : (parentStory?.epicId),
          parentStoryId: ['Bug', 'Feature Change'].includes(values.itemType) ? (values.parentStoryId || undefined) : undefined,
          status: 'To Do',
          estimatedHours: values.estimatedHours,
          priority: values.priority,
          sprintId: parentStory?.sprintId || (values.sprintId === 'backlog' ? null : values.sprintId),
          releaseId: parentStory?.releaseId || (values.releaseId === 'unassigned' ? undefined : values.releaseId),
          environmentId: values.environmentId === 'unassigned' ? undefined : values.environmentId,
          impactedSystemIds: values.impactedSystemIds,
          attachments: values.attachments,
          isDeleted: false,
          deletedAt: null,
        };

        const success = await addStory(newStory);
        if (success) {
          setAddRequirementOpen(false);
        } else {
          toast({ variant: "destructive", title: `Error Creating ${values.itemType}`, description: `Could not save your ${values.itemType.toLowerCase()}.` });
        }
    } catch(e: any) {
        toast({ variant: "destructive", title: "Error", description: e.message || "An unknown error occurred." });
    } finally {
        setAddStorySubmitting(false);
    }
  };
  
  const onEditStorySubmit = async (values: z.infer<typeof storyFormSchema>) => {
    if (!selectedStory) return;
    setIsEditStorySubmitting(true);
    
    const payload: Partial<Story> = {
        title: values.title,
        description: values.description,
        acceptanceCriteria: values.acceptanceCriteria,
        reporterId: values.reporterId === 'unassigned' ? undefined : values.reporterId,
        assigneeId: values.assigneeId === 'unassigned' ? undefined : values.assigneeId,
        estimatedHours: values.estimatedHours,
        priority: values.priority,
        sprintId: values.sprintId === 'backlog' ? null : values.sprintId,
        releaseId: values.releaseId === 'unassigned' ? undefined : values.releaseId,
        environmentId: values.environmentId === 'unassigned' ? undefined : values.environmentId,
        impactedSystemIds: values.impactedSystemIds,
        attachments: values.attachments,
    };
    
    if (['Task', 'Requirement/Story'].includes(selectedStory.itemType)) {
        payload.epicId = values.epicId === 'unassigned' ? undefined : values.epicId;
    }
    
    if (['Bug', 'Feature Change'].includes(selectedStory.itemType)) {
        payload.parentStoryId = values.parentStoryId || undefined;
        payload.epicId = undefined; // Sub-items don't have direct epic link in this model
    }
    
    const success = await updateStory(selectedStory.id, payload);

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
        title: values.title,
        description: values.description,
        impactedSystemId: values.impactedSystemId === 'unassigned' ? undefined : values.impactedSystemId,
        estimatedHours: values.estimatedHours,
        assigneeId: values.assigneeId === 'unassigned' ? undefined : values.assigneeId,
        status: values.status,
        startDate: values.startDate ? new Date(values.startDate).toISOString() : undefined,
        endDate: values.endDate ? new Date(values.endDate).toISOString() : undefined,
        sprintId: values.sprintId === 'backlog' ? null : values.sprintId,
        releaseId: values.releaseId === 'unassigned' ? undefined : values.releaseId,
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
      toast({ title: 'Success', description: `${storiesToDelete.length} stories moved to trash.` });
      setSelectedStories(prev => prev.filter(id => !storiesToDelete.includes(id)));
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not delete stories." });
    }
    setStoriesToDelete([]);
  };

  const handleBulkMove = async (values: z.infer<typeof bulkMoveSchema>) => {
    const success = await bulkMoveStoriesToEpic(storiesToMove, values.targetEpicId === 'unassigned' ? null : values.targetEpicId);
    if(success) {
      toast({ title: 'Success', description: `${storiesToMove.length} stories moved.` });
      setSelectedStories(prev => prev.filter(id => !storiesToMove.includes(id)));
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not move stories." });
    }
    setStoriesToMove([]);
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
  
  const epicsAndUnassigned = useMemo(() => {
    const epicMap: Record<string, Epic & { hasStories: boolean }> = {};
    epics.forEach(e => {
        epicMap[e.id] = { ...e, hasStories: false };
    });

    Object.keys(backlogItemsByEpic).forEach(epicId => {
        if (epicMap[epicId]) {
            epicMap[epicId].hasStories = true;
        }
    });

    const unassignedStoriesExist = (backlogItemsByEpic['unassigned'] || []).length > 0;

    let displayEpics: (Epic | { id: string; title: string; description: string; })[] = epics.filter(e => epicMap[e.id]?.hasStories);
    
    if (unassignedStoriesExist) {
        displayEpics.push({ id: 'unassigned', title: 'Unassigned', description: 'Items not assigned to any epic.' });
    }
    
    if (displayEpics.length === 0 && epics.length > 0) {
        displayEpics = [...epics];
    } else if (displayEpics.length === 0 && epics.length === 0 && unassignedStoriesExist) {
        displayEpics = [{ id: 'unassigned', title: 'Unassigned', description: 'Items not assigned to any epic.' }];
    }


    return displayEpics.sort((a, b) => {
        if (a.id === 'unassigned') return 1;
        if (b.id === 'unassigned') return -1;
        return a.title.localeCompare(b.title);
    });
  }, [epics, backlogItemsByEpic]);
  
  const epicToDeleteStoryCount = epicToDelete ? stories.filter(story => story.epicId === epicToDelete.id).length : 0;
  
  const selectedStoriesInEpic = (epicId: string) => {
    const epicStoryIds = (backlogItemsByEpic[epicId] || []).map(s => s.id);
    return selectedStories.filter(id => epicStoryIds.includes(id));
  }
  
  const handleToggleSelectAll = (epicId: string, storiesInEpic: Story[]) => {
    const epicStoryIds = storiesInEpic.map(s => s.id);
    const selectedInEpic = selectedStoriesInEpic(epicId);

    if (selectedInEpic.length === epicStoryIds.length) {
      // Deselect all in this epic
      setSelectedStories(prev => prev.filter(id => !epicStoryIds.includes(id)));
    } else {
      // Select all in this epic
      setSelectedStories(prev => [...new Set([...prev, ...epicStoryIds])]);
    }
  }

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

  const sortedEnvironments = [...environments].sort((a,b) => a.order - b.order);

  const isEffortReadOnly = useMemo(() => {
    if (!selectedStory) return false;
    return (selectedStorySubItems.subTasks.length > 0);
  }, [selectedStory, selectedStorySubItems]);

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 h-full flex flex-col">
        <PageHeader
          title="Product Backlog"
          description="Manage your epics and stories."
        >
          <Dialog open={isAutoGenOpen} onOpenChange={setIsAutoGenOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Bot className="mr-2 h-4 w-4" />
                    Req Autogen
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Auto-Generate Requirements</DialogTitle>
                    <DialogDescription>Enter the number of each item type to create for testing.</DialogDescription>
                </DialogHeader>
                <Form {...autoGenForm}>
                    <form onSubmit={autoGenForm.handleSubmit(onAutoGenSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            {workItemTypes.map(itemType => (
                                <FormField
                                    key={itemType}
                                    control={autoGenForm.control}
                                    name={itemType}
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{itemType}</FormLabel>
                                        <FormControl>
                                        <Input type="number" placeholder="0" {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            ))}
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isAutoGenSubmitting}>
                                {isAutoGenSubmitting ? 'Generating...' : 'Generate Items'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
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

          <Dialog open={addRequirementOpen} onOpenChange={setAddRequirementOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Requirement
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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
                    <div className="space-y-4 pt-4">
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
                        {['Requirement/Story', 'Feature Change'].includes(watchedItemType) && (
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
                                <FormLabel>Acceptance Criteria</FormLabel>
                                <FormControl>
                                <Textarea placeholder={`Define acceptance criteria for this ${watchedItemType.toLowerCase()}...`} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {['Requirement/Story', 'Task'].includes(watchedItemType) ? (
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
                                    {users.map(emp => (
                                        <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>
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
                                    {users.map(emp => (
                                        <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>
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
                              <FormLabel>{watchedItemType === 'Feature Change' ? 'Original Requirement' : 'Parent Item'}</FormLabel>
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
                                  {parentStoryOptions.map(opt => <option key={opt.value} value={opt.label} />)}
                              </datalist>
                              <FormMessage />
                              </FormItem>
                          )}
                          />
                        ) : null}
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
                                    <Input type="number" placeholder="0" {...field} value={field.value || ''} />
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
        <div className="flex-1 overflow-y-auto pr-2">
          <Accordion type="multiple" className="w-full" defaultValue={epicsAndUnassigned.map(e => e.id)}>
            {epicsAndUnassigned.map((epic) => {
              const isUnassignedEpic = epic.id === 'unassigned';
              const allStoriesInEpic = stories.filter(s => s.epicId === epic.id);
              const totalEpicItemsCount = allStoriesInEpic.length;
              const doneEpicItemsCount = allStoriesInEpic.filter(s => s.status === 'Done').length;
              const donePercentage = totalEpicItemsCount > 0 ? Math.round((doneEpicItemsCount / totalEpicItemsCount) * 100) : 0;
              const backlogItemsForGroup = backlogItemsByEpic[epic.id] || [];
              const selectedCount = selectedStoriesInEpic(epic.id).length;

              if (backlogItemsForGroup.length === 0 && isUnassignedEpic && epics.length > 0) return null;

              return (
                  <AccordionItem value={epic.id} key={epic.id} className="bg-muted/50 rounded-lg border">
                    <AccordionTrigger className="flex-1 p-2 group" hideChevron>
                        <div className="flex items-center gap-4 flex-1">
                            <ChevronRight className="h-5 w-5 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                            <span className="font-semibold">{epic.title}</span>
                            <Badge variant="secondary">{backlogItemsForGroup.length} {backlogItemsForGroup.length === 1 ? 'item' : 'items'}</Badge>
                            {!isUnassignedEpic && totalEpicItemsCount > 0 && (
                            <div className="flex items-center gap-2" title={`${doneEpicItemsCount} of ${totalEpicItemsCount} stories completed`}>
                                <Progress value={donePercentage} className="h-2 w-24" />
                                <span className="text-xs font-semibold text-muted-foreground">{donePercentage}%</span>
                            </div>
                            )}
                        </div>
                        {!isUnassignedEpic && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setEditingEpic(epic as Epic); }}>
                            <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setEpicToDelete(epic as Epic); }}>
                            <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                        )}
                    </AccordionTrigger>
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
        </div>
      </div>

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
                <DialogTitle>Move {storiesToMove.length} Stories</DialogTitle>
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
                                <FormLabel>New Epic</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select an epic" />
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
                    <DialogFooter>
                        <Button type="submit">Move Stories</Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedStory} onOpenChange={(open) => !open && handleSetSelectedStory(null)}>
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
                                <TabsTrigger value="logs">
                                    Logs
                                    <Badge variant="secondary" className="ml-2">
                                        {selectedStorySubItems.logs.length}
                                    </Badge>
                                </TabsTrigger>
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
                                                {filteredAssignees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}
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
                                        <FormField control={subTaskForm.control} name="startDate" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Start Date</FormLabel>
                                                <FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={subTaskForm.control} name="endDate" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>End Date</FormLabel>
                                                <FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl>
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
                                            <span>{actualEffortInHours} {actualEffortInHours === 1 ? 'hour' : 'hours'}</span>
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
                      name="itemType"
                      render={({ field }) => (
                      <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled>
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
                            {['Requirement/Story', 'Feature Change'].includes(selectedStory.itemType) && (
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
                        {['Requirement/Story', 'Feature Change'].includes(selectedStory.itemType) && (
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
                         {selectedStory.itemType === 'Bug' && (
                            <FormField
                                control={editStoryForm.control}
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
                                        {users.map(emp => (
                                            <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>
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
                          name="parentStoryId" 
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>{selectedStory.itemType === 'Feature Change' ? 'Original Requirement' : 'Parent Item'}</FormLabel>
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
                                  {parentStoryOptions.map(opt => <option key={opt.value} value={opt.label} />)}
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
                                    <Input type="number" placeholder="0" {...field} value={field.value ?? ''} readOnly={isEffortReadOnly} />
                                </FormControl>
                                {isEffortReadOnly && <p className="text-xs text-muted-foreground">Effort is calculated from linked sub-tasks.</p>}
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        </div>
                        {selectedStory.itemType === 'Bug' && (
                            <>
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
                            </>
                        )}
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
                                                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
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
                                                            {filteredAssignees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}
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
                                                            <FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )} />
                                                    <FormField control={subTaskForm.control} name="endDate" render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>End Date</FormLabel>
                                                            <FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )} />
                                                </div>
                                                <FormField control={subTaskForm.control} name="estimatedHours" render={({field}) => (
                                                    <FormItem><FormLabel>Effort (hours)</FormLabel><FormControl><Input type="number" placeholder="0" {...field} value={field.value ?? ''}/></FormControl><FormMessage/></FormItem>
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
                            <div>
                                <h4 className="text-sm font-medium mb-2">Bugs</h4>
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
                                    <span>{actualEffortInHours} {actualEffortInHours === 1 ? 'hour' : 'hours'}</span>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                  </Tabs>
                  <DialogFooter className="flex justify-end items-center pt-4">
                    <div className="flex items-center gap-2">
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
    </>
  );
}
    

    

    

















