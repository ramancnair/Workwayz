'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Circle, BookOpen, Bug, CheckSquare, GitCommit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useProject } from '@/context/ProjectContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/datepicker';
import { cn } from '@/lib/utils';
import { format, parseISO, eachDayOfInterval, isSameDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { Story, WorkItemType, StoryStatus, Priority, BugSeverity } from '@/types';

const workItemTypes: WorkItemType[] = ['Requirement/Story', 'Feature Change', 'Task', 'Bug'];
const statusOptions: StoryStatus[] = ['To Do', 'In Progress', 'Done'];
const priorities: Priority[] = ['Critical', 'High', 'Medium', 'Low', 'Backburner'];
const severities: BugSeverity[] = ['Critical', 'High', 'Medium', 'Low'];

const priorityStyles: Record<Priority, string> = {
    'Critical': 'text-red-500 fill-red-500',
    'High': 'text-orange-400 fill-orange-400',
    'Medium': 'text-yellow-500 fill-yellow-500',
    'Low': 'text-green-500 fill-green-500',
    'Backburner': 'text-gray-500 fill-gray-500',
};

const storyFormSchema = z.object({
  itemType: z.enum(workItemTypes as [string, ...string[]]),
  title: z.string().min(1, 'Title is required.').max(60, 'Title cannot exceed 60 characters.'),
  status: z.string().optional(),
  description: z.string().max(300, 'Description cannot exceed 300 characters.').optional(),
  acceptanceCriteria: z.string().optional(),
  epicId: z.string().optional(),
  parentStoryId: z.string().optional(),
  reporterId: z.string().optional(),
  assigneeId: z.string().optional(),
  estimatedHours: z.coerce.number().optional(),
  priority: z.enum(priorities as [string, ...string[]]).optional(),
  severity: z.enum(severities as [string, ...string[]]).optional(),
  releaseId: z.string().optional(),
  foundInTestPlanId: z.string().optional(),
  relatedBugId: z.string().optional(),
  impactedSystemIds: z.array(z.string()).optional(),
  attachments: z.string().optional(),
  sprintId: z.string().optional(),
  relatedTestCaseId: z.string().optional(),
  createdAt: z.date().optional(),
  closedAt: z.date().optional(),
});

const subTaskFormSchema = z.object({
    title: z.string().min(1, 'Title is required').max(60, 'Title cannot exceed 60 characters.'),
    description: z.string().max(300, 'Description cannot exceed 300 characters.').optional(),
    impactedSystemId: z.string().optional(),
    estimatedHours: z.coerce.number().optional(),
    assigneeId: z.string().optional(),
    status: z.enum(statusOptions as [string, ...string[]]),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    sprintId: z.string().optional(),
    releaseId: z.string().optional(),
}).refine(data => {
    if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
    }
    return true;
}, {
    message: "End date must be on or after start date.",
    path: ['endDate'],
});

export function StoryEditDialog({ storyId, onClose }: { storyId: string | null; onClose: () => void }) {
  const { 
    stories, 
    epics, 
    sprints, 
    employees: users, 
    releasesAndMilestones,
    impactedSystems,
    updateStory,
    holidays,
    weeklyOffDays,
    projectSettings,
    testCases,
    testPlans,
  } = useProject();

  const { toast } = useToast();

  const selectedStory = useMemo(() => stories.find(s => s.id === storyId) || null, [stories, storyId]);

  const [isEditStorySubmitting, setIsEditStorySubmitting] = useState(false);

  const [editParentStoryText, setEditParentStoryText] = useState('');
  const [testCaseInputText, setTestCaseInputText] = useState('');
  const [relatedBugInputText, setRelatedBugInputText] = useState('');

  const releases = useMemo(() => releasesAndMilestones.filter(r => r.itemType === 'Release'), [releasesAndMilestones]);

  const calculateBusinessDays = useCallback((start: Date, end: Date): number => {
    if(!start || !end) return 0;
    const holidayDates = holidays.map(h => parseISO(h.date));
    const interval = eachDayOfInterval({ start, end });
    
    return interval.filter(day => {
      const dayOfWeek = day.getDay();
      const isWeekend = weeklyOffDays.includes(dayOfWeek);
      const isHoliday = holidayDates.some(h => isSameDay(day, h));
      return !isWeekend && !isHoliday;
    }).length;
  }, [holidays, weeklyOffDays]);

  const actualEffortInHours = useMemo(() => {
    if (!selectedStory) return null;
    if (['Requirement/Story', 'Feature Change', 'Task'].includes(selectedStory.itemType)) {
        const subTasks = stories.filter(s => s.parentStoryId === selectedStory.id && s.itemType === 'Sub Task');
        if (subTasks.length === 0) return null;

        return subTasks.reduce((total, task) => {
            if (!task.developmentStartDate || !task.completionDate) return total;
            const start = parseISO(task.developmentStartDate);
            const end = parseISO(task.completionDate);
            const days = calculateBusinessDays(start, end);
            const hoursPerDay = projectSettings?.manDayToHours || 8;
            return total + (days * hoursPerDay);
        }, 0);
    }
    
    if (!selectedStory?.developmentStartDate || !selectedStory?.completionDate) return null;
    const start = parseISO(selectedStory.developmentStartDate);
    const end = parseISO(selectedStory.completionDate);
    const days = calculateBusinessDays(start, end);
    const hoursPerDay = projectSettings?.manDayToHours || 8;
    return days * hoursPerDay;

}, [selectedStory, stories, calculateBusinessDays, projectSettings]);

  const subTaskForm = useForm<z.infer<typeof subTaskFormSchema>>({
    resolver: zodResolver(subTaskFormSchema),
  });

  const editStoryForm = useForm<z.infer<typeof storyFormSchema>>({
    resolver: zodResolver(storyFormSchema),
  });

  const parentStories = useMemo(() => stories.filter(s => ['Requirement/Story'].includes(s.itemType)), [stories]);
  const parentStoryOptions = useMemo(() => parentStories.map(s => ({
    value: s.id,
    label: `[${s.storyId}] ${s.title}`
  })), [parentStories]);

  const testCaseOptions = useMemo(() => testCases.map(tc => ({
    value: tc.id,
    label: `[${tc.testCaseId}] ${tc.title}`,
  })), [testCases]);

  const relatedBugOptions = useMemo(() => stories.filter(s => s.itemType === 'Bug').map(b => ({
    value: b.id,
    label: `[${b.storyId}] ${b.title}`,
  })), [stories]);


  useEffect(() => {
      if (!selectedStory) {
          setIsEditStorySubmitting(false);
          subTaskForm.reset();
          return;
      }
  
      if (selectedStory.itemType === 'Sub Task') {
          subTaskForm.reset({
              title: selectedStory.title,
              description: selectedStory.description || '',
              impactedSystemId: selectedStory.impactedSystemId || 'unassigned',
              estimatedHours: selectedStory.estimatedHours,
              assigneeId: selectedStory.assigneeId || 'unassigned',
              status: selectedStory.status as any || 'To Do',
              startDate: selectedStory.startDate ? format(new Date(selectedStory.startDate), 'yyyy-MM-dd') : '',
              endDate: selectedStory.endDate ? format(new Date(selectedStory.endDate), 'yyyy-MM-dd') : '',
              sprintId: selectedStory.sprintId || 'backlog',
              releaseId: selectedStory.releaseId || 'unassigned',
          });
      } else {
          const isSubItem = ['Bug', 'Feature Change', 'Task'].includes(selectedStory.itemType);
          const testCase = testCases.find(tc => tc.id === selectedStory.relatedTestCaseId);
          setTestCaseInputText(testCase ? `[${testCase.testCaseId}] ${testCase.title}` : '');
          const relBug = stories.find(b => b.id === selectedStory.relatedBugId);
          setRelatedBugInputText(relBug ? `[${relBug.storyId}] ${relBug.title}` : '');
          editStoryForm.reset({
              itemType: selectedStory.itemType as any,
              title: selectedStory.title,
              status: selectedStory.status as any || 'To Do',
              description: selectedStory.description || '',
              acceptanceCriteria: selectedStory.acceptanceCriteria || '',
              epicId: !isSubItem ? selectedStory.epicId || 'unassigned' : undefined,
              parentStoryId: isSubItem ? selectedStory.parentStoryId || undefined : undefined,
              reporterId: selectedStory.reporterId || 'unassigned',
              assigneeId: selectedStory.assigneeId || 'unassigned',
              estimatedHours: selectedStory.estimatedHours,
              priority: selectedStory.priority as any || 'Medium',
              severity: selectedStory.severity as any || 'Medium',
              releaseId: selectedStory.releaseId || 'unassigned',
              sprintId: selectedStory.sprintId || 'backlog',
              foundInTestPlanId: selectedStory.foundInTestPlanId || 'unassigned',
              relatedBugId: selectedStory.relatedBugId || 'unassigned',
              impactedSystemIds: selectedStory.impactedSystemIds || [],
              attachments: selectedStory.attachments || '',
              relatedTestCaseId: selectedStory.relatedTestCaseId || 'unassigned',
              createdAt: selectedStory.createdAt ? parseISO(selectedStory.createdAt) : undefined,
              closedAt: selectedStory.closedAt ? parseISO(selectedStory.closedAt) : undefined,
          });
          if (isSubItem && selectedStory.parentStoryId) {
              const parent = parentStoryOptions.find(p => p.value === selectedStory.parentStoryId);
              setEditParentStoryText(parent?.label || '');
          } else {
              setEditParentStoryText('');
          }
      }
  }, [selectedStory, editStoryForm, subTaskForm, parentStoryOptions, testCases, stories]);

  const onEditStorySubmit = async (values: z.infer<typeof storyFormSchema>) => {
    if (!selectedStory) return;
    setIsEditStorySubmitting(true);
    const success = await updateStory(selectedStory.id, {
        ...values,
        assigneeId: values.assigneeId === 'unassigned' ? null : values.assigneeId,
        relatedTestCaseId: values.relatedTestCaseId === 'unassigned' ? undefined : values.relatedTestCaseId,
        foundInTestPlanId: values.foundInTestPlanId === 'unassigned' ? undefined : values.foundInTestPlanId,
        relatedBugId: values.relatedBugId === 'unassigned' ? undefined : values.relatedBugId,
        createdAt: values.createdAt ? values.createdAt.toISOString() : undefined,
        closedAt: values.closedAt ? values.closedAt.toISOString() : undefined,
    });
    if (success) {
        onClose();
    } else {
        toast({ variant: "destructive", title: `Error Editing ${selectedStory.itemType}`, description: "Could not save your changes." });
    }
    setIsEditStorySubmitting(false);
  };

  const onEditSubTaskSubmit = async (values: z.infer<typeof subTaskFormSchema>) => {
    if (!selectedStory || selectedStory.itemType !== 'Sub Task') return;
    setIsEditStorySubmitting(true);
    
    const success = await updateStory(selectedStory.id, {
        ...values,
        assigneeId: values.assigneeId === 'unassigned' ? null : values.assigneeId,
        startDate: values.startDate ? new Date(values.startDate).toISOString() : undefined,
        endDate: values.endDate ? new Date(values.endDate).toISOString() : undefined,
    });

    if (success) {
        onClose();
    } else {
        toast({ variant: "destructive", title: "Error Editing Sub Task", description: "Could not save your changes." });
    }
    setIsEditStorySubmitting(false);
  };

  const subItemsByParentId = useMemo(() => stories.reduce((acc, story) => {
      if (story.parentStoryId) {
          if (!acc[story.parentStoryId]) {
              acc[story.parentStoryId] = [];
          }
          acc[story.parentStoryId].push(story);
      }
      return acc;
  }, {} as Record<string, Story[]>), [stories]);

  const selectedStorySubItems = useMemo(() => {
    if (!selectedStory) return { devTasks: [], bugs: [], subTasks: [], logs: [] };
    const allSubItems = subItemsByParentId[selectedStory.id] || [];
    return {
      devTasks: allSubItems.filter(item => item.itemType === 'Task'),
      bugs: allSubItems.filter(item => item.itemType === 'Bug'),
      subTasks: allSubItems.filter(item => item.itemType === 'Sub Task'),
      logs: selectedStory.statusHistory?.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()) || [],
    };
  }, [selectedStory, subItemsByParentId]);

  const subItemsEffort = useMemo(() => {
    if (!selectedStory) return 0;
    return selectedStorySubItems.subTasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0) + 
           selectedStorySubItems.bugs.reduce((sum, bug) => sum + (bug.estimatedHours || 0), 0);
  }, [selectedStory, selectedStorySubItems]);

  const isEffortReadOnly = useMemo(() => {
    if (!selectedStory) return false;
    return subItemsEffort > 0;
  }, [selectedStory, subItemsEffort]);

  return (
    <Dialog open={!!storyId} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col overflow-hidden" bypassScrollWrapper={true}>
          {selectedStory && (
            <>
              {selectedStory.itemType === 'Sub Task' ? (
                <Form {...subTaskForm}>
                  <form onSubmit={subTaskForm.handleSubmit(onEditSubTaskSubmit)} className="flex flex-col h-full max-h-[90vh] overflow-hidden">
                    <DialogHeader>
                      <DialogTitle>Edit Sub Task</DialogTitle>
                      <DialogDescription>Make changes to your sub task here.</DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                        <FormField control={subTaskForm.control} name="title" render={({field}) => (
                            <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Sub-task title" {...field}/></FormControl><FormMessage/></FormItem>
                        )}/>
                        <Tabs defaultValue="details" className="w-full">
                            <TabsList>
                                <TabsTrigger value="details">Details</TabsTrigger>
                                <TabsTrigger value="logs">
                                    Logs
                                    <Badge variant="secondary" className="ml-2">
                                        {selectedStorySubItems.logs.length}
                                    </Badge>
                                </TabsTrigger>
                            </TabsList>
                            <TabsContent value="details" className="pt-4">
                                <div className="space-y-4">
                                    <FormField control={subTaskForm.control} name="description" render={({field}) => (
                                        <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Describe sub-task..." {...field}/></FormControl><FormMessage/></FormItem>
                                    )}/>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField control={subTaskForm.control} name="impactedSystemId" render={({field}) => (
                                            <FormItem><FormLabel>Impacted System</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a system"/></SelectTrigger></FormControl>
                                                    <SelectContent><SelectItem value="unassigned">None</SelectItem>{impactedSystems.map(s=><SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                                                </Select>
                                            <FormMessage/></FormItem>
                                        )}/>
                                        <FormField control={subTaskForm.control} name="assigneeId" render={({field}) => (
                                            <FormItem>
                                            <FormLabel>Assigned To</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Assign a resource"/></SelectTrigger></FormControl>
                                                <SelectContent>
                                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                                {users.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage/>
                                            </FormItem>
                                        )}/>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <FormField
                                            control={subTaskForm.control}
                                            name="status"
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel>Status</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
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
                                        <FormField control={subTaskForm.control} name="estimatedHours" render={({field}) => (
                                            <FormItem><FormLabel>Effort (hours)</FormLabel><FormControl><Input type="number" placeholder="0" {...field} value={field.value ?? ''}/></FormControl><FormMessage/></FormItem>
                                        )}/>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField control={subTaskForm.control} name="startDate" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Start Date</FormLabel>
                                                <FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={subTaskForm.control} name="endDate" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>End Date</FormLabel>
                                                <FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <FormField control={subTaskForm.control} name="sprintId" render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>Sprint</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || 'backlog'}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Assign to a sprint" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                <SelectItem value="backlog">Backlog</SelectItem>
                                                {sprints.map(sprint => (
                                                    <SelectItem key={sprint.id} value={sprint.id}>{sprint.title}</SelectItem>
                                                ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={subTaskForm.control} name="releaseId" render={({ field }) => (
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
                                        )} />
                                    </div>
                                </div>
                            </TabsContent>
                             <TabsContent value="logs">
                                <div className="space-y-2 pt-4 max-h-96 overflow-y-auto">
                                    {selectedStorySubItems.logs.length > 0 ? (
                                        selectedStorySubItems.logs.map((log, index) => (
                                            <div key={index} className="flex items-center justify-between text-sm p-2 border-b">
                                                <span>Status changed to <strong>{log.toStatus}</strong> from <strong>{log.fromStatus || 'None'}</strong></span>
                                                <span className="text-muted-foreground">{format(new Date(log.date), 'PP pp')}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic px-2">No status changes logged.</p>
                                    )}
                                    {selectedStory?.estimatedHours != null && (
                                        <div className="flex items-center justify-between text-sm p-2 border-t font-semibold">
                                            <span>Planned Effort:</span>
                                            <span>{selectedStory.estimatedHours} {selectedStory.estimatedHours === 1 ? 'hour' : 'hours'}</span>
                                        </div>
                                    )}
                                    {actualEffortInHours !== null && (
                                        <div className="flex items-center justify-between text-sm p-2 border-t font-semibold">
                                            <span>Actual Effort:</span>
                                            <span>{actualEffortInHours.toFixed(2)} hours</span>
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isEditStorySubmitting}>
                            {isEditStorySubmitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                  </form>
                </Form>
              ) : (
              <Form {...editStoryForm}>
                <form onSubmit={editStoryForm.handleSubmit(onEditStorySubmit)} className="flex flex-col h-full max-h-[90vh] overflow-hidden">
                  <DialogHeader>
                    <DialogTitle>Edit {selectedStory.itemType}</DialogTitle>
                    <DialogDescription>
                      Make changes to your {selectedStory.itemType.toLowerCase()} here. Click save when you're done.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  <FormField
                      control={editStoryForm.control}
                      name="itemType"
                      render={({ field }) => (
                      <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled>
                          <FormControl>
                              <SelectTrigger>
                              <SelectValue placeholder="Select a requirement type" />
                              </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                              {workItemTypes.map(itemType => (
                              <SelectItem key={itemType} value={itemType}>
                                  {itemType}
                              </SelectItem>
                              ))}
                          </SelectContent>
                          </Select>
                          <FormMessage />
                      </FormItem>
                      )}
                  />
                   <FormField
                    control={editStoryForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Story title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                    <Tabs defaultValue="details" className="w-full">
                        <TabsList>
                            <TabsTrigger value="details">Details</TabsTrigger>
                            {['Requirement/Story', 'Feature Change', 'Task'].includes(selectedStory.itemType) && (
                                <>
                                    <TabsTrigger value="subTasks">
                                        Sub-Tasks
                                        <Badge variant="secondary" className="ml-2">
                                            {selectedStorySubItems.subTasks.length}
                                        </Badge>
                                    </TabsTrigger>
                                    <TabsTrigger value="bugs">
                                        Bugs
                                        <Badge variant="secondary" className="ml-2">
                                            {selectedStorySubItems.bugs.length}
                                        </Badge>
                                    </TabsTrigger>
                                </>
                            )}
                             <TabsTrigger value="logs">
                                Logs
                                <Badge variant="secondary" className="ml-2">
                                    {selectedStorySubItems.logs.length}
                                </Badge>
                            </TabsTrigger>
                        </TabsList>
                    <TabsContent value="details" className="pt-4">
                      <div className="space-y-4">
                        {['Requirement/Story', 'Feature Change', 'Bug', 'Task'].includes(selectedStory.itemType) && (
                          <FormField
                            control={editStoryForm.control}
                            name="impactedSystemIds"
                            render={() => (
                              <FormItem>
                                <FormLabel>Impacted Systems</FormLabel>
                                <div className="grid grid-cols-2 gap-2 p-2 border rounded-md">
                                  {impactedSystems.map((system) => (
                                    <FormField
                                      key={system.id}
                                      control={editStoryForm.control}
                                      name="impactedSystemIds"
                                      render={({ field }) => {
                                        return (
                                          <FormItem
                                            key={system.id}
                                            className="flex flex-row items-start space-x-3 space-y-0"
                                          >
                                            <FormControl>
                                              <Checkbox
                                                checked={field.value?.includes(system.id)}
                                                onCheckedChange={(checked) => {
                                                  return checked
                                                    ? field.onChange([...(field.value || []), system.id])
                                                    : field.onChange(
                                                        field.value?.filter(
                                                          (value) => value !== system.id
                                                        )
                                                      )
                                                }}
                                              />
                                            </FormControl>
                                            <FormLabel className="font-normal">
                                              {system.name}
                                            </FormLabel>
                                          </FormItem>
                                        )
                                      }}
                                    />
                                  ))}
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        <FormField
                            control={editStoryForm.control}
                            name="description"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                <Textarea placeholder="Describe the story..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={editStoryForm.control}
                            name="acceptanceCriteria"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Acceptance Criteria</FormLabel>
                                <FormControl>
                                <Textarea placeholder="Define acceptance criteria for this story..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {['Requirement/Story', 'Task', 'Bug', 'Feature Change'].includes(selectedStory.itemType) ? (
                            <FormField
                            control={editStoryForm.control}
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
                        ) : null}
                         {selectedStory.itemType === 'Bug' && (
                            <FormField
                                control={editStoryForm.control}
                                name="reporterId"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Reporter</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a reporter" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                        <SelectItem value="unassigned">Unassigned</SelectItem>
                                        {users.map(emp => (
                                            <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>
                                        ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        <FormField
                            control={editStoryForm.control}
                            name="assigneeId"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Assignee</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder="Assign to a resource" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                    {users.map((emp) => (
                                    <SelectItem key={emp.id} value={emp.id}>
                                        {emp.firstName} {emp.lastName}
                                    </SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        </div>
                        {['Feature Change', 'Bug'].includes(selectedStory.itemType) ? (
                          <FormField
                          control={editStoryForm.control}
                          name={selectedStory.itemType === 'Bug' ? "relatedTestCaseId" : "parentStoryId" as any} 
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>{selectedStory.itemType === 'Feature Change' ? 'Original Requirement' : (selectedStory.itemType === 'Bug' ? 'Related Test Case' : 'Parent Item')}</FormLabel>
                              <FormControl>
                                  <Input 
                                      list={selectedStory.itemType === 'Bug' ? 'testcase-options' : 'parent-story-options-edit'}
                                      placeholder={selectedStory.itemType === 'Bug' ? 'Link to a test case' : 'Link to a story or feature change'}
                                      value={selectedStory.itemType === 'Bug' ? testCaseInputText : editParentStoryText}
                                      onChange={(e) => {
                                          const text = e.target.value;
                                          const options = selectedStory.itemType === 'Bug' ? testCaseOptions : parentStoryOptions;
                                          if (selectedStory.itemType === 'Bug') {
                                              setTestCaseInputText(text);
                                          } else {
                                              setEditParentStoryText(text);
                                          }
                                          const matchingOption = options.find(opt => opt.label === text);
                                          field.onChange(matchingOption ? matchingOption.value : undefined);
                                      }}
                                      onBlur={() => {
                                          const text = selectedStory.itemType === 'Bug' ? testCaseInputText : editParentStoryText;
                                          const options = selectedStory.itemType === 'Bug' ? testCaseOptions : parentStoryOptions;
                                          const matchingOption = options.find(opt => opt.label === text);
                                          if (!matchingOption) {
                                              if (selectedStory.itemType === 'Bug') {
                                                  setTestCaseInputText('');
                                              } else {
                                                  setEditParentStoryText('');
                                              }
                                              field.onChange(undefined);
                                          }
                                      }}
                                  />
                              </FormControl>
                              <datalist id={selectedStory.itemType === 'Bug' ? 'testcase-options' : 'parent-story-options-edit'}>
                                  {(selectedStory.itemType === 'Bug' ? testCaseOptions : parentStoryOptions).map(opt => <option key={opt.value} value={opt.label} />)}
                              </datalist>
                              <FormMessage />
                              </FormItem>
                          )}
                          />
                        ) : null}
                         <FormField
                            control={editStoryForm.control}
                            name="priority"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Priority</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder="Set priority" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {priorities.map((p) => (
                                    <SelectItem key={p} value={p}>
                                        <div className="flex items-center gap-2">
                                        <Circle className={cn("h-3 w-3", priorityStyles[p])} />
                                        <span>{p}</span>
                                        </div>
                                    </SelectItem>
                                    ))}
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={editStoryForm.control}
                            name="status"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder="Set status" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                     {(selectedStory?.itemType === 'Bug' 
                                       ? ['In Triage', 'Defect Backlog', 'In Progress', 'Retest', 'Closed']
                                       : statusOptions).map((s) => (
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
                        {selectedStory.itemType === 'Bug' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={editStoryForm.control}
                              name="foundInTestPlanId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Found In Test Plan</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select a test plan" />
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
                              control={editStoryForm.control}
                              name="relatedBugId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Related / Original Bug</FormLabel>
                                  <FormControl>
                                    <Input
                                      list="bug-options-edit"
                                      placeholder="Search for a bug..."
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
                                  <datalist id="bug-options-edit">
                                    {relatedBugOptions.filter(opt => opt.value !== selectedStory?.id).map(opt => <option key={opt.value} value={opt.label} />)}
                                  </datalist>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                             <FormField
                              control={editStoryForm.control}
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
                        )}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={editStoryForm.control}
                                name="sprintId"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sprint</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || 'backlog'}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Assign to a sprint" /></SelectTrigger></FormControl>
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
                            control={editStoryForm.control}
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
                                    {releases.map(release => (
                                        <SelectItem key={release.id} value={release.id}>[{release.releaseId}] {release.name}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <FormField
                            control={editStoryForm.control}
                            name="estimatedHours"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Effort (hours)</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="0" {...field} value={isEffortReadOnly ? subItemsEffort : (field.value ?? '')} readOnly={isEffortReadOnly} />
                                </FormControl>
                                {isEffortReadOnly && <p className="text-xs text-muted-foreground">Effort is calculated from linked sub-tasks.</p>}
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        </div>
                        {selectedStory.itemType === 'Bug' && (
                            <>
                            <FormField
                                control={editStoryForm.control}
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
                                 <FormField control={editStoryForm.control} name="createdAt" render={({ field }) => (
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
                                 <FormField control={editStoryForm.control} name="closedAt" render={({ field }) => (
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
                            </>
                        )}
                      </div>
                    </TabsContent>
                    {['Requirement/Story', 'Feature Change', 'Task'].includes(selectedStory.itemType) && (
                        <>
                            <TabsContent value="subTasks" className="pt-4">
                                <div className="space-y-4">
                                    {selectedStorySubItems.subTasks.length > 0 ? (
                                        selectedStorySubItems.subTasks.map(task => (
                                            <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg bg-card cursor-pointer hover:bg-muted" onClick={() => {}}>
                                                <div className="flex items-center gap-3">
                                                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                                                    <div>
                                                        <p className="font-medium text-sm">[{task.storyId}] {task.title}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Badge variant="outline">{task.status}</Badge>
                                                            {task.impactedSystemId && (
                                                                <Badge variant="secondary" className="text-[10px]">
                                                                    {impactedSystems.find(s => s.id === task.impactedSystemId)?.name}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-muted-foreground">Effort: {task.estimatedHours || 0}h</p>
                                                    <p className="text-[10px] text-muted-foreground mt-1">
                                                        {users.find(u => u.id === task.assigneeId)?.firstName || 'Unassigned'}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic px-2">No sub-tasks found.</p>
                                    )}
                                </div>
                            </TabsContent>
                            <TabsContent value="bugs" className="pt-4">
                                <div className="space-y-4">
                                    {selectedStorySubItems.bugs.length > 0 ? (
                                        selectedStorySubItems.bugs.map(bug => (
                                            <div key={bug.id} className="flex items-center justify-between p-3 border rounded-lg bg-card cursor-pointer hover:bg-muted" onClick={() => {}}>
                                                <div className="flex items-center gap-3">
                                                    <Bug className="h-4 w-4 text-destructive" />
                                                    <div>
                                                        <p className="font-medium text-sm">[{bug.storyId}] {bug.title}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <Badge variant="outline">{bug.status}</Badge>
                                                            <Badge variant="secondary" className="text-[10px]">{bug.severity}</Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                                 <div className="text-right">
                                                    <p className="text-xs text-muted-foreground">Effort: {bug.estimatedHours || 0}h</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic px-2">No bugs found.</p>
                                    )}
                                </div>
                            </TabsContent>
                        </>
                    )}
                    <TabsContent value="logs">
                        <div className="space-y-2 pt-4 max-h-96 overflow-y-auto">
                            {selectedStorySubItems.logs.length > 0 ? (
                                selectedStorySubItems.logs.map((log, index) => (
                                    <div key={index} className="flex items-center justify-between text-sm p-2 border-b">
                                        <span>Status changed to <strong>{log.toStatus}</strong> from <strong>{log.fromStatus || 'None'}</strong></span>
                                        <span className="text-muted-foreground">{format(new Date(log.date), 'PP pp')}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground italic px-2">No status changes logged.</p>
                            )}
                            {selectedStory?.estimatedHours != null && (
                                <div className="flex items-center justify-between text-sm p-2 border-t font-semibold">
                                    <span>Planned Effort:</span>
                                    <span>{selectedStory.estimatedHours} {selectedStory.estimatedHours === 1 ? 'hour' : 'hours'}</span>
                                </div>
                            )}
                            {actualEffortInHours !== null && (
                                <div className="flex items-center justify-between text-sm p-2 border-t font-semibold">
                                    <span>Actual Effort:</span>
                                    <span>{actualEffortInHours.toFixed(2)} hours</span>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                    </Tabs>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isEditStorySubmitting}>
                      {isEditStorySubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
  );
}
