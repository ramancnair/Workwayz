
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
  remaining: { label: "Remaining Effort", color: "hsl(var(--primary))" },
  ideal: { label: "Ideal Burndown", color: "hsl(var(--muted-foreground))" },
} satisfies ChartConfig;

const burnupChartConfig = {
  completed: { label: "Completed Work", color: "hsl(142 70% 45%)" },
  ideal: { label: "Ideal Burnup", color: "hsl(var(--primary))" },
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

/**
 * Determines whether a work item is considered "done" on a given date.
 *
 * This is more robust than a simple getStatusOnDate equality check because it
 * handles legacy/corrupted data where statusHistory uses old status names
 * (e.g. 'In Development') that don't match the current Kanban done-column name.
 *
 * Resolution order:
 * 1. If the item's statusHistory shows doneStatus on or before targetDate → Done.
 * 2. If item.status === doneStatus (currently Done) but history never recorded the
 *    Done transition (legacy data), we find the effective Done date as the date of
 *    the last history entry, and consider it Done from that date onward.
 * 3. Parent-status inference: if a parent story is Done per the above rules,
 *    sub-items inherit that completion (supports 'parent moved to Done on Kanban'
 *    without individually updating every sub-task).
 */
const isItemDoneOnDate = (
    item: Story,
    targetDate: Date,
    doneStatus: string,
    allStories: Story[]
): boolean => {
    // ── Rule 1: explicit Done entry in statusHistory ──────────────────────────
    const statusOnDate = getStatusOnDate(item, targetDate);
    if (statusOnDate === doneStatus) return true;

    // ── Rule 2: item is currently Done but history uses legacy status names ───
    if (item.status === doneStatus) {
        const sortedHistory = [...(item.statusHistory || [])].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        // Find the earliest explicit Done entry (may not exist for legacy data)
        const doneEntry = sortedHistory.find(h => h.toStatus === doneStatus);
        const effectiveDoneDate = doneEntry
            ? startOfDay(new Date(doneEntry.date))
            // No Done entry → treat the last history transition date as the Done date
            // (conservative: the story was "as good as Done" after its last recorded move)
            : sortedHistory.length > 0
                ? startOfDay(new Date(sortedHistory[sortedHistory.length - 1].date))
                : new Date(0); // No history at all → always Done
        if (effectiveDoneDate <= startOfDay(targetDate)) return true;
    }

    // ── Rule 3: parent-status inference ──────────────────────────────────────
    if (item.parentStoryId) {
        const parent = allStories.find(s => s.id === item.parentStoryId);
        if (parent) {
            return isItemDoneOnDate(parent, targetDate, doneStatus, allStories);
        }
    }

    return false;
};

export default function DevelopmentDashboard() {
  const { stories, sprints, releasesAndMilestones, holidays, weeklyOffDays, testDate, kanbanColumns } = useProject();
  
  const doneColumnName = useMemo(() => kanbanColumns.find(c => c.isDoneColumn)?.name || 'Done', [kanbanColumns]);
  
  const [selectedSprintId, setSelectedSprintId] = useState<string | undefined>();
  const [selectedReleaseId, setSelectedReleaseId] = useState<string | undefined>();
  
  const validSprints = useMemo(() => sprints.filter(s => s && s.id && typeof s.id === 'string' && s.id.trim() !== ''), [sprints]);
  const releases = useMemo(() => releasesAndMilestones.filter(r => r && r.itemType === 'Release' && r.id && typeof r.id === 'string' && r.id.trim() !== ''), [releasesAndMilestones]);

  useEffect(() => {
      const currentSprint = validSprints.find(s => s.isCurrent);
      if (currentSprint) {
          setSelectedSprintId(currentSprint.id);
      } else if (validSprints.length > 0) {
          setSelectedSprintId(validSprints[0].id);
      }
  }, [validSprints]);

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
      const sprint = validSprints.find(s => s.id === selectedSprintId);
      if (!sprint || !sprint.startDate || !sprint.endDate) return [];
      
      const today = startOfDay(testDate ?? new Date());
      const sprintStories = stories.filter(story => story.sprintId === sprint.id && !story.isDeleted);
      
      const isLeafOrStandaloneInSprint = (item: Story) => {
          if (['Story', 'User Story', 'Requirement/Story', 'Feature Change'].includes(item.itemType)) {
              const sprintSubItems = subItemsByStoryId[item.id]?.filter(si => si.sprintId === sprint.id && !si.isDeleted) || [];
              return sprintSubItems.length === 0;
          }
          return true;
      };

      const totalEffort = sprintStories.reduce((sum, story) => {
          if (isLeafOrStandaloneInSprint(story)) {
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
              if (isLeafOrStandaloneInSprint(story)) {
                  const isCompleted = isItemDoneOnDate(story, date, doneColumnName, stories);
                  return sum + (isCompleted ? (story.estimatedHours || 0) : 0);
              }
              return sum;
          }, 0);
              
          const remaining = totalEffort - completedEffortOnDate;
          
          const isWorkingDay = workingDays.some(wd => isSameDay(wd, date));
          if (isWorkingDay && date >= sprintStart) {
              idealEffort -= idealDailyBurn;
          }
          
          return {
              date: format(date, 'dd/MM'),
              remaining: today && date <= today ? (remaining < 0 ? 0 : remaining) : null,
              ideal: idealEffort < 0 ? 0 : idealEffort,
          }
      });
  }, [selectedSprintId, validSprints, stories, holidays, weeklyOffDays, subItemsByStoryId, testDate, doneColumnName]);

  const burnupData = useMemo(() => {
      const release = releases.find(r => r.id === selectedReleaseId);
      if(!release || !release.startDate || !release.endDate) return [];
      
      const today = startOfDay(testDate ?? new Date());
      const releaseStories = stories.filter(s => s.releaseId === release.id && !s.isDeleted);
      
      const isLeafOrStandaloneInRelease = (item: Story) => {
          if (['Story', 'User Story', 'Requirement/Story', 'Feature Change'].includes(item.itemType)) {
              const releaseSubItems = subItemsByStoryId[item.id]?.filter(si => si.releaseId === release.id && !si.isDeleted) || [];
              return releaseSubItems.length === 0;
          }
          return true;
      };

      const totalScope = releaseStories.reduce((sum, story) => {
          if (isLeafOrStandaloneInRelease(story)) {
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
              if (isLeafOrStandaloneInRelease(story)) {
                  const isCompleted = isItemDoneOnDate(story, date, doneColumnName, stories);
                  return sum + (isCompleted ? (story.estimatedHours || 0) : 0);
              }
              return sum;
          }, 0);

          idealBurnup = index * idealDailyBurnup;
          
          return {
              date: format(date, 'dd/MM'),
              completed: today && date <= today ? completedEffortOnDate : null,
              ideal: idealBurnup > totalScope ? totalScope : idealBurnup,
              scope: totalScope,
          }
      });
  }, [selectedReleaseId, releases, stories, subItemsByStoryId, testDate, doneColumnName]);

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
            case 'Story':
            case 'User Story':
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
                          {validSprints.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
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
                        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                        <ChartTooltip cursor={true} content={<ChartTooltipContent />} />
                        <Line dataKey="remaining" type="monotone" stroke="var(--color-remaining, hsl(var(--primary)))" strokeWidth={2.5} dot={false} name="Remaining Effort" connectNulls={false} />
                        <Line dataKey="ideal" type="monotone" stroke="var(--color-ideal, hsl(var(--muted-foreground)))" strokeWidth={2} dot={false} strokeDasharray="3 3" name="Ideal Burndown" />
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
                        <Line dataKey="completed" type="monotone" stroke="var(--color-completed, hsl(142 70% 45%))" strokeWidth={2.5} dot={false} name="Completed Work" connectNulls={false} />
                        <Line dataKey="ideal" type="monotone" stroke="var(--color-ideal, hsl(var(--primary)))" strokeWidth={2} dot={false} strokeDasharray="3 3" name="Ideal Burnup" />
                    </LineChart>
                </ChartContainer>
            ) : <p className="text-center text-muted-foreground">Select a release with dates to view burnup.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
