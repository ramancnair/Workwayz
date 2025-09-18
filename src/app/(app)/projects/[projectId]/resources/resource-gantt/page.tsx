
'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameDay,
  parseISO,
  addMonths,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border rounded-md p-2 shadow-md text-sm">
        <p className="font-bold">{label}</p>
        <p>Date: {data.date}</p>
        <p>Status: <span className="font-semibold">{data.status}</span></p>
        <p>Hours: {data.hours.toFixed(2)}</p>
      </div>
    );
  }
  return null;
};


export default function ResourceGanttPage() {
  const { employees, worklogs, holidays, weeklyOffDays } = useProject();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { monthDays, ganttData, yAxisLabels } = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const holidaySet = new Set(holidays.map(h => format(parseISO(h.date), 'yyyy-MM-dd')));

    const data: any[] = [];
    const labels: string[] = [];

    employees.forEach((employee, index) => {
        labels.push(`${employee.firstName} ${employee.lastName}`);
        days.forEach(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayOfWeek = day.getDay();
            
            const worklog = worklogs.find(w => w.employeeId === employee.id && format(parseISO(w.date), 'yyyy-MM-dd') === dateStr);
            const loggedHours = worklog?.totalHours || 0;

            const isLeave = employee.leavePeriods?.some(p => {
                const leaveStart = startOfDay(parseISO(p.startDate));
                const leaveEnd = endOfDay(parseISO(p.endDate));
                return isSameDay(day, leaveStart) || isSameDay(day, leaveEnd) || (day > leaveStart && day < leaveEnd);
            });

            const isHoliday = holidaySet.has(dateStr);
            const isWeekend = weeklyOffDays.includes(dayOfWeek);
            const isNonWorkingDay = isHoliday || isWeekend;

            let status = 'Normal';
            let color = '#22c55e'; // Green (Normal)

            if (isLeave) {
                status = 'Leave';
                color = '#facc15'; // Yellow
            } else if (isNonWorkingDay) {
                status = isHoliday ? 'Holiday' : 'Weekend';
                color = '#ef4444'; // Red
            }

            if (loggedHours > 0) {
                if (isNonWorkingDay || isLeave) {
                    status = `Work on ${status}`;
                    color = '#3b82f6'; // Blue
                } else if (loggedHours > 8) {
                    status = 'Overtime';
                    color = '#3b82f6'; // Blue
                }
            }
            
            data.push({
                x: dateStr,
                y: index,
                hours: loggedHours,
                status: status,
                color: color,
                employeeName: `${employee.firstName} ${employee.lastName}`
            });
        });
    });

    return {
      monthDays: days,
      ganttData: data,
      yAxisLabels: labels,
    };
  }, [currentMonth, employees, worklogs, holidays, weeklyOffDays]);

  const handleMonthChange = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };
  
  return (
    <div className="flex-1 flex flex-col space-y-4 p-4 md:p-8 pt-6 h-full">
      <PageHeader title="Resource Workload" description="Monthly view of resource workload including leaves and holidays.">
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => handleMonthChange('prev')}><ChevronLeft /></Button>
            <span className="text-lg font-semibold w-40 text-center">{format(currentMonth, 'MMMM yyyy')}</span>
            <Button variant="outline" size="icon" onClick={() => handleMonthChange('next')}><ChevronRight /></Button>
        </div>
      </PageHeader>
      
      <Card className="flex-1 flex flex-col min-h-0">
          <CardContent className="p-4 flex-1">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={ganttData}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis 
                    type="category" 
                    dataKey="x"
                    domain={monthDays.map(d => format(d, 'yyyy-MM-dd'))}
                    ticks={monthDays.map(d => format(d, 'yyyy-MM-dd'))}
                    tickFormatter={(tick) => format(parseISO(tick), 'd')}
                    interval={0}
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis 
                    type="number" 
                    dataKey="y"
                    domain={[-1, yAxisLabels.length]}
                    ticks={yAxisLabels.map((_, i) => i)}
                    tickFormatter={(tick) => yAxisLabels[tick]}
                    width={150}
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(200, 200, 200, 0.2)' }} />
                <Bar dataKey="hours" barSize={20} isAnimationActive={false}>
                    {ganttData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
      </Card>
    </div>
  );
}
