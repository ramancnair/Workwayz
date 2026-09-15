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
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, ChevronDown, ChevronRight, Edit, Trash2, ArrowUpDown, X, ChevronsUpDown, Search, ArrowRight, Paperclip, Plus, Link as LinkIcon, Check } from 'lucide-react';
import type { TestCase, TestCaseStatus, TestCaseType, Story, Sprint, Release, Employee, TestCycle, TestCycleTestCase } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { format, eachDayOfInterval, parseISO, isSameDay } from 'date-fns';
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
import { cn, isValidUrl, formatUrl } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


const testCycleSchemaBase = z.object({
  name: z.string().min(1, 'Cycle name is required.').max(60, 'Cycle name cannot exceed 60 characters.'),
  planType: z.enum(['Sprint', 'Release']),
  sprintId: z.string().optional(),
  releaseId: z.string().optional(),
  environmentId: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required.'),
  endDate: z.string().min(1, 'End date is required.'),
});

const refinedTestCycleSchema = testCycleSchemaBase.superRefine((data, ctx) => {
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
  if (data.startDate && data.endDate && new Date(data.endDate) < new Date(data.startDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'End date cannot be earlier than start date.',
      path: ['endDate'],
    });
  }
});

const testCaseFormSchema = z.object({
  title: z.string().min(1, 'Title is required.').max(60, 'Title cannot exceed 60 characters.'),
  type: z.enum(['Functional', 'Non-functional']),
  description: z.string().min(1, 'Description is required.').max(300, 'Description cannot exceed 300 characters.'),
  expectedResult: z.string().min(1, 'Expected result is required.'),
  status: z.enum(['Passed', 'Failed', 'Blocked', 'Not Run', 'Skipped']),
  assigneeId: z.string().optional(),
  executionDate: z.string().optional(),
  effortHours: z.string().optional(),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string().refine(val => !val || val.trim() === '' || isValidUrl(val), {
      message: "Please enter a valid URL (e.g. https://example.com or www.example.com).",
    }),
  })).optional(),
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


export default function TestCyclePage() {
  const {
    testCases,
    addTestCycle,
    testCycles,
    sprints,
    releasesAndMilestones,
    employees,
    stories,
    environments,
    updateTestCycle,
    deleteTestCycle,
    testCycleTestCases,
    addTestCasesToCycle,
    updateTestCycleTestCase,
    removeTestCasesFromCycle,
    subscribeToTestCycleTestCases,
  } = useProject();
  const { toast } = useToast();
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [isTestCaseDialogOpen, setIsTestCaseDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TestCycle | null>(null);
  const [editingTestCase, setEditingTestCase] = useState<TestCycleTestCase | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<TestCycle | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedBacklogTCs, setSelectedBacklogTCs] = useState<string[]>([]);
  const [selectedScheduledTCs, setSelectedScheduledTCs] = useState<string[]>([]);
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});
  
  const releases = releasesAndMilestones.filter(r => r.itemType === 'Release');

  const testCycleForm = useForm<z.infer<typeof refinedTestCycleSchema>>({
    resolver: zodResolver(refinedTestCycleSchema),
    defaultValues: {
      planType: 'Sprint',
    }
  });

  const testCaseForm = useForm<z.infer<typeof testCaseFormSchema>>({});
  const [editingAttachmentIndices, setEditingAttachmentIndices] = useState<Record<number, boolean>>({});

  const watchedPlanType = useWatch({ control: testCycleForm.control, name: 'planType' });

  const [backlogSorting, setBacklogSorting] = useState<{ id: string; desc: boolean | null } | null>(null);
  const [backlogSearchQuery, setBacklogSearchQuery] = useState('');
  const [backlogSprintFilter, setBacklogSprintFilter] = useState<string>('all');

  const selectedPlan = useMemo(() => {
    if (!testCycles || testCycles.length === 0) return null;
    const currentPlan = testCycles.find(p => p.id === selectedPlanId);
    if (currentPlan) return currentPlan;
    if (testCycles.length > 0) {
      const firstPlanId = testCycles[0].id;
      setSelectedPlanId(firstPlanId);
      return testCycles[0];
    }
    return null;
  }, [selectedPlanId, testCycles]);

  useEffect(() => {
    if (testCycles && testCycles.length > 0 && !selectedPlanId) {
      setSelectedPlanId(testCycles[0].id);
    }
  }, [testCycles, selectedPlanId]);

  // Subscribe to test cycle test cases when selected cycle changes
  useEffect(() => {
    if (!selectedPlanId) return;
    const unsubscribe = subscribeToTestCycleTestCases(selectedPlanId);
    return () => unsubscribe();
  }, [selectedPlanId, subscribeToTestCycleTestCases]);

  useEffect(() => {
    if (isPlanDialogOpen && editingPlan) {
      const formatDateStr = (dStr: any) => {
        if (!dStr) return '';
        try {
          const d = typeof dStr === 'string' ? parseISO(dStr) : new Date(dStr);
          return isNaN(d.getTime()) ? '' : format(d, 'yyyy-MM-dd');
        } catch {
          return '';
        }
      };

      testCycleForm.reset({
        name: (editingPlan.name || '').slice(0, 60),
        planType: editingPlan.planType,
        sprintId: editingPlan.sprintId,
        releaseId: editingPlan.releaseId,
        environmentId: editingPlan.environmentId,
        startDate: formatDateStr(editingPlan.startDate),
        endDate: formatDateStr(editingPlan.endDate),
      });
    } else if (isPlanDialogOpen && !editingPlan) {
      testCycleForm.reset({
        name: '',
        planType: 'Sprint',
        sprintId: undefined,
        releaseId: undefined,
        environmentId: undefined,
        startDate: '',
        endDate: '',
      });
    }
  }, [isPlanDialogOpen, editingPlan, testCycleForm]);

  useEffect(() => {
    if (isTestCaseDialogOpen && editingTestCase) {
        let initialAttachments = (editingTestCase.attachments || []).map(a => ({ name: a.name || '', url: a.url || '' }));
        if (initialAttachments.length === 0 && editingTestCase.attachment) {
          initialAttachments = [{ name: 'Attachment', url: editingTestCase.attachment }];
        }
        setEditingAttachmentIndices({});
        testCaseForm.reset({
            title: (editingTestCase.title || '').slice(0, 60),
            type: editingTestCase.type,
            description: (editingTestCase.description || '').slice(0, 300),
            expectedResult: editingTestCase.expectedResult,
            status: editingTestCase.status || 'Not Run',
            assigneeId: editingTestCase.assigneeId || 'unassigned',
            executionDate: editingTestCase.executionDate ? format(parseISO(editingTestCase.executionDate), 'yyyy-MM-dd') : '',
            effortHours: editingTestCase.effortHours !== undefined && editingTestCase.effortHours !== null ? String(editingTestCase.effortHours) : '',
            attachments: initialAttachments,
        });
    }
  }, [isTestCaseDialogOpen, editingTestCase, testCaseForm]);


  const onTestCycleSubmit = async (values: z.infer<typeof refinedTestCycleSchema>) => {
    const success = editingPlan
      ? await updateTestCycle(editingPlan.id, values)
      : await addTestCycle(values);

    if (success) {
      toast({ title: 'Success', description: `Test cycle ${editingPlan ? 'updated' : 'created'}.` });
      setIsPlanDialogOpen(false);
      setEditingPlan(null);
      testCycleForm.reset();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: `Could not ${editingPlan ? 'update' : 'create'} test cycle.` });
    }
  };

  const onTestCaseSubmit = async (values: z.infer<typeof testCaseFormSchema>) => {
    if (!editingTestCase || !selectedPlanId) return;

    // Validate attachment URLs
    const invalidAttachment = (values.attachments || []).find(
      a => a.url && a.url.trim() !== '' && !isValidUrl(a.url)
    );
    if (invalidAttachment) {
      toast({
        variant: 'destructive',
        title: 'Invalid URL',
        description: `Attachment "${invalidAttachment.name || 'Untitled'}" has an invalid URL format. Please enter a valid URL (e.g. https://example.com or www.example.com).`,
      });
      return;
    }

    const parsedEffort = values.effortHours && values.effortHours.trim() !== ''
      ? parseFloat(values.effortHours)
      : undefined;

    const cleanedAttachments = (values.attachments || [])
      .map(a => ({ name: (a.name || '').trim(), url: a.url && a.url.trim() !== '' ? formatUrl(a.url) : '' }))
      .filter(a => a.name !== '' || a.url !== '');

    const updateData: Partial<TestCycleTestCase> = {
      title: values.title,
      type: values.type,
      description: values.description,
      expectedResult: values.expectedResult,
      status: values.status,
      assigneeId: values.assigneeId === 'unassigned' ? undefined : values.assigneeId,
      executionDate: values.executionDate ? new Date(values.executionDate).toISOString() : undefined,
      effortHours: parsedEffort !== undefined && !isNaN(parsedEffort) ? parsedEffort : undefined,
      attachments: cleanedAttachments,
    };

    const success = await updateTestCycleTestCase(selectedPlanId, editingTestCase.id, updateData);
    if (success) {
      toast({ title: 'Success', description: 'Test Case updated.' });
      setIsTestCaseDialogOpen(false);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update Test Case.' });
    }
  };

  const handleDeletePlan = async () => {
    if (!deletingPlan) return;
    const success = await deleteTestCycle(deletingPlan.id);
    if (success) {
      toast({ title: "Success", description: "Test cycle deleted." });
      setSelectedPlanId(null);
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not delete test cycle." })
    }
    setDeletingPlan(null);
  };

  // Get test cases for current cycle from subcollection
  const planTestCases = useMemo(() => {
    if (!selectedPlanId) return [];
    return testCycleTestCases[selectedPlanId] || [];
  }, [selectedPlanId, testCycleTestCases]);

  const existingOrigIds = useMemo(() => {
    return new Set(planTestCases.map(ptc => ptc.originalTestCaseId).filter(Boolean));
  }, [planTestCases]);

  const planDays = useMemo(() => {
    if (!selectedPlan?.startDate || !selectedPlan.endDate) return [];
    try {
      const start = parseISO(selectedPlan.startDate);
      const end = parseISO(selectedPlan.endDate);
      if (start > end) return [start];
      return eachDayOfInterval({ start, end });
    } catch (e) {
      return [];
    }
  }, [selectedPlan]);

  // Keep all days open by default when a cycle or dates change
  useEffect(() => {
    if (selectedPlan) {
      const initial: Record<string, boolean> = {};
      planDays.forEach(d => {
        initial[format(d, 'yyyy-MM-dd')] = true;
      });
      initial['unscheduled'] = true;
      setOpenDays(initial);
    }
  }, [selectedPlan?.id, planDays.length]);

  const toggleDay = (key: string) => {
    setOpenDays(prev => ({
      ...prev,
      [key]: prev[key] === undefined ? false : !prev[key]
    }));
  };

  const isAnyCollapsed = useMemo(() => {
    if (planDays.length === 0) return false;
    return planDays.some(d => openDays[format(d, 'yyyy-MM-dd')] === false);
  }, [planDays, openDays]);

  const toggleAllDays = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    planDays.forEach(d => {
      next[format(d, 'yyyy-MM-dd')] = expand;
    });
    next['unscheduled'] = expand;
    setOpenDays(next);
  };

  const groupedPlanTestCases = useMemo(() => {
    if (!selectedPlan) return { dayMap: {}, unscheduled: [] };

    const dayMap: Record<string, TestCycleTestCase[]> = {};
    planDays.forEach(d => {
      dayMap[format(d, 'yyyy-MM-dd')] = [];
    });

    const unscheduled: TestCycleTestCase[] = [];

    planTestCases.forEach(tc => {
      if (tc.executionDate) {
        try {
          const dStr = format(parseISO(tc.executionDate), 'yyyy-MM-dd');
          if (dayMap[dStr]) {
            dayMap[dStr].push(tc);
            return;
          }
        } catch (e) {}
      }
      unscheduled.push(tc);
    });

    return { dayMap, unscheduled };
  }, [selectedPlan, planDays, planTestCases]);

  const backlog = useMemo(() => {
    // Backlog: all non-deleted test cases not already in this test cycle
    let backlogTCs = testCases.filter(tc => !tc.isDeleted && !existingOrigIds.has(tc.id));

    // Apply Search Query Filter (ID or Title)
    if (backlogSearchQuery.trim()) {
      const q = backlogSearchQuery.trim().toLowerCase();
      backlogTCs = backlogTCs.filter(tc => 
        (tc.testCaseId && tc.testCaseId.toLowerCase().includes(q)) ||
        (tc.title && tc.title.toLowerCase().includes(q))
      );
    }

    // Apply Sprint Filter
    if (backlogSprintFilter !== 'all') {
      if (backlogSprintFilter === 'unassigned') {
        backlogTCs = backlogTCs.filter(tc => !tc.sprintId);
      } else {
        backlogTCs = backlogTCs.filter(tc => tc.sprintId === backlogSprintFilter);
      }
    }

    const sortFn = (sortObj: { id: string; desc: boolean | null } | null) => (a: any, b: any) => {
      if (!sortObj || sortObj.desc === null) return 0;
      const sortKey = sortObj.id as string;
      let valA, valB;
      if (sortKey === 'status') {
        valA = a.status || 'Not Run';
        valB = b.status || 'Not Run';
      } else if (sortKey === 'sprintId') {
        const sprintA = sprints.find(s => s.id === a.sprintId);
        const sprintB = sprints.find(s => s.id === b.sprintId);
        valA = sprintA?.title || 'Backlog';
        valB = sprintB?.title || 'Backlog';
      } else {
        valA = a[sortKey];
        valB = b[sortKey];
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

      return sortObj.desc ? -comparison : comparison;
    };

    if (backlogSorting && backlogSorting.desc !== null) {
      backlogTCs = [...backlogTCs].sort(sortFn(backlogSorting));
    }

    return backlogTCs;
  }, [testCases, existingOrigIds, backlogSorting, backlogSearchQuery, backlogSprintFilter, sprints]);

  const handleMoveToDay = async (targetDay: Date | null) => {
    if (selectedBacklogTCs.length === 0 || !selectedPlan) return;

    const toAdd = selectedBacklogTCs;
    const dateIso = targetDay ? targetDay.toISOString() : undefined;

    const success = await addTestCasesToCycle(
      selectedPlan.id,
      toAdd,
      dateIso
    );

    if (success) {
      toast({
        title: 'Success',
        description: `${toAdd.length} test case${toAdd.length > 1 ? 's' : ''} moved to ${targetDay ? format(targetDay, 'EEE, MMM d') : 'Cycle'}.`,
      });
      setSelectedBacklogTCs([]);
      if (targetDay) {
        const key = format(targetDay, 'yyyy-MM-dd');
        setOpenDays(prev => ({ ...prev, [key]: true }));
      }
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not add test cases to cycle.' });
    }
  };

  const handleBulkMoveToBacklog = async () => {
    if (selectedScheduledTCs.length === 0 || !selectedPlan) return;

    const success = await removeTestCasesFromCycle(selectedPlan.id, selectedScheduledTCs);
    if (success) {
      toast({ title: 'Success', description: `${selectedScheduledTCs.length} test case${selectedScheduledTCs.length > 1 ? 's' : ''} removed from cycle.` });
      setSelectedScheduledTCs([]);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not remove test cases from cycle.' });
    }
  };

  const handleBacklogSort = (columnId: string) => {
    setBacklogSorting(current => {
      if (current?.id === columnId) {
        if (current.desc === false) return { id: columnId, desc: true };
        if (current.desc === true) return { id: columnId, desc: null };
        return null;
      }
      return { id: columnId, desc: false };
    });
  };

  const handleTestCaseDialogOpen = (testCase: TestCycleTestCase) => {
    setEditingTestCase(testCase);
    setIsTestCaseDialogOpen(true);
  };

  const SortableHeader = ({ 
    columnId, 
    children, 
    sortState, 
    onSort 
  }: { 
    columnId: string; 
    children: React.ReactNode;
    sortState: { id: string; desc: boolean | null } | null;
    onSort: (columnId: string) => void;
  }) => {
    const isSorting = sortState?.id === columnId && sortState.desc !== null;
    const sortIcon = isSorting ? (<ArrowUpDown className="h-4 w-4 text-primary" />) : (<ChevronsUpDown className="h-4 w-4 text-muted-foreground opacity-60" />);

    return (
      <TableHead>
        <div className="flex items-center gap-2 cursor-pointer select-none hover:text-foreground" onClick={() => onSort(columnId)}>
          <span>{children}</span>
          {sortIcon}
        </div>
      </TableHead>
    );
  };

  return (
    <div className="flex flex-col h-full space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="Test Cycles" description="Create and manage test execution cycles.">
        <Select onValueChange={setSelectedPlanId} value={selectedPlanId || ''}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select a Test Cycle" />
          </SelectTrigger>
          <SelectContent>
            {testCycles?.map(plan => (
              <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => { setEditingPlan(null); setIsPlanDialogOpen(true); }}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Test Cycle
        </Button>
      </PageHeader>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">
        {/* Left Column: Backlog */}
        <div className="bg-muted/50 rounded-lg p-4 h-full flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg whitespace-nowrap">Test Case Backlog ({backlog.length})</h3>
            {selectedBacklogTCs.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {selectedBacklogTCs.length} selected
              </Badge>
            )}
          </div>

          {/* Filters for Backlog */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID or Title..."
                value={backlogSearchQuery}
                onChange={(e) => setBacklogSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
              {backlogSearchQuery && (
                <button
                  onClick={() => setBacklogSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Select value={backlogSprintFilter} onValueChange={setBacklogSprintFilter}>
              <SelectTrigger className="w-full sm:w-[150px] h-9 text-xs">
                <SelectValue placeholder="All Sprints" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sprints</SelectItem>
                <SelectItem value="unassigned">Backlog / Unassigned</SelectItem>
                {sprints.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg flex-1 flex flex-col min-h-0">
            <div className="overflow-y-auto flex-1">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur z-10">
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        onCheckedChange={(checked) => setSelectedBacklogTCs(checked ? backlog.map(tc => tc.id) : [])}
                        checked={backlog.length > 0 && selectedBacklogTCs.length === backlog.length}
                      />
                    </TableHead>
                    <SortableHeader columnId="testCaseId" sortState={backlogSorting} onSort={handleBacklogSort}>ID</SortableHeader>
                    <SortableHeader columnId="title" sortState={backlogSorting} onSort={handleBacklogSort}>Title</SortableHeader>
                    <SortableHeader columnId="sprintId" sortState={backlogSorting} onSort={handleBacklogSort}>Sprint</SortableHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backlog.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-8">
                        {testCases.filter(tc => !tc.isDeleted).length > 0 && existingOrigIds.size > 0
                          ? 'All test cases have been added to this test cycle.'
                          : 'No test cases found.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    backlog.map(tc => {
                      const sprint = sprints.find(s => s.id === tc.sprintId);
                      return (
                        <TableRow key={tc.id} className="hover:bg-muted/30">
                          <TableCell>
                            <Checkbox
                              checked={selectedBacklogTCs.includes(tc.id)}
                              onCheckedChange={(checked) => setSelectedBacklogTCs(prev => checked ? [...prev, tc.id] : prev.filter(id => id !== tc.id))}
                            />
                          </TableCell>
                          <TableCell className="py-1">
                            <Badge variant="secondary">{tc.testCaseId}</Badge>
                          </TableCell>
                          <TableCell className="text-sm truncate max-w-[200px]" title={tc.title}>{tc.title}</TableCell>
                          <TableCell>{sprint?.title || 'Backlog'}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Right Column: Execution Cycle Days */}
        <div className="bg-muted/50 rounded-lg p-4 h-full flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center gap-2">
              {selectedPlan ? (
                <>
                  <h3 className="font-bold text-lg">{selectedPlan.name} ({selectedPlan.testCycleId || selectedPlan.testPlanId})</h3>
                  <Badge variant="outline" className="text-xs font-normal">
                    {planTestCases.length} {planTestCases.length === 1 ? 'case' : 'cases'}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingPlan(selectedPlan); setIsPlanDialogOpen(true); }}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDeletingPlan(selectedPlan); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </>
              ) : (
                <h3 className="font-bold text-lg">Test Cycle</h3>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedPlan && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkMoveToBacklog}
                    disabled={selectedScheduledTCs.length === 0}
                    className="text-xs h-8"
                  >
                    Remove {selectedScheduledTCs.length > 0 && `(${selectedScheduledTCs.length})`}
                  </Button>
                  {planDays.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAllDays(isAnyCollapsed)}
                      className="text-xs text-muted-foreground hover:text-foreground h-8 px-2"
                    >
                      {isAnyCollapsed ? 'Expand All' : 'Collapse All'}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {selectedPlan ? (
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
              {planDays.length === 0 && groupedPlanTestCases.unscheduled.length === 0 && (
                <div className="border rounded-lg p-6 text-center text-muted-foreground bg-background/50">
                  <p className="text-sm">No start/end date configured for this test cycle.</p>
                  <p className="text-xs text-muted-foreground mt-1">Edit the cycle to set start and end dates.</p>
                </div>
              )}

              {planDays.map((day, idx) => {
                const dayKey = format(day, 'yyyy-MM-dd');
                const dayTCs = groupedPlanTestCases.dayMap[dayKey] || [];
                const isOpen = openDays[dayKey] !== false;
                const allDaySelected = dayTCs.length > 0 && dayTCs.every(tc => selectedScheduledTCs.includes(tc.id));
                const someDaySelected = dayTCs.some(tc => selectedScheduledTCs.includes(tc.id)) && !allDaySelected;

                return (
                  <div key={dayKey} className="border rounded-lg overflow-hidden bg-card/60 shadow-sm">
                    {/* Collapsible Subheading Bar */}
                    <div
                      className="px-4 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors flex items-center justify-between cursor-pointer select-none border-b border-border/50"
                      onClick={() => toggleDay(dayKey)}
                    >
                      <div className="flex items-center gap-2.5">
                        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", !isOpen && "-rotate-90")} />
                        <span className="font-semibold text-sm">
                          Day {idx + 1} — {format(day, 'EEE, MMM d, yyyy')}
                        </span>
                        <Badge variant="secondary" className="text-xs px-2 py-0.5 font-normal">
                          {dayTCs.length} {dayTCs.length === 1 ? 'test case' : 'test cases'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={selectedBacklogTCs.length > 0 ? "default" : "secondary"}
                          className={cn(
                            "h-7 text-xs gap-1.5 font-medium transition-all",
                            selectedBacklogTCs.length > 0
                              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                              : "opacity-60 cursor-not-allowed"
                          )}
                          disabled={selectedBacklogTCs.length === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveToDay(day);
                          }}
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                          Move Here {selectedBacklogTCs.length > 0 && `(${selectedBacklogTCs.length})`}
                        </Button>
                      </div>
                    </div>

                    {/* Collapsible Table Content */}
                    {isOpen && (
                      <div className="p-0">
                        {dayTCs.length === 0 ? (
                          <div className="py-4 px-4 text-center text-xs text-muted-foreground bg-background/30">
                            No test cases scheduled for this day. Select test cases from the backlog and click &quot;Move Here&quot;.
                          </div>
                        ) : (
                          <Table>
                            <TableHeader className="bg-muted/20 text-xs">
                              <TableRow>
                                <TableHead className="w-10">
                                  <Checkbox
                                    checked={allDaySelected ? true : (someDaySelected ? 'indeterminate' : false)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedScheduledTCs(prev => Array.from(new Set([...prev, ...dayTCs.map(tc => tc.id)])));
                                      } else {
                                        const dayIds = new Set(dayTCs.map(tc => tc.id));
                                        setSelectedScheduledTCs(prev => prev.filter(id => !dayIds.has(id)));
                                      }
                                    }}
                                  />
                                </TableHead>
                                <TableHead className="w-24">ID</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead className="w-24">Status</TableHead>
                                <TableHead className="w-20 text-right">Effort (h)</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {dayTCs.map(tc => {
                                const cycleIdPrefix = selectedPlan?.testCycleId || selectedPlan?.testPlanId || 'TC';
                                const displayTestCaseId = tc.testCaseId.startsWith(cycleIdPrefix)
                                  ? tc.testCaseId
                                  : `${cycleIdPrefix}-${tc.testCaseId}`;

                                return (
                                  <TableRow key={tc.id} className="hover:bg-muted/30">
                                    <TableCell>
                                      <Checkbox
                                        checked={selectedScheduledTCs.includes(tc.id)}
                                        onCheckedChange={(checked) =>
                                          setSelectedScheduledTCs(prev => checked ? [...prev, tc.id] : prev.filter(id => id !== tc.id))
                                        }
                                      />
                                    </TableCell>
                                    <TableCell className="py-1.5 whitespace-nowrap">
                                      <button
                                        onClick={() => handleTestCaseDialogOpen(tc)}
                                        className="text-left font-medium text-primary hover:underline inline-flex items-center"
                                      >
                                        <Badge variant="secondary" className="whitespace-nowrap font-medium">{displayTestCaseId}</Badge>
                                      </button>
                                    </TableCell>
                                    <TableCell className="py-1.5">
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          onClick={() => handleTestCaseDialogOpen(tc)}
                                          className="text-left text-xs truncate max-w-[240px] font-normal hover:underline hover:text-primary transition-colors block"
                                          title={tc.title}
                                        >
                                          {tc.title}
                                        </button>
                                        {((tc.attachments && tc.attachments.length > 0) || !!tc.attachment) && (
                                          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0 bg-muted px-1.5 py-0.5 rounded" title={`${(tc.attachments?.length || 1)} attachment(s)`}>
                                            <Paperclip className="h-2.5 w-2.5" />
                                            {tc.attachments && tc.attachments.length > 1 ? tc.attachments.length : ''}
                                          </span>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <Badge className={cn("text-[11px] px-1.5 py-0 whitespace-nowrap", statusStyles[tc.status])}>
                                        {tc.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground text-right whitespace-nowrap">
                                      {(tc as any).effortHours !== undefined ? `${(tc as any).effortHours}h` : '-'}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Unscheduled / Other section if any */}
              {groupedPlanTestCases.unscheduled.length > 0 && (
                <div className="border rounded-lg overflow-hidden bg-card/60 shadow-sm">
                  <div
                    className="px-4 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors flex items-center justify-between cursor-pointer select-none border-b border-border/50"
                    onClick={() => toggleDay('unscheduled')}
                  >
                    <div className="flex items-center gap-2.5">
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", openDays['unscheduled'] === false && "-rotate-90")} />
                      <span className="font-semibold text-sm">Unscheduled / Other</span>
                      <Badge variant="secondary" className="text-xs px-2 py-0.5 font-normal">
                        {groupedPlanTestCases.unscheduled.length} test cases
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={selectedBacklogTCs.length > 0 ? "default" : "secondary"}
                        className={cn(
                          "h-7 text-xs gap-1.5 font-medium transition-all",
                          selectedBacklogTCs.length > 0
                            ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                            : "opacity-60 cursor-not-allowed"
                        )}
                        disabled={selectedBacklogTCs.length === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveToDay(null);
                        }}
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                        Move Here {selectedBacklogTCs.length > 0 && `(${selectedBacklogTCs.length})`}
                      </Button>
                    </div>
                  </div>

                  {openDays['unscheduled'] !== false && (
                    <div className="p-0">
                      <Table>
                        <TableHeader className="bg-muted/20 text-xs">
                          <TableRow>
                            <TableHead className="w-10">
                              <Checkbox
                                checked={
                                  groupedPlanTestCases.unscheduled.length > 0 &&
                                  groupedPlanTestCases.unscheduled.every(tc => selectedScheduledTCs.includes(tc.id))
                                }
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedScheduledTCs(prev => Array.from(new Set([...prev, ...groupedPlanTestCases.unscheduled.map(tc => tc.id)])));
                                  } else {
                                    const unIds = new Set(groupedPlanTestCases.unscheduled.map(tc => tc.id));
                                    setSelectedScheduledTCs(prev => prev.filter(id => !unIds.has(id)));
                                  }
                                }}
                              />
                            </TableHead>
                            <TableHead className="w-24">ID</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead className="w-24">Status</TableHead>
                            <TableHead className="w-20 text-right">Effort (h)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupedPlanTestCases.unscheduled.map(tc => {
                            const cycleIdPrefix = selectedPlan?.testCycleId || selectedPlan?.testPlanId || 'TC';
                            const displayTestCaseId = tc.testCaseId.startsWith(cycleIdPrefix)
                              ? tc.testCaseId
                              : `${cycleIdPrefix}-${tc.testCaseId}`;

                            return (
                              <TableRow key={tc.id} className="hover:bg-muted/30">
                                <TableCell>
                                  <Checkbox
                                    checked={selectedScheduledTCs.includes(tc.id)}
                                    onCheckedChange={(checked) =>
                                      setSelectedScheduledTCs(prev => checked ? [...prev, tc.id] : prev.filter(id => id !== tc.id))
                                    }
                                  />
                                </TableCell>
                                <TableCell className="py-1.5 whitespace-nowrap">
                                  <button
                                    onClick={() => handleTestCaseDialogOpen(tc)}
                                    className="text-left font-medium text-primary hover:underline inline-flex items-center"
                                  >
                                    <Badge variant="secondary" className="whitespace-nowrap font-medium">{displayTestCaseId}</Badge>
                                  </button>
                                </TableCell>
                                <TableCell className="py-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => handleTestCaseDialogOpen(tc)}
                                      className="text-left text-xs truncate max-w-[240px] font-normal hover:underline hover:text-primary transition-colors block"
                                      title={tc.title}
                                    >
                                      {tc.title}
                                    </button>
                                    {((tc.attachments && tc.attachments.length > 0) || !!tc.attachment) && (
                                      <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0 bg-muted px-1.5 py-0.5 rounded" title={`${(tc.attachments?.length || 1)} attachment(s)`}>
                                        <Paperclip className="h-2.5 w-2.5" />
                                        {tc.attachments && tc.attachments.length > 1 ? tc.attachments.length : ''}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className={cn("text-[11px] px-1.5 py-0 whitespace-nowrap", statusStyles[tc.status])}>
                                    {tc.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground text-right whitespace-nowrap">
                                  {(tc as any).effortHours !== undefined ? `${(tc as any).effortHours}h` : '-'}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="border rounded-lg flex-1 flex flex-col items-center justify-center text-muted-foreground p-6">
              <p>No test cycle selected.</p>
              <p className="text-sm">Please select a cycle from the dropdown or create a new one.</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isPlanDialogOpen} onOpenChange={(open) => { setIsPlanDialogOpen(open); if (!open) setEditingPlan(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Edit Test Cycle' : 'Add Test Cycle'}</DialogTitle>
          </DialogHeader>
          <Form {...testCycleForm}>
            <form onSubmit={testCycleForm.handleSubmit(onTestCycleSubmit)} className="space-y-4 pt-2">
                  <FormField control={testCycleForm.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cycle Name</FormLabel>
                      <FormControl><Input placeholder="e.g., SIT Execution Cycle" {...field} maxLength={60} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={testCycleForm.control} name="planType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cycle Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Sprint">Sprint</SelectItem>
                          <SelectItem value="Release">Release</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  {watchedPlanType === 'Sprint' && (
                    <FormField control={testCycleForm.control} name="sprintId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sprint</FormLabel>
                        <Select
                          onValueChange={(val) => {
                            field.onChange(val);
                            const selectedSprint = sprints.find(s => s.id === val);
                            if (selectedSprint?.startDate && selectedSprint?.endDate) {
                              testCycleForm.setValue('startDate', format(parseISO(selectedSprint.startDate), 'yyyy-MM-dd'), { shouldDirty: true });
                              testCycleForm.setValue('endDate', format(parseISO(selectedSprint.endDate), 'yyyy-MM-dd'), { shouldDirty: true });
                            }
                          }}
                          value={field.value}
                        >
                          <FormControl><SelectTrigger><SelectValue placeholder="Select a sprint..." /></SelectTrigger></FormControl>
                          <SelectContent>
                            {sprints.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                  {watchedPlanType === 'Release' && (
                    <FormField control={testCycleForm.control} name="releaseId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Release</FormLabel>
                        <Select
                          onValueChange={(val) => {
                            field.onChange(val);
                            const selectedRelease = releases.find(r => r.id === val);
                            if (selectedRelease?.startDate && selectedRelease?.endDate) {
                              testCycleForm.setValue('startDate', format(parseISO(selectedRelease.startDate), 'yyyy-MM-dd'), { shouldDirty: true });
                              testCycleForm.setValue('endDate', format(parseISO(selectedRelease.endDate), 'yyyy-MM-dd'), { shouldDirty: true });
                            }
                          }}
                          value={field.value}
                        >
                          <FormControl><SelectTrigger><SelectValue placeholder="Select a release..." /></SelectTrigger></FormControl>
                          <SelectContent>
                            {releases.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                  <FormField control={testCycleForm.control} name="environmentId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Environment</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select an environment..." /></SelectTrigger></FormControl>
                        <SelectContent>
                          {[...environments].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })).map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={testCycleForm.control} name="startDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={testCycleForm.control} name="endDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <DialogFooter>
                    <Button type="submit">{editingPlan ? 'Save Changes' : 'Create Cycle'}</Button>
                  </DialogFooter>
                </form>
              </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Test Case (Cycle Copy) Dialog */}
      <Dialog open={isTestCaseDialogOpen} onOpenChange={setIsTestCaseDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 flex flex-col overflow-hidden" bypassScrollWrapper={true}>
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle>Edit Test Case — {selectedPlan?.name}</DialogTitle>
            <DialogDescription>Editing the test case copy within this test cycle. Changes here do not affect the original backlog test case.</DialogDescription>
          </DialogHeader>
          <Form {...testCaseForm}>
            <form onSubmit={testCaseForm.handleSubmit(onTestCaseSubmit)} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
                {/* Parent Test Cycle & ID Information */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg border bg-muted/40 text-xs">
                  <div>
                    <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Parent Test Cycle</Label>
                    <div className="flex items-center gap-1.5 mt-1 font-medium text-foreground truncate">
                      <Badge variant="outline" className="font-mono text-[11px] px-1.5 py-0 bg-background">{selectedPlan?.testCycleId || selectedPlan?.testPlanId}</Badge>
                      <span className="truncate" title={selectedPlan?.name}>{selectedPlan?.name}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cycle Test Case ID</Label>
                    <div className="mt-1">
                      <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5">
                        {editingTestCase
                          ? (() => {
                              const cyclePrefix = selectedPlan?.testCycleId || selectedPlan?.testPlanId || 'TC';
                              return editingTestCase.testCaseId.startsWith(cyclePrefix)
                                ? editingTestCase.testCaseId
                                : `${cyclePrefix}-${editingTestCase.testCaseId}`;
                            })()
                          : '—'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Backlog Reference</Label>
                    <div className="mt-1">
                      <Badge variant="outline" className="font-mono text-xs px-2 py-0.5 text-muted-foreground bg-background">
                        {testCases.find(tc => tc.id === editingTestCase?.originalTestCaseId)?.testCaseId || 'Original TC'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <FormField control={testCaseForm.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl><Input placeholder="E.g., Verify user login with valid credentials" {...field} maxLength={60} /></FormControl>
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
                    <FormControl><Textarea placeholder="1. Navigate to login page..." {...field} rows={4} maxLength={300} /></FormControl>
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
                          {[...employees].filter(emp => !emp.isDeleted && emp.isEnabled !== false && !!emp.empId && emp.empId.trim() !== '').sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, undefined, { numeric: true, sensitivity: 'base' })).map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.empId.trim()})</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  {/* Related Requirement (read-only, from the original) */}
                  <FormItem>
                    <FormLabel>Related Requirement</FormLabel>
                    <Input
                      readOnly
                      value={editingTestCase?.storyId
                        ? (() => {
                          const story = stories.find(s => s.id === editingTestCase.storyId);
                          return story ? `[${story.storyId}] ${story.title}` : 'N/A';
                        })()
                        : 'N/A'}
                      className="bg-muted"
                    />
                  </FormItem>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={testCaseForm.control} name="executionDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Execution Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={testCaseForm.control} name="effortHours" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Effort (Hours)</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => {
                            let val = e.target.value;
                            if (/^(0|[1-9]\d*)?(\.\d{0,2})?$/.test(val)) {
                              field.onChange(val);
                            }
                          }}
                          className="font-mono"
                        />
                      </FormControl>
                      <p className="text-[11px] text-muted-foreground">Execution time in hours</p>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Attachments Section */}
                <div className="space-y-3 p-4 rounded-lg border bg-card/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-semibold">Attachments</Label>
                      <p className="text-[11px] text-muted-foreground">Add document links, test evidence, or specifications URLs.</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1.5 border-dashed"
                      onClick={() => {
                        const current = testCaseForm.getValues('attachments') || [];
                        const nextIndex = current.length;
                        testCaseForm.setValue('attachments', [...current, { name: '', url: '' }]);
                        setEditingAttachmentIndices(prev => ({ ...prev, [nextIndex]: true }));
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Attachment
                    </Button>
                  </div>

                  {/* Attachment items list */}
                  {(!testCaseForm.watch('attachments') || testCaseForm.watch('attachments')!.length === 0) ? (
                    <div className="text-center py-4 border border-dashed rounded-md bg-muted/20 text-xs text-muted-foreground">
                      No attachments added yet. Click &quot;Add Attachment&quot; to link documents or test evidence.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {testCaseForm.watch('attachments')!.map((att, index) => {
                        const isEditing = !!editingAttachmentIndices[index];

                        const handleRemoveAttachment = () => {
                          const current = testCaseForm.getValues('attachments') || [];
                          testCaseForm.setValue(
                            'attachments',
                            current.filter((_, i) => i !== index)
                          );
                          setEditingAttachmentIndices(prev => {
                            const next: Record<number, boolean> = {};
                            let newIdx = 0;
                            for (let i = 0; i < current.length; i++) {
                              if (i !== index) {
                                if (prev[i] !== undefined) {
                                  next[newIdx] = prev[i];
                                }
                                newIdx++;
                              }
                            }
                            return next;
                          });
                        };

                        if (!isEditing) {
                          return (
                            <div key={index} className="p-3 rounded-md border bg-background/80 flex items-center justify-between gap-3 shadow-xs">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 min-w-0 flex-1">
                                <div className="min-w-[120px] max-w-[200px] truncate">
                                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Document Name</span>
                                  <span className="text-xs font-medium text-foreground truncate block" title={att.name || 'Untitled Document'}>
                                    {att.name || 'Untitled Document'}
                                  </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Location</span>
                                  {att.url ? (
                                    <a
                                      href={att.url.startsWith('http://') || att.url.startsWith('https://') ? att.url : `https://${att.url}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-500 hover:underline inline-flex items-center gap-1.5 text-xs font-medium truncate max-w-full"
                                    >
                                      <LinkIcon className="h-3.5 w-3.5 shrink-0" />
                                      <span>View Document</span>
                                    </a>
                                  ) : (
                                    <span className="text-xs text-muted-foreground italic">No URL provided</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  onClick={() => setEditingAttachmentIndices(prev => ({ ...prev, [index]: true }))}
                                  title="Edit attachment"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={handleRemoveAttachment}
                                  title="Remove attachment"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={index} className="p-3 rounded-md border bg-background/80 space-y-3 relative group">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Attachment #{index + 1}</span>
                              <div className="flex items-center gap-1.5">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  className="h-7 text-xs px-2.5 gap-1 font-medium bg-primary/10 hover:bg-primary/20 text-primary"
                                  onClick={() => {
                                    if (att.url && att.url.trim() !== '' && !isValidUrl(att.url)) {
                                      toast({
                                        variant: 'destructive',
                                        title: 'Invalid URL',
                                        description: 'Please enter a valid URL (e.g. https://example.com or www.example.com)',
                                      });
                                      return;
                                    }
                                    setEditingAttachmentIndices(prev => ({ ...prev, [index]: false }));
                                  }}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  Done
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={handleRemoveAttachment}
                                  title="Remove attachment"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-[11px] text-muted-foreground font-medium">Document Name</Label>
                                <Input
                                  placeholder="e.g. SOW, Test Evidence Screenshot"
                                  value={att.name || ''}
                                  onChange={(e) => {
                                    const current = [...(testCaseForm.getValues('attachments') || [])];
                                    current[index] = { ...current[index], name: e.target.value };
                                    testCaseForm.setValue('attachments', current);
                                  }}
                                  className="h-8 text-xs bg-background"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[11px] text-muted-foreground font-medium">Location (URL)</Label>
                                <Input
                                  placeholder="https://example.com/your-document-link"
                                  value={att.url || ''}
                                  onChange={(e) => {
                                    const current = [...(testCaseForm.getValues('attachments') || [])];
                                    current[index] = { ...current[index], url: e.target.value };
                                    testCaseForm.setValue('attachments', current);
                                  }}
                                  className={cn("h-8 text-xs bg-background font-mono", att.url && !isValidUrl(att.url) && "border-destructive focus-visible:ring-destructive")}
                                />
                                {att.url && !isValidUrl(att.url) && (
                                  <p className="text-[10px] text-destructive">Invalid URL format (e.g. https://example.com or www.example.com)</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            <DialogFooter className="px-6 py-4 border-t bg-background shrink-0">
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
            This action will delete the test cycle &quot;{deletingPlan?.name}&quot; and all test case copies within it. Original backlog test cases will not be affected.
          </AlertDialogDescription>
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

