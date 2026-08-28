

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Button, buttonVariants } from '@/components/ui/button';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Edit, Trash2, ArrowUpDown, X, Columns, Filter, UserCog, Search } from 'lucide-react';
import { type Story, type StoryStatus, type Epic, Release, User, ImpactedSystem, Sprint } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn, getUserInitials } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { format, parseISO } from 'date-fns';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const subTaskSchema = z.object({
  title: z.string().min(1, 'Title is required.').max(60, 'Title cannot exceed 60 characters.'),
  description: z.string().max(300, 'Description cannot exceed 300 characters.').optional(),
  parentStoryId: z.string().min(1, 'A parent story is required.'),
  assigneeId: z.string().optional(),
  status: z.enum(['To Do', 'In Progress', 'Done']),
  estimatedHours: z.coerce.number().optional(),
  impactedSystemId: z.string().optional(),
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

const bulkAssignSchema = z.object({
  assigneeId: z.string().min(1, 'Please select an assignee.'),
});


const statusStyles: Record<StoryStatus, string> = {
  'To Do': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  'In Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Done': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

type ColumnId = 'storyId' | 'title' | 'parentStoryId' | 'status' | 'assigneeId' | 'impactedSystemId' | 'estimatedHours' | 'startDate' | 'endDate' | 'sprintId' | 'releaseId';

const columnConfig: Record<ColumnId, { label: string, defaultVisible: boolean, filterable?: boolean }> = {
    storyId: { label: 'ID', defaultVisible: true },
    title: { label: 'Title', defaultVisible: true },
    parentStoryId: { label: 'Parent Story', defaultVisible: true, filterable: true },
    status: { label: 'Status', defaultVisible: true, filterable: true },
    assigneeId: { label: 'Assignee', defaultVisible: true, filterable: true },
    impactedSystemId: { label: 'Impacted System', defaultVisible: true, filterable: true },
    estimatedHours: { label: 'Effort', defaultVisible: true },
    startDate: { label: 'Start Date', defaultVisible: false },
    endDate: { label: 'End Date', defaultVisible: false },
    sprintId: { label: 'Sprint', defaultVisible: false, filterable: true },
    releaseId: { label: 'Release', defaultVisible: false, filterable: true },
};

const statusOptions: StoryStatus[] = ['To Do', 'In Progress', 'Done'];

export default function DevelopmentTasksPage() {
  const { stories, employees, addStory, updateStory, deleteStory, impactedSystems, sprints, releasesAndMilestones, bulkAssignSubTasks, bulkDeleteStories } = useProject();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubTask, setEditingSubTask] = useState<Story | null>(null);
  const [deletingSubTask, setDeletingSubTask] = useState<Story | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSubTasks, setSelectedSubTasks] = useState<string[]>([]);
  const [tasksToAssign, setTasksToAssign] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  
  const subTasks = stories.filter(story => story.itemType === 'Sub Task');
  const parentStories = stories.filter(s => ['Requirement/Story', 'Feature Change'].includes(s.itemType));
  const releases = releasesAndMilestones.filter(r => r.itemType === 'Release');

  const [filters, setFilters] = useState<Record<string, string[]>>({ search: [] });
  const [sorting, setSorting] = useState<{ id: string; desc: boolean } | null>({ id: 'storyId', desc: false });
  const [columnVisibility, setColumnVisibility] = useState<Record<ColumnId, boolean>>(() =>
    Object.entries(columnConfig).reduce((acc, [key, { defaultVisible }]) => {
      acc[key as ColumnId] = defaultVisible;
      return acc;
    }, {} as Record<ColumnId, boolean>)
  );

  const form = useForm<z.infer<typeof subTaskSchema>>({
    resolver: zodResolver(subTaskSchema),
  });

  const bulkAssignForm = useForm<z.infer<typeof bulkAssignSchema>>({
    resolver: zodResolver(bulkAssignSchema),
  });

  const watchedImpactedSystemId = useWatch({ control: form.control, name: 'impactedSystemId' });
  const filteredEmployeesForSubTasks = useMemo(() => {
    if (!watchedImpactedSystemId || watchedImpactedSystemId === 'unassigned') return employees;
    return employees.filter(emp => emp.capabilities?.includes(watchedImpactedSystemId));
  }, [employees, watchedImpactedSystemId]);

  const handleSort = (columnId: string) => {
    if (sorting?.id === columnId) {
      setSorting({ ...sorting, desc: !sorting.desc });
    } else {
      setSorting({ id: columnId, desc: false });
    }
  };
  
  const handleFilterChange = (columnId: ColumnId, value: string) => {
    setFilters(prev => {
        const newFilters = { ...prev };
        const currentFilter = newFilters[columnId] || [];
        if(currentFilter.includes(value)) {
            newFilters[columnId] = currentFilter.filter(v => v !== value);
        } else {
            newFilters[columnId] = [...currentFilter, value];
        }
        if (newFilters[columnId].length === 0) {
            delete newFilters[columnId];
        }
        return newFilters;
    })
  };

  const clearFilters = () => {
    setFilters({ search: filters.search || [] });
  };
  
  const filteredAndSortedSubTasks = useMemo(() => {
    const searchTerm = (filters.search?.[0] || '').toLowerCase();
    
    let filtered = subTasks.filter(t => 
        searchTerm ? 
        (t.title.toLowerCase().includes(searchTerm) ||
        t.storyId.toLowerCase().includes(searchTerm) ||
        (t.description && t.description.toLowerCase().includes(searchTerm)))
        : true
    );

    Object.entries(filters).forEach(([key, values]) => {
      if (key !== 'search' && values.length > 0) {
        filtered = filtered.filter(t => {
          const taskValue = (t as any)[key];
          if (key === 'sprintId' && !taskValue) {
            return values.includes('backlog');
          }
          if (key === 'releaseId' && !taskValue) {
            return values.includes('unassigned');
          }
           if (key === 'assigneeId' && !taskValue) {
            return values.includes('unassigned');
          }
          return values.includes(taskValue);
        });
      }
    });

    if (sorting) {
      filtered.sort((a, b) => {
        let valA: any, valB: any;

        if (sorting.id === 'parentStoryId') {
            valA = stories.find(s => s.id === a.parentStoryId)?.title || '';
            valB = stories.find(s => s.id === b.parentStoryId)?.title || '';
        } else if (sorting.id === 'assigneeId') {
            const assigneeA = employees.find(e => e.id === a.assigneeId);
            const assigneeB = employees.find(e => e.id === b.assigneeId);
            valA = assigneeA ? `${assigneeA.firstName} ${assigneeA.lastName}` : 'zzz';
            valB = assigneeB ? `${assigneeB.firstName} ${assigneeB.lastName}` : 'zzz';
        } else if (sorting.id === 'impactedSystemId') {
            valA = impactedSystems.find(s => s.id === a.impactedSystemId)?.name || '';
            valB = impactedSystems.find(s => s.id === b.impactedSystemId)?.name || '';
        } else if (sorting.id === 'sprintId') {
            valA = sprints.find(s => s.id === a.sprintId)?.title || 'Backlog';
            valB = sprints.find(s => s.id === b.sprintId)?.title || 'Backlog';
        } else if (sorting.id === 'releaseId') {
            valA = releases.find(r => r.id === a.releaseId)?.releaseId || '';
            valB = releases.find(r => r.id === b.releaseId)?.releaseId || '';
        } else {
            valA = (a as any)[sorting.id];
            valB = (b as any)[sorting.id];
        }

        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        
        let comparison = 0;
        if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB, undefined, { numeric: true });
        } else if (valA > valB) {
          comparison = 1;
        } else if (valA < valB) {
          comparison = -1;
        }

        return sorting.desc ? -comparison : comparison;
      });
    }

    return filtered;
  }, [subTasks, filters, sorting, stories, employees, impactedSystems, sprints, releases]);


  useEffect(() => {
    if (isDialogOpen) {
      if (editingSubTask) {
        form.reset({
          title: (editingSubTask.title || '').slice(0, 60),
          description: (editingSubTask.description || '').slice(0, 300),
          parentStoryId: editingSubTask.parentStoryId || '',
          assigneeId: editingSubTask.assigneeId || 'unassigned',
          status: editingSubTask.status as 'To Do' | 'In Progress' | 'Done',
          estimatedHours: editingSubTask.estimatedHours || 0,
          impactedSystemId: editingSubTask.impactedSystemId || 'unassigned',
          startDate: editingSubTask.startDate ? format(parseISO(editingSubTask.startDate), 'yyyy-MM-dd') : '',
          endDate: editingSubTask.endDate ? format(parseISO(editingSubTask.endDate), 'yyyy-MM-dd') : '',
          sprintId: editingSubTask.sprintId || 'backlog',
          releaseId: editingSubTask.releaseId || 'unassigned',
        });
      } else {
        form.reset({
          title: '',
          description: '',
          parentStoryId: '',
          assigneeId: 'unassigned',
          status: 'To Do',
          estimatedHours: 0,
          impactedSystemId: 'unassigned',
          startDate: '',
          endDate: '',
          sprintId: 'backlog',
          releaseId: 'unassigned',
        });
      }
    }
  }, [isDialogOpen, editingSubTask, form]);
  



  const handleDialogOpen = (task: Story | null) => {
    setEditingSubTask(task);
    setIsDialogOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (!deletingSubTask) return;
    const success = await deleteStory(deletingSubTask.id);
    if (success) {
      toast({ title: "Success", description: "Sub-task moved to trash." });
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not delete sub-task." });
    }
    setDeletingSubTask(null);
  };
  
  const handleBulkDeleteConfirm = async () => {
    if (selectedSubTasks.length === 0) return;
    const success = await bulkDeleteStories(selectedSubTasks);
    if(success) {
      toast({ title: "Success", description: `${selectedSubTasks.length} sub-task(s) moved to trash.`});
      setSelectedSubTasks([]);
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not delete selected sub-tasks." });
    }
    setShowBulkDeleteConfirm(false);
  };


  const onSubmit = async (values: z.infer<typeof subTaskSchema>) => {
    setIsSubmitting(true);
    
    const parentStory = parentStories.find(p => p.id === values.parentStoryId);
    
    // Explicitly construct the payload to avoid unintended fields
    const subTaskData: Partial<Story> = {
        title: values.title,
        description: values.description,
        parentStoryId: values.parentStoryId,
        status: values.status,
        itemType: 'Sub Task',
        estimatedHours: values.estimatedHours,
        impactedSystemId: values.impactedSystemId === 'unassigned' ? undefined : values.impactedSystemId,
        assigneeId: values.assigneeId === 'unassigned' ? undefined : values.assigneeId,
        startDate: values.startDate ? new Date(values.startDate).toISOString() : undefined,
        endDate: values.endDate ? new Date(values.endDate).toISOString() : undefined,
        sprintId: values.sprintId === 'backlog' ? null : values.sprintId,
        releaseId: values.releaseId === 'unassigned' ? undefined : values.releaseId,
    };
    
    if (editingSubTask) {
        // No need to set epicId if it's already there
    } else {
        subTaskData.epicId = parentStory?.epicId;
        // Inherit sprint/release from parent if not specified
        if (!subTaskData.sprintId && parentStory?.sprintId) subTaskData.sprintId = parentStory.sprintId;
        if (!subTaskData.releaseId && parentStory?.releaseId) subTaskData.releaseId = parentStory.releaseId;
    }


    let success = false;
    if (editingSubTask) {
      success = await updateStory(editingSubTask.id, subTaskData);
    } else {
      const result = await addStory(subTaskData as Omit<Story, 'id' | 'storyId'>, 'SUB');
      success = !!result;
    }

    if (success) {
      toast({ title: "Success", description: `Sub-task ${editingSubTask ? 'updated' : 'added'} successfully.` });
      setIsDialogOpen(false);
      setEditingSubTask(null);
    } else {
      toast({ variant: "destructive", title: "Error", description: `Could not ${editingSubTask ? 'update' : 'add'} sub-task.` });
    }
    setIsSubmitting(false);
  };

  const bulkAssignFilteredEmployees = useMemo(() => {
    if (tasksToAssign.length === 0) return employees;
    const systems = subTasks
      .filter(t => tasksToAssign.includes(t.id))
      .map(t => t.impactedSystemId)
      .filter(Boolean) as string[];
    const uniqueSystems = Array.from(new Set(systems));
    if (uniqueSystems.length === 0) return employees;
    
    return employees.filter(emp => uniqueSystems.every(sys => emp.capabilities?.includes(sys)));
  }, [employees, tasksToAssign, subTasks]);
  
  const handleBulkAssign = async (values: z.infer<typeof bulkAssignSchema>) => {
    const success = await bulkAssignSubTasks(tasksToAssign, values.assigneeId === 'unassigned' ? null : values.assigneeId);
    if(success) {
      toast({ title: 'Success', description: `${tasksToAssign.length} sub-task(s) assigned.` });
      setSelectedSubTasks(prev => prev.filter(id => !tasksToAssign.includes(id)));
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not assign sub-tasks." });
    }
    setTasksToAssign([]);
  }

  const renderFilterableHeader = (columnId: ColumnId, children: React.ReactNode, filterOptions: {value: string, label: string}[]) => {
    const activeFilters = filters[columnId] || [];
    return (
      <TableHead key={columnId}>
        <div className="flex items-center gap-2">
            <span className="font-bold">{children}</span>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className={cn("h-6 w-6", activeFilters.length > 0 && "text-blue-500")}>
                        <Filter className="h-4 w-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-64">
                    <div className="p-2 space-y-2">
                        <Label className="px-2 font-semibold">Filter by {children}</Label>
                        {filterOptions.map(opt => (
                            <div key={opt.value} className="flex items-center space-x-2 px-2">
                                <Checkbox
                                    id={`${columnId}-${opt.value}`}
                                    checked={activeFilters.includes(opt.value)}
                                    onCheckedChange={() => handleFilterChange(columnId, opt.value)}
                                />
                                <Label htmlFor={`${columnId}-${opt.value}`} className="font-normal w-full">{opt.label}</Label>
                            </div>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>
             <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleSort(columnId)}>
                <ArrowUpDown className="h-4 w-4" />
            </Button>
        </div>
      </TableHead>
    )
  }

  const getFilterOptions = (columnId: ColumnId): {value: string, label: string}[] => {
    switch (columnId) {
      case 'status':
        return statusOptions.map(s => ({ value: s, label: s }));
      case 'assigneeId':
        return [{ value: 'unassigned', label: 'Unassigned' }, ...employees.map(e => ({ value: e.id, label: `${e.firstName} ${e.lastName}` }))];
      case 'parentStoryId':
        return parentStories.map(p => ({ value: p.id, label: `[${p.storyId}] ${p.title}`}));
      case 'impactedSystemId':
        return impactedSystems.map(s => ({ value: s.id, label: s.name }));
      case 'sprintId':
        return [{ value: 'backlog', label: 'Backlog' }, ...sprints.map(s => ({ value: s.id, label: s.title }))];
      case 'releaseId':
        return [{ value: 'unassigned', label: 'Unassigned' }, ...releases.map(r => ({ value: r.id, label: `[${r.releaseId}] ${r.name}` }))];
      default:
        return [];
    }
  }


  return (
    <>
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="Sub-Tasks" description="A comprehensive list of all sub-tasks for the project.">
           {selectedSubTasks.length > 0 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setTasksToAssign(selectedSubTasks)}>
                  <UserCog className="mr-2 h-4 w-4" />
                  Assign Selected ({selectedSubTasks.length})
                </Button>
                <Button variant="destructive" onClick={() => setShowBulkDeleteConfirm(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Selected ({selectedSubTasks.length})
                </Button>
              </div>
            )}
           <Button onClick={() => handleDialogOpen(null)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Sub-Task
            </Button>
      </PageHeader>
      <Card>
        <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
                <div className="relative max-w-sm w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input 
                        placeholder="Filter by ID, title, or description..."
                        value={filters.search?.[0] || ''}
                        onChange={(e) => setFilters(prev => ({...prev, search: e.target.value ? [e.target.value] : []}))}
                        className="pl-9 w-full"
                    />
                </div>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                            <Columns className="mr-2 h-4 w-4" />
                            Columns
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {Object.entries(columnConfig).map(([key, { label }]) => (
                            <DropdownMenuCheckboxItem
                                key={key}
                                className="capitalize"
                                onSelect={(e) => e.preventDefault()}
                                checked={columnVisibility[key as ColumnId]}
                                onCheckedChange={(value) =>
                                setColumnVisibility((prev) => ({
                                    ...prev,
                                    [key]: !!value,
                                }))
                                }
                            >
                                {label}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="ghost" onClick={clearFilters}>
                    <X className="mr-2 h-4 w-4" /> Clear Filters
                </Button>
            </div>
          </CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={filteredAndSortedSubTasks.length > 0 && selectedSubTasks.length === filteredAndSortedSubTasks.length}
                  onCheckedChange={(value) =>
                    setSelectedSubTasks(value ? filteredAndSortedSubTasks.map(task => task.id) : [])
                  }
                  aria-label="Select all"
                />
              </TableHead>
              {Object.entries(columnVisibility).map(([key, isVisible]) => {
                if (!isVisible) return null;
                const config = columnConfig[key as ColumnId];
                if (config.filterable) {
                    return renderFilterableHeader(key as ColumnId, config.label, getFilterOptions(key as ColumnId));
                }
                return <TableHead key={key}><Button variant="ghost" onClick={() => handleSort(key)}>{config.label}<ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
              })}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedSubTasks.map((task) => {
              const assignee = employees.find(e => e.id === task.assigneeId);
              const impactedSystem = impactedSystems.find(s => s.id === task.impactedSystemId);
              const parentStory = stories.find(s => s.id === task.parentStoryId);
              const sprint = sprints.find(s => s.id === task.sprintId);
              const release = releases.find(r => r.id === task.releaseId);
              


              return (
                <TableRow key={task.id} className="cursor-default select-none" data-state={selectedSubTasks.includes(task.id) && "selected"}>
                   <TableCell>
                    <Checkbox
                      checked={selectedSubTasks.includes(task.id)}
                      onCheckedChange={(checked) =>
                        setSelectedSubTasks(prev =>
                          checked ? [...prev, task.id] : prev.filter(id => id !== task.id)
                        )
                      }
                      aria-label="Select row"
                    />
                  </TableCell>
                  {columnVisibility.storyId && <TableCell className="font-medium">{task.storyId}</TableCell>}
                  {columnVisibility.title && <TableCell>
                      {task.title}
                  </TableCell>}
                  {columnVisibility.parentStoryId && <TableCell>
                    {parentStory ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="secondary">[{parentStory.storyId}]</Badge>
                          </TooltipTrigger>
                          <TooltipContent>{parentStory.title}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : 'N/A'}
                  </TableCell>}
                  {columnVisibility.status && <TableCell>
                        <Badge className={cn('font-semibold', statusStyles[task.status])}>
                          {task.status}
                        </Badge>
                  </TableCell>}
                  {columnVisibility.assigneeId && <TableCell>
                    {assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={assignee.avatar} alt={`${assignee.firstName} ${assignee.lastName}`} data-ai-hint="developer avatar" />
                          <AvatarFallback className="text-[10px]">{getUserInitials(assignee.firstName, assignee.lastName)}</AvatarFallback>
                        </Avatar>
                        {assignee.firstName} {assignee.lastName}
                      </div>
                    ) : "Unassigned"}
                  </TableCell>}
                  {columnVisibility.impactedSystemId && <TableCell>
                      {impactedSystem?.name || 'N/A'}
                  </TableCell>}
                  {columnVisibility.estimatedHours && <TableCell>
                      {task.estimatedHours ? `${task.estimatedHours}h` : 'N/A'}
                  </TableCell>}
                  {columnVisibility.startDate && <TableCell>
                      {task.startDate ? format(parseISO(task.startDate), 'PPP') : 'N/A'}
                  </TableCell>}
                  {columnVisibility.endDate && <TableCell>
                      {task.endDate ? format(parseISO(task.endDate), 'PPP') : 'N/A'}
                  </TableCell>}
                  {columnVisibility.sprintId && <TableCell>
                      {sprint?.title || 'Backlog'}
                  </TableCell>}
                  {columnVisibility.releaseId && <TableCell>{release?.releaseId || 'N/A'}</TableCell>}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(task)}>
                          <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeletingSubTask(task)}>
                          <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>

    <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingSubTask(null); }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] p-0 flex flex-col overflow-hidden" bypassScrollWrapper={true}>
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle>{editingSubTask ? 'Edit Sub-Task' : 'Add New Sub-Task'}</DialogTitle>
            <DialogDescription>Make changes to the sub-task details here.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
                <FormField
                    control={form.control}
                    name="parentStoryId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Parent Story</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a parent story" /></SelectTrigger></FormControl>
                            <SelectContent>
                            {parentStories.map(s => (
                                <SelectItem key={s.id} value={s.id}>[{s.storyId}] {s.title}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Sub-task title" {...field} maxLength={60} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe the sub-task..." {...field} maxLength={300} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="assigneeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assignee</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Assign someone" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {[...filteredEmployeesForSubTasks].filter(emp => !emp.isDeleted && emp.isEnabled !== false && !!emp.empId && emp.empId.trim() !== '').sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, undefined, { numeric: true, sensitivity: 'base' })).map(emp => (
                              <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.empId.trim()})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                          <SelectContent>
                            {statusOptions.map(s => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
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
                      control={form.control}
                      name="impactedSystemId"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Impacted System</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                              <FormControl>
                              <SelectTrigger><SelectValue placeholder="Select an impacted system" /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                              <SelectItem value="unassigned">None</SelectItem>
                              {impactedSystems.map(system => (
                                  <SelectItem key={system.id} value={system.id}>{system.name}</SelectItem>
                              ))}
                              </SelectContent>
                          </Select>
                          <FormMessage />
                          </FormItem>
                      )}
                      />
                      <FormField
                          control={form.control}
                          name="estimatedHours"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Effort (hours)</FormLabel>
                              <FormControl>
                                <Input type="number" step="any" placeholder="0.00" {...field} value={field.value ?? ''} className="font-mono" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                  </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="startDate" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Start Date</FormLabel>
                            <FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="endDate" render={({ field }) => (
                        <FormItem>
                            <FormLabel>End Date</FormLabel>
                            <FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <FormField control={form.control} name="sprintId" render={({ field }) => (
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
                    <FormField
                      control={form.control}
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
                              {releases.map((release) => (
                                <SelectItem key={release.id} value={release.id}>
                                  [{release.releaseId}] {release.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
                </div>
                <DialogFooter className="px-6 py-4 border-t bg-background shrink-0">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (editingSubTask ? 'Saving...' : 'Creating...') : (editingSubTask ? 'Save Changes' : 'Create Sub-Task')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deletingSubTask} onOpenChange={(isOpen) => !isOpen && setDeletingSubTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the sub-task "{deletingSubTask?.title}" to the trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className={cn(buttonVariants({ variant: 'destructive' }))}
            >
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move {selectedSubTasks.length} sub-task(s) to the trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDeleteConfirm}
              className={cn(buttonVariants({ variant: 'destructive' }))}
            >
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <Dialog open={tasksToAssign.length > 0} onOpenChange={(isOpen) => !isOpen && setTasksToAssign([])}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Assign Selected Tasks</DialogTitle>
                <DialogDescription>
                    Assign the {tasksToAssign.length} selected task(s) to a user.
                </DialogDescription>
            </DialogHeader>
            <Form {...bulkAssignForm}>
                <form onSubmit={bulkAssignForm.handleSubmit(handleBulkAssign)} className="space-y-4">
                    <FormField
                        control={bulkAssignForm.control}
                        name="assigneeId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Assignee</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select an assignee" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                         <SelectItem value="unassigned">Unassigned</SelectItem>
                                         {[...bulkAssignFilteredEmployees].filter(emp => !emp.isDeleted && emp.isEnabled !== false && !!emp.empId && emp.empId.trim() !== '').sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, undefined, { numeric: true, sensitivity: 'base' })).map(emp => (
                                             <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.empId.trim()})</SelectItem>
                                         ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <DialogFooter>
                        <Button type="submit">Assign Tasks</Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

