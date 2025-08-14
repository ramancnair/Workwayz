

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
import { Bar, BarChart, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { useProject } from '@/context/ProjectContext';
import { BookOpen, CheckCircle, GitFork, Boxes, CheckSquare } from 'lucide-react';

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
  const { stories } = useProject();

  const allWorkItems = stories; // Includes stories, tasks, bugs, etc.
  const allStories = stories.filter(s => s.itemType === 'Requirement/Story');
  const allTasks = stories.filter(s => s.itemType === 'Task');
  
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter((task) => task.status === 'Done').length;
  const inProgressTasks = allTasks.filter((task) => task.status === 'In Progress').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const doneColumnName = 'Done'; // Assuming 'Done' is the completion status

  const taskStatusData = Object.entries(
    allWorkItems.reduce((acc, item) => {
      const status = item.status || 'To Do';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const pieChartConfig = {
    workItems: {
      label: 'Work Items',
    },
    'To Do': {
      label: 'To Do',
      color: '#3b82f6',
    },
    'In Progress': {
      label: 'In Progress',
      color: '#f97316',
    },
    'In QA': {
      label: 'In QA',
      color: '#eab308',
    },
    'Done': {
      label: 'Done',
      color: '#22c55e',
    },
  } satisfies ChartConfig;
  
  const storyProgressData = allStories.map(story => {
    const storyTasks = allTasks.filter(t => t.epicId === story.id);
    const completed = storyTasks.filter(t => t.status === doneColumnName).length;
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
        <StatsCard title="Total Tasks" value={totalTasks.toString()} icon={CheckSquare} />
        <StatsCard title="Completed Tasks" value={completedTasks.toString()} icon={CheckCircle} description={`${completionRate}% completion rate`} />
        <StatsCard title="In Progress" value={inProgressTasks.toString()} icon={GitFork} />
        <StatsCard title="Total Stories" value={allStories.length.toString()} icon={BookOpen} />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Work Items by Status</CardTitle>
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
                    <Cell key={`cell-${index}`} fill={pieChartConfig[entry.name as keyof typeof pieChartConfig]?.color || '#a1a1aa'} />
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
