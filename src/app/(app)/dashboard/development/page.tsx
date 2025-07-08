'use client';

import { PageHeader } from '@/components/PageHeader';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart";
import { tasks, stories } from '@/lib/mock-data';
import { CheckCircle, ListTodo, GitFork, Boxes } from 'lucide-react';
import { Bar, BarChart, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';

const barChartConfig = {
  completed: {
    label: "Completed",
    color: "#22c55e",
  },
  remaining: {
    label: "Remaining",
    color: "#e4e4e7",
  },
} satisfies ChartConfig;

export default function DevelopmentDashboard() {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.status === 'Complete').length;
  const inProgressTasks = tasks.filter((task) => task.status === 'In Development' || task.status === 'In QA').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const taskStatusData = Object.entries(
    tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const pieChartConfig = {
    tasks: {
      label: 'Tasks',
    },
    'To Do': {
      label: 'To Do',
      color: '#3b82f6',
    },
    'In Development': {
      label: 'In Development',
      color: '#f97316',
    },
    'In QA': {
      label: 'In QA',
      color: '#eab308',
    },
    'Complete': {
      label: 'Complete',
      color: '#22c55e',
    },
  } satisfies ChartConfig;
  
  const storyProgressData = stories.map(story => {
    const storyTasks = tasks.filter(t => t.storyId === story.id);
    const completed = storyTasks.filter(t => t.status === 'Complete').length;
    const remaining = storyTasks.length - completed;
    return {
      name: story.title,
      completed,
      remaining,
    }
  });


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="Development Dashboard" description="Overview of the project's development progress." />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Tasks" value={totalTasks.toString()} icon={ListTodo} />
        <StatsCard title="Completed Tasks" value={completedTasks.toString()} icon={CheckCircle} description={`${completionRate}% completion rate`} />
        <StatsCard title="In Progress" value={inProgressTasks.toString()} icon={GitFork} />
        <StatsCard title="Total Stories" value={stories.length.toString()} icon={Boxes} />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Tasks by Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ChartContainer config={pieChartConfig}>
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie data={taskStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {taskStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={pieChartConfig[entry.name as keyof typeof pieChartConfig]?.color} />
                  ))}
                </Pie>
                <ChartLegend
                  content={<ChartLegendContent nameKey="name" />}
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Story Progress</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ChartContainer config={barChartConfig} className="h-full w-full">
               <BarChart accessibilityLayer data={storyProgressData} layout="vertical" stackOffset="expand" margin={{left: -20}}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} tickLine={false} axisLine={false}/>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Bar dataKey="completed" stackId="a" fill="var(--color-completed)" radius={[4, 0, 0, 4]} />
                <Bar dataKey="remaining" stackId="a" fill="var(--color-remaining)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
