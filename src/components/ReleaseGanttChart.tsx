
'use client';

import { useMemo } from 'react';
import { type Release } from '@/types';
import { eachDayOfInterval, format, differenceInDays, parseISO, startOfMonth, endOfMonth, getDaysInMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { Flag, Pin } from 'lucide-react';

// A more professional color palette
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

        const chartStartDate = startOfMonth(new Date(Math.min(...allDates.map(d => d.getTime()))));
        const chartEndDate = endOfMonth(new Date(Math.max(...allDates.map(d => d.getTime()))));
        const totalDays = differenceInDays(chartEndDate, chartStartDate) + 1;

        const months = [];
        let current = chartStartDate;
        while (current <= chartEndDate) {
            const monthStart = startOfMonth(current);
            const daysInMonth = getDaysInMonth(monthStart);
            months.push({
                name: format(monthStart, 'MMM'),
                year: format(monthStart, 'yyyy'),
                days: daysInMonth,
            });
            current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
        }
        
        const todayOffset = differenceInDays(today, chartStartDate);

        return {
            chartData: { releases, stages, milestones },
            dateInfo: {
                chartStartDate,
                chartEndDate,
                totalDays,
                months,
                todayOffset,
                isTodayVisible: today >= chartStartDate && today <= chartEndDate,
            },
        };
    }, [allItems, today]);

    if (!dateInfo) {
        return <p className="text-muted-foreground text-center py-8">No releases with dates found to display in the timeline.</p>;
    }
    
    const { chartStartDate, totalDays, months, todayOffset, isTodayVisible } = dateInfo;

    const getOffset = (dateStr: string) => {
        return (differenceInDays(parseISO(dateStr), chartStartDate) / totalDays) * 100;
    };
    
    const getWidth = (startDateStr: string, endDateStr: string) => {
        const duration = differenceInDays(parseISO(endDateStr), parseISO(startDateStr)) + 1;
        return (duration / totalDays) * 100;
    };

    return (
        <div className="space-y-8 font-sans text-sm">
            {/* Top timeline with months and milestones */}
            <div className="relative pt-12">
                {/* Main axis bar */}
                <div className="relative h-6 bg-secondary rounded-lg shadow-inner flex">
                    {months.map((month, index) => (
                        <div key={`${month.name}-${month.year}`} style={{ width: `${(month.days / totalDays) * 100}%` }} className={cn("h-full text-center flex items-center justify-center text-xs font-semibold text-secondary-foreground/80", index < months.length -1 && "border-r border-background/50")}>
                            {month.name}
                        </div>
                    ))}
                </div>

                {/* Today Marker */}
                {isTodayVisible && (
                    <div className="absolute top-0 bottom-[-8px]" style={{ left: `${(todayOffset / totalDays) * 100}%` }}>
                       <div className="relative flex flex-col items-center">
                           <div className="text-xs font-bold text-red-500 mb-1">Today</div>
                           <div className="h-2 w-2 bg-red-500 transform rotate-45"></div>
                           <div className="w-px h-12 bg-red-500"></div>
                       </div>
                    </div>
                )}
                
                {/* Milestones */}
                {chartData.milestones.map((milestone, index) => (
                    <div key={milestone.id} className="absolute top-0" style={{ left: `${getOffset(milestone.milestoneDate!)}%` }}>
                       <div className="relative flex flex-col items-center">
                           <div className="whitespace-nowrap text-center text-xs mb-1">
                               <p className="font-bold">{milestone.name}</p>
                               <p className="text-muted-foreground">{format(parseISO(milestone.milestoneDate!), 'MMM d')}</p>
                           </div>
                           <Flag className="h-4 w-4 text-primary" style={{color: COLORS[index % COLORS.length]}} fill={COLORS[index % COLORS.length]} />
                           <div className="w-px h-6 bg-border"></div>
                       </div>
                    </div>
                ))}
            </div>

            {/* Bottom section with stage/release bars */}
            <div className="relative space-y-2.5 pr-4">
                {[...chartData.releases, ...chartData.stages]
                    .sort((a,b) => parseISO(a.startDate!).getTime() - parseISO(b.startDate!).getTime())
                    .map((item, index) => (
                    <div key={item.id} className="relative h-6 flex items-center">
                        <div className="w-40 pr-4 text-right truncate font-medium text-muted-foreground">{item.name}</div>
                        <div 
                           className="h-full rounded flex items-center px-2"
                           style={{
                             left: `${getOffset(item.startDate!)}%`,
                             width: `${getWidth(item.startDate!, item.endDate!)}%`,
                             backgroundColor: `${COLORS[index % COLORS.length]}A0`, // with transparency
                             border: `1px solid ${COLORS[index % COLORS.length]}`
                           }}
                        >
                            <span className="text-white text-xs font-bold truncate">
                                {format(parseISO(item.startDate!), 'MMM d')} - {format(parseISO(item.endDate!), 'MMM d')}
                            </span>
                        </div>
                    </div>
                ))}
                 {/* Dotted lines from timeline */}
                 <div className="absolute top-0 bottom-0 left-40 w-full -z-10 flex">
                     {months.map((month, index) => (
                         <div key={`${month.name}-${index}`} style={{ width: `${(month.days / totalDays) * 100}%` }} className={cn("h-full", index < months.length -1 && "border-r border-dashed border-border")}></div>
                     ))}
                 </div>
            </div>
        </div>
    );
}
