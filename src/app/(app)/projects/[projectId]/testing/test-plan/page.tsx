
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
import { PlusCircle, ChevronLeft, ChevronRight, Edit, Trash2, ArrowUpDown, X, Filter, Move } from 'lucide-react';
import type { TestCase, TestCaseStatus, TestCaseType, Story, Sprint, Release, Employee, TestPlan } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { format, eachDayOfInterval, parseISO, addDays, subDays } from 'date-fns';
import { DndContext, useDroppable, useDraggable, DragEndEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from '@/components/ui/label';
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


const DraggableTestCase = ({ testCase }: { testCase: TestCase }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: testCase.id,
    data: { type: 'test-case', testCase },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="cursor-grab" >
      <Badge variant="secondary" className="w-full">
        {testCase.testCaseId}
      </Badge>
    </div>
  );
};

const Droppable = ({ id, children, className }: { id: string, children: React.ReactNode, className?: string }) => {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? 'bg-accent' : ''}`}>
      {children}
    </div>
  );
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
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedBacklogTCs, setSelectedBacklogTCs] = useState<string[]>([]);
  const [selectedScheduledTCs, setSelectedScheduledTCs] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [relatedStoryInputText, setRelatedStoryInputText] = useState('');
  
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
    const success = await deleteTestPlan(deletingPlan.id);
    if(success) {
      toast({title: "Success", description: "Test plan deleted."});
      setSelectedPlanId(null);
    } else {
      toast({variant: "destructive", title: "Error", description: "Could not delete test plan."})
    }
    setDeletingPlan(null);
  };

  const handleDrop = (event: DragEndEvent) => {
    const { over, active } = event;
    const testCaseId = active.id as string;
    const dropTargetId = over?.id as string;

    if (!dropTargetId) return;

    if (dropTargetId === 'backlog') {
      updateTestCase(testCaseId, { executionDate: undefined, testPlanId: undefined });
    } else {
      const [type, dateStr] = dropTargetId.split('_');
      if (type === 'day' && dateStr) {
        updateTestCase(testCaseId, { executionDate: dateStr, testPlanId: selectedPlan?.id });
      }
    }
  };

  const handleBulkMove = (targetId: string, selection: 'backlog' | 'scheduled') => {
    const tcsToMove = selection === 'backlog' ? selectedBacklogTCs : selectedScheduledTCs;
    if (tcsToMove.length === 0) return;
    
    const [type, dateStr] = targetId.split('_');
    const isMovingToBacklog = type === 'backlog';
    
    const updates = tcsToMove.map(tcId => 
      updateTestCase(tcId, {
        executionDate: isMovingToBacklog ? undefined : dateStr,
        testPlanId: isMovingToBacklog ? undefined : selectedPlan?.id
      })
    );
    
    Promise.all(updates).then(() => {
        toast({ title: "Success", description: `${tcsToMove.length} test cases moved.`});
        if(selection === 'backlog') setSelectedBacklogTCs([]);
        else setSelectedScheduledTCs([]);
    });
  }

 const { dayColumns, backlog } = useMemo(() => {
    const dayCols: Record<string, TestCase[]> = {};
    if (selectedPlan?.startDate && selectedPlan.endDate) {
        const days = eachDayOfInterval({ start: parseISO(selectedPlan.startDate), end: parseISO(selectedPlan.endDate) });
        days.forEach(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            dayCols[dateStr] = [];
        });
    }

    let backlogTCs: TestCase[] = [];

    testCases.forEach(tc => {
        const executionDateStr = tc.executionDate ? format(parseISO(tc.executionDate), 'yyyy-MM-dd') : undefined;
        const isScheduledInCurrentPlan = tc.testPlanId === selectedPlan?.id && executionDateStr && dayCols[executionDateStr];
        
        if (isScheduledInCurrentPlan) {
            dayCols[executionDateStr!].push(tc);
        } else {
            backlogTCs.push(tc);
        }
    });

    const filterTCs = (tc: TestCase) => {
        const sprintMatch = !filters.sprintId?.length || filters.sprintId.includes(sprints.find(s => s.id === tc.sprintId)?.title || 'Backlog');
        const releaseMatch = !filters.releaseId?.length || filters.releaseId.includes(releases.find(r => r.id === tc.releaseId)?.name || 'Unassigned');
        const statusMatch = !filters.status?.length || filters.status.includes(tc.status);
        return sprintMatch && releaseMatch && statusMatch;
    };
    
    backlogTCs = backlogTCs.filter(filterTCs);

    if (sorting) {
      backlogTCs.sort((a, b) => {
        let valA: any = (a as any)[sorting.id] || '';
        let valB: any = (b as any)[sorting.id] || '';
        if (sorting.id === 'sprintId') {
            valA = sprints.find(s => s.id === a.sprintId)?.title || 'Backlog';
            valB = sprints.find(s => s.id === b.sprintId)?.title || 'Backlog';
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
    
    return { dayColumns: dayCols, backlog: backlogTCs };
}, [selectedPlan, testCases, filters, sprints, releases, sorting]);


  const days = (selectedPlan && selectedPlan.startDate && selectedPlan.endDate)
    ? eachDayOfInterval({ start: parseISO(selectedPlan.startDate), end: parseISO(selectedPlan.endDate) }) 
    : [];
  const itemsPerPage = 5;
  const totalPages = days ? Math.ceil(days.length / itemsPerPage) : 0;
  const visibleDays = days ? days.slice(page * itemsPerPage, (page + 1) * itemsPerPage) : [];
  
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
  
  const handleDialogOpen = (testCase: TestCase) => {
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
  
  const FilterableHeader = ({ columnId, children, filterOptions }: { columnId: string, children: React.ReactNode, filterOptions: {value: string, label: string}[] }) => {
    const activeFilters = filters[columnId] || [];
    return (
      <TableHead>
        <div className="flex items-center gap-1">
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className={cn("h-6 w-6", activeFilters.length > 0 && "text-blue-500")}>
                        <Filter className="h-4 w-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-64">
                    <div className="p-2 space-y-2">
                        <Label className="px-2 font-semibold">Filter by {children}</Label>
                        {filterOptions.map(opt => (
                            <div key={opt.value} className="flex items-center space-x-2 px-2">
                                <Checkbox
                                    id={`${columnId}-${opt.value}`}
                                    checked={activeFilters.includes(opt.value)}
                                    onCheckedChange={() => handleFilterChange(columnId, opt.value)}
                                />
                                <Label htmlFor={`${columnId}-${opt.value}`} className="font-normal w-full">{opt.label}</Label>
                            </div>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>
             <Button variant="ghost" size="sm" onClick={() => handleSort(columnId)}>
                {children}
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        </div>
      </TableHead>
    )
  };
  
  const scheduledTestCases = useMemo(() => {
    if(!selectedPlan) return [];
    return testCases.filter(tc => tc.testPlanId === selectedPlan.id);
  }, [testCases, selectedPlan]);


  return (
    <DndContext onDragEnd={handleDrop}>
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
        
        <div className="h-1/2 flex flex-col mt-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-lg">Test Case Backlog ({backlog.length})</h3>
                {selectedBacklogTCs.length > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{selectedBacklogTCs.length} selected</span>
                    </div>
                )}
            </div>
          <Droppable id="backlog" className="border rounded-lg flex-1 flex flex-col min-h-0">
            <div className="overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <SortableHeader columnId="testCaseId">ID</SortableHeader>
                    <SortableHeader columnId="title">Title</SortableHeader>
                    <FilterableHeader columnId="status" filterOptions={testCaseStatuses.map(s => ({value: s, label: s}))}>Status</FilterableHeader>
                    <FilterableHeader columnId="sprintId" filterOptions={[{value: 'Backlog', label: 'Backlog'},...sprints.map(s => ({ value: s.title, label: s.title}))]}>
                      Sprint
                    </FilterableHeader>
                    <FilterableHeader columnId="releaseId" filterOptions={[{value: 'Unassigned', label: 'Unassigned'},...releases.map(r => ({ value: r.name, label: r.name}))]}>
                      Release
                    </FilterableHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backlog.map(tc => {
                    const sprint = sprints.find(s => s.id === tc.sprintId);
                    const release = releases.find(r => r.id === tc.releaseId);
                    return (
                      <TableRow key={tc.id}>
                        <TableCell>
                          <span className="flex items-center gap-2">
                            <DraggableTestCase testCase={tc} />
                          </span>
                        </TableCell>
                        <TableCell>
                          <button onClick={() => handleDialogOpen(tc)} className="text-left hover:underline">
                            {tc.title}
                          </button>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('font-semibold', statusStyles[tc.status])}>
                              {tc.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{sprint?.title || 'Backlog'}</TableCell>
                        <TableCell>{release?.name || 'N/A'}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </Droppable>
        </div>
        
        <div className="h-1/2 flex flex-col mt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              {selectedPlan ? (
                <>
                  <h3 className="font-bold text-lg">{selectedPlan.name} ({selectedPlan.testPlanId})</h3>
                  <Button variant="ghost" size="icon" onClick={() => { setEditingPlan(selectedPlan); setIsPlanDialogOpen(true); }}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeletingPlan(selectedPlan)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </>
              ) : (
                <h3 className="font-bold text-lg">Execution Plan</h3>
              )}
               {selectedScheduledTCs.length > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline">Move Selected ({selectedScheduledTCs.length})</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <div className="flex flex-col">
                        <Button variant="ghost" className="justify-start" onClick={() => handleBulkMove('backlog', 'scheduled')}>Move to Backlog</Button>
                        <Label className="p-2 text-xs font-semibold text-muted-foreground">Move to Date:</Label>
                        {days.map(day => (
                            <Button key={day.toString()} variant="ghost" className="justify-start" onClick={() => handleBulkMove(`day_${format(day, 'yyyy-MM-dd')}`, 'scheduled')}>
                                {format(day, 'EEE, MMM d')}
                            </Button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span>Page {page + 1} of {totalPages > 0 ? totalPages : 1}</span>
              <Button variant="outline" size="icon" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-5 gap-4">
            {visibleDays.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const tcsForDay = dayColumns[dateStr] || [];
              return (
                <Droppable key={dateStr} id={`day_${dateStr}`} className="border rounded-lg p-2 flex flex-col">
                  <h4 className="font-semibold text-center">{format(day, 'EEE, MMM d')}</h4>
                  <div className="text-center mb-2">
                    <Button size="xs" variant="outline" onClick={() => handleBulkMove(`day_${dateStr}`, 'backlog')} disabled={selectedBacklogTCs.length === 0}>
                      Move Here
                    </Button>
                  </div>
                  <div className="space-y-1 text-center flex-1 overflow-y-auto">
                    {tcsForDay.map(tc => (
                       <div key={tc.id} className="flex items-center gap-2 cursor-grab">
                          <Checkbox
                            checked={selectedScheduledTCs.includes(tc.id)}
                            onCheckedChange={(checked) => setSelectedScheduledTCs(prev => checked ? [...prev, tc.id] : prev.filter(id => id !== tc.id))}
                          />
                          <DraggableTestCase 
                            testCase={tc}
                          />
                       </div>
                    ))}
                  </div>
                </Droppable>
              );
            })}
          </div>
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
              {editingPlan && <TabsTrigger value="tc-list">Test Cases ({scheduledTestCases.length})</TabsTrigger>}
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
            {editingPlan && (
                <TabsContent value="tc-list">
                    <Card className="mt-4">
                        <CardContent className="p-4 max-h-96 overflow-y-auto">
                            <Table>
                                <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Execution Date</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {testCases.filter(tc => tc.testPlanId === editingPlan.id).map(tc => (
                                        <TableRow key={tc.id}>
                                            <TableCell>{tc.testCaseId}</TableCell>
                                            <TableCell>{tc.title}</TableCell>
                                            <TableCell>{tc.executionDate ? format(parseISO(tc.executionDate), 'PPP') : 'Not Scheduled'}</TableCell>
                                            <TableCell>
                                              <Badge className={cn('font-semibold', statusStyles[tc.status])}>
                                                {tc.status}
                                              </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            )}
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
      
      <AlertDialog open={!!deletingPlan} onOpenChange={(isOpen) => !isOpen && setDeletingPlan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the test plan "{deletingPlan?.name}".
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
    </DndContext>
  );
}



    







    
