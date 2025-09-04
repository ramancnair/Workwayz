

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
import { PlusCircle, Edit, Trash2, Star, ChevronLeft, ChevronRight, ChevronDown, BookOpen, Bug, CheckSquare, GitCommit, Clock, CornerDownRight, Flag, ArrowLeft, Package, ClipboardList, Circle, CheckCircle } from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { useToast } from '@/hooks/use-toast';
import { type Sprint, type Story, type Epic, type WorkItemType, User, ImpactedSystem, Holiday, Release, Priority, StoryStatus } from '@/types';
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
import { format, parseISO, eachDayOfInterval, isSameDay } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';

const sprintSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const workItemIcons: Record<WorkItemType, React.ElementType> = {
  'Requirement/Story': BookOpen,
  Bug: Bug,
  'Task': CheckSquare,
  'Feature Change': GitCommit,
  'Sub Task': CheckSquare,
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
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
  epicId: z.string().optional(),
  parentStoryId: z.string().optional(),
  assigneeId: z.string().optional(),
  estimatedHours: z.coerce.number().optional(),
  priority: z.enum(priorities).optional(),
  environmentId: z.string().optional(),
  impactedSystemIds: z.array(z.string()).optional(),
  releaseId: z.string().optional(),
  attachments: z.string().optional(),
  sprintId: z.string().optional(),
});

const subTaskFormSchema = z.object({
    title: z.string().min(1, 'Title is required.'),
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


function StoryItemCard({ 
    story, 
    epic,
    assignee,
    subItems,
    parentStory,
    onMove, 
    onEdit,
    onSubItemClick,
}: { 
    story: Story, 
    epic?: Epic, 
    assignee?: User,
    subItems?: Story[],
    parentStory?: Story,
    onMove: (sprintId: string | null) => void,
    onEdit: () => void;
    onSubItemClick: (story: Story) => void;
}) {
  const { sprints, impactedSystems } = useProject();
  const Icon = workItemIcons[story.itemType];
  const subTasks = subItems?.filter(i => i.itemType === 'Sub Task') || [];
  const bugs = subItems?.filter(i => i.itemType === 'Bug') || [];
  
  const isReadyForDev = useMemo(() => {
    if (!story.estimatedHours || story.estimatedHours <= 0) return false;
    if (!story.impactedSystemIds || story.impactedSystemIds.length === 0) return true; // No systems, so ready
    
    const subTaskSystemIds = new Set(subTasks.map(st => st.impactedSystemId).filter(Boolean));
    return story.impactedSystemIds.every(id => subTaskSystemIds.has(id));
  }, [story.estimatedHours, story.impactedSystemIds, subTasks]);

  const sortedSprints = useMemo(() => {
    return [...sprints].sort((a, b) => {
        if (a.isCurrent) return -1;
        if (b.isCurrent) return 1;
        return (a.title || '').localeCompare(b.title || '');
    });
  }, [sprints]);

  return (
    <Collapsible>
      <Card className="bg-card">
         <div className="p-4">
            <div className="flex justify-between items-start">
                <div className="flex-1 pr-2 text-left space-y-1">
                    <div className="flex items-center gap-2">
                        <CollapsibleTrigger asChild>
                          <button>
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </CollapsibleTrigger>
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
              {sortedSprints
                .filter((sprint) => sprint.id !== story.sprintId)
                .map((sprint) => (
                  <DropdownMenuItem key={sprint.id} onClick={() => onMove(sprint.id)}>
                    {sprint.title} {sprint.isCurrent && "(current)"}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardFooter>
        <CollapsibleContent>
            <div className="px-6 pb-4 space-y-2">
                {(subTasks.length > 0 || bugs.length > 0) && <Separator />}
                {subItems?.map(item => {
                    const ItemIcon = workItemIcons[item.itemType];
                    const system = impactedSystems.find(s => s.id === item.impactedSystemId);
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
                            <Badge variant="outline" className="w-24 justify-center truncate">{system?.name || 'N/A'}</Badge>
                            <span className="w-16 text-center text-muted-foreground">{item.estimatedHours || 0}h</span>
                            <Badge variant="outline" className="w-20 justify-center">{item.status}</Badge>
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
  stories: displayedStories,
  holidays,
  weeklyOffDays,
  onEdit,
  onDelete,
  onSetCurrent,
  onPrev,
  onNext,
  showNav,
  onMoveStory,
  onEditStory,
  selectedAssigneeId
}: { 
  sprint: Sprint, 
  stories: Story[],
  holidays: Holiday[],
  weeklyOffDays: number[],
  onEdit: (sprint: Sprint) => void,
  onDelete: (sprint: Sprint) => void,
  onSetCurrent: (sprintId: string) => void,
  onPrev: () => void,
  onNext: () => void,
  showNav: boolean,
  onMoveStory: (storyId: string, sprintId: string | null) => void;
  onEditStory: (story: Story) => void;
  selectedAssigneeId: string;
}) {
    const { epics, employees, stories: allStories, impactedSystems } = useProject();
    
    const subItemsByStoryId = useMemo(() => allStories.reduce((acc, story) => {
      if (['Bug', 'Sub Task'].includes(story.itemType) && story.parentStoryId) {
          if (!acc[story.parentStoryId]) {
              acc[story.parentStoryId] = [];
          }
          acc[story.parentStoryId].push(story);
      }
      return acc;
    }, {} as Record<string, Story[]>), [allStories]);
    
    const capacityBySystem = useMemo(() => {
        if (!sprint.startDate || !sprint.endDate) return [];

        const start = parseISO(sprint.startDate);
        const end = parseISO(sprint.endDate);
        const holidayDates = holidays.map(h => parseISO(h.date));

        const workingDays = eachDayOfInterval({ start, end }).filter(day => {
            const dayOfWeek = day.getDay();
            const isWeekend = weeklyOffDays.includes(dayOfWeek);
            const isHoliday = holidayDates.some(h => isSameDay(day, h));
            return !isWeekend && !isHoliday;
        }).length;
        
        const allSubTasksInSprint = allStories.filter(story => 
            story.itemType === 'Sub Task' && story.sprintId === sprint.id
        );
        
        const relevantEmployees = selectedAssigneeId === 'all' 
            ? employees 
            : employees.filter(e => e.id === selectedAssigneeId);

        return impactedSystems.map(system => {
            const resourcesForSystem = relevantEmployees.filter(emp => emp.capabilities?.includes(system.id));
            
            let totalCapacityHours = 0;
            resourcesForSystem.forEach(emp => {
                const availabilityFactor = (emp.availability || 100) / 100;
                totalCapacityHours += workingDays * 8 * availabilityFactor;
            });

            const utilizedHours = allSubTasksInSprint
                .filter(task => {
                    const isCorrectSystem = task.impactedSystemId === system.id;
                    const isCorrectAssignee = selectedAssigneeId === 'all' || task.assigneeId === selectedAssigneeId;
                    return isCorrectSystem && isCorrectAssignee;
                })
                .reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
            
            const utilization = totalCapacityHours > 0 ? (utilizedHours / totalCapacityHours) * 100 : 0;

            return {
                systemId: system.id,
                systemName: system.name,
                totalCapacity: totalCapacityHours,
                utilized: utilizedHours,
                remaining: totalCapacityHours - utilizedHours,
                utilization: utilization
            }
        }).filter(sys => sys.totalCapacity > 0 || sys.utilized > 0);
    }, [sprint, allStories, impactedSystems, employees, holidays, weeklyOffDays, selectedAssigneeId]);

    const totalSprintUtilized = capacityBySystem.reduce((sum, sys) => sum + sys.utilized, 0);

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
            <div className="text-xs text-muted-foreground mb-2 pl-1">
                {(sprint.startDate && sprint.endDate) && (
                    <div>{format(parseISO(sprint.startDate), 'MMM d')} - {format(parseISO(sprint.endDate), 'MMM d, yyyy')}</div>
                )}
            </div>

            <div className="space-y-3 mb-4">
              <div className="text-sm font-semibold text-muted-foreground">Capacity</div>
              {capacityBySystem.map(sys => (
                   <div key={sys.systemId} className="grid grid-cols-[1fr_140px] items-center gap-4 text-xs">
                       <div className="font-semibold">{sys.systemName}</div>
                       <div className="flex items-center gap-2">
                            <Progress value={sys.utilization} className="h-2" />
                            <span className={cn("w-24 text-right", sys.remaining < 0 && "text-red-500")}>
                              {sys.utilized.toFixed(0)}/{sys.totalCapacity.toFixed(0)}h
                            </span>
                       </div>
                   </div>
              ))}
            </div>


            <div className="flex-1 space-y-4 overflow-y-auto">
                {displayedStories.map(story => {
                     const epic = epics.find(e => e.id === story.epicId);
                     const assignee = employees.find(e => e.id === story.assigneeId);
                     const subItems = subItemsByStoryId[story.id] || [];
                     const parentStory = story.parentStoryId ? allStories.find(s => s.id === story.parentStoryId) : undefined;
                     return (
                        <div key={story.id}>
                            <StoryItemCard 
                                story={story} 
                                epic={epic}
                                assignee={assignee}
                                subItems={subItems}
                                parentStory={parentStory}
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
        holidays,
        weeklyOffDays,
        releasesAndMilestones,
    } = useProject();
    const { toast } = useToast();
    
    const [isSprintDialogOpen, setIsSprintDialogOpen] = useState(false);
    const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
    const [deletingSprint, setDeletingSprint] = useState<Sprint | null>(null);
    const [selectionStack, setSelectionStack] = useState<Story[]>([]);
    const selectedStory = selectionStack[selectionStack.length - 1] || null;
    const [visibleSprintIndex, setVisibleSprintIndex] = useState<number | null>(null);
    const [isEditStorySubmitting, setIsEditStorySubmitting] = useState(false);
    const [showAddSubTask, setShowAddSubTask] = useState(false);
    const [viewBy, setViewBy] = useState<'story' | 'sub-task'>('story');
    const [selectedAssigneeId, setSelectedAssigneeId] = useState('all');
    const [editParentStoryText, setEditParentStoryText] = useState('');
    
    const releases = releasesAndMilestones.filter(r => r.itemType === 'Release');

    const backlogItems = useMemo(() => {
      const baseItems = stories.filter(story => !story.sprintId);
      
      const filteredByView = baseItems.filter(story => {
        if (viewBy === 'story') {
          return ['Requirement/Story', 'Task', 'Feature Change'].includes(story.itemType);
        }
        return story.itemType === 'Sub Task';
      });

      if (selectedAssigneeId === 'all') return filteredByView;
      return filteredByView.filter(story => story.assigneeId === selectedAssigneeId);

    }, [stories, viewBy, selectedAssigneeId]);
    
     const subItemsByParentId = useMemo(() => stories.reduce((acc, story) => {
        if (['Bug', 'Sub Task'].includes(story.itemType) && story.parentStoryId) {
            if (!acc[story.parentStoryId]) {
                acc[story.parentStoryId] = [];
            }
            acc[story.parentStoryId].push(story);
        }
        return acc;
      }, {} as Record<string, Story[]>), [stories]);

    const sprintsWithStories = useMemo(() => {
        return sprints.map(sprint => {
            const baseItems = stories.filter(story => story.sprintId === sprint.id);
            const filteredByView = baseItems.filter(story => {
                if (viewBy === 'story') {
                    return ['Requirement/Story', 'Task', 'Feature Change'].includes(story.itemType);
                }
                return story.itemType === 'Sub Task';
            });

            const filteredByAssignee = selectedAssigneeId === 'all'
                ? filteredByView
                : filteredByView.filter(story => story.assigneeId === selectedAssigneeId);
            
            return {
                ...sprint,
                stories: filteredByAssignee,
            }
        }).sort((a,b) => new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime());
    }, [sprints, stories, viewBy, selectedAssigneeId]);
    
    useEffect(() => {
      if (visibleSprintIndex === null) {
        const currentSprintIdx = sprints.findIndex(s => s.isCurrent);
        if (currentSprintIdx !== -1) {
            setVisibleSprintIndex(currentSprintIdx);
        } else if (sprints.length > 0) {
            setVisibleSprintIndex(0);
        }
      }
    }, [sprints, visibleSprintIndex]);

    const sprintForm = useForm<z.infer<typeof sprintSchema>>({
        resolver: zodResolver(sprintSchema),
        defaultValues: {
            title: '',
            startDate: '',
            endDate: '',
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
          status: 'To Do',
          startDate: '',
          endDate: '',
          sprintId: 'backlog',
          releaseId: 'unassigned',
        }
    });

    const watchedImpactedSystem = useWatch({ control: subTaskForm.control, name: 'impactedSystemId' });
  
    const filteredAssignees = useMemo(() => {
        if (!watchedImpactedSystem || watchedImpactedSystem === 'unassigned') {
            return employees;
        }
        const system = impactedSystems.find(s => s.id === watchedImpactedSystem);
        if (!system) return employees;
        return employees.filter(user => 
            user.role === 'Lead' || 
            user.capabilities?.includes(system.id)
        );
    }, [watchedImpactedSystem, employees, impactedSystems]);

    const parentStories = useMemo(() => stories.filter(s => ['Requirement/Story'].includes(s.itemType)), [stories]);
    const parentStoryOptions = useMemo(() => parentStories.map(s => ({
        value: s.id,
        label: `[${s.storyId}] ${s.title}`
    })), [parentStories]);
    
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
                    title: editingSprint.title,
                    startDate: editingSprint.startDate ? format(parseISO(editingSprint.startDate), 'yyyy-MM-dd') : '',
                    endDate: editingSprint.endDate ? format(parseISO(editingSprint.endDate), 'yyyy-MM-dd') : '',
                });
            } else {
                sprintForm.reset({
                    title: '',
                    startDate: '',
                    endDate: '',
                });
            }
        }
    }, [isSprintDialogOpen, editingSprint, sprintForm]);
    
    useEffect(() => {
        if (!selectedStory) {
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
                title: selectedStory.title,
                description: selectedStory.description || '',
                acceptanceCriteria: selectedStory.acceptanceCriteria || '',
                epicId: !isSubItem ? selectedStory.epicId || 'unassigned' : undefined,
                parentStoryId: isSubItem ? selectedStory.parentStoryId || undefined : undefined,
                assigneeId: selectedStory.assigneeId || 'unassigned',
                estimatedHours: selectedStory.estimatedHours,
                priority: selectedStory.priority || 'Medium',
                environmentId: selectedStory.environmentId || 'unassigned',
                impactedSystemIds: selectedStory.impactedSystemIds || [],
                releaseId: selectedStory.releaseId || 'unassigned',
                attachments: selectedStory.attachments || '',
                sprintId: selectedStory.sprintId || 'backlog',
            });
            if (isSubItem && selectedStory.parentStoryId) {
                const parent = parentStoryOptions.find(p => p.value === selectedStory.parentStoryId);
                setEditParentStoryText(parent?.label || '');
            } else {
                setEditParentStoryText('');
            }
        }
    }, [selectedStory, editStoryForm, subTaskForm, parentStoryOptions]);

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
    
    const handleSprintSubmit = async (values: z.infer<typeof sprintSchema>) => {
        const payload = {
            title: values.title,
            startDate: values.startDate ? new Date(values.startDate) : undefined,
            endDate: values.endDate ? new Date(values.endDate) : undefined
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
        
        const isSubItem = ['Bug', 'Feature Change'].includes(selectedStory.itemType);

        const success = await updateStory(selectedStory.id, {
            title: values.title,
            description: values.description,
            acceptanceCriteria: values.acceptanceCriteria,
            assigneeId: values.assigneeId === 'unassigned' ? undefined : values.assigneeId,
            epicId: !isSubItem ? (values.epicId === 'unassigned' ? undefined : values.epicId) : undefined,
            parentStoryId: isSubItem ? (values.parentStoryId || undefined) : undefined,
            estimatedHours: values.estimatedHours,
            priority: values.priority,
            environmentId: values.environmentId === 'unassigned' ? undefined : values.environmentId,
            impactedSystemIds: values.impactedSystemIds,
            releaseId: values.releaseId === 'unassigned' ? undefined : values.releaseId,
            attachments: values.attachments,
            sprintId: values.sprintId === 'backlog' ? null : values.sprintId,
        });

        if (success) {
          handleSetSelectedStory(null);
          toast({ title: 'Success', description: 'Story updated.' });
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
        if (visibleSprintIndex === null) return;
        setVisibleSprintIndex((prevIndex) => (prevIndex! + 1) % sprints.length);
    };

    const prevSprint = () => {
        if (visibleSprintIndex === null) return;
        setVisibleSprintIndex((prevIndex) => (prevIndex! - 1 + sprints.length) % sprints.length);
    };
    
    const selectedStorySubItems = useMemo(() => {
        if (!selectedStory) return { subTasks: [], bugs: [], logs: [] };
        const allSubItems = subItemsByParentId[selectedStory.id] || [];
        return {
          subTasks: allSubItems.filter(item => item.itemType === 'Sub Task'),
          bugs: allSubItems.filter(item => item.itemType === 'Bug'),
          logs: selectedStory.statusHistory?.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()) || [],
        };
    }, [selectedStory, subItemsByParentId]);

    const sortedEnvironments = useMemo(() => [...environments].sort((a,b) => a.order - b.order), [environments]);


    return (
        <>
            <div className="flex-1 flex flex-col space-y-4 p-4 md:p-8 pt-6 h-full">
                <PageHeader
                    title="Grooming Board"
                    description="Plan your sprints by organizing the backlog."
                >
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
                                {employees.map(user => (
                                <SelectItem key={user.id} value={user.id}>
                                    {user.firstName} {user.lastName}
                                </SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <Button onClick={() => { setEditingSprint(null); setIsSprintDialogOpen(true); }}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create Sprint
                    </Button>
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
                                            onMove={(newSprintId) => moveStoryToSprint(story.id, newSprintId)}
                                            onEdit={() => handleSetSelectedStory(story)}
                                            onSubItemClick={handleDrillDown}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Sprint Column */}
                    <div className="h-full flex flex-col">
                    {sprintsWithStories.length > 0 && visibleSprintIndex !== null ? (
                        <SprintColumn 
                            key={sprintsWithStories[visibleSprintIndex].id} 
                            sprint={sprintsWithStories[visibleSprintIndex]} 
                            stories={sprintsWithStories[visibleSprintIndex].stories} 
                            holidays={holidays}
                            weeklyOffDays={weeklyOffDays}
                            onEdit={(sprint) => { setEditingSprint(sprint); setIsSprintDialogOpen(true); }}
                            onDelete={(sprint) => setDeletingSprint(sprint)}
                            onSetCurrent={handleSetCurrentSprint}
                            onPrev={prevSprint}
                            onNext={nextSprint}
                            showNav={sprintsWithStories.length > 1}
                            onMoveStory={moveStoryToSprint}
                            onEditStory={(story) => handleSetSelectedStory(story)}
                            selectedAssigneeId={selectedAssigneeId}
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
                                        <Input type="date" {...field} value={field.value ?? ''} />
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
                                        <Input type="date" {...field} value={field.value ?? ''} />
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
                            <TabsTrigger value="logs">
                                Logs
                                <Badge variant="secondary" className="ml-2">
                                    {selectedStorySubItems.logs.length}
                                </Badge>
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="details" className="pt-4">
                        <div className="space-y-4">
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
                                    <FormLabel>Parent Item</FormLabel>
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
                                        <FormLabel>Estimated Hours</FormLabel>
                                        <FormControl>
                                        <Input type="number" placeholder="0" {...field} value={field.value ?? ''} />
                                        </FormControl>
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
                                        const system = impactedSystems.find(s => s.id === item.impactedSystemId);
                                        return (
                                            <div key={item.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-x-2 text-sm p-2 hover:bg-muted/50 rounded-md">
                                                <ItemIcon className="h-4 w-4 text-muted-foreground" />
                                                <span 
                                                  className="font-medium cursor-pointer hover:underline truncate" 
                                                  onClick={() => handleDrillDown(item)}
                                                >
                                                  [{item.storyId}] {item.title}
                                                </span>
                                                <Badge variant="outline" className="w-24 justify-center truncate">{system?.name || 'N/A'}</Badge>
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
              )}
            </>
          )}
        </DialogContent>
        </Dialog>
        </>
    );
}
