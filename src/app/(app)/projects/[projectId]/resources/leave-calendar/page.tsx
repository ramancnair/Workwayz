
'use client';

import { useState, useMemo } from 'react';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { addMonths, subMonths, isSameMonth, parseISO, startOfDay } from 'date-fns';
import { eachDayOfInterval, isSameDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { DayContentProps } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function LeaveCalendarPage() {
  const { employees, holidays, weeklyOffDays } = useProject();
  const [currentMonth, setCurrentMonth] = useState(new Date());

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

  const modifiers = {
    weekend: (date: Date) => weeklyOffDays.includes(date.getDay()),
    holiday: (date: Date) => holidayDates.some(h => isSameDay(h, date)),
    onLeave: (date: Date) => !!leavesByDay[date.toISOString().split('T')[0]],
  };

  const modifiersClassNames = {
    weekend: 'bg-muted/50 text-muted-foreground',
    holiday: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200',
    onLeave: 'bg-red-200 dark:bg-red-800/50 text-red-800 dark:text-red-200',
  };
  
  const DayWithTooltip = (props: DayContentProps) => {
    const dayStr = props.date.toISOString().split('T')[0];
    const namesOnLeave = leavesByDay[dayStr];
    
    if (namesOnLeave && namesOnLeave.length > 0) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>{props.date.getDate()}</div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-semibold">On Leave:</p>
              <ul className="list-disc pl-4">
                {namesOnLeave.map((name, index) => <li key={index}>{name}</li>)}
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return <div>{props.date.getDate()}</div>;
  };


  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="Leave Calendar" description="View team availability at a glance." />
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-center items-center gap-4 mb-4">
             <Button variant="outline" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
             <h3 className="text-xl font-semibold w-48 text-center">
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
           <Calendar
            mode="single"
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            modifiers={modifiers}
            modifiersClassNames={modifiersClassNames}
            className="w-full"
            components={{
                DayContent: DayWithTooltip,
            }}
           />
        </CardContent>
      </Card>
    </div>
  );
}
