

'use client';

import { useState, useMemo } from 'react';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { eachDayOfInterval, format, differenceInDays, parseISO, startOfDay, isWithinInterval } from 'date-fns';
import { type User, type Story } from '@/types';

// Generate a color palette for resources
const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042',
  '#a4de6c', '#d0ed57', '#ffc658', '#ff9a3e', '#ff7300', '#ff4d00', '#ff0000',
];

const CustomTooltip = ({ active, payload, label }: any) => {  
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-md p-2 shadow-md text-sm">
        <p className="font-bold">{format(new Date(label), 'PPP')}</p>
        {payload.map((p: any) => (
            <p key={p.dataKey} style={{ color: p.color }}>
                {p.name}: {p.value.toFixed(2)} hours
            </p>
        ))}
      </div>
    );
  }

  return null;
};

export default function ResourceGanttPage() {
  const { stories, employees: users, sprints } = useProject();
  const [selectedResourceId, setSelectedResourceId] = useState('all');

  const currentSprint = useMemo(() => sprints.find(s => s.isCurrent), [sprints]);

  const workloadData = useMemo(() => {
    if (!currentSprint || selectedResourceId === 'all' || !currentSprint.startDate || !currentSprint.endDate) {
      return [];
    }

    const sprintStart = parseISO(currentSprint.startDate);
    const sprintEnd = parseISO(currentSprint.endDate);

    const sprintDates = eachDayOfInterval({ start: sprintStart, end: sprintEnd });

    const userTasks = stories.filter(story => 
        story.assigneeId === selectedResourceId &&
        (story.itemType === 'Sub Task' || story.itemType === 'Bug') &&
        story.startDate && story.endDate
    );

    return sprintDates.map(day => {
        let subTaskHours = 0;
        let bugHours = 0;

        userTasks.forEach(task => {
            const taskStart = parseISO(task.startDate!);
            const taskEnd = parseISO(task.endDate!);
            
            if(isWithinInterval(day, { start: taskStart, end: taskEnd })) {
                const duration = differenceInDays(taskEnd, taskStart) + 1;
                const dailyHours = (task.estimatedHours || 0) / duration;
                
                if (task.itemType === 'Sub Task') {
                    subTaskHours += dailyHours;
                } else if (task.itemType === 'Bug') {
                    bugHours += dailyHours;
                }
            }
        });

        return {
            date: day.getTime(),
            dateLabel: format(day, 'MMM d'),
            subTaskHours,
            bugHours
        }
    });

  }, [stories, selectedResourceId, currentSprint]);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="Resource Workload" description="Visualize the project timeline and resource allocation for tasks.">
        <div className="w-[200px]">
            <Select onValueChange={setSelectedResourceId} value={selectedResourceId}>
                <SelectTrigger>
                    <SelectValue placeholder="Filter by resource" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Select a Resource</SelectItem>
                    {users.map(emp => (
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
          {selectedResourceId !== 'all' ? (
             <ResponsiveContainer width="100%" height={400}>
                {workloadData.length > 0 ? (
                    <BarChart
                        data={workloadData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                            dataKey="dateLabel"
                        />
                        <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="subTaskHours" name="Sub-Task Hours" stackId="a" fill="#8884d8" />
                        <Bar dataKey="bugHours" name="Bug Hours" stackId="a" fill="#82ca9d" />
                    </BarChart>
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        No assigned tasks with estimated hours found for this user in the current sprint.
                    </div>
                )}
              </ResponsiveContainer>
          ) : (
             <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                Please select a resource to view their workload for the current sprint.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

