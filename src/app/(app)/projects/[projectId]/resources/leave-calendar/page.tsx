'use client';

import { useState, useMemo } from 'react';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function LeaveCalendarPage() {
  const { employees, holidays, weeklyOffDays } = useProject();
  const [currentMonth, setCurrentMonth] = useState(new Date());

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
    const leaves: Record<string, { id: string; firstName: string; lastName: string; leaveType?: string; isHalfDay?: boolean; halfDaySession?: 'First Half' | 'Second Half' }[]> = {};
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

            if (leaves[dayStr]) {
              const alreadyPresent = leaves[dayStr].some(item => 
                item.id === emp.id &&
                item.isHalfDay === period.isHalfDay &&
                item.halfDaySession === period.halfDaySession
              );
              if (!alreadyPresent) {
                leaves[dayStr].push({ 
                  id: emp.id, 
                  firstName: emp.firstName, 
                  lastName: emp.lastName, 
                  leaveType: period.type || 'Paid Leave',
                  isHalfDay: period.isHalfDay,
                  halfDaySession: period.halfDaySession,
                });
              }
            }
          }
        });
      });
    });
    return leaves;
  }, [employees, dateRange, holidayMap, weeklyOffDays]);

  const monthTitle = format(currentMonth, 'MMMM yyyy');

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="Leave Calendar" description="View team availability for the month.">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-semibold w-48 text-center">{monthTitle}</span>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </PageHeader>

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
                    {leavesByDay[dayStr]?.map((emp, empIdx) => {
                      const isLOP = emp.leaveType === 'Loss of Pay';
                      const halfBadge = emp.isHalfDay 
                        ? (emp.halfDaySession === 'First Half' ? '1st H' : (emp.halfDaySession === 'Second Half' ? '2nd H' : '0.5'))
                        : null;

                      return (
                        <div key={`${emp.id}-${empIdx}`} className="flex items-center gap-1.5 bg-background p-1 rounded-md border text-xs justify-between">
                          <span className="truncate font-medium">{emp.firstName} {emp.lastName}</span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Badge 
                              variant={isLOP ? 'destructive' : 'secondary'} 
                              className={cn(
                                "px-1 py-0 h-4 text-[9px] font-semibold leading-none flex-shrink-0",
                                !isLOP && "bg-blue-500/10 text-blue-500 hover:bg-blue-500/10 border-0"
                              )}
                            >
                              {isLOP ? 'LOP' : 'PL'}
                            </Badge>
                            {halfBadge && (
                              <Badge variant="outline" className="px-1 py-0 h-4 text-[8px] font-medium leading-none flex-shrink-0 border-amber-500/30 text-amber-500 bg-amber-500/5">
                                {halfBadge}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

