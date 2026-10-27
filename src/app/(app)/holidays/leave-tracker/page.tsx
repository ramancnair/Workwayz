

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

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
import { type User, type LeavePeriod, type Holiday } from '@/types';
import { cn } from '@/lib/utils';
import { calculateEmployeeLeaveQuotaStats } from '@/lib/leave-utils';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/db-provider';
import { onSnapshot, doc, collection, query, where, updateDoc, arrayUnion, arrayRemove } from '@/lib/db-provider';
import { v4 as uuidv4 } from 'uuid';

const leaveSchema = z.object({
  duration: z.enum(['Full Day', 'Half Day']),
  startDate: z.string().min(1, 'Start date is required.'),
  endDate: z.string().optional(),
  halfDaySession: z.enum(['First Half', 'Second Half']).optional(),
  type: z.enum(['Paid Leave', 'Loss of Pay'], { required_error: 'Leave type is required.' }),
}).refine(data => {
  if (data.duration === 'Half Day') {
    return !!data.startDate;
  }
  if (!data.startDate || !data.endDate) return false;
  return new Date(data.endDate) >= new Date(data.startDate);
}, {
  message: 'End date cannot be before start date.',
  path: ['endDate'],
});

export default function LeaveTrackerPage() {
  const { toast } = useToast();

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [weeklyOffDays, setWeeklyOffDays] = useState<number[]>([0, 6]);

  const [deletingLeavePeriod, setDeletingLeavePeriod] = useState<LeavePeriod | null>(null);
  const [currentUser, setCurrentUser] = useState<{ email: string } | null>(null);

  const [leaveSettings, setLeaveSettings] = useState<{
    allocatedPaidLeavesPerYear: number;
    allowCarryOver: boolean;
    carryOverLimit: number;
  }>({
    allocatedPaidLeavesPerYear: 24,
    allowCarryOver: false,
    carryOverLimit: 10,
  });

  useEffect(() => {
    if (!db) return;
    
    // Fetch Settings
    const unsubSettings = onSnapshot(doc(db, 'settings', 'main'), (docSnap: any) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLeaveSettings({
          allocatedPaidLeavesPerYear: data.allocatedPaidLeavesPerYear ?? 24,
          allowCarryOver: data.allowCarryOver ?? false,
          carryOverLimit: data.carryOverLimit ?? 10,
        });
        setWeeklyOffDays(data.weeklyOffDays ?? [0, 6]);
      }
    }, (err: any) => {
      console.warn('[LeaveTracker] Settings listener error:', err);
    });

    // Fetch Employees
    const unsubEmployees = onSnapshot(collection(db, 'employees'), (snapshot: any) => {
      const emps = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }) as User);
      setAllUsers(emps);
    }, (err: any) => {
      console.warn('[LeaveTracker] Employees listener error:', err);
    });

    // Fetch Holidays
    const unsubHolidays = onSnapshot(collection(db, 'holidays'), (snapshot: any) => {
      const hols = snapshot.docs.map((d: any) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
        } as Holiday;
      });
      setHolidays(hols);
    }, (err: any) => {
      console.warn('[LeaveTracker] Holidays listener error:', err);
    });

    return () => {
      unsubSettings();
      unsubEmployees();
      unsubHolidays();
    };
  }, []);

  const addLeavePeriod = async (employeeId: string, leavePeriod: Omit<LeavePeriod, 'id'>): Promise<boolean> => {
    if (!db) return false;
    try {
      const user = allUsers.find(u => u.id === employeeId);
      const existingLeaves = user?.leavePeriods || [];
      const newStartStr = new Date(leavePeriod.startDate).toISOString().slice(0, 10);
      const newEndStr = new Date(leavePeriod.endDate).toISOString().slice(0, 10);
      const newIsHalfDay = !!leavePeriod.isHalfDay;
      const newSession = leavePeriod.halfDaySession;

      const hasOverlap = existingLeaves.some(p => {
        if (!p.startDate || !p.endDate) return false;
        const pStartStr = new Date(p.startDate).toISOString().slice(0, 10);
        const pEndStr = new Date(p.endDate).toISOString().slice(0, 10);
        const dateOverlap = !(newEndStr < pStartStr || newStartStr > pEndStr);
        if (!dateOverlap) return false;

        const pIsHalfDay = !!p.isHalfDay;
        const pSession = p.halfDaySession;

        if (newIsHalfDay && pIsHalfDay) {
          if (newStartStr === pStartStr) {
            if (!newSession || !pSession || newSession === pSession) {
              return true;
            }
            return false;
          }
          return true;
        }

        return true;
      });

      if (hasOverlap) {
        console.error("Firebase Error: Leave period overlaps with an existing leave period.");
        return false;
      }

      const newLeavePeriod: LeavePeriod = {
        ...leavePeriod,
        id: uuidv4(),
        startDate: new Date(leavePeriod.startDate).toISOString(),
        endDate: new Date(leavePeriod.endDate).toISOString(),
        isHalfDay: !!leavePeriod.isHalfDay,
        ...(leavePeriod.halfDaySession ? { halfDaySession: leavePeriod.halfDaySession } : {}),
      };
      
      const globalEmployeeRef = doc(db, 'employees', employeeId);
      await updateDoc(globalEmployeeRef, {
        leavePeriods: arrayUnion(newLeavePeriod)
      });
      return true;
    } catch (e) {
      console.error("Firebase Error: Failed to add leave period globally.", e);
      return false;
    }
  };

  const deleteLeavePeriod = async (employeeId: string, leavePeriodId: string): Promise<boolean> => {
    if (!db) return false;
    const globalUser = allUsers.find(u => u.id === employeeId);
    if (!globalUser || !globalUser.leavePeriods) return false;

    const leavePeriodToDelete = globalUser.leavePeriods.find(p => p.id === leavePeriodId);
    if (!leavePeriodToDelete) return false;
    
    try {
      const globalEmployeeRef = doc(db, 'employees', employeeId);
      await updateDoc(globalEmployeeRef, {
        leavePeriods: arrayRemove(leavePeriodToDelete)
      });
      return true;
    } catch (e) {
      console.error("Firebase Error: Failed to delete leave period globally.", e);
      return false;
    }
  };

  const calculateBusinessDaysForYear = useMemo(() => {
    return (period: LeavePeriod, year: number): number => {
      try {
        if (!period.startDate || !period.endDate) return 0;
        const start = new Date(period.startDate);
        const end = new Date(period.endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
          return 0;
        }

        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31, 23, 59, 59);

        if (end < yearStart || start > yearEnd) {
          return 0;
        }

        const overlapStart = new Date(Math.max(start.getTime(), yearStart.getTime()));
        const overlapEnd = new Date(Math.min(end.getTime(), yearEnd.getTime()));

        const holidayDates = holidays.map(h => new Date(h.date));
        const interval = eachDayOfInterval({ start: overlapStart, end: overlapEnd });

        const businessDays = interval.filter(day => {
          const dayOfWeek = day.getDay();
          const isWeekend = weeklyOffDays.includes(dayOfWeek);
          const isHoliday = holidayDates.some(holiday => isSameDay(day, holiday));
          return !isWeekend && !isHoliday;
        });

        if (period.isHalfDay) {
          return businessDays.length > 0 ? 0.5 : 0;
        }

        return businessDays.length;
      } catch (e) {
        console.error("Error calculating business days", e);
        return 0;
      }
    };
  }, [holidays, weeklyOffDays]);

  const form = useForm<z.infer<typeof leaveSchema>>({
    resolver: zodResolver(leaveSchema),
    defaultValues: {
      duration: 'Full Day',
      startDate: '',
      endDate: '',
      halfDaySession: 'First Half',
      type: 'Paid Leave'
    }
  });

  const durationValue = form.watch('duration');

  useEffect(() => {
    const userStr = localStorage.getItem('projectflow_user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {
        console.error("Failed to parse user session", e);
      }
    }
  }, []);

  // Derived active user strictly from logged-in session (checks allUsers)
  const activeUser = useMemo(() => {
    if (allUsers.length > 0 && currentUser?.email) {
      const loggedInEmployee = allUsers.find(emp => emp.email?.toLowerCase() === currentUser.email.toLowerCase());
      if (loggedInEmployee) {
        return loggedInEmployee;
      }
    }
    return null;
  }, [allUsers, currentUser]);

  const calculateBusinessDays = (period: LeavePeriod): number => {
    try {
      if (!period.startDate || !period.endDate) return 0;
      const start = new Date(period.startDate);
      const end = new Date(period.endDate);

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

      if (period.isHalfDay) {
        return businessDays.length > 0 ? 0.5 : 0;
      }

      return businessDays.length;
    } catch (e) {
      console.error("Error calculating business days", e);
      return 0;
    }
  };

  // Helper function to calculate stats for a specific year (Policy A: Monthly Pro-Rata with 15th-of-month cutoff)
  const getLeaveQuotaStatsForYear = useCallback((user: User, year: number) => {
    return calculateEmployeeLeaveQuotaStats(user, year, leaveSettings, calculateBusinessDaysForYear);
  }, [leaveSettings, calculateBusinessDaysForYear]);

  // Current year quota stats for UI
  const leaveQuotaStats = useMemo(() => {
    if (!activeUser) return null;
    return getLeaveQuotaStatsForYear(activeUser as any, new Date().getFullYear());
  }, [activeUser, getLeaveQuotaStatsForYear]);

  const onSubmit = async (values: z.infer<typeof leaveSchema>) => {
    if (!activeUser) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a user.' });
      return;
    }

    const isHalfDay = values.duration === 'Half Day';
    const start = new Date(values.startDate);
    const end = isHalfDay ? new Date(values.startDate) : new Date(values.endDate || values.startDate);
    const year = start.getFullYear();

    const holidayDates = holidays.map(h => new Date(h.date));
    const interval = eachDayOfInterval({ start, end });

    const businessDays = interval.filter(day => {
      const dayOfWeek = day.getDay();
      const isWeekend = weeklyOffDays.includes(dayOfWeek);
      const isHoliday = holidayDates.some(holiday => isSameDay(day, holiday));
      return !isWeekend && !isHoliday;
    });

    if (businessDays.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: isHalfDay ? 'Selected date is a holiday or weekly off day.' : 'No business days in the selected leave period.' });
      return;
    }

    // Check for duplicate / overlapping leaves with activeUser's existing leave periods
    const existingLeavePeriods = activeUser.leavePeriods || [];
    const newSession = isHalfDay ? (values.halfDaySession || 'First Half') : undefined;

    if (isHalfDay) {
      const bDayStr = format(start, 'yyyy-MM-dd');
      const hasConflict = existingLeavePeriods.some(period => {
        if (!period.startDate || !period.endDate) return false;
        const pStart = new Date(period.startDate);
        const pEnd = new Date(period.endDate);
        const pStartStr = format(pStart, 'yyyy-MM-dd');
        const pEndStr = format(pEnd, 'yyyy-MM-dd');

        if (bDayStr >= pStartStr && bDayStr <= pEndStr) {
          if (period.isHalfDay) {
            // Conflict if same half-day session or unspecified session
            if (!period.halfDaySession || !newSession || period.halfDaySession === newSession) {
              return true;
            }
            return false;
          }
          // Existing is full day
          return true;
        }
        return false;
      });

      if (hasConflict) {
        toast({
          variant: 'destructive',
          title: 'Duplicate Leave Entry',
          description: `Leave is already applied for ${format(start, 'MMM d, yyyy')}${newSession ? ` (${newSession})` : ''}. Please select a different session or date.`,
        });
        return;
      }

      if (values.type === 'Paid Leave') {
        const stats = getLeaveQuotaStatsForYear(activeUser as any, year);
        const remainingPaid = stats.remainingPaid;

        if (remainingPaid < 0.5) {
          // Convert to Loss of Pay
          const newLeavePeriod: Omit<LeavePeriod, 'id'> = {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            type: 'Loss of Pay',
            isHalfDay: true,
            halfDaySession: newSession,
          };
          const success = await addLeavePeriod(activeUser.id, newLeavePeriod);
          if (success) {
            toast({
              title: 'Converted to Loss of Pay',
              description: 'This half-day leave was automatically converted to Loss of Pay (LOP) because you have 0 remaining paid leaves.'
            });
            form.reset({ duration: 'Full Day', startDate: '', endDate: '', halfDaySession: 'First Half', type: 'Paid Leave' });
          } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not apply leave.' });
          }
        } else {
          const newLeavePeriod: Omit<LeavePeriod, 'id'> = {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            type: 'Paid Leave',
            isHalfDay: true,
            halfDaySession: newSession,
          };
          const success = await addLeavePeriod(activeUser.id, newLeavePeriod);
          if (success) {
            toast({ title: 'Success', description: `Half-day Paid Leave (${newSession}) applied successfully.` });
            form.reset({ duration: 'Full Day', startDate: '', endDate: '', halfDaySession: 'First Half', type: 'Paid Leave' });
          } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not apply leave.' });
          }
        }
      } else {
        const newLeavePeriod: Omit<LeavePeriod, 'id'> = {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          type: 'Loss of Pay',
          isHalfDay: true,
          halfDaySession: newSession,
        };
        const success = await addLeavePeriod(activeUser.id, newLeavePeriod);
        if (success) {
          toast({ title: 'Success', description: `Half-day Loss of Pay (${newSession}) applied successfully.` });
          form.reset({ duration: 'Full Day', startDate: '', endDate: '', halfDaySession: 'First Half', type: 'Paid Leave' });
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Could not apply leave.' });
        }
      }
      return;
    }

    // Full day flow
    const conflictingDates: Date[] = [];

    businessDays.forEach(bDay => {
      const bDayStr = format(bDay, 'yyyy-MM-dd');
      const isAlreadyOnLeave = existingLeavePeriods.some(period => {
        if (!period.startDate || !period.endDate) return false;
        const pStart = new Date(period.startDate);
        const pEnd = new Date(period.endDate);
        const pStartStr = format(pStart, 'yyyy-MM-dd');
        const pEndStr = format(pEnd, 'yyyy-MM-dd');
        return bDayStr >= pStartStr && bDayStr <= pEndStr;
      });

      if (isAlreadyOnLeave) {
        conflictingDates.push(bDay);
      }
    });

    if (conflictingDates.length > 0) {
      const formattedConflicts = conflictingDates
        .slice(0, 3)
        .map(d => format(d, 'MMM d, yyyy'))
        .join(', ');
      const moreCount = conflictingDates.length > 3 ? ` and ${conflictingDates.length - 3} other day(s)` : '';
      toast({
        variant: 'destructive',
        title: 'Duplicate Leave Entry',
        description: `Leave is already applied for: ${formattedConflicts}${moreCount}. Please select dates that do not overlap with existing leaves.`,
      });
      return;
    }

    if (values.type === 'Paid Leave') {
      const stats = getLeaveQuotaStatsForYear(activeUser as any, year);
      const remainingPaid = stats.remainingPaid;

      if (remainingPaid <= 0) {
        // Automatically convert the entire leave to Loss of Pay
        const newLeavePeriod: Omit<LeavePeriod, 'id'> = {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          type: 'Loss of Pay',
          isHalfDay: false,
        };
        const success = await addLeavePeriod(activeUser.id, newLeavePeriod);
        if (success) {
          toast({
            title: 'Converted to Loss of Pay',
            description: 'This leave was automatically converted to Loss of Pay (LOP) because you have 0 remaining paid leaves.'
          });
          form.reset({ duration: 'Full Day', startDate: '', endDate: '', halfDaySession: 'First Half', type: 'Paid Leave' });
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Could not apply leave.' });
        }
      } else if (remainingPaid < businessDays.length) {
        // Split leave period!
        if (remainingPaid % 1 !== 0) {
          // Fractional remaining (e.g. 1.5 days)
          const wholePaidDays = Math.floor(remainingPaid);
          const hasHalfDay = remainingPaid - wholePaidDays >= 0.5;

          if (wholePaidDays > 0) {
            const paidEndDate = businessDays[wholePaidDays - 1];
            await addLeavePeriod(activeUser.id, {
              startDate: start.toISOString(),
              endDate: paidEndDate.toISOString(),
              type: 'Paid Leave',
              isHalfDay: false,
            });
          }

          if (hasHalfDay) {
            const halfDayDate = businessDays[wholePaidDays];
            await addLeavePeriod(activeUser.id, {
              startDate: halfDayDate.toISOString(),
              endDate: halfDayDate.toISOString(),
              type: 'Paid Leave',
              isHalfDay: true,
              halfDaySession: 'First Half',
            });
            await addLeavePeriod(activeUser.id, {
              startDate: halfDayDate.toISOString(),
              endDate: halfDayDate.toISOString(),
              type: 'Loss of Pay',
              isHalfDay: true,
              halfDaySession: 'Second Half',
            });
          }

          const lopStartIndex = wholePaidDays + (hasHalfDay ? 1 : 0);
          if (lopStartIndex < businessDays.length) {
            const lopStartDate = businessDays[lopStartIndex];
            await addLeavePeriod(activeUser.id, {
              startDate: lopStartDate.toISOString(),
              endDate: end.toISOString(),
              type: 'Loss of Pay',
              isHalfDay: false,
            });
          }

          toast({
            title: 'Applied Split Leave',
            description: `Applied ${remainingPaid} days of Paid Leave. The remaining days were automatically converted to Loss of Pay (LOP).`
          });
          form.reset({ duration: 'Full Day', startDate: '', endDate: '', halfDaySession: 'First Half', type: 'Paid Leave' });
        } else {
          const paidCount = remainingPaid;
          const paidEndDate = businessDays[paidCount - 1];
          const lopStartDate = businessDays[paidCount];

          const paidPeriod: Omit<LeavePeriod, 'id'> = {
            startDate: start.toISOString(),
            endDate: paidEndDate.toISOString(),
            type: 'Paid Leave',
            isHalfDay: false,
          };

          const lopPeriod: Omit<LeavePeriod, 'id'> = {
            startDate: lopStartDate.toISOString(),
            endDate: end.toISOString(),
            type: 'Loss of Pay',
            isHalfDay: false,
          };

          // Write both segments
          const successPaid = await addLeavePeriod(activeUser.id, paidPeriod);
          const successLop = await addLeavePeriod(activeUser.id, lopPeriod);

          if (successPaid && successLop) {
            toast({
              title: 'Applied Split Leave',
              description: `Applied ${paidCount} days of Paid Leave. The remaining ${businessDays.length - paidCount} days were automatically converted to Loss of Pay (LOP).`
            });
            form.reset({ duration: 'Full Day', startDate: '', endDate: '', halfDaySession: 'First Half', type: 'Paid Leave' });
          } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not apply split leaves.' });
          }
        }
      } else {
        // Normal add
        const newLeavePeriod: Omit<LeavePeriod, 'id'> = {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          type: 'Paid Leave',
          isHalfDay: false,
        };
        const success = await addLeavePeriod(activeUser.id, newLeavePeriod);
        if (success) {
          toast({ title: 'Success', description: 'Paid Leave applied successfully.' });
          form.reset({ duration: 'Full Day', startDate: '', endDate: '', halfDaySession: 'First Half', type: 'Paid Leave' });
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Could not apply leave.' });
        }
      }
    } else {
      // Normal Loss of Pay add
      const newLeavePeriod: Omit<LeavePeriod, 'id'> = {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        type: 'Loss of Pay',
        isHalfDay: false,
      };
      const success = await addLeavePeriod(activeUser.id, newLeavePeriod);
      if (success) {
        toast({ title: 'Success', description: 'Loss of Pay applied successfully.' });
        form.reset({ duration: 'Full Day', startDate: '', endDate: '', halfDaySession: 'First Half', type: 'Paid Leave' });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not apply leave.' });
      }
    }
  };

  const handleDelete = async () => {
    if (!activeUser || !deletingLeavePeriod) return;

    const success = await deleteLeavePeriod(activeUser.id, deletingLeavePeriod.id);
    if (success) {
      toast({ title: 'Success', description: 'Leave period deleted.' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete leave period.' });
    }
    setDeletingLeavePeriod(null);
  }

  const sortedLeavePeriods = activeUser?.leavePeriods
    ? [...activeUser.leavePeriods].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    : [];

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="Leave Tracker" description="Manage your leave days." />

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="overflow-hidden border-border/40 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent pb-6">
              {activeUser ? (
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary border border-primary/20 shadow-inner">
                    {activeUser.firstName[0]}{activeUser.lastName[0]}
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold tracking-tight">
                      {activeUser.firstName} {activeUser.lastName}
                    </CardTitle>
                    <CardDescription className="text-xs font-medium text-muted-foreground mt-0.5">
                      {activeUser.email} • Logged-in Employee
                    </CardDescription>
                  </div>
                </div>
              ) : (
                <CardTitle>Active User Profile</CardTitle>
              )}
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {activeUser ? (
                <>
                  {leaveQuotaStats && (
                    <>
                      {/* Premium Global Leave Ledger */}
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center justify-between">
                          <span>Global Leave Pool Ledger ({leaveQuotaStats.activeYear})</span>
                          <Badge variant="outline" className="font-semibold text-[10px] border-primary/20 text-primary bg-primary/5">
                            Standard Base: {leaveSettings.allocatedPaidLeavesPerYear} Days
                          </Badge>
                        </h4>

                        <div className="grid grid-cols-3 gap-2 text-center bg-muted/30 rounded-xl p-3 border border-border/50">
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase">Base Quota</p>
                            <p className="text-lg font-bold text-foreground mt-0.5">{leaveQuotaStats.allocated}d</p>
                          </div>
                          <div className="border-x border-border/80">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase">Carry Forward</p>
                            <p className="text-lg font-bold text-emerald-600 mt-0.5">+{leaveQuotaStats.carriedOver}d</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase">Total Available</p>
                            <p className="text-lg font-bold text-primary mt-0.5">{leaveQuotaStats.totalAvailable}d</p>
                          </div>
                        </div>
                      </div>

                      {/* Main Balance Display */}
                      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground shadow-md border border-primary/10">
                        <div className="absolute -right-6 -bottom-6 opacity-10">
                          <PlusCircle className="h-32 w-32" />
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/80">
                          Remaining Paid Balance
                        </p>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-4xl font-extrabold tracking-tight">
                            {leaveQuotaStats.remainingPaid}
                          </span>
                          <span className="text-sm font-medium text-primary-foreground/70">/ {leaveQuotaStats.totalAvailable} days</span>
                        </div>
                        <div className="mt-4 h-1.5 w-full rounded-full bg-primary-foreground/20">
                          <div
                            className="h-1.5 rounded-full bg-primary-foreground transition-all duration-500"
                            style={{ width: `${Math.min(100, (leaveQuotaStats.remainingPaid / leaveQuotaStats.totalAvailable) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Summary Counters */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-muted/40 hover:bg-muted/60 transition-colors rounded-xl p-4 border border-border/40">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Paid Leave Taken</p>
                          <p className="text-3xl font-extrabold text-foreground mt-2">
                            {leaveQuotaStats.activeYearPaidTaken}<span className="text-sm font-semibold text-muted-foreground ml-0.5">d</span>
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">Globally logged in {leaveQuotaStats.activeYear}</p>
                        </div>
                        <div className="bg-destructive/5 hover:bg-destructive/10 transition-colors rounded-xl p-4 border border-destructive/10">
                          <p className="text-xs font-bold text-destructive/80 uppercase tracking-wider">Loss of Pay (LOP)</p>
                          <p className="text-3xl font-extrabold text-destructive mt-2">
                            {leaveQuotaStats.activeYearLopTaken}<span className="text-sm font-semibold text-muted-foreground ml-0.5">d</span>
                          </p>
                          <p className="text-[10px] text-destructive/70 mt-1">Globally logged in {leaveQuotaStats.activeYear}</p>
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Loading active employee profile...</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add New Leave Period</CardTitle>
              <CardDescription>Select leave duration, dates, and session.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Duration Selector */}
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Full Day">Full Day</SelectItem>
                            <SelectItem value="Half Day">Half Day</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {durationValue === 'Half Day' ? (
                    <div className="flex items-start gap-4">
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Leave Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="halfDaySession"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>Session</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || 'First Half'}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select session" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="First Half">First Half (Morning)</SelectItem>
                                <SelectItem value="Second Half">Second Half (Afternoon)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ) : (
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
                  )}

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
                  <Button type="submit" disabled={!activeUser || form.formState.isSubmitting}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Leave
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {activeUser && (
          <Card>
            <CardHeader>
              <CardTitle>Logged Leave for {activeUser.firstName}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent cursor-default select-none">
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Number of Days</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLeavePeriods.length > 0 ? sortedLeavePeriods.map(period => (
                    <TableRow key={period.id} className="hover:bg-transparent cursor-default select-none">
                      <TableCell>{format(new Date(period.startDate), 'PPP')}</TableCell>
                      <TableCell>{period.isHalfDay ? '-' : format(new Date(period.endDate), 'PPP')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant={period.type === 'Loss of Pay' ? 'destructive' : 'secondary'}>
                            {period.type || 'Paid Leave'}
                          </Badge>
                          {period.isHalfDay && (
                            <Badge variant="outline" className="text-[10px] font-semibold border-amber-500/40 text-amber-500 bg-amber-500/10">
                              {period.halfDaySession || 'Half Day'}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">{calculateBusinessDays(period)}</span>
                        <span className="text-muted-foreground text-xs ml-0.5">d</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setDeletingLeavePeriod(period)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow className="hover:bg-transparent cursor-default select-none">
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No leave periods logged for you.
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
              This action cannot be undone. This will permanently delete your leave period globally.
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
