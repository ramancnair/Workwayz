

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
import { PlusCircle, Edit, Trash2, ArrowUpDown, X } from 'lucide-react';
import { type Story, type StoryStatus } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { format, addDays, parseISO, isSameDay } from 'date-fns';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
  epicId: z.string().optional(), // Represents the related story
  assigneeId: z.string().optional(),
  status: z.enum(['To Do', 'In Progress', 'Done']),
  sprintId: z.string().optional(),
  effortDays: z.coerce.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  impactedSystemId: z.string().optional(),
});

const statusOptions: StoryStatus[] = ['To Do', 'In Progress', 'Done'];

const statusStyles: Record<StoryStatus, string> = {
  'To Do': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  'In Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Done': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};


export default function DevelopmentTasksPage() {
  const { stories, employees, sprints, holidays, weeklyOffDays, addStory, updateStory, deleteStory, impactedSystems } = useProject();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Story | null>(null);
  const [deletingTask, setDeletingTask] = useState<Story | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [relatedStoryInputText, setRelatedStoryInputText] = useState('');
  
  const tasks = stories.filter(story => story.itemType === 'Task');

  const [filters, setFilters] = useState({
    status: 'all',
    assigneeId: 'all',
    impactedSystemId: 'all',
    sprintId: 'all',
  });
  const [sorting, setSorting] = useState<{ id: string; desc: boolean } | null>(null);

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
  });

  const watchedStartDate = useWatch({ control: form.control, name: 'startDate' });
  const watchedEffortDays = useWatch({ control: form.control, name: 'effortDays' });
  
  const holidayDates = holidays.map(h => new Date(h.date));

  const calculateBusinessEndDate = (startDate: Date, effortDays: number) => {
    let currentDate = new Date(startDate);
    let daysAdded = 0;
    while (daysAdded < effortDays) {
      if (daysAdded > 0) {
        currentDate = addDays(currentDate, 1);
      }
      
      const dayOfWeek = currentDate.getDay();
      const isWeekend = weeklyOffDays.includes(dayOfWeek);
      const isHoliday = holidayDates.some(holiday => isSameDay(currentDate, holiday));

      if (!isWeekend && !isHoliday) {
        daysAdded++;
      }
    }
    return currentDate;
  };
  
   const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters({ status: 'all', assigneeId: 'all', impactedSystemId: 'all', sprintId: 'all' });
  };
  
  const handleSort = (columnId: string) => {
    if (sorting?.id === columnId) {
      setSorting({ ...sorting, desc: !sorting.desc });
    } else {
      setSorting({ id: columnId, desc: false });
    }
  };
  
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = [...tasks];

    if (filters.status !== 'all') {
      filtered = filtered.filter(t => t.status === filters.status);
    }
    if (filters.assigneeId !== 'all') {
      filtered = filtered.filter(t => t.assigneeId === filters.assigneeId);
    }
    if (filters.impactedSystemId !== 'all') {
      filtered = filtered.filter(t => t.impactedSystemId === filters.impactedSystemId);
    }
    if (filters.sprintId !== 'all') {
      if (filters.sprintId === 'backlog') {
        filtered = filtered.filter(t => !t.sprintId);
      } else {
        filtered = filtered.filter(t => t.sprintId === filters.sprintId);
      }
    }

    if (sorting) {
      filtered.sort((a, b) => {
        let valA: any, valB: any;

        if (sorting.id === 'sprintId') {
            valA = sprints.find(s => s.id === a.sprintId)?.title || 'Backlog';
            valB = sprints.find(s => s.id === b.sprintId)?.title || 'Backlog';
        } else {
            valA = (a as any)[sorting.id];
            valB = (b as any)[sorting.id];
        }

        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        
        let comparison = 0;
        if (['startDate', 'endDate'].includes(sorting.id) && valA && valB) {
            comparison = new Date(valA).getTime() - new Date(valB).getTime();
        } else if (typeof valA === 'string' && typeof valB === 'string') {
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
  }, [tasks, filters, sorting, sprints]);

  useEffect(() => {
    if (watchedStartDate && watchedEffortDays !== undefined && watchedEffortDays > 0) {
      try {
        const startDate = parseISO(watchedStartDate);
        const newEndDate = calculateBusinessEndDate(startDate, watchedEffortDays);
        form.setValue('endDate', format(newEndDate, 'yyyy-MM-dd'), { shouldValidate: true });
      } catch (e) {
        form.setValue('endDate', '', { shouldValidate: true });
      }
    } else if (watchedEffortDays === 0) {
       form.setValue('endDate', watchedStartDate);
    }
  }, [watchedStartDate, watchedEffortDays, form, holidays, weeklyOffDays]);

  const storyOptions = useMemo(() => stories
    .filter(s => s.itemType === 'Story')
    .map(story => ({
      value: story.id,
      label: `[${story.storyId}] ${story.title}`,
    })), [stories]);

  useEffect(() => {
    if (isDialogOpen) {
      if (editingTask) {
        const relatedStory = storyOptions.find(opt => opt.value === editingTask.epicId);
        setRelatedStoryInputText(relatedStory?.label || '');
        form.reset({
          title: editingTask.title,
          description: editingTask.description || '',
          acceptanceCriteria: editingTask.acceptanceCriteria || '',
          epicId: editingTask.epicId || '',
          assigneeId: editingTask.assigneeId || 'unassigned',
          status: editingTask.status,
          sprintId: editingTask.sprintId || 'backlog',
          effortDays: editingTask.effortDays,
          startDate: editingTask.startDate ? format(parseISO(editingTask.startDate), 'yyyy-MM-dd') : '',
          endDate: editingTask.endDate ? format(parseISO(editingTask.endDate), 'yyyy-MM-dd') : '',
          impactedSystemId: editingTask.impactedSystemId || 'unassigned',
        });
      } else {
        setRelatedStoryInputText('');
        form.reset({
          title: '',
          description: '',
          acceptanceCriteria: '',
          epicId: '',
          assigneeId: 'unassigned',
          status: 'To Do',
          sprintId: 'backlog',
          effortDays: 0,
          startDate: '',
          endDate: '',
          impactedSystemId: 'unassigned',
        });
      }
    }
  }, [isDialogOpen, editingTask, form, storyOptions]);

  const handleDialogOpen = (task: Story | null) => {
    setEditingTask(task);
    setIsDialogOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (!deletingTask) return;
    const success = await deleteStory(deletingTask.id);
    if (success) {
      toast({ title: "Success", description: "Task deleted." });
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not delete task." });
    }
    setDeletingTask(null);
  };

  const onSubmit = async (values: z.infer<typeof taskSchema>) => {
    setIsSubmitting(true);
    
    const taskData: Omit<Story, 'id' | 'storyId'> = {
        title: values.title,
        itemType: 'Task',
        description: values.description,
        acceptanceCriteria: values.acceptanceCriteria,
        assigneeId: values.assigneeId === 'unassigned' ? undefined : values.assigneeId,
        epicId: values.epicId === '' ? undefined : values.epicId, // Related story
        status: values.status,
        sprintId: values.sprintId === 'backlog' ? null : values.sprintId,
        effortDays: values.effortDays,
        startDate: values.startDate,
        endDate: values.endDate,
        impactedSystemId: values.impactedSystemId === 'unassigned' ? undefined : values.impactedSystemId,
    };

    let success = false;
    if (editingTask) {
      success = await updateStory(editingTask.id, taskData);
    } else {
      success = await addStory(taskData);
    }

    if (success) {
      toast({ title: "Success", description: `Task ${editingTask ? 'updated' : 'added'} successfully.` });
      setIsDialogOpen(false);
      setEditingTask(null);
    } else {
      toast({ variant: "destructive", title: "Error", description: `Could not ${editingTask ? 'update' : 'add'} task.` });
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
      <PageHeader title="Development Tasks" description="Manage all development tasks for the project.">
        <Button onClick={() => handleDialogOpen(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Task
        </Button>
      </PageHeader>
      <Card>
        <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by status..."/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.sprintId} onValueChange={(v) => handleFilterChange('sprintId', v)}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by sprint..."/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sprints</SelectItem>
                  <SelectItem value="backlog">Backlog</SelectItem>
                  {sprints.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.assigneeId} onValueChange={(v) => handleFilterChange('assigneeId', v)}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by assignee..."/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.impactedSystemId} onValueChange={(v) => handleFilterChange('impactedSystemId', v)}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by system..."/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Systems</SelectItem>
                  {impactedSystems.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="ghost" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" /> Clear Filters
              </Button>
            </div>
          </CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader columnId="storyId">ID</SortableHeader>
              <SortableHeader columnId="title" className="w-[30%]">Title</SortableHeader>
              <SortableHeader columnId="status">Status</SortableHeader>
              <SortableHeader columnId="sprintId">Sprint</SortableHeader>
              <TableHead>Assignee</TableHead>
              <TableHead>Impacted System</TableHead>
              <SortableHeader columnId="effortDays">Effort</SortableHeader>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedTasks.map((task) => {
              const assignee = employees.find(e => e.id === task.assigneeId);
              const impactedSystem = impactedSystems.find(s => s.id === task.impactedSystemId);
              const sprint = sprints.find(s => s.id === task.sprintId);
              return (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.storyId}</TableCell>
                  <TableCell>{task.title}</TableCell>
                  <TableCell>
                    <Badge className={cn('font-semibold', statusStyles[task.status])}>
                      {task.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{sprint?.title || 'Backlog'}</TableCell>
                  <TableCell>
                    {assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={assignee.avatar} alt={`${assignee.firstName} ${assignee.lastName}`} data-ai-hint="developer avatar" />
                          <AvatarFallback>{assignee.firstName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {assignee.firstName} {assignee.lastName}
                      </div>
                    ) : "Unassigned"}
                  </TableCell>
                  <TableCell>{impactedSystem?.name || 'N/A'}</TableCell>
                  <TableCell>{task.effortDays ? `${task.effortDays}d` : 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(task)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeletingTask(task)}>
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

    <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingTask(null); }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
            <DialogDescription>Make changes to the task details here.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Task title" {...field} />
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
                        <Textarea placeholder="Describe the task..." {...field} />
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
                      name="epicId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Related Story</FormLabel>
                          <FormControl>
                            <Input 
                                list="story-options" 
                                placeholder="Select a story..." 
                                value={relatedStoryInputText}
                                onChange={(e) => {
                                    const inputText = e.target.value;
                                    setRelatedStoryInputText(inputText);
                                    
                                    const matchingOption = storyOptions.find(opt => opt.label === inputText);
                                    if (matchingOption) {
                                        field.onChange(matchingOption.value);
                                    } else {
                                        field.onChange('');
                                    }
                                }}
                                onBlur={() => {
                                    // If text doesn't match a valid option, clear it
                                    const matchingOption = storyOptions.find(opt => opt.label === relatedStoryInputText);
                                    if (!matchingOption) {
                                        setRelatedStoryInputText('');
                                        field.onChange('');
                                    }
                                }}
                            />
                          </FormControl>
                          <datalist id="story-options">
                            {storyOptions.map(option => (
                              <option key={option.value} value={option.label}>
                                {option.label}
                              </option>
                            ))}
                          </datalist>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                    control={form.control}
                    name="sprintId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Sprint</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'backlog'}>
                            <FormControl>
                            <SelectTrigger><SelectValue placeholder="Assign to a sprint" /></SelectTrigger>
                            </FormControl>
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
                </div>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="startDate" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Start Date</FormLabel>
                            <FormControl>
                                <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="effortDays" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Effort (days)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="endDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                           <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (editingTask ? 'Saving...' : 'Creating...') : (editingTask ? 'Save Changes' : 'Create Task')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deletingTask} onOpenChange={(isOpen) => !isOpen && setDeletingTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the task.
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
