

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
import { PlusCircle, ChevronDown, Trash2, Star, Edit, BookOpen, Bug, CheckSquare, GitCommit, TrendingUp, Clock, CornerDownRight, ThumbsUp, ChevronsRight, X, Flag, FolderUp, Tag, Library, ArrowLeft, Bot } from 'lucide-react';
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
import type { Epic, Story, Sprint, User, WorkItemType, BugCriticality, StoryStatus, ImpactedSystem } from '@/types';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';


const workItemIcons: Record<WorkItemType, React.ElementType> = {
  'Requirement/Story': BookOpen,
  Bug: Bug,
  'Task': CheckSquare,
  'Feature Change': GitCommit,
  'Sub Task': CheckSquare,
};

const workItemTypes: WorkItemType[] = ['Requirement/Story', 'Feature Change', 'Task', 'Bug'];
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
  reporterId: z.string().optional(),
  assigneeId: z.string().optional(),
  estimatedHours: z.coerce.number().optional(),
  criticality: z.enum(bugCriticalities).optional(),
  releaseId: z.string().optional(),
  environmentId: z.string().optional(),
  impactedSystemIds: z.array(z.string()).optional(),
  attachments: z.string().optional(),
});

const subTaskFormSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    impactedSystemId: z.string().optional(),
    estimatedHours: z.coerce.number().optional(),
    assigneeId: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
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


function StoryCard({ story, epic, assignee, onClick, onDelete, className, subItems, sprint, onSubItemClick }: { story: Story; epic?: Epic; assignee?: User; onClick: () => void; onDelete: () => void; className?: string, subItems?: Story[], sprint?: Sprint | null, onSubItemClick: (item: Story) => void; }) {
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
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        <CardHeader className="p-4">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                <p className="text-xs font-semibold text-muted-foreground">{story.storyId}</p>
                {isReadyForDev && <Flag className="h-4 w-4 text-green-500" />}
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
          <div className="flex justify-between items-center text-xs text-muted-foreground">
              <div className='flex items-center gap-2'>
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
    autoGenerateStories
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
  const [isEditStorySubmitting, setEditStorySubmitting] = useState(false);

  const [epicToDelete, setEpicToDelete] = useState<Epic | null>(null);
  const [deleteEpicItems, setDeleteEpicItems] = useState(false);
  const [storyToDelete, setStoryToDelete] = useState<Story | null>(null);
  const [showAddSubTask, setShowAddSubTask] = useState(false);
  const [isAutoGenOpen, setIsAutoGenOpen] = useState(false);
  const [isAutoGenSubmitting, setIsAutoGenSubmitting] = useState(false);


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
    defaultValues: { itemType: 'Requirement/Story', title: '', description: '', acceptanceCriteria: '', epicId: 'unassigned', parentStoryId: 'unassigned', reporterId: 'unassigned', assigneeId: 'unassigned', estimatedHours: 0, criticality: 'Medium', releaseId: 'unassigned', environmentId: 'unassigned', impactedSystemIds: [], attachments: '' },
  });
  
  const subTaskForm = useForm<z.infer<typeof subTaskFormSchema>>({
    resolver: zodResolver(subTaskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      impactedSystemId: 'unassigned',
      estimatedHours: 0,
      assigneeId: 'unassigned',
      startDate: '',
      endDate: '',
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
  
  const watchedItemType = useWatch({ control: addStoryForm.control, name: 'itemType' });
  const parentStories = useMemo(() => stories.filter(s => ['Requirement/Story', 'Feature Change'].includes(s.itemType)), [stories]);

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
        setEditStorySubmitting(false);
        setShowAddSubTask(false);
        subTaskForm.reset();
    } else if (selectedStory.itemType === 'Sub Task') {
        subTaskForm.reset({
            title: selectedStory.title,
            description: selectedStory.description || '',
            impactedSystemId: selectedStory.impactedSystemId || 'unassigned',
            estimatedHours: selectedStory.estimatedHours,
            assigneeId: selectedStory.assigneeId || 'unassigned',
            startDate: selectedStory.startDate ? format(new Date(selectedStory.startDate), 'yyyy-MM-dd') : '',
            endDate: selectedStory.endDate ? format(new Date(selectedStory.endDate), 'yyyy-MM-dd') : '',
        });
    } else {
        const isSubItem = ['Bug'].includes(selectedStory.itemType);
        editStoryForm.reset({
            itemType: selectedStory.itemType,
            title: selectedStory.title,
            description: selectedStory.description || '',
            acceptanceCriteria: selectedStory.acceptanceCriteria || '',
            epicId: !isSubItem ? selectedStory.epicId || 'unassigned' : undefined,
            parentStoryId: isSubItem ? selectedStory.parentStoryId || 'unassigned' : undefined,
            reporterId: selectedStory.reporterId || 'unassigned',
            assigneeId: selectedStory.assigneeId || 'unassigned',
            estimatedHours: selectedStory.estimatedHours,
            criticality: selectedStory.criticality || 'Medium',
            releaseId: selectedStory.releaseId || 'unassigned',
            environmentId: selectedStory.environmentId || 'unassigned',
            impactedSystemIds: selectedStory.impactedSystemIds || [],
            attachments: selectedStory.attachments || '',
        });
    }
  }, [selectedStory, editStoryForm, subTaskForm]);
  
  useEffect(() => {
    if (!addRequirementOpen) {
      addStoryForm.reset();
      setAddStorySubmitting(false);
    }
  }, [addRequirementOpen, addStoryForm]);

  useEffect(() => {
    if (!epicToDelete) {
        setDeleteEpicItems(false);
    }
  }, [epicToDelete]);

  const onAutoGenSubmit = async (values: z.infer<typeof autoGenFormSchema>) => {
    setIsAutoGenSubmitting(true);
    const success = await autoGenerateStories(values);
    if(success) {
        toast({ title: "Success", description: "Test data generated successfully."});
        setIsAutoGenOpen(false);
    } else {
        toast({ variant: "destructive", title: "Error", description: "Could not generate test data." });
    }
    setIsAutoGenSubmitting(false);
  }
  
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
      reporterId: values.reporterId === 'unassigned' ? undefined : values.reporterId,
      assigneeId: values.assigneeId === 'unassigned' ? undefined : values.assigneeId,
      epicId: ['Task', 'Requirement/Story', 'Feature Change'].includes(values.itemType) ? (values.epicId === 'unassigned' ? undefined : values.epicId) : undefined,
      parentStoryId: ['Bug'].includes(values.itemType) ? (values.parentStoryId === 'unassigned' ? undefined : values.parentStoryId) : undefined,
      status: 'To Do',
      estimatedHours: values.estimatedHours,
      criticality: values.itemType === 'Bug' ? values.criticality : undefined,
      releaseId: values.releaseId === 'unassigned' ? undefined : values.releaseId,
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
    setAddStorySubmitting(false);
  };
  
  const onEditStorySubmit = async (values: z.infer<typeof storyFormSchema>) => {
    if (!selectedStory) return;
    setEditStorySubmitting(true);
    
    const payload: Partial<Story> = {
        title: values.title,
        description: values.description,
        acceptanceCriteria: values.acceptanceCriteria,
        reporterId: values.reporterId === 'unassigned' ? undefined : values.reporterId,
        assigneeId: values.assigneeId === 'unassigned' ? undefined : values.assigneeId,
        estimatedHours: values.estimatedHours,
        releaseId: values.releaseId === 'unassigned' ? undefined : values.releaseId,
        environmentId: values.environmentId === 'unassigned' ? undefined : values.environmentId,
        impactedSystemIds: values.impactedSystemIds,
        attachments: values.attachments,
    };
    
    if (['Task', 'Requirement/Story', 'Feature Change'].includes(selectedStory.itemType)) {
        payload.epicId = values.epicId === 'unassigned' ? undefined : values.epicId;
    }
    
    if (selectedStory.itemType === 'Bug' || selectedStory.itemType === 'Sub Task') {
        payload.parentStoryId = values.parentStoryId === 'unassigned' ? undefined : values.parentStoryId;
        payload.epicId = undefined; // Sub-items don't have direct epic link in this model
    }
    
    if (selectedStory.itemType === 'Bug') {
        payload.criticality = values.criticality;
    }

    const success = await updateStory(selectedStory.id, payload);

    if (success) {
        handleSetSelectedStory(null);
    } else {
        toast({ variant: "destructive", title: `Error Editing ${selectedStory.itemType}`, description: "Could not save your changes." });
    }
    setEditStorySubmitting(false);
};

const onEditSubTaskSubmit = async (values: z.infer<typeof subTaskFormSchema>) => {
    if (!selectedStory || selectedStory.itemType !== 'Sub Task') return;
    setEditStorySubmitting(true);
    
    const success = await updateStory(selectedStory.id, {
        title: values.title,
        description: values.description,
        impactedSystemId: values.impactedSystemId === 'unassigned' ? undefined : values.impactedSystemId,
        estimatedHours: values.estimatedHours,
        assigneeId: values.assigneeId === 'unassigned' ? undefined : values.assigneeId,
        startDate: values.startDate ? new Date(values.startDate).toISOString() : undefined,
        endDate: values.endDate ? new Date(values.endDate).toISOString() : undefined,
    });

    if (success) {
        handleSetSelectedStory(null);
    } else {
        toast({ variant: "destructive", title: "Error Editing Sub Task", description: "Could not save your changes." });
    }
    setEditStorySubmitting(false);
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
  
  const handleDeleteStory = async () => {
    if (!storyToDelete) return;
    const success = await deleteStory(storyToDelete.id);
    if (!success) {
        toast({ variant: "destructive", title: "Error", description: "Could not delete story." });
    } else {
        toast({ title: "Success", description: "Story moved to trash." });
    }
    setStoryToDelete(null);
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

  const allWorkItems = stories.filter(
    (story) => !story.parentStoryId && !story.isDeleted
  );

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
    const epicMap: Record<string, Epic> = {};
    epics.forEach(e => {
        epicMap[e.id] = e;
    });

    const unassignedStories = backlogItemsByEpic['unassigned'] || [];
    if (unassignedStories.length > 0 || epics.length === 0) {
      epicMap['unassigned'] = { id: 'unassigned', title: 'Unassigned', description: 'Items not assigned to any epic.' };
    }
    
    const allEpicIds = new Set(Object.keys(backlogItemsByEpic));
    epics.forEach(epic => allEpicIds.add(epic.id));
    
    return Array.from(allEpicIds).map(id => {
        return epicMap[id] || { id, title: 'Unassigned', description: 'Items not assigned to any epic.' };
    }).sort((a, b) => {
        if (a.id === 'unassigned') return 1;
        if (b.id === 'unassigned') return -1;
        return a.title.localeCompare(b.title);
    });
  }, [epics, backlogItemsByEpic]);
  
  const epicToDeleteStoryCount = epicToDelete ? stories.filter(story => story.epicId === epicToDelete.id).length : 0;
  
  const selectedStorySubItems = useMemo(() => {
    if (!selectedStory) return { devTasks: [], bugs: [], subTasks: [] };
    const allSubItems = subItemsByParentId[selectedStory.id] || [];
    return {
      devTasks: allSubItems.filter(item => item.itemType === 'Task'),
      bugs: allSubItems.filter(item => item.itemType === 'Bug'),
      subTasks: allSubItems.filter(item => item.itemType === 'Sub Task'),
    };
  }, [selectedStory, subItemsByParentId]);

  const sortedEnvironments = [...environments].sort((a,b) => a.order - b.order);

  const isEffortReadOnly = useMemo(() => {
    if (!selectedStory) return false;
    return (selectedStorySubItems.devTasks.length > 0 || selectedStorySubItems.subTasks.length > 0);
  }, [selectedStory, selectedStorySubItems]);

  useEffect(() => {
    if (selectedStory) {
      const allSubEffortItems = [...selectedStorySubItems.devTasks, ...selectedStorySubItems.subTasks];
      const totalHours = allSubEffortItems.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
       if (isEffortReadOnly && selectedStory.estimatedHours !== totalHours) {
        updateStory(selectedStory.id, { estimatedHours: totalHours });
      }
    }
  }, [selectedStory, selectedStorySubItems, isEffortReadOnly, updateStory]);

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
                        {['Requirement/Story', 'Feature Change', 'Task'].includes(watchedItemType) ? (
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
                                <FormLabel>Parent Item</FormLabel>
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

              if (backlogItemsForGroup.length === 0 && isUnassignedEpic) return null;

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
                  <AccordionContent className="space-y-2 p-2">
                      {backlogItemsForGroup.length > 0 ? (
                        backlogItemsForGroup.map((story) => {
                          const storyEpic = epics.find((e) => e.id === story.epicId);
                          const assignee = users.find((d) => d.id === story.assigneeId);
                          const sprint = sprints.find(s => s.id === story.sprintId);
                          const subItems = subItemsByParentId[story.id] || [];
                          
                          return (
                            <div key={story.id}>
                              <StoryCard
                                  story={story}
                                  epic={storyEpic}
                                  assignee={assignee}
                                  onClick={() => handleSetSelectedStory(story)}
                                  onDelete={() => setStoryToDelete(story)}
                                  subItems={subItems}
                                  sprint={sprint}
                                  onSubItemClick={(item) => handleDrillDown(item)}
                              />
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

      <AlertDialog open={!!storyToDelete} onOpenChange={(isOpen) => !isOpen && setStoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will move the item "{storyToDelete?.title}" to the trash. It will be permanently deleted after 30 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStory}
               className={cn(buttonVariants({ variant: 'destructive' }))}
            >
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                                    {users.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}
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
                        {['Requirement/Story', 'Feature Change', 'Task'].includes(selectedStory.itemType) ? (
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
                                <FormLabel>Effort (hours)</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="0" {...field} value={field.value ?? ''} disabled={isEffortReadOnly} />
                                </FormControl>
                                {isEffortReadOnly && <p className="text-xs text-muted-foreground">Effort is calculated from linked development tasks.</p>}
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        </div>
                        {selectedStory.itemType === 'Bug' && (
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
                                            <form onSubmit={subTaskForm.handleSubmit(handleAddSubTask)} className='space-y-4'>
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
                                                            {users.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}
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
                                                  <Button type="button">Save Sub Task</Button>
                                                </div>
                                            </form>
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
                  </Tabs>
                  <DialogFooter className="flex justify-end items-center pt-4">
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" disabled={!selectedStory.estimatedHours || selectedStory.estimatedHours === 0}>
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
    

    




