
'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { eachDayOfInterval, format, differenceInDays, parseISO, startOfDay, addDays, getDaysInMonth, startOfMonth } from 'date-fns';
import { type ProjectTimelineData } from '@/app/(app)/utilization/page';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const bar = payload[0];
    const isPlanned = bar.dataKey === 'plannedRange';

    const startDate = data.start instanceof Date ? data.start : new Date(data.start);
    const endDate = data.end instanceof Date ? data.end : new Date(data.end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return null;
    }

    return (
      <div className="bg-popover text-popover-foreground border border-border rounded-md p-2 shadow-md text-sm">
        <p className="font-bold text-popover-foreground">{data.projectName}</p>
        <p className="font-semibold text-muted-foreground">{isPlanned ? 'Planned' : 'Actual'}</p>
        <p className="text-popover-foreground">{format(startDate, 'MMM d, yyyy')} - {format(endDate, 'MMM d, yyyy')}</p>
        <p className="text-popover-foreground">Duration: {data.duration} {data.duration === 1 ? 'day' : 'days'}</p>
      </div>
    );
  }
  return null;
};

export function UtilizationGanttChart({ data }: { data: ProjectTimelineData[] }) {
  const { chartData, yAxisLabels, domain, ticks } = useMemo(() => {
    const allDates: Date[] = [];
    const processedData: any[] = [];
    const yLabels: string[] = [];

    data.forEach((item, projectIndex) => {
        let hasData = false;
        const projectName = `(${item.project.id}) ${item.project.name}`;

        if (item.planned.length > 0) {
            hasData = true;
            yLabels.push(`${projectName} (Planned)`);
            item.planned.forEach((p, i) => {
                allDates.push(p.start, p.end);
                processedData.push({
                    y: yLabels.length - 1,
                    projectName: projectName,
                    name: `planned-${projectIndex}-${i}`,
                    start: p.start,
                    end: p.end,
                    plannedRange: [p.start.getTime(), p.end.getTime()],
                    duration: differenceInDays(p.end, p.start) + 1,
                    fill: COLORS[projectIndex % COLORS.length],
                });
            });
        }
        
        if (item.actual.length > 0) {
            hasData = true;
            yLabels.push(`${projectName} (Actual)`);
            item.actual.forEach((a, i) => {
                allDates.push(a.start, a.end);
                processedData.push({
                    y: yLabels.length - 1,
                    projectName: projectName,
                    name: `actual-${projectIndex}-${i}`,
                    start: a.start,
                    end: a.end,
                    actualRange: [a.start.getTime(), a.end.getTime()],
                    duration: differenceInDays(a.end, a.start) + 1,
                    fill: COLORS[projectIndex % COLORS.length],
                });
            });
        }
    });

    if (processedData.length === 0) {
        return { chartData: [], yAxisLabels: [], domain: undefined, ticks: [] };
    }

    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

    const chartDomain: [number, number] = [minDate.getTime(), maxDate.getTime()];
    const chartTicks = eachDayOfInterval({ start: minDate, end: maxDate }).map(d => d.getTime());

    return { chartData: processedData, yAxisLabels: yLabels, domain: chartDomain, ticks: chartTicks };

  }, [data]);
  
  if (chartData.length === 0) {
    return <p className="text-center py-10 text-muted-foreground">No utilization data found for this user.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={yAxisLabels.length * 60 + 60}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
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
            width={200}
        />
        <Tooltip content={<CustomTooltip />} />
        
        <Bar dataKey="plannedRange" isAnimationActive={false} barSize={20}>
          {chartData.map((entry, index) => (
            entry.plannedRange && <Cell key={`cell-planned-${index}`} fill={entry.fill} fillOpacity={0.6} />
          ))}
        </Bar>
         <Bar dataKey="actualRange" isAnimationActive={false} barSize={20}>
          {chartData.map((entry, index) => (
            entry.actualRange && <Cell key={`cell-actual-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
