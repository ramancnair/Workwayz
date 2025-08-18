

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogTrigger,
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Story, StoryStatus, BugCriticality } from '@/types';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from "@/hooks/use-toast";
import { Bot, PlusCircle, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const statusStyles: Record<StoryStatus, string> = {
  'To Do': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  'In Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Done': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

const criticalityStyles: Record<BugCriticality, string> = {
    'Low': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    'Medium': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'High': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    'Critical': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const bugCriticalities: BugCriticality[] = ['Low', 'Medium', 'High', 'Critical'];

const bugFormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
  epicId: z.string().optional(), // Represents the related story
  reporterId: z.string().optional(),
  assigneeId: z.string().optional(),
  status: z.enum(['To Do', 'In Progress', 'Done']),
  sprintId: z.string().optional(),
  criticality: z.enum(bugCriticalities).optional(),
  environmentId: z.string().optional(),
  attachments: z.string().optional(),
});


export default function BugListPage() {
  const { stories, employees, sprints, addStory, updateStory, deleteStory, environments, autoGenerateBugs } = useProject();
  const { toast } = useToast();
  const [editingBug, setEditingBug] = useState<Story | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const bugs = stories.filter(story => story.itemType === 'Bug');
  const [selectedBugs, setSelectedBugs] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const [isAutoGenOpen, setIsAutoGenOpen] = useState(false);
  const [isAutoGenSubmitting, setIsAutoGenSubmitting] = useState(false);
  const sortedEnvironments = [...environments].sort((a,b) => a.order - b.order);

  const autoGenFormSchema = useMemo(() => {
    const shape: Record<string, z.ZodNumber> = {};
    sortedEnvironments.forEach(env => {
      shape[env.id] = z.coerce.number().min(0).default(0);
    });
    return z.object(shape);
  }, [sortedEnvironments]);

  const autoGenForm = useForm<z.infer<typeof autoGenFormSchema>>({
    resolver: zodResolver(autoGenFormSchema),
    defaultValues: sortedEnvironments.reduce((acc, env) => {
        acc[env.id] = 0;
        return acc;
    }, {} as Record<string, number>),
  });

  const onAutoGenSubmit = async (values: z.infer<typeof autoGenFormSchema>) => {
    setIsAutoGenSubmitting(true);
    const success = await autoGenerateBugs(values);
    if(success) {
        toast({ title: "Success", description: "Bugs generated successfully."});
        setIsAutoGenOpen(false);
    } else {
        toast({ variant: "destructive", title: "Error", description: "Could not generate bugs." });
    }
    setIsAutoGenSubmitting(false);
  }

  const form = useForm<z.infer<typeof bugFormSchema>>({
    resolver: zodResolver(bugFormSchema),
  });

  useEffect(() => {
    if (isDialogOpen) {
      if (editingBug) {
        form.reset({
          title: editingBug.title,
          description: editingBug.description || '',
          acceptanceCriteria: editingBug.acceptanceCriteria || '',
          epicId: editingBug.epicId || 'unassigned',
          reporterId: editingBug.reporterId || 'unassigned',
          assigneeId: editingBug.assigneeId || 'unassigned',
          status: editingBug.status,
          sprintId: editingBug.sprintId || 'backlog',
          criticality: editingBug.criticality || 'Medium',
          environmentId: editingBug.environmentId || 'unassigned',
          attachments: editingBug.attachments || '',
        });
      } else {
         form.reset({
            title: '',
            description: '',
            acceptanceCriteria: '',
            epicId: 'unassigned',
            reporterId: 'unassigned',
            assigneeId: 'unassigned',
            status: 'To Do',
            sprintId: 'backlog',
            criticality: 'Medium',
            environmentId: 'unassigned',
            attachments: '',
        });
      }
    }
  }, [isDialogOpen, editingBug, form]);
  
  const handleDialogOpen = (bug: Story | null) => {
    setEditingBug(bug);
    setIsDialogOpen(true);
  }
  
  const handleFormSubmit = async (values: z.infer<typeof bugFormSchema>) => {
    setIsSubmitting(true);
    let success = false;
    
    if (editingBug) {
        success = await updateStory(editingBug.id, {
            title: values.title,
            description: values.description,
            acceptanceCriteria: values.acceptanceCriteria,
            reporterId: values.reporterId === 'unassigned' ? undefined : values.reporterId,
            assigneeId: values.assigneeId === 'unassigned' ? undefined : values.assigneeId,
            epicId: values.epicId === 'unassigned' ? undefined : values.epicId,
            status: values.status,
            sprintId: values.sprintId === 'backlog' ? null : values.sprintId,
            criticality: values.criticality,
            environmentId: values.environmentId === 'unassigned' ? undefined : values.environmentId,
            attachments: values.attachments,
        });
    } else {
        success = await addStory({
            itemType: 'Bug',
            title: values.title,
            description: values.description,
            acceptanceCriteria: values.acceptanceCriteria,
            reporterId: values.reporterId === 'unassigned' ? undefined : values.reporterId,
            assigneeId: values.assigneeId === 'unassigned' ? undefined : values.assigneeId,
            epicId: values.epicId === 'unassigned' ? undefined : values.epicId,
            status: values.status,
            sprintId: values.sprintId === 'backlog' ? null : values.sprintId,
            criticality: values.criticality,
            environmentId: values.environmentId === 'unassigned' ? undefined : values.environmentId,
            attachments: values.attachments,
        });
    }
    
    if (success) {
      toast({ title: "Success", description: `Bug ${editingBug ? 'updated' : 'added'} successfully.` });
      setIsDialogOpen(false);
      setEditingBug(null);
    } else {
      toast({ variant: "destructive", title: "Error", description: `Could not ${editingBug ? 'update' : 'add'} bug.` });
    }
    setIsSubmitting(false);
  };
  
  const handleBulkDeleteConfirm = async () => {
    if (selectedBugs.length === 0) return;
    
    const promises = selectedBugs.map(id => deleteStory(id));
    const results = await Promise.all(promises);

    const successCount = results.filter(Boolean).length;
    if (successCount > 0) {
        toast({ title: "Success", description: `${successCount} bug(s) moved to trash.` });
    }
    if (successCount < selectedBugs.length) {
        toast({ variant: "destructive", title: "Error", description: `Could not delete ${selectedBugs.length - successCount} bug(s).` });
    }
    
    setSelectedBugs([]);
    setShowBulkDeleteConfirm(false);
  };

  return (
    <>
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="Bug List" description="A list of all bugs reported in the project.">
        <Dialog open={isAutoGenOpen} onOpenChange={setIsAutoGenOpen}>
          <DialogTrigger asChild>
              <Button variant="outline">
                  <Bot className="mr-2 h-4 w-4" />
                  Bugs Autogen
              </Button>
          </DialogTrigger>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Auto-Generate Bugs</DialogTitle>
                  <DialogDescription>Enter the number of bugs to create for each environment.</DialogDescription>
              </DialogHeader>
              <Form {...autoGenForm}>
                  <form onSubmit={autoGenForm.handleSubmit(onAutoGenSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          {sortedEnvironments.map(env => (
                              <FormField
                                  key={env.id}
                                  control={autoGenForm.control}
                                  name={env.id}
                                  render={({ field }) => (
                                  <FormItem>
                                      <FormLabel>{env.name}</FormLabel>
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
                              {isAutoGenSubmitting ? 'Generating...' : 'Generate Bugs'}
                          </Button>
                      </DialogFooter>
                  </form>
              </Form>
          </DialogContent>
        </Dialog>
        {selectedBugs.length > 0 && (
            <Button variant="destructive" onClick={() => setShowBulkDeleteConfirm(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected ({selectedBugs.length})
            </Button>
        )}
        <Button onClick={() => handleDialogOpen(null)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Bug
        </Button>
      </PageHeader>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                    checked={bugs.length > 0 && selectedBugs.length === bugs.length}
                    onCheckedChange={(value) =>
                        setSelectedBugs(value ? bugs.map(bug => bug.id) : [])
                    }
                    aria-label="Select all"
                />
              </TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criticality</TableHead>
              <TableHead>Environment</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Related Story</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bugs.map((bug) => {
              const assignee = employees.find(e => e.id === bug.assigneeId);
              const relatedStory = stories.find(s => s.id === bug.epicId); // epicId holds related story for bugs
              const environment = environments.find(e => e.id === bug.environmentId);
              return (
                <TableRow key={bug.id} data-state={selectedBugs.includes(bug.id) && "selected"}>
                  <TableCell>
                    <Checkbox
                        checked={selectedBugs.includes(bug.id)}
                        onCheckedChange={(value) =>
                            setSelectedBugs(
                                value
                                ? [...selectedBugs, bug.id]
                                : selectedBugs.filter((id) => id !== bug.id)
                            )
                        }
                        aria-label="Select row"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{bug.storyId}</TableCell>
                  <TableCell>
                      <button
                        onClick={() => handleDialogOpen(bug)}
                        className="text-left font-medium text-primary hover:underline"
                      >
                          {bug.title}
                      </button>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('font-semibold', statusStyles[bug.status])}>
                      {bug.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {bug.criticality && (
                      <Badge className={cn('font-semibold', criticalityStyles[bug.criticality])}>
                        {bug.criticality}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {environment ? (
                       <Badge variant="outline">{environment.name}</Badge>
                    ) : 'N/A'}
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
                   <TableCell>
                    {relatedStory ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                              <Badge variant="secondary">{relatedStory.storyId}</Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{relatedStory.title}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ): 'N/A'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>

    <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) setEditingBug(null); setIsDialogOpen(open); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBug ? 'Edit Bug' : 'Add New Bug'}</DialogTitle>
            <DialogDescription>
              {editingBug ? 'Make changes to the bug details here.' : 'Log a new bug found during testing.'}
            </DialogDescription>
          </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Bug title" {...field} />
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
                      <FormLabel>Description (Steps to Reproduce)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe the steps to reproduce the bug..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
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
                    control={form.control}
                    name="reporterId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reporter</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select a reporter" /></SelectTrigger>
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
                            {stories.filter(s => s.itemType === 'Requirement/Story').map(story => (
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
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
                      control={form.control}
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
                </div>
                 <FormField
                  control={form.control}
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
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move {selectedBugs.length} bug(s) to the trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDeleteConfirm}
              className={cn(buttonVariants({ variant: 'destructive' }))}
            >
              Delete Selected
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}




