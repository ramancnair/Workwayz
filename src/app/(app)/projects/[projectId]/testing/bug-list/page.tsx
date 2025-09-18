

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
import type { Story, StoryStatus, Release, TestCase, BugSeverity } from '@/types';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { Bot, PlusCircle, Trash2, ArrowUpDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { format, parseISO } from 'date-fns';
import { DatePicker } from '@/components/ui/datepicker';

const statusStyles: Record<StoryStatus, string> = {
  'To Do': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  'In Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Done': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

const statusOptions: StoryStatus[] = ['To Do', 'In Progress', 'Done'];
const severities: BugSeverity[] = ['Critical', 'High', 'Medium', 'Low'];

const severityStyles: Record<BugSeverity, string> = {
    'Critical': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    'High': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    'Medium': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'Low': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};


const bugFormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
  relatedTestCaseId: z.string().optional(),
  reporterId: z.string().optional(),
  assigneeId: z.string().optional(),
  status: z.enum(['To Do', 'In Progress', 'Done']),
  severity: z.enum(severities).optional(),
  sprintId: z.string().optional(),
  environmentId: z.string().optional(),
  attachments: z.string().optional(),
  releaseId: z.string().optional(),
  createdAt: z.date().optional(),
  closedAt: z.date().optional(),
});


export default function BugListPage() {
  const { stories, employees, sprints, addStory, updateStory, deleteStory, environments, autoGenerateBugs, releasesAndMilestones, testCases, testDate } = useProject();
  const { toast } = useToast();
  const [editingBug, setEditingBug] = useState<Story | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const bugs = useMemo(() => stories.filter(story => story.itemType === 'Bug'), [stories]);
  const [selectedBugs, setSelectedBugs] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const [isAutoGenOpen, setIsAutoGenOpen] = useState(false);
  const [isAutoGenSubmitting, setIsAutoGenSubmitting] = useState(false);
  const sortedEnvironments = [...environments].sort((a,b) => a.order - b.order);
  const releases = releasesAndMilestones.filter(r => r.itemType === 'Release');

  const [testCaseInputText, setTestCaseInputText] = useState('');
  const [sorting, setSorting] = useState<{ id: string; desc: boolean } | null>({ id: 'storyId', desc: false });

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

  const testCaseOptions = useMemo(() => testCases.map(tc => ({
    value: tc.id,
    label: `[${tc.testCaseId}] ${tc.title}`,
  })), [testCases]);

  useEffect(() => {
    if (isDialogOpen) {
      if (editingBug) {
        const testCase = testCases.find(tc => tc.id === editingBug.relatedTestCaseId);
        setTestCaseInputText(testCase ? `[${testCase.testCaseId}] ${testCase.title}` : '');

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
          environmentId: editingBug.environmentId || 'unassigned',
          attachments: editingBug.attachments || '',
          releaseId: editingBug.releaseId || 'unassigned',
          createdAt: editingBug.createdAt ? parseISO(editingBug.createdAt) : undefined,
          closedAt: editingBug.closedAt ? parseISO(editingBug.closedAt) : undefined,
        });
      } else {
         setTestCaseInputText('');
         form.reset({
            title: '',
            description: '',
            acceptanceCriteria: '',
            relatedTestCaseId: 'unassigned',
            reporterId: 'unassigned',
            assigneeId: 'unassigned',
            status: 'To Do',
            severity: 'Medium',
            sprintId: 'backlog',
            environmentId: 'unassigned',
            attachments: '',
            releaseId: 'unassigned',
        });
      }
    }
  }, [isDialogOpen, editingBug, form, testCases]);
  
  const handleDialogOpen = (bug: Story | null) => {
    setEditingBug(bug);
    setIsDialogOpen(true);
  }
  
  const handleFormSubmit = async (values: z.infer<typeof bugFormSchema>) => {
    setIsSubmitting(true);
    let success = false;
    
    const payload: Partial<Story> = {
        title: values.title,
        description: values.description,
        acceptanceCriteria: values.acceptanceCriteria,
        reporterId: values.reporterId === 'unassigned' ? undefined : values.reporterId,
        assigneeId: values.assigneeId === 'unassigned' ? undefined : values.assigneeId,
        relatedTestCaseId: values.relatedTestCaseId === 'unassigned' ? undefined : values.relatedTestCaseId,
        status: values.status,
        severity: values.severity,
        sprintId: values.sprintId === 'backlog' ? null : values.sprintId,
        environmentId: values.environmentId === 'unassigned' ? undefined : values.environmentId,
        attachments: values.attachments,
        releaseId: values.releaseId === 'unassigned' ? undefined : values.releaseId,
    };

    if (editingBug) {
        payload.createdAt = values.createdAt ? values.createdAt.toISOString() : undefined;
        payload.closedAt = values.closedAt ? values.closedAt.toISOString() : undefined;
        success = await updateStory(editingBug.id, payload);
    } else {
        payload.createdAt = (values.createdAt || new Date()).toISOString();
        payload.closedAt = values.closedAt ? values.closedAt.toISOString() : undefined;
        success = await addStory({ ...payload, itemType: 'Bug' });
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

  const handleSort = (columnId: string) => {
    if (sorting?.id === columnId) {
      setSorting({ ...sorting, desc: !sorting.desc });
    } else {
      setSorting({ id: columnId, desc: false });
    }
  };

  const sortedBugs = useMemo(() => {
    let sorted = [...bugs];
    if (sorting) {
      sorted.sort((a, b) => {
        const valA = (a as any)[sorting.id] || '';
        const valB = (b as any)[sorting.id] || '';
        const comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true });
        return sorting.desc ? -comparison : comparison;
      });
    }
    return sorted;
  }, [bugs, sorting]);

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
              <SortableHeader columnId="storyId">ID</SortableHeader>
              <SortableHeader columnId="title">Title</SortableHeader>
              <SortableHeader columnId="status">Status</SortableHeader>
              <SortableHeader columnId="severity">Severity</SortableHeader>
              <SortableHeader columnId="environmentId">Environment</SortableHeader>
              <SortableHeader columnId="assigneeId">Assignee</SortableHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedBugs.map((bug) => {
              const assignee = employees.find(e => e.id === bug.assigneeId);
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
                            {statusOptions.map((p) => (
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
                                <DatePicker date={field.value} setDate={field.onChange} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="closedAt" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Closed On</FormLabel>
                            <FormControl>
                                <DatePicker date={field.value} setDate={field.onChange} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
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
