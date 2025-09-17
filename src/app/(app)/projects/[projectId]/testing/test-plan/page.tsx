

'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, ChevronLeft, ChevronRight, Edit, Trash2, ArrowUpDown, X } from 'lucide-react';
import type { TestCase, TestCaseStatus, TestCaseType, Story, Sprint, Release, Employee, TestPlan } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { format, eachDayOfInterval, parseISO, addDays, subDays, isSameDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


const testPlanSchemaBase = z.object({
  name: z.string().min(1, 'Plan name is required.'),
  planType: z.enum(['Sprint', 'Release']),
  sprintId: z.string().optional(),
  releaseId: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
});

const refinedTestPlanSchema = testPlanSchemaBase.superRefine((data, ctx) => {
  if (data.planType === 'Sprint' && !data.sprintId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'A sprint must be selected.',
      path: ['sprintId'],
    });
  }
  if (data.planType === 'Release' && !data.releaseId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'A release must be selected.',
      path: ['releaseId'],
    });
  }
});

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
  testPlanId: z.string().optional(),
  executionDate: z.string().optional(),
});

const testCaseStatuses: TestCaseStatus[] = ['Not Run', 'Passed', 'Failed', 'Blocked', 'Skipped'];
const testCaseTypes: TestCaseType[] = ['Functional', 'Non-functional'];


const statusStyles: Record<TestCaseStatus, string> = {
  'Passed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'Failed': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'Blocked': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'Skipped': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'Not Run': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};


export default function TestPlanPage() {
  const {
    testCases,
    addTestPlan,
    updateTestCase,
    testPlans,
    sprints,
    releasesAndMilestones,
    employees,
    stories,
    environments,
    updateTestPlan,
    deleteTestPlan,
  } = useProject();
  const { toast } = useToast();
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [isTestCaseDialogOpen, setIsTestCaseDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TestPlan | null>(null);
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<TestPlan | null>(null);
  const [deleteTestCasesWithPlan, setDeleteTestCasesWithPlan] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedBacklogTCs, setSelectedBacklogTCs] = useState<string[]>([]);
  const [selectedScheduledTCs, setSelectedScheduledTCs] = useState<string[]>([]);
  const [relatedStoryInputText, setRelatedStoryInputText] = useState('');
  const [currentExecutionDay, setCurrentExecutionDay] = useState<Date | null>(null);
  
  const releases = releasesAndMilestones.filter(r => r.itemType === 'Release');

  const testPlanForm = useForm<z.infer<typeof refinedTestPlanSchema>>({
    resolver: zodResolver(refinedTestPlanSchema),
    defaultValues: {
      planType: 'Sprint',
    }
  });
  
  const testCaseForm = useForm<z.infer<typeof testCaseFormSchema>>({});

  const watchedPlanType = useWatch({ control: testPlanForm.control, name: 'planType' });
  const watchedSprintId = useWatch({ control: testPlanForm.control, name: 'sprintId' });
  const watchedReleaseId = useWatch({ control: testPlanForm.control, name: 'releaseId' });
  
  const [filters, setFilters] = useState<Record<string, string[]>>({
    sprintId: [],
    releaseId: [],
    status: [],
  });
  const [sorting, setSorting] = useState<{ id: string; desc: boolean } | null>(null);
  
  useEffect(() => {
    if (watchedPlanType === 'Sprint' && watchedSprintId) {
        const sprint = sprints.find(s => s.id === watchedSprintId);
        if (sprint && sprint.startDate && sprint.endDate) {
            testPlanForm.setValue('startDate', format(parseISO(sprint.startDate), 'yyyy-MM-dd'));
            testPlanForm.setValue('endDate', format(parseISO(sprint.endDate), 'yyyy-MM-dd'));
        }
    } else if (watchedPlanType === 'Release' && watchedReleaseId) {
        const release = releases.find(r => r.id === watchedReleaseId);
        if (release && release.startDate && release.endDate) {
            testPlanForm.setValue('startDate', format(parseISO(release.startDate), 'yyyy-MM-dd'));
            testPlanForm.setValue('endDate', format(parseISO(release.endDate), 'yyyy-MM-dd'));
        }
    }
  }, [watchedPlanType, watchedSprintId, watchedReleaseId, sprints, releases, testPlanForm]);


  const selectedPlan = useMemo(() => {
    if (!testPlans || testPlans.length === 0) return null;
    const currentPlan = testPlans.find(p => p.id === selectedPlanId);
    if(currentPlan) return currentPlan;
    if (testPlans.length > 0) {
      const firstPlanId = testPlans[0].id;
      setSelectedPlanId(firstPlanId);
      return testPlans[0];
    }
    return null;
  }, [selectedPlanId, testPlans]);
  
  useEffect(() => {
    if (testPlans && testPlans.length > 0 && !selectedPlanId) {
      setSelectedPlanId(testPlans[0].id);
    }
  }, [testPlans, selectedPlanId]);

   useEffect(() => {
    if (selectedPlan && selectedPlan.startDate) {
      setCurrentExecutionDay(parseISO(selectedPlan.startDate));
    } else {
      setCurrentExecutionDay(null);
    }
  }, [selectedPlan]);
  
  useEffect(() => {
    if(isPlanDialogOpen && editingPlan) {
        testPlanForm.reset({
            name: editingPlan.name,
            planType: editingPlan.planType,
            sprintId: editingPlan.sprintId,
            releaseId: editingPlan.releaseId,
            startDate: editingPlan.startDate ? format(parseISO(editingPlan.startDate), 'yyyy-MM-dd') : '',
            endDate: editingPlan.endDate ? format(parseISO(editingPlan.endDate), 'yyyy-MM-dd') : '',
        });
    } else if (isPlanDialogOpen && !editingPlan) {
      testPlanForm.reset({
        name: '',
        planType: 'Sprint',
        sprintId: undefined,
        releaseId: undefined,
        startDate: '',
        endDate: '',
      })
    }
  }, [isPlanDialogOpen, editingPlan, testPlanForm]);

  const storyOptions = useMemo(() => stories
    .filter(s => s.itemType === 'Requirement/Story')
    .map(story => ({
      value: story.id,
      label: `[${story.storyId}] ${story.title}`,
    })), [stories]);

  useEffect(() => {
    if (isTestCaseDialogOpen && editingTestCase) {
        const relatedStory = storyOptions.find(opt => opt.value === editingTestCase.storyId);
        setRelatedStoryInputText(relatedStory?.label || '');
        testCaseForm.reset({
            ...editingTestCase,
            storyId: editingTestCase.storyId || '',
            releaseId: editingTestCase.releaseId || 'unassigned',
            sprintId: editingTestCase.sprintId || 'backlog',
            assigneeId: editingTestCase.assigneeId || 'unassigned',
            testPlanId: editingTestCase.testPlanId || 'none',
            executionDate: editingTestCase.executionDate ? format(parseISO(editingTestCase.executionDate), 'yyyy-MM-dd') : '',
        });
    }
  }, [isTestCaseDialogOpen, editingTestCase, testCaseForm, storyOptions]);


  const onTestPlanSubmit = async (values: z.infer<typeof refinedTestPlanSchema>) => {
    const success = editingPlan 
      ? await updateTestPlan(editingPlan.id, values)
      : await addTestPlan(values);
      
    if (success) {
      toast({ title: 'Success', description: `Test plan ${editingPlan ? 'updated' : 'created'}.` });
      setIsPlanDialogOpen(false);
      setEditingPlan(null);
      testPlanForm.reset();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: `Could not ${editingPlan ? 'update' : 'create'} test plan.` });
    }
  };

  const onTestCaseSubmit = async (values: z.infer<typeof testCaseFormSchema>) => {
    if (!editingTestCase) return;
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
        testPlanId: values.testPlanId === 'none' ? undefined : values.testPlanId,
        executionDate: values.executionDate ? new Date(values.executionDate).toISOString() : undefined,
    };
    const success = await updateTestCase(editingTestCase.id, testCaseData);
    if (success) {
      toast({ title: 'Success', description: 'Test Case updated.' });
      setIsTestCaseDialogOpen(false);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update Test Case.' });
    }
  };
  
  const handleDeletePlan = async () => {
    if (!deletingPlan) return;
    const success = await deleteTestPlan(deletingPlan.id, deleteTestCasesWithPlan);
    if(success) {
      toast({title: "Success", description: "Test plan deleted."});
      setSelectedPlanId(null);
    } else {
      toast({variant: "destructive", title: "Error", description: "Could not delete test plan."})
    }
    setDeletingPlan(null);
  };

  const handleBulkMoveToTP = () => {
    if (selectedBacklogTCs.length === 0 || !currentExecutionDay || !selectedPlan) return;

    const updates = selectedBacklogTCs.map(tcId => 
      updateTestCase(tcId, {
        executionDate: currentExecutionDay.toISOString(),
        testPlanId: selectedPlan.id
      })
    );
    
    Promise.all(updates).then(() => {
        toast({ title: "Success", description: `${selectedBacklogTCs.length} test cases moved.`});
        setSelectedBacklogTCs([]);
    });
  }

  const handleBulkMoveToBacklog = () => {
    if (selectedScheduledTCs.length === 0) return;

    const updates = selectedScheduledTCs.map(tcId => 
      updateTestCase(tcId, {
        executionDate: undefined,
        testPlanId: undefined
      })
    );
    
    Promise.all(updates).then(() => {
        toast({ title: "Success", description: `${selectedScheduledTCs.length} test cases moved.`});
        setSelectedScheduledTCs([]);
    });
  }

  const { tcsForCurrentDay, backlog } = useMemo(() => {
    const dateStr = currentExecutionDay ? format(currentExecutionDay, 'yyyy-MM-dd') : null;

    let backlogTCs: TestCase[] = [];
    let dayTCs: TestCase[] = [];

    testCases.forEach(tc => {
        const executionDateStr = tc.executionDate ? format(parseISO(tc.executionDate), 'yyyy-MM-dd') : undefined;
        
        if (tc.testPlanId === selectedPlan?.id && executionDateStr === dateStr) {
            dayTCs.push(tc);
        } else if (!tc.testPlanId || tc.testPlanId !== selectedPlan?.id || !tc.executionDate) {
            backlogTCs.push(tc);
        }
    });
    
    return { tcsForCurrentDay: dayTCs, backlog: backlogTCs };
}, [selectedPlan, testCases, currentExecutionDay]);


  const planDays = useMemo(() => {
    if (!selectedPlan?.startDate || !selectedPlan.endDate) return [];
    return eachDayOfInterval({ start: parseISO(selectedPlan.startDate), end: parseISO(selectedPlan.endDate) });
  }, [selectedPlan]);


  const handleDayChange = (direction: 'next' | 'prev') => {
    if (!currentExecutionDay || !selectedPlan || planDays.length === 0) return;
    const currentIndex = planDays.findIndex(day => isSameDay(day, currentExecutionDay));
    if (direction === 'next') {
        const nextIndex = Math.min(planDays.length - 1, currentIndex + 1);
        setCurrentExecutionDay(planDays[nextIndex]);
    } else {
        const prevIndex = Math.max(0, currentIndex - 1);
        setCurrentExecutionDay(planDays[prevIndex]);
    }
  };
  
  const handleSort = (columnId: string) => {
    if (sorting?.id === columnId) {
      setSorting({ ...sorting, desc: !sorting.desc });
    } else {
      setSorting({ id: columnId, desc: false });
    }
  };

  const handleFilterChange = (columnId: string, value: string) => {
    setFilters(prev => {
        const currentFilter = prev[columnId] || [];
        const newFilters = { ...prev };
        if (currentFilter.includes(value)) {
            newFilters[columnId] = currentFilter.filter(v => v !== value);
        } else {
            newFilters[columnId] = [...currentFilter, value];
        }
        return newFilters;
    })
  };
  
  const handleTestCaseDialogOpen = (testCase: TestCase) => {
    setEditingTestCase(testCase);
    setIsTestCaseDialogOpen(true);
  };
  
  const SortableHeader = ({ columnId, children }: { columnId: string; children: React.ReactNode }) => (
    <TableHead>
      <Button variant="ghost" onClick={() => handleSort(columnId)}>
        {children}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    </TableHead>
  );

  return (
    <div className="flex flex-col h-full space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="Test Plan" description="Create and manage test execution plans.">
        <Select onValueChange={setSelectedPlanId} value={selectedPlanId || ''}>
            <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select a Test Plan" />
            </SelectTrigger>
            <SelectContent>
                {testPlans?.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                ))}
            </SelectContent>
        </Select>
        <Button onClick={() => { setEditingPlan(null); setIsPlanDialogOpen(true); }}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create Test Plan
        </Button>
      </PageHeader>
      
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">
          {/* Left Column: Backlog */}
          <div className="bg-muted/50 rounded-lg p-4 h-full flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-lg">Test Case Backlog ({backlog.length})</h3>
              <Button 
                size="sm" 
                onClick={handleBulkMoveToTP}
                disabled={selectedBacklogTCs.length === 0 || !currentExecutionDay}
              >
                Move to TP
              </Button>
            </div>
            <div className="border rounded-lg flex-1 flex flex-col min-h-0">
              <div className="overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/50 z-10">
                    <TableRow>
                      <TableHead>
                          <Checkbox 
                              onCheckedChange={(checked) => setSelectedBacklogTCs(checked ? backlog.map(tc => tc.id) : [])}
                              checked={backlog.length > 0 && selectedBacklogTCs.length === backlog.length}
                          />
                      </TableHead>
                      <SortableHeader columnId="testCaseId">ID</SortableHeader>
                      <SortableHeader columnId="sprintId">Sprint</SortableHeader>
                      <SortableHeader columnId="releaseId">Release</SortableHeader>
                      <SortableHeader columnId="status">Status</SortableHeader>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backlog.map(tc => {
                      const sprint = sprints.find(s => s.id === tc.sprintId);
                      const release = releases.find(r => r.id === tc.releaseId);
                      return (
                        <TableRow key={tc.id}>
                          <TableCell>
                              <Checkbox
                                  checked={selectedBacklogTCs.includes(tc.id)}
                                  onCheckedChange={(checked) => setSelectedBacklogTCs(prev => checked ? [...prev, tc.id] : prev.filter(id => id !== tc.id))}
                              />
                          </TableCell>
                          <TableCell className="py-1">
                               <button onClick={() => handleTestCaseDialogOpen(tc)} className="text-left font-medium text-primary hover:underline">
                                <Badge variant="secondary">{tc.testCaseId}</Badge>
                              </button>
                          </TableCell>
                          <TableCell>{sprint?.title || 'Backlog'}</TableCell>
                          <TableCell>{release?.name || 'N/A'}</TableCell>
                          <TableCell><Badge className={cn(statusStyles[tc.status])}>{tc.status}</Badge></TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
          
          {/* Right Column: Execution Plan */}
          <div className="bg-muted/50 rounded-lg p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-4">
                {selectedPlan ? (
                  <>
                    <h3 className="font-bold text-lg">{selectedPlan.name} ({selectedPlan.testPlanId})</h3>
                    <Button variant="ghost" size="icon" onClick={() => { setEditingPlan(selectedPlan); setIsPlanDialogOpen(true); }}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => { setDeleteTestCasesWithPlan(false); setDeletingPlan(selectedPlan); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </>
                ) : (
                  <h3 className="font-bold text-lg">Execution Plan</h3>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleBulkMoveToBacklog} disabled={selectedScheduledTCs.length === 0}>
                  Move to Backlog
                </Button>
                 <Button variant="outline" size="icon" onClick={() => handleDayChange('prev')} disabled={!selectedPlan}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => handleDayChange('next')} disabled={!selectedPlan}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {selectedPlan ? (
                <div className="border rounded-lg flex-1 flex flex-col min-h-0">
                    <div className="p-2 border-b bg-background flex justify-between items-center">
                        <h4 className="font-semibold">{currentExecutionDay ? format(currentExecutionDay, 'EEE, MMM d') : 'No Date Selected'}</h4>
                    </div>
                    <div className="overflow-y-auto flex-1">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>
                                        <Checkbox 
                                            onCheckedChange={(checked) => setSelectedScheduledTCs(checked ? tcsForCurrentDay.map(tc => tc.id) : [])}
                                            checked={tcsForCurrentDay.length > 0 && selectedScheduledTCs.length === tcsForCurrentDay.length}
                                        />
                                    </TableHead>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Sprint</TableHead>
                                    <TableHead>Release</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tcsForCurrentDay.map(tc => {
                                    const sprint = sprints.find(s => s.id === tc.sprintId);
                                    const release = releases.find(r => r.id === tc.releaseId);
                                    return (
                                        <TableRow key={tc.id}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedScheduledTCs.includes(tc.id)}
                                                    onCheckedChange={(checked) => setSelectedScheduledTCs(prev => checked ? [...prev, tc.id] : prev.filter(id => id !== tc.id))}
                                                />
                                            </TableCell>
                                            <TableCell className="py-1">
                                                <button onClick={() => handleTestCaseDialogOpen(tc)} className="text-left font-medium text-primary hover:underline">
                                                    <Badge variant="secondary">{tc.testCaseId}</Badge>
                                                </button>
                                            </TableCell>
                                            <TableCell>{sprint?.title || 'Backlog'}</TableCell>
                                            <TableCell>{release?.name || 'N/A'}</TableCell>
                                            <TableCell><Badge className={cn(statusStyles[tc.status])}>{tc.status}</Badge></TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </div>
              ) : (
                <div className="border rounded-lg flex-1 flex flex-col items-center justify-center text-muted-foreground">
                    <p>No test plan selected.</p>
                    <p className="text-sm">Please select a plan from the dropdown or create a new one.</p>
                </div>
              )}
          </div>
      </div>

    <Dialog open={isPlanDialogOpen} onOpenChange={(open) => { setIsPlanDialogOpen(open); if(!open) setEditingPlan(null); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingPlan ? 'Edit Test Plan' : 'Create New Test Plan'}</DialogTitle>
        </DialogHeader>
         <Tabs defaultValue="details" className="w-full">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
          <TabsContent value="details">
            <Form {...testPlanForm}>
              <form onSubmit={testPlanForm.handleSubmit(onTestPlanSubmit)} className="space-y-4 pt-4">
                <FormField control={testPlanForm.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={testPlanForm.control} name="planType" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Plan Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="Sprint">Sprint</SelectItem>
                                <SelectItem value="Release">Release</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}/>
                {watchedPlanType === 'Sprint' && (
                  <FormField control={testPlanForm.control} name="sprintId" render={({ field }) => (
                      <FormItem>
                          <FormLabel>Sprint</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Select a sprint..." /></SelectTrigger></FormControl>
                              <SelectContent>
                                  {sprints.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                              </SelectContent>
                          </Select>
                          <FormMessage />
                      </FormItem>
                  )}/>
                )}
                {watchedPlanType === 'Release' && (
                    <FormField control={testPlanForm.control} name="releaseId" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Release</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select a release..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {releases.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}/>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={testPlanForm.control} name="startDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl><Input type="date" {...field} value={field.value || ''} readOnly={!!(watchedSprintId || watchedReleaseId)} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}/>
                  <FormField control={testPlanForm.control} name="endDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl><Input type="date" {...field} value={field.value || ''} readOnly={!!(watchedSprintId || watchedReleaseId)}/></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}/>
                </div>
                <DialogFooter>
                  <Button type="submit">{editingPlan ? 'Save Changes' : 'Create Plan'}</Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>
         </Tabs>
      </DialogContent>
    </Dialog>
    
    <Dialog open={isTestCaseDialogOpen} onOpenChange={setIsTestCaseDialogOpen}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Test Case</DialogTitle>
        </DialogHeader>
         <Form {...testCaseForm}>
          <form onSubmit={testCaseForm.handleSubmit(onTestCaseSubmit)} className="space-y-4">
            <FormField control={testCaseForm.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input placeholder="E.g., Verify user login with valid credentials" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
            )} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={testCaseForm.control} name="type" render={({ field }) => (
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
                <FormField control={testCaseForm.control} name="status" render={({ field }) => (
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
             <FormField control={testCaseForm.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Steps)</FormLabel>
                  <FormControl><Textarea placeholder="1. Navigate to login page..." {...field} rows={4} /></FormControl>
                  <FormMessage />
                </FormItem>
            )} />
             <FormField control={testCaseForm.control} name="expectedResult" render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Result</FormLabel>
                  <FormControl><Textarea placeholder="User should be successfully logged in and redirected to the dashboard." {...field} rows={3} /></FormControl>
                  <FormMessage />
                </FormItem>
            )} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={testCaseForm.control} name="assigneeId" render={({ field }) => (
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
                 <FormField control={testCaseForm.control} name="storyId" render={({ field }) => (
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
                    control={testCaseForm.control}
                    name="sprintId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Sprint</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || 'backlog'}
                          disabled={!!testCaseForm.getValues('storyId')}
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
                    control={testCaseForm.control}
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
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={testCaseForm.control}
                    name="testPlanId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Test Plan</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || 'none'}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Assign to a Test Plan" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">TC Backlog</SelectItem>
                            {testPlans.map((plan) => (
                              <SelectItem key={plan.id} value={plan.id}>
                                [{plan.testPlanId}] {plan.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={testCaseForm.control}
                    name="executionDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Execution Date</FormLabel>
                         <FormControl>
                          <Input type="date" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>
            <DialogFooter>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    
    <AlertDialog open={!!deletingPlan} onOpenChange={(isOpen) => { if (!isOpen) setDeletingPlan(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action will delete the test plan "{deletingPlan?.name}". By default, test cases will be moved to the backlog.
          </AlertDialogDescription>
          <div className="flex items-center space-x-2 pt-4">
            <Checkbox
              id="delete-test-cases"
              checked={deleteTestCasesWithPlan}
              onCheckedChange={(checked) => setDeleteTestCasesWithPlan(!!checked)}
            />
            <label
              htmlFor="delete-test-cases"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Also permanently delete all test cases within this plan.
            </label>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDeletePlan}
            className={cn(buttonVariants({ variant: 'destructive' }))}
          >
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
  );
}

