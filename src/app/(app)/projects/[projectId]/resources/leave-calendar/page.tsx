
'use client';

import { useState, useMemo } from 'react';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { addWeeks, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, parseISO } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LeaveCalendarPage() {
  const { employees, holidays, weeklyOffDays } = useProject();
  const [currentDate, setCurrentDate] = useState(new Date());

  const week = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
    const end = endOfWeek(currentDate, { weekStartsOn: 1 }); // Sunday
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const leavesByDay = useMemo(() => {
    const leaves: Record<string, { id: string; firstName: string; lastName: string; avatar?: string }[]> = {};
    week.forEach(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        leaves[dayStr] = [];
    });

    employees.forEach(emp => {
      emp.leavePeriods?.forEach(period => {
        if (!period.startDate || !period.endDate) return;
        const leaveStart = parseISO(period.startDate);
        const leaveEnd = parseISO(period.endDate);

        week.forEach(day => {
            if (isSameDay(day, leaveStart) || isSameDay(day, leaveEnd) || (day > leaveStart && day < leaveEnd)) {
                 const dayStr = format(day, 'yyyy-MM-dd');
                 leaves[dayStr].push({ id: emp.id, firstName: emp.firstName, lastName: emp.lastName, avatar: emp.avatar });
            }
        })
      });
    });
    return leaves;
  }, [employees, week]);
  
  const holidayMap = useMemo(() => {
    const map = new Map<string, string>();
    holidays.forEach(h => {
        const dayStr = format(parseISO(h.date), 'yyyy-MM-dd');
        map.set(dayStr, h.description);
    });
    return map;
  }, [holidays]);

  const weekTitle = `${format(week[0], 'MMM d')} - ${format(week[6], 'MMM d, yyyy')}`;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="Leave Calendar" description="View team availability for the week.">
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(subWeeks(currentDate, 1))}>
                <ChevronLeft className="h-4 w-4" />
            </Button>
             <span className="text-lg font-semibold w-48 text-center">{weekTitle}</span>
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(addWeeks(currentDate, 1))}>
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
      </PageHeader>
      
      <div className="grid grid-cols-7 gap-px border-l border-t bg-border rounded-lg overflow-hidden">
        {week.map(day => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const holidayInfo = holidayMap.get(dayStr);
            const isWeekend = weeklyOffDays.includes(day.getDay());

            return (
                <div key={day.toString()} className={cn("bg-card p-2 min-h-[200px]", (isWeekend || holidayInfo) && "bg-muted/50")}>
                    <div className="flex justify-between items-center text-sm font-semibold">
                        <span>{format(day, 'EEE')}</span>
                        <span>{format(day, 'd')}</span>
                    </div>
                    {holidayInfo && <Badge variant="outline" className="mt-2 bg-yellow-100 text-yellow-800">{holidayInfo}</Badge>}
                    <div className="mt-4 space-y-2">
                        {leavesByDay[dayStr]?.map(emp => (
                            <div key={emp.id} className="flex items-center gap-2 bg-background p-1.5 rounded-md border text-xs">
                                <Avatar className="h-5 w-5">
                                    <AvatarImage src={emp.avatar} alt={`${emp.firstName} ${emp.lastName}`} data-ai-hint="employee avatar" />
                                    <AvatarFallback>{emp.firstName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span>{emp.firstName} {emp.lastName}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )
        })}
      </div>
    </div>
  );
}
