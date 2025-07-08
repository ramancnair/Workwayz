
'use client';

import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart";
import { Bar, BarChart, Cell, XAxis, YAxis } from 'recharts';
import { ClipboardCheck, AlertTriangle, ShieldCheck, Ban, Bug, CheckCircle, Clock } from 'lucide-react';

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

export default function TestingDashboard() {
  const { testCases, stories } = useProject();

  // Test Case Metrics
  const totalTests = testCases.length;
  const passedTests = testCases.filter((tc) => tc.status === 'Passed').length;
  const failedTests = testCases.filter((tc) => tc.status === 'Failed').length;
  const blockedTests = testCases.filter((tc) => tc.status === 'Blocked').length;

  const testCaseStatusData = Object.entries(
    testCases.reduce((acc, tc) => {
      acc[tc.status] = (acc[tc.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  // Bug Metrics
  const bugs = stories.filter(story => story.itemType === 'Bug');
  const totalBugs = bugs.length;
  const openBugs = bugs.filter(b => b.status !== 'Done').length;
  const closedBugs = totalBugs - openBugs;
  
  const bugStatusData = Object.entries(
    bugs.reduce((acc, bug) => {
      acc[bug.status] = (acc[bug.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));
  
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="Testing Dashboard" description="Overview of the project's testing status and issues." />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Test Cases" value={totalTests.toString()} icon={ClipboardCheck} />
        <StatsCard title="Passed" value={passedTests.toString()} icon={ShieldCheck} />
        <StatsCard title="Failed" value={failedTests.toString()} icon={AlertTriangle} />
        <StatsCard title="Blocked" value={blockedTests.toString()} icon={Ban} />
      </div>
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Bugs" value={totalBugs.toString()} icon={Bug} />
        <StatsCard title="Open Bugs" value={openBugs.toString()} icon={Clock} description={`${closedBugs} closed`} />
        <StatsCard title="Closed Bugs" value={closedBugs.toString()} icon={CheckCircle} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Test Cases by Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
             <ChartContainer config={testCaseStatusConfig} className="h-full w-full">
                <BarChart accessibilityLayer data={testCaseStatusData} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" hide/>
                  <YAxis type="category" dataKey="name" width={80} tickLine={false} axisLine={false}/>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Bar dataKey="value" name="Test Cases" layout="vertical" radius={4}>
                      {testCaseStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={testCaseStatusConfig[entry.name as keyof typeof testCaseStatusConfig]?.color} />
                      ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bugs by Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
             <ChartContainer config={bugStatusConfig} className="h-full w-full">
                <BarChart accessibilityLayer data={bugStatusData} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" hide/>
                  <YAxis type="category" dataKey="name" width={80} tickLine={false} axisLine={false}/>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Bar dataKey="value" name="Bugs" layout="vertical" radius={4}>
                      {bugStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={bugStatusConfig[entry.name as keyof typeof bugStatusConfig]?.color} />
                      ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
