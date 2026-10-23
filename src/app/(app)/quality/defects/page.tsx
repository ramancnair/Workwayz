'use client';

import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { collection, onSnapshot, getDocs, doc, query, where } from '@/lib/db-provider';
import { db } from '@/lib/db-provider';
import { PageHeader } from '@/components/PageHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Clock,
  ChevronDown,
  ChevronRight,
  Filter,
  Layers,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Target,
  Flame,
  Calendar
} from 'lucide-react';
import Link from 'next/link';
import { isProjectInYear, getAvailableProjectYears } from '@/lib/project-year-filter';
import type { Project, ProjectStatus, Sprint, Release } from '@/types';
import { isBugWorkItem } from '@/types';

type CadenceDefects = {
  id: string;
  name: string;
  type: 'Sprint' | 'Release' | 'General';
  status?: string;
  sitCount: number;
  uatCount: number;
  prodCount: number;
  otherCount: number;
  totalBugs: number;
  leakageRate: number;
};

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
  dreRate: number; // Defect Removal Efficiency = (SIT + UAT) / Total %

  // Nested Cadences (Sprints & Releases)
  cadences: CadenceDefects[];
};

const statusStyles: Record<ProjectStatus, string> = {
  'Initial Estimation': 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200 border-purple-200/50',
  'Not Started': 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300 border-gray-200/50',
  'Active': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 border-blue-200/50',
  'On Hold': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200 border-yellow-200/50',
  'Completed': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 border-green-200/50',
  'Cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 border-red-200/50',
};

export default function DefectContainmentPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [metrics, setMetrics] = useState<Record<string, ProjectDefects>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [sortKey, setSortKey] = useState<keyof ProjectDefects>('projectName');
  const [sortAsc, setSortAsc] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [selectedYear, setSelectedYear] = useState<string>('all');

  useEffect(() => {
    if (!db) return;

    const projectsQuery = query(collection(db, 'projects'), where('isDeleted', '!=', true));
    
    const unsubscribe = onSnapshot(projectsQuery, async (snapshot: any) => {
      const projectsData = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...(doc.data() as Omit<Project, 'id'>),
      })) as Project[];
      setProjects(projectsData);

      // Fetch stories, test plans, sprints, and releases for all projects in parallel
      const metricPromises = projectsData.map(async (project) => {
        const projectDocRef = doc(db!, 'projects', project.id);

        const [storiesSnap, testCyclesSnap, testPlansSnap, sprintsSnap, releasesSnap] = await Promise.all([
          getDocs(collection(projectDocRef, 'stories')),
          getDocs(collection(projectDocRef, 'testCycles')),
          getDocs(collection(projectDocRef, 'testPlans')),
          getDocs(collection(projectDocRef, 'sprints')),
          getDocs(collection(projectDocRef, 'releases')),
        ]);

        const stories = storiesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })) as any[];
        const testCyclesData = testCyclesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })) as any[];
        const testPlansData = testPlansSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })) as any[];
        const testPlans = testCyclesData.length > 0 ? testCyclesData : testPlansData;
        const sprints = sprintsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })) as Sprint[];
        const releases = releasesSnap.docs.map((d: any) => ({ id: d.id, ...d.data() })) as Release[];

        // Extract active bugs (defects)
        const bugs = stories.filter(s => isBugWorkItem(s.itemType) && !s.isDeleted);

        let sitCount = 0;
        let uatCount = 0;
        let prodCount = 0;
        let otherCount = 0;

        // Cadence tracking map
        const sprintCadenceMap: Record<string, CadenceDefects> = {};
        sprints.forEach(sp => {
          sprintCadenceMap[sp.id] = {
            id: sp.id,
            name: (sp as any).title || (sp as any).name || (sp as any).sprintId || 'Sprint',
            type: 'Sprint',
            status: (sp as any).status,
            sitCount: 0,
            uatCount: 0,
            prodCount: 0,
            otherCount: 0,
            totalBugs: 0,
            leakageRate: 0,
          };
        });

        const releaseCadenceMap: Record<string, CadenceDefects> = {};
        releases.forEach(rel => {
          releaseCadenceMap[rel.id] = {
            id: rel.id,
            name: rel.name || (rel as any).releaseId || 'Release',
            type: 'Release',
            status: (rel as any).status || (rel.isCompleted ? 'Completed' : 'Planned'),
            sitCount: 0,
            uatCount: 0,
            prodCount: 0,
            otherCount: 0,
            totalBugs: 0,
            leakageRate: 0,
          };
        });

        const generalCadence: CadenceDefects = {
          id: 'unassigned',
          name: 'General Backlog / Unassigned',
          type: 'General',
          sitCount: 0,
          uatCount: 0,
          prodCount: 0,
          otherCount: 0,
          totalBugs: 0,
          leakageRate: 0,
        };

        bugs.forEach(bug => {
          const tpId = bug.foundInTestCycleId || bug.foundInTestPlanId;
          const tp = tpId && tpId !== 'unassigned' ? testPlans.find(plan => plan.id === tpId) : null;
          
          let phase: 'SIT' | 'UAT' | 'PROD' | 'OTHER' = 'OTHER';
          if (tp) {
            const tpCode = (tp.testCycleId || tp.testPlanId || '').toUpperCase();
            const tpName = (tp.name || '').toUpperCase();

            if (tpCode.includes('SIT') || tpName.includes('SIT')) {
              phase = 'SIT';
              sitCount++;
            } else if (tpCode.includes('UAT') || tpName.includes('UAT')) {
              phase = 'UAT';
              uatCount++;
            } else if (tpCode.includes('PROD') || tpName.includes('PROD') || tpName.includes('PRODUCTION')) {
              phase = 'PROD';
              prodCount++;
            } else {
              otherCount++;
            }
          } else {
            otherCount++;
          }

          // Assign to Sprint or Release cadence
          let targetCadence: CadenceDefects | null = null;
          if (bug.sprintId && sprintCadenceMap[bug.sprintId]) {
            targetCadence = sprintCadenceMap[bug.sprintId];
          } else if (bug.releaseId && releaseCadenceMap[bug.releaseId]) {
            targetCadence = releaseCadenceMap[bug.releaseId];
          } else if (tp && (tp as any).sprintId && sprintCadenceMap[(tp as any).sprintId]) {
            targetCadence = sprintCadenceMap[(tp as any).sprintId];
          } else if (tp && (tp as any).releaseId && releaseCadenceMap[(tp as any).releaseId]) {
            targetCadence = releaseCadenceMap[(tp as any).releaseId];
          } else {
            targetCadence = generalCadence;
          }

          if (targetCadence) {
            targetCadence.totalBugs++;
            if (phase === 'SIT') targetCadence.sitCount++;
            else if (phase === 'UAT') targetCadence.uatCount++;
            else if (phase === 'PROD') targetCadence.prodCount++;
            else targetCadence.otherCount++;
          }
        });

        // Compute cadence leakage rates
        const allCadences: CadenceDefects[] = [
          ...Object.values(sprintCadenceMap),
          ...Object.values(releaseCadenceMap),
        ];

        if (generalCadence.totalBugs > 0) {
          allCadences.push(generalCadence);
        }

        allCadences.forEach(c => {
          c.leakageRate = c.totalBugs > 0 ? (c.prodCount / c.totalBugs) * 100 : 0;
        });

        // Keep cadences that either have bugs or are active sprints/releases
        const activeCadences = allCadences.filter(c => c.totalBugs > 0 || c.type !== 'General');

        const totalBugs = bugs.length;
        const leakageRate = totalBugs > 0 ? (prodCount / totalBugs) * 100 : 0;
        const dreRate = totalBugs > 0 ? ((sitCount + uatCount) / totalBugs) * 100 : 100;

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
          leakageRate,
          dreRate,
          cadences: activeCadences,
        } as ProjectDefects;
      });

      const metricsArray = await Promise.all(metricPromises);
      const metricsMap: Record<string, ProjectDefects> = {};
      metricsArray.forEach(m => {
        metricsMap[m.projectId] = m;
      });

      setMetrics(metricsMap);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleExpand = (projectId: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  const toggleSort = (key: keyof ProjectDefects) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const projectMap = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects]);
  const availableYears = useMemo(() => getAvailableProjectYears(projects), [projects]);

  const yearFilteredMetrics = useMemo(() => {
    const list = Object.values(metrics);
    if (selectedYear === 'all') return list;
    return list.filter(m => {
      const proj = projectMap.get(m.projectId);
      return proj ? isProjectInYear(proj, selectedYear) : true;
    });
  }, [metrics, projectMap, selectedYear]);

  const filteredMetrics = useMemo(() => {
    return yearFilteredMetrics
      .filter(item => {
        const search = filterText.toLowerCase();
        return (
          item.projectName.toLowerCase().includes(search) ||
          item.projectCode.toLowerCase().includes(search)
        );
      })
      .sort((a, b) => {
        let aVal = a[sortKey];
        let bVal = b[sortKey];
        
        if (typeof aVal === 'string') {
          return sortAsc 
            ? (aVal as string).localeCompare(bVal as string)
            : (bVal as string).localeCompare(aVal as string);
        }
        
        aVal = aVal || 0;
        bVal = bVal || 0;
        return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
      });
  }, [yearFilteredMetrics, filterText, sortKey, sortAsc]);

  // Overall Portfolio Totals
  const portfolioStats = useMemo(() => {
    const all = yearFilteredMetrics;
    const totalBugs = all.reduce((acc, m) => acc + m.totalBugs, 0);
    const sitTotal = all.reduce((acc, m) => acc + m.sitCount, 0);
    const uatTotal = all.reduce((acc, m) => acc + m.uatCount, 0);
    const prodTotal = all.reduce((acc, m) => acc + m.prodCount, 0);
    const otherTotal = all.reduce((acc, m) => acc + m.otherCount, 0);

    const avgLeakageRate = totalBugs > 0 ? (prodTotal / totalBugs) * 100 : 0;
    const dreRate = totalBugs > 0 ? ((sitTotal + uatTotal) / totalBugs) * 100 : 100;

    return {
      totalProjects: all.length,
      totalBugs,
      sitTotal,
      uatTotal,
      prodTotal,
      otherTotal,
      avgLeakageRate,
      dreRate,
    };
  }, [yearFilteredMetrics]);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <PageHeader 
        title="Defect Containment & Leakage Funnel" 
        description="Monitor phase-by-phase testing containment (SIT → UAT → Production), evaluate defect leakages, and track DRE across sprints and releases."
      >
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[140px] bg-background">
            <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {availableYears.map((yr) => (
              <SelectItem key={yr} value={yr.toString()}>
                {yr}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>

      {/* Top Level Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border border-border/50 bg-card/60 backdrop-blur-sm shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Defect Scope
            </CardTitle>
            <Bug className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{portfolioStats.totalBugs}</div>
            <p className="text-xs text-muted-foreground mt-1">Total active defects in QA</p>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-card/60 backdrop-blur-sm shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              SIT Phase Defects
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-sky-500">{portfolioStats.sitTotal}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Contained in System Integration Testing
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-card/60 backdrop-blur-sm shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              UAT Phase Defects
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-amber-500">{portfolioStats.uatTotal}</div>
            <p className="text-xs text-muted-foreground mt-1">Identified during User Acceptance</p>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-card/60 backdrop-blur-sm shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Production Leaks
            </CardTitle>
            <Flame className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-rose-500">{portfolioStats.prodTotal}</div>
            <p className="text-xs text-muted-foreground mt-1">Escaped to Production env</p>
          </CardContent>
        </Card>

        <Card className="border border-border/50 bg-card/60 backdrop-blur-sm shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Defect Removal (DRE)
            </CardTitle>
            <Target className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold tracking-tight text-emerald-500">
                {portfolioStats.dreRate.toFixed(0)}%
              </span>
              <span className="text-xs text-muted-foreground">
                Leakage: <strong className="text-rose-500">{portfolioStats.avgLeakageRate.toFixed(1)}%</strong>
              </span>
            </div>
            <Progress 
              value={portfolioStats.dreRate} 
              className="h-1.5 mt-2 bg-secondary"
            />
          </CardContent>
        </Card>
      </div>

      {/* Visual Defect Containment Funnel Card */}
      <Card className="border border-border/60 bg-gradient-to-br from-card to-card/60 shadow-md">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Filter className="h-4 w-4 text-emerald-500" />
                <span>Portfolio Quality Containment Funnel</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Phase-by-phase quality filters: System Integration Testing (SIT) ➔ User Acceptance (UAT) ➔ Production Escapes
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-500 font-semibold self-start sm:self-auto">
              DRE Benchmark Target: ≥ 90%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Stage 1: SIT */}
            <div className="p-4 rounded-xl border border-sky-500/30 bg-sky-500/5 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-500 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" /> 1. SIT Containment
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  {portfolioStats.totalBugs ? ((portfolioStats.sitTotal / portfolioStats.totalBugs) * 100).toFixed(0) : 0}% of all
                </span>
              </div>
              <div className="text-2xl font-bold text-sky-500 mt-2">{portfolioStats.sitTotal} Bugs</div>
              <p className="text-xs text-muted-foreground mt-1">
                Caught early in integration test cycles before business review.
              </p>
              <Progress 
                value={portfolioStats.totalBugs ? (portfolioStats.sitTotal / portfolioStats.totalBugs) * 100 : 0} 
                className="h-1.5 mt-3 bg-sky-500/20"
              />
            </div>

            {/* Stage 2: UAT */}
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" /> 2. UAT Containment
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  {portfolioStats.totalBugs ? ((portfolioStats.uatTotal / portfolioStats.totalBugs) * 100).toFixed(0) : 0}% of all
                </span>
              </div>
              <div className="text-2xl font-bold text-amber-500 mt-2">{portfolioStats.uatTotal} Bugs</div>
              <p className="text-xs text-muted-foreground mt-1">
                Caught during user acceptance testing prior to release sign-off.
              </p>
              <Progress 
                value={portfolioStats.totalBugs ? (portfolioStats.uatTotal / portfolioStats.totalBugs) * 100 : 0} 
                className="h-1.5 mt-3 bg-amber-500/20"
              />
            </div>

            {/* Stage 3: Production Escapes */}
            <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                  <Flame className="h-4 w-4" /> 3. Production Leaks ⚠️
                </span>
                <span className="text-xs text-rose-500 font-mono font-bold">
                  {portfolioStats.avgLeakageRate.toFixed(1)}% Leaked
                </span>
              </div>
              <div className="text-2xl font-bold text-rose-500 mt-2">{portfolioStats.prodTotal} Escapes</div>
              <p className="text-xs text-muted-foreground mt-1">
                Defects escaping QA filters and reaching end-users in production.
              </p>
              <Progress 
                value={portfolioStats.avgLeakageRate} 
                className="h-1.5 mt-3 bg-rose-500/20"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table Card */}
      <Card className="border border-border/40 bg-card/70 backdrop-blur-xl shadow-xl overflow-hidden">
        <CardHeader className="border-b border-border/30 bg-muted/20 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold">Defect Containment & Leakage Metrics</CardTitle>
              <CardDescription className="text-xs">
                Click any project row chevron (▼) to expand and drill into sprint and release level containment breakdown.
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
              <span className="text-sm font-medium">Classifying defects and test phases across projects...</span>
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
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="w-[260px] cursor-pointer" onClick={() => toggleSort('projectName')}>
                      <div className="flex items-center gap-1.5">
                        Project Details <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="w-[120px] cursor-pointer text-center" onClick={() => toggleSort('status')}>
                      <div className="flex items-center justify-center gap-1.5">
                        Status <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="w-[120px] cursor-pointer text-center font-semibold text-sky-500" onClick={() => toggleSort('sitCount')}>
                      <div className="flex items-center justify-center gap-1.5">
                        SIT Defects <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="w-[120px] cursor-pointer text-center font-semibold text-amber-500" onClick={() => toggleSort('uatCount')}>
                      <div className="flex items-center justify-center gap-1.5">
                        UAT Defects <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="w-[130px] cursor-pointer text-center font-semibold text-rose-500" onClick={() => toggleSort('prodCount')}>
                      <div className="flex items-center justify-center gap-1.5">
                        Production Leaks <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="w-[120px] cursor-pointer text-center text-muted-foreground" onClick={() => toggleSort('otherCount')}>
                      <div className="flex items-center justify-center gap-1.5">
                        Other / Unassigned <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="w-[110px] cursor-pointer text-center font-bold" onClick={() => toggleSort('totalBugs')}>
                      <div className="flex items-center justify-center gap-1.5">
                        Total Defects <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="w-[150px] cursor-pointer text-right" onClick={() => toggleSort('leakageRate')}>
                      <div className="flex items-center justify-end gap-1.5">
                        Leakage Rate % <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMetrics.map((item) => {
                    const isExpanded = !!expandedProjects[item.projectId];
                    const hasCadences = item.cadences && item.cadences.length > 0;

                    return (
                      <Fragment key={item.projectId}>
                        {/* Parent Project Row */}
                        <TableRow className="hover:bg-muted/40 transition-colors group">
                          {/* Expand/Collapse Toggle */}
                          <TableCell className="w-[40px] pl-3 pr-0 py-3">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 p-0 hover:bg-muted/60"
                              onClick={() => toggleExpand(item.projectId)}
                              title={isExpanded ? 'Collapse Sprints & Releases' : 'Expand Sprints & Releases'}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-emerald-500" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                              )}
                            </Button>
                          </TableCell>

                          {/* Project Details */}
                          <TableCell>
                            <div className="flex flex-col">
                              <Link 
                                href={`/projects/${item.projectId}/development/kanban?type=Bug`} 
                                className="font-semibold text-foreground hover:underline truncate max-w-[240px] flex items-center gap-1.5"
                              >
                                <span>{item.projectName}</span>
                                <ExternalLink className="h-3 w-3 opacity-50" />
                              </Link>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                <span className="font-mono bg-muted/60 px-1 py-0.5 rounded text-[10px]">{item.projectCode}</span>
                                {item.pricingModel && <span>• {item.pricingModel}</span>}
                                {hasCadences && (
                                  <span className="text-[10px] text-emerald-500/80">
                                    • {item.cadences.length} cadences
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          {/* Status */}
                          <TableCell className="text-center">
                            <Badge variant="outline" className={`px-2 py-0.5 whitespace-nowrap ${statusStyles[item.status] || 'border-border'}`}>
                              {item.status}
                            </Badge>
                          </TableCell>

                          {/* SIT */}
                          <TableCell className="text-center font-medium text-sky-500">
                            {item.sitCount > 0 ? (
                              <span className="font-semibold">{item.sitCount}</span>
                            ) : (
                              <span className="text-muted-foreground/40 font-normal">0</span>
                            )}
                          </TableCell>

                          {/* UAT */}
                          <TableCell className="text-center font-medium text-amber-500">
                            {item.uatCount > 0 ? (
                              <span className="font-semibold">{item.uatCount}</span>
                            ) : (
                              <span className="text-muted-foreground/40 font-normal">0</span>
                            )}
                          </TableCell>

                          {/* Production */}
                          <TableCell className="text-center font-medium">
                            {item.prodCount > 0 ? (
                              <Badge variant="outline" className="border-rose-500/40 bg-rose-500/10 text-rose-500 font-bold px-2 py-0.5">
                                {item.prodCount}
                              </Badge>
                            ) : (
                              <span className="text-emerald-500 font-medium">0</span>
                            )}
                          </TableCell>

                          {/* Other / Unassigned */}
                          <TableCell className="text-center text-muted-foreground">
                            {item.otherCount > 0 ? item.otherCount : <span className="opacity-40">0</span>}
                          </TableCell>

                          {/* Total */}
                          <TableCell className="text-center font-bold text-foreground">
                            {item.totalBugs}
                          </TableCell>

                          {/* Leakage Rate % */}
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end gap-1 min-w-[100px]">
                              <span className={`text-xs font-semibold ${item.leakageRate > 15 ? 'text-rose-500' : item.leakageRate > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                {item.leakageRate.toFixed(1)}%
                              </span>
                              <Progress 
                                value={item.leakageRate} 
                                className="h-1.5 w-20 bg-muted"
                              />
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expanded Sub-Table: Sprint & Release Breakdown */}
                        {isExpanded && (
                          <TableRow className="bg-muted/20 border-y border-border/40 hover:bg-muted/20">
                            <TableCell colSpan={9} className="p-0">
                              <div className="p-4 pl-12 pr-6 space-y-2">
                                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                  <span className="flex items-center gap-1.5">
                                    <Layers className="h-3.5 w-3.5 text-primary" />
                                    <span>Sprint & Release Containment Breakdown ({item.projectName})</span>
                                  </span>
                                  <span>{item.cadences.length} Tracked Cadences</span>
                                </div>

                                {hasCadences ? (
                                  <div className="rounded-lg border border-border/50 bg-background/60 overflow-hidden shadow-inner">
                                    <Table>
                                      <TableHeader className="bg-muted/40">
                                        <TableRow className="text-[11px] h-7">
                                          <TableHead className="font-semibold text-left">Cadence (Sprint / Release)</TableHead>
                                          <TableHead className="font-semibold text-center w-[100px]">Type</TableHead>
                                          <TableHead className="font-semibold text-center w-[90px] text-sky-500">SIT</TableHead>
                                          <TableHead className="font-semibold text-center w-[90px] text-amber-500">UAT</TableHead>
                                          <TableHead className="font-semibold text-center w-[110px] text-rose-500">Prod Leaks</TableHead>
                                          <TableHead className="font-semibold text-center w-[80px]">Other</TableHead>
                                          <TableHead className="font-semibold text-center w-[90px]">Total</TableHead>
                                          <TableHead className="font-semibold text-right w-[140px]">Leakage Rate</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {item.cadences.map((cadence) => (
                                          <TableRow key={cadence.id} className="text-xs hover:bg-muted/30 h-8">
                                            <TableCell className="font-medium text-foreground py-2 pl-3">
                                              <span className="truncate max-w-[280px] block">{cadence.name}</span>
                                            </TableCell>
                                            <TableCell className="text-center py-2">
                                              <Badge 
                                                variant="outline" 
                                                className={`text-[10px] px-1.5 py-0 font-medium ${
                                                  cadence.type === 'Sprint' 
                                                    ? 'border-purple-500/40 text-purple-400 bg-purple-500/10' 
                                                    : cadence.type === 'Release' 
                                                    ? 'border-sky-500/40 text-sky-400 bg-sky-500/10'
                                                    : 'border-border text-muted-foreground'
                                                }`}
                                              >
                                                {cadence.type}
                                              </Badge>
                                            </TableCell>
                                            <TableCell className="text-center py-2 text-sky-500 font-medium">
                                              {cadence.sitCount}
                                            </TableCell>
                                            <TableCell className="text-center py-2 text-amber-500 font-medium">
                                              {cadence.uatCount}
                                            </TableCell>
                                            <TableCell className="text-center py-2">
                                              {cadence.prodCount > 0 ? (
                                                <span className="text-rose-500 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded text-[11px]">
                                                  {cadence.prodCount}
                                                </span>
                                              ) : (
                                                <span className="text-emerald-500 text-[11px]">0</span>
                                              )}
                                            </TableCell>
                                            <TableCell className="text-center py-2 text-muted-foreground">
                                              {cadence.otherCount}
                                            </TableCell>
                                            <TableCell className="text-center py-2 font-bold text-foreground">
                                              {cadence.totalBugs}
                                            </TableCell>
                                            <TableCell className="text-right py-2 pr-3">
                                              <div className="flex items-center justify-end gap-2">
                                                <span className={`text-[11px] font-semibold ${cadence.leakageRate > 15 ? 'text-rose-500' : cadence.leakageRate > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                  {cadence.leakageRate.toFixed(1)}%
                                                </span>
                                                <Progress value={cadence.leakageRate} className="h-1 w-14 bg-muted" />
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                ) : (
                                  <div className="text-xs text-muted-foreground py-2 italic">
                                    No sprint or release sub-plans configured for this project yet.
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
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
