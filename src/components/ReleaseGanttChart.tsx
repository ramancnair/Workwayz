
'use client';

import { useMemo } from 'react';
import { type Release } from '@/types';
import {
  eachDayOfInterval,
  format,
  differenceInDays,
  parseISO,
  startOfWeek,
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

        const chartStartDate = startOfWeek(addDays(minDate, -14), { weekStartsOn: 1 });
        const chartEndDate = startOfWeek(addDays(maxDate, 14), { weekStartsOn: 1 });
        
        const totalDays = differenceInDays(chartEndDate, chartStartDate) + 1;
        
        const months = [];
        let currentMonth = new Date(chartStartDate);
        while (currentMonth <= chartEndDate) {
            const startOfMonth = new Date(currentMonth);
            const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
            const daysInMonth = differenceInDays(endOfMonth, startOfMonth) + 1;
            months.push({
                name: format(currentMonth, 'MMMM yyyy'),
                width: (daysInMonth / totalDays) * 100,
            });
            currentMonth.setMonth(currentMonth.getMonth() + 1);
        }

        const weeks = [];
        currentDate = new Date(chartStartDate);
        while (currentDate <= chartEndDate) {
            const weekEnd = addDays(currentDate, 6);
             weeks.push({
                name: format(currentDate, 'd'),
                isSunday: currentDate.getDay() === 0,
            });
            currentDate = addDays(currentDate, 7);
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
                chartEndDate,
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

    return (
        <div className="w-full text-sm border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[250px_1fr] bg-muted/50">
                <div className="p-4 font-semibold border-r">Timeline</div>
                <div className="relative">
                    <div className="flex border-b">
                        {months.map((month, index) => (
                            <div key={index} className="p-2 text-center font-semibold text-xs" style={{ width: `${month.width}%`}}>
                                {month.name}
                            </div>
                        ))}
                    </div>
                     <div className="flex h-8">
                        {weeks.map((week, index) => (
                            <div key={index} className="flex-1 text-center text-xs text-muted-foreground border-r pt-1">
                                <span className={cn(week.isSunday && "font-bold text-foreground")}>
                                    {week.name}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Body */}
             <div className="grid grid-cols-[250px_1fr]">
                {/* Left Column: Release & Stage Names */}
                <div className="border-r">
                   {chartData.map((release, index) => (
                        <div key={release.id} className="border-b last:border-b-0">
                            <div className="p-2 bg-muted/30 font-bold text-primary flex items-center gap-2">
                               {release.isCompleted && <CheckCircle className="h-4 w-4 text-green-500"/>}
                               <span>{release.name}</span>
                            </div>
                            <div className="space-y-1 p-2">
                            {release.stages.map(stage => (
                                <div key={stage.id} className="h-8 flex items-center text-xs pl-2">{stage.name}</div>
                            ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right Column: Timeline Bars */}
                <div className="relative">
                    {/* Vertical Lines for Weeks */}
                    <div className="absolute inset-0 flex">
                        {weeks.map((_, index) => (
                            <div key={index} className="flex-1 border-r last:border-r-0"></div>
                        ))}
                    </div>
                    {/* Today Marker */}
                    {isTodayVisible && (
                        <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10" style={{ left: `${(todayOffset / totalDays) * 100}%` }}></div>
                    )}
                    
                    {/* Timeline Data */}
                     <div className="relative z-0">
                        {chartData.map((release, index) => (
                            <div key={release.id} className="relative border-b last:border-b-0">
                                <div className="h-10"></div>
                                <div className="space-y-1 p-2">
                                {release.stages.map((stage, stageIndex) => (
                                    <div key={stage.id} className="relative h-8 flex items-center">
                                         <div 
                                            className="absolute h-6 top-1 rounded-md flex items-center px-2 text-white font-semibold text-xs"
                                            style={{
                                                left: `${getOffset(stage.startDate!)}%`,
                                                width: `${getWidth(stage.startDate!, stage.endDate!)}%`,
                                                backgroundColor: COLORS[(index + stageIndex) % COLORS.length]
                                            }}
                                         >
                                            <span className="truncate">{stage.name}</span>
                                        </div>
                                    </div>
                                ))}
                                </div>
                            </div>
                        ))}
                    </div>

                     {/* Status column */}
                    <div className="absolute top-0 right-0 h-full w-[100px] bg-background/80 backdrop-blur-sm border-l">
                         <div className="p-4 font-semibold text-center border-b h-[73px] flex items-center justify-center">Status</div>
                        {chartData.map((release) => (
                            <div key={release.id} className="relative border-b last:border-b-0">
                               <div className="h-10 flex items-center justify-center">
                                    <div className={cn("h-3 w-3 rounded-full", release.isCompleted ? 'bg-green-500' : 'bg-gray-300')} />
                               </div>
                               <div className="space-y-1 p-2">
                                  {release.stages.map(stage => (
                                    <div key={stage.id} className="h-8 flex items-center justify-center">
                                        <div className={cn("h-3 w-3 rounded-full", stage.isCompleted ? 'bg-green-500' : 'bg-gray-300')} />
                                    </div>
                                  ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
