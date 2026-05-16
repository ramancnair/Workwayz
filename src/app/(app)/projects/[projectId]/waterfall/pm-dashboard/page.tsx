'use client';

import { useProject } from '@/context/ProjectContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, ReferenceLine, AreaChart, Area, ComposedChart
} from 'recharts';
import { format, isBefore, isAfter, startOfWeek, addWeeks, parseISO, differenceInDays } from 'date-fns';

export default function PmWaterfallDashboard() {
  const { stories, worklogs, employees, project, fixedCosts, kanbanColumns, testDate } = useProject();

  // Determine the done column name dynamically from Kanban configuration
  const doneColumnName = kanbanColumns.find(c => c.isDoneColumn)?.name || 'Done';

  // 1. Process Data for EVM
  // We bucket the project timeline into weeks.
  const projectStart = project?.startDate ? new Date(project.startDate) : new Date();
  const projectEnd = project?.endDate ? new Date(project.endDate) : addWeeks(projectStart, 10);
  
  const totalDays = differenceInDays(projectEnd, projectStart) || 1;
  const weeksCount = Math.max(Math.ceil(totalDays / 7), 1);
  
  const evmData = [];
  const sCurveData = [];
  const costPerReqData = [];

  // Helper: hourly COST rate (what it costs the company)
  const getEmployeeHourlyCost = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return 0;
    return (emp.costRate || 0) / 8; // daily cost → hourly
  };

  // Helper: hourly BILLING rate (what the work earns / is worth to the client)
  // Falls back to cost rate if billing rate is not configured.
  const getEmployeeHourlyBillingRate = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return 0;
    return (emp.billedRate || emp.costRate || 0) / 8;
  };

  // Find resources who are NOT assigned to any subtask
  const assignedResourceIds = new Set(
    stories.filter(s => s.itemType === 'Sub Task' && !!s.assigneeId).map(s => s.assigneeId)
  );
  const unassignedResources = employees.filter(e => !assignedResourceIds.has(e.id));

  let cumulativePV = 0;
  let cumulativeEV = 0;
  let cumulativeAC = 0;

  const totalFixedCost = fixedCosts?.reduce((sum, fc) => sum + (fc.cost || 0), 0) || 0;

  for (let i = 0; i < weeksCount; i++) {
    const weekStart = addWeeks(projectStart, i);
    const weekEnd = addWeeks(weekStart, 1);
    
    // Calculate PV (Planned Value): Estimated cost of work planned to be done up to this week
    let weeklyPV = 0;
    let weeklyEV = 0;
    let weeklyAC = 0;

    // Add fixed costs at the very beginning to Actual Cost
    if (i === 0) {
      weeklyAC += totalFixedCost;
    }

    // PV for resources NOT assigned subtasks (8 hrs/day * billed value * working days)
    unassignedResources.forEach(emp => {
       const dailyBilling = emp.billedRate || emp.costRate || 0;
       // Assuming 5 working days per week
       weeklyPV += dailyBilling * 5; 
    });

    // PV: estimate of the subtasks multiplied by billing rate of assigned resource
    stories.filter(s => s.itemType === 'Sub Task').forEach(story => {
      const assignee = employees.find(e => e.id === story.assigneeId);
      const dailyBilling = assignee ? (assignee.billedRate || assignee.costRate || 0) : 0;
      const hourlyBilling = dailyBilling / 8;

      const storyValue = story.effortDays
        ? story.effortDays * dailyBilling
        : (story.estimatedHours || 0) * hourlyBilling;

      const storyStart = story.startDate ? new Date(story.startDate) : projectStart;
      const storyEnd = story.endDate ? new Date(story.endDate) : projectEnd;
      const storyDuration = Math.max(differenceInDays(storyEnd, storyStart), 1);

      if (!isBefore(storyEnd, weekStart) && !isAfter(storyStart, weekEnd)) {
        weeklyPV += storyValue / Math.ceil(storyDuration / 7);
      }
    });

    // EV + AC: both derived from worklogs in a single pass
    // EV = hours × billing rate (value earned); AC = hours × cost rate (money spent)
    worklogs.forEach(log => {
      const logDate = new Date(log.date);
      if (logDate >= weekStart && logDate < weekEnd) {
        weeklyEV += log.totalHours * getEmployeeHourlyBillingRate(log.employeeId);
        weeklyAC += log.totalHours * getEmployeeHourlyCost(log.employeeId);
      }
    });

    cumulativePV += weeklyPV;
    cumulativeEV += weeklyEV;
    cumulativeAC += weeklyAC;

    // Use the calendar date of each week start as the X-axis label (e.g. "May 1")
    const weekLabel = format(weekStart, 'MMM d');

    evmData.push({
      week: weekLabel,
      PV: Math.round(cumulativePV),
      EV: Math.round(cumulativeEV),
      AC: Math.round(cumulativeAC),
    });

    sCurveData.push({
      week: weekLabel,
      CumulativeCost: Math.round(cumulativeAC),
      PlannedCost: Math.round(cumulativePV),
    });
  }

  // 2. Cost per completed requirement
  // Use closedAt to identify completed requirements (set when story moves to the Done column)
  const completedReqs = stories.filter(s => s.itemType === 'Requirement/Story' && !!s.closedAt);
  
  let totalReqCost = 0;
  
  completedReqs.forEach(req => {
    let reqCost = 0;
    worklogs.forEach(log => {
      const relatedItem = log.items.find(item => item.itemId === req.id);
      if (relatedItem) {
        const empCost = getEmployeeHourlyCost(log.employeeId);
        reqCost += relatedItem.hours * empCost;
      }
    });
    
    // If no worklog is tied, but it's completed, we don't arbitrarily add cost anymore.
    // Cost is strictly derived from worklogs or it stays $0.

    totalReqCost += reqCost;
    
    if (req.title) {
        costPerReqData.push({
        name: req.title.length > 15 ? req.title.substring(0, 15) + '...' : req.title,
        cost: Math.round(reqCost)
        });
    }
  });

  const avgCostPerReq = completedReqs.length > 0 ? Math.round(totalReqCost / completedReqs.length) : 0;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <PageHeader 
        title="PM Waterfall Dashboard" 
        description="Key project management metrics including EVM, Costs, and S-Curves based on actual project data." 
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* EVM Chart */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Earned Value Management (EVM)</CardTitle>
            <CardDescription>PV = planned cost of scheduled work. EV = value earned from actual hours logged (hours × billing rate). AC = actual cost incurred (hours × cost rate).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evmData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="week" className="text-xs" angle={-45} textAnchor="end" height={55} interval="preserveStartEnd" />
                  <YAxis className="text-xs" tickFormatter={(value) => `$${value}`} />
                  <RechartsTooltip formatter={(value) => [`$${value}`, undefined]} />
                  <Legend />
                  <Line type="monotone" dataKey="PV" name="Planned Value (PV)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="EV" name="Earned Value (EV)" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="AC" name="Actual Cost (AC)" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Cost vs Time (S-Curve) */}
        <Card className="col-span-2 md:col-span-1">
          <CardHeader>
            <CardTitle>Cost vs Time (S-Curve)</CardTitle>
            <CardDescription>Cumulative project cost and baseline over time.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sCurveData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="week" className="text-xs" angle={-45} textAnchor="end" height={55} interval="preserveStartEnd" />
                  <YAxis className="text-xs" tickFormatter={(value) => `$${value}`} />
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <RechartsTooltip formatter={(value) => [`$${value}`, undefined]} />
                  <Legend />
                  <Area type="monotone" dataKey="PlannedCost" name="Baseline (Planned)" stroke="#3b82f6" fillOpacity={1} fill="url(#colorPlanned)" />
                  <Area type="monotone" dataKey="CumulativeCost" name="Cumulative Actual Cost" stroke="#ef4444" fillOpacity={1} fill="url(#colorActual)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Cost per Completed Requirement */}
        <Card className="col-span-2 md:col-span-1">
          <CardHeader>
            <CardTitle>Cost per Completed Requirement</CardTitle>
            <CardDescription>Actual cost incurred per completed requirement against the average.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {costPerReqData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={costPerReqData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={60} />
                      <YAxis className="text-xs" tickFormatter={(value) => `$${value}`} />
                      <RechartsTooltip formatter={(value) => [`$${value}`, undefined]} />
                      <Legend verticalAlign="top" />
                      <Bar dataKey="cost" name="Requirement Cost" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      <ReferenceLine y={avgCostPerReq} stroke="#10b981" strokeDasharray="3 3" label={{ position: 'top', value: `Avg: $${avgCostPerReq}`, fill: '#10b981', fontSize: 12 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
              ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                      No completed requirements to display cost data.
                  </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
