
'use client';

import { useState, useMemo } from 'react';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Bar, BarChart, Cell, Pie, PieChart, XAxis, YAxis, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { eachDayOfInterval, format, parseISO, startOfDay } from 'date-fns';

const testCaseStatusConfig = {
  testCases: {
    label: "Test Cases",
  },
  'Passed': {
    label: "Passed",
    color: '#22c55e',
  },
  'Failed': {
    label: "Failed",
    color: '#ef4444',
  },
  'Blocked': {
    label: "Blocked",
    color: '#f97316',
  },
  'Not Run': {
    label: "Not Run",
    color: '#a1a1aa',
  },
  'Skipped': {
    label: "Skipped",
    color: '#eab308',
  },
} satisfies ChartConfig;

const bugStatusConfig = {
  bugs: {
    label: "Bugs",
  },
  'To Do': {
    label: "To Do",
    color: '#a1a1aa',
  },
  'In Progress': {
    label: "In Progress",
    color: '#3b82f6',
  },
  'Done': {
    label: "Done",
    color: '#22c55e',
  },
} satisfies ChartConfig;

const dailyActivityConfig = {
    executed: { label: 'Executed', color: 'hsl(var(--chart-1))' },
    closed: { label: 'Closed', color: 'hsl(var(--chart-2))' },
    opened: { label: 'Opened', color: 'hsl(var(--chart-5))' },
} satisfies ChartConfig;

export default function TestingDashboard() {
  const { testCases, stories, testPlans } = useProject();
  const [selectedTestPlanId, setSelectedTestPlanId] = useState('all');
  const [dailyViewTestPlanId, setDailyViewTestPlanId] = useState('all');

  const filteredSummaryData = useMemo(() => {
    let filteredTestCases = testCases;
    let relatedBugs: Story[] = [];

    if (selectedTestPlanId !== 'all') {
      const testCaseIdsInPlan = new Set();
      if (selectedTestPlanId === 'none') {
        filteredTestCases = testCases.filter(tc => !tc.testPlanId);
      } else {
        filteredTestCases = testCases.filter(tc => tc.testPlanId === selectedTestPlanId);
      }
      filteredTestCases.forEach(tc => testCaseIdsInPlan.add(tc.id));
      relatedBugs = stories.filter(story => story.itemType === 'Bug' && story.relatedTestCaseId && testCaseIdsInPlan.has(story.relatedTestCaseId));

    } else {
      relatedBugs = stories.filter(story => story.itemType === 'Bug');
    }
    
    // Test Case Metrics
    const testCaseStatusData = Object.entries(
      filteredTestCases.reduce((acc, tc) => {
        acc[tc.status] = (acc[tc.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value, fill: testCaseStatusConfig[name as keyof typeof testCaseStatusConfig]?.color || '#ccc' }));

    // Bug Metrics
    const bugStatusData = Object.entries(
      relatedBugs.reduce((acc, bug) => {
        const status = bug.status || 'To Do';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value, fill: bugStatusConfig[name as keyof typeof bugStatusConfig]?.color || '#ccc' }));


    return {
      testCaseStatusData,
      bugStatusData,
    };
  }, [testCases, stories, selectedTestPlanId]);
  
  const dailyViewData = useMemo(() => {
    let filteredTestCases = testCases;
    let relatedBugs: Story[] = [];

    if (dailyViewTestPlanId !== 'all') {
      const testCaseIdsInPlan = new Set();
       if (dailyViewTestPlanId === 'none') {
        filteredTestCases = testCases.filter(tc => !tc.testPlanId);
      } else {
        filteredTestCases = testCases.filter(tc => tc.testPlanId === dailyViewTestPlanId);
      }
      filteredTestCases.forEach(tc => testCaseIdsInPlan.add(tc.id));
      relatedBugs = stories.filter(story => story.itemType === 'Bug' && story.relatedTestCaseId && testCaseIdsInPlan.has(story.relatedTestCaseId));
    } else {
      relatedBugs = stories.filter(story => story.itemType === 'Bug');
    }
    
    const allDates: Date[] = [];
    filteredTestCases.forEach(tc => {
        if(tc.executionDate) allDates.push(startOfDay(parseISO(tc.executionDate)));
        if(tc.closeDate) allDates.push(startOfDay(parseISO(tc.closeDate)));
    });
    relatedBugs.forEach(bug => {
        if(bug.createdAt) allDates.push(startOfDay(parseISO(bug.createdAt)));
        if(bug.closedAt) allDates.push(startOfDay(parseISO(bug.closedAt)));
    });

    if (allDates.length === 0) return { tcData: [], bugData: [] };

    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    const dateInterval = eachDayOfInterval({ start: minDate, end: maxDate });

    const tcData = dateInterval.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return {
            date: format(date, 'MMM d'),
            executed: filteredTestCases.filter(tc => tc.executionDate && format(parseISO(tc.executionDate), 'yyyy-MM-dd') === dateStr).length,
            closed: filteredTestCases.filter(tc => tc.closeDate && format(parseISO(tc.closeDate), 'yyyy-MM-dd') === dateStr).length,
        };
    });

    const bugData = dateInterval.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return {
            date: format(date, 'MMM d'),
            opened: relatedBugs.filter(bug => bug.createdAt && format(parseISO(bug.createdAt), 'yyyy-MM-dd') === dateStr).length,
            closed: relatedBugs.filter(bug => bug.closedAt && format(parseISO(bug.closedAt), 'yyyy-MM-dd') === dateStr).length,
        };
    });

    return { tcData, bugData };
    
  }, [testCases, stories, dailyViewTestPlanId]);


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="Testing Dashboard" description="Overview of the project's testing status and issues." />
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
              <CardTitle>Test Execution Summary</CardTitle>
               <div className="flex items-center gap-2">
                <Select value={selectedTestPlanId} onValueChange={setSelectedTestPlanId}>
                  <SelectTrigger className="w-[250px] h-8">
                    <SelectValue placeholder="Select a Test Plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Test Plans</SelectItem>
                    <SelectItem value="none">TC Backlog (Unassigned)</SelectItem>
                    {testPlans.map(tp => <SelectItem key={tp.id} value={tp.id}>[{tp.testPlanId}] {tp.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold text-center mb-4">Test Cases by Status</h3>
              <div className="h-[300px] w-full">
                <ChartContainer config={testCaseStatusConfig} className="h-full w-full">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                      <Pie data={filteredSummaryData.testCaseStatusData} dataKey="value" nameKey="name">
                        {filteredSummaryData.testCaseStatusData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartLegend content={<ChartLegendContent />} />
                    </PieChart>
                  </ChartContainer>
              </div>
            </div>
            <div className="flex flex-col">
               <h3 className="text-lg font-semibold text-center mb-4">Bugs by Status</h3>
               <div className="h-[300px] w-full">
                <ChartContainer config={bugStatusConfig} className="h-full w-full">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                      <Pie data={filteredSummaryData.bugStatusData} dataKey="value" nameKey="name">
                        {filteredSummaryData.bugStatusData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartLegend content={<ChartLegendContent />} />
                    </PieChart>
                  </ChartContainer>
               </div>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
           <div className="flex justify-between items-center">
              <CardTitle>Daily View</CardTitle>
               <div className="flex items-center gap-2">
                <Select value={dailyViewTestPlanId} onValueChange={setDailyViewTestPlanId}>
                  <SelectTrigger className="w-[250px] h-8">
                    <SelectValue placeholder="Select a Test Plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Test Plans</SelectItem>
                    <SelectItem value="none">TC Backlog (Unassigned)</SelectItem>
                    {testPlans.map(tp => <SelectItem key={tp.id} value={tp.id}>[{tp.testPlanId}] {tp.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
            <div>
                 <h3 className="text-lg font-semibold text-center mb-4">Test Cases Daily Trend</h3>
                 <ChartContainer config={dailyActivityConfig} className="h-[300px] w-full">
                     <LineChart data={dailyViewData.tcData}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Line type="monotone" dataKey="executed" stroke="var(--color-executed)" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="closed" stroke="var(--color-closed)" strokeWidth={2} dot={false} />
                     </LineChart>
                 </ChartContainer>
            </div>
             <div>
                 <h3 className="text-lg font-semibold text-center mb-4">Bugs Daily Trend</h3>
                 <ChartContainer config={dailyActivityConfig} className="h-[300px] w-full">
                     <LineChart data={dailyViewData.bugData}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Line type="monotone" dataKey="opened" stroke="var(--color-opened)" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="closed" stroke="var(--color-closed)" strokeWidth={2} dot={false} />
                     </LineChart>
                 </ChartContainer>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
