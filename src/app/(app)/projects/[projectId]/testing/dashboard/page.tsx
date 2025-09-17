
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
import { Bar, BarChart, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const { testCases, stories, testPlans } = useProject();
  const [selectedTestPlanId, setSelectedTestPlanId] = useState('all');

  const filteredData = useMemo(() => {
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
                      <Pie data={filteredData.testCaseStatusData} dataKey="value" nameKey="name">
                        {filteredData.testCaseStatusData.map((entry) => (
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
                      <Pie data={filteredData.bugStatusData} dataKey="value" nameKey="name">
                        {filteredData.bugStatusData.map((entry) => (
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
    </div>
  );
}
