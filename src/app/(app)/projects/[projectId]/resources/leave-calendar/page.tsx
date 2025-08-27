
'use client';

import { useState, useMemo } from 'react';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  format,
  getDay,
  addMonths,
  subMonths,
  parseISO,
  startOfDay,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function LeaveCalendarPage() {
  const { employees, holidays, weeklyOffDays } = useProject();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const leavesByDay = useMemo(() => {
    const leaves: Record<string, string[]> = {};
    employees.forEach(emp => {
      emp.leavePeriods?.forEach(period => {
        if (!period.startDate || !period.endDate) return;
        const start = parseISO(period.startDate);
        const end = parseISO(period.endDate);
        const interval = eachDayOfInterval({ start: startOfDay(start), end: startOfDay(end) });
        interval.forEach(day => {
          const dayStr = day.toISOString().split('T')[0];
          if (!leaves[dayStr]) {
            leaves[dayStr] = [];
          }
          leaves[dayStr].push(emp.firstName);
        });
      });
    });
    return leaves;
  }, [employees]);

  const holidayDates = useMemo(() => holidays.map(h => startOfDay(parseISO(h.date))), [holidays]);
  
  const monthDays = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });
  
  const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="Leave Calendar" description="View team availability at a glance." />
      <Card className="max-w-sm mx-auto">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-4">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-semibold text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </h3>
            <Button variant="ghost" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-7 text-center text-xs text-muted-foreground mb-2">
            {daysOfWeek.map(day => <div key={day}>{day}</div>)}
          </div>
          <div className="space-y-1">
            {monthDays.map((day, index) => {
              const dayStr = day.toISOString().split('T')[0];
              const namesOnLeave = leavesByDay[dayStr];
              const isHoliday = holidayDates.some(h => isSameDay(h, day));
              const isWeekend = weeklyOffDays.includes(getDay(day));

              const dayClasses = cn('flex items-center justify-between p-2 rounded-md h-10', {
                  'bg-gray-100 dark:bg-muted/50': isWeekend,
                  'bg-yellow-100 dark:bg-yellow-900/50': isHoliday,
              });

              return (
                <div key={dayStr} className={dayClasses}>
                  <span className="font-medium">{format(day, 'd')}</span>
                  {namesOnLeave && namesOnLeave.length > 0 && (
                     <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex -space-x-2">
                                {namesOnLeave.slice(0, 3).map((name, i) => (
                                    <div key={i} className="h-6 w-6 rounded-full bg-red-200 border-2 border-background flex items-center justify-center text-xs font-bold text-red-800">
                                        {name.charAt(0)}
                                    </div>
                                ))}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                            <p className="font-semibold">On Leave:</p>
                            <ul className="list-disc pl-4">
                                {namesOnLeave.map((name, i) => <li key={i}>{name}</li>)}
                            </ul>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
