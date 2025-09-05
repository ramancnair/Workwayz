
'use client';

import { useMemo } from 'react';
import { type Release } from '@/types';
import {
  eachDayOfInterval,
  format,
  differenceInDays,
  parseISO,
  startOfMonth,
  endOfMonth,
  getDaysInMonth,
  startOfWeek,
  eachWeekOfInterval,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { Flag, Pin } from 'lucide-react';

// A professional color palette
const COLORS = [
  '#00A1E0', // Bright Blue
  '#64C5B1', // Teal
  '#F5A623', // Orange
  '#F8E71C', // Yellow
  '#7ED321', // Green
  '#BD10E0', // Purple
  '#4A90E2', // Sky Blue
  '#D0021B', // Red
];

// Custom hook to get a "Today" date that updates only once on component mount
const useToday = () => {
    const todayRef = useMemo(() => new Date(), []);
    return todayRef;
};

export function ReleaseGanttChart({ releases: allItems }: { releases: Release[] }) {
    const today = useToday();

    const { chartData, dateInfo } = useMemo(() => {
        const releases = allItems.filter(item => item.itemType === 'Release' && item.startDate && item.endDate);
        const stages = allItems.filter(item => item.itemType === 'Stage' && item.startDate && item.endDate);
        const milestones = allItems.filter(item => item.itemType === 'Milestone' && item.milestoneDate);

        const allDatedItems = [...releases, ...stages, ...milestones];
        if (allDatedItems.length === 0) {
            return { chartData: { releases: [], stages: [], milestones: [] }, dateInfo: null };
        }

        const allDates = allDatedItems.flatMap(item => [item.startDate, item.endDate, item.milestoneDate]).filter(Boolean).map(d => parseISO(d!));
        if (allDates.length === 0) {
            return { chartData: { releases: [], stages: [], milestones: [] }, dateInfo: null };
        }

        const chartStartDate = startOfWeek(startOfMonth(new Date(Math.min(...allDates.map(d => d.getTime())))), { weekStartsOn: 0 });
        const chartEndDate = endOfMonth(new Date(Math.max(...allDates.map(d => d.getTime()))));
        const totalDays = differenceInDays(chartEndDate, chartStartDate) + 1;

        const months = [];
        let currentMonthStart = startOfMonth(chartStartDate);
        while (currentMonthStart <= chartEndDate) {
            months.push({
                name: format(currentMonthStart, 'MMMM yyyy'),
                days: getDaysInMonth(currentMonthStart),
            });
            currentMonthStart = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() + 1, 1);
        }

        const weeks = eachWeekOfInterval(
          { start: chartStartDate, end: chartEndDate },
          { weekStartsOn: 0 } // Sunday
        );

        const todayOffset = differenceInDays(today, chartStartDate);

        return {
            chartData: { releases, stages, milestones },
            dateInfo: {
                chartStartDate,
                totalDays,
                months,
                weeks,
                todayOffset,
                isTodayVisible: today >= chartStartDate && today <= chartEndDate,
            },
        };
    }, [allItems, today]);

    if (!dateInfo) {
        return <p className="text-muted-foreground text-center py-8">No releases with dates found to display in the timeline.</p>;
    }
    
    const { chartStartDate, totalDays, months, weeks, todayOffset, isTodayVisible } = dateInfo;

    const getOffset = (dateStr: string) => {
        if(!dateStr) return 0;
        return (differenceInDays(parseISO(dateStr), chartStartDate) / totalDays) * 100;
    };
    
    const getWidth = (startDateStr: string, endDateStr: string) => {
        if(!startDateStr || !endDateStr) return 0;
        const duration = differenceInDays(parseISO(endDateStr), parseISO(startDateStr)) + 1;
        return (duration / totalDays) * 100;
    };

    const releaseGroups = useMemo(() => {
      const groups: Record<string, { release: Release, stages: Release[], milestones: Release[] }> = {};
      chartData.releases.forEach(r => {
        groups[r.id] = { release: r, stages: [], milestones: [] };
      });
      chartData.stages.forEach(s => {
        if (s.parentReleaseId && groups[s.parentReleaseId]) {
          groups[s.parentReleaseId].stages.push(s);
        }
      });
      chartData.milestones.forEach(m => {
        if (m.parentReleaseId && groups[m.parentReleaseId]) {
          groups[m.parentReleaseId].milestones.push(m);
        }
      });
      return Object.values(groups).sort((a,b) => parseISO(a.release.startDate!).getTime() - parseISO(b.release.startDate!).getTime());
    }, [chartData]);


    return (
      <div className="w-full overflow-x-auto">
        <div className="relative pt-8" style={{ minWidth: `${totalDays * 20}px` }}>

          {/* Header */}
          <div className="sticky top-0 bg-background z-20">
              {/* Month Row */}
              <div className="flex border-b">
                  {months.map((month) => (
                      <div key={month.name} style={{ width: `${(month.days / totalDays) * 100}%` }} className="p-1 text-center text-xs font-semibold border-r">
                          {month.name}
                      </div>
                  ))}
              </div>
              {/* Week Row */}
              <div className="flex border-b">
                  {weeks.map((week, index) => {
                      const weekDuration = differenceInDays(endOfWeek(week, {weekStartsOn: 0}), week) + 1;
                      return (
                           <div key={index} style={{ width: `${(weekDuration / totalDays) * 100}%` }} className="p-1 text-center text-xs text-muted-foreground border-r">
                              {format(week, 'd')}
                          </div>
                      )
                  })}
              </div>
          </div>

          {/* Today Marker */}
          {isTodayVisible && (
              <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10" style={{ left: `${(todayOffset / totalDays) * 100}%` }}>
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs font-bold text-red-500">Today</div>
              </div>
          )}

          {/* Body */}
          <div className="relative space-y-4 pt-4">
              {releaseGroups.map(({ release, stages, milestones }, groupIndex) => (
                  <div key={release.id} className="relative py-2">
                      
                      {/* Release Bar */}
                      <div className="relative h-8 flex items-center" title={release.name}>
                          <div 
                             className="absolute h-full rounded flex items-center px-2 z-0"
                             style={{
                               left: `${getOffset(release.startDate!)}%`,
                               width: `${getWidth(release.startDate!, release.endDate!)}%`,
                               backgroundColor: `${COLORS[groupIndex % COLORS.length]}30`, // semi-transparent
                               border: `1px solid ${COLORS[groupIndex % COLORS.length]}`
                             }}
                          >
                           <span className="font-bold text-sm truncate" style={{color: COLORS[groupIndex % COLORS.length]}}>({release.releaseId}) {release.name}</span>
                          </div>
                      </div>

                      {/* Stages for this release */}
                      <div className="relative mt-1 space-y-1">
                          {stages.sort((a,b) => parseISO(a.startDate!).getTime() - parseISO(b.startDate!).getTime()).map((stage, stageIndex) => (
                            <div key={stage.id} className="relative h-6 flex items-center" title={stage.name}>
                              <div
                                className="absolute h-full rounded flex items-center px-2"
                                style={{
                                  left: `${getOffset(stage.startDate!)}%`,
                                  width: `${getWidth(stage.startDate!, stage.endDate!)}%`,
                                  backgroundColor: COLORS[(groupIndex + stageIndex + 1) % COLORS.length],
                                }}
                              >
                                  <span className="text-white text-xs font-medium truncate">{stage.name}</span>
                              </div>
                            </div>
                          ))}
                      </div>

                      {/* Milestones for this release */}
                      {milestones.map((milestone) => (
                           <div key={milestone.id} className="absolute top-2" style={{ left: `${getOffset(milestone.milestoneDate!)}%`, height: `${2.5 + (stages.length * 1.75)}rem` }}>
                             <div className="relative flex flex-col items-center h-full">
                               <div className="whitespace-nowrap text-center text-xs font-semibold -mt-8 transform -translate-x-1/2">
                                   <p className="truncate max-w-[100px]">{milestone.name}</p>
                               </div>
                               <Pin className="h-4 w-4 text-primary" style={{color: COLORS[groupIndex % COLORS.length]}}/>
                               <div className="w-px flex-1 bg-border border-dashed"></div>
                             </div>
                           </div>
                      ))}
                  </div>
              ))}
          </div>
        </div>
      </div>
    );
}
