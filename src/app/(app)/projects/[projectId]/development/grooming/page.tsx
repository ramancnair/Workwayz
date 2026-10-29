

'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
import { PlusCircle, Edit, Trash2, Star, ChevronLeft, ChevronRight, ChevronDown, BookOpen, Bug, CheckSquare, GitCommit, Clock, CornerDownRight, Flag, ArrowLeft, Package, ClipboardList, Circle, CheckCircle, Search, Layers, Wrench, Zap } from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { useToast } from '@/hooks/use-toast';
import { type Sprint, type Story, type Epic, type WorkItemType, User, ImpactedSystem, Holiday, Release, Priority, StoryStatus, SprintStatus, TestCase, isPbiWorkItem, isBugWorkItem, isExecutionWorkItem, formatWorkItemType } from '@/types';
import { cn, getSprintDisplayId, generateNextSprintId, getUserInitials, matchSearchQuery } from '@/lib/utils';
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
import { format, parseISO, eachDayOfInterval, isSameDay } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { AiSubtaskTestCaseButton } from '@/components/kanban/AiSubtaskTestCaseButton';

const sprintStatuses: SprintStatus[] = ['Yet to Start', 'Current', 'Completed', 'Cancelled'];

const sprintSchema = z.object({
  title: z.string().min(1, 'Title is required.').max(60, 'Sprint name cannot exceed 60 characters.'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['Yet to Start', 'Current', 'Completed', 'Cancelled']).optional(),
  releaseId: z.string().optional(),
});

const workItemIcons: Record<WorkItemType, React.ElementType> = {
  'Story': BookOpen,
  'User Story': BookOpen,
  'Requirement/Story': BookOpen,
  'Feature Change': GitCommit,
  'Task': CheckSquare,
  'Enabler': Layers,
  'Tech Debt': Wrench,
  'Spike': Zap,
  'Bug / Defect': Bug,
  'Bug': Bug,
  'Subtasks': CheckSquare,
  'Sub Task': CheckSquare,
  'In-Sprint Bug': Bug,
};

const statusOptions: StoryStatus[] = ['To Do', 'In Progress', 'Done'];
const priorities: Priority[] = ['Critical', 'High', 'Medium', 'Low', 'Backburner'];

const priorityStyles: Record<Priority, string> = {
    'Critical': 'text-red-500 fill-red-500',
    'High': 'text-orange-400 fill-orange-400',
    'Medium': 'text-yellow-500 fill-yellow-500',
    'Low': 'text-green-500 fill-green-500',
    'Backburner': 'text-gray-500 fill-gray-500',
};


const storyFormSchema = z.object({
  title: z.string().min(1, 'Title is required.').max(60, 'Title cannot exceed 60 characters.'),
  description: z.string().max(300, 'Description cannot exceed 300 characters.').optional(),
  acceptanceCriteria: z.string().optional(),
  epicId: z.string().optional(),
  parentStoryId: z.string().optional(),
  reporterId: z.string().optional(),
  relatedTestCaseId: z.string().optional(),
  assigneeId: z.string().optional(),
  estimatedHours: z.coerce.number().optional(),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low', 'Backburner']).optional(),
  severity: z.enum(['Critical', 'High', 'Medium', 'Low']).optional(),
  foundInTestPlanId: z.string().optional(),
  relatedBugId: z.string().optional(),
  impactedSystemIds: z.array(z.string()).optional(),
  releaseId: z.string().optional(),
  attachments: z.string().optional(),
  status: z.string().optional(),
  resolution: z.string().optional(),
  sprintId: z.string().optional(),
  predecessorId: z.string().optional(),
  createdAt: z.date().optional(),
  closedAt: z.date().optional(),
});

const subTaskFormSchemaBase = z.object({
    title: z.string().min(1, 'Title is required.').max(60, 'Title cannot exceed 60 characters.'),
    description: z.string().max(300, 'Description cannot exceed 300 characters.').optional(),
    impactedSystemId: z.string().optional(),
    estimatedHours: z.coerce.number().optional(),
    assigneeId: z.string().optional(),
    status: z.string(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    sprintId: z.string().optional(),
    releaseId: z.string().optional(),
});


function StoryItemCard({ 
    story, 
    epic, 
    assignee,
    subItems,
    parentStory,
    onMove, 
    onEdit,
    onDelete,
    onSubItemClick,
}: { 
    story: Story, 
    epic?: Epic, 
    assignee?: User,
    subItems?: Story[],
    parentStory?: Story,
    onMove: (storyId: string, sprintId: string | null) => void,
    onEdit: () => void;
    onDelete?: () => void;
    onSubItemClick: (story: Story) => void;
}) {
  const { sprints, impactedSystems } = useProject();
  const Icon = workItemIcons[story.itemType];
  const subTasks = useMemo(() => subItems?.filter(i => i.itemType === 'Sub Task' || i.itemType === 'Subtasks') || [], [subItems]);
  const bugs = useMemo(() => subItems?.filter(i => isBugWorkItem(i.itemType)) || [], [subItems]);
  const showSubTasks = subTasks.length > 0;
  const showBugs = bugs.length > 0;

  const [isSubtaskOpen, setIsSubtaskOpen] = useState(false);
  const [isBugOpen, setIsBugOpen] = useState(false);
  
  const isReadyForDev = useMemo(() => {
    if (!story.estimatedHours || story.estimatedHours <= 0) return false;
    if (!story.impactedSystemIds || story.impactedSystemIds.length === 0) return true; // No systems, so ready
    
    const subTaskSystemIds = new Set(subTasks.map(st => st.impactedSystemId).filter(Boolean));
    return story.impactedSystemIds.every(id => subTaskSystemIds.has(id));
  }, [story.estimatedHours, story.impactedSystemIds, subTasks]);

  const displayEffort = useMemo(() => {
    if (isPbiWorkItem(story.itemType)) {
      if (subTasks.length > 0 || bugs.length > 0) {
        return [...subTasks, ...bugs].reduce((sum, item) => sum + (item.estimatedHours || 0), 0);
      }
    }
    return story.estimatedHours;
  }, [story.itemType, story.estimatedHours, subTasks, bugs]);

  const sortedSprints = useMemo(() => {
    return [...sprints].sort((a, b) => {
        if (a.status === 'Current') return -1;
        if (b.status === 'Current') return 1;
        return (a.title || '').localeCompare(b.title || '');
    });
  }, [sprints]);
  
  const renderSubItemList = (items: Story[], type: 'Sub-Task' | 'Bug') => (
    <div className="px-4 pb-4 space-y-2">
      <Separator />
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-x-2 text-xs font-semibold text-muted-foreground px-2">
          <span></span>
          <span>Title</span>
          <span>Impacted System</span>
          <span>Effort</span>
          <span>Status</span>
      </div>
      {items.map(item => {
          const ItemIcon = workItemIcons[item.itemType];
          const system = impactedSystems.find(s => s.id === item.impactedSystemId);
          return (
                <div key={item.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-x-2 text-xs py-1 px-2 rounded-md hover:bg-muted">
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
                  <Badge variant="outline" className="w-24 justify-center truncate">{system?.name || 'N/A'}</Badge>
                  <span className="w-16 text-center text-muted-foreground">{item.estimatedHours || 0}h</span>
                  <Badge variant="outline" className="w-20 justify-center">{item.status}</Badge>
              </div>
          )
      })}
    </div>
  );

  return (
     <Card className="bg-card">
        <div className="p-4">
            <div className="flex justify-between items-start">
                <div className="flex-1 pr-2 space-y-1">
                    <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <TooltipProvider>
                            <Tooltip>
                            <TooltipTrigger asChild>
                                <button>
                                <Circle className={cn("h-3 w-3 cursor-pointer", story.priority ? priorityStyles[story.priority] : 'text-gray-500 fill-gray-500')} />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{story.priority || 'No'} Priority</p>
                            </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <p className="text-xs font-semibold text-muted-foreground">
                            {parentStory ? `${parentStory.storyId} > ${story.storyId}` : story.storyId}
                        </p>
                        {isReadyForDev && <CheckCircle className="h-4 w-4 text-green-500" />}
                    </div>
                    <p className="font-semibold break-words">{story.title}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    {epic && <Badge variant="secondary">{epic.title}</Badge>}
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Edit">
                    <Edit className="h-4 w-4" />
                    </Button>
                    {onDelete && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete">
                      <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                </div>
            </div>
            <div className="flex justify-between items-center text-xs text-muted-foreground mt-2">
                <div className="flex items-center gap-4">
                    {assignee && (
                    <TooltipProvider>
                        <Tooltip>
                        <TooltipTrigger>
                            <Avatar className="h-6 w-6">
                            <AvatarImage src={assignee.avatar} alt={`${assignee.firstName} ${assignee.lastName}`} data-ai-hint="developer avatar"/>
                            <AvatarFallback className="text-[10px]">{getUserInitials(assignee.firstName, assignee.lastName)}</AvatarFallback>
                            </Avatar>
                        </TooltipTrigger>
                        <TooltipContent><p>Assigned to {assignee.firstName} {assignee.lastName}</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    )}
                    {displayEffort !== undefined && (
                    <div className="flex items-center gap-1" title="Development effort">
                        <Clock className="h-3 w-3" />
                        <span>{displayEffort}h</span>
                    </div>
                    )}
                    <div className="flex items-center gap-2">
                    {showSubTasks && (
                        <button onClick={(e) => { e.stopPropagation(); setIsSubtaskOpen(!isSubtaskOpen); setIsBugOpen(false); }} className="flex items-center gap-1 cursor-pointer" title={`${subTasks.length} sub-tasks`}>
                            <CheckSquare className="h-3 w-3" />
                            <span>{subTasks.length}</span>
                        </button>
                    )}
                    {showBugs && (
                        <button onClick={(e) => { e.stopPropagation(); setIsBugOpen(!isBugOpen); setIsSubtaskOpen(false); }} className="flex items-center gap-1 cursor-pointer" title={`${bugs.length} defects`}>
                            <Bug className="h-3 w-3" />
                            <span>{bugs.length}</span>
                        </button>
                    )}
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7" onClick={(e) => e.stopPropagation()}>
                        Move <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                    {!!story.sprintId && (
                        <DropdownMenuItem onClick={() => onMove(story.id, null)}>
                        Backlog
                        </DropdownMenuItem>
                    )}
                    {sortedSprints
                        .filter((sprint) => sprint.id !== story.sprintId)
                        .map((sprint) => (
                        <DropdownMenuItem key={sprint.id} onClick={() => onMove(story.id, sprint.id)}>
                            {sprint.title} {sprint.status === 'Current' && "(current)"}
                        </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
        {isSubtaskOpen && showSubTasks && renderSubItemList(subTasks, 'Sub-Task')}
        {isBugOpen && showBugs && renderSubItemList(bugs, 'Bug')}
    </Card>
  );
}

function SprintColumn({ 
    sprint, 
    holidays,
    weeklyOffDays,
    onEdit, 
    onDelete, 
    onPrev, 
    onNext, 
    showNav,
    onMoveStory,
    onEditStory,
    onDeleteStory,
    viewBy,
}: { 
    sprint: Sprint & { stories: Story[] }, 
    holidays: Holiday[],
    weeklyOffDays: number[],
    onEdit: (sprint: Sprint) => void, 
    onDelete: (sprint: Sprint) => void, 
    onPrev: () => void, 
    onNext: () => void, 
    showNav: boolean,
    onMoveStory: (storyId: string, sprintId: string | null) => void,
    onEditStory: (story: Story) => void,
    onDeleteStory?: (story: Story) => void,
    viewBy: 'story' | 'sub-task' | 'bug',
}) {
    const { epics, employees, impactedSystems, projectSettings, stories: allStories } = useProject();

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

    const systemCapacityData = useMemo(() => {
        if (!sprint.startDate || !sprint.endDate) return [];
        const businessDaysInSprint = calculateBusinessDays(parseISO(sprint.startDate), parseISO(sprint.endDate));
        if (businessDaysInSprint <= 0) return [];
    
        const utilizationMap: Record<string, { utilizedHours: number, totalCapacityHours: number, systemName: string }> = {};

        impactedSystems.forEach(sys => {
            utilizationMap[sys.id] = { utilizedHours: 0, totalCapacityHours: 0, systemName: sys.name };
        });
        
        impactedSystems.forEach(system => {
            const systemResources = employees.filter(emp => emp.capabilities?.includes(system.id));
            let systemCapacity = 0;
            systemResources.forEach(res => {
                const availabilityFactor = (res.availability || 100) / 100;
                systemCapacity += businessDaysInSprint * (projectSettings?.manDayToHours || 8) * availabilityFactor;
            });
            utilizationMap[system.id].totalCapacityHours = systemCapacity;
        });

        const allSubItemsInSprint = allStories.filter(story => story.sprintId === sprint.id);

        let itemsToConsider: Story[] = [];

        if (viewBy === 'bug') {
            itemsToConsider = allSubItemsInSprint.filter(i => isBugWorkItem(i.itemType));
        } else {
            itemsToConsider = allSubItemsInSprint.filter(i => ['Sub Task', 'Subtasks', 'Task'].includes(i.itemType));
        }
            
        itemsToConsider.forEach(task => {
            const systemId = task.impactedSystemId;
            if (systemId && utilizationMap[systemId]) {
                utilizationMap[systemId].utilizedHours += task.estimatedHours || 0;
            }
        });
        
        const result = Object.entries(utilizationMap).map(([systemId, data]) => {
             return {
                systemId,
                ...data,
                utilization: data.totalCapacityHours > 0 ? (data.utilizedHours / data.totalCapacityHours) * 100 : 0
            }
        });
    
        return result.filter(d => d.utilizedHours > 0 || (d.totalCapacityHours > 0 && viewBy !== 'bug'));
    
    }, [sprint, allStories, impactedSystems, employees, projectSettings, calculateBusinessDays, viewBy]);
    
    return (
        <div className="bg-muted/50 rounded-lg p-4 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{getSprintDisplayId(sprint)}</span>
                    <h3 className="text-lg font-semibold">{sprint.title}</h3>
                    {sprint.status === 'Current' && <Badge>Current</Badge>}
                </div>
                <div className="flex items-center gap-1">
                    {showNav && (
                        <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPrev}><ChevronLeft /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onNext}><ChevronRight /></Button>
                        </>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(sprint)}><Edit /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(sprint)}><Trash2 /></Button>
                </div>
            </div>

            <div className="mb-4 space-y-2">
                {systemCapacityData.map(data => (
                    <div key={data.systemId} className="text-xs">
                        <div className="flex justify-between mb-1">
                            <span className="font-semibold">{data.systemName}</span>
                            <span className="text-muted-foreground">
                                {data.utilizedHours.toFixed(0)}h 
                                {data.totalCapacityHours > 0 && ` / ${data.totalCapacityHours.toFixed(0)}h`}
                            </span>
                        </div>
                        <Progress 
                            value={data.totalCapacityHours > 0 ? data.utilization : 0}
                            indicatorClassName={cn(data.utilization > 100 && "bg-red-500")}
                        />
                    </div>
                ))}
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto">
                {sprint.stories.map(story => {
                    const epic = epics.find(e => e.id === story.epicId);
                    const assignee = employees.find(e => e.id === story.assigneeId);
                    const subItems = allStories.filter(s => s.parentStoryId === story.id);
                    const parentStory = story.parentStoryId ? allStories.find(s => s.id === story.parentStoryId) : undefined;
                    return (
                         <div key={story.id}>
                            <StoryItemCard 
                                story={story} 
                                epic={epic}
                                assignee={assignee}
                                subItems={subItems}
                                parentStory={parentStory}
                                onMove={onMoveStory}
                                onEdit={() => onEditStory(story)}
                                onDelete={onDeleteStory ? () => onDeleteStory(story) : undefined}
                                onSubItemClick={onEditStory}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function GroomingPage() {
    const { 
        project,
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
        updateStory,
        deleteStory,
        environments,
        holidays,
        weeklyOffDays,
        releasesAndMilestones,
        testCases,
        testPlans,
        updateTestCase,
        deleteTestCase,
    } = useProject();
    const { toast } = useToast();
    
    const [isSprintDialogOpen, setIsSprintDialogOpen] = useState(false);
    const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
    const [deletingSprint, setDeletingSprint] = useState<Sprint | null>(null);
    const [selectionStack, setSelectionStack] = useState<Story[]>([]);
    const selectedStory = selectionStack[selectionStack.length - 1] || null;
    const [editStoryActiveTab, setEditStoryActiveTab] = useState<string>('details');
    const [storyToDelete, setStoryToDelete] = useState<Story | null>(null);

    const storyToDeleteCascadeInfo = useMemo(() => {
        if (!storyToDelete) return { subTasksCount: 0, defectsCount: 0, testCasesCount: 0 };
        const id = storyToDelete.id;
        
        let subTasksCount = 0;
        let defectsCount = 0;
        let testCasesCount = 0;

        stories.forEach(s => {
            if (s.parentStoryId === id && s.id !== id && !s.isDeleted) {
                if (s.itemType === 'Sub Task' || s.itemType === 'Subtasks') {
                    subTasksCount++;
                } else if (isBugWorkItem(s.itemType)) {
                    defectsCount++;
                } else {
                    subTasksCount++;
                }
            } else if (s.relatedBugId === id && s.id !== id && !s.isDeleted) {
                defectsCount++;
            }
        });

        testCases.forEach(tc => {
            if (tc.storyId === id && !tc.isDeleted) {
                testCasesCount++;
            }
        });

        return { subTasksCount, defectsCount, testCasesCount };
    }, [storyToDelete, stories, testCases]);
    const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);
    const [visibleSprintIndex, setVisibleSprintIndex] = useState(0);
    const [isEditStorySubmitting, setIsEditStorySubmitting] = useState(false);
    const [showAddSubTask, setShowAddSubTask] = useState(false);
    const [viewBy, setViewBy] = useState<'story' | 'sub-task' | 'bug'>('story');
    const [selectedAssigneeId, setSelectedAssigneeId] = useState('all');
    const [editParentStoryText, setEditParentStoryText] = useState('');
    const [testCaseInputText, setTestCaseInputText] = useState('');
    const [relatedBugInputText, setRelatedBugInputText] = useState('');
    const [editPredecessorText, setEditPredecessorText] = useState('');
    
    const releases = releasesAndMilestones.filter(r => r.itemType === 'Release');

    const backlogItems = useMemo(() => {
        let baseItems: Story[];

        if (viewBy === 'story') {
            baseItems = stories.filter(story => !story.sprintId && isPbiWorkItem(story.itemType) && !isBugWorkItem(story.itemType));
        } else if (viewBy === 'sub-task') {
            baseItems = stories.filter(story => !story.sprintId && (story.itemType === 'Sub Task' || story.itemType === 'Subtasks'));
        } else if (viewBy === 'bug') {
            baseItems = stories.filter(story => !story.sprintId && isBugWorkItem(story.itemType));
        } else {
            baseItems = [];
        }

        if (selectedAssigneeId === 'all') return baseItems;
        if (selectedAssigneeId === 'unassigned') return baseItems.filter(story => !story.assigneeId || story.assigneeId === '');
        return baseItems.filter(story => story.assigneeId === selectedAssigneeId);

    }, [stories, viewBy, selectedAssigneeId]);
    
     const subItemsByParentId = useMemo(() => stories.reduce((acc, story) => {
        if ((isBugWorkItem(story.itemType) || story.itemType === 'Sub Task' || story.itemType === 'Subtasks') && story.parentStoryId) {
            if (!acc[story.parentStoryId]) {
                acc[story.parentStoryId] = [];
            }
            acc[story.parentStoryId].push(story);
        }
        return acc;
      }, {} as Record<string, Story[]>), [stories]);

    const sprintsWithStories = useMemo(() => {
        return sprints.map(sprint => {
            let items: Story[];
            if (viewBy === 'story') {
                items = stories.filter(story => story.sprintId === sprint.id && isPbiWorkItem(story.itemType) && !isBugWorkItem(story.itemType));
            } else if (viewBy === 'sub-task') {
                items = stories.filter(story => story.sprintId === sprint.id && (story.itemType === 'Sub Task' || story.itemType === 'Subtasks'));
            } else if (viewBy === 'bug') {
                items = stories.filter(story => story.sprintId === sprint.id && isBugWorkItem(story.itemType));
            } else {
                items = [];
            }
            
            if (selectedAssigneeId === 'all') {
                return { ...sprint, stories: items };
            }
            const filteredStories = items.filter(story => {
                if (selectedAssigneeId === 'unassigned') {
                    return !story.assigneeId || story.assigneeId === '';
                }
                return story.assigneeId === selectedAssigneeId;
            });

            return { ...sprint, stories: filteredStories };
        })
        .sort((a,b) => new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime());

    }, [sprints, stories, viewBy, selectedAssigneeId]);
    
    useEffect(() => {
        if(sprintsWithStories.length > 0 && visibleSprintIndex >= sprintsWithStories.length) {
            setVisibleSprintIndex(0);
        } else if (sprintsWithStories.length === 0) {
            setVisibleSprintIndex(0);
        }
    }, [sprintsWithStories, visibleSprintIndex]);

    const projStart = project?.startDate ? format(parseISO(project.startDate), 'yyyy-MM-dd') : null;
    const projEnd = project?.endDate ? format(parseISO(project.endDate), 'yyyy-MM-dd') : null;

    const dynamicSprintSchema = useMemo(() => {
        return sprintSchema.superRefine((data, ctx) => {
            if (data.startDate && data.endDate && new Date(data.endDate) < new Date(data.startDate)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "End date must be on or after start date.",
                    path: ['endDate'],
                });
            }
            if (data.startDate && projStart && data.startDate < projStart) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Sprint start date cannot be earlier than project start date (${format(parseISO(projStart), 'dd MMM yyyy')}).`,
                    path: ['startDate'],
                });
            }
            if (data.startDate && projEnd && data.startDate > projEnd) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Sprint start date cannot be later than project end date (${format(parseISO(projEnd), 'dd MMM yyyy')}).`,
                    path: ['startDate'],
                });
            }
            if (data.endDate && projStart && data.endDate < projStart) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Sprint end date cannot be earlier than project start date (${format(parseISO(projStart), 'dd MMM yyyy')}).`,
                    path: ['endDate'],
                });
            }
            if (data.endDate && projEnd && data.endDate > projEnd) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Sprint end date cannot be later than project end date (${format(parseISO(projEnd), 'dd MMM yyyy')}).`,
                    path: ['endDate'],
                });
            }
        });
    }, [projStart, projEnd, project]);

    const dynamicSubTaskSchema = useMemo(() => {
        return subTaskFormSchemaBase.superRefine((data, ctx) => {
            if (data.startDate && data.endDate && new Date(data.endDate) < new Date(data.startDate)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "End date must be on or after start date.",
                    path: ['endDate'],
                });
            }
            if (data.startDate && projStart && data.startDate < projStart) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Sub-task start date cannot be earlier than project start date (${format(parseISO(projStart), 'dd MMM yyyy')}).`,
                    path: ['startDate'],
                });
            }
            if (data.startDate && projEnd && data.startDate > projEnd) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Sub-task start date cannot be later than project end date (${format(parseISO(projEnd), 'dd MMM yyyy')}).`,
                    path: ['startDate'],
                });
            }
            if (data.endDate && projStart && data.endDate < projStart) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Sub-task end date cannot be earlier than project start date (${format(parseISO(projStart), 'dd MMM yyyy')}).`,
                    path: ['endDate'],
                });
            }
            if (data.endDate && projEnd && data.endDate > projEnd) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Sub-task end date cannot be later than project end date (${format(parseISO(projEnd), 'dd MMM yyyy')}).`,
                    path: ['endDate'],
                });
            }
        });
    }, [projStart, projEnd, project]);

    const sprintForm = useForm<z.infer<typeof sprintSchema>>({
        resolver: zodResolver(dynamicSprintSchema),
        defaultValues: {
            title: '',
            startDate: '',
            endDate: '',
            status: 'Yet to Start',
            releaseId: 'none',
        },
    });
    
    const editStoryForm = useForm<z.infer<typeof storyFormSchema>>({
        resolver: zodResolver(storyFormSchema),
    });

    const subTaskForm = useForm<z.infer<typeof subTaskFormSchemaBase>>({
        resolver: zodResolver(dynamicSubTaskSchema),
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

    const groomingWatchedImpactedSystemId = useWatch({ control: subTaskForm.control, name: 'impactedSystemId' });
    const groomingFilteredUsersForSubTasks = useMemo(() => {
        if (!groomingWatchedImpactedSystemId || groomingWatchedImpactedSystemId === 'unassigned') return employees;
        return employees.filter(emp => emp.capabilities?.includes(groomingWatchedImpactedSystemId));
    }, [employees, groomingWatchedImpactedSystemId]);

    const parentStories = useMemo(() => stories.filter(s => ['User Story', 'Requirement/Story'].includes(s.itemType)), [stories]);
    const parentStoryOptions = useMemo(() => parentStories.map(s => ({
        value: s.id,
        label: `[${s.storyId}] ${s.title}`
    })), [parentStories]);

    const testCaseOptions = useMemo(() => testCases.map(tc => ({
        value: tc.id,
        label: `[${tc.testCaseId}] ${tc.title}`,
    })), [testCases]);

    const relatedBugOptions = useMemo(() => stories.filter(s => isBugWorkItem(s.itemType)).map(b => ({
        value: b.id,
        label: `[${b.storyId}] ${b.title}`,
    })), [stories]);

    const predecessorOptions = useMemo(() => stories.filter(s => s.id !== selectedStory?.id && !isExecutionWorkItem(s.itemType)).map(s => ({
        value: s.id,
        label: `[${s.storyId}] ${s.title}`,
    })), [stories, selectedStory]);
    
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


    const watchedStartDate = useWatch({ control: sprintForm.control, name: "startDate" });

    React.useEffect(() => {
        if (isSprintDialogOpen) {
            if (editingSprint) {
                sprintForm.reset({
                    title: (editingSprint.title || '').slice(0, 60),
                    startDate: editingSprint.startDate ? format(parseISO(editingSprint.startDate), 'yyyy-MM-dd') : '',
                    endDate: editingSprint.endDate ? format(parseISO(editingSprint.endDate), 'yyyy-MM-dd') : '',
                    status: editingSprint.status || 'Yet to Start',
                    releaseId: editingSprint.releaseId || 'none',
                });
            } else {
                sprintForm.reset({
                    title: '',
                    startDate: '',
                    endDate: '',
                    status: 'Yet to Start',
                    releaseId: 'none',
                });
            }
        }
    }, [isSprintDialogOpen, editingSprint, sprintForm]);
    useEffect(() => {
        setSelectionStack(prev => {
            if (prev.length === 0) return prev;
            return prev.map(stackedStory => {
                const latest = stories.find(s => s.id === stackedStory.id);
                return latest || stackedStory;
            });
        });
    }, [stories]);

    useEffect(() => {
        setEditStoryActiveTab('details');
        if (!selectedStory) {
          setShowAddSubTask(false);
          subTaskForm.reset();
          return;
        }
        if (selectedStory.itemType === 'Sub Task' || selectedStory.itemType === 'Subtasks') {
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
            const isSubItem = isBugWorkItem(selectedStory.itemType) || selectedStory.itemType === 'Feature Change' || isExecutionWorkItem(selectedStory.itemType);
            const testCase = testCases.find(tc => tc.id === selectedStory.relatedTestCaseId);
            setTestCaseInputText(testCase ? `[${testCase.testCaseId}] ${testCase.title}` : '');
            const relBug = stories.find(b => b.id === selectedStory.relatedBugId);
            setRelatedBugInputText(relBug ? `[${relBug.storyId}] ${relBug.title}` : '');
            const predStory = stories.find(s => s.id === selectedStory.predecessorId);
            setEditPredecessorText(predStory ? `[${predStory.storyId}] ${predStory.title}` : '');

            editStoryForm.reset({
                title: (selectedStory.title || '').slice(0, 60),
                description: (selectedStory.description || '').slice(0, 300),
                acceptanceCriteria: selectedStory.acceptanceCriteria || '',
                epicId: selectedStory.epicId || 'unassigned',
                parentStoryId: isSubItem ? selectedStory.parentStoryId || undefined : undefined,
                reporterId: selectedStory.reporterId || 'unassigned',
                relatedTestCaseId: selectedStory.relatedTestCaseId || 'unassigned',
                assigneeId: selectedStory.assigneeId || 'unassigned',
                estimatedHours: selectedStory.estimatedHours,
                priority: selectedStory.priority || 'Medium',
                severity: (selectedStory.severity as any) || 'Medium',
                foundInTestPlanId: selectedStory.foundInTestPlanId || 'unassigned',
                relatedBugId: selectedStory.relatedBugId || 'unassigned',
                impactedSystemIds: selectedStory.impactedSystemIds || [],
                releaseId: selectedStory.releaseId || 'unassigned',
                attachments: selectedStory.attachments || '',
                status: selectedStory.status || 'To Do',
                resolution: selectedStory.resolution || 'none',
                sprintId: selectedStory.sprintId || 'backlog',
                predecessorId: selectedStory.predecessorId || 'unassigned',
                createdAt: selectedStory.createdAt ? parseISO(selectedStory.createdAt) : undefined,
                closedAt: selectedStory.closedAt ? parseISO(selectedStory.closedAt) : undefined,
            });
            if (isSubItem && selectedStory.parentStoryId) {
                const parent = parentStoryOptions.find(p => p.value === selectedStory.parentStoryId);
                setEditParentStoryText(parent?.label || '');
            } else {
                setEditParentStoryText('');
            }
        }
    }, [selectedStory, editStoryForm, subTaskForm, parentStoryOptions, testCases, stories]);

  const calculateBusinessDays = useCallback((start: Date, end: Date): number => {
      if(!start || !end) return 0;
      const holidayDates = holidays.map(h => parseISO(h.date));
      const interval = eachDayOfInterval({ start, end });
      
      return interval.filter(day => {
        const dayOfWeek = day.getDay();
        const isWeekend = weeklyOffDays.includes(dayOfWeek);
        const isHoliday = holidays.some(h => isSameDay(day, parseISO(h.date)));
        return !isWeekend && !isHoliday;
      }).length;
    }, [holidays, weeklyOffDays]);

  const actualEffortInHours = useMemo(() => {
    if (!selectedStory) return null;
    // For parent stories, actual effort is sum of sub-tasks' actual effort
    if (isPbiWorkItem(selectedStory.itemType) && !isBugWorkItem(selectedStory.itemType)) {
        const subTasks = stories.filter(s => s.parentStoryId === selectedStory.id && (s.itemType === 'Sub Task' || s.itemType === 'Subtasks'));
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

    React.useEffect(() => {
        if (watchedStartDate && projectSettings?.sprintDurationInWeeks) {
            const startDate = new Date(watchedStartDate);
            // Adjust for timezone offset to prevent off-by-one day errors
            const adjustedStartDate = new Date(startDate.valueOf() + startDate.getTimezoneOffset() * 60 * 1000);
            
            const newEndDate = new Date(adjustedStartDate);
            newEndDate.setDate(newEndDate.getDate() + projectSettings.sprintDurationInWeeks * 7 - 1);
            sprintForm.setValue("endDate", format(newEndDate, 'yyyy-MM-dd'));
        }
    }, [watchedStartDate, projectSettings?.sprintDurationInWeeks, sprintForm]);
    
    const nextSprintId = useMemo(() => generateNextSprintId(sprints), [sprints]);
    
    const handleSprintSubmit = async (values: z.infer<typeof sprintSchema>) => {
        const trimmedTitle = values.title.trim();
        const isDuplicate = sprints.some(s => 
            s.title.trim().toLowerCase() === trimmedTitle.toLowerCase() &&
            (!editingSprint || s.id !== editingSprint.id)
        );

        if (isDuplicate) {
            toast({
                variant: 'destructive',
                title: 'Duplicate Sprint Name',
                description: `A sprint named "${trimmedTitle}" already exists. Duplicate sprint names are not allowed.`
            });
            return;
        }

        if (values.startDate && projStart && values.startDate < projStart) {
            toast({
                variant: 'destructive',
                title: 'Invalid Start Date',
                description: `Sprint start date cannot be earlier than project start date (${format(parseISO(projStart), 'dd MMM yyyy')}).`
            });
            return;
        }
        if (values.endDate && projEnd && values.endDate > projEnd) {
            toast({
                variant: 'destructive',
                title: 'Invalid End Date',
                description: `Sprint end date cannot be later than project end date (${format(parseISO(projEnd), 'dd MMM yyyy')}).`
            });
            return;
        }

        const sprintId = editingSprint ? getSprintDisplayId(editingSprint) : nextSprintId;

        const payload = {
            sprintId,
            title: trimmedTitle,
            startDate: values.startDate ? new Date(values.startDate) : undefined,
            endDate: values.endDate ? new Date(values.endDate) : undefined,
            status: values.status as SprintStatus | undefined,
            releaseId: values.releaseId && values.releaseId !== 'none' ? values.releaseId : null,
        };
        const success = editingSprint
            ? await updateSprint(editingSprint.id, payload)
            : await addSprint(payload);

        if (success) {
            toast({ title: 'Success', description: `Sprint ${editingSprint ? 'updated' : 'created'}.` });
            setIsSprintDialogOpen(false);
            setEditingSprint(null);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: `Could not ${editingSprint ? 'update' : 'create'} sprint.` });
        }
    };
    
    const onEditStorySubmit = async (values: z.infer<typeof storyFormSchema>) => {
        if (!selectedStory) return;
        setIsEditStorySubmitting(true);
        const success = await updateStory(selectedStory.id, {
            ...values,
            priority: values.priority as Priority | undefined,
            assigneeId: values.assigneeId === 'unassigned' ? undefined : (values.assigneeId || undefined),
            relatedTestCaseId: values.relatedTestCaseId === 'unassigned' ? undefined : values.relatedTestCaseId,
        });
        if (success) {
            handleSetSelectedStory(null);
            toast({ title: 'Success', description: 'Story updated.' });
        } else {
            toast({ variant: "destructive", title: `Error Editing ${selectedStory.itemType}`, description: "Could not save your changes." });
        }
        setIsEditStorySubmitting(false);
    };

    const onEditSubTaskSubmit = async (values: z.infer<typeof subTaskFormSchemaBase>) => {
        if (!selectedStory || selectedStory.itemType !== 'Sub Task') return;
        setIsEditStorySubmitting(true);
        
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

    const handleAddSubTask = async (values: z.infer<typeof subTaskFormSchemaBase>) => {
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
    
    const nextSprint = () => {
        setVisibleSprintIndex((prevIndex) => (prevIndex + 1) % sprintsWithStories.length);
    };

    const prevSprint = () => {
        setVisibleSprintIndex((prevIndex) => (prevIndex - 1 + sprintsWithStories.length) % sprintsWithStories.length);
    };
    
    const selectedStorySubItems = useMemo(() => {
        if (!selectedStory) return { subTasks: [], bugs: [], logs: [] };
        const allSubItems = subItemsByParentId[selectedStory.id] || [];
        return {
          subTasks: allSubItems.filter(item => item.itemType === 'Sub Task' || item.itemType === 'Subtasks'),
          bugs: allSubItems.filter(item => isBugWorkItem(item.itemType)),
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

    const sortedEnvironments = useMemo(() => [...environments].sort((a,b) => a.order - b.order), [environments]);


    return (
        <>
            <div className="flex-1 flex flex-col space-y-4 p-4 md:p-8 pt-6 h-full">
                <PageHeader
                    title="Grooming Board"
                    description="Plan your sprints by organizing the backlog."
                >
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="grid gap-1.5">
                            <Label htmlFor="view-by-filter" className="text-xs font-medium text-muted-foreground">View</Label>
                            <Select value={viewBy} onValueChange={(v) => setViewBy(v as any)}>
                                <SelectTrigger id="view-by-filter" className="w-[180px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="story">Stories</SelectItem>
                                    <SelectItem value="sub-task">Sub-tasks</SelectItem>
                                    <SelectItem value="bug">Defects</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="assignee-filter" className="text-xs font-medium text-muted-foreground">Assignee</Label>
                            <Select value={selectedAssigneeId} onValueChange={setSelectedAssigneeId}>
                                <SelectTrigger id="assignee-filter" className="w-[200px]">
                                    <SelectValue placeholder="Filter by assignee" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Assignees</SelectItem>
                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                    {[...employees].filter(user => !user.isDeleted && user.isEnabled !== false && !!user.empId && user.empId.trim() !== '').sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, undefined, { numeric: true, sensitivity: 'base' })).map(user => (
                                    <SelectItem key={user.id} value={user.id}>
                                        {user.firstName} {user.lastName} ({user.empId.trim()})
                                    </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={() => { setEditingSprint(null); setIsSprintDialogOpen(true); }}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create Sprint
                        </Button>
                    </div>
                </PageHeader>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">
                    {/* Backlog Column */}
                    <div className="bg-muted/50 rounded-lg p-4 h-full flex flex-col">
                        <h3 className="text-lg font-semibold mb-4">Backlog</h3>
                        <div className="flex-1 space-y-4 overflow-y-auto">
                            {backlogItems.map(story => {
                                const epic = epics.find(e => e.id === story.epicId);
                                const assignee = employees.find(e => e.id === story.assigneeId);
                                const subItems = subItemsByParentId[story.id] || [];
                                const parentStory = story.parentStoryId ? stories.find(s => s.id === story.parentStoryId) : undefined;
                                return (
                                    <div key={story.id}>
                                        <StoryItemCard 
                                            story={story} 
                                            epic={epic}
                                            assignee={assignee}
                                            subItems={subItems}
                                            parentStory={parentStory}
                                            onMove={moveStoryToSprint}
                                            onEdit={() => handleSetSelectedStory(story)}
                                            onDelete={() => setStoryToDelete(story)}
                                            onSubItemClick={handleDrillDown}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Sprint Column */}
                    <div className="h-full flex flex-col">
                    {sprintsWithStories.length > 0 && sprintsWithStories[visibleSprintIndex] ? (
                        <SprintColumn 
                            key={sprintsWithStories[visibleSprintIndex].id} 
                            sprint={sprintsWithStories[visibleSprintIndex]} 
                            holidays={holidays}
                            weeklyOffDays={weeklyOffDays}
                            onEdit={(sprint) => { setEditingSprint(sprint); setIsSprintDialogOpen(true); }}
                            onDelete={(sprint) => setDeletingSprint(sprint)}
                            onPrev={prevSprint}
                            onNext={nextSprint}
                            showNav={sprintsWithStories.length > 1}
                            onMoveStory={moveStoryToSprint}
                            onEditStory={(story) => handleSetSelectedStory(story)}
                            onDeleteStory={(story) => setStoryToDelete(story)}
                            viewBy={viewBy}
                        />
                    ) : (
                        <div className="bg-muted/50 rounded-lg p-4 h-full flex flex-col items-center justify-center">
                            <p className="text-lg text-muted-foreground">
                                {sprints.length === 0 ? 'No sprints yet. Click "Create Sprint" to get started.' : 'No sprints found matching the current filters.'}
                            </p>
                        </div>
                    )}
                    </div>
                </div>
            </div>

        <Dialog open={isSprintDialogOpen} onOpenChange={(isOpen) => { if(!isOpen) setEditingSprint(null); setIsSprintDialogOpen(isOpen); }}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] p-0 flex flex-col overflow-hidden" bypassScrollWrapper={true}>
                <DialogHeader className="px-6 py-4 border-b shrink-0">
                    <DialogTitle>{editingSprint ? 'Edit Sprint' : 'Create New Sprint'}</DialogTitle>
                </DialogHeader>
                <Form {...sprintForm}>
                    <form onSubmit={sprintForm.handleSubmit(handleSprintSubmit)} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
                        <div className="space-y-2">
                            <Label htmlFor="sprint-id-display">Sprint ID</Label>
                            <Input
                                id="sprint-id-display"
                                value={editingSprint ? getSprintDisplayId(editingSprint) : nextSprintId}
                                readOnly
                                disabled
                                className="bg-muted text-muted-foreground font-mono cursor-not-allowed"
                            />
                        </div>
                        <FormField
                            control={sprintForm.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sprint Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="E.g., Sprint 1" {...field} maxLength={60} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={sprintForm.control}
                                name="startDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Start Date</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="date"
                                                {...field}
                                                value={field.value ?? ''}
                                                min={projStart || undefined}
                                                max={sprintForm.watch('endDate') || projEnd || undefined}
                                            />
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
                                            <Input
                                                type="date"
                                                {...field}
                                                value={field.value ?? ''}
                                                min={sprintForm.watch('startDate') || projStart || undefined}
                                                max={projEnd || undefined}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        {project?.startDate && (
                            <p className="text-[11px] text-muted-foreground -mt-2">
                                Project timeline: {format(parseISO(project.startDate), 'dd MMM yyyy')}{project.endDate ? ` — ${format(parseISO(project.endDate), 'dd MMM yyyy')}` : ''}
                            </p>
                        )}
                         <FormField
                            control={sprintForm.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a status" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                    {sprintStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={sprintForm.control}
                            name="releaseId"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Aligned Release (Optional)</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || 'none'}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a release" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                    <SelectItem value="none">None (Unassigned)</SelectItem>
                                    {releases.map(r => (
                                        <SelectItem key={r.id} value={r.id}>
                                            [{r.releaseId}] {r.name}
                                        </SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        </div>
                        <DialogFooter className="px-6 py-4 border-t bg-background shrink-0">
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

        <AlertDialog open={!!storyToDelete} onOpenChange={(isOpen) => !isOpen && setStoryToDelete(null)}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Delete {storyToDelete ? formatWorkItemType(storyToDelete.itemType) : 'Item'}?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                    <div className="space-y-3 text-sm text-muted-foreground">
                        <p>
                            Are you sure you want to delete <strong>&quot;{storyToDelete?.title}&quot;</strong>?
                        </p>
                        {(storyToDeleteCascadeInfo.subTasksCount > 0 || storyToDeleteCascadeInfo.defectsCount > 0 || storyToDeleteCascadeInfo.testCasesCount > 0) ? (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 text-destructive dark:text-red-400 space-y-1">
                                <p className="font-semibold text-xs uppercase tracking-wide">
                                    Full Cascade Delete: All related items will also be moved to trash:
                                </p>
                                <ul className="list-disc list-inside text-xs space-y-0.5 ml-1">
                                    {storyToDeleteCascadeInfo.subTasksCount > 0 && (
                                        <li>{storyToDeleteCascadeInfo.subTasksCount} related subtask(s)</li>
                                    )}
                                    {storyToDeleteCascadeInfo.defectsCount > 0 && (
                                        <li>{storyToDeleteCascadeInfo.defectsCount} related defect(s)</li>
                                    )}
                                    {storyToDeleteCascadeInfo.testCasesCount > 0 && (
                                        <li>{storyToDeleteCascadeInfo.testCasesCount} related test case(s)</li>
                                    )}
                                </ul>
                            </div>
                        ) : (
                            <p className="text-xs">It will be moved to the trash and can be restored later.</p>
                        )}
                    </div>
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                onClick={() => {
                    if (storyToDelete) {
                        deleteStory(storyToDelete.id).then(success => {
                            if (success) {
                                toast({ title: "Deleted", description: `"${storyToDelete.title}" moved to trash.` });
                            } else {
                                toast({ variant: "destructive", title: "Error", description: "Could not delete story." });
                            }
                        });
                        setStoryToDelete(null);
                    }
                }}
                className={cn(buttonVariants({ variant: 'destructive' }))}
                >
                Delete
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Dialog open={!!selectedStory} onOpenChange={(isOpen) => !isOpen && handleSetSelectedStory(null)}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col overflow-hidden" bypassScrollWrapper={true}>
            {selectedStory && (
                <>
                {selectedStory.itemType === 'Sub Task' || selectedStory.itemType === 'Subtasks' ? (
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
                                <TabsTrigger variant="folder" value="logs">Logs</TabsTrigger>
                            </TabsList>
                            <TabsContent value="details" className="pt-4 focus-visible:outline-none">
                                <div className="space-y-4">
                                    <FormField control={subTaskForm.control} name="description" render={({field}) => (
                                        <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Describe sub-task..." {...field} maxLength={300} /></FormControl><FormMessage/></FormItem>
                                    )}/>
                                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
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
                                                {groomingFilteredUsersForSubTasks.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}
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
                                            <span>{actualEffortInHours.toFixed(2)} hours</span>
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                    <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (selectedStory) {
                            deleteStory(selectedStory.id).then(success => {
                              if (!success) toast({ variant: "destructive", title: "Error", description: "Could not delete sub-task." });
                              else toast({ title: "Deleted", description: "Sub-task moved to trash." });
                            });
                            handleSetSelectedStory(null);
                          }
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Sub Task
                      </Button>
                      <Button type="submit" disabled={isEditStorySubmitting}>
                        {isEditStorySubmitting ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              ) : isBugWorkItem(selectedStory.itemType) ? (
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
                                  {[...employees].filter(emp => !emp.isDeleted && emp.isEnabled !== false && !!emp.empId && emp.empId.trim() !== '').sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, undefined, { numeric: true, sensitivity: 'base' })).map(emp => (
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
                                  {[...employees].filter(emp => !emp.isDeleted && emp.isEnabled !== false && !!emp.empId && emp.empId.trim() !== '').sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, undefined, { numeric: true, sensitivity: 'base' })).map(emp => (
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
                                    list="parent-story-options-defect-edit-grooming"
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
                              <datalist id="parent-story-options-defect-edit-grooming">
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
                                    list="testcase-options-defect-edit-grooming"
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
                              <datalist id="testcase-options-defect-edit-grooming">
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
                                    list="bug-options-defect-edit-grooming"
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
                              <datalist id="bug-options-defect-edit-grooming">
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
                    <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (selectedStory) {
                            deleteStory(selectedStory.id).then(success => {
                              if (!success) toast({ variant: "destructive", title: "Error", description: "Could not delete defect." });
                              else toast({ title: "Deleted", description: "Defect moved to trash." });
                            });
                            handleSetSelectedStory(null);
                          }
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Defect
                      </Button>
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
                     <Tabs value={editStoryActiveTab} onValueChange={setEditStoryActiveTab} className="w-full">
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
                            {isPbiWorkItem(selectedStory.itemType) && !isBugWorkItem(selectedStory.itemType) && (
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
                            <AiSubtaskTestCaseButton
                              storyId={selectedStory.id}
                              itemType={selectedStory.itemType}
                              title={editStoryForm.watch('title') || selectedStory.title}
                              description={editStoryForm.watch('description')}
                              acceptanceCriteria={editStoryForm.watch('acceptanceCriteria')}
                              impactedSystemIds={editStoryForm.watch('impactedSystemIds') || []}
                              sprintId={editStoryForm.watch('sprintId')}
                              releaseId={editStoryForm.watch('releaseId')}
                              onSuccess={() => setEditStoryActiveTab('subTasks')}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {isPbiWorkItem(selectedStory.itemType) ? (
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
                            {['Feature Change', 'Bug'].includes(selectedStory.itemType) ? (
                              <FormField
                                control={editStoryForm.control}
                                name="parentStoryId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>{selectedStory.itemType === 'Feature Change' ? 'Original Requirement' : 'Related Story'}</FormLabel>
                                    <FormControl>
                                      <Input
                                        list="parent-story-options-edit"
                                        placeholder="Link to a story or feature change"
                                        value={editParentStoryText}
                                        onChange={(e) => {
                                          const text = e.target.value;
                                          setEditParentStoryText(text);
                                          const matchingOption = parentStoryOptions.find(
                                            (opt) => opt.label === text
                                          );
                                          field.onChange(
                                            matchingOption ? matchingOption.value : undefined
                                          );
                                        }}
                                        onBlur={() => {
                                          const matchingOption = parentStoryOptions.find(
                                            (opt) => opt.label === editParentStoryText
                                          );
                                          if (!matchingOption) {
                                            setEditParentStoryText('');
                                            field.onChange(undefined);
                                          }
                                        }}
                                      />
                                    </FormControl>
                                    <datalist id="parent-story-options-edit">
                                      {parentStoryOptions.map((opt) => (
                                        <option key={opt.value} value={opt.label} />
                                      ))}
                                    </datalist>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            ) : null}
                            {isBugWorkItem(selectedStory.itemType) && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                  control={editStoryForm.control}
                                  name="relatedTestCaseId"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Related Test Case</FormLabel>
                                      <FormControl>
                                        <Input
                                          list="testcase-options-grooming"
                                          placeholder="Link to a test case"
                                          value={testCaseInputText}
                                          onChange={(e) => {
                                            const text = e.target.value;
                                            setTestCaseInputText(text);
                                            const matchingOption = testCaseOptions.find(
                                              (opt) => opt.label === text
                                            );
                                            field.onChange(
                                              matchingOption ? matchingOption.value : undefined
                                            );
                                          }}
                                          onBlur={() => {
                                            const matchingOption = testCaseOptions.find(
                                              (opt) => opt.label === testCaseInputText
                                            );
                                            if (!matchingOption) {
                                              setTestCaseInputText('');
                                              field.onChange(undefined);
                                            }
                                          }}
                                        />
                                      </FormControl>
                                      <datalist id="testcase-options-grooming">
                                        {testCaseOptions
                                          .filter(opt => matchSearchQuery(opt.label, testCaseInputText))
                                          .map((opt) => (
                                            <option key={opt.value} value={opt.label} />
                                          ))}
                                      </datalist>
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
                                            list="bug-options-grooming"
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
                                      <datalist id="bug-options-grooming">
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
                            )}
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
                                {showAddSubTask ? (
                                    <div className='border p-4 mt-2 rounded-md'>
                                        <Form {...subTaskForm}>
                                            <div className='space-y-4'>
                                                <FormField control={subTaskForm.control} name="title" render={({field}) => (
                                                    <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Sub-task title" {...field} maxLength={60} /></FormControl><FormMessage/></FormItem>
                                                )}/>
                                                <FormField control={subTaskForm.control} name="description" render={({field}) => (
                                                    <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Describe sub-task..." {...field} maxLength={300} /></FormControl><FormMessage/></FormItem>
                                                )}/>
                                                 <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
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
                                                            {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}
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
                                                 <FormControl>
                                                     <Input
                                                         type="date"
                                                         {...field}
                                                         value={field.value || ''}
                                                         min={projStart || undefined}
                                                         max={subTaskForm.watch('endDate') || projEnd || undefined}
                                                     />
                                                 </FormControl>
                                                 <FormMessage />
                                             </FormItem>
                                         )} />
                                         <FormField control={subTaskForm.control} name="endDate" render={({ field }) => (
                                             <FormItem>
                                                 <FormLabel>End Date</FormLabel>
                                                 <FormControl>
                                                     <Input
                                                         type="date"
                                                         {...field}
                                                         value={field.value || ''}
                                                         min={subTaskForm.watch('startDate') || projStart || undefined}
                                                         max={projEnd || undefined}
                                                     />
                                                 </FormControl>
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
                    <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (selectedStory) {
                            deleteStory(selectedStory.id).then(success => {
                              if (!success) toast({ variant: "destructive", title: "Error", description: "Could not delete story." });
                            });
                            handleSetSelectedStory(null);
                          }
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete {formatWorkItemType(selectedStory.itemType)}
                      </Button>
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
      <DialogContent className="sm:max-w-xl max-h-[90vh] p-0 flex flex-col overflow-hidden" bypassScrollWrapper={true}>
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>Edit Test Case: {testCase.testCaseId}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
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
          </div>
          <DialogFooter className="px-6 py-4 border-t bg-background shrink-0 flex flex-row justify-between items-center w-full">
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

