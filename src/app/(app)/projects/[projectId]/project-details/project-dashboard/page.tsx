

'use client';

import { useMemo, useState, useEffect } from 'react';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { type ProjectStatus, type Story } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO, eachDayOfInterval, isSameDay, startOfDay } from 'date-fns';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';


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

const burndownChartConfig = {
  remaining: { label: "Remaining Effort", color: "#3b82f6" },
  ideal: { label: "Ideal Burndown", color: "#a1a1aa" },
} satisfies ChartConfig;

const burnupChartConfig = {
  completed: { label: "Completed Work", color: "hsl(var(--chart-2))" },
  ideal: { label: "Ideal Burnup", color: "#a1a1aa" },
} satisfies ChartConfig;


export default function ProjectDashboardPage() {
    const { project, isLoading, allUsers, sprints, releasesAndMilestones, stories, holidays, weeklyOffDays } = useProject();
    
    const [selectedSprintId, setSelectedSprintId] = useState<string | undefined>();
    const [selectedReleaseId, setSelectedReleaseId] = useState<string | undefined>();
    
    const releases = useMemo(() => releasesAndMilestones.filter(r => r.itemType === 'Release'), [releasesAndMilestones]);
    
    useEffect(() => {
        const currentSprint = sprints.find(s => s.isCurrent);
        if (currentSprint) {
            setSelectedSprintId(currentSprint.id);
        } else if (sprints.length > 0) {
            setSelectedSprintId(sprints[0].id);
        }
    }, [sprints]);
    
    useEffect(() => {
        if(releases.length > 0) {
            const sortedReleases = [...releases].sort((a, b) => new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime());
            setSelectedReleaseId(sortedReleases[0].id);
        }
    }, [releases]);
    
    const subItemsByStoryId = useMemo(() => stories.reduce((acc, story) => {
        if (story.parentStoryId) {
            if (!acc[story.parentStoryId]) {
                acc[story.parentStoryId] = [];
            }
            acc[story.parentStoryId].push(story);
        }
        return acc;
    }, {} as Record<string, Story[]>), [stories]);

    const burndownData = useMemo(() => {
        const sprint = sprints.find(s => s.id === selectedSprintId);
        if (!sprint || !sprint.startDate || !sprint.endDate) return [];
        
        const sprintStories = stories.filter(story => story.sprintId === sprint.id);
        
        const totalEffort = sprintStories.reduce((sum, story) => {
             // For stories/features, sum up their sub-tasks' effort
            if (['Requirement/Story', 'Feature Change'].includes(story.itemType)) {
                const subTasks = subItemsByStoryId[story.id]?.filter(si => si.itemType === 'Sub Task') || [];
                if (subTasks.length > 0) {
                    return sum + subTasks.reduce((subSum, subTask) => subSum + (subTask.estimatedHours || 0), 0);
                }
            }
            // For standalone tasks/bugs, or stories without sub-tasks, use their own effort
            if (!story.parentStoryId) {
                 return sum + (story.estimatedHours || 0);
            }
            return sum;
        }, 0);
        
        const sprintStart = startOfDay(parseISO(sprint.startDate));
        const sprintEnd = startOfDay(parseISO(sprint.endDate));
        const sprintDates = eachDayOfInterval({ start: sprintStart, end: sprintEnd });

        const holidayDates = holidays.map(h => startOfDay(parseISO(h.date)));
        const workingDays = sprintDates.filter(day => {
            const dayOfWeek = day.getDay();
            const isWeekend = weeklyOffDays.includes(dayOfWeek);
            const isHoliday = holidayDates.some(h => isSameDay(day, h));
            return !isWeekend && !isHoliday;
        });

        if (workingDays.length === 0) return [];
        const idealDailyBurn = totalEffort / workingDays.length;
        
        let idealEffort = totalEffort;
        
        return sprintDates.map(date => {
            const dateStr = format(date, 'MMM d');
            
            const completedEffortOnDate = sprintStories.reduce((sum, story) => {
                let storyCompletedEffort = 0;
                
                const checkCompletion = (item: Story) => {
                    if (item.status !== 'Done') return 0;
                    const doneDate = item.updatedAt ? startOfDay(parseISO(item.updatedAt)) : sprintStart;
                    return doneDate <= date ? (item.estimatedHours || 0) : 0;
                }

                if (['Requirement/Story', 'Feature Change'].includes(story.itemType)) {
                    const subTasks = subItemsByStoryId[story.id]?.filter(si => si.itemType === 'Sub Task') || [];
                     if (subTasks.length > 0) {
                        storyCompletedEffort = subTasks.reduce((subSum, subTask) => subSum + checkCompletion(subTask), 0);
                     } else {
                        storyCompletedEffort = checkCompletion(story);
                     }
                } else if (!story.parentStoryId) { // For standalone tasks/bugs etc.
                    storyCompletedEffort = checkCompletion(story);
                }
                return sum + storyCompletedEffort;
            }, 0);
                
            const remaining = totalEffort - completedEffortOnDate;
            
            const isWorkingDay = workingDays.some(wd => isSameDay(wd, date));
            if (isWorkingDay && date >= sprintStart) {
                idealEffort -= idealDailyBurn;
            }
            
            return {
                name: dateStr,
                remaining: remaining < 0 ? 0 : remaining,
                ideal: idealEffort < 0 ? 0 : idealEffort,
            }
        });
    }, [selectedSprintId, sprints, stories, holidays, weeklyOffDays, subItemsByStoryId]);

    const burnupData = useMemo(() => {
        const release = releases.find(r => r.id === selectedReleaseId);
        if(!release || !release.startDate || !release.endDate) return [];

        const releaseStories = stories.filter(s => s.releaseId === release.id);
        
        const totalScope = releaseStories.reduce((sum, story) => {
            if (['Requirement/Story', 'Feature Change'].includes(story.itemType)) {
                const subTasks = subItemsByStoryId[story.id]?.filter(si => si.itemType === 'Sub Task') || [];
                if (subTasks.length > 0) {
                    return sum + subTasks.reduce((subSum, subTask) => subSum + (subTask.estimatedHours || 0), 0);
                }
            }
             if (!story.parentStoryId) {
                return sum + (story.estimatedHours || 0);
            }
            return sum;
        }, 0);
        
        const releaseStart = startOfDay(parseISO(release.startDate));
        const releaseEnd = startOfDay(parseISO(release.endDate));
        const releaseDates = eachDayOfInterval({ start: releaseStart, end: releaseEnd });
        
        const holidayDates = holidays.map(h => startOfDay(parseISO(h.date)));
        const workingDays = releaseDates.filter(day => {
            const dayOfWeek = day.getDay();
            const isWeekend = weeklyOffDays.includes(dayOfWeek);
            const isHoliday = holidayDates.some(h => isSameDay(day, h));
            return !isWeekend && !isHoliday;
        });

        if (workingDays.length === 0) return [];
        const idealDailyBurn = totalScope / workingDays.length;
        
        let idealBurnup = 0;

        return releaseDates.map(date => {
            const dateStr = format(date, 'MMM d');
            
            const completedEffortOnDate = releaseStories.reduce((sum, story) => {
                let storyCompletedEffort = 0;
                
                const checkCompletion = (item: Story) => {
                    if (item.status !== 'Done') return 0;
                    const doneDate = item.updatedAt ? startOfDay(parseISO(item.updatedAt)) : releaseStart;
                    return doneDate <= date ? (item.estimatedHours || 0) : 0;
                }

                if (['Requirement/Story', 'Feature Change'].includes(story.itemType)) {
                    const subTasks = subItemsByStoryId[story.id]?.filter(si => si.itemType === 'Sub Task') || [];
                     if (subTasks.length > 0) {
                        storyCompletedEffort = subTasks.reduce((subSum, subTask) => subSum + checkCompletion(subTask), 0);
                     } else {
                        storyCompletedEffort = checkCompletion(story);
                     }
                } else if (!story.parentStoryId) {
                    storyCompletedEffort = checkCompletion(story);
                }
                return sum + storyCompletedEffort;
            }, 0);

            const isWorkingDay = workingDays.some(wd => isSameDay(wd, date));
            if (isWorkingDay && date >= releaseStart) {
                idealBurnup += idealDailyBurn;
            }
            
            return {
                name: dateStr,
                completed: completedEffortOnDate,
                ideal: idealBurnup > totalScope ? totalScope : idealBurnup,
            }
        });
    }, [selectedReleaseId, releases, stories, holidays, weeklyOffDays, subItemsByStoryId]);


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
                
                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>Sprint Burndown</CardTitle>
                                <div className="w-48">
                                    <Select value={selectedSprintId} onValueChange={setSelectedSprintId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Sprint" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {sprints.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ChartContainer config={burndownChartConfig}>
                                <LineChart data={burndownData}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                                    <YAxis />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Line type="monotone" dataKey="remaining" stroke="var(--color-remaining)" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="ideal" stroke="var(--color-ideal)" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                                </LineChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>

                    <Card>
                         <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>Release Burnup</CardTitle>
                                <div className="w-48">
                                    <Select value={selectedReleaseId} onValueChange={setSelectedReleaseId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Release" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {releases.map(r => <SelectItem key={r.id} value={r.id}>[{r.releaseId}] {r.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardHeader>
                         <CardContent className="h-[300px]">
                            <ChartContainer config={burnupChartConfig}>
                                <AreaChart data={burnupData}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                                    <YAxis domain={[0, 'dataMax + 10']} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Area type="monotone" dataKey="completed" stackId="a" fill="var(--color-completed)" fillOpacity={0.4} stroke="var(--color-completed)" />
                                    <Line type="monotone" dataKey="ideal" stroke="var(--color-ideal)" strokeWidth={2} strokeDasharray="3 3" dot={false} />
                                </AreaChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
