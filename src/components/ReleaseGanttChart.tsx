
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
  LabelList,
  ReferenceLine,
} from 'recharts';
import { type Release } from '@/types';
import { differenceInDays, format, parseISO, startOfDay, addDays } from 'date-fns';

const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', 
  '#00C49F', '#FFBB28', '#FF8042', '#a4de6c', '#d0ed57'
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const item = payload[0];
    const stageName = item.dataKey;
    const duration = data[stageName];
    
    // Find stage start date
    let stageStart = data.startDate;
    for (const key in data) {
      if (key === stageName) break;
      if (key !== 'name' && key !== 'startDate' && typeof data[key] === 'number') {
        stageStart = addDays(stageStart, data[key]);
      }
    }
    const stageEnd = addDays(stageStart, duration - 1);
    
    return (
      <div className="bg-background border rounded-md p-2 shadow-md text-sm">
        <p className="font-bold">{data.name}</p>
        <p className="font-semibold text-muted-foreground">{stageName}</p>
        <p>
          {format(stageStart, 'MMM d')} - {format(stageEnd, 'MMM d, yyyy')}
        </p>
        <p>Duration: {duration} {duration === 1 ? 'day' : 'days'}</p>
      </div>
    );
  }
  return null;
};

const MilestoneLabel = ({ viewBox, value, name }: any) => {
    const { x, y } = viewBox;
    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={-10} dy={0} textAnchor="middle" fill="#666" fontSize="12" transform="rotate(-45)">
                {name}
            </text>
        </g>
    );
};

export function ReleaseGanttChart({ releases: allItems }: { releases: Release[] }) {
  const chartData = useMemo(() => {
    const releases = allItems.filter(item => item.itemType === 'Release' && item.startDate && item.endDate);
    const stages = allItems.filter(item => item.itemType === 'Stage' && item.startDate && item.endDate);
    
    return releases.map(release => {
      const releaseStart = parseISO(release.startDate!);
      const releaseEnd = parseISO(release.endDate!);

      const releaseStages = stages
        .filter(s => s.parentReleaseId === release.id)
        .sort((a, b) => parseISO(a.startDate!).getTime() - parseISO(b.startDate!).getTime());
      
      const chartItem: any = { 
        name: `[${release.releaseId}] ${release.name}`,
        startDate: releaseStart,
      };

      let lastStageEnd = releaseStart;

      releaseStages.forEach(stage => {
        const stageStart = parseISO(stage.startDate!);
        const stageEnd = parseISO(stage.endDate!);

        // Add blank space if there is a gap between stages
        const gap = differenceInDays(stageStart, lastStageEnd);
        if (gap > 0) {
            chartItem[`gap_${stage.id}`] = gap;
        }

        chartItem[stage.name] = differenceInDays(stageEnd, stageStart) + 1;
        lastStageEnd = stageEnd;
      });

      return chartItem;
    });
  }, [allItems]);

  const milestones = useMemo(() => {
    return allItems.filter(item => item.itemType === 'Milestone' && item.milestoneDate && item.parentReleaseId);
  }, [allItems]);

  if (chartData.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No releases with dates found to display in the timeline.</p>;
  }
  
  const allKeys = chartData.reduce((keys, item) => {
    Object.keys(item).forEach(key => {
        if (key !== 'name' && key !== 'startDate' && !keys.includes(key)) {
            keys.push(key);
        }
    });
    return keys;
  }, [] as string[]);


  return (
    <div className="w-full h-[500px] overflow-x-auto overflow-y-hidden">
        <div style={{ width: `${Math.max(100, chartData.length * 10)}%`, height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                barCategoryGap="30%"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={['dataMin', 'dataMax']} hide />
                <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(value, entry, index) => <span style={{ color: '#333' }}>{value.startsWith('gap_') ? null : value}</span>} />

                {milestones.map(milestone => {
                    const parentRelease = chartData.find(d => d.name.startsWith(`[${allItems.find(r => r.id === milestone.parentReleaseId)?.releaseId}]`));
                    if (!parentRelease) return null;

                    const daysFromStart = differenceInDays(parseISO(milestone.milestoneDate!), parentRelease.startDate);
                    return (
                        <ReferenceLine 
                            key={milestone.id} 
                            x={daysFromStart} 
                            stroke="red" 
                            strokeDasharray="3 3"
                            isFront={true}
                        >
                             <LabelList
                                content={<MilestoneLabel name={`[${milestone.releaseId}] ${milestone.name}`} />}
                                position="insideTop"
                            />
                        </ReferenceLine>
                    )
                })}
                
                {allKeys.map((key, index) => {
                    if (key.startsWith('gap_')) {
                        return <Bar key={key} dataKey={key} stackId="a" fill="transparent" />;
                    }
                    return (
                        <Bar key={key} dataKey={key} stackId="a" fill={COLORS[index % COLORS.length]}>
                            <LabelList dataKey={key} position="center" content={({ value, width }) => {
                                if (width < 30) return null;
                                return <tspan dy={-5}>{key}</tspan>
                            }} />
                        </Bar>
                    )
                })}
              </BarChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
}
