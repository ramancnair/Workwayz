

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
import { type User, type LeavePeriod } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const leaveSchema = z.object({
  startDate: z.string().min(1, 'Start date is required.'),
  endDate: z.string().min(1, 'End date is required.'),
  type: z.enum(['Paid Leave', 'Loss of Pay'], { required_error: 'Leave type is required.' }),
}).refine(data => {
    if (!data.startDate || !data.endDate) return true;
    return new Date(data.endDate) >= new Date(data.startDate);
}, {
  message: 'End date cannot be before start date.',
  path: ['endDate'],
});

export default function LeaveTrackerPage() {
  const { employees: users, addLeavePeriod, deleteLeavePeriod, isLoading, holidays, weeklyOffDays } = useProject();
  const { toast } = useToast();
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deletingLeavePeriod, setDeletingLeavePeriod] = useState<LeavePeriod | null>(null);

  const form = useForm<z.infer<typeof leaveSchema>>({
    resolver: zodResolver(leaveSchema),
    defaultValues: {
      startDate: '',
      endDate: '',
      type: 'Paid Leave'
    }
  });

  useEffect(() => {
    if (users.length > 0 && !selectedUser) {
      setSelectedUser(users[0]);
    }
  }, [users, selectedUser]);

  // This effect ensures the selectedUser state is updated when the master list changes
  useEffect(() => {
    if (selectedUser) {
      const updatedUser = users.find(e => e.id === selectedUser.id);
      if (updatedUser) {
        setSelectedUser(updatedUser);
      }
    }
  }, [users, selectedUser]);


  const handleUserChange = (userId: string) => {
    const user = users.find(e => e.id === userId);
    setSelectedUser(user || null);
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
    if (!selectedUser) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a user.' });
      return;
    }
    
    const newLeavePeriod: Omit<LeavePeriod, 'id'> = {
      startDate: new Date(values.startDate).toISOString(),
      endDate: new Date(values.endDate).toISOString(),
      type: values.type,
    };

    const success = await addLeavePeriod(selectedUser.id, newLeavePeriod);
    if (success) {
      toast({ title: 'Success', description: 'Leave period added successfully.' });
      form.reset({ startDate: '', endDate: '', type: 'Paid Leave' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not add leave period.' });
    }
  };

  const handleDelete = async () => {
    if (!selectedUser || !deletingLeavePeriod) return;
    
    const success = await deleteLeavePeriod(selectedUser.id, deletingLeavePeriod.id);
    if (success) {
        toast({ title: 'Success', description: 'Leave period deleted.' });
    } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete leave period.' });
    }
    setDeletingLeavePeriod(null);
  }

  const sortedLeavePeriods = selectedUser?.leavePeriods
    ? [...selectedUser.leavePeriods].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    : [];

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="Leave Tracker" description="Manage user leave days." />

        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                <CardTitle>Select User</CardTitle>
                <CardDescription>Choose a user to manage their leave periods.</CardDescription>
                </CardHeader>
                <CardContent>
                <Select onValueChange={handleUserChange} value={selectedUser?.id}>
                    <SelectTrigger className="w-full md:w-[280px]">
                    <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                    {users.map(emp => (
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
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Leave Type</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Paid Leave">Paid Leave</SelectItem>
                                            <SelectItem value="Loss of Pay">Loss of Pay</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={!selectedUser || form.formState.isSubmitting}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Leave
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>

        {selectedUser && (
            <Card>
                <CardHeader>
                    <CardTitle>Logged Leave for {selectedUser.firstName}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Start Date</TableHead>
                                <TableHead>End Date</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Number of Days</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedLeavePeriods.length > 0 ? sortedLeavePeriods.map(period => (
                                <TableRow key={period.id}>
                                    <TableCell>{format(new Date(period.startDate), 'PPP')}</TableCell>
                                    <TableCell>{format(new Date(period.endDate), 'PPP')}</TableCell>
                                    <TableCell>
                                        <Badge variant={period.type === 'Loss of Pay' ? 'destructive' : 'secondary'}>
                                            {period.type || 'Paid Leave'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{calculateBusinessDays(period.startDate, period.endDate)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => setDeletingLeavePeriod(period)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                                        No leave periods logged for this user.
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
