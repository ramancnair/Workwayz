

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
import { PlusCircle, Trash2, Edit, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Check, ChevronsUpDown } from 'lucide-react';
import { type User, type UserRole, type Story, type ImpactedSystem, type Project } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { buttonVariants } from '@/components/ui/button';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getYear, setYear, getMonth, setMonth, addMonths, subMonths, addWeeks, subWeeks, addYears } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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
} from "@/components/ui/command"

const resourceSchema = z.object({
  employeeId: z.string().min(1, 'Please select a user.'),
  role: z.string().optional(),
  availability: z.coerce.number().min(0).max(100).optional(),
  onboardingDate: z.string().optional(),
  offloadingDate: z.string().optional(),
  clientEmpId: z.string().optional(),
  clientEmail: z.string().email({ message: "Invalid email address." }).optional().or(z.literal('')),
  capabilities: z.array(z.string()).optional(),
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
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  editingUser: User | null;
  setEditingUser: (user: User | null) => void;
  allUsers: User[];
  projectUsers: User[];
  project: Project | null;
  impactedSystems: ImpactedSystem[];
}) {
  const { addUserToProject, updateProjectUser } = useProject();
  const { toast } = useToast();
  const [userInputText, setUserInputText] = useState('');
  const [isCapabilitiesOpen, setCapabilitiesOpen] = useState(false);

  const form = useForm<z.infer<typeof resourceSchema>>({
    resolver: zodResolver(resourceSchema),
  });

  useEffect(() => {
    if (isOpen) {
      if (editingUser) {
        form.reset({
          employeeId: editingUser.id,
          role: editingUser.role,
          availability: editingUser.availability,
          onboardingDate: editingUser.onboardingDate ? format(new Date(editingUser.onboardingDate), 'yyyy-MM-dd') : '',
          offloadingDate: editingUser.offloadingDate ? format(new Date(editingUser.offloadingDate), 'yyyy-MM-dd') : '',
          clientEmpId: editingUser.clientEmpId || '',
          clientEmail: editingUser.clientEmail || '',
          capabilities: editingUser.capabilities || [],
        });
        const user = allUsers.find(u => u.id === editingUser.id);
        if (user) {
          setUserInputText(`${user.firstName} ${user.lastName} (${user.empId})`);
        }
      } else {
        form.reset({
          employeeId: '',
          role: undefined,
          availability: 100,
          onboardingDate: format(new Date(), 'yyyy-MM-dd'),
          offloadingDate: project?.endDate ? format(parseISO(project.endDate), 'yyyy-MM-dd') : '',
          clientEmpId: '',
          clientEmail: '',
          capabilities: [],
        });
        setUserInputText('');
      }
    }
  }, [isOpen, editingUser, form, project, allUsers]);

  const handleFormSubmit = async (values: z.infer<typeof resourceSchema>) => {
    if (editingUser) {
      const success = await updateProjectUser(editingUser.id, {
        role: values.role as UserRole,
        availability: values.availability,
        onboardingDate: values.onboardingDate ? new Date(values.onboardingDate).toISOString() : undefined,
        offloadingDate: values.offloadingDate ? new Date(values.offloadingDate).toISOString() : undefined,
        clientEmpId: values.clientEmpId,
        clientEmail: values.clientEmail,
        capabilities: values.capabilities,
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
  
  const availableUsers = allUsers.filter(emp => !emp.isDeleted && !projectUsers.some(pe => pe.id === emp.id));
  const availableUserOptions = availableUsers.map(emp => ({
      value: emp.id,
      label: `${emp.firstName} ${emp.lastName} (${emp.empId})`
  }));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if(!open) setEditingUser(null); }}>
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
                     <Input 
                        list="user-options"
                        placeholder="Search for a user..."
                        value={userInputText}
                        readOnly={!!editingUser}
                        onChange={(e) => {
                            if (editingUser) return;
                            const inputText = e.target.value;
                            setUserInputText(inputText);

                            const matchingOption = availableUserOptions.find(opt => opt.label === inputText);
                            field.onChange(matchingOption ? matchingOption.value : '');
                        }}
                        onBlur={(e) => {
                            if (editingUser) return;
                            const matchingOption = availableUserOptions.find(opt => opt.label === e.target.value);
                            if(!matchingOption) {
                                setUserInputText('');
                                field.onChange('');
                            }
                        }}
                     />
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
                  <FormLabel>Role</FormLabel>
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
                  <FormLabel>Availability (%)</FormLabel>
                  <FormControl><Input type="number" placeholder="100" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField
              control={form.control}
              name="capabilities"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Capabilities</FormLabel>
                   <Popover open={isCapabilitiesOpen} onOpenChange={setCapabilitiesOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value?.length && "text-muted-foreground"
                          )}
                        >
                          <span className="truncate">
                            {field.value && field.value.length > 0
                              ? `${field.value.length} selected`
                              : "Select capabilities"}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search system..." />
                        <CommandList>
                            <CommandEmpty>No system found.</CommandEmpty>
                            <CommandGroup>
                            {impactedSystems.map((system) => (
                                <CommandItem
                                key={system.id}
                                onSelect={() => {
                                    const selected = field.value || [];
                                    const isSelected = selected.includes(system.id);
                                    field.onChange(
                                    isSelected
                                        ? selected.filter((id) => id !== system.id)
                                        : [...selected, system.id]
                                    );
                                }}
                                >
                                <Check
                                    className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value?.includes(system.id)
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                />
                                {system.name}
                                </CommandItem>
                            ))}
                            </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField control={form.control} name="onboardingDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Onboarding Date</FormLabel>
                  <FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
               <FormField control={form.control} name="offloadingDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Offloading Date</FormLabel>
                  <FormControl><Input type="date" {...field} value={field.value || ''}/></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            
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
          if (!story.startDate || !story.endDate) return false;
          const taskStart = parseISO(story.startDate);
          const taskEnd = parseISO(story.endDate);
          return taskStart <= periodEnd && taskEnd >= periodStart;
        })
        .reduce((sum, task) => sum + (task.estimatedHours || 0), 0);
        
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

  }, [periodStart, periodEnd, stories, impactedSystems, employees, workingDaysInPeriod]);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Capacity Planning</CardTitle>
        <CardDescription>View resource capacity based on assigned sub-tasks for each impacted system.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4 mb-4">
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
        
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[25%]">Impacted System</TableHead>
                    <TableHead>Total Capacity (hrs)</TableHead>
                    <TableHead>Utilized (hrs)</TableHead>
                    <TableHead>Remaining (hrs)</TableHead>
                    <TableHead className="w-[25%]">Utilization</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {capacityData.map(data => (
                    <TableRow key={data.systemId}>
                        <TableCell className="font-medium">{data.systemName}</TableCell>
                        <TableCell>{data.totalCapacityHours}</TableCell>
                        <TableCell>{data.utilizedHours}</TableCell>
                        <TableCell>{data.remainingHours}</TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                <Progress value={data.utilization} className="w-full h-3" />
                                <span className="text-xs font-semibold">{data.utilization}%</span>
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
                <TableHead>Offloading Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.empId}</TableCell>
                  <TableCell>{user.firstName} {user.lastName}</TableCell>
                  <TableCell>{user.role || 'N/A'}</TableCell>
                   <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.capabilities && user.capabilities.length > 0 ? user.capabilities.map(capId => {
                        const system = impactedSystems.find(s => s.id === capId);
                        return system ? <Badge key={capId} variant="secondary">{system.name}</Badge> : null;
                      }) : 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>{user.availability ? `${user.availability}%` : 'N/A'}</TableCell>
                  <TableCell>{user.onboardingDate ? format(parseISO(user.onboardingDate), 'PPP') : 'N/A'}</TableCell>
                  <TableCell>{user.offloadingDate ? format(parseISO(user.offloadingDate), 'PPP') : 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(user)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeletingUser(user)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
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
                if(deletingUser) {
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

