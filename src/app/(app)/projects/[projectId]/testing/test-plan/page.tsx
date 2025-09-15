

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
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, ChevronLeft, ChevronRight, Edit, Trash2, ArrowUpDown, X, Filter } from 'lucide-react';
import type { TestPlan, TestCase, Employee, Release, TestCaseStatus } from '@/types';
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

const testCaseStatuses: TestCaseStatus[] = ['Not Run', 'Passed', 'Failed', 'Blocked', 'Skipped'];

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
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Badge variant="secondary" className="cursor-grab">
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
    updateTestPlan,
    deleteTestPlan,
  } = useProject();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TestPlan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<TestPlan | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedTCs, setSelectedTCs] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  
  const releases = releasesAndMilestones.filter(r => r.itemType === 'Release');

  const form = useForm<z.infer<typeof refinedTestPlanSchema>>({
    resolver: zodResolver(refinedTestPlanSchema),
    defaultValues: {
      planType: 'Sprint',
    }
  });
  
  const watchedPlanType = useWatch({ control: form.control, name: 'planType' });
  const watchedSprintId = useWatch({ control: form.control, name: 'sprintId' });
  const watchedReleaseId = useWatch({ control: form.control, name: 'releaseId' });
  
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
            form.setValue('startDate', format(parseISO(sprint.startDate), 'yyyy-MM-dd'));
            form.setValue('endDate', format(parseISO(sprint.endDate), 'yyyy-MM-dd'));
        }
    } else if (watchedPlanType === 'Release' && watchedReleaseId) {
        const release = releases.find(r => r.id === watchedReleaseId);
        if (release && release.startDate && release.endDate) {
            form.setValue('startDate', format(parseISO(release.startDate), 'yyyy-MM-dd'));
            form.setValue('endDate', format(parseISO(release.endDate), 'yyyy-MM-dd'));
        }
    }
  }, [watchedPlanType, watchedSprintId, watchedReleaseId, sprints, releases, form]);


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
    if(isDialogOpen && editingPlan) {
        form.reset({
            name: editingPlan.name,
            planType: editingPlan.planType,
            sprintId: editingPlan.sprintId,
            releaseId: editingPlan.releaseId,
            startDate: editingPlan.startDate ? format(parseISO(editingPlan.startDate), 'yyyy-MM-dd') : '',
            endDate: editingPlan.endDate ? format(parseISO(editingPlan.endDate), 'yyyy-MM-dd') : '',
        });
    } else if (isDialogOpen && !editingPlan) {
      form.reset({
        name: '',
        planType: 'Sprint',
        sprintId: undefined,
        releaseId: undefined,
        startDate: '',
        endDate: '',
      })
    }
  }, [isDialogOpen, editingPlan, form]);


  const onSubmit = async (values: z.infer<typeof refinedTestPlanSchema>) => {
    const success = editingPlan 
      ? await updateTestPlan(editingPlan.id, values)
      : await addTestPlan(values);
      
    if (success) {
      toast({ title: 'Success', description: `Test plan ${editingPlan ? 'updated' : 'created'}.` });
      setIsDialogOpen(false);
      setEditingPlan(null);
      form.reset();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: `Could not ${editingPlan ? 'update' : 'create'} test plan.` });
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

  const handleBulkMove = (targetId: string) => {
    if (selectedTCs.length === 0) return;
    const [type, dateStr] = targetId.split('_');
    const updates = selectedTCs.map(tcId => 
      updateTestCase(tcId, {
        executionDate: type === 'day' ? dateStr : undefined,
        testPlanId: type === 'day' ? selectedPlan?.id : undefined
      })
    );
    Promise.all(updates).then(() => {
        toast({ title: "Success", description: `${selectedTCs.length} test cases moved.`});
        setSelectedTCs([]);
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
        if (tc.testPlanId === selectedPlan?.id && tc.executionDate && dayCols[tc.executionDate]) {
            dayCols[tc.executionDate].push(tc);
        } else {
            backlogTCs.push(tc);
        }
    });
    
    // Apply filters
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
  
  const handleDialogOpen = (testCase: TestCase) => {
    // This is a placeholder for where the actual dialog-opening logic would go
    console.log("Opening edit dialog for", testCase.testCaseId);
  }

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
          <Button onClick={() => { setEditingPlan(null); setIsDialogOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create Test Plan
          </Button>
        </PageHeader>
        
        <div className="flex flex-col flex-1 gap-4 min-h-0">
          <div className="flex flex-col h-1/2">
            <h3 className="font-bold text-lg mb-2">Test Case Backlog ({backlog.length})</h3>
            <Droppable id="backlog" className="border rounded-lg flex-1 flex flex-col min-h-0">
              <div className="overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={backlog.length > 0 && selectedTCs.length === backlog.length}
                          onCheckedChange={(checked) => setSelectedTCs(checked ? backlog.map(tc => tc.id) : [])}
                        />
                      </TableHead>
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
                            <Checkbox
                              checked={selectedTCs.includes(tc.id)}
                              onCheckedChange={(checked) => setSelectedTCs(prev => checked ? [...prev, tc.id] : prev.filter(id => id !== tc.id))}
                            />
                          </TableCell>
                           <TableCell>
                            <span className="flex items-center gap-2">
                              <DraggableTestCase testCase={tc} />
                              <button onClick={() => handleDialogOpen(tc)} className="hover:underline">
                                {tc.testCaseId}
                              </button>
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
          
          <div className="flex flex-col h-1/2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-4">
                {selectedPlan ? (
                  <>
                    <h3 className="font-bold text-lg">{selectedPlan.name} ({selectedPlan.testPlanId})</h3>
                    <Button variant="ghost" size="icon" onClick={() => { setEditingPlan(selectedPlan); setIsDialogOpen(true); }}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeletingPlan(selectedPlan)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </>
                ) : (
                  <h3 className="font-bold text-lg">Execution Plan</h3>
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
                return (
                  <Droppable key={dateStr} id={`day_${dateStr}`} className="border rounded-lg p-2 flex flex-col">
                    <h4 className="font-semibold text-center">{format(day, 'EEE, MMM d')}</h4>
                    <div className="text-center mb-2">
                      <Button size="xs" variant="outline" onClick={() => handleBulkMove(`day_${dateStr}`)} disabled={selectedTCs.length === 0}>
                        Move Here
                      </Button>
                    </div>
                    <div className="space-y-1 text-center flex-1 overflow-y-auto">
                      {(dayColumns[dateStr] || []).map(tc => (
                        <DraggableTestCase key={tc.id} testCase={tc} />
                      ))}
                    </div>
                  </Droppable>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) setEditingPlan(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Edit Test Plan' : 'Create New Test Plan'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                  control={form.control}
                  name="planType"
                  render={({ field }) => (
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
                  )}
              />
              {watchedPlanType === 'Sprint' && (
                <FormField
                    control={form.control}
                    name="sprintId"
                    render={({ field }) => (
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
                    )}
                />
              )}
              {watchedPlanType === 'Release' && (
                  <FormField
                      control={form.control}
                      name="releaseId"
                      render={({ field }) => (
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
                      )}
                  />
              )}
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl><Input type="date" {...field} readOnly={!!(watchedSprintId || watchedReleaseId)} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl><Input type="date" {...field} readOnly={!!(watchedSprintId || watchedReleaseId)}/></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit">{editingPlan ? 'Save Changes' : 'Create Plan'}</Button>
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

