

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
import { type Story, type StoryStatus, type Epic } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { format, parseISO } from 'date-fns';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

const subTaskSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional(),
  parentStoryId: z.string().min(1, 'A parent story is required.'),
  assigneeId: z.string().optional(),
  status: z.enum(['To Do', 'In Progress', 'Done']),
  estimatedHours: z.coerce.number().optional(),
  impactedSystemId: z.string().optional(),
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

const statusOptions: StoryStatus[] = ['To Do', 'In Progress', 'Done'];

const statusStyles: Record<StoryStatus, string> = {
  'To Do': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  'In Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Done': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

type ColumnId = 'storyId' | 'title' | 'parentStoryId' | 'status' | 'assigneeId' | 'impactedSystemId' | 'estimatedHours' | 'startDate' | 'endDate';

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
};

export default function DevelopmentTasksPage() {
  const { stories, employees, addStory, updateStory, deleteStory, impactedSystems } = useProject();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubTask, setEditingSubTask] = useState<Story | null>(null);
  const [deletingSubTask, setDeletingSubTask] = useState<Story | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const subTasks = stories.filter(story => story.itemType === 'Sub Task');
  const parentStories = stories.filter(s => ['Requirement/Story', 'Feature Change'].includes(s.itemType));

  const [filterText, setFilterText] = useState('');
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
  
  const filteredAndSortedSubTasks = useMemo(() => {
    let filtered = subTasks.filter(t => 
        t.title.toLowerCase().includes(filterText.toLowerCase()) ||
        t.storyId.toLowerCase().includes(filterText.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(filterText.toLowerCase()))
    );

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
  }, [subTasks, filterText, sorting, stories, employees, impactedSystems]);


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
      toast({ title: "Success", description: "Sub-task deleted." });
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not delete sub-task." });
    }
    setDeletingSubTask(null);
  };

  const onSubmit = async (values: z.infer<typeof subTaskSchema>) => {
    setIsSubmitting(true);
    
    const parentStory = parentStories.find(p => p.id === values.parentStoryId);

    const subTaskData: Omit<Story, 'id' | 'storyId'> = {
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
        // Inherit from parent
        epicId: parentStory?.epicId,
        sprintId: parentStory?.sprintId,
        releaseId: parentStory?.releaseId,
    };

    let success = false;
    if (editingSubTask) {
      success = await updateStory(editingSubTask.id, subTaskData);
    } else {
      success = await addStory(subTaskData, 'SUB');
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
      <PageHeader title="Sub-Tasks" description="A comprehensive list of all sub-tasks for the project." />
      <Card>
        <CardContent className="p-4">
            <div className="flex items-center gap-4">
                <Input 
                    placeholder="Filter by ID, title, or description..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    className="max-w-sm"
                />
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
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedSubTasks.map((task) => {
              const assignee = employees.find(e => e.id === task.assigneeId);
              const impactedSystem = impactedSystems.find(s => s.id === task.impactedSystemId);
              const parentStory = stories.find(s => s.id === task.parentStoryId);
              return (
                <TableRow key={task.id}>
                  {columnVisibility.storyId && <TableCell className="font-medium">{task.storyId}</TableCell>}
                  {columnVisibility.title && <TableCell>{task.title}</TableCell>}
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
                          <AvatarFallback>{assignee.firstName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {assignee.firstName} {assignee.lastName}
                      </div>
                    ) : "Unassigned"}
                  </TableCell>}
                  {columnVisibility.impactedSystemId && <TableCell>{impactedSystem?.name || 'N/A'}</TableCell>}
                  {columnVisibility.estimatedHours && <TableCell>{task.estimatedHours ? `${task.estimatedHours}h` : 'N/A'}</TableCell>}
                  {columnVisibility.startDate && <TableCell>{task.startDate ? format(parseISO(task.startDate), 'PPP') : 'N/A'}</TableCell>}
                  {columnVisibility.endDate && <TableCell>{task.endDate ? format(parseISO(task.endDate), 'PPP') : 'N/A'}</TableCell>}
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
                            {(['To Do', 'In Progress', 'Done'] as StoryStatus[]).map(s => (
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
