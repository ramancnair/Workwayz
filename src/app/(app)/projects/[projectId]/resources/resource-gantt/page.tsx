
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
  startOfDay,
  endOfDay,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, Briefcase, Users, MoreHorizontal, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { Worklog, Employee } from '@/types';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border rounded-md p-2 shadow-md text-sm">
        <p className="font-bold">{label}</p>
        <p>Status: <span className="font-semibold">{data.status}</span></p>
        <p>Hours Logged: {data.actualHours.toFixed(1)}</p>
        {data.actualHours > 0 && <p className="text-xs text-muted-foreground mt-1">Click to view details</p>}
      </div>
    );
  }
  return null;
};

interface WorklogDetailModalProps {
  open: boolean;
  onClose: () => void;
  worklog: Worklog | null;
  employee: Employee | null;
  dateLabel: string;
  dayStatus: string;
  stories: any[];
}

function WorklogDetailModal({ open, onClose, worklog, employee, dateLabel, dayStatus, stories }: WorklogDetailModalProps) {
  const getItemTypeIcon = (itemType: string) => {
    switch (itemType) {
      case 'WorkItem': return <Briefcase className="h-3.5 w-3.5" />;
      case 'Meeting': return <Users className="h-3.5 w-3.5" />;
      default: return <MoreHorizontal className="h-3.5 w-3.5" />;
    }
  };

  const getItemTypeColor = (itemType: string) => {
    switch (itemType) {
      case 'WorkItem': return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'Meeting': return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      default: return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    if (status.includes('Overtime') || status.includes('Work on')) return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    if (status === 'Leave') return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
    if (status === 'Holiday' || status === 'Weekend') return 'bg-red-500/15 text-red-400 border-red-500/30';
    return 'bg-green-500/15 text-green-400 border-green-500/30';
  };

  const resolveItemName = (item: any) => {
    if (item.itemType === 'Meeting') return 'Meeting';
    if (item.itemType === 'Other') return item.description || 'Other Activity';
    const story = stories.find(s => s.id === item.itemId);
    return story ? `[${story.storyId}] ${story.title}` : item.itemId;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Worklog — {dateLabel}
          </DialogTitle>
          <DialogDescription>
            {employee?.firstName} {employee?.lastName}
            {dayStatus !== 'Normal' && (
              <span className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(dayStatus)}`}>
                {dayStatus}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {worklog && worklog.items.length > 0 ? (
          <div className="space-y-3 mt-2">
            {worklog.items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getItemTypeColor(item.itemType)}`}>
                      {getItemTypeIcon(item.itemType)}
                      {item.itemType}
                    </span>
                  </div>
                  <p className="text-sm font-medium truncate">{resolveItemName(item)}</p>
                  {item.description && item.itemType !== 'Other' && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className="text-lg font-bold tabular-nums">{item.hours.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground ml-0.5">h</span>
                </div>
              </div>
            ))}

            {/* Summary row */}
            <div className="flex items-center justify-between rounded-lg bg-primary/10 border border-primary/20 px-3 py-2">
              <span className="text-sm font-semibold text-primary">Total Hours</span>
              <span className="text-lg font-bold tabular-nums text-primary">
                {worklog.totalHours.toFixed(1)}h
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
            <Clock className="h-8 w-8 opacity-30" />
            <p className="text-sm">No worklog entries for this day.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function ResourceGanttPage() {
  const { employees, worklogs, holidays, weeklyOffDays, stories } = useProject();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [modalState, setModalState] = useState<{
    open: boolean;
    worklog: Worklog | null;
    employee: Employee | null;
    dateLabel: string;
    dayStatus: string;
  }>({ open: false, worklog: null, employee: null, dateLabel: '', dayStatus: 'Normal' });

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
        const isNonWorkingDay = isHoliday || isWeekend || isLeave;

        let status = 'Normal';
        let color = '#22c55e'; // Green
        let opacity = 1.0;

        if (loggedHours > 0) {
            if (isNonWorkingDay) {
                status = `Work on ${isLeave ? 'Leave' : (isHoliday ? 'Holiday' : 'Weekend')}`;
                color = '#3b82f6'; // Blue
            } else if (loggedHours > 8) {
                status = 'Overtime';
                color = '#3b82f6'; // Blue
            }
        } else {
            if (isLeave) {
              status = 'Leave';
              color = '#facc15'; // Yellow
              opacity = 0.5;
            } else if (isHoliday) {
              status = 'Holiday';
              color = '#ef4444'; // Red
              opacity = 0.5;
            } else if (isWeekend) {
              status = 'Weekend';
              color = '#ef4444'; // Red
              opacity = 0.5;
            }
        }
        
        // Use loggedHours for bar height if work was done, otherwise use a full bar for non-working day indication
        const displayHours = (loggedHours === 0 && isNonWorkingDay) ? 8 : loggedHours;

        return {
          date: format(day, 'd'),
          fullDate: dateStr,
          displayHours: displayHours,
          actualHours: loggedHours,
          status: status,
          color: color,
          opacity: opacity,
          worklog: worklog || null,
        };
      });

      return {
        employee,
        dailyData,
      };
    });
  }, [currentMonth, employees, worklogs, holidays, weeklyOffDays]);

  const handleBarClick = useCallback((data: any, employee: Employee) => {
    if (!data || !data.activePayload?.length) return;
    const dayData = data.activePayload[0].payload;
    setModalState({
      open: true,
      worklog: dayData.worklog,
      employee,
      dateLabel: format(parseISO(dayData.fullDate), 'EEEE, d MMMM yyyy'),
      dayStatus: dayData.status,
    });
  }, []);

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
            <CardHeader className="py-4">
              <CardTitle className="text-base">{employee.firstName} {employee.lastName}</CardTitle>
            </CardHeader>
            <CardContent className="pl-0">
              <ResponsiveContainer width="100%" height={150}>
                <BarChart
                  data={dailyData}
                  margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
                  onClick={(data) => handleBarClick(data, employee)}
                  style={{ cursor: 'pointer' }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false}/>
                  <YAxis domain={[0, 12]} tickFormatter={(value) => `${value}h`} fontSize={12} tickLine={false} axisLine={false}/>
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }}/>
                  <Bar dataKey="displayHours">
                    {dailyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={entry.opacity} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ))}
      </div>

      <WorklogDetailModal
        open={modalState.open}
        onClose={() => setModalState(s => ({ ...s, open: false }))}
        worklog={modalState.worklog}
        employee={modalState.employee}
        dateLabel={modalState.dateLabel}
        dayStatus={modalState.dayStatus}
        stories={stories}
      />
    </div>
  );
}
