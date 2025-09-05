
'use client';

import { useMemo } from 'react';
import { type Release } from '@/types';
import { eachDayOfInterval, format, differenceInDays, parseISO, startOfDay, addDays, getDaysInMonth, startOfMonth, endOfMonth } from 'date-fns';
import { Card, CardContent } from './ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

const COLORS = [
  '#dc2626', '#f59e0b', '#16a34a', '#3b82f6', '#9333ea', 
  '#db2777', '#f43f5e', '#ea580c', '#65a30d', '#2563eb'
];

export function ReleaseGanttChart({ releases: allItems }: { releases: Release[] }) {

  const { chartData, months, todayOffset } = useMemo(() => {
    const releases = allItems.filter(item => item.itemType === 'Release' && item.startDate && item.endDate)
        .sort((a,b) => parseISO(a.startDate!).getTime() - new Date(b.startDate!).getTime());
    
    if (allItems.filter(i => i.startDate || i.milestoneDate).length === 0) {
      return { chartData: [], months: [], totalDays: 0, todayOffset: 0, milestones: [] };
    }

    const stages = allItems.filter(item => item.itemType === 'Stage' && item.startDate && item.endDate);
    const milestones = allItems.filter(item => item.itemType === 'Milestone' && item.milestoneDate);

    const allDates = allItems
        .flatMap(item => [item.startDate, item.endDate, item.milestoneDate])
        .filter(Boolean)
        .map(dateStr => parseISO(dateStr!));
    
    if (allDates.length === 0) {
      allDates.push(new Date()); // Default to today if no dates
    }
    
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

    const chartStartDate = startOfDay(addDays(startOfMonth(minDate), -7));
    const chartEndDate = startOfDay(addDays(endOfMonth(maxDate), 7));

    const totalDays = differenceInDays(chartEndDate, chartStartDate);
    const today = startOfDay(new Date());
    const todayOffset = differenceInDays(today, chartStartDate);

    const chartData = releases.map((release, index) => {
        const releaseStart = parseISO(release.startDate!);
        const releaseEnd = parseISO(release.endDate!);

        const startOffset = differenceInDays(releaseStart, chartStartDate);
        const duration = differenceInDays(releaseEnd, releaseStart) + 1;
        
        const releaseStages = stages.filter(s => s.parentReleaseId === release.id)
            .map((stage, stageIndex) => {
                const stageStart = parseISO(stage.startDate!);
                const stageEnd = parseISO(stage.endDate!);
                const stageStartOffset = differenceInDays(stageStart, chartStartDate);
                const stageDuration = differenceInDays(stageEnd, stageStart) + 1;
                return {
                    ...stage,
                    startOffset: (stageStartOffset / totalDays) * 100,
                    duration: (stageDuration / totalDays) * 100,
                    color: COLORS[(index + stageIndex + 1) % COLORS.length]
                }
            });

        const releaseMilestones = milestones
            .filter(m => m.parentReleaseId === release.id)
            .map(milestone => {
                const milestoneDate = parseISO(milestone.milestoneDate!);
                const offset = differenceInDays(milestoneDate, chartStartDate);
                return {
                    ...milestone,
                    offset: (offset / totalDays) * 100,
                }
            });

        return {
            ...release,
            startOffset: (startOffset / totalDays) * 100,
            duration: (duration / totalDays) * 100,
            color: COLORS[index % COLORS.length],
            stages: releaseStages,
            milestones: releaseMilestones,
        }
    });

    let currentMonths = [];
    let currentDate = chartStartDate;
    while(currentDate <= chartEndDate) {
        const monthStart = startOfMonth(currentDate);
        const daysInMonth = getDaysInMonth(monthStart);
        const startOffset = differenceInDays(monthStart, chartStartDate);

        currentMonths.push({
            name: format(monthStart, 'MMMM yyyy'),
            offset: (startOffset / totalDays) * 100,
            width: (daysInMonth / totalDays) * 100,
        });

        currentDate = addDays(monthStart, daysInMonth);
    }

    return { chartData, months: currentMonths, totalDays, todayOffset: (todayOffset / totalDays) * 100 };
  }, [allItems]);


  if (chartData.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No releases with dates found to display in the timeline.</p>;
  }

  return (
    <div className="w-full overflow-x-auto">
        <div className="relative pt-12 pb-4 min-w-[1200px]" style={{ minHeight: `${chartData.length * 6 + 10}rem` }}>
             {/* Background Grid Lines */}
            <div className="absolute top-0 left-0 w-full h-full">
                {months.map((month, index) => (
                    <div key={index} className="absolute top-0 bottom-0 border-l border-dashed" style={{ left: `${month.offset}%` }}></div>
                ))}
            </div>

            {/* Months Header */}
            <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm">
                <div className="relative h-8 flex border-b">
                    {months.map(month => (
                        <div key={month.name} className="flex-shrink-0 border-l flex items-center justify-center" style={{ width: `${month.width}%`}}>
                            <span className="font-semibold text-sm">{month.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Today Marker */}
            {todayOffset >= 0 && todayOffset <= 100 && (
                <div className="absolute top-8 bottom-0 w-0.5 bg-red-500 z-10" style={{ left: `${todayOffset}%` }}>
                    <div className="absolute -top-6 -translate-x-1/2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded">TODAY</div>
                </div>
            )}

            {/* Release Rows */}
            <div className="relative mt-4 space-y-12">
                {chartData.map((release, index) => (
                    <div key={release.id} className="relative h-10">
                        {/* Main Release Bar Container */}
                         <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div 
                                        className="absolute h-8 rounded-md flex items-center justify-between px-3" 
                                        style={{ left: `${release.startOffset}%`, width: `${release.duration}%`, top: 4 }}
                                    >
                                        <p className="font-bold text-sm text-foreground truncate">{release.name}</p>
                                        <p className="text-xs text-muted-foreground truncate ml-4">{format(parseISO(release.startDate!), 'MMM d')} - {format(parseISO(release.endDate!), 'MMM d')}</p>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="font-bold">{release.name}</p>
                                    <p>{format(parseISO(release.startDate!), 'PPP')} - {format(parseISO(release.endDate!), 'PPP')}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        {/* Stages */}
                        {release.stages.map(stage => (
                             <TooltipProvider key={stage.id}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div 
                                            className="absolute h-8 rounded-md flex items-center justify-center px-2 text-white text-xs font-semibold overflow-hidden" 
                                            style={{ left: `${stage.startOffset}%`, width: `${stage.duration}%`, backgroundColor: stage.color, top: 4 }}
                                        >
                                           <span className="truncate">{stage.name}</span>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="font-bold">{stage.name}</p>
                                        <p>{format(parseISO(stage.startDate!), 'PPP')} - {format(parseISO(stage.endDate!), 'PPP')}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ))}

                        {/* Milestones for this release */}
                        {release.milestones.map(milestone => (
                            <TooltipProvider key={milestone.id}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="absolute" style={{ left: `calc(${milestone.offset}% - 8px)`, top: '2.5rem' }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-primary">
                                                <path d="M12 2L2 12l10 10 10-10L12 2z"/>
                                            </svg>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="font-bold">{milestone.name}</p>
                                        <p>{format(parseISO(milestone.milestoneDate!), 'PPP')}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
}
