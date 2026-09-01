

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
  DialogTrigger,
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
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, Edit, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Check, ChevronsUpDown, Info, Search } from 'lucide-react';
import { type User, type UserRole, type Story, type ImpactedSystem, type Project, type Horizontal } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { buttonVariants } from '@/components/ui/button';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getYear, setYear, getMonth, setMonth, addMonths, subMonths, addWeeks, subWeeks, addYears, isWithinInterval, differenceInDays } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

const baseResourceSchema = z.object({
  employeeId: z.string().min(1, 'Please select a user.'),
  role: z.string().optional(),
  availability: z.coerce.number().min(0, 'Availability must be between 0 and 100%').max(100, 'Availability must be between 0 and 100%').optional(),
  onboardingDate: z.string().min(1, 'Onboarding date is required.'),
  offloadingDate: z.string().min(1, 'Offboarding date is required.'),
  clientEmpId: z.string().optional(),
  clientEmail: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  capabilities: z.array(z.string()).optional(),
  isBcpSupport: z.boolean().optional(),
});

const roles: UserRole[] = ['Developer', 'Tester', 'Architect', 'BA', 'PM', 'Program Director'];

function ResourceDialog({
  isOpen,
  setIsOpen,
  editingUser,
  setEditingUser,
  allUsers,
  projectUsers,
  project,
  impactedSystems,
  horizontals,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  editingUser: User | null;
  setEditingUser: (user: User | null) => void;
  allUsers: User[];
  projectUsers: User[];
  project: Project | null;
  impactedSystems: ImpactedSystem[];
  horizontals: Horizontal[];
}) {
  const { addUserToProject, updateProjectUser } = useProject();
  const { toast } = useToast();
  const [userInputText, setUserInputText] = useState('');

  const dynamicResourceSchema = useMemo(() => {
    const projStart = project?.startDate ? format(parseISO(project.startDate), 'yyyy-MM-dd') : null;
    const projEnd = project?.endDate ? format(parseISO(project.endDate), 'yyyy-MM-dd') : null;

    return baseResourceSchema.superRefine((data, ctx) => {
      const onDate = data.onboardingDate;
      const offDate = data.offloadingDate;

      if (onDate && projStart && onDate < projStart) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['onboardingDate'],
          message: `Onboarding date cannot be earlier than project start date (${format(parseISO(project!.startDate!), 'dd MMM yyyy')}).`,
        });
      }

      if (onDate && projEnd && onDate > projEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['onboardingDate'],
          message: `Onboarding date cannot be later than project end date (${format(parseISO(project!.endDate!), 'dd MMM yyyy')}).`,
        });
      }

      if (offDate && projStart && offDate < projStart) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['offloadingDate'],
          message: `Offboarding date cannot be earlier than project start date (${format(parseISO(project!.startDate!), 'dd MMM yyyy')}).`,
        });
      }

      if (offDate && projEnd && offDate > projEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['offloadingDate'],
          message: `Offboarding date cannot be later than project end date (${format(parseISO(project!.endDate!), 'dd MMM yyyy')}).`,
        });
      }

      if (onDate && offDate && offDate < onDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['offloadingDate'],
          message: 'Offboarding date cannot be earlier than onboarding date.',
        });
      }
    });
  }, [project]);

  const form = useForm<z.infer<typeof baseResourceSchema>>({
    resolver: zodResolver(dynamicResourceSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    if (isOpen) {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const projStartStr = project?.startDate ? format(parseISO(project.startDate), 'yyyy-MM-dd') : '';
      const projEndStr = project?.endDate ? format(parseISO(project.endDate), 'yyyy-MM-dd') : '';

      if (editingUser) {
        form.reset({
          employeeId: editingUser.id,
          role: editingUser.role,
          availability: editingUser.availability ?? 100,
          onboardingDate: editingUser.onboardingDate ? format(new Date(editingUser.onboardingDate), 'yyyy-MM-dd') : (projStartStr || todayStr),
          offloadingDate: editingUser.offloadingDate ? format(new Date(editingUser.offloadingDate), 'yyyy-MM-dd') : (projEndStr || todayStr),
          clientEmpId: editingUser.clientEmpId || '',
          clientEmail: editingUser.clientEmail || '',
          capabilities: editingUser.capabilities || [],
          isBcpSupport: editingUser.isBcpSupport || false,
        });
        const user = allUsers.find(u => u.id === editingUser.id);
        if (user) {
          setUserInputText(`${user.firstName} ${user.lastName} (${user.empId})`);
        }
      } else {
        let initialOnboarding = projStartStr || todayStr;
        if (projStartStr && projEndStr) {
          if (todayStr >= projStartStr && todayStr <= projEndStr) {
            initialOnboarding = todayStr;
          } else {
            initialOnboarding = projStartStr;
          }
        }

        form.reset({
          employeeId: '',
          role: undefined,
          availability: 100,
          onboardingDate: initialOnboarding,
          offloadingDate: projEndStr || initialOnboarding,
          clientEmpId: '',
          clientEmail: '',
          capabilities: [],
          isBcpSupport: false,
        });
        setUserInputText('');
      }
    }
  }, [isOpen, editingUser, form, project, allUsers]);

  const handleFormSubmit = async (values: z.infer<typeof baseResourceSchema>) => {
    if (editingUser) {
      const success = await updateProjectUser(editingUser.id, {
        role: values.role as UserRole,
        availability: values.availability,
        onboardingDate: values.onboardingDate ? new Date(values.onboardingDate).toISOString() : undefined,
        offloadingDate: values.offloadingDate ? new Date(values.offloadingDate).toISOString() : undefined,
        clientEmpId: values.clientEmpId,
        clientEmail: values.clientEmail,
        capabilities: values.capabilities,
        isBcpSupport: values.isBcpSupport,
      });

      if (success) {
        toast({ title: "Success", description: `${editingUser.firstName}'s details updated.` });
      } else {
        toast({ variant: "destructive", title: "Error", description: `Could not update user.` });
      }
    } else {
      const userToAdd = allUsers.find(emp => emp.id === values.employeeId);
      if (!userToAdd) {
        toast({ variant: "destructive", title: "Error", description: "Selected user not found." });
        return;
      }

      const projectUserData: User = {
        ...userToAdd,
        role: values.role as UserRole,
        availability: values.availability,
        onboardingDate: values.onboardingDate ? new Date(values.onboardingDate).toISOString() : undefined,
        offloadingDate: values.offloadingDate ? new Date(values.offloadingDate).toISOString() : undefined,
        clientEmpId: values.clientEmpId,
        clientEmail: values.clientEmail,
        capabilities: values.capabilities,
        isBcpSupport: values.isBcpSupport,
      };

      const success = await addUserToProject(projectUserData);

      if (success) {
        toast({ title: "Success", description: `${userToAdd.firstName} added to the project.` });
      } else {
        toast({ variant: "destructive", title: "Error", description: `Could not add user to project. They may already be on the team.` });
      }
    }

    setIsOpen(false);
    setEditingUser(null);
  };

  const availableUsers = allUsers.filter(emp => !emp.isDeleted && emp.isEnabled !== false && !!emp.empId && emp.empId.trim() !== '' && !projectUsers.some(pe => pe.id === emp.id));
  const availableUserOptions = availableUsers
    .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, undefined, { numeric: true, sensitivity: 'base' }))
    .map(emp => ({
      value: emp.id,
      label: `${emp.firstName} ${emp.lastName} (${emp.empId.trim()})`
    }));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setEditingUser(null); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingUser ? 'Edit Resource' : 'Add User to Project'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        list="user-options"
                        placeholder="Search for a user..."
                        className="pl-9"
                        value={userInputText}
                        readOnly={!!editingUser}
                        onChange={(e) => {
                          if (editingUser) return;
                          const inputText = e.target.value;
                          setUserInputText(inputText);

                          const matchingOption = availableUserOptions.find(opt => opt.label.toLowerCase() === inputText.toLowerCase() || opt.value === inputText);
                          field.onChange(matchingOption ? matchingOption.value : '');
                        }}
                        onBlur={(e) => {
                          if (editingUser) return;
                          const matchingOption = availableUserOptions.find(opt => opt.label.toLowerCase() === e.target.value.toLowerCase());
                          if (matchingOption) {
                            setUserInputText(matchingOption.label);
                            field.onChange(matchingOption.value);
                          } else if (!e.target.value.trim()) {
                            setUserInputText('');
                            field.onChange('');
                          } else {
                            const currentSelected = availableUserOptions.find(opt => opt.value === field.value);
                            if (currentSelected) {
                              setUserInputText(currentSelected.label);
                            } else {
                              setUserInputText('');
                              field.onChange('');
                            }
                          }
                        }}
                      />
                    </div>
                  </FormControl>
                  <datalist id="user-options">
                    {availableUserOptions.map(emp => (
                      <option key={emp.value} value={emp.label} />
                    ))}
                  </datalist>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center h-5">Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="availability" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5 h-5">
                    Availability (%)
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-pointer animate-pulse" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[250px] p-2 text-xs font-normal">
                          This availability is the resource's total availability for the project, not capability wise.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </FormLabel>
                  <FormControl><Input type="number" placeholder="100" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField
              control={form.control}
              name="capabilities"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capability</FormLabel>
                  <Card>
                    <CardContent className="p-4 space-y-4 max-h-48 overflow-y-auto">
                      <RadioGroup
                        value={field.value?.[0] || "none"}
                        onValueChange={(val) => {
                          field.onChange(val === "none" ? [] : [val]);
                        }}
                      >
                        <div className="flex flex-row items-center space-x-3 space-y-0 pb-2 border-b border-border mb-3">
                          <RadioGroupItem value="none" id="capability-none" />
                          <Label htmlFor="capability-none" className="font-normal text-muted-foreground cursor-pointer">None / Unassigned</Label>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Impacted Systems</h4>
                            <div className="space-y-2">
                              {impactedSystems.map((system) => (
                                <div key={system.id} className="flex flex-row items-center space-x-3 space-y-0">
                                  <RadioGroupItem value={system.id} id={system.id} />
                                  <Label htmlFor={system.id} className="font-normal cursor-pointer">{system.name}</Label>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">Horizontals</h4>
                            <div className="space-y-2">
                              {horizontals.map((horizontal) => (
                                <div key={horizontal.id} className="flex flex-row items-center space-x-3 space-y-0">
                                  <RadioGroupItem value={horizontal.id} id={horizontal.id} />
                                  <Label htmlFor={horizontal.id} className="font-normal cursor-pointer">{horizontal.name}</Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </RadioGroup>
                    </CardContent>
                  </Card>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="onboardingDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Onboarding Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value || ''}
                      min={project?.startDate ? format(parseISO(project.startDate), 'yyyy-MM-dd') : undefined}
                      max={form.watch('offloadingDate') || (project?.endDate ? format(parseISO(project.endDate), 'yyyy-MM-dd') : undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="offloadingDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Offboarding Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value || ''}
                      min={form.watch('onboardingDate') || (project?.startDate ? format(parseISO(project.startDate), 'yyyy-MM-dd') : undefined)}
                      max={project?.endDate ? format(parseISO(project.endDate), 'yyyy-MM-dd') : undefined}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            {project?.startDate && (
              <p className="text-[11px] text-muted-foreground -mt-2">
                Project timeline: {format(parseISO(project.startDate), 'dd MMM yyyy')}{project.endDate ? ` — ${format(parseISO(project.endDate), 'dd MMM yyyy')}` : ''}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="clientEmpId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Client ID</FormLabel>
                  <FormControl><Input placeholder="Client Employee ID" {...field} value={field.value || ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="clientEmail" render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Email</FormLabel>
                  <FormControl><Input type="email" placeholder="client.email@example.com" {...field} value={field.value || ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField
              control={form.control}
              name="isBcpSupport"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      BCP Support Resource
                    </FormLabel>
                    <DialogDescription>
                      Mark this user as a support resource for Business Continuity Planning.
                    </DialogDescription>
                  </div>
                </FormItem>
              )}
            />


            <DialogFooter>
              <Button type="submit">
                {editingUser ? 'Save Changes' : 'Add to Project'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function CapacityPlanning() {
  const { sprints, impactedSystems, stories, employees, holidays, weeklyOffDays } = useProject();
  const [viewType, setViewType] = useState<'sprint' | 'month' | 'week'>('sprint');
  const [selectedSprintId, setSelectedSprintId] = useState<string>('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [unit, setUnit] = useState<'hours' | 'days'>('hours');

  const currentSprint = useMemo(() => sprints.find(s => s.isCurrent), [sprints]);

  useEffect(() => {
    if (currentSprint) {
      setSelectedSprintId(currentSprint.id);
    } else if (sprints.length > 0) {
      setSelectedSprintId(sprints[0].id);
    }
  }, [currentSprint, sprints]);

  const { periodStart, periodEnd } = useMemo(() => {
    if (viewType === 'sprint') {
      const sprint = sprints.find(s => s.id === selectedSprintId);
      return {
        periodStart: sprint?.startDate ? parseISO(sprint.startDate) : null,
        periodEnd: sprint?.endDate ? parseISO(sprint.endDate) : null,
      };
    }
    if (viewType === 'month') {
      return {
        periodStart: startOfMonth(currentDate),
        periodEnd: endOfMonth(currentDate),
      };
    }
    // week view
    return {
      periodStart: startOfWeek(currentDate, { weekStartsOn: 1 }), // Monday
      periodEnd: endOfWeek(currentDate, { weekStartsOn: 1 }), // Sunday
    };
  }, [viewType, selectedSprintId, sprints, currentDate]);

  const getWorkingDays = useCallback((start: Date, end: Date): number => {
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return 0;
    }
    const holidayDates = holidays.map(h => parseISO(h.date));
    const interval = eachDayOfInterval({ start, end });

    return interval.filter(day => {
      const dayOfWeek = day.getDay();
      const isWeekend = weeklyOffDays.includes(dayOfWeek);
      const isHoliday = holidayDates.some(h => isSameDay(day, h));
      return !isWeekend && !isHoliday;
    }).length;
  }, [holidays, weeklyOffDays]);

  const workingDaysInPeriod = useMemo(() => {
    if (!periodStart || !periodEnd) return 0;
    return getWorkingDays(periodStart, periodEnd);
  }, [periodStart, periodEnd, getWorkingDays]);

  const capacityData = useMemo(() => {
    if (!periodStart || !periodEnd) return [];

    return impactedSystems.map(system => {
      const resourcesForSystem = employees.filter(emp => emp.capabilities?.includes(system.id));

      let totalCapacityHours = 0;
      resourcesForSystem.forEach(emp => {
        const availabilityFactor = (emp.availability || 100) / 100;
        totalCapacityHours += workingDaysInPeriod * 8 * availabilityFactor;
      });

      const utilizedHours = stories
        .filter(story => {
          if (story.itemType !== 'Sub Task' || story.impactedSystemId !== system.id) return false;

          if (story.startDate && story.endDate) {
            const taskStart = parseISO(story.startDate);
            const taskEnd = parseISO(story.endDate);
            return isWithinInterval(periodStart, { start: taskStart, end: taskEnd }) ||
              isWithinInterval(periodEnd, { start: taskStart, end: taskEnd }) ||
              isWithinInterval(taskStart, { start: periodStart, end: periodEnd });
          }

          // Fallback for tasks without dates - check parent story's sprint
          const parentStory = stories.find(s => s.id === story.parentStoryId);
          if (!parentStory?.sprintId) return false;

          const sprint = sprints.find(s => s.id === parentStory.sprintId);
          if (sprint?.startDate && sprint?.endDate) {
            const sprintStart = parseISO(sprint.startDate);
            const sprintEnd = parseISO(sprint.endDate);
            return isWithinInterval(periodStart, { start: sprintStart, end: sprintEnd }) ||
              isWithinInterval(periodEnd, { start: sprintStart, end: sprintEnd }) ||
              isWithinInterval(sprintStart, { start: periodStart, end: periodEnd });
          }

          return false;
        })
        .reduce((sum, task) => {
          const taskStart = task.startDate ? parseISO(task.startDate) : periodStart;
          const taskEnd = task.endDate ? parseISO(task.endDate) : periodEnd;
          const overlapStart = new Date(Math.max(periodStart.getTime(), taskStart.getTime()));
          const overlapEnd = new Date(Math.min(periodEnd.getTime(), taskEnd.getTime()));

          if (overlapStart > overlapEnd) return sum;

          const overlapWorkingDays = getWorkingDays(overlapStart, overlapEnd);
          const taskTotalWorkingDays = getWorkingDays(taskStart, taskEnd) || 1;
          const dailyEffort = (task.estimatedHours || 0) / taskTotalWorkingDays;

          return sum + (dailyEffort * overlapWorkingDays);
        }, 0);

      const utilization = totalCapacityHours > 0 ? (utilizedHours / totalCapacityHours) * 100 : 0;

      return {
        systemId: system.id,
        systemName: system.name,
        totalCapacityHours: parseFloat(totalCapacityHours.toFixed(2)),
        utilizedHours: parseFloat(utilizedHours.toFixed(2)),
        remainingHours: parseFloat((totalCapacityHours - utilizedHours).toFixed(2)),
        utilization: parseFloat(utilization.toFixed(2)),
      };
    });
  }, [periodStart, periodEnd, stories, impactedSystems, employees, workingDaysInPeriod, sprints, getWorkingDays]);

  const handleDateChange = (changeFn: (date: Date, amount: number) => Date) => {
    setCurrentDate(prev => changeFn(prev, 1));
  };

  const periodTitle = useMemo(() => {
    if (viewType === 'sprint') {
      const sprint = sprints.find(s => s.id === selectedSprintId)
      if (!sprint) return "Select a Sprint";
      const start = sprint.startDate ? format(parseISO(sprint.startDate), 'MMM d') : '?';
      const end = sprint.endDate ? format(parseISO(sprint.endDate), 'MMM d') : '?';
      return `${sprint.title} (${start} - ${end})`;
    }
    if (viewType === 'month') {
      return format(currentDate, 'MMMM yyyy');
    }
    if (viewType === 'week') {
      return `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}`;
    }
    return '';
  }, [viewType, selectedSprintId, currentDate, sprints]);

  const displayValue = useCallback((valueInHours: number) => {
    if (unit === 'days') {
      return (valueInHours / 8).toFixed(2);
    }
    return valueInHours.toFixed(2);
  }, [unit]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Capacity Planning</CardTitle>
        <CardDescription>View resource capacity based on assigned sub-tasks for each impacted system.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <Tabs value={viewType} onValueChange={(v) => setViewType(v as any)} className="w-auto">
              <TabsList>
                <TabsTrigger value="sprint">Sprint</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
              </TabsList>
            </Tabs>

            {viewType === 'sprint' ? (
              <Select value={selectedSprintId} onValueChange={setSelectedSprintId}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select Sprint" />
                </SelectTrigger>
                <SelectContent>
                  {sprints.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2 border rounded-md p-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDateChange(viewType === 'month' ? subMonths : subWeeks)}> <ChevronLeft /> </Button>
                <span className="font-semibold text-sm w-48 text-center">{periodTitle}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDateChange(viewType === 'month' ? addMonths : addWeeks)}> <ChevronRight /> </Button>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Label htmlFor="unit-switch">Days</Label>
            <Switch
              id="unit-switch"
              checked={unit === 'hours'}
              onCheckedChange={(checked) => setUnit(checked ? 'hours' : 'days')}
            />
            <Label htmlFor="unit-switch">Hours</Label>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[25%]">Impacted System</TableHead>
              <TableHead>Total Capacity ({unit})</TableHead>
              <TableHead>Utilized ({unit})</TableHead>
              <TableHead>Remaining ({unit})</TableHead>
              <TableHead className="w-[25%]">Utilization</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {capacityData.map(data => (
              <TableRow key={data.systemId}>
                <TableCell className="font-medium">{data.systemName}</TableCell>
                <TableCell>{displayValue(data.totalCapacityHours)}</TableCell>
                <TableCell>{displayValue(data.utilizedHours)}</TableCell>
                <TableCell>{displayValue(data.remainingHours)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={data.utilization} className="w-full h-3" />
                    <span className="text-xs font-semibold">{data.utilization.toFixed(0)}%</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

      </CardContent>
    </Card>
  )
}

export default function ResourcesPage() {
  const {
    project,
    employees: projectUsers,
    allUsers,
    impactedSystems,
    horizontals,
    deleteEmployee: removeUserFromProject
  } = useProject();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const handleOpenDialog = (user: User | null) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  }

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="Project Resources" description="Manage users assigned to this project.">
          <Button onClick={() => handleOpenDialog(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </PageHeader>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Capabilities</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead>Onboarding Date</TableHead>
                <TableHead>Offboarding Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectUsers.map((user) => {
                const allCapabilities = [...impactedSystems, ...horizontals];
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.empId}</TableCell>
                    <TableCell>{user.firstName} {user.lastName}</TableCell>
                    <TableCell>{user.role || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.capabilities && user.capabilities.length > 0
                          ? user.capabilities.map(capId => {
                            const capability = allCapabilities.find(s => s.id === capId);
                            return capability ? <Badge key={capId} variant="secondary">{capability.name}</Badge> : null;
                          })
                          : 'N/A'
                        }
                      </div>
                    </TableCell>
                    <TableCell>{user.availability ? `${user.availability}%` : 'N/A'}</TableCell>
                    <TableCell>{user.onboardingDate ? format(parseISO(user.onboardingDate), 'PPP') : 'N/A'}</TableCell>
                    <TableCell>{user.offloadingDate ? format(parseISO(user.offloadingDate), 'PPP') : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeletingUser(user)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>

        <CapacityPlanning />
      </div>

      <ResourceDialog
        isOpen={isDialogOpen}
        setIsOpen={setIsDialogOpen}
        editingUser={editingUser}
        setEditingUser={setEditingUser}
        allUsers={allUsers}
        projectUsers={projectUsers}
        project={project}
        impactedSystems={impactedSystems}
        horizontals={horizontals}
      />

      <AlertDialog open={!!deletingUser} onOpenChange={(isOpen) => !isOpen && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {deletingUser?.firstName} {deletingUser?.lastName} from this project. It will not delete their global user record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingUser) {
                  removeUserFromProject(deletingUser.id).then(success => {
                    if (success) {
                      toast({ title: "Success", description: "User removed from project." });
                    } else {
                      toast({ variant: "destructive", title: "Error", description: "Could not remove user." });
                    }
                    setDeletingUser(null);
                  })
                }
              }}
              className={cn(buttonVariants({ variant: 'destructive' }))}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}














