
'use client';

import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig
} from "@/components/ui/chart";
import { Pie, PieChart } from 'recharts';
import { ShieldAlert, NotebookText, AlertCircle, Link2 } from 'lucide-react';
import type { Risk, Assumption, Issue, Dependency, IssueStatus, RiskSeverity, RiskProbability, AssumptionStatus, DependencyStatus } from '@/types';

// Helper to get risk potential
const getRiskPotential = (severity: RiskSeverity, probability: RiskProbability) => {
  const potential = severity * probability;
  if (potential <= 3) return 'Low';
  if (potential <= 6) return 'Medium';
  return 'High';
};

const riskConfig = {
  risks: { label: "Risks" },
  'Low': { label: "Low", color: '#22c55e' },
  'Medium': { label: "Medium", color: '#f97316' },
  'High': { label: "High", color: '#ef4444' },
} satisfies ChartConfig;

const assumptionConfig = {
  assumptions: { label: "Assumptions" },
  'Active': { label: 'Active', color: '#ef4444' },
  'Validated': { label: 'Validated', color: '#22c55e' },
  'Invalidated': { label: 'Invalidated', color: '#a1a1aa' },
} satisfies ChartConfig;

const issueConfig = {
  issues: { label: "Issues" },
  'Open': { label: 'Open', color: '#ef4444' },
  'In Progress': { label: 'In Progress', color: '#facc15' },
  'Resolved': { label: 'Resolved', color: '#22c55e' },
  'Closed': { label: 'Closed', color: '#a1a1aa' },
} satisfies ChartConfig;

const dependencyConfig = {
  dependencies: { label: "Dependencies" },
  'On Track': { label: 'On Track', color: '#22c55e' },
  'At Risk': { label: 'At Risk', color: '#f97316' },
  'Blocked': { label: 'Blocked', color: '#ef4444' },
} satisfies ChartConfig;

export default function RaidDashboardPage() {
  const { risks, assumptions, issues, dependencies } = useProject();

  // Risks Data
  const riskData = Object.entries(
    risks.reduce((acc, r) => {
      const potential = getRiskPotential(r.severity, r.probability);
      acc[potential] = (acc[potential] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value, fill: riskConfig[name as keyof typeof riskConfig]?.color || '#8884d8' }));
  const totalRisks = riskData.reduce((sum, item) => sum + item.value, 0);
  const highPotentialRisks = riskData.find(item => item.name === 'High')?.value || 0;

  // Assumptions Data
  const assumptionData = Object.entries(
    assumptions.reduce((acc, a) => {
      const status: AssumptionStatus = a.status || 'Active';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value, fill: assumptionConfig[name as keyof typeof assumptionConfig]?.color || '#8884d8' }));
  const totalAssumptions = assumptionData.reduce((sum, item) => sum + item.value, 0);
  const activeAssumptions = assumptionData.find(item => item.name === 'Active')?.value || 0;

  // Issues Data
  const issueData = Object.entries(
    issues.reduce((acc, i) => {
      const status: IssueStatus = i.status || 'Open';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<IssueStatus, number>)
  ).map(([name, value]) => ({ name, value, fill: issueConfig[name as keyof typeof issueConfig]?.color || '#8884d8' }));
  const totalIssues = issueData.reduce((sum, item) => sum + item.value, 0);
  const openIssues = (issueData.find(item => item.name === 'Open')?.value || 0) + (issueData.find(item => item.name === 'In Progress')?.value || 0);

  // Dependencies Data
  const dependencyData = Object.entries(
    dependencies.reduce((acc, d) => {
      const status: DependencyStatus = d.status || 'On Track';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value, fill: dependencyConfig[name as keyof typeof dependencyConfig]?.color || '#8884d8' }));
  const totalDependencies = dependencyData.reduce((sum, item) => sum + item.value, 0);
  const atRiskDependencies = (dependencyData.find(item => item.name === 'At Risk')?.value || 0) + (dependencyData.find(item => item.name === 'Blocked')?.value || 0);

  const ChartCard = ({ title, config, data }: { title: string, config: ChartConfig, data: { name: string, value: number, fill: string }[] }) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[250px]">
        <ChartContainer config={config} className="mx-auto aspect-square h-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
            <Pie data={data} dataKey="value" nameKey="name" strokeWidth={5} />
            <ChartLegend
                content={<ChartLegendContent nameKey="name" />}
                className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="RAID Dashboard" description="Overview of Risks, Assumptions, Issues, and Dependencies." />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Risks" value={totalRisks.toString()} icon={ShieldAlert} description={`${highPotentialRisks} high potential`} />
        <StatsCard title="Total Assumptions" value={totalAssumptions.toString()} icon={NotebookText} description={`${activeAssumptions} active`} />
        <StatsCard title="Total Issues" value={totalIssues.toString()} icon={AlertCircle} description={`${openIssues} open`} />
        <StatsCard title="Total Dependencies" value={totalDependencies.toString()} icon={Link2} description={`${atRiskDependencies} at risk`} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="Risks by Potential" config={riskConfig} data={riskData} />
        <ChartCard title="Assumptions by Status" config={assumptionConfig} data={assumptionData} />
        <ChartCard title="Issues by Status" config={issueConfig} data={issueData} />
        <ChartCard title="Dependencies by Status" config={dependencyConfig} data={dependencyData} />
      </div>
    </div>
  );
}
