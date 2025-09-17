
'use client';

import { useState, useMemo } from 'react';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Bar, BarChart, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { ClipboardCheck, AlertTriangle, ShieldCheck, Ban, Bug, CheckCircle, Clock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

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
  const { testCases, stories, sprints, releasesAndMilestones, testPlans } = useProject();
  const [selectedTestPlanId, setSelectedTestPlanId] = useState('all');

  const filteredData = useMemo(() => {
    let filteredTestCases = testCases;
    let filteredBugs = stories.filter(story => story.itemType === 'Bug');

    if (selectedTestPlanId !== 'all') {
      if (selectedTestPlanId === 'none') {
        filteredTestCases = filteredTestCases.filter(tc => !tc.testPlanId);
      } else {
        filteredTestCases = filteredTestCases.filter(tc => tc.testPlanId === selectedTestPlanId);
      }
    }
    
    // Test Case Metrics
    const totalTests = filteredTestCases.length;
    const passedTests = filteredTestCases.filter((tc) => tc.status === 'Passed').length;
    const failedTests = filteredTestCases.filter((tc) => tc.status === 'Failed').length;
    const blockedTests = filteredTestCases.filter((tc) => tc.status === 'Blocked').length;
    const testCaseStatusData = Object.entries(
      filteredTestCases.reduce((acc, tc) => {
        acc[tc.status] = (acc[tc.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value, fill: testCaseStatusConfig[name as keyof typeof testCaseStatusConfig]?.color || '#ccc' }));

    // Bug Metrics
    const totalBugs = filteredBugs.length;
    const openBugs = filteredBugs.filter(b => b.status !== 'Done').length;
    const closedBugs = totalBugs - openBugs;
    const bugStatusData = Object.entries(
      filteredBugs.reduce((acc, bug) => {
        const status = bug.status || 'To Do';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value }));

    return {
      totalTests,
      passedTests,
      failedTests,
      blockedTests,
      testCaseStatusData,
      totalBugs,
      openBugs,
      closedBugs,
      bugStatusData,
    };
  }, [testCases, stories, selectedTestPlanId, testPlans]);


  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="Testing Dashboard" description="Overview of the project's testing status and issues." />
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Test Cases by Status</CardTitle>
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
          <CardContent className="h-[300px]">
             <ChartContainer config={testCaseStatusConfig} className="h-full w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie data={filteredData.testCaseStatusData} dataKey="value" nameKey="name">
                     {filteredData.testCaseStatusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bugs by Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
             <ChartContainer config={bugStatusConfig} className="h-full w-full">
                <BarChart accessibilityLayer data={filteredData.bugStatusData} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" hide/>
                  <YAxis type="category" dataKey="name" width={80} tickLine={false} axisLine={false}/>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Bar dataKey="value" name="Bugs" layout="vertical" radius={4}>
                      {filteredData.bugStatusData.map((entry, index) => (
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
