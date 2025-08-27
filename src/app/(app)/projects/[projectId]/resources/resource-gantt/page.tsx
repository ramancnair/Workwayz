

'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, TooltipProps } from 'recharts';
import { addDays, addMonths, addWeeks, differenceInDays, endOfDay, endOfMonth, endOfWeek, eachDayOfInterval, format, isSameDay, isWithinInterval, parseISO, startOfDay, startOfMonth, startOfWeek, subMonths, subWeeks } from 'date-fns';
import { type Story, type Epic } from '@/types';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28'];

const getTaskDates = (task: Story, sprints: any[]) => {
    if (task.startDate && task.endDate) {
        return { start: parseISO(task.startDate), end: parseISO(task.endDate) };
    }
    const sprint = sprints.find(s => s.id === task.sprintId);
    if (sprint?.startDate && sprint?.endDate) {
        return { start: parseISO(sprint.startDate), end: parseISO(sprint.endDate) };
    }
    return null;
};

export default function ResourceGanttPage() {
  const { stories, epics, employees, sprints, testDate } = useProject();
  const [view, setView] = useState<'days' | 'weeks' | 'months'>('weeks');
  const [currentDate, setCurrentDate] = useState(testDate || new Date());

  useEffect(() => {
    setCurrentDate(testDate || new Date());
  }, [testDate]);


  const { dateRange, ticks } = useMemo(() => {
    let start, end;
    switch (view) {
      case 'months':
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
        break;
      case 'weeks':
        start = startOfWeek(currentDate, { weekStartsOn: 1 });
        end = endOfWeek(currentDate, { weekStartsOn: 1 });
        break;
      case 'days':
      default:
        start = startOfWeek(currentDate, { weekStartsOn: 1 });
        end = endOfWeek(currentDate, { weekStartsOn: 1 });
        break;
    }
    return {
      dateRange: { start, end },
      ticks: eachDayOfInterval({ start, end }),
    };
  }, [view, currentDate]);

  const handleDateChange = (changeFn: (date: Date, amount: number) => Date, amount: number = 1) => {
    setCurrentDate(prev => changeFn(prev, amount));
  };
  
  const getWorkingDays = useCallback((start: Date, end: Date): number => {
    if (!start || !end || end < start) return 0;
    return differenceInDays(end, start) + 1; // Simplified for now
  }, []);

  const resourcesByEpic = useMemo(() => {
    const epicMap: { [key: string]: { epic: Epic | null; resources: any[] } } = {};

    stories.forEach(story => {
      if (!story.assigneeId) return;

      const epicId = story.epicId || 'unassigned';
      if (!epicMap[epicId]) {
        epicMap[epicId] = {
          epic: epics.find(e => e.id === epicId) || null,
          resources: [],
        };
      }

      let resource = epicMap[epicId].resources.find(r => r.id === story.assigneeId);
      if (!resource) {
        const employee = employees.find(e => e.id === story.assigneeId);
        if (employee) {
          resource = { ...employee, tasks: [], dailyLoad: {} };
          epicMap[epicId].resources.push(resource);
        }
      }

      if (resource && (story.itemType === 'Sub Task' || story.itemType === 'Bug')) {
        const taskDates = getTaskDates(story, sprints);
        if(taskDates) {
            resource.tasks.push({ ...story, taskDates });
            
            const taskDuration = getWorkingDays(taskDates.start, taskDates.end);
            const dailyHours = (story.estimatedHours || 0) / (taskDuration || 1);
            
            eachDayOfInterval({ start: taskDates.start, end: taskDates.end }).forEach(day => {
              const dayStr = format(day, 'yyyy-MM-dd');
              if (!resource.dailyLoad[dayStr]) {
                  resource.dailyLoad[dayStr] = 0;
              }
              resource.dailyLoad[dayStr] += dailyHours;
            });
        }
      }
    });

    return Object.values(epicMap);
  }, [stories, epics, employees, sprints, getWorkingDays]);

  const getDayWidth = () => {
    switch (view) {
      case 'months': return 'min-w-[40px]';
      case 'weeks': return 'min-w-[80px]';
      case 'days': return 'min-w-[120px]';
      default: return 'min-w-[80px]';
    }
  };
  
  const todayMarkerDate = testDate || new Date();
  const todayIndex = differenceInDays(startOfDay(todayMarkerDate), dateRange.start);

  return (
    <div className="flex-1 flex flex-col space-y-4 p-4 md:p-8 pt-6 h-full">
      <PageHeader title="Resource Gantt" description="Visualize resource allocation and daily workload across epics and tasks.">
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => handleDateChange(subWeeks, 2)}><ChevronsLeft /></Button>
            <Button variant="outline" size="icon" onClick={() => handleDateChange(subWeeks, 1)}><ChevronLeft /></Button>
            <Button variant="outline" onClick={() => setCurrentDate(testDate || new Date())}>Today</Button>
            <Button variant="outline" size="icon" onClick={() => handleDateChange(addWeeks, 1)}><ChevronRight /></Button>
            <Button variant="outline" size="icon" onClick={() => handleDateChange(addWeeks, 2)}><ChevronsRight /></Button>
        </div>
        <Select value={view} onValueChange={(v) => setView(v as any)}>
            <SelectTrigger className="w-[120px]">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="days">Days</SelectItem>
                <SelectItem value="weeks">Weeks</SelectItem>
                <SelectItem value="months">Months</SelectItem>
            </SelectContent>
        </Select>
      </PageHeader>
      
      <div className="flex-1 border rounded-lg overflow-hidden flex flex-col">
        <div className="flex-1 grid grid-cols-[300px_1fr] overflow-auto">
          {/* Left Column: Epics and Resources */}
          <div className="border-r">
            <div className="p-4 border-b font-semibold bg-muted/50 sticky top-0 z-10">Epics / Resources</div>
            <div className="divide-y">
              {resourcesByEpic.map(({ epic, resources }, epicIndex) => (
                <div key={epic?.id || `unassigned-${epicIndex}`}>
                  {epic && (
                    <div className="p-4 bg-muted/30 font-semibold text-sm">{epic.title}</div>
                  )}
                  {resources.map(resource => (
                    <div key={resource.id} className="p-4 flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={resource.avatar} alt={`${resource.firstName} avatar`} data-ai-hint="developer avatar" />
                        <AvatarFallback>{resource.firstName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{resource.firstName} {resource.lastName}</p>
                        <p className="text-xs text-muted-foreground">{resource.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          
          {/* Right Column: Timeline */}
          <div className="overflow-x-auto">
             <div className="relative">
              {/* Header */}
              <div className="grid sticky top-0 z-10 bg-muted/50" style={{ gridTemplateColumns: `repeat(${ticks.length}, 1fr)`}}>
                {ticks.map(day => (
                  <div key={day.toString()} className={`p-4 border-b border-r text-center ${getDayWidth()}`}>
                    <p className="text-xs">{format(day, 'EEE')}</p>
                    <p className="font-semibold text-lg">{format(day, 'd')}</p>
                  </div>
                ))}
              </div>
              
               {todayIndex >= 0 && todayIndex < ticks.length && (
                  <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20" style={{ left: `calc(${todayIndex} * (100% / ${ticks.length}))` }} />
                )}

              {/* Body */}
              {resourcesByEpic.map(({ epic, resources }, epicIndex) => (
                <React.Fragment key={epic?.id || `unassigned-${epicIndex}`}>
                  {epic && (
                    <>
                      <div className="row-span-1 p-4 border-b border-r flex items-center bg-muted/30">
                      </div>
                       <div className="relative border-b" style={{ height: '0px' }}></div>
                    </>
                  )}
                  {resources.map(resource => {
                    const workloadData = ticks.map(day => ({
                        date: format(day, 'yyyy-MM-dd'),
                        load: resource.dailyLoad[format(day, 'yyyy-MM-dd')] || 0
                    }));
                    return (
                        <div key={resource.id} className="relative border-b" style={{ height: '73px' }}>
                          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${ticks.length}, 1fr)`}}>
                              {ticks.map((day, i) => <div key={i} className="border-r h-full"></div>)}
                          </div>
                          
                          <div className="absolute inset-0 px-1 pt-1 pb-2">
                              <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={workloadData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                                      <defs>
                                        <linearGradient id={`colorLoad-${resource.id}`} x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor={COLORS[epicIndex % COLORS.length]} stopOpacity={0.4}/>
                                          <stop offset="95%" stopColor={COLORS[epicIndex % COLORS.length]} stopOpacity={0}/>
                                        </linearGradient>
                                      </defs>
                                      <Area type="monotone" dataKey="load" stroke={COLORS[epicIndex % COLORS.length]} strokeWidth={2} fillOpacity={1} fill={`url(#colorLoad-${resource.id})`} />
                                  </AreaChart>
                              </ResponsiveContainer>
                           </div>

                          {resource.tasks.map((task: any) => {
                              const startOffset = differenceInDays(task.taskDates.start, dateRange.start);
                              const duration = differenceInDays(task.taskDates.end, task.taskDates.start) + 1;
                              if (startOffset + duration <= 0 || startOffset >= ticks.length) return null;

                              return (
                                  <div key={task.id}
                                      className="absolute top-[40px] h-4 rounded-full px-2 text-xs font-semibold text-white flex items-center"
                                      style={{
                                          left: `calc(${startOffset} * (100% / ${ticks.length}))`,
                                          width: `calc(${duration} * (100% / ${ticks.length}))`,
                                          backgroundColor: COLORS[epicIndex % COLORS.length]
                                      }}
                                  >
                                     <span className="truncate">{task.title}</span>
                                  </div>
                              )
                          })}
                        </div>
                    )
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
