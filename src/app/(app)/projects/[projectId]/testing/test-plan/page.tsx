
'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
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
import { PlusCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import type { TestPlan, TestCase, Employee } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { format, eachDayOfInterval, parseISO, addDays, subDays } from 'date-fns';
import { DndContext, useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

const testPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required.'),
  startDate: z.string().min(1, 'Start date is required.'),
  endDate: z.string().min(1, 'End date is required.'),
  tcsPerDay: z.coerce.number().min(1, 'Please enter a valid number.'),
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
    employees,
  } = useProject();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedTCs, setSelectedTCs] = useState<string[]>([]);
  const [page, setPage] = useState(0);

  const form = useForm<z.infer<typeof testPlanSchema>>({
    resolver: zodResolver(testPlanSchema),
  });

  const selectedPlan = useMemo(() => {
    if (!selectedPlanId) return testPlans.length > 0 ? testPlans[0] : null;
    return testPlans.find(p => p.id === selectedPlanId) || null;
  }, [selectedPlanId, testPlans]);

  const onSubmit = async (values: z.infer<typeof testPlanSchema>) => {
    const success = await addTestPlan(values);
    if (success) {
      toast({ title: 'Success', description: 'Test plan created.' });
      setIsDialogOpen(false);
      form.reset();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not create test plan.' });
    }
  };

  const handleDrop = (event: any) => {
    const { over, active } = event;
    const testCaseId = active.id;
    const dropTargetId = over?.id;

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
    const planTCs = testCases.filter(tc => tc.testPlanId === selectedPlan?.id);
    const dayCols: Record<string, TestCase[]> = {};

    if (selectedPlan) {
      const days = eachDayOfInterval({
        start: parseISO(selectedPlan.startDate),
        end: parseISO(selectedPlan.endDate),
      });
      days.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        dayCols[dateStr] = [];
      });
      planTCs.forEach(tc => {
        if (tc.executionDate && dayCols[tc.executionDate]) {
          dayCols[tc.executionDate].push(tc);
        }
      });
    }
    const backlogTCs = testCases.filter(tc => !tc.testPlanId || tc.testPlanId !== selectedPlan?.id);

    return { dayColumns: dayCols, backlog: backlogTCs };
  }, [selectedPlan, testCases]);

  const days = selectedPlan ? eachDayOfInterval({ start: parseISO(selectedPlan.startDate), end: parseISO(selectedPlan.endDate) }) : [];
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
                  {testPlans.map(plan => (
                      <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                  ))}
              </SelectContent>
          </Select>
          <Button onClick={() => setIsDialogOpen(true)}>
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
                  <h3 className="font-bold text-lg">Execution Plan</h3>
                  <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                          <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span>Page {page + 1} of {totalPages}</span>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Test Plan</DialogTitle>
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
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
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
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tcsPerDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>TCs to run per day</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit">Create Plan</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}
