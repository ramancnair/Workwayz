
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
import { Story, BugSeverity } from '@/types';

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

const bugSeverityConfig: ChartConfig = {
  bugs: {
    label: "Bugs",
  },
  'Critical': {
    label: "Critical",
    color: '#ef4444',
  },
  'High': {
    label: "High",
    color: '#f97316',
  },
  'Medium': {
    label: "Medium",
    color: '#eab308',
  },
  'Low': {
    label: "Low",
    color: '#a1a1aa',
  },
};


const dailyActivityConfig = {
    executed: { label: 'Executed', color: 'hsl(var(--chart-1))' },
    closed: { label: 'Closed', color: 'hsl(var(--chart-2))' },
    opened: { label: 'Opened', color: 'hsl(var(--chart-5))' },
} satisfies ChartConfig;

const leakageChartConfig = {
  bugs: {
    label: "Bugs",
  },
  'Critical': {
    label: "Critical",
    color: '#a855f7',
  },
  'High': {
    label: "High",
    color: '#ef4444',
  },
  'Medium': {
    label: "Medium",
    color: '#eab308',
  },
  'Low': {
    label: "Low",
    color: '#22c55e',
  },
} satisfies ChartConfig;

export default function TestingDashboard() {
  const { testCases, stories, testPlans } = useProject();
  const [selectedTestPlanId, setSelectedTestPlanId] = useState('all');
  const [dailyViewTestPlanId, setDailyViewTestPlanId] = useState('all');

  const filteredSummaryData = useMemo(() => {
    let filteredTestCases = testCases;
    let relatedBugs: Story[] = [];

    if (selectedTestPlanId !== 'all') {
      const plan = testPlans.find(p => p.id === selectedTestPlanId);
      const planTCIds = new Set(plan?.testCaseIds ?? []);
      filteredTestCases = testCases.filter(tc => planTCIds.has(tc.id));
    }
    const testCaseIdsInView = new Set(filteredTestCases.map(tc => tc.id));
    relatedBugs = stories.filter(story =>
      story.itemType === 'Bug' &&
      story.relatedTestCaseId &&
      testCaseIdsInView.has(story.relatedTestCaseId)
    );
    if (selectedTestPlanId === 'all') {
      relatedBugs = stories.filter(story => story.itemType === 'Bug');
    }
    
    // Test Case Metrics
    let statusesToCount: string[] = [];
    if (selectedTestPlanId !== 'all') {
      filteredTestCases.forEach(tc => {
        const exec = tc.executions?.find(e => e.testPlanId === selectedTestPlanId);
        if (exec) statusesToCount.push(exec.status || 'Not Run');
      });
    } else {
      filteredTestCases.forEach(tc => {
        if (tc.executions) {
          tc.executions.forEach(exec => statusesToCount.push(exec.status || 'Not Run'));
        }
      });
    }

    const testCaseStatusData = Object.entries(
      statusesToCount.reduce((acc, status) => {
        acc[status] = (acc[status] || 0) + 1;
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
    
    // Open Bugs by Severity
    const openBugs = relatedBugs.filter(bug => bug.status === 'To Do' || bug.status === 'In Progress');
    const openBugsBySeverityData = Object.entries(
      openBugs.reduce((acc, bug) => {
        const severity = bug.severity || 'Medium';
        acc[severity] = (acc[severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value, fill: bugSeverityConfig[name as keyof typeof bugSeverityConfig]?.color || '#ccc' }));


    return {
      testCaseStatusData,
      bugStatusData,
      openBugsBySeverityData,
    };
  }, [testCases, stories, selectedTestPlanId, testPlans]);
  
  const dailyViewData = useMemo(() => {
    let filteredTestCases = testCases;
    let relatedBugs: Story[] = [];

    if (dailyViewTestPlanId !== 'all') {
      const plan = testPlans.find(p => p.id === dailyViewTestPlanId);
      const planTCIds = new Set(plan?.testCaseIds ?? []);
      filteredTestCases = testCases.filter(tc => planTCIds.has(tc.id));
    }
    const testCaseIdsInView = new Set(filteredTestCases.map(tc => tc.id));
    relatedBugs = dailyViewTestPlanId === 'all'
      ? stories.filter(story => story.itemType === 'Bug')
      : stories.filter(story =>
          story.itemType === 'Bug' &&
          story.relatedTestCaseId &&
          testCaseIdsInView.has(story.relatedTestCaseId)
        );
    
    const tcExecutionsInView: any[] = [];
    filteredTestCases.forEach(tc => {
       if (dailyViewTestPlanId !== 'all') {
          const exec = tc.executions?.find(e => e.testPlanId === dailyViewTestPlanId);
          if (exec) tcExecutionsInView.push(exec);
       } else {
          if (tc.executions) tcExecutionsInView.push(...tc.executions);
       }
    });

    const allDates: Date[] = [];
    tcExecutionsInView.forEach(exec => {
        if(exec.executionDate) allDates.push(startOfDay(parseISO(exec.executionDate)));
        if(exec.closeDate) allDates.push(startOfDay(parseISO(exec.closeDate)));
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
            executed: tcExecutionsInView.filter(exec => exec.executionDate && format(parseISO(exec.executionDate), 'yyyy-MM-dd') === dateStr).length,
            closed: tcExecutionsInView.filter(exec => exec.closeDate && format(parseISO(exec.closeDate), 'yyyy-MM-dd') === dateStr).length,
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
    
  }, [testCases, stories, dailyViewTestPlanId, testPlans]);

  const sortedTestPlansForLeakage = useMemo(() => {
    return [...testPlans].sort((a, b) => {
      const getOrder = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('sit')) return 1;
        if (n.includes('uat')) return 2;
        if (n.includes('prod') || n.includes('production')) return 3;
        return 4;
      };
      
      const orderA = getOrder(a.name);
      const orderB = getOrder(b.name);
      
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });
  }, [testPlans]);

  const leakageChartData = useMemo(() => {
    const bugs = stories.filter(s => s.itemType === 'Bug');
    
    return sortedTestPlansForLeakage.map(plan => {
      const planBugs = bugs.filter(b => b.foundInTestPlanId === plan.id);
      
      const criticalCount = planBugs.filter(b => b.severity === 'Critical').length;
      const highCount = planBugs.filter(b => b.severity === 'High').length;
      const mediumCount = planBugs.filter(b => b.severity === 'Medium').length;
      const lowCount = planBugs.filter(b => b.severity === 'Low' || !b.severity).length;
      
      return {
        planName: plan.name,
        planCode: plan.testPlanId,
        'Critical': criticalCount,
        'High': highCount,
        'Medium': mediumCount,
        'Low': lowCount,
        total: planBugs.length
      };
    });
  }, [sortedTestPlansForLeakage, stories]);


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
                    {testPlans.map(tp => <SelectItem key={tp.id} value={tp.id}>[{tp.testPlanId}] {tp.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-3">
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
            <div className="flex flex-col">
               <h3 className="text-lg font-semibold text-center mb-4">Open Bugs by Severity</h3>
               <div className="h-[300px] w-full">
                <ChartContainer config={bugSeverityConfig} className="h-full w-full">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                      <Pie data={filteredSummaryData.openBugsBySeverityData} dataKey="value" nameKey="name">
                        {filteredSummaryData.openBugsBySeverityData.map((entry) => (
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

      <Card>
        <CardHeader>
          <CardTitle>Test Leakage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
            <ChartContainer config={leakageChartConfig} className="h-full w-full">
              <BarChart data={leakageChartData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis 
                  dataKey="planName" 
                  tickLine={false} 
                  tickMargin={10} 
                  axisLine={false} 
                />
                <YAxis 
                  allowDecimals={false} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="Low" stackId="a" fill="var(--color-Low)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Medium" stackId="a" fill="var(--color-Medium)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="High" stackId="a" fill="var(--color-High)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Critical" stackId="a" fill="var(--color-Critical)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
