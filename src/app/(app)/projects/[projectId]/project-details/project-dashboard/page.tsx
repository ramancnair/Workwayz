
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
import { Bar, BarChart, CartesianGrid, LabelList, Pie, PieChart, RadialBar, RadialBarChart, XAxis, YAxis } from 'recharts';
import { Users, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

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
             <ChartLegend content={<ChartLegendContent />} />
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ChartContainer config={{}} className="mx-auto aspect-square h-[250px]">
                <PieChart>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
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
             <ChartLegend content={<ChartLegendContent />} />
          </CardHeader>
          <CardContent>
             <ChartContainer config={{}} className="h-[250px] w-full">
                <BarChart data={timeChartData} layout="vertical" margin={{ left: 50, right: 20 }}>
                    <XAxis type="number" domain={[-100, 100]} hide />
                    <YAxis type="category" dataKey="name" hide />
                    <Bar dataKey="value" layout="vertical" stackId="a" radius={4} barSize={20} />
                </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Cost</CardTitle>
             <ChartLegend content={<ChartLegendContent />} />
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[250px] w-full">
                <BarChart data={costChartData} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                    <YAxis tickFormatter={(value) => `${value/1000}K`} />
                    <XAxis dataKey="name" hide/>
                    <Bar dataKey="value" radius={4} />
                </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Workload</CardTitle>
            <ChartLegend content={<ChartLegendContent />} />
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[250px] w-full">
                <BarChart data={workloadChartData} layout="vertical" stackOffset="expand" margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Bar dataKey="completed" stackId="a" fill="hsl(var(--chart-2))" radius={[4,0,0,4]} />
                    <Bar dataKey="remaining" stackId="a" fill="hsl(var(--chart-1))" radius={[0,4,4,0]} />
                </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
