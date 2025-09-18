
'use client';

import React, { useState, useMemo } from 'react';
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
  startOfDay,
  endOfDay,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border rounded-md p-2 shadow-md text-sm">
        <p className="font-bold">{label}</p>
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

  const processedData = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const holidaySet = new Set(holidays.map(h => format(parseISO(h.date), 'yyyy-MM-dd')));

    return employees.map(employee => {
      const dailyData = days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayOfWeek = day.getDay();
        
        const worklog = worklogs.find(w => w.employeeId === employee.id && format(parseISO(w.date), 'yyyy-MM-dd') === dateStr);
        const loggedHours = worklog?.totalHours || 0;

        const isLeave = employee.leavePeriods?.some(p => {
          if (!p.startDate || !p.endDate) return false;
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

        return {
          date: format(day, 'd'),
          fullDate: dateStr,
          hours: loggedHours,
          status: status,
          color: color,
        };
      });

      return {
        employee,
        dailyData,
      };
    });
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
      
      <div className="flex-1 space-y-6 overflow-y-auto pr-2">
        {processedData.map(({ employee, dailyData }) => (
          <Card key={employee.id}>
            <CardHeader>
              <CardTitle>{employee.firstName} {employee.lastName}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="hours">
                    {dailyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
