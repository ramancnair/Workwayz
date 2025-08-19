

'use client';

import { useMemo, useState, useEffect } from 'react';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { type ProjectStatus } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO, eachDayOfInterval, isBefore, startOfDay, isSameDay, addDays, isAfter } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
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
    const [selectedSprintId, setSelectedSprintId] = useState('');

    const currentSprint = useMemo(() => sprints.find(s => s.isCurrent), [sprints]);
    
    useEffect(() => {
        if (currentSprint) {
            setSelectedSprintId(currentSprint.id);
        } else if (sprints.length > 0) {
            setSelectedSprintId(sprints[0].id);
        }
    }, [currentSprint, sprints]);

    const burndownData = useMemo(() => {
        const sprint = sprints.find(s => s.id === selectedSprintId);
        if (!sprint || !sprint.startDate || !sprint.endDate) return [];
        
        const sprintStart = startOfDay(parseISO(sprint.startDate));
        const sprintEnd = startOfDay(parseISO(sprint.endDate));

        const sprintStories = stories.filter(s => {
          if (s.sprintId !== sprint.id || !['Requirement/Story', 'Feature Change', 'Task'].includes(s.itemType)) {
            return false;
          }
          // Include stories that are part of the sprint's scope
          // This can be stories that were 'To Do' or 'In Progress' at the start, or were completed during the sprint.
          if (s.status === 'Done' && s.endDate) {
            const completionDate = startOfDay(parseISO(s.endDate));
            return isAfter(completionDate, sprintStart) || isSameDay(completionDate, sprintStart);
          }
          return s.status === 'To Do' || s.status === 'In Progress';
        });

        const totalHours = sprintStories.reduce((sum, s) => sum + (s.estimatedHours || 0), 0);
        
        const holidayDates = holidays.map(h => parseISO(h.date));
        
        const workingDays = eachDayOfInterval({ start: sprintStart, end: sprintEnd }).filter(day => {
            const dayOfWeek = day.getDay();
            const isWeekend = weeklyOffDays.includes(dayOfWeek);
            const isHoliday = holidayDates.some(h => isSameDay(day, h));
            return !isWeekend && !isHoliday;
        });

        if (workingDays.length === 0) return [];
        
        const idealHoursPerDay = totalHours / workingDays.length;
        
        let idealHours = totalHours;

        return eachDayOfInterval({ start: sprintStart, end: sprintEnd }).map(date => {
            let cumulativeHoursCompleted = sprintStories
                .filter(s => s.status === 'Done' && s.endDate && !isAfter(startOfDay(parseISO(s.endDate)), date))
                .reduce((sum, s) => sum + (s.estimatedHours || 0), 0);
            
            const isWorkingDay = workingDays.some(wd => isSameDay(wd, date));
            if(isWorkingDay && !isAfter(date, new Date())) {
                idealHours -= idealHoursPerDay;
            }

            return {
                date: format(date, 'MMM d'),
                'Actual Remaining': totalHours - cumulativeHoursCompleted,
                'Ideal Burndown': Math.max(0, idealHours),
            };
        });
    }, [selectedSprintId, sprints, stories, holidays, weeklyOffDays]);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Sprint Burndown</CardTitle>
                    <CardDescription>Track the progress of work in a sprint.</CardDescription>
                </div>
                <Select value={selectedSprintId} onValueChange={setSelectedSprintId}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select Sprint" />
                    </SelectTrigger>
                    <SelectContent>
                        {sprints.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={burndownData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="Ideal Burndown" stroke="#8884d8" strokeDasharray="5 5" />
                        <Line type="monotone" dataKey="Actual Remaining" stroke="#82ca9d" strokeWidth={2} />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}

function BurnupChart() {
    const { stories, releasesAndMilestones } = useProject();
    const releases = releasesAndMilestones.filter(r => r.itemType === 'Release');
    const [selectedReleaseId, setSelectedReleaseId] = useState('');

    useEffect(() => {
        if (releases.length > 0) {
            setSelectedReleaseId(releases[0].id);
        }
    }, [releases]);

    const burnupData = useMemo(() => {
        const release = releases.find(r => r.id === selectedReleaseId);
        if (!release || !release.startDate || !release.endDate) return [];
        
        const releaseStories = stories.filter(s => s.releaseId === selectedReleaseId);
        const totalScope = releaseStories.reduce((sum, s) => sum + (s.estimatedHours || 0), 0);
        
        const releaseStart = startOfDay(parseISO(release.startDate));
        const releaseEnd = startOfDay(parseISO(release.endDate));

        return eachDayOfInterval({ start: releaseStart, end: releaseEnd }).map(date => {
            const storiesCompletedByThisDay = releaseStories.filter(s =>
                s.status === 'Done' && s.endDate && !isAfter(startOfDay(parseISO(s.endDate)), date)
            );
            
            const completedHours = storiesCompletedByThisDay.reduce((sum, s) => sum + (s.estimatedHours || 0), 0);

            return {
                date: format(date, 'MMM d'),
                'Scope': totalScope,
                'Completed Work': completedHours,
            };
        });

    }, [selectedReleaseId, releases, stories]);
    
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Release Burnup</CardTitle>
                    <CardDescription>Track progress towards the release goal.</CardDescription>
                </div>
                <Select value={selectedReleaseId} onValueChange={setSelectedReleaseId}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select Release" />
                    </SelectTrigger>
                    <SelectContent>
                        {releases.map(r => <SelectItem key={r.id} value={r.id}>[{r.releaseId}] {r.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={burnupData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}/>
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="Completed Work" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                        <Line type="monotone" dataKey="Scope" stroke="#ffc658" strokeWidth={2} dot={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <BurndownChart />
                    <BurnupChart />
                </div>
            </div>
        </div>
    );
}
