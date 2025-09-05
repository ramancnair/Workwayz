
'use client';

import { useMemo } from 'react';
import { type Release } from '@/types';
import { eachDayOfInterval, format, differenceInDays, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28'];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border rounded-md p-2 shadow-md text-sm">
        <p className="font-bold">{data.name}</p>
        <p className="text-muted-foreground">{format(new Date(data.range[0]), 'MMM d, yyyy')} - {format(new Date(data.range[1]), 'MMM d, yyyy')}</p>
        <p>Duration: {differenceInDays(new Date(data.range[1]), new Date(data.range[0])) + 1} days</p>
      </div>
    );
  }
  return null;
};

export function ReleaseGanttChart({ releases: allItems }: { releases: Release[] }) {

  const { chartData, yAxisLabels, domain, ticks } = useMemo(() => {
    const releases = allItems.filter(item => item.itemType === 'Release' && item.startDate && item.endDate)
        .sort((a,b) => parseISO(a.startDate!).getTime() - new Date(b.startDate!).getTime());
    
    if (releases.length === 0) {
      return { chartData: [], yAxisLabels: [], domain: [0,0], ticks: [] };
    }

    const stages = allItems.filter(item => item.itemType === 'Stage' && item.startDate && item.endDate);
    
    const allDates = allItems
        .flatMap(item => [item.startDate, item.endDate, item.milestoneDate])
        .filter(Boolean)
        .map(dateStr => parseISO(dateStr!));
    
    if (allDates.length === 0) {
      return { chartData: [], yAxisLabels: [], domain: [0,0], ticks: [] };
    }

    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

    const chartStartDate = startOfWeek(minDate);
    const chartEndDate = endOfWeek(maxDate);
    
    const chartDomain: [number, number] = [chartStartDate.getTime(), chartEndDate.getTime()];
    const chartTicks = eachDayOfInterval({ start: chartStartDate, end: chartEndDate }).filter((d, i) => i % 7 === 0).map(d => d.getTime());
    
    const yLabels: string[] = [];
    const processedData: any[] = [];
    
    releases.forEach((release) => {
        yLabels.push(`(R) ${release.name}`);
        const releaseStart = parseISO(release.startDate!);
        const releaseEnd = parseISO(release.endDate!);

        const yIndex = yLabels.length - 1;

        processedData.push({
            y: yIndex,
            name: release.name,
            range: [releaseStart.getTime(), releaseEnd.getTime()],
            fill: 'transparent',
            stroke: COLORS[yIndex % COLORS.length]
        });

        const releaseStages = stages
            .filter(s => s.parentReleaseId === release.id)
            .sort((a,b) => parseISO(a.startDate!).getTime() - new Date(b.startDate!).getTime());

        releaseStages.forEach(stage => {
            const stageStart = parseISO(stage.startDate!);
            const stageEnd = parseISO(stage.endDate!);
            processedData.push({
                y: yIndex,
                name: stage.name,
                range: [stageStart.getTime(), stageEnd.getTime()],
                fill: COLORS[yIndex % COLORS.length],
            });
        });
    });

    return { chartData: processedData, yAxisLabels: yLabels, domain: chartDomain, ticks: chartTicks };

  }, [allItems]);


  if (chartData.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No releases with dates found to display in the timeline.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={yAxisLabels.length * 50 + 60}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        barCategoryGap={8}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis 
            type="number" 
            domain={domain}
            ticks={ticks}
            tickFormatter={(tick) => format(new Date(tick), 'MMM d')}
            scale="time"
        />
        <YAxis 
            type="number" 
            dataKey="y"
            domain={[-1, yAxisLabels.length]}
            ticks={yAxisLabels.map((_, i) => i)}
            tickFormatter={(tick) => yAxisLabels[tick]}
            width={150}
            tickLine={false}
            axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(200, 200, 200, 0.2)'}} />
        
        <Bar dataKey="range" isAnimationActive={false}>
          {chartData.map((entry, index) => (
             <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.stroke} strokeWidth={2} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
