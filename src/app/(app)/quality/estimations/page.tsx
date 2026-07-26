'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, getDocs, doc, query, where } from '@/lib/db-provider';
import { db } from '@/lib/db-provider';
import { PageHeader } from '@/components/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Calculator, 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  Activity, 
  Folder, 
  Search, 
  ArrowUpDown,
  Bug,
  HelpCircle,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import type { Project, ProjectStatus } from '@/types';

type ProjectEstimations = {
  projectId: string;
  projectName: string;
  projectCode: string;
  status: ProjectStatus;
  pricingModel?: string;
  
  // Initial Estimates (man days)
  devInitial: number;
  hzInitial: number;
  totalInitial: number | null;
  
  // Planned Estimates (man days)
  devPlanned: number;
  hzPlanned: number;
  totalPlanned: number;
  
  // Actual Effort (man days)
  actualEffort: number;
  
  // Variance & Conformance
  variance: number | null; // Planned - Initial
  conformanceRate: number; // Actual / Planned %
};

const statusStyles: Record<ProjectStatus, string> = {
  'Initial Estimation': 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200 border-purple-200/50',
  'Not Started': 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300 border-gray-200/50',
  'Active': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border-blue-200/50',
  'On Hold': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200 border-yellow-200/50',
  'Completed': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 border-green-200/50',
  'Cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border-red-200/50',
};

export default function QualityEstimationsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [metrics, setMetrics] = useState<Record<string, ProjectEstimations>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [sortKey, setSortKey] = useState<keyof ProjectEstimations>('projectName');
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    if (!db) return;

    const projectsQuery = query(collection(db, 'projects'), where('isDeleted', '!=', true));
    
    const unsubscribe = onSnapshot(projectsQuery, async (snapshot: any) => {
      const projectsData = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...(doc.data() as Omit<Project, 'id'>),
      })) as Project[];
      setProjects(projectsData);

      // Fetch detailed metrics for all projects in parallel
      const metricPromises = projectsData.map(async (project) => {
        const projectDocRef = doc(db!, 'projects', project.id);

        // Fetch subcollections
        const [
          initialSystemsSnap, 
          initialHorizontalsSnap, 
          storiesSnap, 
          horizontalsSnap, 
          worklogsSnap
        ] = await Promise.all([
          getDocs(collection(projectDocRef, 'initialImpactedSystems')),
          getDocs(collection(projectDocRef, 'initialHorizontals')),
          getDocs(collection(projectDocRef, 'stories')),
          getDocs(collection(projectDocRef, 'horizontals')),
          getDocs(collection(projectDocRef, 'worklogs')),
        ]);

        const initialSystems = initialSystemsSnap.docs.map((d: any) => d.data()) as any[];
        const initialHorizontals = initialHorizontalsSnap.docs.map((d: any) => d.data()) as any[];
        const stories = storiesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })) as any[];
        const horizontals = horizontalsSnap.docs.map((d: any) => d.data()) as any[];
        const worklogs = worklogsSnap.docs.map((d: any) => d.data()) as any[];

        // --- 1. Initial Estimations Calculations ---
        const devInitial = initialSystems.reduce((acc, sys) => acc + (sys.estimate || 0), 0);
        const enabledInitialHorizontals = initialHorizontals.filter(h => h.isEnabled);
        const hzInitialWeightage = enabledInitialHorizontals.reduce((acc, h) => acc + (h.weightage || 0), 0);
        const hzInitial = (hzInitialWeightage / 100) * devInitial;
        const totalInitial = devInitial > 0 ? devInitial + hzInitial : null;

        // --- 2. Planned Estimations Calculations ---
        // Avoid double counting story effort and its sub-task effort:
        // Identify active sub-tasks (non-deleted sub-tasks of existing stories)
        const activeStories = stories.filter(s => !(s as any).isDeleted);
        const parentToSubTasksMap: Record<string, typeof activeStories> = {};
        
        activeStories.forEach(s => {
          const parentId = (s as any).parentStoryId;
          if (parentId && s.itemType === 'Sub Task') {
            if (!parentToSubTasksMap[parentId]) {
              parentToSubTasksMap[parentId] = [];
            }
            parentToSubTasksMap[parentId].push(s);
          }
        });

        // Standalone items that are not bugs
        const standaloneItems = activeStories.filter(s => !(s as any).parentStoryId && s.itemType !== 'Bug');

        let totalPlannedHours = 0;
        standaloneItems.forEach(item => {
          const subTasks = parentToSubTasksMap[item.id] || [];
          if (subTasks.length > 0) {
            // Count only sub-tasks effort, ignore parent story itself
            const subTasksEffort = subTasks.reduce((sum, st) => sum + (st.estimatedHours || 0), 0);
            totalPlannedHours += subTasksEffort;
          } else {
            // Standalone story with no sub-tasks, count its own effort
            totalPlannedHours += (item.estimatedHours || 0);
          }
        });

        const devPlanned = totalPlannedHours / 8; // 1 man-day = 8 man-hours

        // Planned horizontals (sum of all weightages * total development effort)
        const hzPlannedWeightage = horizontals.reduce((acc, h) => acc + (h.weightage || 0), 0);
        const hzPlanned = (hzPlannedWeightage / 100) * devPlanned;
        const totalPlanned = devPlanned + hzPlanned;

        // --- 3. Actual Effort Calculations ---
        const totalActualHours = worklogs.reduce((acc, w) => acc + (w.totalHours || 0), 0);
        const actualEffort = totalActualHours / 8; // 1 man-day = 8 man-hours

        // --- 4. Variances & Progress Metrics ---
        const variance = totalInitial !== null ? totalPlanned - totalInitial : null;
        const conformanceRate = totalPlanned > 0 ? (actualEffort / totalPlanned) * 100 : 0;

        return {
          projectId: project.id,
          projectName: project.name,
          projectCode: project.id,
          status: project.status || 'Initial Estimation',
          pricingModel: project.pricingModel,
          devInitial,
          hzInitial,
          totalInitial,
          devPlanned,
          hzPlanned,
          totalPlanned,
          actualEffort,
          variance,
          conformanceRate
        } as ProjectEstimations;
      });

      const resolvedMetrics = await Promise.all(metricPromises);
      const metricsMap = resolvedMetrics.reduce((acc, curr) => {
        acc[curr.projectId] = curr;
        return acc;
      }, {} as Record<string, ProjectEstimations>);

      setMetrics(metricsMap);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter & Sort logic
  const filteredMetrics = useMemo(() => {
    const list = Object.values(metrics);
    const search = filterText.toLowerCase().trim();

    const filtered = search === '' 
      ? list 
      : list.filter(m => 
          m.projectName.toLowerCase().includes(search) || 
          m.projectCode.toLowerCase().includes(search)
        );

    return filtered.sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];

      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      let comparison = 0;
      if (typeof valA === 'string' && typeof valB === 'string') {
        comparison = valA.localeCompare(valB, undefined, { numeric: true });
      } else if ((valA as number) > (valB as number)) {
        comparison = 1;
      } else if ((valA as number) < (valB as number)) {
        comparison = -1;
      }

      return sortAsc ? comparison : -comparison;
    });
  }, [metrics, filterText, sortKey, sortAsc]);

  const toggleSort = (key: keyof ProjectEstimations) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  // High-level statistics
  const portfolioStats = useMemo(() => {
    const list = Object.values(metrics);
    const totalProjects = list.length;
    
    let totalInitialDays = 0;
    let projectsWithInitial = 0;
    let totalPlannedDays = 0;
    let totalActualDays = 0;

    list.forEach(m => {
      if (m.totalInitial !== null) {
        totalInitialDays += m.totalInitial;
        projectsWithInitial++;
      }
      totalPlannedDays += m.totalPlanned;
      totalActualDays += m.actualEffort;
    });

    const averageVariance = projectsWithInitial > 0 
      ? list.filter(m => m.totalInitial !== null).reduce((sum, m) => sum + (m.variance || 0), 0) / projectsWithInitial 
      : 0;

    const overallCompletion = totalPlannedDays > 0 ? (totalActualDays / totalPlannedDays) * 100 : 0;

    return {
      totalProjects,
      totalInitialDays,
      totalPlannedDays,
      totalActualDays,
      averageVariance,
      overallCompletion
    };
  }, [metrics]);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-gradient-to-br from-background via-background to-primary/5 min-h-screen relative overflow-hidden">
      {/* Background glow orbs */}
      <div className="absolute top-1/4 right-1/4 w-[350px] h-[350px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-violet-500/5 rounded-full blur-[100px] pointer-events-none" />

      <PageHeader 
        title="Quality Estimations" 
        description="Monitor, compare, and analyze initial ballpark estimates, active sprint plans, and actual worklog conformance across all projects." 
      />

      {/* Portfolio High-level Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-border/40 bg-card/75 backdrop-blur shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-primary" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Portfolio Projects</CardTitle>
            <Folder className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{portfolioStats.totalProjects}</div>
            <p className="text-xs text-muted-foreground mt-1">Active, tracked project plans</p>
          </CardContent>
        </Card>

        <Card className="border border-border/40 bg-card/75 backdrop-blur shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-purple-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ballpark Estimates</CardTitle>
            <Calculator className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              {portfolioStats.totalInitialDays.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">man-days</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total confirmed baseline ballpark effort</p>
          </CardContent>
        </Card>

        <Card className="border border-border/40 bg-card/75 backdrop-blur shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Planned Plan</CardTitle>
            <Layers className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              {portfolioStats.totalPlannedDays.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">man-days</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Active scope development effort</p>
          </CardContent>
        </Card>

        <Card className="border border-border/40 bg-card/75 backdrop-blur shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-emerald-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Actual Consumed</CardTitle>
            <Activity className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight flex items-baseline gap-1.5">
              <span>{portfolioStats.totalActualDays.toFixed(1)}</span>
              <span className="text-sm font-normal text-muted-foreground">man-days</span>
              <span className="text-xs text-emerald-500 font-semibold ml-auto">
                {portfolioStats.overallCompletion.toFixed(0)}% Consumed
              </span>
            </div>
            <Progress value={portfolioStats.overallCompletion} className="h-1.5 mt-2 bg-emerald-500/10 indicator-emerald-500" />
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border border-border/40 bg-card/70 backdrop-blur-xl shadow-xl overflow-hidden">
        <CardHeader className="border-b border-border/30 bg-muted/20 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Estimations & Conformance Dashboard</CardTitle>
              <CardDescription className="text-xs">
                Real-time man-day audit (1 man-day = 8 hours). Dev effort excludes bugs. Horizontals are weighted against active dev scope.
              </CardDescription>
            </div>
            <div className="relative w-full md:w-[300px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
              <Input 
                placeholder="Search project code or name..." 
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="pl-9 h-9 bg-background/50 border-border/50"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <Clock className="h-8 w-8 text-primary animate-spin" />
              <span className="text-sm font-medium">Aggregating estimates and worklog metrics...</span>
            </div>
          ) : filteredMetrics.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Folder className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <span className="text-sm font-medium">No matching project plans found.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/10">
                  <TableRow>
                    <TableHead className="w-[200px] cursor-pointer" onClick={() => toggleSort('projectName')}>
                      <div className="flex items-center gap-1.5">
                        Project Details <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="w-[120px] cursor-pointer text-center" onClick={() => toggleSort('status')}>
                      <div className="flex items-center justify-center gap-1.5">
                        Status <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="w-[180px] cursor-pointer text-right" onClick={() => toggleSort('totalInitial')}>
                      <div className="flex items-center justify-end gap-1.5">
                        Initial Estimate <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="w-[180px] cursor-pointer text-right" onClick={() => toggleSort('totalPlanned')}>
                      <div className="flex items-center justify-end gap-1.5">
                        Planned Estimate <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="w-[130px] cursor-pointer text-right" onClick={() => toggleSort('actualEffort')}>
                      <div className="flex items-center justify-end gap-1.5">
                        Actual Logged <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="w-[120px] cursor-pointer text-right" onClick={() => toggleSort('variance')}>
                      <div className="flex items-center justify-end gap-1.5">
                        Variance <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="w-[160px] cursor-pointer text-right" onClick={() => toggleSort('conformanceRate')}>
                      <div className="flex items-center justify-end gap-1.5">
                        Plan Consumed <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMetrics.map((item) => {
                    const progressValue = Math.min(100, item.conformanceRate);
                    let progressColor = "bg-emerald-500";
                    let progressBg = "bg-emerald-500/10";
                    let progressText = "text-emerald-500";

                    if (item.conformanceRate >= 100) {
                      progressColor = "bg-rose-500 animate-pulse";
                      progressBg = "bg-rose-500/10";
                      progressText = "text-rose-500 font-semibold";
                    } else if (item.conformanceRate >= 90) {
                      progressColor = "bg-amber-500";
                      progressBg = "bg-amber-500/10";
                      progressText = "text-amber-500 font-semibold";
                    }

                    return (
                      <TableRow key={item.projectId} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="flex flex-col gap-1 min-w-[160px]">
                            <Link href={`/projects/${item.projectId}/project-details/pm-dashboard`} className="font-semibold text-foreground hover:underline truncate">
                              {item.projectName}
                            </Link>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="font-mono bg-muted/60 px-1 py-0.5 rounded text-[10px]">{item.projectCode}</span>
                              {item.pricingModel && <span>• {item.pricingModel}</span>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`px-2 py-0.5 whitespace-nowrap ${statusStyles[item.status] || 'border-border'}`}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.totalInitial !== null ? (
                            <div className="flex flex-col text-[13px]">
                              <span>{item.totalInitial.toFixed(1)} <span className="text-[10px] text-muted-foreground font-normal">days</span></span>
                              <span className="text-[10px] text-muted-foreground font-normal">
                                (Dev {item.devInitial.toFixed(1)} + Hz {item.hzInitial.toFixed(1)})
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/60 italic">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <div className="flex flex-col text-[13px]">
                            <span>{item.totalPlanned.toFixed(1)} <span className="text-[10px] text-muted-foreground font-normal">days</span></span>
                            <span className="text-[10px] text-muted-foreground font-normal">
                              (Dev {item.devPlanned.toFixed(1)} + Hz {item.hzPlanned.toFixed(1)})
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-[13px]">
                          <div>{item.actualEffort.toFixed(1)} <span className="text-[10px] text-muted-foreground font-normal">days</span></div>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.variance !== null ? (
                            <div className="flex items-center justify-end gap-1 font-semibold text-[13px]">
                              {item.variance > 0 ? (
                                <>
                                  <TrendingUp className="h-3.5 w-3.5 text-rose-500" />
                                  <span className="text-rose-500">+{item.variance.toFixed(1)}d</span>
                                </>
                              ) : item.variance < 0 ? (
                                <>
                                  <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />
                                  <span className="text-emerald-500">{item.variance.toFixed(1)}d</span>
                                </>
                              ) : (
                                <span className="text-muted-foreground">0.0d</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/60 italic">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-1.5 min-w-[120px]">
                            <span className={`text-[12px] ${progressText}`}>
                              {item.conformanceRate.toFixed(0)}%
                            </span>
                            <Progress 
                              value={progressValue} 
                              className={`h-1.5 w-24 bg-muted ${progressBg}`}
                              indicatorClassName={progressColor}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
