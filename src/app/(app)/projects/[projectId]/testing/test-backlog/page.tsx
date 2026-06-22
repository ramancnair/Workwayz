

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
import { PlusCircle, Edit, Trash2, ArrowUpDown, X, Bot, Columns, Paperclip } from 'lucide-react';
import { type TestCase, type TestCaseStatus, type TestCaseType, type Story } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { format, parseISO } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { getAiTestCaseSuggestions } from '@/app/actions';
import { DatePicker } from '@/components/ui/datepicker';


const testCaseFormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  type: z.enum(['Functional', 'Non-functional']),
  description: z.string().min(1, 'Description is required.'),
  expectedResult: z.string().min(1, 'Expected result is required.'),
  storyId: z.string().optional(),
  releaseId: z.string().optional(),
  sprintId: z.string().optional(),
  attachment: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
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

type ColumnId = 'testCaseId' | 'title' | 'type' | 'storyId' | 'sprintId' | 'releaseId' | 'attachment';

const columnConfig: Record<ColumnId, { label: string, defaultVisible: boolean }> = {
    testCaseId: { label: 'ID', defaultVisible: true },
    title: { label: 'Title', defaultVisible: true },
    type: { label: 'Type', defaultVisible: false },
    storyId: { label: 'Related Story', defaultVisible: false },
    sprintId: { label: 'Sprint', defaultVisible: true },
    releaseId: { label: 'Release', defaultVisible: true },
    attachment: { label: 'Attachment', defaultVisible: true },
};


export default function TestBacklogPage() {
  const { testCases, employees, stories, sprints, addTestCase, updateTestCase, deleteTestCase, releasesAndMilestones, environments, autoGenerateTestCases } = useProject();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);
  const [deletingTestCase, setDeletingTestCase] = useState<TestCase | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [relatedStoryInputText, setRelatedStoryInputText] = useState('');
  const [selectedTestCases, setSelectedTestCases] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [bulkAssignValues, setBulkAssignValues] = useState<{sprintId: string, releaseId: string}>({ sprintId: 'no-change', releaseId: 'no-change' });
  const [isAttachmentDialogOpen, setIsAttachmentDialogOpen] = useState(false);
  const [tempAttachmentUrl, setTempAttachmentUrl] = useState('');


  const [filters, setFilters] = useState({
    sprintId: 'all',
    releaseId: 'all',
  });
  const [sorting, setSorting] = useState<{ id: string; desc: boolean } | null>(null);
  const [columnVisibility, setColumnVisibility] = useState<Record<ColumnId, boolean>>(() =>
    Object.entries(columnConfig).reduce((acc, [key, { defaultVisible }]) => {
      acc[key as ColumnId] = defaultVisible;
      return acc;
    }, {} as Record<ColumnId, boolean>)
  );

  const [isAiGenOpen, setIsAiGenOpen] = useState(false);
  const [isAiGenSubmitting, setIsAiGenSubmitting] = useState(false);

  const onAiGenSubmit = async () => {
    setIsAiGenSubmitting(true);
    const storiesToProcess = stories.filter(s => s.itemType === 'Requirement/Story');
    if (storiesToProcess.length === 0) {
      toast({ variant: 'destructive', title: 'No Stories Found', description: 'There are no user stories to generate test cases from.'});
      setIsAiGenSubmitting(false);
      setIsAiGenOpen(false);
      return;
    }

    try {
      const result = await getAiTestCaseSuggestions({
        stories: storiesToProcess.map(s => ({
          id: s.id,
          title: s.title,
          description: s.description,
          acceptanceCriteria: s.acceptanceCriteria,
        }))
      });

      if (result.error) throw new Error(result.error);
      
      let successCount = 0;
      for (const tc of result.testCases) {
        const success = await addTestCase({
          ...tc,
          status: 'Not Run',
        });
        if (success) successCount++;
      }
      toast({ title: 'Success', description: `${successCount} test cases generated successfully.` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message || 'An unknown error occurred.' });
    } finally {
      setIsAiGenSubmitting(false);
      setIsAiGenOpen(false);
    }
  };


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
    setFilters({ sprintId: 'all', releaseId: 'all' });
  };
  
  const handleSort = (columnId: string) => {
    if (sorting?.id === columnId) {
      setSorting({ ...sorting, desc: !sorting.desc });
    } else {
      setSorting({ id: columnId, desc: false });
    }
  };

  const storyOptions = useMemo(() => stories
    .filter(s => s.itemType === 'Requirement/Story')
    .map(story => ({
      value: story.id,
      label: `[${story.storyId}] ${story.title}`,
    })), [stories]);

  const filteredAndSortedTestCases = useMemo(() => {
    let filtered = [...testCases];

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
            storyId: editingTestCase.storyId || '',
            releaseId: editingTestCase.releaseId || 'unassigned',
            sprintId: editingTestCase.sprintId || 'backlog',
            attachment: editingTestCase.attachment || '',
          });
        } else {
          setRelatedStoryInputText('');
          form.reset({
            title: '',
            type: 'Functional',
            description: '',
            expectedResult: '',
            storyId: '',
            releaseId: 'unassigned',
            sprintId: 'backlog',
            attachment: '',
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
  
  const handleBulkDeleteConfirm = async () => {
    if (selectedTestCases.length === 0) return;
    
    const promises = selectedTestCases.map(id => deleteTestCase(id));
    const results = await Promise.all(promises);

    const successCount = results.filter(Boolean).length;
    if (successCount > 0) {
        toast({ title: "Success", description: `${successCount} test case(s) moved to trash.` });
    }
    if (successCount < selectedTestCases.length) {
        toast({ variant: "destructive", title: "Error", description: `Could not delete ${selectedTestCases.length - successCount} test case(s).` });
    }
    
    setSelectedTestCases([]);
    setShowBulkDeleteConfirm(false);
  };

  const handleBulkAssignConfirm = async () => {
    if (selectedTestCases.length === 0) return;
    
    setIsSubmitting(true);
    const updates: Partial<TestCase> = {};
    if (bulkAssignValues.sprintId !== 'no-change') {
       updates.sprintId = bulkAssignValues.sprintId === 'backlog' ? undefined : bulkAssignValues.sprintId;
    }
    if (bulkAssignValues.releaseId !== 'no-change') {
       updates.releaseId = bulkAssignValues.releaseId === 'unassigned' ? undefined : bulkAssignValues.releaseId;
    }

    if (Object.keys(updates).length > 0) {
        const promises = selectedTestCases.map(id => updateTestCase(id, updates as any));
        const results = await Promise.all(promises);
        const successCount = results.filter(Boolean).length;
        if (successCount > 0) {
            toast({ title: "Success", description: `${successCount} test case(s) updated.` });
        }
        if (successCount < selectedTestCases.length) {
            toast({ variant: "destructive", title: "Error", description: `Could not update ${selectedTestCases.length - successCount} test case(s).` });
        }
    }
    
    setIsSubmitting(false);
    setIsBulkAssignOpen(false);
    setSelectedTestCases([]);
  };

  const onSubmit = async (values: z.infer<typeof testCaseFormSchema>) => {
    setIsSubmitting(true);
    const tcData: Omit<Parameters<typeof addTestCase>[0], never> = {
        title: values.title,
        type: values.type,
        description: values.description,
        expectedResult: values.expectedResult,
        storyId: values.storyId === '' ? undefined : values.storyId,
        releaseId: values.releaseId === 'unassigned' ? undefined : values.releaseId,
        sprintId: values.sprintId === 'backlog' ? undefined : values.sprintId,
        attachment: values.attachment || '',
    };

    let success = false;
    if (editingTestCase) {
      success = await updateTestCase(editingTestCase.id, tcData as any);
    } else {
      success = await addTestCase(tcData as any);
    }

    if (success) {
        toast({ title: 'Success', description: `Test case ${editingTestCase ? 'updated' : 'added'} successfully.` });
        setIsDialogOpen(false);
        setEditingTestCase(null);
    } else {
        toast({ variant: 'destructive', title: 'Error', description: `Could not ${editingTestCase ? 'update' : 'add'} test case.` });
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
        <PageHeader title="Test Backlog" description="Manage and track all test cases for the project.">
           <Dialog open={isAiGenOpen} onOpenChange={setIsAiGenOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Bot className="mr-2 h-4 w-4" />
                    AI TC Gen
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Generate Test Cases with AI</DialogTitle>
                    <DialogDescription>The AI will analyze all user stories to generate relevant test cases. This may take a moment. Do you want to proceed?</DialogDescription>
                </DialogHeader>
                 <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsAiGenOpen(false)}>Cancel</Button>
                    <Button onClick={onAiGenSubmit} disabled={isAiGenSubmitting}>
                        {isAiGenSubmitting ? 'Generating...' : 'Proceed'}
                    </Button>
                </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {selectedTestCases.length > 0 && (
             <div className="flex gap-2">
                 <Button variant="outline" onClick={() => setIsBulkAssignOpen(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Bulk Assign
                 </Button>
                 <Button variant="destructive" onClick={() => setShowBulkDeleteConfirm(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Selected ({selectedTestCases.length})
                </Button>
            </div>
          )}

          <Button onClick={() => handleDialogOpen(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Test Case
          </Button>
        </PageHeader>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
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
                                onSelect={(e) => e.preventDefault()}
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
              <Button variant="ghost" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" /> Clear Filters
              </Button>
            </div>
          </CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                 <TableHead className="w-10">
                    <Checkbox
                        checked={filteredAndSortedTestCases.length > 0 && selectedTestCases.length === filteredAndSortedTestCases.length}
                        onCheckedChange={(value) =>
                            setSelectedTestCases(value ? filteredAndSortedTestCases.map(tc => tc.id) : [])
                        }
                        aria-label="Select all"
                    />
                 </TableHead>
                {columnVisibility.testCaseId && <SortableHeader columnId="testCaseId">ID</SortableHeader>}
                {columnVisibility.title && <SortableHeader columnId="title">Title</SortableHeader>}
                {columnVisibility.type && <SortableHeader columnId="type">Type</SortableHeader>}
                {columnVisibility.storyId && <SortableHeader columnId="storyId">Story</SortableHeader>}
                {columnVisibility.sprintId && <SortableHeader columnId="sprintId">Sprint</SortableHeader>}
                {columnVisibility.releaseId && <SortableHeader columnId="releaseId">Release</SortableHeader>}
                {columnVisibility.attachment && <SortableHeader columnId="attachment">Attachment</SortableHeader>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedTestCases.map((tc) => {
                const relatedStory = stories.find(s => s.id === tc.storyId);
                const sprint = sprints.find(s => s.id === tc.sprintId);
                const release = releases.find(r => r.id === tc.releaseId);
                return (
                    <TableRow key={tc.id} data-state={selectedTestCases.includes(tc.id) && "selected"}>
                        <TableCell>
                            <Checkbox
                                checked={selectedTestCases.includes(tc.id)}
                                onCheckedChange={(value) =>
                                    setSelectedTestCases(
                                        value
                                        ? [...selectedTestCases, tc.id]
                                        : selectedTestCases.filter((id) => id !== tc.id)
                                    )
                                }
                                aria-label="Select row"
                            />
                        </TableCell>
                        {columnVisibility.testCaseId && <TableCell className="font-medium">{tc.testCaseId}</TableCell>}
                        {columnVisibility.title && <TableCell>{tc.title}</TableCell>}
                         {columnVisibility.type && <TableCell>{tc.type}</TableCell>}
                        {columnVisibility.storyId && <TableCell>
                            {relatedStory ? <Badge variant="secondary">{relatedStory.storyId}</Badge> : 'N/A'}
                        </TableCell>}
                        {columnVisibility.sprintId && <TableCell>{sprint?.title || (tc.sprintId === null ? 'Backlog' : 'N/A')}</TableCell>}
                        {columnVisibility.releaseId && <TableCell>{release?.releaseId || 'N/A'}</TableCell>}
                        {columnVisibility.attachment && (
                          <TableCell>
                            {tc.attachment ? (
                              <a
                                href={tc.attachment}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline flex items-center gap-1 text-sm font-medium"
                              >
                                <Paperclip className="h-4 w-4" />
                                View Attachment
                              </a>
                            ) : (
                              <Button
                                variant="link"
                                className="p-0 h-auto text-sm text-muted-foreground"
                                onClick={() => handleDialogOpen(tc)}
                              >
                                Add URL
                              </Button>
                            )}
                          </TableCell>
                        )}
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
        <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 flex flex-col overflow-hidden" bypassScrollWrapper={true}>
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle>{editingTestCase ? 'Edit Test Case' : 'Add New Test Case'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
                <Tabs defaultValue="details">
                  <TabsList>
                    <TabsTrigger value="details">Details</TabsTrigger>
                  </TabsList>
                  <TabsContent value="details" className="pt-4 space-y-4">
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
                        <FormField control={form.control} name="attachment" render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Test Case Attachment</FormLabel>
                              <FormControl>
                                <div className="flex items-center gap-3">
                                  {field.value ? (
                                    <div className="flex items-center gap-2">
                                      <a
                                        href={field.value}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center w-16 h-10 rounded-md border border-input bg-slate-200/50 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 text-foreground transition-colors cursor-pointer"
                                        title="Open Attachment"
                                      >
                                        <Paperclip className="h-5 w-5" />
                                      </a>
                                      <div className="flex flex-col">
                                        <span className="text-xs text-muted-foreground truncate max-w-[150px]" title={field.value}>
                                          {field.value}
                                        </span>
                                        <div className="flex gap-2 mt-0.5">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setTempAttachmentUrl(field.value);
                                              setIsAttachmentDialogOpen(true);
                                            }}
                                            className="text-[11px] text-blue-500 hover:underline font-medium"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => field.onChange('')}
                                            className="text-[11px] text-red-500 hover:underline font-medium"
                                          >
                                            Remove
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setTempAttachmentUrl('');
                                        setIsAttachmentDialogOpen(true);
                                      }}
                                      className="flex items-center justify-center w-16 h-10 rounded-md border border-input bg-slate-200/50 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground transition-colors"
                                      title="Add Attachment Link"
                                    >
                                      <Paperclip className="h-5 w-5" />
                                    </button>
                                  )}
                                </div>
                              </FormControl>
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
                  </TabsContent>
                </Tabs>
              </div>
              <DialogFooter className="px-6 py-4 border-t bg-background shrink-0">
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

      <Dialog open={isBulkAssignOpen} onOpenChange={setIsBulkAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Assign Test Cases</DialogTitle>
            <DialogDescription>
              Assign the {selectedTestCases.length} selected test cases to a specific sprint or release.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             <div className="grid gap-2">
                <Label>Sprint</Label>
                <Select 
                    value={bulkAssignValues.sprintId} 
                    onValueChange={(v) => setBulkAssignValues(prev => ({ ...prev, sprintId: v }))}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select Sprint" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="no-change">No Change</SelectItem>
                        <SelectItem value="backlog">Backlog (Unassigned)</SelectItem>
                        {sprints.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
             </div>
             <div className="grid gap-2">
                <Label>Release</Label>
                <Select 
                    value={bulkAssignValues.releaseId} 
                    onValueChange={(v) => setBulkAssignValues(prev => ({ ...prev, releaseId: v }))}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select Release" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="no-change">No Change</SelectItem>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {releases.map(r => (
                            <SelectItem key={r.id} value={r.id}>[{r.releaseId}] {r.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
             </div>
          </div>
          <DialogFooter>
             <Button variant="ghost" onClick={() => setIsBulkAssignOpen(false)}>Cancel</Button>
             <Button onClick={handleBulkAssignConfirm} disabled={isSubmitting}>
                 {isSubmitting ? 'Assigning...' : 'Confirm'}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

       <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move {selectedTestCases.length} test case(s) to the trash.
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

      <Dialog open={isAttachmentDialogOpen} onOpenChange={setIsAttachmentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Attachment URL</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Label htmlFor="attachment-url">Attachment Link (URL)</Label>
            <Input
              id="attachment-url"
              placeholder="https://example.com/your-attachment-url"
              value={tempAttachmentUrl}
              onChange={(e) => setTempAttachmentUrl(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAttachmentDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              form.setValue('attachment', tempAttachmentUrl);
              setIsAttachmentDialogOpen(false);
            }}>Save Attachment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
