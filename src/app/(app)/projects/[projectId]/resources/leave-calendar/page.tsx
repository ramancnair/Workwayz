
'use client';

import { useState, useMemo } from 'react';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { addMonths, subMonths, isSameMonth, parseISO } from 'date-fns';
import { eachDayOfInterval, isSameDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { DayContentProps } from 'react-day-picker';
import { cn } from '@/lib/utils';

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
        const interval = eachDayOfInterval({ start, end });
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

  const holidayDates = useMemo(() => holidays.map(h => parseISO(h.date)), [holidays]);

  const DayContent = (props: DayContentProps) => {
    const { date, activeModifiers } = props;
    const dayStr = date.toISOString().split('T')[0];
    const namesOnLeave = leavesByDay[dayStr];
    const isHoliday = holidayDates.some(h => isSameDay(h, date));
    const isWeekend = weeklyOffDays.includes(date.getDay());

    let cellClassName = 'h-32 p-2 flex flex-col justify-start items-start text-left relative overflow-hidden border-t border-l';
    if (!isSameMonth(date, currentMonth)) {
      cellClassName += ' bg-muted/50 text-muted-foreground';
    }
    if (isWeekend) {
      cellClassName += ' bg-gray-100 dark:bg-gray-800/50';
    }
    if(isHoliday) {
      cellClassName += ' bg-yellow-100 dark:bg-yellow-900/50';
    }

    return (
      <div className={cellClassName}>
        <time dateTime={dayStr} className={cn("font-semibold", isSameDay(new Date(), date) && "flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground")}>{date.getDate()}</time>
        {namesOnLeave && (
          <ul className="text-xs mt-1 space-y-0.5 w-full">
            {namesOnLeave.map((name, index) => (
              <li key={index} className="bg-red-200 dark:bg-red-800/50 rounded px-1.5 py-0.5 w-full truncate text-foreground">{name}</li>
            ))}
          </ul>
        )}
      </div>
    );
  };
  
  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="Leave Calendar" description="View team availability at a glance.">
         <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
             <h3 className="text-lg font-semibold w-32 text-center">
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h3>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
      </PageHeader>
      <Card>
        <CardContent className="p-0">
           <Calendar
            mode="single"
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            components={{
                DayContent: DayContent,
            }}
            className="w-full"
            classNames={{
              table: 'w-full border-collapse',
              head_row: 'grid grid-cols-7 w-full border-l',
              head_cell: 'p-2 border-r border-t font-semibold text-sm text-center',
              row: 'grid grid-cols-7 w-full',
              cell: 'h-auto w-auto p-0 m-0', // reset cell padding
              day: 'h-full w-full p-0 m-0',
            }}
           />
        </CardContent>
      </Card>
    </div>
  );
}
