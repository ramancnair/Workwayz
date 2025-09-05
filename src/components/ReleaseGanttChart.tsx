
'use client';

import { useMemo } from 'react';
import { type Release } from '@/types';
import {
  eachDayOfInterval,
  format,
  differenceInDays,
  parseISO,
  startOfWeek,
  endOfWeek,
  addDays,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { CheckCircle } from 'lucide-react';

const COLORS = [
  '#6366F1', // Indigo
  '#34D399', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#A855F7', // Purple
  '#EC4899', // Pink
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
        const stages = allItems.filter(item => item.itemType === 'Stage' && item.startDate && item.endDate && item.parentReleaseId);
        
        const allDatedItems = [...releases, ...stages];
        if (allDatedItems.length === 0) {
            return { chartData: [], dateInfo: null };
        }

        const allDates = allDatedItems.flatMap(item => [item.startDate, item.endDate]).filter(Boolean).map(d => parseISO(d!));
        if (allDates.length === 0) {
            return { chartData: [], dateInfo: null };
        }
        
        const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

        const chartStartDate = startOfWeek(addDays(minDate, -7), { weekStartsOn: 1 });
        const chartEndDate = endOfWeek(addDays(maxDate, 7), { weekStartsOn: 1 });
        
        const totalDays = differenceInDays(chartEndDate, chartStartDate) + 1;

        const dateTicks = [];
        let currentDate = chartStartDate;
        while(currentDate <= chartEndDate) {
            dateTicks.push(currentDate);
            currentDate = addDays(currentDate, 10);
        }

        const todayOffset = differenceInDays(today, chartStartDate);

        const releaseGroups = releases.map(release => ({
            ...release,
            stages: stages
                .filter(s => s.parentReleaseId === release.id)
                .sort((a, b) => parseISO(a.startDate!).getTime() - parseISO(b.startDate!).getTime()),
        })).sort((a,b) => parseISO(a.startDate!).getTime() - parseISO(b.startDate!).getTime());
        

        return {
            chartData: releaseGroups,
            dateInfo: {
                chartStartDate,
                totalDays,
                dateTicks,
                todayOffset,
                isTodayVisible: today >= chartStartDate && today <= chartEndDate,
            },
        };
    }, [allItems, today]);

    if (!dateInfo) {
        return <p className="text-muted-foreground text-center py-8">No releases with dates found to display in the timeline.</p>;
    }
    
    const { chartStartDate, totalDays, dateTicks, todayOffset, isTodayVisible } = dateInfo;

    const getOffset = (dateStr: string) => {
        if(!dateStr) return 0;
        return (differenceInDays(parseISO(dateStr), chartStartDate) / totalDays) * 100;
    };
    
    const getWidth = (startDateStr: string, endDateStr: string) => {
        if(!startDateStr || !endDateStr) return 0;
        const duration = differenceInDays(parseISO(endDateStr), parseISO(startDateStr)) + 1;
        return (duration / totalDays) * 100;
    };

    return (
        <div className="w-full text-sm">
            {/* Header */}
            <div className="grid grid-cols-[250px_1fr_100px] items-center bg-muted/50 rounded-t-lg">
                <div className="p-4 font-semibold">Timeline</div>
                <div className="relative h-full border-x">
                    <div className="flex justify-between items-center h-full px-2">
                    {dateTicks.map((tick, index) => (
                        <div key={index} className="text-center text-xs text-muted-foreground">
                            {format(tick, 'd MMM')}
                        </div>
                    ))}
                    </div>
                </div>
                <div className="p-4 font-semibold text-center">Status</div>
            </div>

            {/* Body */}
            <div className="relative">
                <div className="grid grid-cols-[250px_1fr_100px]">
                    <div className="border-r"></div>
                    <div className="grid grid-cols-1 relative">
                        {/* Vertical Lines */}
                        {dateTicks.map((tick, index) => (
                           <div key={index} className="absolute h-full border-r" style={{ left: `${(differenceInDays(tick, chartStartDate)/totalDays) * 100}%`}}></div>
                        ))}
                    </div>
                    <div className="border-l"></div>
                </div>

                {chartData.map((release, index) => (
                    <div key={release.id} className="grid grid-cols-[250px_1fr_100px] items-start border-b">
                        {/* Left Column: Release & Stage Names */}
                        <div className="p-4 border-r">
                            <div className="font-bold text-primary mb-2">{release.name}</div>
                            <div className="space-y-4 pl-2">
                            {release.stages.map(stage => (
                                <div key={stage.id} className="h-8 flex items-center">{stage.name}</div>
                            ))}
                            </div>
                        </div>

                        {/* Middle Column: Timeline Bars */}
                        <div className="relative h-full">
                             {release.stages.map((stage, stageIndex) => (
                                <div key={stage.id} className="relative h-8 my-4">
                                     <div 
                                        className="absolute h-6 top-1 rounded-full flex items-center px-2"
                                        style={{
                                            left: `${getOffset(stage.startDate!)}%`,
                                            width: `${getWidth(stage.startDate!, stage.endDate!)}%`,
                                            backgroundColor: COLORS[(index + stageIndex) % COLORS.length]
                                        }}
                                     >
                                     </div>
                                </div>
                            ))}
                        </div>

                        {/* Right Column: Status */}
                        <div className="p-4 border-l">
                            <div className="h-8 flex items-center justify-center">
                                {/* Release status can be calculated here */}
                            </div>
                            <div className="space-y-4">
                                {release.stages.map(stage => (
                                    <div key={stage.id} className="h-8 flex items-center justify-center">
                                        <div className={cn("h-3 w-3 rounded-full", stage.isCompleted ? 'bg-green-500' : 'bg-gray-300')} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
                
                {isTodayVisible && (
                  <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10" style={{ left: `calc(250px + ${(todayOffset / totalDays)} * (100% - 350px))` }}>
                  </div>
                )}
            </div>
        </div>
    );
}
