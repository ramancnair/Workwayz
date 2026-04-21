
'use client';

import { useMemo, useState } from 'react';
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
import { CheckCircle, ChevronRight, Gem } from 'lucide-react';

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
    const [expandedReleases, setExpandedReleases] = useState<string[]>([]);

    const { chartData, dateInfo } = useMemo(() => {
        const releases = allItems.filter(item => item.itemType === 'Release' && item.startDate && item.endDate);
        const stages = allItems.filter(item => item.itemType === 'Stage' && item.startDate && item.endDate && item.parentReleaseId);
        const milestones = allItems.filter(item => item.itemType === 'Milestone' && item.milestoneDate && item.parentReleaseId);
        
        const allDatedItems = [...releases, ...stages, ...milestones.map(m => ({...m, startDate: m.milestoneDate, endDate: m.milestoneDate}))];
        
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
        const chartEndDate = endOfWeek(addDays(maxDate, 21), { weekStartsOn: 1 });
        
        const totalDays = differenceInDays(chartEndDate, chartStartDate) + 1;
        
        const weeks = [];
        let currentDateForWeeks = new Date(chartStartDate);
        while (currentDateForWeeks < chartEndDate) {
            weeks.push({
                name: format(currentDateForWeeks, 'd'),
                startDate: new Date(currentDateForWeeks),
                isSunday: false,
            });
            currentDateForWeeks = addDays(currentDateForWeeks, 7);
        }

        const totalWeeks = weeks.length;
        const monthsMap = new Map<string, number>();
        
        weeks.forEach(w => {
            const thursday = addDays(w.startDate, 3);
            const monthName = format(thursday, 'MMMM yyyy');
            monthsMap.set(monthName, (monthsMap.get(monthName) || 0) + 1);
        });

        const months = Array.from(monthsMap.entries()).map(([name, weeksCount]) => ({
            name,
            width: (weeksCount / totalWeeks) * 100,
        }));

        const todayOffset = differenceInDays(today, chartStartDate);

        const releaseGroups = releases.map(release => ({
            ...release,
            stages: stages
                .filter(s => s.parentReleaseId === release.id)
                .sort((a, b) => parseISO(a.startDate!).getTime() - parseISO(b.startDate!).getTime()),
            milestones: milestones
                .filter(m => m.parentReleaseId === release.id)
                .sort((a, b) => parseISO(a.milestoneDate!).getTime() - parseISO(b.milestoneDate!).getTime()),
        })).sort((a,b) => parseISO(a.startDate!).getTime() - new Date(b.startDate!).getTime());
        
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

    const toggleRelease = (releaseId: string) => {
        setExpandedReleases(prev => 
            prev.includes(releaseId) 
                ? prev.filter(id => id !== releaseId) 
                : [...prev, releaseId]
        );
    };


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
            <div className="grid grid-cols-[300px_1fr] bg-muted/50 sticky top-0 z-20">
                <div className="p-4 font-semibold border-r">Timeline</div>
                <div className="relative">
                    <div className="flex border-b">
                        {months.map((month, index) => (
                            <div key={index} className="p-2 text-center font-semibold text-xs border-r border-border last:border-r-0" style={{ width: `${month.width}%`}}>
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
             <div className="grid grid-cols-[300px_1fr]">
                {/* Left Column: Release & Stage Names */}
                <div className="border-r">
                   {chartData.map((release) => {
                     const isExpanded = expandedReleases.includes(release.id);
                     return (
                        <div key={release.id} className="border-b last:border-b-0">
                             <div className="p-2 bg-muted/30 font-bold text-primary flex items-center gap-2 cursor-pointer hover:bg-muted" onClick={() => toggleRelease(release.id)}>
                               <ChevronRight className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")} />
                               {release.isCompleted && <CheckCircle className="h-4 w-4 text-green-500"/>}
                               <span>{release.name}</span>
                            </div>
                            {isExpanded && (
                                <div className="space-y-1 p-2">
                                    {release.stages.map(stage => (
                                        <div key={stage.id} className="h-8 flex items-center text-xs pl-4">
                                        {stage.isCompleted && <CheckCircle className="h-3 w-3 mr-2 text-green-500"/>}
                                        <span>{stage.name}</span>
                                        </div>
                                    ))}
                                    {release.milestones.map(milestone => (
                                        <div key={milestone.id} className="h-8 flex items-center text-xs pl-4">
                                        {milestone.isCompleted && <CheckCircle className="h-3 w-3 mr-2 text-green-500"/>}
                                        <Gem className="h-3 w-3 mr-2 text-blue-500" />
                                        <span>{milestone.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )})}
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
                    
                     <div className="relative z-0">
                        {chartData.map((release, index) => {
                            const isExpanded = expandedReleases.includes(release.id);
                            return (
                                <div key={release.id} className="relative border-b last:border-b-0 cursor-pointer" onClick={() => toggleRelease(release.id)}>
                                    <div className="h-10 relative flex items-center p-2">
                                        <div 
                                            className="absolute h-6 top-2 rounded-md flex items-center px-2 text-white font-semibold text-xs bg-indigo-500"
                                            style={{
                                                left: `${getOffset(release.startDate!)}%`,
                                                width: `${getWidth(release.startDate!, release.endDate!)}%`,
                                            }}
                                        >
                                            <span className="truncate">{release.name}</span>
                                        </div>
                                    </div>
                                    {isExpanded && (
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
                                        {release.milestones.map((milestone) => (
                                            <div key={milestone.id} className="relative h-8 flex items-center">
                                                 <div 
                                                    className="absolute top-1/2 -translate-y-1/2"
                                                    style={{ left: `calc(${getOffset(milestone.milestoneDate!)}% - 8px)` }}
                                                    title={`${milestone.name} - ${format(parseISO(milestone.milestoneDate!), 'MMM d')}`}
                                                >
                                                    <Gem className={cn("h-4 w-4", milestone.isCompleted ? "text-green-500" : "text-blue-500")} />
                                                 </div>
                                            </div>
                                        ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

