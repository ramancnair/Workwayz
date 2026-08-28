'use client';

import { useState, useMemo } from 'react';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronLeft, ChevronRight, Search, Calendar as CalendarIcon } from 'lucide-react';
import { cn, getUserInitials } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function LeaveCalendarPage() {
  const { employees, holidays, weeklyOffDays } = useProject();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'calendar' | 'summary'>('calendar');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');

  const { weeks, dateRange } = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 }); // Saturday
    
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
        weeks.push(days.slice(i, i + 7));
    }

    return { weeks, dateRange: { start: startDate, end: endDate } };
  }, [currentMonth]);

  const holidayMap = useMemo(() => {
    const map = new Map<string, string>();
    holidays.forEach(h => {
        const dayStr = format(parseISO(h.date), 'yyyy-MM-dd');
        map.set(dayStr, h.description);
    });
    return map;
  }, [holidays]);

  const leavesByDay = useMemo(() => {
    const leaves: Record<string, { id: string; firstName: string; lastName: string; leaveType?: string }[]> = {};
    const daysInView = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    daysInView.forEach(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        leaves[dayStr] = [];
    });

    employees.forEach(emp => {
      emp.leavePeriods?.forEach(period => {
        if (!period.startDate || !period.endDate) return;
        const leaveStart = parseISO(period.startDate);
        const leaveEnd = parseISO(period.endDate);

        daysInView.forEach(day => {
            if (isSameDay(day, leaveStart) || isSameDay(day, leaveEnd) || (day > leaveStart && day < leaveEnd)) {
                 const dayStr = format(day, 'yyyy-MM-dd');
                 
                 const isWeekend = weeklyOffDays.includes(day.getDay());
                 const isHoliday = holidayMap.has(dayStr);
                 if (isWeekend || isHoliday) return;

                 if(leaves[dayStr]) {
                    leaves[dayStr].push({ 
                      id: emp.id, 
                      firstName: emp.firstName, 
                      lastName: emp.lastName, 
                      leaveType: period.type || 'Paid Leave' 
                    });
                 }
            }
        })
      });
    });
    return leaves;
  }, [employees, dateRange, holidayMap, weeklyOffDays]);

  // Premium business days calculator strictly clamped to a specific year
  const calculateBusinessDaysForYear = useMemo(() => {
    return (startDateStr: string, endDateStr: string, year: number): number => {
      try {
        const start = new Date(startDateStr);
        const end = new Date(endDateStr);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
            return 0;
        }

        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31, 23, 59, 59);

        // If the leave period doesn't overlap with the selected year at all
        if (end < yearStart || start > yearEnd) {
          return 0;
        }

        // Clamp dates to the selected year boundary
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

        return businessDays.length;
      } catch(e) {
        console.error("Error calculating business days", e);
        return 0;
      }
    };
  }, [holidays, weeklyOffDays]);

  // Compute resource leave summary totals for the selected year
  const resourcesSummary = useMemo(() => {
    return employees.map(emp => {
      let paidDays = 0;
      let lopDays = 0;

      emp.leavePeriods?.forEach(period => {
        if (!period.startDate || !period.endDate) return;
        const days = calculateBusinessDaysForYear(period.startDate, period.endDate, selectedYear);
        if (period.type === 'Loss of Pay') {
          lopDays += days;
        } else {
          paidDays += days;
        }
      });

      return {
        ...emp,
        paidDays,
        lopDays,
        totalDays: paidDays + lopDays,
      };
    });
  }, [employees, selectedYear, calculateBusinessDaysForYear]);

  // Compute aggregate statistics
  const aggregateMetrics = useMemo(() => {
    let totalPaid = 0;
    let totalLop = 0;
    resourcesSummary.forEach(res => {
      totalPaid += res.paidDays;
      totalLop += res.lopDays;
    });
    return {
      totalPaid,
      totalLop,
      totalCombined: totalPaid + totalLop,
      activeResources: employees.length,
    };
  }, [resourcesSummary, employees]);

  // Filter resources by search query
  const filteredResources = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return resourcesSummary;
    return resourcesSummary.filter(res => 
      `${res.firstName} ${res.lastName}`.toLowerCase().includes(query) ||
      res.empId.toLowerCase().includes(query)
    );
  }, [resourcesSummary, searchQuery]);

  const monthTitle = format(currentMonth, 'MMMM yyyy');
  const headerTitle = activeTab === 'calendar' ? 'Leave Calendar' : 'Leave Summary';
  const headerDescription = activeTab === 'calendar' 
    ? 'View team availability for the month.' 
    : `Yearly summary of leaves taken by project resources in ${selectedYear}.`;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title={headerTitle} description={headerDescription}>
        {activeTab === 'calendar' ? (
          <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="h-4 w-4" />
              </Button>
               <span className="text-lg font-semibold w-48 text-center">{monthTitle}</span>
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="h-4 w-4" />
              </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setSelectedYear(prev => prev - 1)}>
                  <ChevronLeft className="h-4 w-4" />
              </Button>
               <span className="text-lg font-semibold w-24 text-center">{selectedYear}</span>
              <Button variant="outline" size="icon" onClick={() => setSelectedYear(prev => prev + 1)}>
                  <ChevronRight className="h-4 w-4" />
              </Button>
          </div>
        )}
      </PageHeader>

      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="space-y-4">
        <TabsList className="grid w-[400px] grid-cols-2">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Leave Calendar
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Leave Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <div className="space-y-4">
            {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-px border-l border-t bg-border rounded-lg overflow-hidden">
                    {week.map(day => {
                        const dayStr = format(day, 'yyyy-MM-dd');
                        const holidayInfo = holidayMap.get(dayStr);
                        const isWeekend = weeklyOffDays.includes(day.getDay());

                        return (
                            <div key={day.toString()} className={cn("bg-card p-2 min-h-[120px]", (isWeekend || holidayInfo) && "bg-muted/50", format(day, 'M') !== format(currentMonth, 'M') && 'bg-muted/20 text-muted-foreground')}>
                                <div className="flex justify-between items-center text-sm font-semibold">
                                    <span>{format(day, 'EEE')}</span>
                                    <span>{format(day, 'd')}</span>
                                </div>
                                {holidayInfo && <Badge variant="outline" className="mt-2 bg-yellow-100 text-yellow-800">{holidayInfo}</Badge>}
                                <div className="mt-4 space-y-2">
                                    {leavesByDay[dayStr]?.map(emp => (
                                        <div key={emp.id} className="flex items-center gap-1.5 bg-background p-1 rounded-md border text-xs justify-between">
                                            <span className="truncate font-medium">{emp.firstName} {emp.lastName}</span>
                                            {emp.leaveType === 'Loss of Pay' ? (
                                              <Badge variant="destructive" className="px-1 py-0 h-4 text-[9px] font-semibold leading-none flex-shrink-0">LOP</Badge>
                                            ) : (
                                              <Badge variant="secondary" className="px-1 py-0 h-4 text-[9px] font-semibold leading-none flex-shrink-0 bg-blue-500/10 text-blue-500 hover:bg-blue-500/10 border-0">PL</Badge>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          {/* Statistical Deck Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-gradient-to-br from-card to-background border-primary/10 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paid Leaves (Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{aggregateMetrics.totalPaid}d</div>
                <p className="text-xs text-muted-foreground mt-1">Total business days taken in {selectedYear}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-background border-destructive/10 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Loss of Pay (LOP) (Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-destructive">{aggregateMetrics.totalLop}d</div>
                <p className="text-xs text-muted-foreground mt-1">Total unpaid business days in {selectedYear}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-background border-muted shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Combined Leaves (Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{aggregateMetrics.totalCombined}d</div>
                <p className="text-xs text-muted-foreground mt-1">Sum of paid and unpaid days in {selectedYear}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-background border-muted shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned Team</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{aggregateMetrics.activeResources}</div>
                <p className="text-xs text-muted-foreground mt-1">Total active resources on project</p>
              </CardContent>
            </Card>
          </div>

          {/* Resources Leave Table */}
          <Card className="shadow-md">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0 pb-6">
              <div>
                <CardTitle className="text-xl">Resource Leave Breakdown</CardTitle>
                <CardDescription>
                  Detailed statistics of leaves recorded for project resources during the calendar year {selectedYear}.
                </CardDescription>
              </div>
              <div className="flex items-center w-full md:w-80 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or ID..."
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
                      <TableHead className="w-[15%]">User ID</TableHead>
                      <TableHead className="w-[30%]">Resource Name</TableHead>
                      <TableHead className="w-[15%]">Role</TableHead>
                      <TableHead className="w-[15%]">Paid Leaves (Days)</TableHead>
                      <TableHead className="w-[15%]">Loss of Pay (Days)</TableHead>
                      <TableHead className="text-right font-semibold pr-6 w-[10%]">Total (Days)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResources.length > 0 ? (
                      filteredResources.map((res) => (
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
                          <TableCell>
                            <Badge variant="secondary" className="bg-primary/10 text-primary border-none hover:bg-primary/15 font-semibold text-xs px-2 py-0.5">
                              {res.paidDays}d
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="destructive" className="bg-destructive/10 text-destructive border-none hover:bg-destructive/15 font-semibold text-xs px-2 py-0.5">
                              {res.lopDays}d
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-6 font-bold text-sm text-foreground">
                            {res.totalDays}d
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-sm">
                          No matching resources found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
