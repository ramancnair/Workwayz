
'use client';

import { useState, useMemo } from 'react';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { eachDayOfInterval, format, differenceInDays, parseISO, startOfDay } from 'date-fns';
import { type Employee } from '@/types';

// Generate a color palette for resources
const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042',
  '#a4de6c', '#d0ed57', '#ffc658', '#ff9a3e', '#ff7300', '#ff4d00', '#ff0000',
];

const CustomTooltip = ({ active, payload, label }: any) => {  
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const assignee = data.assignee;
    return (
      <div className="bg-background border rounded-md p-2 shadow-md text-sm">
        <p className="font-bold">{data.name}</p>
        <p className="text-muted-foreground">
          {format(data.start, 'MMM d')} - {format(data.end, 'MMM d, yyyy')}
        </p>
        <p>Duration: {data.duration} {data.duration === 1 ? 'day' : 'days'}</p>
        {assignee && <p>Assignee: {assignee.firstName} {assignee.lastName}</p>}
      </div>
    );
  }

  return null;
};

export default function ProjectGanttPage() {
  const { stories, employees } = useProject();
  const [selectedResourceId, setSelectedResourceId] = useState('all');

  const tasks = useMemo(() => {
    return stories.filter(story => 
      story.itemType === 'Task' && 
      story.startDate && 
      story.endDate
    );
  }, [stories]);

  const resourceColorMapping = useMemo(() => {
    const mapping: Record<string, string> = {};
    employees.forEach((emp, index) => {
        mapping[emp.id] = COLORS[index % COLORS.length];
    });
    return mapping;
  }, [employees]);

  const chartData = useMemo(() => {
    const filteredTasks = selectedResourceId === 'all'
      ? tasks
      : tasks.filter(task => task.assigneeId === selectedResourceId);

    const today = startOfDay(new Date());

    return filteredTasks.map(task => {
        const start = parseISO(task.startDate!);
        const end = parseISO(task.endDate!);
        const assignee = employees.find(e => e.id === task.assigneeId);
        
        return {
            name: task.storyId,
            fullName: task.title,
            assigneeId: task.assigneeId,
            assignee: assignee,
            start: start,
            end: end,
            range: [start.getTime(), end.getTime()],
            duration: differenceInDays(end, start) + 1,
        };
    }).sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [tasks, selectedResourceId, employees]);

  const domain: [number, number] | undefined = useMemo(() => {
    if (chartData.length === 0) {
      const today = new Date();
      return [
        new Date(today.getFullYear(), today.getMonth(), 1).getTime(),
        new Date(today.getFullYear(), today.getMonth() + 1, 0).getTime()
      ];
    }
    const startTimes = chartData.map(d => d.start.getTime());
    const endTimes = chartData.map(d => d.end.getTime());
    return [Math.min(...startTimes), Math.max(...endTimes)];
  }, [chartData]);
  
  const ticks = useMemo(() => {
    if (!domain) return [];
    return eachDayOfInterval({
      start: new Date(domain[0]),
      end: new Date(domain[1]),
    }).map(d => d.getTime());
  }, [domain]);
  
  const singleResourceColor = selectedResourceId !== 'all' ? resourceColorMapping[selectedResourceId] : '#8884d8';
  

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="Resource Gantt Chart" description="Visualize the project timeline and resource allocation for development tasks.">
        <div className="w-[200px]">
            <Select onValueChange={setSelectedResourceId} defaultValue="all">
                <SelectTrigger>
                    <SelectValue placeholder="Filter by resource" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Resources</SelectItem>
                    {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                            {emp.firstName} {emp.lastName}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </PageHeader>
      <Card>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={Math.max(400, chartData.length * 50)}>
            {chartData.length > 0 ? (
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
                        dataKey="name" 
                        type="category" 
                        width={80} 
                        tick={{ fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                     {selectedResourceId === 'all' && (
                        <Legend
                            formatter={(value, entry) => {
                                const employee = employees.find(e => e.id === value);
                                return employee ? `${employee.firstName} ${employee.lastName}` : value;
                            }}
                        />
                    )}
                    {selectedResourceId === 'all' ? (
                        Object.entries(resourceColorMapping).map(([resourceId, color]) => {
                           const resourceTasks = chartData.filter(d => d.assigneeId === resourceId);
                           if (resourceTasks.length === 0) return null;
                           return (
                             <Bar 
                                key={resourceId} 
                                dataKey="range" 
                                data={resourceTasks}
                                name={resourceId}
                                fill={color} 
                                barSize={20} 
                            />
                           )
                        })
                    ) : (
                         <Bar dataKey="range" fill={singleResourceColor} barSize={20} />
                    )}
                </BarChart>
            ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    No tasks with start and end dates to display.
                </div>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
