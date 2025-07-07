'use client';

import { PageHeader } from '@/components/PageHeader';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { tasks, stories } from '@/lib/mock-data';
import type { Task } from '@/types';
import { BarChart, PieChart, CheckCircle, ListTodo, GitFork, Boxes } from 'lucide-react';
import { ResponsiveContainer, Pie, Cell, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const COLORS = {
  'To Do': '#3b82f6',
  'In Development': '#f97316',
  'In QA': '#eab308',
  'Complete': '#22c55e',
};

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
  
  const storyProgressData = stories.map(story => {
    const storyTasks = tasks.filter(t => t.storyId === story.id);
    const completed = storyTasks.filter(t => t.status === 'Complete').length;
    return {
      name: story.title,
      total: storyTasks.length,
      completed: completed,
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
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={taskStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {taskStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Story Progress</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={storyProgressData} layout="vertical" margin={{ left: 10, right: 30 }}>
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }}/>
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" stackId="a" fill="#22c55e" name="Completed Tasks" />
                <Bar dataKey="total" stackId="b" fill="#a1a1aa" name="Total Tasks" barSize={20} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
