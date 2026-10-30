'use client';

import { useState, useMemo } from 'react';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { eachDayOfInterval, format, isSameDay, parseISO } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { getUserInitials } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function LeaveSummaryPage() {
  const { employees, holidays, weeklyOffDays } = useProject();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');

  // Compute resource leave summary totals for the selected year (deduplicating overlapping days)
  const resourcesSummary = useMemo(() => {
    const holidayDates = holidays.map(h => parseISO(h.date));
    return employees.map(emp => {
      const yearStart = new Date(selectedYear, 0, 1);
      const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59);

      let paidDays = 0;
      let lopDays = 0;
      const leaveEntriesMap = new Map<string, 'Paid Leave' | 'Loss of Pay'>();

      emp.leavePeriods?.forEach(period => {
        if (!period.startDate || !period.endDate) return;
        const start = new Date(period.startDate);
        const end = new Date(period.endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return;
        if (end < yearStart || start > yearEnd) return;

        const overlapStart = new Date(Math.max(start.getTime(), yearStart.getTime()));
        const overlapEnd = new Date(Math.min(end.getTime(), yearEnd.getTime()));
        const interval = eachDayOfInterval({ start: overlapStart, end: overlapEnd });

        interval.forEach(day => {
          const isWeekend = weeklyOffDays.includes(day.getDay());
          const isHoliday = holidayDates.some(h => isSameDay(day, h));
          if (isWeekend || isHoliday) return;
          const dayStr = format(day, 'yyyy-MM-dd');
          const type = (period.type as any) || 'Paid Leave';

          if (period.isHalfDay) {
            const sessionKey = `${dayStr}_${period.halfDaySession || 'First Half'}`;
            if (!leaveEntriesMap.has(sessionKey)) {
              leaveEntriesMap.set(sessionKey, type);
            }
          } else {
            const s1 = `${dayStr}_First Half`;
            const s2 = `${dayStr}_Second Half`;
            leaveEntriesMap.set(s1, type);
            leaveEntriesMap.set(s2, type);
          }
        });
      });

      leaveEntriesMap.forEach(type => {
        if (type === 'Loss of Pay') {
          lopDays += 0.5;
        } else {
          paidDays += 0.5;
        }
      });

      return {
        ...emp,
        paidDays,
        lopDays,
        totalDays: paidDays + lopDays,
      };
    });
  }, [employees, selectedYear, holidays, weeklyOffDays]);

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

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Leave Summary"
        description={`Yearly summary of leaves taken by project resources in ${selectedYear}.`}
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setSelectedYear(prev => prev - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-semibold w-24 text-center">{selectedYear}</span>
          <Button variant="outline" size="icon" onClick={() => setSelectedYear(prev => prev + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </PageHeader>

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
    </div>
  );
}

