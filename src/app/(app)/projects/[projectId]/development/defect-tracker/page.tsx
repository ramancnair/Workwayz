"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { useProject } from '@/context/ProjectContext';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { parseISO } from 'date-fns';
import {
  Edit,
  ChevronDown,
  Bug,
  Circle,
  Paperclip
} from 'lucide-react';

import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import type { Story, StoryStatus, Priority, BugSeverity, User } from '@/types';
import { cn } from '@/lib/utils';

// Swimlanes config with requested styling
const BUG_COLUMNS = [
  { id: 'in-triage', name: 'In Triage', colorClass: 'border-t-4 border-t-gray-400 bg-gray-500/5' },
  { id: 'defect-backlog', name: 'Defect Backlog', colorClass: 'border-t-4 border-t-orange-500 bg-orange-500/5' },
  { id: 'in-progress', name: 'In Progress', colorClass: 'border-t-4 border-t-blue-500 bg-blue-500/5' },
  { id: 'retest', name: 'Retest', colorClass: 'border-t-4 border-t-indigo-500 bg-indigo-500/5' },
  { id: 'closed', name: 'Closed', colorClass: 'border-t-4 border-t-green-500 bg-green-500/5' },
];

const severities: BugSeverity[] = ['Critical', 'High', 'Medium', 'Low'];
const priorities: Priority[] = ['Critical', 'High', 'Medium', 'Low', 'Backburner'];

const severityStyles: Record<BugSeverity, string> = {
  'Critical': 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
  'High': 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
  'Medium': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300',
  'Low': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
};

const priorityStyles: Record<Priority, string> = {
  'Critical': 'text-red-500 fill-red-500',
  'High': 'text-orange-400 fill-orange-400',
  'Medium': 'text-yellow-500 fill-yellow-500',
  'Low': 'text-green-500 fill-green-500',
  'Backburner': 'text-gray-500 fill-gray-500',
};

const bugFormSchema = z.object({
  title: z.string().min(1, 'Title is required.').max(60, 'Title cannot exceed 60 characters.'),
  description: z.string().max(300, 'Description cannot exceed 300 characters.').optional(),
  acceptanceCriteria: z.string().optional(),
  relatedTestCaseId: z.string().optional(),
  reporterId: z.string().optional(),
  assigneeId: z.string().optional(),
  status: z.string(),
  severity: z.enum(['Critical', 'High', 'Medium', 'Low']).optional(),
  sprintId: z.string().optional(),
  releaseId: z.string().optional(),
  attachments: z.string().optional(),
  createdAt: z.date().optional(),
  closedAt: z.date().optional(),
});

function BugCard({
  bug,
  assignee,
  columns,
  onStatusChange,
  onEdit,
}: {
  bug: Story;
  assignee?: User;
  columns: typeof BUG_COLUMNS;
  onStatusChange: (newStatus: string) => void;
  onEdit: () => void;
}) {
  return (
    <Card className="bg-card">
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Bug className="h-4 w-4 text-red-500 flex-shrink-0" />
              {bug.priority && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="focus:outline-none">
                        <Circle className={cn("h-3 w-3 cursor-pointer", priorityStyles[bug.priority])} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{bug.priority} Priority</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <p className="text-xs font-semibold text-muted-foreground truncate">{bug.storyId}</p>
            </div>
            <p className="font-semibold break-words text-sm">{bug.title}</p>
          </div>
          <div className="flex items-center flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap pt-1">
          {bug.severity && (
            <Badge className={cn("text-[10px] px-2 py-0.5 font-medium border-none", severityStyles[bug.severity])}>
              {bug.severity}
            </Badge>
          )}
          {bug.attachments && bug.attachments.split('\n').filter(Boolean).length > 0 && (
            <div className="flex items-center gap-0.5 text-xs text-muted-foreground" title="Attachments">
              <Paperclip className="h-3 w-3" />
              <span>{bug.attachments.split('\n').filter(Boolean).length}</span>
            </div>
          )}
        </div>
      </div>

      <CardFooter className="flex justify-between items-center p-4 pt-0 gap-2">
        <div className="flex items-center gap-2 flex-shrink-0">
          {assignee && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={assignee.avatar} alt={`${assignee.firstName} ${assignee.lastName}`} />
                    <AvatarFallback>{assignee.firstName?.charAt(0)}</AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{assignee.firstName} {assignee.lastName}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs px-2">
              Move <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {columns.filter(col => col.name !== bug.status).map(col => (
              <DropdownMenuItem key={col.id} onClick={() => onStatusChange(col.name)}>
                Move to {col.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}

export default function DefectTrackerPage() {
  const {
    stories,
    sprints,
    moveStoryStatus,
    employees: users,
    updateStory,
    deleteStory,
    releasesAndMilestones,
    testCases
  } = useProject();
  const { toast } = useToast();

  const [selectedAssigneeId, setSelectedAssigneeId] = useState('all');
  const [selectedBug, setSelectedBug] = useState<Story | null>(null);
  const [deletingBug, setDeletingBug] = useState<Story | null>(null);
  const [isSubmitInProgress, setIsSubmitInProgress] = useState(false);

  const releases = useMemo(() => releasesAndMilestones.filter(r => r.itemType === 'Release'), [releasesAndMilestones]);
  const activeTestCaseOptions = useMemo(() => testCases.filter(tc => !tc.isDeleted).map(tc => ({ value: tc.id, label: `[${tc.testCaseId}] ${tc.title}` })), [testCases]);

  const editBugForm = useForm<z.infer<typeof bugFormSchema>>({
    resolver: zodResolver(bugFormSchema),
  });

  const handleOpenEdit = useCallback((bug: Story) => {
    setSelectedBug(bug);
    editBugForm.reset({
      title: bug.title || '',
      description: bug.description || '',
      acceptanceCriteria: bug.acceptanceCriteria || '',
      relatedTestCaseId: bug.relatedTestCaseId || '',
      reporterId: bug.reporterId || '',
      assigneeId: bug.assigneeId || '',
      status: bug.status || 'In Triage',
      severity: bug.severity || 'Medium',
      sprintId: bug.sprintId || '',
      releaseId: bug.releaseId || '',
      attachments: bug.attachments || '',
      createdAt: typeof bug.createdAt === 'string' ? parseISO(bug.createdAt) : new Date(),
      closedAt: typeof bug.closedAt === 'string' ? parseISO(bug.closedAt) : undefined,
    });
  }, [editBugForm]);

  const onFormSubmit = async (values: z.infer<typeof bugFormSchema>) => {
    if (!selectedBug) return;
    setIsSubmitInProgress(true);

    const success = await updateStory(selectedBug.id, {
      ...values,
      createdAt: values.createdAt ? values.createdAt.toISOString() : undefined,
      closedAt: values.closedAt ? values.closedAt.toISOString() : undefined,
    });

    if (success) {
      setSelectedBug(null);
      toast({ title: "Defect Updated", description: "The defect was updated successfully." });
    } else {
      toast({ variant: "destructive", title: "Error", description: "Failed to update defect." });
    }
    setIsSubmitInProgress(false);
  };

  const currentSprint = useMemo(() => sprints.find((s) => s.isCurrent), [sprints]);

  const sprintBugs = useMemo(() => {
    const baseBugs = currentSprint
      ? stories.filter(story => story.itemType === 'Bug' && story.sprintId === currentSprint.id)
      : [];

    return selectedAssigneeId === 'all'
      ? baseBugs
      : baseBugs.filter(bug => bug.assigneeId === selectedAssigneeId);
  }, [stories, currentSprint, selectedAssigneeId]);

  const sprintAssigneeIds = useMemo(() => {
    const ids = new Set<string>();
    stories.forEach(story => {
      if (story.itemType === 'Bug' && story.sprintId === currentSprint?.id && story.assigneeId) {
        ids.add(story.assigneeId);
      }
    });
    return ids;
  }, [stories, currentSprint]);

  const sprintAssignees = useMemo(() => {
    return users.filter(emp => sprintAssigneeIds.has(emp.id));
  }, [users, sprintAssigneeIds]);

  if (!currentSprint) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 h-full flex flex-col">
        <PageHeader title="Defect Tracker" description="No active sprint found."></PageHeader>
        <div className="flex flex-1 items-center justify-center bg-muted/50 rounded-lg">
          <p className="text-lg text-muted-foreground">There is no active sprint. Please set a current sprint in the backlog.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 h-full flex flex-col min-w-0 overflow-hidden">
        <PageHeader title={`Defect Tracker: ${currentSprint.title}`} description="Track and update bug resolutions in color-coded swim lanes.">
          <div className="flex items-center gap-2">
            <div className="grid gap-2">
              <Label htmlFor="bug-assignee-filter">Assignee</Label>
              <Select value={selectedAssigneeId} onValueChange={setSelectedAssigneeId}>
                <SelectTrigger id="bug-assignee-filter" className="w-[200px]">
                  <SelectValue placeholder="Filter by assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  {sprintAssignees.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </PageHeader>

        <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
          {BUG_COLUMNS.map((column) => {
            const itemsInColumn = sprintBugs.filter(bug => {
              const bugStatus = bug.status || 'In Triage';
              return bugStatus.toLowerCase() === column.name.toLowerCase();
            });

            return (
              <div key={column.id} className={cn("rounded-lg p-4 h-full flex flex-col min-w-[320px] w-1/5", column.colorClass)}>
                <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">
                  <span className="flex items-center">
                    {column.name}
                  </span>
                  <span className="bg-primary text-primary-foreground h-6 w-6 rounded-full flex items-center justify-center text-sm">
                    {itemsInColumn.length}
                  </span>
                </h3>
                <div className="flex-1 space-y-4 overflow-y-auto min-w-0">
                  {itemsInColumn.map((bug) => {
                    const assignee = users.find(u => u.id === bug.assigneeId);
                    return (
                      <BugCard
                        key={bug.id}
                        bug={bug}
                        assignee={assignee}
                        columns={BUG_COLUMNS}
                        onStatusChange={(newStatus) => moveStoryStatus(bug.id, newStatus as StoryStatus)}
                        onEdit={() => handleOpenEdit(bug)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Bug Dialog */}
      <Dialog open={!!selectedBug} onOpenChange={(isOpen) => !isOpen && setSelectedBug(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col overflow-hidden" bypassScrollWrapper={true}>
          <DialogHeader>
            <DialogTitle>Edit Defect</DialogTitle>
            <DialogDescription>Make changes to your defect here. Click save when you're done.</DialogDescription>
          </DialogHeader>

          <Form {...editBugForm}>
            <form onSubmit={editBugForm.handleSubmit(onFormSubmit)} className="flex flex-col h-full max-h-[90vh] overflow-hidden">
              <div className="flex-1 overflow-y-auto px-1 py-4 space-y-4">
                <FormField
                  control={editBugForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter defect title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editBugForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe the issue..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editBugForm.control}
                    name="severity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Severity</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Set severity" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {severities.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editBugForm.control}
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
                            {BUG_COLUMNS.map(col => <SelectItem key={col.id} value={col.name}>{col.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editBugForm.control}
                    name="reporterId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reporter</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Set reporter" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {users.map(u => <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editBugForm.control}
                    name="assigneeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assignee</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Set assignee" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {users.map(u => <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editBugForm.control}
                    name="releaseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Release</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Link to release" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {releases.map(r => <SelectItem key={r.id} value={r.id}>{r.name || r.releaseId}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editBugForm.control}
                    name="relatedTestCaseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Related Test Case</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Link to test case" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="unassigned">None</SelectItem>
                            {activeTestCaseOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editBugForm.control}
                    name="createdAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Created On</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            disabled
                            value={field.value instanceof Date && !isNaN(field.value.getTime()) ? field.value.toISOString().split('T')[0] : ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(val ? new Date(val) : undefined);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editBugForm.control}
                    name="closedAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Closed On</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            value={field.value instanceof Date && !isNaN(field.value.getTime()) ? field.value.toISOString().split('T')[0] : ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.onChange(val ? new Date(val) : undefined);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editBugForm.control}
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
              </div>

              <DialogFooter className="mt-4 flex justify-between gap-2 border-t pt-4">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setDeletingBug(selectedBug)}
                >
                  Delete Defect
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setSelectedBug(null)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitInProgress}>
                    {isSubmitInProgress ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingBug} onOpenChange={(isOpen) => !isOpen && setDeletingBug(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the defect and remove it from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingBug) {
                  deleteStory(deletingBug.id).then(success => {
                    if (success) {
                      setDeletingBug(null);
                      setSelectedBug(null);
                      toast({ title: "Defect Deleted", description: "The defect was deleted successfully." });
                    } else {
                      toast({ variant: "destructive", title: "Error", description: "Failed to delete defect." });
                    }
                  });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
