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
import { testCases, bugs } from '@/lib/mock-data';
import { Bug, ClipboardCheck, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Bar, BarChart, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';

const bugStatusConfig = {
  bugs: {
    label: "Bugs",
  },
  'Open': {
    label: "Open",
    color: '#ef4444',
  },
  'In Progress': {
    label: "In Progress",
    color: '#f97316',
  },
  'Fixed': {
    label: "Fixed",
    color: '#3b82f6',
  },
  'Closed': {
    label: "Closed",
    color: '#22c55e',
  },
} satisfies ChartConfig;

const testCaseStatusConfig = {
  testCases: {
    label: "Test Cases",
  },
  'Pass': {
    label: "Pass",
    color: '#22c55e',
  },
  'Fail': {
    label: "Fail",
    color: '#ef4444',
  },
  'Not Run': {
    label: "Not Run",
    color: '#a1a1aa',
  },
} satisfies ChartConfig;

export default function TestingDashboard() {
  const totalTests = testCases.length;
  const passedTests = testCases.filter((tc) => tc.status === 'Pass').length;
  const failedTests = testCases.filter((tc) => tc.status === 'Fail').length;
  const openBugs = bugs.filter((bug) => bug.status === 'Open').length;

  const bugStatusData = Object.entries(
    bugs.reduce((acc, bug) => {
      acc[bug.status] = (acc[bug.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const testCaseStatusData = Object.entries(
    testCases.reduce((acc, tc) => {
      acc[tc.status] = (acc[tc.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));
  
  const bugsBySeverityData = Object.entries(
    bugs.reduce((acc, bug) => {
        acc[bug.severity] = (acc[bug.severity] || 0) + 1;
        return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="Testing Dashboard" description="Overview of the project's testing status and issues." />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Test Cases" value={totalTests.toString()} icon={ClipboardCheck} />
        <StatsCard title="Passed Tests" value={passedTests.toString()} icon={ShieldCheck} />
        <StatsCard title="Failed Tests" value={failedTests.toString()} icon={AlertTriangle} />
        <StatsCard title="Open Bugs" value={openBugs.toString()} icon={Bug} />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Bugs by Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
             <ChartContainer config={bugStatusConfig}>
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie data={bugStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {bugStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={bugStatusConfig[entry.name as keyof typeof bugStatusConfig]?.color} />
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
            <CardTitle>Test Cases by Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
             <ChartContainer config={testCaseStatusConfig} className="h-full w-full">
                <BarChart accessibilityLayer data={testCaseStatusData} layout="vertical" margin={{ left: -10 }}>
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
      </div>
    </div>
  );
}
