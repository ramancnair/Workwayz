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
import type { Story, StoryStatus, Release, TestCase, BugSeverity } from '@/types';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash2, ArrowUpDown, Search, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { parseISO } from 'date-fns';

const statusStyles: Record<string, string> = {
  'In Triage': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  'Defect Backlog': 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
  'In Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Retest': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300',
  'Closed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'To Do': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  'Done': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'Open': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  'Reopened': 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
  'Resolved': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300',
};

const severities: BugSeverity[] = ['Critical', 'High', 'Medium', 'Low'];

const severityStyles: Record<BugSeverity, string> = {
    'Critical': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    'High': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    'Medium': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'Low': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
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
  attachments: z.string().optional(),
  relatedBugId: z.string().optional(),
  releaseId: z.string().optional(),
  foundInTestPlanId: z.string().optional(),
  epicId: z.string().optional(),
  createdAt: z.date().optional(),
  closedAt: z.date().optional(),
});

export default function DefectsPage() {
  const { stories, epics, employees, sprints, addStory, updateStory, deleteStory, environments, releasesAndMilestones, testCases, testPlans } = useProject();
  const { toast } = useToast();
  const currentSprint = useMemo(() => sprints.find(s => s.status === 'Current' || s.isCurrent), [sprints]);
  const [editingBug, setEditingBug] = useState<Story | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const bugs = useMemo(() => stories.filter(story => story.itemType === 'Bug'), [stories]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBugs, setSelectedBugs] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const filteredBugs = useMemo(() => {
    if (!searchQuery.trim()) return bugs;
    const searchLower = searchQuery.toLowerCase().trim();
    return bugs.filter(bug => {
      const assignee = employees.find(e => e.id === bug.assigneeId);
      const assigneeName = assignee ? `${assignee.firstName} ${assignee.lastName}` : 'unassigned';
      return (
        bug.storyId?.toLowerCase().includes(searchLower) ||
        bug.title?.toLowerCase().includes(searchLower) ||
        (bug.description && bug.description.toLowerCase().includes(searchLower)) ||
        bug.status?.toLowerCase().includes(searchLower) ||
        (bug.severity && bug.severity.toLowerCase().includes(searchLower)) ||
        assigneeName.toLowerCase().includes(searchLower)
      );
    });
  }, [bugs, searchQuery, employees]);

  const releases = releasesAndMilestones.filter(r => r.itemType === 'Release');

  const [testCaseInputText, setTestCaseInputText] = useState('');
  const [relatedBugInputText, setRelatedBugInputText] = useState('');
  const [sorting, setSorting] = useState<{ id: string; desc: boolean } | null>({ id: 'storyId', desc: false });

  const form = useForm<z.infer<typeof bugFormSchema>>({
    resolver: zodResolver(bugFormSchema),
  });

  const testCaseOptions = useMemo(() => testCases.map(tc => ({
    value: tc.id,
    label: `[${tc.testCaseId}] ${tc.title}`,
  })), [testCases]);

  const relatedBugOptions = useMemo(() => bugs.map(b => ({
    value: b.id,
    label: `[${b.storyId}] ${b.title}`,
  })), [bugs]);

  useEffect(() => {
    if (isDialogOpen) {
      if (editingBug) {
        const testCase = testCases.find(tc => tc.id === editingBug.relatedTestCaseId);
        setTestCaseInputText(testCase ? `[${testCase.testCaseId}] ${testCase.title}` : '');
        const relBug = bugs.find(b => b.id === editingBug.relatedBugId);
        setRelatedBugInputText(relBug ? `[${relBug.storyId}] ${relBug.title}` : '');

        form.reset({
          title: editingBug.title,
          description: editingBug.description || '',
          acceptanceCriteria: editingBug.acceptanceCriteria || '',
          relatedTestCaseId: editingBug.relatedTestCaseId || 'unassigned',
          reporterId: editingBug.reporterId || 'unassigned',
          assigneeId: editingBug.assigneeId || 'unassigned',
          status: editingBug.status as StoryStatus,
          severity: editingBug.severity,
          sprintId: editingBug.sprintId || 'backlog',
          foundInTestPlanId: editingBug.foundInTestPlanId || 'unassigned',
          relatedBugId: editingBug.relatedBugId || 'unassigned',
          attachments: editingBug.attachments || '',
          releaseId: editingBug.releaseId || 'unassigned',
          epicId: editingBug.epicId || 'unassigned',
          createdAt: editingBug.createdAt ? parseISO(editingBug.createdAt) : undefined,
          closedAt: editingBug.closedAt ? parseISO(editingBug.closedAt) : undefined,
        });
      } else {
         setTestCaseInputText('');
         setRelatedBugInputText('');
         form.reset({
            title: '',
            description: '',
            acceptanceCriteria: '',
            relatedTestCaseId: 'unassigned',
            reporterId: 'unassigned',
            assigneeId: 'unassigned',
            status: 'In Triage',
            severity: 'Medium',
            sprintId: currentSprint?.id || 'backlog',
            foundInTestPlanId: 'unassigned',
            relatedBugId: 'unassigned',
            attachments: '',
            releaseId: 'unassigned',
            epicId: 'unassigned',
        });
      }
    }
  }, [isDialogOpen, editingBug, form, testCases, bugs]);
  
  const handleDialogOpen = (bug: Story | null) => {
    setEditingBug(bug);
    setIsDialogOpen(true);
  }
  
  const handleFormSubmit = async (values: z.infer<typeof bugFormSchema>) => {
    setIsSubmitting(true);
    let success = false;
    
    const payload: Partial<Story> = {
        title: values.title,
        description: values.description || '',
        acceptanceCriteria: values.acceptanceCriteria,
        reporterId: values.reporterId === 'unassigned' ? undefined : values.reporterId,
        assigneeId: values.assigneeId === 'unassigned' ? undefined : values.assigneeId,
        relatedTestCaseId: values.relatedTestCaseId === 'unassigned' ? undefined : values.relatedTestCaseId,
        status: values.status,
        severity: values.severity as BugSeverity | undefined,
        sprintId: values.sprintId === 'backlog' ? null : values.sprintId,
        foundInTestPlanId: values.foundInTestPlanId === 'unassigned' ? undefined : values.foundInTestPlanId,
        relatedBugId: values.relatedBugId === 'unassigned' ? undefined : values.relatedBugId,
        attachments: values.attachments,
        releaseId: values.releaseId === 'unassigned' ? undefined : values.releaseId,
        epicId: values.epicId === 'unassigned' ? undefined : values.epicId,
    };

    if (editingBug) {
        payload.createdAt = values.createdAt ? values.createdAt.toISOString() : undefined;
        payload.closedAt = values.closedAt ? values.closedAt.toISOString() : undefined;
        success = await updateStory(editingBug.id, payload);
    } else {
        payload.createdAt = (values.createdAt || new Date()).toISOString();
        payload.closedAt = values.closedAt ? values.closedAt.toISOString() : undefined;
        const res = await addStory({ ...payload, itemType: 'Bug', title: payload.title || '', description: payload.description || '', status: payload.status || 'In Triage' });
        success = !!res;
    }
    
    if (success) {
      toast({ title: "Success", description: `Defect ${editingBug ? 'updated' : 'added'} successfully.` });
      setIsDialogOpen(false);
      setEditingBug(null);
    } else {
      toast({ variant: "destructive", title: "Error", description: `Could not ${editingBug ? 'update' : 'add'} defect.` });
    }
    setIsSubmitting(false);
  };
  
  const handleBulkDeleteConfirm = async () => {
    if (selectedBugs.length === 0) return;
    
    const promises = selectedBugs.map(id => deleteStory(id));
    const results = await Promise.all(promises);

    const successCount = results.filter(Boolean).length;
    if (successCount > 0) {
        toast({ title: "Success", description: `${successCount} defect(s) moved to trash.` });
    }
    if (successCount < selectedBugs.length) {
        toast({ variant: "destructive", title: "Error", description: `Could not delete ${selectedBugs.length - successCount} defect(s).` });
    }
    
    setSelectedBugs([]);
    setShowBulkDeleteConfirm(false);
  };

  const handleSort = (columnId: string) => {
    if (sorting?.id === columnId) {
      setSorting({ ...sorting, desc: !sorting.desc });
    } else {
      setSorting({ id: columnId, desc: false });
    }
  };

  const sortedBugs = useMemo(() => {
    let sorted = [...filteredBugs];
    if (sorting) {
      sorted.sort((a, b) => {
        const valA = (a as any)[sorting.id] || '';
        const valB = (b as any)[sorting.id] || '';
        const comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true });
        return sorting.desc ? -comparison : comparison;
      });
    }
    return sorted;
  }, [filteredBugs, sorting]);

  const SortableHeader = ({ columnId, children }: { columnId: string, children: React.ReactNode }) => (
    <TableHead>
      <Button variant="ghost" onClick={() => handleSort(columnId)}>
        {children}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    </TableHead>
  );

  return (
    <>
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="Defects" description="A list of all defects reported in the project.">
        {selectedBugs.length > 0 && (
            <Button variant="destructive" onClick={() => setShowBulkDeleteConfirm(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected ({selectedBugs.length})
            </Button>
        )}
        <Button onClick={() => handleDialogOpen(null)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Defect
        </Button>
      </PageHeader>

      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full md:w-[350px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input 
            placeholder="Search defects (ID, title, description, assignee...)" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 h-10 bg-background/50 border-border/50 rounded-lg shadow-sm focus-visible:ring-primary/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <Card data-testid="defects-list" className="defects-list">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                    checked={filteredBugs.length > 0 && selectedBugs.length === filteredBugs.length}
                    onCheckedChange={(value) =>
                        setSelectedBugs(value ? filteredBugs.map(bug => bug.id) : [])
                    }
                    aria-label="Select all"
                />
              </TableHead>
              <SortableHeader columnId="storyId">ID</SortableHeader>
              <SortableHeader columnId="title">Title</SortableHeader>
              <SortableHeader columnId="status">Status</SortableHeader>
              <SortableHeader columnId="severity">Severity</SortableHeader>
              <SortableHeader columnId="foundInTestPlanId">Test Plan</SortableHeader>
              <SortableHeader columnId="assigneeId">Assignee</SortableHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedBugs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No defects found.
                </TableCell>
              </TableRow>
            ) : (
              sortedBugs.map((bug) => {
                const assignee = employees.find(e => e.id === bug.assigneeId);
                const testPlan = testPlans.find(tp => tp.id === bug.foundInTestPlanId);
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
                      <Badge className={cn('font-semibold', statusStyles[bug.status as StoryStatus])}>
                        {bug.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {bug.severity && (
                          <Badge className={cn('font-semibold', severityStyles[bug.severity])}>
                              {bug.severity}
                          </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {testPlan ? (
                         <Badge variant="outline">{testPlan.name}</Badge>
                       ) : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {assignee ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={assignee.avatar} alt={`${assignee.firstName} ${assignee.lastName}`} />
                            <AvatarFallback>{assignee.firstName?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          {assignee.firstName} {assignee.lastName}
                        </div>
                      ) : "Unassigned"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>

    <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) setEditingBug(null); setIsDialogOpen(open); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 flex flex-col overflow-hidden" bypassScrollWrapper={true}>
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle>{editingBug ? 'Edit Defect' : 'Add New Defect'}</DialogTitle>
            <DialogDescription>
              {editingBug ? 'Make changes to the defect details here.' : 'Log a new defect found during testing.'}
            </DialogDescription>
          </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Defect title" {...field} />
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
                          <Textarea placeholder="Describe the steps to reproduce the defect..." {...field} />
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
                        name="relatedTestCaseId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Related Test Case</FormLabel>
                            <FormControl>
                              <Input
                                list="testcase-options"
                                placeholder="Search for a test case..."
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
                            </FormControl>
                            <datalist id="testcase-options">
                              {testCaseOptions.map(opt => <option key={opt.value} value={opt.label} />)}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="foundInTestPlanId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Found In Test Plan</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a Test Plan" />
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
                        control={form.control}
                        name="relatedBugId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Related / Original Defect</FormLabel>
                            <FormControl>
                              <Input
                                list="bug-options"
                                placeholder="Search for a defect..."
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
                            </FormControl>
                            <datalist id="bug-options">
                              {relatedBugOptions.filter(opt => opt.value !== editingBug?.id).map(opt => <option key={opt.value} value={opt.label} />)}
                            </datalist>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                          control={form.control}
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
                          control={form.control}
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
                       control={form.control}
                       name="status"
                       render={({ field }) => (
                           <FormItem>
                           <FormLabel>Status</FormLabel>
                           <Select onValueChange={field.onChange} value={field.value as StoryStatus}>
                               <FormControl>
                               <SelectTrigger>
                                   <SelectValue />
                               </SelectTrigger>
                               </FormControl>
                               <SelectContent>
                               {['In Triage', 'Defect Backlog', 'In Progress', 'Retest', 'Closed'].map((p) => (
                                   <SelectItem key={p} value={p}>
                                   {p}
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
                       name="sprintId"
                       render={({ field }) => (
                           <FormItem>
                           <FormLabel>Sprint</FormLabel>
                           <Select onValueChange={field.onChange} value={field.value || 'backlog'}>
                               <FormControl><SelectTrigger><SelectValue placeholder="Assign to a sprint" /></SelectTrigger></FormControl>
                               <SelectContent>
                               <SelectItem value="backlog">Backlog (No Sprint)</SelectItem>
                               {sprints.map(s => (
                                   <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="createdAt" render={({ field }) => (
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
                        <FormField control={form.control} name="closedAt" render={({ field }) => (
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
                        )} />
                    </div>
                </div>
                <DialogFooter className="px-6 py-4 border-t bg-background shrink-0">
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
              This will move {selectedBugs.length} defect(s) to the trash.
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
