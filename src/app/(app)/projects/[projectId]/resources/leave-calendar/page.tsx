
'use client';

import { useState, useMemo } from 'react';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { addMonths, subMonths, startOfDay, parseISO, isSameDay } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipProvider,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function LeaveCalendarPage() {
  const { employees, holidays, weeklyOffDays } = useProject();
  const [month, setMonth] = useState(new Date());

  const leavesByDay = useMemo(() => {
    const leaves: Record<string, { id: string; firstName: string; lastName: string; avatar?: string }[]> = {};
    employees.forEach(emp => {
      emp.leavePeriods?.forEach(period => {
        if (!period.startDate || !period.endDate) return;
        const start = startOfDay(parseISO(period.startDate));
        const end = startOfDay(parseISO(period.endDate));
        for (let day = start; day <= end; day.setDate(day.getDate() + 1)) {
          const dayStr = day.toISOString().split('T')[0];
          if (!leaves[dayStr]) {
            leaves[dayStr] = [];
          }
          leaves[dayStr].push({ id: emp.id, firstName: emp.firstName, lastName: emp.lastName, avatar: emp.avatar });
        }
      });
    });
    return leaves;
  }, [employees]);
  
  const holidayMap = useMemo(() => {
    const map = new Map<string, string>();
    holidays.forEach(h => {
        const dayStr = startOfDay(parseISO(h.date)).toISOString().split('T')[0];
        map.set(dayStr, h.description);
    });
    return map;
  }, [holidays]);


  const DayContent = ({ date }: { date: Date }) => {
    const dayStr = date.toISOString().split('T')[0];
    const namesOnLeave = leavesByDay[dayStr];

    return (
      <div className="relative flex flex-col items-center justify-center h-full">
         {namesOnLeave && namesOnLeave.length > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="absolute top-1 right-1 flex -space-x-2">
                    {namesOnLeave.slice(0, 2).map((emp) => (
                      <Avatar key={emp.id} className="h-5 w-5 border-2 border-background">
                        <AvatarImage src={emp.avatar} alt={`${emp.firstName} ${emp.lastName}`} data-ai-hint="employee avatar" />
                        <AvatarFallback>{emp.firstName.charAt(0)}</AvatarFallback>
                      </Avatar>
                    ))}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-semibold">On Leave:</p>
                <ul className="list-disc pl-4">
                  {namesOnLeave.map((emp) => <li key={emp.id}>{emp.firstName} {emp.lastName}</li>)}
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="Leave Calendar" description="View team availability at a glance." />
      <div className="flex justify-center">
        <div className="w-full max-w-4xl">
            <Calendar
                month={month}
                onMonthChange={setMonth}
                modifiers={{
                    holiday: (date: Date) => holidayMap.has(date.toISOString().split('T')[0]),
                    weekend: (date: Date) => weeklyOffDays.includes(date.getDay()),
                    onLeave: (date: Date) => !!leavesByDay[date.toISOString().split('T')[0]],
                }}
                modifiersClassNames={{
                    holiday: 'bg-yellow-100 dark:bg-yellow-900/50',
                    weekend: 'bg-muted/50',
                    onLeave: 'relative bg-red-100 dark:bg-red-900/50',
                }}
                components={{
                    DayContent: DayContent,
                }}
                className="rounded-md border p-0"
                classNames={{
                    months: 'flex-1',
                    month: 'w-full p-4',
                    table: 'w-full border-collapse space-y-1',
                    head_row: 'grid grid-cols-7',
                    head_cell: 'w-full text-muted-foreground rounded-md p-2 text-center font-normal',
                    row: 'grid grid-cols-7 w-full mt-2',
                    cell: 'text-center text-sm p-0 relative first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 h-24 border',
                    day: 'h-full w-full p-2 justify-start items-start font-normal aria-selected:opacity-100',
                    day_selected: 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
                    day_today: 'bg-accent text-accent-foreground',
                    day_outside: 'day-outside text-muted-foreground opacity-50',
                }}
            />
        </div>
      </div>
    </div>
  );
}

