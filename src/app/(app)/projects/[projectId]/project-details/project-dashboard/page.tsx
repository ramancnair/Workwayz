
'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/components/ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Label, LabelList, Pie, PieChart, RadialBar, RadialBarChart, XAxis, YAxis, Cell, Legend, Tooltip } from 'recharts';
import { Users, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label as UiLabel } from '@/components/ui/label';
import { format, parseISO, isSameDay, eachDayOfInterval, differenceInDays, isWithinInterval } from 'date-fns';
import type { Story, WorklogItem, UserRole } from '@/types';
import { Separator } from '@/components/ui/separator';

const taskChartConfig = {
  'To Do': { label: 'To Do', color: 'hsl(var(--muted-foreground))' },
  'In Progress': { label: 'In Progress', color: 'hsl(var(--chart-1))' },
  'Done': { label: 'Done', color: 'hsl(var(--chart-2))' },
} satisfies ChartConfig;

const workloadChartConfig = {
  subTaskEffort: { label: 'Sub-Task Effort', color: 'hsl(var(--chart-2))' },
  bugEffort: { label: 'Bug Effort', color: 'hsl(var(--chart-5))' },
} satisfies ChartConfig;

const resourceCostsConfig = {
  revenue: { label: 'Revenue', color: 'hsl(var(--chart-2))' },
  cost: { label: 'Cost', color: 'hsl(var(--chart-5))' },
} satisfies ChartConfig;

export default function ProjectDashboardPage() {
  const { project, stories, releasesAndMilestones, sprints, epics, holidays, weeklyOffDays, projectSettings, employees, worklogs, fixedCosts } = useProject();
  const [selectedReleaseId, setSelectedReleaseId] = useState('all');
  const [selectedSprintId, setSelectedSprintId] = useState('all');
  const [workloadSprintId, setWorkloadSprintId] = useState('all');
  
  const [timeFilterSprintId, setTimeFilterSprintId] = useState('all');
  const [timeFilterReleaseId, setTimeFilterReleaseId] = useState('all');
  const [costDurationType, setCostDurationType] = useState<'overall' | 'release' | 'sprint'>('overall');
  const [costDurationId, setCostDurationId] = useState<string>('all');


  const releases = useMemo(() => releasesAndMilestones.filter(r => r.itemType === 'Release'), [releasesAndMilestones]);
  
  useEffect(() => {
    const currentSprint = sprints.find(s => s.isCurrent);
    if (currentSprint) {
      setWorkloadSprintId(currentSprint.id);
    } else if (sprints.length > 0) {
      setWorkloadSprintId(sprints[0].id);
    }
  }, [sprints]);

  const releaseChartData = useMemo(() => {
    const filteredStories = selectedReleaseId === 'all'
      ? stories
      : stories.filter(story => story.releaseId === selectedReleaseId);
      
    const statusCounts = filteredStories.reduce((acc, story) => {
        const status = story.status || 'To Do';
        if(acc[status]) {
            acc[status]++;
        } else {
            acc[status] = 1;
        }
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
      fill: (taskChartConfig[name as keyof typeof taskChartConfig] || { color: '#ccc' }).color,
    }));
  }, [stories, selectedReleaseId]);

  const sprintChartData = useMemo(() => {
    const filteredStories = selectedSprintId === 'all'
      ? stories
      : stories.filter(story => story.sprintId === selectedSprintId);
      
    const statusCounts = filteredStories.reduce((acc, story) => {
        const status = story.status || 'To Do';
        if(acc[status]) {
            acc[status]++;
        } else {
            acc[status] = 1;
        }
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
      fill: (taskChartConfig[name as keyof typeof taskChartConfig] || { color: '#ccc' }).color,
    }));
  }, [stories, selectedSprintId]);

  const epicProgressData = useMemo(() => {
    if (!epics || epics.length === 0) return [];

    return epics.map(epic => {
      const epicStories = stories.filter(story => story.epicId === epic.id && !story.parentStoryId);
      const totalStories = epicStories.length;
      if (totalStories === 0) {
        return { name: epic.title, progress: 0 };
      }
      const doneStories = epicStories.filter(story => story.status === 'Done').length;
      const progress = Math.round((doneStories / totalStories) * 100);
      return { name: epic.title, progress };
    });
  }, [epics, stories]);
  
  const calculateBusinessDays = useCallback((startStr?: string, endStr?: string): number => {
    if(!startStr || !endStr) return 0;
    try {
        const start = parseISO(startStr);
        const end = parseISO(endStr);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
            return 0;
        }

        const holidayDates = holidays.map(h => new Date(h.date));

        const interval = eachDayOfInterval({ start, end });
        
        const businessDays = interval.filter(day => {
            const dayOfWeek = day.getDay();
            const isWeekend = weeklyOffDays.includes(dayOfWeek);
            const isHoliday = holidayDates.some(holiday => isSameDay(day, holiday));
            return !isWeekend && !isHoliday;
        });

        return businessDays.length;
    } catch(e) {
        console.error("Error calculating business days", e);
        return 0;
    }
  }, [holidays, weeklyOffDays]);
  
  const workloadData = useMemo(() => {
    const sprintStories = workloadSprintId === 'all'
      ? stories
      : stories.filter(s => s.sprintId === workloadSprintId);
  
    const resourceEffort: Record<string, { name: string; subTaskEffort: number; bugEffort: number; }> = {};
  
    employees.forEach(emp => {
      resourceEffort[emp.id] = {
        name: `${emp.firstName} ${emp.lastName}`,
        subTaskEffort: 0,
        bugEffort: 0,
      };
    });
  
    sprintStories.forEach(story => {
      if (!story.assigneeId || !resourceEffort[story.assigneeId]) return;
  
      if (story.itemType === 'Sub Task') {
        resourceEffort[story.assigneeId].subTaskEffort += story.estimatedHours || 0;
      } else if (story.itemType === 'Bug') {
        resourceEffort[story.assigneeId].bugEffort += story.estimatedHours || 0;
      }
    });
  
    return Object.values(resourceEffort).filter(r => r.subTaskEffort > 0 || r.bugEffort > 0);
  }, [workloadSprintId, stories, employees]);


  const calculateEffort = useCallback((relevantStories: Story[]) => {
     const planned = relevantStories.reduce((sum, story) => sum + (story.estimatedHours || 0), 0);
    
    const actual = relevantStories.reduce((total, story) => {
        if (!story.developmentStartDate || !story.completionDate) return total;
        const start = parseISO(story.developmentStartDate);
        const end = parseISO(story.completionDate);
        const days = calculateBusinessDays(start.toISOString(), end.toISOString());
        const hoursPerDay = projectSettings?.manDayToHours || 8;
        return total + (days * hoursPerDay);
    }, 0);
    
    return [
        { name: 'Actual', value: actual, fill: 'hsl(var(--primary))' },
        { name: 'Planned', value: planned, fill: 'hsl(var(--chart-2))' },
    ];
  }, [calculateBusinessDays, projectSettings]);

  const sprintTimeChartData = useMemo(() => {
    const relevantStories = timeFilterSprintId === 'all' ? stories : stories.filter(s => s.sprintId === timeFilterSprintId);
    return calculateEffort(relevantStories);
  }, [timeFilterSprintId, stories, calculateEffort]);
  
  const releaseTimeChartData = useMemo(() => {
      const relevantStories = timeFilterReleaseId === 'all' ? stories : stories.filter(s => s.releaseId === timeFilterReleaseId);
      return calculateEffort(relevantStories);
  }, [timeFilterReleaseId, stories, calculateEffort]);
  
  const resourceCostsData = useMemo(() => {
    let startDate: string | undefined, endDate: string | undefined;

    if (costDurationType === 'overall') {
      startDate = project?.startDate;
      endDate = project?.endDate;
    } else if (costDurationType === 'release') {
      const release = releases.find(r => r.id === costDurationId);
      startDate = release?.startDate;
      endDate = release?.endDate;
    } else if (costDurationType === 'sprint') {
      const sprint = sprints.find(s => s.id === costDurationId);
      startDate = sprint?.startDate;
      endDate = sprint?.endDate;
    }

    if (!startDate || !endDate) return [];
    
    const workingDays = calculateBusinessDays(startDate, endDate);

    const costsByRole: Record<string, { role: UserRole, revenue: number; cost: number }> = {};
    
    const roles = Array.from(new Set(employees.map(e => e.role).filter(Boolean)));
    
    roles.forEach(role => {
        costsByRole[role!] = { role: role!, revenue: 0, cost: 0 };
    });

    employees.forEach(emp => {
      if (emp.role && costsByRole[emp.role]) {
        const billedRate = emp.billedRate || 0;
        const costRate = emp.costRate || 0;
        const availability = (emp.availability || 100) / 100;
        
        costsByRole[emp.role].revenue += billedRate * workingDays * availability;
        costsByRole[emp.role].cost += costRate * workingDays * availability;
      }
    });

    return Object.values(costsByRole).filter(roleData => roleData.revenue > 0 || roleData.cost > 0);
  }, [project, costDurationType, costDurationId, employees, sprints, releases, calculateBusinessDays]);

  const costDurationOptions = useMemo(() => {
    if (costDurationType === 'release') return releases.map(r => ({ value: r.id, label: `[${r.releaseId}] ${r.name}` }));
    if (costDurationType === 'sprint') return sprints.map(s => ({ value: s.id, label: s.title }));
    return [];
  }, [costDurationType, releases, sprints]);

  useEffect(() => {
      if (costDurationType === 'release' && releases.length > 0) {
        setCostDurationId(releases[0].id);
      } else if (costDurationType === 'sprint' && sprints.length > 0) {
          const current = sprints.find(s => s.isCurrent) || sprints[0];
          setCostDurationId(current.id);
      } else {
        setCostDurationId('all');
      }
  }, [costDurationType, releases, sprints]);


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="Project Dashboard" description="A high-level overview of the project's status." />
      
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Release</CardTitle>
              <div className="w-[180px]">
                <Select value={selectedReleaseId} onValueChange={setSelectedReleaseId}>
                  <SelectTrigger id="release-filter" className="h-8">
                      <SelectValue placeholder="Select a release" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All Releases</SelectItem>
                      {releases.map(r => <SelectItem key={r.id} value={r.id}>[{r.releaseId}] {r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ChartContainer config={taskChartConfig} className="mx-auto aspect-square h-[250px]">
                <PieChart>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                    <Pie data={releaseChartData} dataKey="value" nameKey="name" innerRadius={80} outerRadius={100} strokeWidth={5}>
                        <LabelList
                            dataKey="value"
                            className="fill-foreground text-2xl font-bold"
                            position="center"
                            formatter={(value: string) => releaseChartData.reduce((acc, curr) => acc + curr.value, 0).toString()}
                        />
                         {releaseChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Sprint</CardTitle>
              <div className="w-[180px]">
                <Select value={selectedSprintId} onValueChange={setSelectedSprintId}>
                  <SelectTrigger id="sprint-filter" className="h-8">
                      <SelectValue placeholder="Select a sprint" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All Sprints</SelectItem>
                      {sprints.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ChartContainer config={taskChartConfig} className="mx-auto aspect-square h-[250px]">
                <PieChart>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                    <Pie data={sprintChartData} dataKey="value" nameKey="name" innerRadius={80} outerRadius={100} strokeWidth={5}>
                        <LabelList
                            dataKey="value"
                            className="fill-foreground text-2xl font-bold"
                            position="center"
                            formatter={(value: string) => sprintChartData.reduce((acc, curr) => acc + curr.value, 0).toString()}
                        />
                         {sprintChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
              {epicProgressData.length > 0 ? epicProgressData.map((epic, index) => (
                <div key={index} className="space-y-1">
                    <div className="flex justify-between text-sm font-medium">
                      <span>{index + 1}. {epic.name}</span>
                      <span>{epic.progress}%</span>
                    </div>
                    <Progress value={epic.progress} className="h-3" />
                </div>
              )) : (
                <p className="text-sm text-muted-foreground text-center py-10">No epics found for this project.</p>
              )}
          </CardContent>
        </Card>
      </div>

       <div className="grid gap-6 grid-cols-1 lg:grid-cols-3 mt-6">
         <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Time</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col h-[300px]">
             <div className="flex-1 flex flex-col border-b pb-4">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-sm">Sprints</h4>
                    <Select value={timeFilterSprintId} onValueChange={setTimeFilterSprintId}>
                      <SelectTrigger className="h-8 w-[150px]"><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sprints</SelectItem>
                        {sprints.map(opt => (
                          <SelectItem key={opt.id} value={opt.id}>{opt.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
                 <ChartContainer config={{}} className="h-[100px] w-full">
                    <BarChart data={sprintTimeChartData} layout="vertical" margin={{ left: 10, right: 10, top: 0, bottom: 0 }}>
                        <YAxis type="category" dataKey="name" hide />
                        <XAxis type="number" hide />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="value" layout="vertical" radius={4}>
                           <LabelList dataKey="name" position="insideRight" offset={8} className="fill-background" fontSize={12} />
                           {sprintTimeChartData.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} />
                          ))}
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </div>
             <div className="flex-1 flex flex-col pt-4">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-sm">Releases</h4>
                     <Select value={timeFilterReleaseId} onValueChange={setTimeFilterReleaseId}>
                        <SelectTrigger className="h-8 w-[150px]"><SelectValue/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Releases</SelectItem>
                          {releases.map(opt => (
                            <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                </div>
                <ChartContainer config={{}} className="h-[100px] w-full">
                    <BarChart data={releaseTimeChartData} layout="vertical" margin={{ left: 10, right: 10, top: 0, bottom: 0 }}>
                        <YAxis type="category" dataKey="name" hide />
                        <XAxis type="number" hide />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="value" layout="vertical" radius={4}>
                           <LabelList dataKey="name" position="insideRight" offset={8} className="fill-background" fontSize={12} />
                           {releaseTimeChartData.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} />
                          ))}
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Workload</CardTitle>
              <div className="w-[180px]">
                <Select value={workloadSprintId} onValueChange={setWorkloadSprintId}>
                  <SelectTrigger id="workload-sprint-filter" className="h-8">
                      <SelectValue placeholder="Select a sprint" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All Sprints</SelectItem>
                      {sprints.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
             <ChartContainer config={workloadChartConfig} className="h-[300px] w-full">
                <BarChart data={workloadData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" tickFormatter={(value) => `${value}h`} />
                    <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={8} width={120} />
                    <Tooltip content={<ChartTooltipContent indicator="dot" />} />
                    <Legend content={<ChartLegendContent />} />
                    <Bar dataKey="subTaskEffort" stackId="a" fill="var(--color-subTaskEffort)" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="bugEffort" stackId="a" fill="var(--color-bugEffort)" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

       <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mt-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Resource Costs</CardTitle>
              <div className="flex items-center gap-2">
                  <Select value={costDurationType} onValueChange={(v) => setCostDurationType(v as any)}>
                    <SelectTrigger className="w-[120px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="overall">Overall</SelectItem>
                      <SelectItem value="release">Release</SelectItem>
                      <SelectItem value="sprint">Sprint</SelectItem>
                    </SelectContent>
                  </Select>
                  {costDurationType !== 'overall' && (
                    <Select value={costDurationId} onValueChange={setCostDurationId}>
                      <SelectTrigger className="w-[180px] h-8">
                        <SelectValue placeholder={`Select ${costDurationType}...`} />
                      </SelectTrigger>
                      <SelectContent>
                        {costDurationOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
              <ChartContainer config={resourceCostsConfig} className="h-[300px] w-full">
                <BarChart data={resourceCostsData} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="role" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis tickFormatter={(value) => `$${Number(value) / 1000}K`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cost" fill="var(--color-cost)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Fixed Cost</CardTitle>
          </CardHeader>
          <CardContent>
              <ChartContainer config={{}} className="h-[300px] w-full">
                  <BarChart data={fixedCosts} margin={{ left: 10, right: 10, top: 20, bottom: 10 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="cost" fill="hsl(var(--chart-1))" radius={4}>
                           <LabelList dataKey="cost" position="top" formatter={(value: number) => `$${value.toLocaleString()}`} />
                      </Bar>
                  </BarChart>
              </ChartContainer>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
