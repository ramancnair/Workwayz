
'use client';

import { useMemo } from 'react';
import { type Release } from '@/types';
import { eachDayOfInterval, format, differenceInDays, parseISO, startOfDay, addDays, getDaysInMonth, startOfMonth, endOfMonth, eachWeekOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { Card, CardContent } from './ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

const COLORS = [
  '#dc2626', '#f59e0b', '#16a34a', '#3b82f6', '#9333ea', 
  '#db2777', '#f43f5e', '#ea580c', '#65a30d', '#2563eb'
];

export function ReleaseGanttChart({ releases: allItems }: { releases: Release[] }) {

  const { chartData, months, weeks, todayOffset, totalRows } = useMemo(() => {
    const releases = allItems.filter(item => item.itemType === 'Release' && item.startDate && item.endDate)
        .sort((a,b) => parseISO(a.startDate!).getTime() - new Date(b.startDate!).getTime());
    
    if (allItems.filter(i => i.startDate || i.milestoneDate).length === 0) {
      return { chartData: [], months: [], weeks: [], totalDays: 0, todayOffset: 0, totalRows: 0 };
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

    const chartStartDate = startOfDay(addDays(startOfMonth(minDate), -14));
    const chartEndDate = startOfDay(addDays(endOfMonth(maxDate), 14));

    const totalDays = differenceInDays(chartEndDate, chartStartDate);
    const today = startOfDay(new Date());
    const todayOffset = differenceInDays(today, chartStartDate);
    
    let currentTotalRows = 0;

    const chartData = releases.map((release, index) => {
        const releaseStart = parseISO(release.startDate!);
        const releaseEnd = parseISO(release.endDate!);

        const startOffset = differenceInDays(releaseStart, chartStartDate);
        const duration = differenceInDays(releaseEnd, releaseStart) + 1;
        
        const releaseStages = stages
            .filter(s => s.parentReleaseId === release.id)
            .sort((a,b) => parseISO(a.startDate!).getTime() - new Date(b.startDate!).getTime())
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
        
        currentTotalRows += 1 + releaseStages.length;

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
    let currentDateIterator = chartStartDate;
    while(currentDateIterator <= chartEndDate) {
        const monthStart = startOfMonth(currentDateIterator);
        const daysInMonth = getDaysInMonth(monthStart);
        const startOffset = differenceInDays(monthStart, chartStartDate);

        if(startOffset >= 0 && startOffset < totalDays) {
            currentMonths.push({
                name: format(monthStart, 'MMMM yyyy'),
                offset: (startOffset / totalDays) * 100,
                width: (daysInMonth / totalDays) * 100,
            });
        }
        currentDateIterator = addDays(monthStart, daysInMonth);
    }
    
    const weekIntervals = eachWeekOfInterval(
        { start: chartStartDate, end: chartEndDate },
        { weekStartsOn: 0 } // Sunday
    );

    const currentWeeks = weekIntervals.map(weekStart => {
        const startOffset = differenceInDays(weekStart, chartStartDate);
        return {
            name: format(weekStart, 'd'),
            offset: (startOffset / totalDays) * 100,
            width: (7 / totalDays) * 100,
        };
    });

    return { chartData, months: currentMonths, weeks: currentWeeks, todayOffset: (todayOffset / totalDays) * 100, totalRows: currentTotalRows };
  }, [allItems]);


  if (chartData.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No releases with dates found to display in the timeline.</p>;
  }

  const rowHeight = 40;
  const rowGap = 16;
  const headerHeight = 80;

  return (
    <div className="w-full overflow-x-auto">
        <div className="relative pt-12 pb-4 min-w-[1800px]" style={{ minHeight: `${totalRows * (rowHeight + rowGap) + headerHeight}px` }}>
            {/* Background Grid Lines */}
            <div className="absolute top-0 left-0 w-full h-full">
                {weeks.map((week, index) => (
                    <div key={index} className="absolute top-0 bottom-0 border-l border-dashed" style={{ left: `${week.offset}%` }}></div>
                ))}
            </div>

            {/* Months and Weeks Header */}
            <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm" style={{ height: `${headerHeight}px` }}>
                {/* Months Row */}
                <div className="relative h-10 flex border-b">
                    {months.map(month => (
                        <div key={month.name} className="flex-shrink-0 border-l flex items-center justify-center" style={{ width: `${month.width}%`}}>
                            <span className="font-semibold text-sm">{month.name}</span>
                        </div>
                    ))}
                </div>
                {/* Weeks Row */}
                <div className="relative h-10 flex border-b">
                    {weeks.map(week => (
                        <div key={week.name + week.offset} className="flex-shrink-0 border-l flex items-center justify-center" style={{ width: `${week.width}%`}}>
                            <span className="text-xs text-muted-foreground">{week.name}</span>
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
            <div className="relative mt-4">
              {chartData.map((release, releaseIndex) => {
                let cumulativeHeight = 0;
                if(releaseIndex > 0) {
                  for (let i = 0; i < releaseIndex; i++) {
                     cumulativeHeight += (1 + chartData[i].stages.length) * (rowHeight + rowGap);
                  }
                }
                
                return (
                  <div key={release.id} className="relative" style={{ top: `${cumulativeHeight}px`, height: `${(1 + release.stages.length) * (rowHeight + rowGap)}px`}}>
                      {/* Main Release Bar Container */}
                        <TooltipProvider>
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <div 
                                      className="absolute h-8 rounded-md flex items-center justify-between px-3 bg-muted/80 border-l-4" 
                                      style={{ 
                                        left: `${release.startOffset}%`, 
                                        width: `${release.duration}%`, 
                                        top: 0,
                                        borderColor: release.color,
                                      }}
                                  >
                                      <p className="font-bold text-sm text-foreground truncate">{release.name}</p>
                                  </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                  <p className="font-bold">{release.name}</p>
                                  <p>{format(parseISO(release.startDate!), 'PPP')} - {format(parseISO(release.endDate!), 'PPP')}</p>
                              </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {/* Stages */}
                        {release.stages.map((stage, stageIndex) => (
                           <TooltipProvider key={stage.id}>
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                      <div 
                                          className="absolute h-8 rounded-md flex items-center justify-center px-2 text-white text-xs font-semibold overflow-hidden" 
                                          style={{ 
                                            left: `${stage.startOffset}%`, 
                                            width: `${stage.duration}%`, 
                                            backgroundColor: stage.color, 
                                            top: `${(stageIndex + 1) * (rowHeight + rowGap)}px` 
                                          }}
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
                                        <div className="absolute" style={{ left: `calc(${milestone.offset}% - 8px)`, top: `${rowHeight - 8}px` }}>
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
                )
              })}
            </div>
        </div>
    </div>
  );
}
