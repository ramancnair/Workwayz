

'use client';

import { useState, useEffect } from 'react';
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
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
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
  assigneeId: z.string().optional(),
  status: z.enum(['To Do', 'In Progress', 'Done']),
  sprintId: z.string().optional(),
  criticality: z.enum(bugCriticalities).optional(),
});


export default function BugListPage() {
  const { stories, employees, sprints, updateStory } = useProject();
  const { toast } = useToast();
  const [editingBug, setEditingBug] = useState<Story | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const bugs = stories.filter(story => story.itemType === 'Bug');

  const form = useForm<z.infer<typeof bugFormSchema>>({
    resolver: zodResolver(bugFormSchema),
  });

  useEffect(() => {
    if (editingBug) {
      form.reset({
        title: editingBug.title,
        description: editingBug.description || '',
        acceptanceCriteria: editingBug.acceptanceCriteria || '',
        epicId: editingBug.epicId || 'unassigned',
        assigneeId: editingBug.assigneeId || 'unassigned',
        status: editingBug.status,
        sprintId: editingBug.sprintId || 'backlog',
        criticality: editingBug.criticality || 'Medium',
      });
    } else {
      form.reset();
    }
  }, [editingBug, form]);
  
  const handleEditSubmit = async (values: z.infer<typeof bugFormSchema>) => {
    if (!editingBug) return;
    setIsSubmitting(true);
    
    const success = await updateStory(editingBug.id, {
        title: values.title,
        description: values.description,
        acceptanceCriteria: values.acceptanceCriteria,
        assigneeId: values.assigneeId === 'unassigned' ? undefined : values.assigneeId,
        epicId: values.epicId === 'unassigned' ? undefined : values.epicId, // Related story
        status: values.status,
        sprintId: values.sprintId === 'backlog' ? null : values.sprintId,
        criticality: values.criticality,
    });
    
    if (success) {
      toast({ title: "Success", description: "Bug updated successfully." });
      setEditingBug(null);
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not update bug." });
    }
    setIsSubmitting(false);
  };


  return (
    <>
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="Bug List" description="A list of all bugs reported in the project." />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criticality</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Related Story</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bugs.map((bug) => {
              const assignee = employees.find(e => e.id === bug.assigneeId);
              const relatedStory = stories.find(s => s.id === bug.epicId); // epicId holds related story for bugs
              return (
                <TableRow key={bug.id}>
                  <TableCell className="font-medium">{bug.storyId}</TableCell>
                  <TableCell>
                      <button
                        onClick={() => setEditingBug(bug)}
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

    <Dialog open={!!editingBug} onOpenChange={(isOpen) => !isOpen && setEditingBug(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Bug</DialogTitle>
            <DialogDescription>Make changes to the bug details here.</DialogDescription>
          </DialogHeader>
          {editingBug && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleEditSubmit)} className="space-y-4">
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
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
