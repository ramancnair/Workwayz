

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
import { PlusCircle, Edit, Trash2, ArrowUpDown, X, Columns } from 'lucide-react';
import { type Story, type StoryStatus, type Epic, Release } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { format, parseISO } from 'date-fns';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

const statusOptions: StoryStatus[] = ['To Do', 'In Progress', 'Done'];

const subTaskSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional(),
  parentStoryId: z.string().min(1, 'A parent story is required.'),
  assigneeId: z.string().optional(),
  status: z.enum(statusOptions),
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


const statusStyles: Record<StoryStatus, string> = {
  'To Do': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  'In Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Done': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

type ColumnId = 'storyId' | 'title' | 'parentStoryId' | 'status' | 'assigneeId' | 'impactedSystemId' | 'estimatedHours' | 'startDate' | 'endDate' | 'sprintId' | 'releaseId';

const columnConfig: Record<ColumnId, { label: string, defaultVisible: boolean }> = {
    storyId: { label: 'ID', defaultVisible: true },
    title: { label: 'Title', defaultVisible: true },
    parentStoryId: { label: 'Parent Story', defaultVisible: true },
    status: { label: 'Status', defaultVisible: true },
    assigneeId: { label: 'Assignee', defaultVisible: true },
    impactedSystemId: { label: 'Impacted System', defaultVisible: true },
    estimatedHours: { label: 'Effort', defaultVisible: false },
    startDate: { label: 'Start Date', defaultVisible: false },
    endDate: { label: 'End Date', defaultVisible: false },
    sprintId: { label: 'Sprint', defaultVisible: true },
    releaseId: { label: 'Release', defaultVisible: true },
};

export default function DevelopmentTasksPage() {
  const { stories, employees, addStory, updateStory, deleteStory, impactedSystems, sprints, releasesAndMilestones } = useProject();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubTask, setEditingSubTask] = useState<Story | null>(null);
  const [deletingSubTask, setDeletingSubTask] = useState<Story | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCell, setEditingCell] = useState<{ taskId: string; columnId: ColumnId } | null>(null);

  
  const subTasks = stories.filter(story => story.itemType === 'Sub Task');
  const parentStories = stories.filter(s => ['Requirement/Story', 'Feature Change'].includes(s.itemType));
  const releases = releasesAndMilestones.filter(r => r.itemType === 'Release');

  const [filters, setFilters] = useState({ search: '', sprintId: 'all', releaseId: 'all' });
  const [sorting, setSorting] = useState<{ id: string; desc: boolean } | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<Record<ColumnId, boolean>>(() =>
    Object.entries(columnConfig).reduce((acc, [key, { defaultVisible }]) => {
      acc[key as ColumnId] = defaultVisible;
      return acc;
    }, {} as Record<ColumnId, boolean>)
  );

  const form = useForm<z.infer<typeof subTaskSchema>>({
    resolver: zodResolver(subTaskSchema),
  });
  
  const handleSort = (columnId: string) => {
    if (sorting?.id === columnId) {
      setSorting({ ...sorting, desc: !sorting.desc });
    } else {
      setSorting({ id: columnId, desc: false });
    }
  };
  
  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters({ search: '', sprintId: 'all', releaseId: 'all' });
  };
  
  const filteredAndSortedSubTasks = useMemo(() => {
    let filtered = subTasks.filter(t => 
        t.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        t.storyId.toLowerCase().includes(filters.search.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(filters.search.toLowerCase()))
    );

    if (filters.sprintId !== 'all') {
      if (filters.sprintId === 'backlog') {
        filtered = filtered.filter(t => !t.sprintId);
      } else {
        filtered = filtered.filter(t => t.sprintId === filters.sprintId);
      }
    }
    if (filters.releaseId !== 'all') {
        if(filters.releaseId === 'unassigned') {
            filtered = filtered.filter(t => !t.releaseId);
        } else {
            filtered = filtered.filter(t => t.releaseId === filters.releaseId);
        }
    }

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
          title: editingSubTask.title,
          description: editingSubTask.description || '',
          parentStoryId: editingSubTask.parentStoryId,
          assigneeId: editingSubTask.assigneeId || 'unassigned',
          status: editingSubTask.status,
          estimatedHours: editingSubTask.estimatedHours,
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
          parentStoryId: undefined,
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
  
  const handleUpdateCell = async (taskId: string, columnId: ColumnId, value: any) => {
    let payload = { [columnId]: value };

    if (columnId === 'assigneeId' && value === 'unassigned') {
        payload = { [columnId]: undefined };
    }
    if (columnId === 'sprintId' && value === 'backlog') {
        payload = { [columnId]: null };
    }
    if (['startDate', 'endDate'].includes(columnId) && value) {
      payload = { [columnId]: new Date(value).toISOString() };
    }
    
    await updateStory(taskId, payload);
    setEditingCell(null);
  };


  const handleDialogOpen = (task: Story | null) => {
    setEditingSubTask(task);
    setIsDialogOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (!deletingSubTask) return;
    const success = await deleteStory(deletingSubTask.id);
    if (success) {
      toast({ title: "Success", description: "Sub-task deleted." });
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not delete sub-task." });
    }
    setDeletingSubTask(null);
  };

  const onSubmit = async (values: z.infer<typeof subTaskSchema>) => {
    setIsSubmitting(true);
    
    const parentStory = parentStories.find(p => p.id === values.parentStoryId);

    const subTaskData: Partial<Omit<Story, 'id' | 'storyId'>> = {
        title: values.title,
        itemType: 'Sub Task',
        description: values.description,
        assigneeId: values.assigneeId === 'unassigned' ? undefined : values.assigneeId,
        parentStoryId: values.parentStoryId,
        status: values.status,
        estimatedHours: values.estimatedHours,
        impactedSystemId: values.impactedSystemId === 'unassigned' ? undefined : values.impactedSystemId,
        startDate: values.startDate ? new Date(values.startDate).toISOString() : undefined,
        endDate: values.endDate ? new Date(values.endDate).toISOString() : undefined,
        epicId: parentStory?.epicId,
        sprintId: values.sprintId === 'backlog' ? null : values.sprintId,
        releaseId: values.releaseId === 'unassigned' ? undefined : values.releaseId,
    };

    let success = false;
    if (editingSubTask) {
      success = await updateStory(editingSubTask.id, subTaskData);
    } else {
      // Inherit sprint/release from parent if not specified
      if (!subTaskData.sprintId && parentStory?.sprintId) subTaskData.sprintId = parentStory.sprintId;
      if (!subTaskData.releaseId && parentStory?.releaseId) subTaskData.releaseId = parentStory.releaseId;
      success = await addStory(subTaskData as Omit<Story, 'id' | 'storyId'>, 'SUB');
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

  const SortableHeader = ({ columnId, children, className }: { columnId: string; children: React.ReactNode, className?: string; }) => (
    <TableHead className={className}>
      <Button variant="ghost" onClick={() => handleSort(columnId)}>
        {children}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    </TableHead>
  );

  return (
    <>
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="Sub-Tasks" description="A comprehensive list of all sub-tasks for the project.">
           <Button onClick={() => handleDialogOpen(null)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Sub-Task
            </Button>
      </PageHeader>
      <Card>
        <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
                <Input 
                    placeholder="Filter by ID, title, or description..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="max-w-sm"
                />
                 <Select value={filters.sprintId} onValueChange={(v) => handleFilterChange('sprintId', v)}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by sprint..."/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sprints</SelectItem>
                      <SelectItem value="backlog">Backlog</SelectItem>
                      {sprints.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                   <Select value={filters.releaseId} onValueChange={(v) => handleFilterChange('releaseId', v)}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by release..."/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Releases</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {releases.map(r => <SelectItem key={r.id} value={r.id}>[{r.releaseId}] {r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
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
              {columnVisibility.storyId && <SortableHeader columnId="storyId">ID</SortableHeader>}
              {columnVisibility.title && <SortableHeader columnId="title" className="w-[30%]">Title</SortableHeader>}
              {columnVisibility.parentStoryId && <SortableHeader columnId="parentStoryId">Parent Story</SortableHeader>}
              {columnVisibility.status && <SortableHeader columnId="status">Status</SortableHeader>}
              {columnVisibility.assigneeId && <SortableHeader columnId="assigneeId">Assignee</SortableHeader>}
              {columnVisibility.impactedSystemId && <SortableHeader columnId="impactedSystemId">Impacted System</SortableHeader>}
              {columnVisibility.estimatedHours && <SortableHeader columnId="estimatedHours">Effort</SortableHeader>}
              {columnVisibility.startDate && <SortableHeader columnId="startDate">Start Date</SortableHeader>}
              {columnVisibility.endDate && <SortableHeader columnId="endDate">End Date</SortableHeader>}
              {columnVisibility.sprintId && <SortableHeader columnId="sprintId">Sprint</SortableHeader>}
              {columnVisibility.releaseId && <SortableHeader columnId="releaseId">Release</SortableHeader>}
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
              
              const isEditing = (colId: ColumnId) => editingCell?.taskId === task.id && editingCell?.columnId === colId;

              return (
                <TableRow key={task.id}>
                  {columnVisibility.storyId && <TableCell className="font-medium">{task.storyId}</TableCell>}
                  {columnVisibility.title && <TableCell onDoubleClick={() => setEditingCell({ taskId: task.id, columnId: 'title' })}>
                      {isEditing('title') ? (
                           <Input
                                defaultValue={task.title}
                                onBlur={(e) => handleUpdateCell(task.id, 'title', e.target.value)}
                                autoFocus
                            />
                      ) : task.title}
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
                  {columnVisibility.status && <TableCell onDoubleClick={() => setEditingCell({ taskId: task.id, columnId: 'status' })}>
                    {isEditing('status') ? (
                        <Select
                            defaultValue={task.status}
                            onValueChange={(value) => handleUpdateCell(task.id, 'status', value)}
                        >
                            <SelectTrigger autoFocus onBlur={() => setEditingCell(null)}><SelectValue/></SelectTrigger>
                            <SelectContent>
                                {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    ) : (
                        <Badge className={cn('font-semibold', statusStyles[task.status])}>
                          {task.status}
                        </Badge>
                    )}
                  </TableCell>}
                  {columnVisibility.assigneeId && <TableCell onDoubleClick={() => setEditingCell({ taskId: task.id, columnId: 'assigneeId' })}>
                    {isEditing('assigneeId') ? (
                        <Select
                            defaultValue={task.assigneeId || 'unassigned'}
                            onValueChange={(value) => handleUpdateCell(task.id, 'assigneeId', value)}
                        >
                            <SelectTrigger autoFocus onBlur={() => setEditingCell(null)}><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    ) : (
                      assignee ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={assignee.avatar} alt={`${assignee.firstName} ${assignee.lastName}`} data-ai-hint="developer avatar" />
                            <AvatarFallback>{assignee.firstName?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          {assignee.firstName} {assignee.lastName}
                        </div>
                      ) : "Unassigned"
                    )}
                  </TableCell>}
                  {columnVisibility.impactedSystemId && <TableCell onDoubleClick={() => setEditingCell({ taskId: task.id, columnId: 'impactedSystemId' })}>
                      {isEditing('impactedSystemId') ? (
                          <Select
                            defaultValue={task.impactedSystemId || ''}
                            onValueChange={(value) => handleUpdateCell(task.id, 'impactedSystemId', value)}
                          >
                            <SelectTrigger autoFocus onBlur={() => setEditingCell(null)}><SelectValue placeholder="Select system..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">None</SelectItem>
                                {impactedSystems.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                      ) : (impactedSystem?.name || 'N/A')}
                  </TableCell>}
                  {columnVisibility.estimatedHours && <TableCell onDoubleClick={() => setEditingCell({ taskId: task.id, columnId: 'estimatedHours' })}>
                      {isEditing('estimatedHours') ? (
                          <Input
                            type="number"
                            defaultValue={task.estimatedHours}
                            onBlur={(e) => handleUpdateCell(task.id, 'estimatedHours', parseFloat(e.target.value))}
                            autoFocus
                          />
                      ) : (task.estimatedHours ? `${task.estimatedHours}h` : 'N/A')}
                  </TableCell>}
                  {columnVisibility.startDate && <TableCell onDoubleClick={() => setEditingCell({ taskId: task.id, columnId: 'startDate' })}>
                      {isEditing('startDate') ? (
                          <Input
                            type="date"
                            defaultValue={task.startDate ? format(parseISO(task.startDate), 'yyyy-MM-dd') : ''}
                            onBlur={(e) => handleUpdateCell(task.id, 'startDate', e.target.value)}
                            autoFocus
                          />
                      ) : (task.startDate ? format(parseISO(task.startDate), 'PPP') : 'N/A')}
                  </TableCell>}
                  {columnVisibility.endDate && <TableCell onDoubleClick={() => setEditingCell({ taskId: task.id, columnId: 'endDate' })}>
                      {isEditing('endDate') ? (
                          <Input
                            type="date"
                            defaultValue={task.endDate ? format(parseISO(task.endDate), 'yyyy-MM-dd') : ''}
                            onBlur={(e) => handleUpdateCell(task.id, 'endDate', e.target.value)}
                            autoFocus
                          />
                      ) : (task.endDate ? format(parseISO(task.endDate), 'PPP') : 'N/A')}
                  </TableCell>}
                  {columnVisibility.sprintId && <TableCell onDoubleClick={() => setEditingCell({ taskId: task.id, columnId: 'sprintId' })}>
                      {isEditing('sprintId') ? (
                           <Select
                                defaultValue={task.sprintId || 'backlog'}
                                onValueChange={(value) => handleUpdateCell(task.id, 'sprintId', value)}
                            >
                                <SelectTrigger autoFocus onBlur={() => setEditingCell(null)}><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="backlog">Backlog</SelectItem>
                                    {sprints.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                                </SelectContent>
                            </Select>
                      ) : (sprint?.title || 'Backlog')}
                  </TableCell>}
                  {columnVisibility.releaseId && <TableCell>{release?.releaseId || 'N/A'}</TableCell>}
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(task)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeletingSubTask(task)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>

    <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingSubTask(null); }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSubTask ? 'Edit Sub-Task' : 'Add New Sub-Task'}</DialogTitle>
            <DialogDescription>Make changes to the sub-task details here.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                        <Input placeholder="Sub-task title" {...field} />
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
                        <Textarea placeholder="Describe the sub-task..." {...field} />
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
                            {employees.map(emp => (
                              <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>
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
                                <Input type="number" placeholder="0" {...field} value={field.value ?? ''} />
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
                <DialogFooter>
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
              This action cannot be undone. This will permanently delete the sub-task.
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
    </>
  );
}




