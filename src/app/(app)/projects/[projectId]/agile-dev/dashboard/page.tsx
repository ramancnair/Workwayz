
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { format, parseISO, eachDayOfInterval, isSameDay, startOfDay, differenceInDays } from 'date-fns';
import type { Story, Release, StatusHistoryItem } from '@/types';
import { BookOpen, CheckCircle, GitFork, Boxes, CheckSquare, Bug, GitCommit, Clock } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/StatsCard';

const burndownChartConfig = {
  remaining: { label: "Remaining Effort", color: "hsl(var(--chart-2))" },
  ideal: { label: "Ideal Burndown", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const burnupChartConfig = {
  completed: { label: "Completed Work", color: "hsl(var(--chart-2))" },
  ideal: { label: "Ideal Burnup", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const getStatusOnDate = (item: Story, targetDate: Date): string | null => {
    if (!item.statusHistory || item.statusHistory.length === 0) {
        return item.status; // Fallback to current status
    }

    const sortedHistory = [...item.statusHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // The first entry in history is the creation status.
    const creationEntry = sortedHistory[0];
    let effectiveStatus: string | null = creationEntry.fromStatus; // Initialize to what it was BEFORE the first recorded transition

    for (const historyItem of sortedHistory) {
        if (startOfDay(new Date(historyItem.date)) <= startOfDay(targetDate)) {
            effectiveStatus = historyItem.toStatus;
        } else {
            break; 
        }
    }
    
    return effectiveStatus;
};


export default function DevelopmentDashboard() {
  const { stories, sprints, releasesAndMilestones, holidays, weeklyOffDays, testDate, kanbanColumns } = useProject();
  
  const doneColumnName = useMemo(() => kanbanColumns.find(c => c.isDoneColumn)?.name || 'Done', [kanbanColumns]);
  
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
      
      const today = testDate ? startOfDay(testDate) : null;
      const sprintStories = stories.filter(story => story.sprintId === sprint.id);
      
      const totalEffort = sprintStories.reduce((sum, story) => {
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
          const completedEffortOnDate = sprintStories.reduce((sum, story) => {
              let storyCompletedEffort = 0;
              
              const checkCompletion = (item: Story) => {
                  const statusOnDate = getStatusOnDate(item, date);
                  return statusOnDate === doneColumnName ? (item.estimatedHours || 0) : 0;
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
              date: date,
              remaining: today && date <= today ? (remaining < 0 ? 0 : remaining) : null,
              ideal: idealEffort < 0 ? 0 : idealEffort,
          }
      });
  }, [selectedSprintId, sprints, stories, holidays, weeklyOffDays, subItemsByStoryId, testDate]);

  const burnupData = useMemo(() => {
      const release = releases.find(r => r.id === selectedReleaseId);
      if(!release || !release.startDate || !release.endDate) return [];
      
      const today = testDate ? startOfDay(testDate) : null;
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
      
      if (releaseDates.length === 0) return [];
      const idealDailyBurnup = totalScope / (differenceInDays(releaseEnd, releaseStart) || 1);
      
      let idealBurnup = 0;

      return releaseDates.map((date, index) => {
          const completedEffortOnDate = releaseStories.reduce((sum, story) => {
              let storyCompletedEffort = 0;
              
              const checkCompletion = (item: Story) => {
                  const statusOnDate = getStatusOnDate(item, date);
                  return statusOnDate === doneColumnName ? (item.estimatedHours || 0) : 0;
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

          idealBurnup = index * idealDailyBurnup;
          
          return {
              date: format(date, 'dd/MM'),
              completed: today && date <= today ? completedEffortOnDate : null,
              ideal: idealBurnup > totalScope ? totalScope : idealBurnup,
              scope: totalScope,
          }
      });
  }, [selectedReleaseId, releases, stories, subItemsByStoryId, testDate]);

  const itemStats = useMemo(() => {
    const stats = {
        stories: { total: 0, completed: 0 },
        featureChanges: { total: 0, completed: 0, totalHours: 0 },
        tasks: { total: 0, completed: 0 },
        bugs: { total: 0, completed: 0 },
    };

    stories.forEach(story => {
        const isCompleted = story.status === 'Done';
        switch (story.itemType) {
            case 'Requirement/Story':
                stats.stories.total++;
                if (isCompleted) stats.stories.completed++;
                break;
            case 'Feature Change':
                stats.featureChanges.total++;
                stats.featureChanges.totalHours += story.estimatedHours || 0;
                if (isCompleted) stats.featureChanges.completed++;
                break;
            case 'Task':
            case 'Sub Task':
                stats.tasks.total++;
                if (isCompleted) stats.tasks.completed++;
                break;
            case 'Bug':
                stats.bugs.total++;
                if (isCompleted) stats.bugs.completed++;
                break;
        }
    });
    return stats;
  }, [stories]);

    const getCompletionDesc = (total: number, completed: number) => {
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        return `${percentage}% complete`;
    };


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="Development Dashboard" description="Overview of the project's development progress." />
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Stories" value={itemStats.stories.total.toString()} icon={BookOpen} description={getCompletionDesc(itemStats.stories.total, itemStats.stories.completed)} />
        <StatsCard 
            title="Feature Changes" 
            value={itemStats.featureChanges.total.toString()} 
            icon={GitCommit} 
            description={`${getCompletionDesc(itemStats.featureChanges.total, itemStats.featureChanges.completed)} | ${itemStats.featureChanges.totalHours}h Total`}
        />
        <StatsCard title="Tasks" value={itemStats.tasks.total.toString()} icon={CheckSquare} description={getCompletionDesc(itemStats.tasks.total, itemStats.tasks.completed)} />
        <StatsCard title="Bugs" value={itemStats.bugs.total.toString()} icon={Bug} description={getCompletionDesc(itemStats.bugs.total, itemStats.bugs.completed)} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Sprint Burndown</CardTitle>
              <div className="grid gap-2 w-[200px]">
                  <Label htmlFor="sprint-filter" className="sr-only">Select Sprint</Label>
                  <Select value={selectedSprintId} onValueChange={setSelectedSprintId}>
                      <SelectTrigger id="sprint-filter" className="h-8">
                          <SelectValue placeholder="Select a sprint" />
                      </SelectTrigger>
                      <SelectContent>
                          {sprints.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                      </SelectContent>
                  </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[300px]">
             {burndownData.length > 0 ? (
                <ChartContainer config={burndownChartConfig} className="h-full w-full">
                    <LineChart data={burndownData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => format(new Date(value), 'dd/MM')} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                        <ChartTooltip cursor={true} content={<ChartTooltipContent />} />
                        <Line dataKey="remaining" type="monotone" stroke="var(--color-remaining)" strokeWidth={2} dot={false} name="Remaining Effort" connectNulls={false} />
                        <Line dataKey="ideal" type="monotone" stroke="var(--color-ideal)" strokeWidth={2} dot={false} strokeDasharray="3 3" name="Ideal Burndown" />
                    </LineChart>
                </ChartContainer>
            ) : <p className="text-center text-muted-foreground">Select a sprint with dates to view burndown.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
             <div className="flex justify-between items-center">
              <CardTitle>Release Burnup</CardTitle>
              <div className="grid gap-2 w-[200px]">
                  <Label htmlFor="release-filter" className="sr-only">Select Release</Label>
                  <Select value={selectedReleaseId} onValueChange={setSelectedReleaseId}>
                      <SelectTrigger id="release-filter" className="h-8">
                          <SelectValue placeholder="Select a release" />
                      </SelectTrigger>
                      <SelectContent>
                          {releases.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                      </SelectContent>
                  </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[300px]">
            {burnupData.length > 0 ? (
                <ChartContainer config={burnupChartConfig} className="h-full w-full">
                    <LineChart data={burnupData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} domain={[0, burnupData[0]?.scope || 'auto']} />
                        <ChartTooltip cursor={true} content={<ChartTooltipContent />} />
                        <ReferenceLine y={burnupData[0]?.scope} label={{ value: "Scope", position: 'insideRight', dy: -5 }} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                        <Line dataKey="completed" type="monotone" stroke="var(--color-completed)" strokeWidth={2} dot={false} connectNulls={false} />
                        <Line dataKey="ideal" type="monotone" stroke="var(--color-ideal)" strokeWidth={2} dot={false} />
                    </LineChart>
                </ChartContainer>
            ) : <p className="text-center text-muted-foreground">Select a release with dates to view burnup.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
