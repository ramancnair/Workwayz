
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
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
import { useToast } from '@/hooks/use-toast';
import { format, isSameDay, eachDayOfInterval } from 'date-fns';
import { PlusCircle, Trash2 } from 'lucide-react';
import { type Employee, type LeavePeriod } from '@/types';
import { cn } from '@/lib/utils';

const leaveSchema = z.object({
  startDate: z.string().min(1, 'Start date is required.'),
  endDate: z.string().min(1, 'End date is required.'),
}).refine(data => {
    if (!data.startDate || !data.endDate) return true;
    return new Date(data.endDate) >= new Date(data.startDate);
}, {
  message: 'End date cannot be before start date.',
  path: ['endDate'],
});

export default function LeaveTrackerPage() {
  const { employees, addLeavePeriod, deleteLeavePeriod, isLoading, holidays, weeklyOffDays } = useProject();
  const { toast } = useToast();
  
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [deletingLeavePeriod, setDeletingLeavePeriod] = useState<LeavePeriod | null>(null);

  const form = useForm<z.infer<typeof leaveSchema>>({
    resolver: zodResolver(leaveSchema),
    defaultValues: {
      startDate: '',
      endDate: ''
    }
  });

  useEffect(() => {
    if (employees.length > 0 && !selectedEmployee) {
      setSelectedEmployee(employees[0]);
    }
  }, [employees, selectedEmployee]);

  const handleEmployeeChange = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    setSelectedEmployee(employee || null);
    form.reset();
  };

  const calculateBusinessDays = (startDateStr: string, endDateStr: string): number => {
    try {
        const start = new Date(startDateStr);
        const end = new Date(endDateStr);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
            return 0;
        }

        const holidayDates = holidays.map(h => new Date(h.date));

        const interval = eachDayOfInterval({ start, end });
        
        const businessDays = interval.filter(day => {
            const dayOfWeek = day.getDay();
            const isWeekend = weeklyOffDays.includes(dayOfWeek);
            const isHoliday = holidayDates.some(holiday => isSameDay(day, holiday));
            return !isWeekend && !isHoliday;
        });

        return businessDays.length;
    } catch(e) {
        console.error("Error calculating business days", e);
        return 0;
    }
  };

  const onSubmit = async (values: z.infer<typeof leaveSchema>) => {
    if (!selectedEmployee) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select an employee.' });
      return;
    }

    const holidayDates = holidays.map(h => new Date(h.date));

    const checkIsNonWorkingDay = (date: Date): string | null => {
        if (weeklyOffDays.includes(date.getDay())) {
            return "a weekend";
        }
        const holiday = holidays.find(h => isSameDay(new Date(h.date), date));
        if (holiday) {
            return `a holiday (${holiday.description})`;
        }
        return null;
    }
    
    // add a day to make the date correct from a UI perspective
    const startDate = new Date(values.startDate);
    startDate.setDate(startDate.getDate() + 1);
    const endDate = new Date(values.endDate);
    endDate.setDate(endDate.getDate() + 1);

    const startDayReason = checkIsNonWorkingDay(startDate);
    if(startDayReason) {
        toast({
            variant: "destructive",
            title: "Invalid Start Date",
            description: `The selected start date (${format(startDate, "PPP")}) is ${startDayReason}. Please select a working day.`
        });
        return;
    }
    
    const endDayReason = checkIsNonWorkingDay(endDate);
    if(endDayReason) {
        toast({
            variant: "destructive",
            title: "Invalid End Date",
            description: `The selected end date (${format(endDate, "PPP")}) is ${endDayReason}. Please select a working day.`
        });
        return;
    }

    const newLeavePeriod: Omit<LeavePeriod, 'id'> = {
      startDate: new Date(values.startDate).toISOString(),
      endDate: new Date(values.endDate).toISOString(),
    };

    const success = await addLeavePeriod(selectedEmployee.id, newLeavePeriod);
    if (success) {
      toast({ title: 'Success', description: 'Leave period added successfully.' });
      form.reset({ startDate: '', endDate: '' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not add leave period.' });
    }
  };

  const handleDelete = async () => {
    if (!selectedEmployee || !deletingLeavePeriod) return;
    
    const success = await deleteLeavePeriod(selectedEmployee.id, deletingLeavePeriod.id);
    if (success) {
        toast({ title: 'Success', description: 'Leave period deleted.' });
    } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete leave period.' });
    }
    setDeletingLeavePeriod(null);
  }

  const sortedLeavePeriods = selectedEmployee?.leavePeriods
    ? [...selectedEmployee.leavePeriods].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    : [];

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="Leave Tracker" description="Manage employee leave days." />

        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                <CardTitle>Select Employee</CardTitle>
                <CardDescription>Choose an employee to manage their leave periods.</CardDescription>
                </CardHeader>
                <CardContent>
                <Select onValueChange={handleEmployeeChange} value={selectedEmployee?.id}>
                    <SelectTrigger className="w-full md:w-[280px]">
                    <SelectValue placeholder="Select an employee" />
                    </SelectTrigger>
                    <SelectContent>
                    {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Add New Leave Period</CardTitle>
                    <CardDescription>Select a start and end date for the leave.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="flex items-start gap-4">
                                <FormField
                                    control={form.control}
                                    name="startDate"
                                    render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel>Start Date</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="endDate"
                                    render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormLabel>End Date</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            </div>
                            <Button type="submit" disabled={!selectedEmployee || form.formState.isSubmitting}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Leave
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>

        {selectedEmployee && (
            <Card>
                <CardHeader>
                    <CardTitle>Logged Leave for {selectedEmployee.firstName}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Start Date</TableHead>
                                <TableHead>End Date</TableHead>
                                <TableHead>Number of Days</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedLeavePeriods.length > 0 ? sortedLeavePeriods.map(period => (
                                <TableRow key={period.id}>
                                    <TableCell>{format(new Date(period.startDate), 'PPP')}</TableCell>
                                    <TableCell>{format(new Date(period.endDate), 'PPP')}</TableCell>
                                    <TableCell>{calculateBusinessDays(period.startDate, period.endDate)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => setDeletingLeavePeriod(period)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                                        No leave periods logged for this employee.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        )}
      </div>
      <AlertDialog open={!!deletingLeavePeriod} onOpenChange={(isOpen) => !isOpen && setDeletingLeavePeriod(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the leave period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className={cn(buttonVariants({ variant: 'destructive' }))}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
