'use client';

import { PageHeader } from '@/components/PageHeader';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { testCases, bugs } from '@/lib/mock-data';
import { Bug, ClipboardCheck, AlertTriangle, ShieldCheck, Flame } from 'lucide-react';
import { ResponsiveContainer, Pie, Cell, Legend, Tooltip, BarChart, XAxis, YAxis, Bar } from 'recharts';

const BUG_STATUS_COLORS = {
  'Open': '#ef4444',
  'In Progress': '#f97316',
  'Fixed': '#3b82f6',
  'Closed': '#22c55e',
};

const TEST_CASE_STATUS_COLORS = {
  'Pass': '#22c55e',
  'Fail': '#ef4444',
  'Not Run': '#a1a1aa',
};

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
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={bugStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {bugStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={BUG_STATUS_COLORS[entry.name as keyof typeof BUG_STATUS_COLORS]} />
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
            <CardTitle>Test Cases by Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={testCaseStatusData} layout="vertical">
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip />
                <Bar dataKey="value" name="Test Cases">
                    {testCaseStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={TEST_CASE_STATUS_COLORS[entry.name as keyof typeof TEST_CASE_STATUS_COLORS]} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
