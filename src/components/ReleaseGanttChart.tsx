'use client';

import { useMemo, useState } from 'react';
import { type Release, type Sprint } from '@/types';
import {
  format,
  differenceInDays,
  parseISO,
  startOfWeek,
  endOfWeek,
  addDays,
} from 'date-fns';
import { cn, getSprintDisplayId } from '@/lib/utils';
import { CheckCircle, ChevronRight, Gem, Zap, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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

export function ReleaseGanttChart({ 
    releases: allItems,
    sprints = [],
    showSprints = false,
}: { 
    releases: Release[];
    sprints?: Sprint[];
    showSprints?: boolean;
}) {
    const today = useToday();
    const [expandedReleases, setExpandedReleases] = useState<string[]>(['__standalone_sprints__']);

    const { chartData, dateInfo } = useMemo(() => {
        const releases = allItems.filter(item => item.itemType === 'Release' && item.startDate && item.endDate);
        const stages = allItems.filter(item => item.itemType === 'Stage' && item.startDate && item.endDate && item.parentReleaseId);
        const milestones = allItems.filter(item => item.itemType === 'Milestone' && item.milestoneDate && item.parentReleaseId);
        
        const validSprints = (showSprints ? sprints : []).filter(s => s.startDate && s.endDate);

        const allDatedItems = [
            ...releases,
            ...stages,
            ...milestones.map(m => ({...m, startDate: m.milestoneDate, endDate: m.milestoneDate})),
            ...(showSprints ? validSprints : []),
        ];
        
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

        const releaseGroups = releases.map(release => {
            const alignedSprints = showSprints
                ? sprints.filter(s => {
                    if (!s.startDate || !s.endDate) return false;
                    // Strict explicit releaseId alignment only
                    return s.releaseId === release.id;
                }).sort((a, b) => parseISO(a.startDate!).getTime() - parseISO(b.startDate!).getTime())
                : [];

            return {
                ...release,
                isStandaloneGroup: false,
                stages: stages
                    .filter(s => s.parentReleaseId === release.id)
                    .sort((a, b) => parseISO(a.startDate!).getTime() - parseISO(b.startDate!).getTime()),
                milestones: milestones
                    .filter(m => m.parentReleaseId === release.id)
                    .sort((a, b) => parseISO(a.milestoneDate!).getTime() - parseISO(b.milestoneDate!).getTime()),
                sprints: alignedSprints,
            };
        }).sort((a,b) => parseISO(a.startDate!).getTime() - new Date(b.startDate!).getTime());

        // Group unassigned (non-release) sprints below the releases
        if (showSprints) {
            const standaloneSprints = sprints.filter(s => 
                s.startDate && s.endDate && (!s.releaseId || !releases.some(r => r.id === s.releaseId))
            ).sort((a, b) => parseISO(a.startDate!).getTime() - parseISO(b.startDate!).getTime());

            if (standaloneSprints.length > 0) {
                const earliestDate = standaloneSprints[0].startDate!;
                const latestDate = standaloneSprints.reduce((latest, s) => {
                    return parseISO(s.endDate!).getTime() > parseISO(latest).getTime() ? s.endDate! : latest;
                }, standaloneSprints[0].endDate!);

                releaseGroups.push({
                    id: '__standalone_sprints__',
                    releaseId: 'SPRINTS',
                    name: 'Non-Release Sprints',
                    description: 'Sprints not aligned to any project release',
                    itemType: 'Release',
                    isStandaloneGroup: true,
                    startDate: earliestDate,
                    endDate: latestDate,
                    stages: [],
                    milestones: [],
                    sprints: standaloneSprints,
                } as any);
            }
        }
        
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
    }, [allItems, sprints, showSprints, today]);

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
                     const isStandalone = (release as any).isStandaloneGroup;
                     return (
                        <div key={release.id} className="border-b last:border-b-0">
                             <div 
                                className={cn(
                                    "p-2 font-bold flex items-center gap-2 cursor-pointer hover:bg-muted transition-colors",
                                    isStandalone ? "bg-amber-500/10 text-amber-300" : "bg-muted/30 text-primary"
                                )} 
                                onClick={() => toggleRelease(release.id)}
                             >
                               <ChevronRight className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")} />
                               {isStandalone ? (
                                   <Layers className="h-4 w-4 text-amber-500 shrink-0" />
                               ) : (
                                   release.isCompleted && <CheckCircle className="h-4 w-4 text-green-500 shrink-0"/>
                               )}
                               <span>{release.name}</span>
                               {isStandalone && (
                                   <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0 h-4 border-amber-500/40 text-amber-400 bg-amber-500/10 font-normal">
                                       {release.sprints.length} {release.sprints.length === 1 ? 'sprint' : 'sprints'}
                                   </Badge>
                               )}
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
                                    {showSprints && release.sprints.map(sprint => (
                                        <div 
                                            key={sprint.id} 
                                            className="h-8 flex items-center text-xs pl-4 gap-1.5"
                                            title={`Sprint: ${sprint.title} (${sprint.status || 'Planned'})`}
                                        >
                                            {sprint.status === 'Completed' ? (
                                                <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                            ) : (
                                                <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                            )}
                                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-amber-500/50 text-amber-400 bg-amber-500/10 shrink-0 font-mono">
                                                {getSprintDisplayId(sprint)}
                                            </Badge>
                                            <span className="truncate">{sprint.title}</span>
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
                            const isStandalone = (release as any).isStandaloneGroup;
                            return (
                                <div key={release.id} className="relative border-b last:border-b-0 cursor-pointer" onClick={() => toggleRelease(release.id)}>
                                    <div className="h-10 relative flex items-center p-2">
                                        {isStandalone ? (
                                            <div 
                                                className="absolute h-6 top-2 rounded-md flex items-center px-2 text-amber-200 font-semibold text-xs border border-dashed border-amber-500/50 bg-amber-500/10"
                                                style={{
                                                    left: `${getOffset(release.startDate!)}%`,
                                                    width: `${getWidth(release.startDate!, release.endDate!)}%`,
                                                }}
                                            >
                                                <span className="truncate">{release.name} ({release.sprints.length})</span>
                                            </div>
                                        ) : (
                                            <div 
                                                className="absolute h-6 top-2 rounded-md flex items-center px-2 text-white font-semibold text-xs bg-indigo-500"
                                                style={{
                                                    left: `${getOffset(release.startDate!)}%`,
                                                    width: `${getWidth(release.startDate!, release.endDate!)}%`,
                                                }}
                                            >
                                                <span className="truncate">{release.name}</span>
                                            </div>
                                        )}
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
                                        {showSprints && release.sprints.map((sprint) => (
                                            <div key={sprint.id} className="relative h-8 flex items-center">
                                                <div 
                                                    className="absolute h-6 top-1 rounded-md flex items-center px-2 text-white font-semibold text-xs bg-amber-600/90 hover:bg-amber-500 border border-amber-400/50 shadow-sm transition-colors"
                                                    style={{
                                                        left: `${getOffset(sprint.startDate!)}%`,
                                                        width: `${getWidth(sprint.startDate!, sprint.endDate!)}%`,
                                                    }}
                                                    title={`${getSprintDisplayId(sprint)}: ${sprint.title} (${sprint.status || 'Planned'}) - ${format(parseISO(sprint.startDate!), 'MMM d')} to ${format(parseISO(sprint.endDate!), 'MMM d')}`}
                                                >
                                                    <span className="truncate font-mono mr-1">[{getSprintDisplayId(sprint)}]</span>
                                                    <span className="truncate">{sprint.title}</span>
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
