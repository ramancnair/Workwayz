
'use client';

import { useState, useEffect } from 'react';
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
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { type Story, type StoryStatus } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from "@/hooks/use-toast";
import { DatePicker } from '@/components/ui/datepicker';
import { format, addDays } from 'date-fns';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
  epicId: z.string().optional(), // Represents the related story
  assigneeId: z.string().optional(),
  status: z.enum(['To Do', 'In Progress', 'Done']),
  sprintId: z.string().optional(),
  effortDays: z.coerce.number().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

const statusStyles: Record<StoryStatus, string> = {
  'To Do': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  'In Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Done': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};


export default function DevelopmentTasksPage() {
  const { stories, employees, sprints, addStory, updateStory, deleteStory } = useProject();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Story | null>(null);
  const [deletingTask, setDeletingTask] = useState<Story | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const tasks = stories.filter(story => story.itemType === 'Task');

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
  });

  const watchedStartDate = useWatch({ control: form.control, name: 'startDate' });
  const watchedEffortDays = useWatch({ control: form.control, name: 'effortDays' });

  useEffect(() => {
    if (watchedStartDate && watchedEffortDays !== undefined && watchedEffortDays > 0) {
      const newEndDate = addDays(watchedStartDate, watchedEffortDays);
      form.setValue('endDate', newEndDate, { shouldValidate: true });
    }
  }, [watchedStartDate, watchedEffortDays, form]);

  useEffect(() => {
    if (isDialogOpen) {
      if (editingTask) {
        form.reset({
          title: editingTask.title,
          description: editingTask.description || '',
          acceptanceCriteria: editingTask.acceptanceCriteria || '',
          epicId: editingTask.epicId || 'unassigned',
          assigneeId: editingTask.assigneeId || 'unassigned',
          status: editingTask.status,
          sprintId: editingTask.sprintId || 'backlog',
          effortDays: editingTask.effortDays,
          startDate: editingTask.startDate ? new Date(editingTask.startDate) : undefined,
          endDate: editingTask.endDate ? new Date(editingTask.endDate) : undefined,
        });
      } else {
        form.reset({
          title: '',
          description: '',
          acceptanceCriteria: '',
          epicId: 'unassigned',
          assigneeId: 'unassigned',
          status: 'To Do',
          sprintId: 'backlog',
          effortDays: 0,
        });
      }
    }
  }, [isDialogOpen, editingTask, form]);

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
        epicId: values.epicId === 'unassigned' ? undefined : values.epicId, // Related story
        status: values.status,
        sprintId: values.sprintId === 'backlog' ? null : values.sprintId,
        effortDays: values.effortDays,
        startDate: values.startDate?.toISOString(),
        endDate: values.endDate?.toISOString(),
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead className="w-[30%]">Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Effort</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => {
              const assignee = employees.find(e => e.id === task.assigneeId);
              return (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.storyId}</TableCell>
                  <TableCell>{task.title}</TableCell>
                  <TableCell>
                    <Badge className={cn('font-semibold', statusStyles[task.status])}>
                      {task.status}
                    </Badge>
                  </TableCell>
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
                  <TableCell>{task.startDate ? format(new Date(task.startDate), 'PPP') : 'N/A'}</TableCell>
                  <TableCell>{task.endDate ? format(new Date(task.endDate), 'PPP') : 'N/A'}</TableCell>
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
                        <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                            <FormControl>
                            <SelectTrigger><SelectValue placeholder="Link to a story" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="unassigned">None</SelectItem>
                            {stories.filter(s => s.itemType === 'Story').map(story => (
                                <SelectItem key={story.id} value={story.id}>[{story.storyId}] {story.title}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="startDate" render={({ field }) => (
                        <FormItem className="flex flex-col pt-2">
                            <FormLabel>Start Date</FormLabel>
                            <DatePicker date={field.value} setDate={field.onChange} />
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
                          <Input readOnly value={field.value ? format(field.value, 'PPP') : 'N/A'} />
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
