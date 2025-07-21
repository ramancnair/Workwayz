

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
import { type TestCase, type TestCaseStatus, type TestCaseType } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useToast } from "@/hooks/use-toast";

const testCaseFormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  type: z.enum(['Functional', 'Non-functional']),
  description: z.string().min(1, 'Description is required.'),
  expectedResult: z.string().min(1, 'Expected result is required.'),
  status: z.enum(['Passed', 'Failed', 'Blocked', 'Not Run', 'Skipped']),
  assigneeId: z.string().optional(),
  storyId: z.string().optional(),
  releaseId: z.string().optional(),
  sprintId: z.string().optional(),
});

const statusStyles: Record<TestCaseStatus, string> = {
  'Passed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'Failed': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'Blocked': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'Skipped': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'Not Run': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

const testCaseStatuses: TestCaseStatus[] = ['Not Run', 'Passed', 'Failed', 'Blocked', 'Skipped'];
const testCaseTypes: TestCaseType[] = ['Functional', 'Non-functional'];


export default function TestCasesPage() {
  const { testCases, employees, stories, sprints, addTestCase, updateTestCase, deleteTestCase, releasesAndMilestones } = useProject();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);
  const [deletingTestCase, setDeletingTestCase] = useState<TestCase | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [relatedStoryInputText, setRelatedStoryInputText] = useState('');

  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    assigneeId: 'all',
    storyId: 'all',
    sprintId: 'all',
    releaseId: 'all',
  });
  const [sorting, setSorting] = useState<{ id: string; desc: boolean } | null>(null);

  const form = useForm<z.infer<typeof testCaseFormSchema>>({
    resolver: zodResolver(testCaseFormSchema),
  });

  const releases = releasesAndMilestones.filter(r => r.itemType === 'Release');

  const watchedStoryId = useWatch({ control: form.control, name: 'storyId' });
  
  useEffect(() => {
    if (watchedStoryId) {
      const story = stories.find(s => s.id === watchedStoryId);
      if (story && story.sprintId) {
        form.setValue('sprintId', story.sprintId);
      } else {
        form.setValue('sprintId', 'backlog');
      }
    }
  }, [watchedStoryId, stories, form]);

  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters({ status: 'all', type: 'all', assigneeId: 'all', storyId: 'all', sprintId: 'all', releaseId: 'all' });
  };
  
  const handleSort = (columnId: string) => {
    if (sorting?.id === columnId) {
      setSorting({ ...sorting, desc: !sorting.desc });
    } else {
      setSorting({ id: columnId, desc: false });
    }
  };

  const storyOptions = useMemo(() => stories
    .filter(s => s.itemType === 'Story')
    .map(story => ({
      value: story.id,
      label: `[${story.storyId}] ${story.title}`,
    })), [stories]);

  const filteredAndSortedTestCases = useMemo(() => {
    let filtered = [...testCases];

    if (filters.status !== 'all') {
      filtered = filtered.filter(tc => tc.status === filters.status);
    }
    if (filters.type !== 'all') {
      filtered = filtered.filter(tc => tc.type === filters.type);
    }
    if (filters.assigneeId !== 'all') {
      filtered = filtered.filter(tc => tc.assigneeId === filters.assigneeId);
    }
    if (filters.storyId !== 'all') {
      if(filters.storyId === 'unassigned') {
        filtered = filtered.filter(tc => !tc.storyId);
      } else {
        filtered = filtered.filter(tc => tc.storyId === filters.storyId);
      }
    }
     if (filters.sprintId !== 'all') {
      if (filters.sprintId === 'backlog') {
        filtered = filtered.filter(t => !t.sprintId);
      } else {
        filtered = filtered.filter(t => t.sprintId === filters.sprintId);
      }
    }
    if (filters.releaseId !== 'all') {
        if(filters.releaseId === 'unassigned') {
            filtered = filtered.filter(tc => !tc.releaseId);
        } else {
            filtered = filtered.filter(tc => tc.releaseId === filters.releaseId);
        }
    }

    if (sorting) {
      filtered.sort((a, b) => {
        let valA: any, valB: any;
        if (sorting.id === 'sprintId') {
            valA = sprints.find(s => s.id === a.sprintId)?.title || 'Backlog';
            valB = sprints.find(s => s.id === b.sprintId)?.title || 'Backlog';
        } else if (sorting.id === 'assigneeId') {
            valA = employees.find(e => e.id === a.assigneeId)?.firstName || 'Unassigned';
            valB = employees.find(e => e.id === b.assigneeId)?.firstName || 'Unassigned';
        } else if (sorting.id === 'storyId') {
            valA = stories.find(s => s.id === a.storyId)?.storyId || '';
            valB = stories.find(s => s.id === b.storyId)?.storyId || '';
        } else if (sorting.id === 'releaseId') {
            valA = releases.find(r => r.id === a.releaseId)?.releaseId || '';
            valB = releases.find(r => r.id === b.releaseId)?.releaseId || '';
        }
        else {
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
  }, [testCases, filters, sorting, sprints, employees, stories, releases]);


  useEffect(() => {
    if (isDialogOpen) {
        if (editingTestCase) {
          const relatedStory = storyOptions.find(opt => opt.value === editingTestCase.storyId);
          setRelatedStoryInputText(relatedStory?.label || '');
          form.reset({
            ...editingTestCase,
            assigneeId: editingTestCase.assigneeId || 'unassigned',
            storyId: editingTestCase.storyId || '',
            releaseId: editingTestCase.releaseId || 'unassigned',
            sprintId: editingTestCase.sprintId || 'backlog',
          });
        } else {
          setRelatedStoryInputText('');
          form.reset({
            title: '',
            type: 'Functional',
            description: '',
            expectedResult: '',
            status: 'Not Run',
            assigneeId: 'unassigned',
            storyId: '',
            releaseId: 'unassigned',
            sprintId: 'backlog',
          });
        }
    }
  }, [isDialogOpen, editingTestCase, form, storyOptions]);

  const handleDialogOpen = (testCase: TestCase | null) => {
    setEditingTestCase(testCase);
    setIsDialogOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (!deletingTestCase) return;
    const success = await deleteTestCase(deletingTestCase.id);
    if (success) {
      toast({ title: "Success", description: "Test case deleted." });
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not delete test case." });
    }
    setDeletingTestCase(null);
  };

  const onSubmit = async (values: z.infer<typeof testCaseFormSchema>) => {
    setIsSubmitting(true);
    const testCaseData = {
        title: values.title,
        type: values.type,
        description: values.description,
        expectedResult: values.expectedResult,
        status: values.status,
        assigneeId: values.assigneeId === 'unassigned' ? undefined : values.assigneeId,
        storyId: values.storyId === '' ? undefined : values.storyId,
        releaseId: values.releaseId === 'unassigned' ? undefined : values.releaseId,
        sprintId: values.sprintId === 'backlog' ? undefined : values.sprintId,
    };

    let success = false;
    if (editingTestCase) {
      success = await updateTestCase(editingTestCase.id, testCaseData);
    } else {
      success = await addTestCase(testCaseData);
    }

    if (success) {
        toast({ title: "Success", description: `Test case ${editingTestCase ? 'updated' : 'added'} successfully.` });
        setIsDialogOpen(false);
        setEditingTestCase(null);
    } else {
        toast({ variant: "destructive", title: "Error", description: `Could not ${editingTestCase ? 'update' : 'add'} test case.` });
    }
    setIsSubmitting(false);
  };

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
        <PageHeader title="Test Cases" description="Manage and track all test cases for the project.">
          <Button onClick={() => handleDialogOpen(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Test Case
          </Button>
        </PageHeader>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <Select value={filters.type} onValueChange={(v) => handleFilterChange('type', v)}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by type..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {testCaseTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by status..."/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {testCaseStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
               <Select value={filters.assigneeId} onValueChange={(v) => handleFilterChange('assigneeId', v)}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by assignee..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
               <Select value={filters.storyId} onValueChange={(v) => handleFilterChange('storyId', v)}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by story..."/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stories</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {stories.filter(s => s.itemType === 'Story').map(s => <SelectItem key={s.id} value={s.id}>[{s.storyId}] {s.title}</SelectItem>)}
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
               <Select value={filters.releaseId} onValueChange={(v) => handleFilterChange('releaseId', v)}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by release..."/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Releases</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {releases.map(r => <SelectItem key={r.id} value={r.id}>[{r.releaseId}] {r.name}</SelectItem>)}
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
                <SortableHeader columnId="testCaseId">ID</SortableHeader>
                <SortableHeader columnId="title">Title</SortableHeader>
                <SortableHeader columnId="status">Status</SortableHeader>
                <SortableHeader columnId="assigneeId">Assignee</SortableHeader>
                <SortableHeader columnId="sprintId">Sprint</SortableHeader>
                <SortableHeader columnId="storyId">Story</SortableHeader>
                <SortableHeader columnId="releaseId">Release</SortableHeader>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedTestCases.map((tc) => {
                const assignee = employees.find(e => e.id === tc.assigneeId);
                const story = stories.find(s => s.id === tc.storyId);
                const sprint = sprints.find(s => s.id === tc.sprintId);
                const release = releases.find(r => r.id === tc.releaseId);
                return (
                    <TableRow key={tc.id}>
                        <TableCell className="font-medium">{tc.testCaseId}</TableCell>
                        <TableCell>{tc.title}</TableCell>
                        <TableCell>
                            <Badge className={cn('font-semibold', statusStyles[tc.status])}>
                                {tc.status}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            {assignee ? (
                                <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={assignee.avatar} alt={`${assignee.firstName} ${assignee.lastName}`} data-ai-hint="tester avatar" />
                                    <AvatarFallback>{assignee.firstName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                {assignee.firstName}
                                </div>
                            ) : "Unassigned"}
                        </TableCell>
                        <TableCell>{sprint?.title || 'Backlog'}</TableCell>
                        <TableCell>
                          {story ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                   <Badge variant="secondary">{story.storyId}</Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{story.title}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ): 'N/A'}
                        </TableCell>
                        <TableCell>
                          {release ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="outline">{release.releaseId}</Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{release.name}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(tc)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeletingTestCase(tc)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        </TableCell>
                    </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingTestCase(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTestCase ? 'Edit Test Case' : 'Add New Test Case'}</DialogTitle>
            <DialogDescription>
              {editingTestCase ? 'Update the details for this test case.' : 'Fill in the details for the new test case.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl><Input placeholder="E.g., Verify user login with valid credentials" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
              )} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="type" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Test Case Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                                {testCaseTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                                {testCaseStatuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                  )} />
              </div>
               <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Steps)</FormLabel>
                    <FormControl><Textarea placeholder="1. Navigate to login page..." {...field} rows={4} /></FormControl>
                    <FormMessage />
                  </FormItem>
              )} />
               <FormField control={form.control} name="expectedResult" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Result</FormLabel>
                    <FormControl><Textarea placeholder="User should be successfully logged in and redirected to the dashboard." {...field} rows={3} /></FormControl>
                    <FormMessage />
                  </FormItem>
              )} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="assigneeId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assignee</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Assign to a resource" /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {employees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                  )} />
                   <FormField control={form.control} name="storyId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Related Story (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                                list="story-options-tc" 
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
                                    const matchingOption = storyOptions.find(opt => opt.label === relatedStoryInputText);
                                    if (!matchingOption) {
                                        setRelatedStoryInputText('');
                                        field.onChange('');
                                    }
                                }}
                            />
                          </FormControl>
                          <datalist id="story-options-tc">
                            {storyOptions.map(option => (
                              <option key={option.value} value={option.label}>
                                {option.label}
                              </option>
                            ))}
                          </datalist>
                        <FormMessage />
                      </FormItem>
                  )} />
              </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="sprintId"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Sprint</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || 'backlog'}
                            disabled={!!watchedStoryId}
                          >
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
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
                    {isSubmitting ? (editingTestCase ? 'Saving...' : 'Creating...') : (editingTestCase ? 'Save Changes' : 'Create Test Case')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deletingTestCase} onOpenChange={(isOpen) => !isOpen && setDeletingTestCase(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the test case "{deletingTestCase?.title}".
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
