'use client';

import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Holiday, ProjectSettings, User } from '@/types';
import { eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { db } from '@/lib/db-provider';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  query,
  where,
} from '@/lib/db-provider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Search } from 'lucide-react';
import { getUserInitials } from '@/lib/utils';
import { calculateEmployeeLeaveQuotaStats } from '@/lib/leave-utils';

const defaultSettings = {
  weeklyOffDays: [0, 6],
};

export default function AllocatedLeavesPage() {
  const { toast } = useToast();
  
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [weeklyOffDays, setWeeklyOffDays] = useState<number[]>(defaultSettings.weeklyOffDays);
  const [employees, setEmployees] = useState<User[]>([]);
  
  // Quota configuration states
  const [allocatedPaidLeaves, setAllocatedPaidLeaves] = useState(24);
  const [allowCarryOver, setAllowCarryOver] = useState(false);
  const [carryOverLimit, setCarryOverLimit] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!db) return;
    
    // Listener for holidays
    const unsubHolidays = onSnapshot(collection(db, 'holidays'), (snapshot: any) => {
        const holidaysData = snapshot.docs.map((doc: any) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                date: data.date?.toDate ? data.date.toDate().toISOString() : data.date,
            } as Holiday
        });
        setHolidays(holidaysData);
    }, (err: any) => {
        console.warn('[LeaveSettings] Holidays listener error:', err);
    });
    
    // Listener for settings
    const settingsDocRef = doc(db, 'settings', 'main');
    const unsubSettings = onSnapshot(settingsDocRef, (docSnap: any) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as ProjectSettings;
        setWeeklyOffDays(data.weeklyOffDays || defaultSettings.weeklyOffDays);
        setAllocatedPaidLeaves(data.allocatedPaidLeavesPerYear ?? 24);
        setAllowCarryOver(data.allowCarryOver ?? false);
        setCarryOverLimit(data.carryOverLimit ?? 10);
      } else {
        // Initialize settings if they don't exist
        setDoc(settingsDocRef, {
          ...defaultSettings,
          allocatedPaidLeavesPerYear: 24,
          allowCarryOver: false,
          carryOverLimit: 10,
        }).catch((e: any) => console.error("Failed to set default settings", e));
      }
    }, (err: any) => {
      console.warn('[LeaveSettings] Settings listener error:', err);
    });

    // Listener for global employees list
    const unsubEmployees = onSnapshot(
      query(collection(db, 'employees'), where('isDeleted', '!=', true)),
      (snapshot: any) => {
        const employeesData = snapshot.docs.map((docSnap: any) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            leavePeriods: data.leavePeriods || [],
          } as User;
        });
        setEmployees(employeesData);
      },
      (err: any) => {
        console.warn('[LeaveSettings] Employees listener error:', err);
      }
    );

    return () => {
        unsubHolidays();
        unsubSettings();
        unsubEmployees();
    };
  }, []);

  // Helper to calculate business days clamped to a specific year
  const calculateBusinessDaysForYear = useMemo(() => {
    return (period: { startDate?: string; endDate?: string; isHalfDay?: boolean }, year: number): number => {
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

        const holidayDates = holidays.map(h => parseISO(h.date));
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
      } catch(e) {
        console.error("Error calculating business days", e);
        return 0;
      }
    };
  }, [holidays, weeklyOffDays]);

  const currentYear = new Date().getFullYear();

  // Reactively calculate resource balances ledger (Policy A: Monthly Pro-Rata with 15th-of-month cutoff)
  const resourcesLedger = useMemo(() => {
    return employees.map(emp => {
      const stats = calculateEmployeeLeaveQuotaStats(
        emp,
        currentYear,
        {
          allocatedPaidLeavesPerYear: allocatedPaidLeaves,
          allowCarryOver,
          carryOverLimit,
        },
        calculateBusinessDaysForYear
      );

      return {
        ...emp,
        carriedOver: stats.carriedOver,
        allocated: stats.allocated,
        totalAvailable: stats.totalAvailable,
        taken: stats.activeYearPaidTaken,
        remaining: stats.remainingPaid,
      };
    });
  }, [employees, allocatedPaidLeaves, allowCarryOver, carryOverLimit, calculateBusinessDaysForYear, currentYear]);

  // Filter resources ledger
  const filteredLedger = useMemo(() => {
    const queryStr = searchQuery.toLowerCase().trim();
    if (!queryStr) return resourcesLedger;
    return resourcesLedger.filter(res => 
      `${res.firstName} ${res.lastName}`.toLowerCase().includes(queryStr) ||
      res.empId.toLowerCase().includes(queryStr)
    );
  }, [resourcesLedger, searchQuery]);

  const handleSaveLeaveSettings = async () => {
    if (!db) return;
    try {
      await setDoc(doc(db, 'settings', 'main'), {
        allocatedPaidLeavesPerYear: allocatedPaidLeaves,
        allowCarryOver: allowCarryOver,
        carryOverLimit: carryOverLimit,
      }, { merge: true });
      toast({ title: 'Success', description: 'Leave allocation settings saved successfully.' });
    } catch(e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update leave allocation settings.' });
      console.error("Error updating leave settings:", e);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader 
        title="Leave Settings" 
        description="Manage global paid leave allocation quotas, carry-overs, and active resource balances."
        titleAddon={
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Leave allocation and carry-forward policy information"
                  className="inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                >
                  <Info className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" align="start" className="max-w-sm p-3 text-xs leading-relaxed space-y-1.5">
                <p className="font-semibold text-foreground">Leave Allocation &amp; Carry-Forward Logic (Policy A)</p>
                <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                  <li>
                    <span className="font-medium text-foreground">Joining Year Pro-Rata:</span> Annual quota is pro-rated by eligible months worked (rounded to the nearest 0.5 day).
                  </li>
                  <li>
                    <span className="font-medium text-foreground">15th-of-Month Cutoff:</span> Joining on or before the 15th counts that month as 1 full month; joining after the 15th counts only remaining full months.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Carry Forward:</span> Unused balance from the previous year&apos;s pro-rated quota carries over on Jan 1, capped at the Carry-Forward Days Limit.
                  </li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        }
      />

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Global Leave Quota Settings</CardTitle>
            <CardDescription>
              Configure annual paid leave allowances and carry-forward parameters.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="annual-paid-leaves">Annual Paid Leaves Quota</Label>
              <Input
                id="annual-paid-leaves"
                type="number"
                value={allocatedPaidLeaves}
                onChange={(e) => setAllocatedPaidLeaves(Number(e.target.value))}
                className="bg-background"
                placeholder="Default 24"
              />
            </div>

            <div className="flex items-center space-x-2 rounded-md border p-4">
              <Switch
                id="allow-carry-over"
                checked={allowCarryOver}
                onCheckedChange={(checked) => setAllowCarryOver(checked)}
              />
              <div className="space-y-1 leading-none">
                <Label htmlFor="allow-carry-over">Allow Carry-Forward Leaves</Label>
                <p className="text-xs text-muted-foreground">
                  Enable carrying forward remaining paid leaves to next year.
                </p>
              </div>
            </div>

            {allowCarryOver && (
              <div className="space-y-2 pt-2">
                <Label htmlFor="carry-over-limit">Carry-Forward Days Limit</Label>
                <Input
                  id="carry-over-limit"
                  type="number"
                  value={carryOverLimit}
                  onChange={(e) => setCarryOverLimit(Number(e.target.value))}
                  className="bg-background"
                  placeholder="Limit of days e.g., 10"
                />
              </div>
            )}

            <div className="pt-4 border-t">
              <Button onClick={handleSaveLeaveSettings} className="w-full">
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resources Ledger Table */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0 pb-6">
          <div>
            <CardTitle>Resource Leave Accounts</CardTitle>
            <CardDescription>
              Summary of carry-forward leaves, allocated annual quotas, and current balances for the year {currentYear}.
            </CardDescription>
          </div>
          <div className="flex items-center w-full md:w-80 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search resources by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 w-full bg-background"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[12%]">User ID</TableHead>
                  <TableHead className="w-[30%]">Resource</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-center">Carry Forward</TableHead>
                  <TableHead className="text-center">Annual Quota</TableHead>
                  <TableHead className="text-center">Total Available</TableHead>
                  <TableHead className="text-center">Paid Taken</TableHead>
                  <TableHead className="text-right pr-6 font-semibold">Remaining Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLedger.length > 0 ? (
                  filteredLedger.map((res) => (
                    <TableRow key={res.id} className="hover:bg-muted/10 transition-colors">
                      <TableCell className="font-medium text-xs text-muted-foreground">{res.empId}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-7 w-7 border">
                            <AvatarImage src={res.avatar} alt={`${res.firstName} ${res.lastName}`} />
                            <AvatarFallback className="text-xs font-semibold">{getUserInitials(res.firstName, res.lastName)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{res.firstName} {res.lastName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{res.role || 'N/A'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5">
                          + {res.carriedOver}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-medium">{res.allocated}</TableCell>
                      <TableCell className="text-center font-semibold text-foreground">{res.totalAvailable}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{res.taken}</TableCell>
                      <TableCell className="text-right pr-6 font-bold text-sm text-primary">
                        {res.remaining}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground text-sm">
                      No matching resources found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
