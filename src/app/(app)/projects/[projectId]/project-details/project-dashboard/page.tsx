
'use client';

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
import { Bar, BarChart, CartesianGrid, LabelList, Pie, PieChart, RadialBar, RadialBarChart, XAxis, YAxis, Label, Cell } from 'recharts';
import { Users, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/StatsCard';

const taskChartData = [
  { name: 'Not Started', value: 2, fill: 'hsl(var(--muted-foreground))' },
  { name: 'Complete', value: 24, fill: 'hsl(var(--chart-2))' },
  { name: 'In Progress', value: 4, fill: 'hsl(var(--chart-1))' },
];

const workloadChartData = [
  { name: 'Jennifer', completed: 120, remaining: 30 },
  { name: 'Monica', completed: 80, remaining: 10 },
  { name: 'Natalie', completed: 90, remaining: 0 },
  { name: 'Rachel', completed: 75, remaining: 20 },
  { name: 'Steve', completed: 85, remaining: 0 },
  { name: 'Joe', completed: 40, remaining: 25 },
  { name: 'Danny', completed: 50, remaining: 0 },
];

const costChartData = [
    { name: 'Actual', value: 380, fill: 'hsl(var(--chart-1))' },
    { name: 'Planned', value: 320, fill: 'hsl(var(--primary))' },
    { name: 'Budget', value: 350, fill: 'hsl(var(--destructive))' },
]

const timeChartData = [
  { name: 'Planned Completion', value: 88, fill: 'hsl(var(--primary))' },
  { name: 'Actual Completion', value: 92, fill: 'hsl(var(--primary))' },
  { name: 'Ahead', value: 4, fill: 'hsl(var(--chart-2))' },
];

const resourceCostsData = [
  { name: 'Developer', planned: 150000, actual: 90000 },
  { name: 'Analyst', planned: 300000, actual: 150000 },
  { name: 'Project Manager', planned: 10000, actual: 5000 },
  { name: 'QA', planned: 50000, actual: 25000 },
  { name: 'Support', planned: 40000, actual: 10000 },
];

const resourceCostsConfig = {
  planned: { label: 'Planned', color: 'hsl(var(--chart-2))' },
  actual: { label: 'Actual', color: 'hsl(var(--chart-1))' },
} satisfies ChartConfig;

const resourceCostsPieData = [
  { name: 'Planned', value: 555000, fill: 'hsl(var(--chart-2))' },
  { name: 'Actual', value: 289100, fill: 'hsl(var(--chart-1))' },
];


const softwareCostsData = [
    { name: 'Software', planned: 215000, actual: 250000, ongoing: 50000 },
];
const hardwareCostsData = [
    { name: 'Hardware', planned: 33600, actual: 4340, ongoing: 0 },
];
const otherCostsData = [
    { name: 'Others', planned: 100000, actual: 80000 },
];

const otherCostsConfig = {
  planned: { label: 'Planned', color: 'hsl(var(--chart-1))' },
  actual: { label: 'Actual', color: 'hsl(var(--chart-5))' },
  ongoing: { label: 'Ongoing', color: 'hsl(var(--muted-foreground))' },
} satisfies ChartConfig;


export default function ProjectDashboardPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader title="Project Dashboard" description="A high-level overview of the project's status." />
      
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Health</CardTitle>
          </CardHeader>
          <CardContent>
             <Table>
                <TableBody>
                    <TableRow><TableCell className="font-medium">Time</TableCell><TableCell className="text-right">4% ahead of schedule</TableCell></TableRow>
                    <TableRow><TableCell className="font-medium">Tasks</TableCell><TableCell className="text-right">6 tasks to be completed</TableCell></TableRow>
                    <TableRow><TableCell className="font-medium">Workload</TableCell><TableCell className="text-right text-green-600">0 tasks overdue</TableCell></TableRow>
                    <TableRow><TableCell className="font-medium">Progress</TableCell><TableCell className="text-right">92% complete</TableCell></TableRow>
                    <TableRow><TableCell className="font-medium">Cost</TableCell><TableCell className="text-right text-red-500">4% over budget</TableCell></TableRow>
                </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ChartContainer config={{}} className="mx-auto aspect-square h-[250px]">
                <PieChart>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Pie data={taskChartData} dataKey="value" nameKey="name" innerRadius={80} outerRadius={100} strokeWidth={5}>
                        <LabelList
                            dataKey="value"
                            className="fill-foreground text-2xl font-bold"
                            position="center"
                            formatter={(value: string) => taskChartData.reduce((acc, curr) => acc + curr.value, 0).toString()}
                        />
                    </Pie>
                </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
              <div>
                  <p className="text-sm font-medium">1. Analysis</p>
                  <Progress value={100} className="h-3" />
              </div>
               <div>
                  <p className="text-sm font-medium">2. Design</p>
                  <Progress value={100} className="h-3" />
              </div>
               <div>
                  <p className="text-sm font-medium">3. Development</p>
                  <Progress value={80} className="h-3" />
              </div>
               <div>
                  <p className="text-sm font-medium">4. Testing</p>
                  <Progress value={60} className="h-3" />
              </div>
          </CardContent>
        </Card>
        
         <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Time</CardTitle>
          </CardHeader>
          <CardContent>
             <ChartContainer config={{}} className="h-[250px] w-full">
                <BarChart data={timeChartData} layout="vertical" margin={{ left: 50, right: 20 }}>
                    <XAxis type="number" domain={[-100, 100]} hide />
                    <YAxis type="category" dataKey="name" hide />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="value" layout="vertical" stackId="a" radius={4} barSize={20} />
                </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[250px] w-full">
                <BarChart data={costChartData} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                    <YAxis tickFormatter={(value) => `${'$'}{value/1000}K`} />
                    <XAxis dataKey="name" hide/>
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="value" radius={4} />
                </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Workload</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[250px] w-full">
                <BarChart data={workloadChartData} layout="vertical" stackOffset="expand" margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="completed" stackId="a" fill="hsl(var(--chart-2))" radius={[4,0,0,4]} />
                    <Bar dataKey="remaining" stackId="a" fill="hsl(var(--chart-1))" radius={[0,4,4,0]} />
                </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

       <Card className="mt-6">
        <CardHeader>
          <CardTitle>Resource Costs</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <ChartContainer config={resourceCostsConfig} className="h-[300px] w-full">
              <BarChart data={resourceCostsData} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickFormatter={(value) => `$${Number(value) / 1000}K`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="planned" stackId="a" fill="var(--color-planned)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" stackId="a" fill="var(--color-actual)" />
              </BarChart>
            </ChartContainer>
          </div>
          <div className="flex items-center justify-center">
            <ChartContainer config={resourceCostsConfig} className="h-[250px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="name" />} />
                <Pie data={resourceCostsPieData} dataKey="value" nameKey="name" innerRadius={50}>
                  {resourceCostsPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                   <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <>
                              <text x={viewBox.cx} y={viewBox.cy! - 15} textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-sm font-semibold">
                                Total
                              </text>
                               <text x={viewBox.cx} y={viewBox.cy! + 15} textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-lg font-bold">
                                {'$'}{(resourceCostsPieData.reduce((acc, curr) => acc + curr.value, 0) / 1000).toFixed(0)}K
                              </text>
                            </>
                          );
                        }
                      }}
                    />
                </Pie>
                 <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Software, Hardware and Other Costs</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ChartContainer config={otherCostsConfig} className="h-[300px] w-full">
                <BarChart data={softwareCostsData} margin={{ left: 10, right: 10, top: 20, bottom: 10 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="planned" fill="var(--color-planned)" radius={4}>
                         <LabelList dataKey="planned" position="top" formatter={(value: number) => `$${(value / 1000).toFixed(0)}K`} />
                    </Bar>
                    <Bar dataKey="actual" fill="var(--color-actual)" radius={4}>
                         <LabelList dataKey="actual" position="top" formatter={(value: number) => `$${(value / 1000).toFixed(0)}K`} />
                    </Bar>
                    <Bar dataKey="ongoing" fill="var(--color-ongoing)" radius={4}>
                         <LabelList dataKey="ongoing" position="top" formatter={(value: number) => `$${(value / 1000).toFixed(0)}K`} />
                    </Bar>
                </BarChart>
            </ChartContainer>
             <ChartContainer config={otherCostsConfig} className="h-[300px] w-full">
                <BarChart data={hardwareCostsData} margin={{ left: 10, right: 10, top: 20, bottom: 10 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="planned" fill="var(--color-planned)" radius={4}>
                        <LabelList dataKey="planned" position="top" formatter={(value: number) => `$${(value / 1000).toFixed(1)}K`} />
                    </Bar>
                    <Bar dataKey="actual" fill="var(--color-actual)" radius={4}>
                        <LabelList dataKey="actual" position="top" formatter={(value: number) => `$${(value / 1000).toFixed(1)}K`} />
                    </Bar>
                </BarChart>
            </ChartContainer>
             <ChartContainer config={otherCostsConfig} className="h-[300px] w-full">
                <BarChart data={otherCostsData} margin={{ left: 10, right: 10, top: 20, bottom: 10 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="planned" fill="var(--color-planned)" radius={4} />
                    <Bar dataKey="actual" fill="var(--color-actual)" radius={4} />
                </BarChart>
            </ChartContainer>
        </CardContent>
      </Card>

    </div>
  );
}
