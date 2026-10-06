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
  Paperclip,
  Search
} from 'lucide-react';

import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getUserInitials } from '@/lib/utils';
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
import { isBugWorkItem, isPbiWorkItem } from '@/types';
import { cn, matchSearchQuery } from '@/lib/utils';

// Swimlanes config with requested styling
const BUG_COLUMNS = [
  { id: 'to-triage', name: 'To Triage', colorClass: 'border-t-4 border-t-cyan-500 bg-cyan-500/5' },
  { id: 'open', name: 'Open', colorClass: 'border-t-4 border-t-blue-500 bg-blue-500/5' },
  { id: 'in-progress', name: 'In Progress', colorClass: 'border-t-4 border-t-amber-500 bg-amber-500/5' },
  { id: 'resolved', name: 'Resolved', colorClass: 'border-t-4 border-t-purple-500 bg-purple-500/5' },
  { id: 'reopened', name: 'Reopened', colorClass: 'border-t-4 border-t-rose-500 bg-rose-500/5' },
  { id: 'closed', name: 'Closed', colorClass: 'border-t-4 border-t-emerald-500 bg-emerald-500/5' },
];

const getSwimlaneForStatus = (status: string): string => {
  const s = (status || 'To Triage').toLowerCase();
  if (s === 'to triage' || s === 'to-triage' || s === 'new' || s === 'in triage' || s === 'in-triage') return 'to triage';
  if (s === 'open') return 'open';
  if (s === 'in progress' || s === 'in-progress') return 'in progress';
  if (s === 'resolved' || s === 'retest') return 'resolved';
  if (s === 'reopened' || s === 'defect backlog' || s === 'defect-backlog') return 'reopened';
  if (s === 'closed' || s === 'done') return 'closed';
  return 'to triage';
};

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
  parentStoryId: z.string().optional(),
  relatedTestCaseId: z.string().optional(),
  reporterId: z.string().optional(),
  assigneeId: z.string().optional(),
  status: z.string(),
  resolution: z.string().optional(),
  severity: z.enum(['Critical', 'High', 'Medium', 'Low']).optional(),
  sprintId: z.string().optional(),
  attachments: z.string().optional(),
  relatedBugId: z.string().optional(),
  releaseId: z.string().optional(),
  foundInTestPlanId: z.string().optional(),
  epicId: z.string().optional(),
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
    <Card 
      className="bg-card cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onEdit}
    >
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Bug className="h-4 w-4 text-red-500 flex-shrink-0" />
              {bug.priority && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button 
                        type="button" 
                        className="focus:outline-none"
                        onClick={(e) => e.stopPropagation()}
                      >
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
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
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
          {bug.resolution && (
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-medium">
              {bug.resolution}
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
        <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {assignee && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={assignee.avatar} alt={`${assignee.firstName} ${assignee.lastName}`} />
                    <AvatarFallback className="text-[10px]">{getUserInitials(assignee.firstName, assignee.lastName)}</AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{assignee.firstName} {assignee.lastName}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs px-2">
                Move <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {columns.filter(col => col.id !== getSwimlaneForStatus(bug.status)).map(col => (
                <DropdownMenuItem key={col.id} onClick={() => onStatusChange(col.name)}>
                  Move to {col.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardFooter>
    </Card>
  );
}

export default function DefectTrackerPage() {
  const {
    stories,
    epics,
    sprints,
    moveStoryStatus,
    employees: users,
    updateStory,
    deleteStory,
    releasesAndMilestones,
    testCases,
    testPlans
  } = useProject();
  const { toast } = useToast();

  const [selectedAssigneeId, setSelectedAssigneeId] = useState('all');
  const [selectedSprintId, setSelectedSprintId] = useState<string>('all');
  const [filterType, setFilterType] = useState<'sprint' | 'testCycle'>('sprint');
  const [selectedTestCycleId, setSelectedTestCycleId] = useState<string>('all');
  const [selectedBug, setSelectedBug] = useState<Story | null>(null);
  const [deletingBug, setDeletingBug] = useState<Story | null>(null);
  const [isSubmitInProgress, setIsSubmitInProgress] = useState(false);
  const [parentStoryInputText, setParentStoryInputText] = useState('');
  const [testCaseInputText, setTestCaseInputText] = useState('');
  const [relatedBugInputText, setRelatedBugInputText] = useState('');

  const bugs = useMemo(() => stories.filter(s => isBugWorkItem(s.itemType)), [stories]);
  const releases = useMemo(() => releasesAndMilestones.filter(r => r.itemType === 'Release'), [releasesAndMilestones]);
  const parentStoryOptions = useMemo(() => stories
    .filter(s => isPbiWorkItem(s.itemType))
    .sort((a, b) => (a.storyId || '').localeCompare(b.storyId || '', undefined, { numeric: true }))
    .map(s => ({
      value: s.id,
      label: `[${s.storyId || 'REQ'}] ${s.title}`,
    })), [stories]);
  const testCaseOptions = useMemo(() => testCases.map(tc => ({
    value: tc.id,
    label: `[${tc.testCaseId}] ${tc.title}`,
  })), [testCases]);
  const relatedBugOptions = useMemo(() => bugs.map(b => ({
    value: b.id,
    label: `[${b.storyId}] ${b.title}`,
  })), [bugs]);

  const editBugForm = useForm<z.infer<typeof bugFormSchema>>({
    resolver: zodResolver(bugFormSchema),
  });

  const handleOpenEdit = useCallback((bug: Story) => {
    setSelectedBug(bug);
    const parentStory = stories.find(s => s.id === bug.parentStoryId);
    setParentStoryInputText(parentStory ? `[${parentStory.storyId || 'REQ'}] ${parentStory.title}` : '');
    const testCase = testCases.find(tc => tc.id === bug.relatedTestCaseId);
    setTestCaseInputText(testCase ? `[${testCase.testCaseId}] ${testCase.title}` : '');
    const relBug = bugs.find(b => b.id === bug.relatedBugId);
    setRelatedBugInputText(relBug ? `[${relBug.storyId}] ${relBug.title}` : '');

    editBugForm.reset({
      title: (bug.title || '').slice(0, 60),
      description: (bug.description || '').slice(0, 300),
      acceptanceCriteria: bug.acceptanceCriteria || '',
      parentStoryId: bug.parentStoryId || 'unassigned',
      relatedTestCaseId: bug.relatedTestCaseId || 'unassigned',
      reporterId: bug.reporterId || 'unassigned',
      assigneeId: bug.assigneeId || 'unassigned',
      status: (bug.status || 'To Triage') as StoryStatus,
      resolution: bug.resolution || 'none',
      severity: bug.severity || 'Medium',
      sprintId: bug.sprintId || 'backlog',
      foundInTestPlanId: bug.foundInTestPlanId || 'unassigned',
      relatedBugId: bug.relatedBugId || 'unassigned',
      attachments: bug.attachments || '',
      releaseId: bug.releaseId || 'unassigned',
      epicId: bug.epicId || 'unassigned',
      createdAt: typeof bug.createdAt === 'string' ? parseISO(bug.createdAt) : undefined,
      closedAt: typeof bug.closedAt === 'string' ? parseISO(bug.closedAt) : undefined,
    });
  }, [editBugForm, testCases, bugs, stories]);

  const onFormSubmit = async (values: z.infer<typeof bugFormSchema>) => {
    if (!selectedBug) return;
    setIsSubmitInProgress(true);

    const payload: Partial<Story> = {
      title: values.title,
      description: values.description || '',
      acceptanceCriteria: values.acceptanceCriteria,
      parentStoryId: values.parentStoryId === 'unassigned' ? undefined : values.parentStoryId,
      reporterId: values.reporterId === 'unassigned' ? undefined : values.reporterId,
      assigneeId: values.assigneeId === 'unassigned' ? undefined : values.assigneeId,
      relatedTestCaseId: values.relatedTestCaseId === 'unassigned' ? undefined : values.relatedTestCaseId,
      status: values.status,
      resolution: values.resolution === 'none' ? undefined : values.resolution,
      severity: values.severity as BugSeverity | undefined,
      sprintId: values.sprintId === 'backlog' ? null : values.sprintId,
      foundInTestPlanId: values.foundInTestPlanId === 'unassigned' ? undefined : values.foundInTestPlanId,
      relatedBugId: values.relatedBugId === 'unassigned' ? undefined : values.relatedBugId,
      attachments: values.attachments,
      releaseId: values.releaseId === 'unassigned' ? undefined : values.releaseId,
      epicId: values.epicId === 'unassigned' ? undefined : values.epicId,
      createdAt: values.createdAt ? values.createdAt.toISOString() : undefined,
      closedAt: values.status === 'Closed' ? (values.closedAt ? values.closedAt.toISOString() : new Date().toISOString()) : null as any,
    };

    const success = await updateStory(selectedBug.id, payload);

    if (success) {
      setSelectedBug(null);
      toast({ title: "Success", description: "Defect updated successfully." });
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not update defect." });
    }
    setIsSubmitInProgress(false);
  };

  const currentSprint = useMemo(() => sprints.find((s) => s.isCurrent), [sprints]);

  const sprintBugs = useMemo(() => {
    const baseBugs = currentSprint
      ? stories.filter(story => isBugWorkItem(story.itemType) && story.sprintId === currentSprint.id)
      : [];

    return selectedAssigneeId === 'all'
      ? baseBugs
      : baseBugs.filter(bug => bug.assigneeId === selectedAssigneeId);
  }, [stories, currentSprint, selectedAssigneeId]);

  const sprintAssigneeIds = useMemo(() => {
    const ids = new Set<string>();
    stories.forEach(story => {
      if (isBugWorkItem(story.itemType) && story.sprintId === currentSprint?.id && story.assigneeId) {
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
              return getSwimlaneForStatus(bug.status) === column.name.toLowerCase();
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
                        onStatusChange={(newStatus) => moveStoryStatus?.(bug.id, newStatus as StoryStatus)}
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
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0" bypassScrollWrapper={true}>
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Edit Defect</DialogTitle>
            <DialogDescription>
              Make changes to the defect details here.
            </DialogDescription>
          </DialogHeader>

          <Form {...editBugForm}>
            <form onSubmit={editBugForm.handleSubmit(onFormSubmit)} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4">
                <FormField
                  control={editBugForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Defect title" {...field} maxLength={60} />
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
                      <FormLabel>Description (Steps to Reproduce)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe the steps to reproduce the defect..." {...field} maxLength={300} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editBugForm.control}
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
                    control={editBugForm.control}
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
                            {[...users].filter(emp => !emp.isDeleted && emp.isEnabled !== false && !!emp.empId && emp.empId.trim() !== '').sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, undefined, { numeric: true, sensitivity: 'base' })).map(emp => (
                              <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.empId.trim()})</SelectItem>
                            ))}
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
                            <SelectTrigger><SelectValue placeholder="Assign someone" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {[...users].filter(emp => !emp.isDeleted && emp.isEnabled !== false && !!emp.empId && emp.empId.trim() !== '').sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, undefined, { numeric: true, sensitivity: 'base' })).map(emp => (
                              <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.empId.trim()})</SelectItem>
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
                    control={editBugForm.control}
                    name="parentStoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Related Story</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                              list="parent-story-options-dev-tracker"
                              placeholder="Search for a story..."
                              className="pl-9"
                              value={parentStoryInputText}
                              onChange={(e) => {
                                const text = e.target.value;
                                setParentStoryInputText(text);
                                const matchingOption = parentStoryOptions.find(opt => opt.label === text);
                                field.onChange(matchingOption ? matchingOption.value : 'unassigned');
                              }}
                              onBlur={() => {
                                const matchingOption = parentStoryOptions.find(opt => opt.label === parentStoryInputText);
                                if (!matchingOption) {
                                  setParentStoryInputText('');
                                  field.onChange('unassigned');
                                }
                              }}
                            />
                          </div>
                        </FormControl>
                        <datalist id="parent-story-options-dev-tracker">
                          {parentStoryOptions
                            .filter(opt => matchSearchQuery(opt.label, parentStoryInputText))
                            .map(opt => <option key={opt.value} value={opt.label} />)}
                        </datalist>
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
                        <FormControl>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                              list="testcase-options-dev-tracker"
                              placeholder="Search for a test case..."
                              className="pl-9"
                              value={testCaseInputText}
                              onChange={(e) => {
                                const text = e.target.value;
                                setTestCaseInputText(text);
                                const matchingOption = testCaseOptions.find(opt => opt.label === text);
                                field.onChange(matchingOption ? matchingOption.value : 'unassigned');
                              }}
                              onBlur={() => {
                                const matchingOption = testCaseOptions.find(opt => opt.label === testCaseInputText);
                                if (!matchingOption) {
                                  setTestCaseInputText('');
                                  field.onChange('unassigned');
                                }
                              }}
                            />
                          </div>
                        </FormControl>
                        <datalist id="testcase-options-dev-tracker">
                          {testCaseOptions
                            .filter(opt => matchSearchQuery(opt.label, testCaseInputText))
                            .map(opt => <option key={opt.value} value={opt.label} />)}
                        </datalist>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editBugForm.control}
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
                  <FormField
                    control={editBugForm.control}
                    name="releaseId"
                    render={({ field }) => (
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
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editBugForm.control}
                    name="foundInTestPlanId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Found In Test Cycle</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a Test Cycle" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="unassigned">None</SelectItem>
                            {testPlans.map(tp => (
                              <SelectItem key={tp.id} value={tp.id}>{tp.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editBugForm.control}
                    name="relatedBugId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Related / Original Defect</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                              list="bug-options-dev-tracker"
                              placeholder="Search for a defect..."
                              className="pl-9"
                              value={relatedBugInputText}
                              onChange={(e) => {
                                const text = e.target.value;
                                setRelatedBugInputText(text);
                                const matchingOption = relatedBugOptions.find(opt => opt.label === text);
                                field.onChange(matchingOption ? matchingOption.value : 'unassigned');
                              }}
                              onBlur={() => {
                                const matchingOption = relatedBugOptions.find(opt => opt.label === relatedBugInputText);
                                if (!matchingOption) {
                                  setRelatedBugInputText('');
                                  field.onChange('unassigned');
                                }
                              }}
                            />
                          </div>
                        </FormControl>
                        <datalist id="bug-options-dev-tracker">
                          {relatedBugOptions
                            .filter(opt => opt.value !== selectedBug?.id)
                            .filter(opt => matchSearchQuery(opt.label, relatedBugInputText))
                            .map(opt => <option key={opt.value} value={opt.label} />)}
                        </datalist>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
                            {severities.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editBugForm.control}
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
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editBugForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select 
                          onValueChange={(val) => {
                            field.onChange(val);
                            if (val === 'Closed') {
                              editBugForm.setValue('closedAt', new Date());
                            } else {
                              editBugForm.setValue('closedAt', undefined);
                            }
                          }} 
                          value={field.value as StoryStatus}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {BUG_COLUMNS.map((col) => (
                              <SelectItem key={col.id} value={col.name}>
                                {col.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editBugForm.control}
                    name="resolution"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Resolution</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'none'}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select resolution" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {['Invalid', 'Need Help', 'Duplicate', "Won't Fix", 'Cannot Reproduce'].map(r => (
                              <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={editBugForm.control} name="createdAt" render={({ field }) => (
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
                  )} />
                  <FormField control={editBugForm.control} name="closedAt" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Closed On</FormLabel>
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
                  )} />
                </div>
              </div>
              <DialogFooter className="px-6 py-4 border-t bg-background shrink-0">
                <Button type="submit" disabled={isSubmitInProgress}>
                  {isSubmitInProgress ? 'Saving...' : 'Save Changes'}
                </Button>
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
