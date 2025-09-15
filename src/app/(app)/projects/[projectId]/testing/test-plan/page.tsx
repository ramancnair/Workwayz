

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
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
import { PlusCircle, ChevronLeft, ChevronRight, Edit, Trash2 } from 'lucide-react';
import type { TestPlan, TestCase, Employee, Release } from '@/types';
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
import { buttonVariants } from '@/components/ui/button';

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
    if (!selectedPlanId) return testPlans[0];
    return testPlans.find(p => p.id === selectedPlanId) || null;
  }, [selectedPlanId, testPlans]);
  
  useEffect(() => {
    if (selectedPlan && !selectedPlanId) {
      setSelectedPlanId(selectedPlan.id);
    }
  }, [selectedPlan, selectedPlanId]);
  
  useEffect(() => {
    if(isDialogOpen && editingPlan) {
      form.reset({
        name: editingPlan.name,
        planType: editingPlan.planType,
        sprintId: editingPlan.sprintId,
        releaseId: editingPlan.releaseId,
        startDate: format(parseISO(editingPlan.startDate), 'yyyy-MM-dd'),
        endDate: format(parseISO(editingPlan.endDate), 'yyyy-MM-dd'),
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
    if (!testCases) return { dayColumns: {}, backlog: [] };
    
    let scheduledTestCaseIds = new Set<string>();
    const dayCols: Record<string, TestCase[]> = {};

    if (selectedPlan && selectedPlan.startDate && selectedPlan.endDate) {
        const days = eachDayOfInterval({
            start: parseISO(selectedPlan.startDate),
            end: parseISO(selectedPlan.endDate),
        });
        
        days.forEach(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            dayCols[dateStr] = [];
        });

        testCases.forEach(tc => {
            if (tc.testPlanId === selectedPlan.id && tc.executionDate && dayCols[tc.executionDate]) {
                dayCols[tc.executionDate].push(tc);
                scheduledTestCaseIds.add(tc.id);
            }
        });
    }

    const backlogTCs = testCases.filter(tc => !tc.testPlanId || tc.testPlanId !== selectedPlan?.id);
    
    return { dayColumns: dayCols, backlog: backlogTCs };
  }, [selectedPlan, testCases]);


  const days = selectedPlan && selectedPlan.startDate && selectedPlan.endDate 
    ? eachDayOfInterval({ start: parseISO(selectedPlan.startDate), end: parseISO(selectedPlan.endDate) }) 
    : [];
  const itemsPerPage = 5;
  const totalPages = Math.ceil(days.length / itemsPerPage);
  const visibleDays = days.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  return (
    <DndContext onDragEnd={handleDrop}>
      <div className="flex-1 flex flex-col space-y-4 p-4 md:p-8 pt-6 h-full">
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
        
        <Card className="flex-1 flex flex-col">
          <CardContent className="p-4 flex-1 flex flex-col">
            <Droppable id="backlog" className="h-1/2 border rounded-lg p-4 overflow-auto">
              <h3 className="font-bold text-lg mb-2">Test Case Backlog ({backlog.length})</h3>
              <div className="flex items-center gap-2 mb-2">
                 <Button size="sm" variant="outline" onClick={() => handleBulkMove('backlog')} disabled={selectedTCs.length === 0}>
                    Move to Backlog
                 </Button>
              </div>
              <div className="space-y-2">
                {backlog.map(tc => (
                  <div key={tc.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedTCs.includes(tc.id)}
                      onCheckedChange={(checked) => {
                        setSelectedTCs(prev => checked ? [...prev, tc.id] : prev.filter(id => id !== tc.id));
                      }}
                    />
                    <DraggableTestCase testCase={tc} />
                    <span>{tc.title}</span>
                  </div>
                ))}
              </div>
            </Droppable>

            <div className="h-1/2 mt-4 flex flex-col">
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
                      <Droppable key={dateStr} id={`day_${dateStr}`} className="border rounded-lg p-2 overflow-auto">
                        <h4 className="font-semibold text-center">{format(day, 'EEE, MMM d')}</h4>
                        <div className="text-center mb-2">
                            <Button size="xs" variant="outline" onClick={() => handleBulkMove(`day_${dateStr}`)} disabled={selectedTCs.length === 0}>
                                Move Here
                            </Button>
                        </div>
                        <div className="space-y-1 text-center">
                          {(dayColumns[dateStr] || []).map(tc => (
                            <DraggableTestCase key={tc.id} testCase={tc} />
                          ))}
                        </div>
                      </Droppable>
                    );
                  })}
                </div>
            </div>
          </CardContent>
        </Card>
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
                    <FormControl><Input type="date" {...field} readOnly /></FormControl>
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
                    <FormControl><Input type="date" {...field} readOnly /></FormControl>
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
