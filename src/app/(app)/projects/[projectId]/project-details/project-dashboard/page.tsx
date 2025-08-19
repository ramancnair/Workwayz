
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { type ProjectStatus } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO, eachDayOfInterval, isBefore, startOfDay, isSameDay } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
} from 'recharts';


const statusStyles: Record<ProjectStatus, string> = {
    'Initial Estimation': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'Not Started': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    'Active': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'On Hold': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'Completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'Cancelled': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

function DetailCard({ title, value, className }: { title: string; value: React.ReactNode; className?: string }) {
    return (
        <div className={className}>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="text-lg font-semibold">{value || <span className="text-muted-foreground/70">N/A</span>}</div>
        </div>
    );
}

function BurndownChart() {
    const { sprints, stories, holidays, weeklyOffDays } = useProject();

    const currentSprint = useMemo(() => sprints.find(s => s.isCurrent), [sprints]);
    
    const burndownData = useMemo(() => {
        if (!currentSprint || !currentSprint.startDate || !currentSprint.endDate) return [];

        const sprintStart = startOfDay(parseISO(currentSprint.startDate));
        const sprintEnd = startOfDay(parseISO(currentSprint.endDate));

        const sprintItems = stories.filter(s => 
            s.sprintId === currentSprint.id && 
            ['Requirement/Story', 'Feature Change', 'Task'].includes(s.itemType)
        );
        
        const totalHours = sprintItems.reduce((sum, s) => sum + (s.estimatedHours || 0), 0);
        const totalTasks = sprintItems.length;
        
        const holidayDates = holidays.map(h => startOfDay(parseISO(h.date)));
        
        const workingDays = eachDayOfInterval({ start: sprintStart, end: sprintEnd }).filter(day => {
            const dayOfWeek = day.getDay();
            const isWeekend = weeklyOffDays.includes(dayOfWeek);
            const isHoliday = holidayDates.some(h => isSameDay(day, h));
            return !isWeekend && !isHoliday;
        });

        if (workingDays.length === 0) return [];
        
        const idealHoursPerDay = totalHours / workingDays.length;
        const idealTasksPerDay = totalTasks / workingDays.length;

        let runningIdealHours = totalHours;
        let runningIdealTasks = totalTasks;

        return eachDayOfInterval({ start: sprintStart, end: sprintEnd }).map((date, index) => {
            const isWorkingDay = workingDays.some(wd => isSameDay(wd, date));

            const completedOnThisDay = sprintItems
                .filter(s => s.status === 'Done' && s.endDate && isSameDay(startOfDay(parseISO(s.endDate)), date));

            const completedTasksOnDay = completedOnThisDay.length;
            
            const remainingItems = sprintItems.filter(s => {
                if (s.status !== 'Done') return true;
                return s.endDate ? isBefore(date, startOfDay(parseISO(s.endDate))) : true;
            });
            
            const remainingHours = remainingItems.reduce((sum, s) => sum + (s.estimatedHours || 0), 0);
            const remainingTasksCount = remainingItems.length;

            if (isWorkingDay) {
                runningIdealHours -= idealHoursPerDay;
                runningIdealTasks -= idealTasksPerDay;
            }

            return {
                name: `Day ${index}`,
                date: format(date, 'MMM d'),
                "Completed tasks": completedTasksOnDay,
                "Remaining effort": remainingHours,
                "Remaining tasks": remainingTasksCount,
                "Ideal burndown": Math.max(0, runningIdealHours),
            };
        });
    }, [currentSprint, stories, holidays, weeklyOffDays]);


    if (!currentSprint) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Sprint Burndown</CardTitle>
                </CardHeader>
                <CardContent className="h-[400px] flex items-center justify-center">
                    <p className="text-muted-foreground">No active sprint found.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Sprint Burndown</CardTitle>
                <CardDescription>{currentSprint.title}</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={burndownData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis yAxisId="left" label={{ value: 'Remaining effort (hours)', angle: -90, position: 'insideLeft' }} />
                        <YAxis yAxisId="right" orientation="right" label={{ value: 'Remaining and completed tasks', angle: 90, position: 'insideRight' }}/>
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="right" dataKey="Completed tasks" barSize={20} fill="#f59e0b" />
                        <Line yAxisId="left" type="monotone" dataKey="Remaining effort" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        <Line yAxisId="left" type="monotone" dataKey="Ideal burndown" stroke="#16a34a" strokeWidth={2} dot={false} />
                        <Line yAxisId="right" type="monotone" dataKey="Remaining tasks" stroke="#a3e635" strokeWidth={2} dot={false} />
                    </ComposedChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}

export default function ProjectDashboardPage() {
    const { project, isLoading, allUsers } = useProject();

    const projectManager = project?.projectManagerId
        ? allUsers.find(e => e.id === project.projectManagerId)
        : null;
        
    if (isLoading) {
        return (
             <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <Skeleton className="h-12 w-1/3" />
                <div className="space-y-6">
                    <Card>
                        <CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader>
                        <CardContent><Skeleton className="h-20 w-full" /></CardContent>
                    </Card>
                    <Card>
                        <CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader>
                        <CardContent><Skeleton className="h-72 w-full" /></CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    if (!project) {
        return <div className="p-8 text-center">Project not found.</div>;
    }
    
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <PageHeader title="Project Dashboard" description="A high-level overview of your project details." />
            
            <div className="space-y-6">
                <Card>
                    <CardHeader><CardTitle>Project Objective</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground whitespace-pre-wrap">
                            {project.description || "No description provided."}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Key Information</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <DetailCard 
                            title="Status" 
                            value={project.status ? (
                                <Badge className={cn('font-semibold text-base', statusStyles[project.status])}>
                                    {project.status}
                                </Badge>
                            ) : 'N/A'}
                        />
                        <DetailCard 
                            title="Project Manager"
                            value={projectManager ? `${projectManager.firstName} ${projectManager.lastName}` : "Unassigned"}
                        />
                         <DetailCard 
                            title="Methodology" 
                            value={project.methodology}
                        />
                         <DetailCard 
                            title="Pricing Model" 
                            value={project.pricingModel}
                        />
                        <DetailCard 
                            title="Start Date" 
                            value={project.startDate ? format(parseISO(project.startDate), 'PPP') : 'N/A'}
                        />
                        <DetailCard 
                            title="End Date" 
                            value={project.endDate ? format(parseISO(project.endDate), 'PPP') : 'N/A'}
                        />
                    </CardContent>
                </Card>

                <BurndownChart />
            </div>
        </div>
    );
}
