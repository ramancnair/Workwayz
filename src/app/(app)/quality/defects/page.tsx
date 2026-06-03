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
  Bug, 
  ArrowLeft, 
  TrendingUp, 
  Search, 
  ArrowUpDown,
  ShieldAlert,
  AlertTriangle,
  Folder,
  Activity,
  Zap,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import type { Project, ProjectStatus } from '@/types';

type ProjectDefects = {
  projectId: string;
  projectName: string;
  projectCode: string;
  status: ProjectStatus;
  pricingModel?: string;
  
  // Defect Splits
  sitCount: number;
  uatCount: number;
  prodCount: number;
  otherCount: number;
  totalBugs: number;
  
  // Quality Metrics
  leakageRate: number; // Production / Total %
};

const statusStyles: Record<ProjectStatus, string> = {
  'Initial Estimation': 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200 border-purple-200/50',
  'Not Started': 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300 border-gray-200/50',
  'Active': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border-blue-200/50',
  'On Hold': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200 border-yellow-200/50',
  'Completed': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 border-green-200/50',
  'Cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border-red-200/50',
};

export default function QualityDefectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [metrics, setMetrics] = useState<Record<string, ProjectDefects>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [sortKey, setSortKey] = useState<keyof ProjectDefects>('projectName');
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    if (!db) return;

    const projectsQuery = query(collection(db, 'projects'), where('isDeleted', '!=', true));
    
    const unsubscribe = onSnapshot(projectsQuery, async (snapshot) => {
      const projectsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Project, 'id'>),
      })) as Project[];
      setProjects(projectsData);

      // Fetch stories (bugs) and test plans for all projects in parallel
      const metricPromises = projectsData.map(async (project) => {
        const projectDocRef = doc(db!, 'projects', project.id);

        const [storiesSnap, testPlansSnap] = await Promise.all([
          getDocs(collection(projectDocRef, 'stories')),
          getDocs(collection(projectDocRef, 'testPlans')),
        ]);

        const stories = storiesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        const testPlans = testPlansSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

        // Extract active bugs (defects)
        const bugs = stories.filter(s => s.itemType === 'Bug' && !s.isDeleted);

        let sitCount = 0;
        let uatCount = 0;
        let prodCount = 0;
        let otherCount = 0;

        bugs.forEach(bug => {
          const tpId = bug.foundInTestPlanId;
          if (!tpId || tpId === 'unassigned') {
            otherCount++;
            return;
          }

          const tp = testPlans.find(plan => plan.id === tpId);
          if (!tp) {
            otherCount++;
            return;
          }

          const tpCode = (tp.testPlanId || '').toUpperCase();
          const tpName = (tp.name || '').toUpperCase();

          // Phase classification matching
          if (tpCode.includes('SIT') || tpName.includes('SIT')) {
            sitCount++;
          } else if (tpCode.includes('UAT') || tpName.includes('UAT')) {
            uatCount++;
          } else if (tpCode.includes('PROD') || tpName.includes('PROD') || tpName.includes('PRODUCTION')) {
            prodCount++;
          } else {
            otherCount++;
          }
        });

        const totalBugs = bugs.length;
        const leakageRate = totalBugs > 0 ? (prodCount / totalBugs) * 100 : 0;

        return {
          projectId: project.id,
          projectName: project.name,
          projectCode: project.id,
          status: project.status || 'Initial Estimation',
          pricingModel: project.pricingModel,
          sitCount,
          uatCount,
          prodCount,
          otherCount,
          totalBugs,
          leakageRate
        } as ProjectDefects;
      });

      const resolvedMetrics = await Promise.all(metricPromises);
      const metricsMap = resolvedMetrics.reduce((acc, curr) => {
        acc[curr.projectId] = curr;
        return acc;
      }, {} as Record<string, ProjectDefects>);

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

  const toggleSort = (key: keyof ProjectDefects) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  // High-level portfolio defect statistics
  const portfolioStats = useMemo(() => {
    const list = Object.values(metrics);
    const totalProjects = list.length;
    
    let totalBugs = 0;
    let totalSit = 0;
    let totalUat = 0;
    let totalProd = 0;
    let totalOther = 0;

    list.forEach(m => {
      totalBugs += m.totalBugs;
      totalSit += m.sitCount;
      totalUat += m.uatCount;
      totalProd += m.prodCount;
      totalOther += m.otherCount;
    });

    const averageLeakage = totalBugs > 0 ? (totalProd / totalBugs) * 100 : 0;

    return {
      totalProjects,
      totalBugs,
      totalSit,
      totalUat,
      totalProd,
      totalOther,
      averageLeakage
    };
  }, [metrics]);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-gradient-to-br from-background via-background to-destructive/5 min-h-screen relative overflow-hidden">
      {/* Background glow orbs */}
      <div className="absolute top-1/4 right-1/4 w-[350px] h-[350px] bg-rose-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-destructive/5 rounded-full blur-[100px] pointer-events-none" />

      <PageHeader 
        title="Quality Defects Dashboard" 
        description="Monitor phase-by-phase testing containment, evaluate defect leakages, and track regression cycles across all active projects." 
      />

      {/* Portfolio Stats Card container */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border border-border/40 bg-card/75 backdrop-blur shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-primary" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Defect Scope</CardTitle>
            <Bug className="h-4 w-4 text-primary animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{portfolioStats.totalBugs}</div>
            <p className="text-xs text-muted-foreground mt-1">Total active defects in QA</p>
          </CardContent>
        </Card>

        <Card className="border border-border/40 bg-card/75 backdrop-blur shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-blue-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">SIT Phase Defects</CardTitle>
            <ShieldAlert className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{portfolioStats.totalSit}</div>
            <p className="text-xs text-muted-foreground mt-1">Contained in System Integration Testing</p>
          </CardContent>
        </Card>

        <Card className="border border-border/40 bg-card/75 backdrop-blur shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-yellow-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">UAT Phase Defects</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{portfolioStats.totalUat}</div>
            <p className="text-xs text-muted-foreground mt-1">Identified during User Acceptance</p>
          </CardContent>
        </Card>

        <Card className="border border-border/40 bg-card/75 backdrop-blur shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-rose-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Production Leaks</CardTitle>
            <Zap className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{portfolioStats.totalProd}</div>
            <p className="text-xs text-muted-foreground mt-1">Escaped to Production env</p>
          </CardContent>
        </Card>

        <Card className="border border-border/40 bg-card/75 backdrop-blur shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-red-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Leakage Rate</CardTitle>
            <Activity className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight flex items-baseline gap-1">
              <span>{portfolioStats.averageLeakage.toFixed(0)}%</span>
              <span className="text-xs text-red-500 font-semibold ml-auto">Phase Containment</span>
            </div>
            <Progress value={portfolioStats.averageLeakage} className="h-1.5 mt-2 bg-red-500/10 indicator-red-500" />
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border border-border/40 bg-card/70 backdrop-blur-xl shadow-xl overflow-hidden">
        <CardHeader className="border-b border-border/30 bg-muted/20 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Defect Containment & Leakage Metrics</CardTitle>
              <CardDescription className="text-xs">
                Defects are classified by looking up their active execution test plans (SIT, UAT, Production). Production defects are leakages.
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
              <span className="text-sm font-medium">Aggregating defects and active test plan logs...</span>
            </div>
          ) : filteredMetrics.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Folder className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <span className="text-sm font-medium">No matching project defect data found.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/10">
                  <TableRow>
                    <TableHead className="w-[220px] cursor-pointer" onClick={() => toggleSort('projectName')}>
                      <div className="flex items-center gap-1.5">
                        Project Details <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="w-[120px] cursor-pointer text-center" onClick={() => toggleSort('status')}>
                      <div className="flex items-center justify-center gap-1.5">
                        Status <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="w-[120px] cursor-pointer text-center" onClick={() => toggleSort('sitCount')}>
                      <div className="flex items-center justify-center gap-1.5 text-blue-500 font-semibold">
                        SIT defects <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="w-[120px] cursor-pointer text-center" onClick={() => toggleSort('uatCount')}>
                      <div className="flex items-center justify-center gap-1.5 text-yellow-600 font-semibold">
                        UAT defects <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="w-[140px] cursor-pointer text-center" onClick={() => toggleSort('prodCount')}>
                      <div className="flex items-center justify-center gap-1.5 text-rose-500 font-semibold">
                        Production Leaks <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="w-[140px] cursor-pointer text-center" onClick={() => toggleSort('otherCount')}>
                      <div className="flex items-center justify-center gap-1.5">
                        Other / Unassigned <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="w-[120px] cursor-pointer text-center" onClick={() => toggleSort('totalBugs')}>
                      <div className="flex items-center justify-center gap-1.5">
                        Total Defects <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="w-[160px] cursor-pointer text-right" onClick={() => toggleSort('leakageRate')}>
                      <div className="flex items-center justify-end gap-1.5">
                        Leakage Rate % <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMetrics.map((item) => {
                    const leakageRateValue = Math.min(100, item.leakageRate);
                    let progressColor = "bg-emerald-500";
                    let progressBg = "bg-emerald-500/10";
                    let progressText = "text-emerald-500";

                    if (item.leakageRate >= 15) {
                      progressColor = "bg-red-500 animate-pulse";
                      progressBg = "bg-red-500/10";
                      progressText = "text-red-500 font-bold";
                    } else if (item.leakageRate > 0) {
                      progressColor = "bg-orange-500";
                      progressBg = "bg-orange-500/10";
                      progressText = "text-orange-500 font-semibold";
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
                        <TableCell className="text-center font-semibold text-[13px] text-blue-500 bg-blue-500/5">
                          {item.sitCount}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-[13px] text-yellow-600 bg-yellow-500/5">
                          {item.uatCount}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-[13px] text-rose-500 bg-rose-500/5">
                          {item.prodCount}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground text-[13px]">
                          {item.otherCount}
                        </TableCell>
                        <TableCell className="text-center font-bold text-[14px]">
                          {item.totalBugs}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-1.5 min-w-[120px]">
                            <span className={`text-[12px] ${progressText}`}>
                              {item.leakageRate.toFixed(0)}%
                            </span>
                            <Progress 
                              value={leakageRateValue} 
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
