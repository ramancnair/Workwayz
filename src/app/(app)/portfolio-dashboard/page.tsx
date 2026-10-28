'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { db } from '@/lib/db-provider';
import { collection, query, where, getDocs } from '@/lib/db-provider';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { isProjectInYear, getAvailableProjectYears } from '@/lib/project-year-filter';
import { isBugWorkItem, type Project, type Risk, type Issue, type RiskSeverity, type RiskProbability, type IssuePriority, type RagStatus, type Portfolio, type Release, type Story, type TestCase } from '@/types';
import { format, differenceInDays, isPast, parseISO } from 'date-fns';
import {
  Circle,
  Activity,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Calendar,
  DollarSign,
  Bug,
  FolderKanban,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  BarChart3,
  BadgeCheck,
  Zap,
} from 'lucide-react';

// Enriched Types
type EnrichedRisk = Risk & { projectName: string; projectId: string; id: string };
type EnrichedIssue = Issue & { projectName: string; projectId: string; id: string };
type EnrichedRelease = Release & { projectName: string; projectId: string; permitToDeploy?: boolean };
type EnrichedDefect = Story & { projectName: string; projectId: string };
type EnrichedTestCase = TestCase & { projectName: string; projectId: string };

const getRiskPotential = (severity: RiskSeverity, probability: RiskProbability) => {
  const potential = severity * probability;
  if (potential <= 3) return 'Low';
  if (potential <= 6) return 'Medium';
  return 'High';
};

const getRiskPotentialClass = (severity: RiskSeverity, probability: RiskProbability) => {
  const potential = getRiskPotential(severity, probability);
  if (potential === 'Low') return 'bg-emerald-500';
  if (potential === 'Medium') return 'bg-amber-500';
  return 'bg-red-500';
};

const issuePriorityStyles: Record<IssuePriority, string> = {
  Low: 'bg-gray-400',
  Medium: 'bg-amber-500',
  High: 'bg-orange-500',
  Critical: 'bg-red-500',
};

const issueStatusStyles: Record<Issue['status'], string> = {
  Open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border-blue-500/30',
  'In Progress': 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200 border-purple-500/30',
  Resolved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border-emerald-500/30',
  Closed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-600/30',
};

const ragStatusStyles: Record<RagStatus, string> = {
  Green: 'text-emerald-500',
  Amber: 'text-amber-500',
  Red: 'text-red-500',
};

function formatCurrency(amount?: number): string {
  if (!amount || isNaN(amount)) return '$0';
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}k`;
  return `$${amount.toLocaleString()}`;
}

export default function PortfolioDashboardPage() {
  const [allRisks, setAllRisks] = useState<EnrichedRisk[]>([]);
  const [allIssues, setAllIssues] = useState<EnrichedIssue[]>([]);
  const [allActiveProjects, setAllActiveProjects] = useState<Project[]>([]);
  const [allReleases, setAllReleases] = useState<EnrichedRelease[]>([]);
  const [allDefects, setAllDefects] = useState<EnrichedDefect[]>([]);
  const [allTestCases, setAllTestCases] = useState<EnrichedTestCase[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'quality' | 'raid'>('overview');
  const [defectSortBy, setDefectSortBy] = useState<'total' | 'critical'>('total');
  const [viewingRisk, setViewingRisk] = useState<EnrichedRisk | null>(null);
  const [viewingIssue, setViewingIssue] = useState<EnrichedIssue | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!db) return;
      setIsLoading(true);

      try {
        // 1. Fetch Portfolios
        const portfoliosQuery = query(collection(db, 'portfolios'), where('isDeleted', '!=', true));
        const portfoliosSnapshot = await getDocs(portfoliosQuery);
        setPortfolios(portfoliosSnapshot.docs.map((d: any) => ({ ...d.data(), id: d.id } as Portfolio)));

        // 2. Fetch Active Projects
        const projectsQuery = query(collection(db, 'projects'), where('status', '==', 'Active'));
        const projectsSnapshot = await getDocs(projectsQuery);
        const activeProjects = projectsSnapshot.docs
          .map((d: any) => ({ ...d.data(), id: d.id } as Project))
          .filter((p) => p.isDeleted !== true);

        setAllActiveProjects(activeProjects);

        // 3. Concurrently fetch subcollections across active projects
        const fetchedRisks: EnrichedRisk[] = [];
        const fetchedIssues: EnrichedIssue[] = [];
        const fetchedReleases: EnrichedRelease[] = [];
        const fetchedDefects: EnrichedDefect[] = [];
        const fetchedTestCases: EnrichedTestCase[] = [];

        await Promise.allSettled(
          activeProjects.map(async (project) => {
            const pId = project.id;
            const pName = project.name;

            // Risks
            try {
              const rSnap = await getDocs(collection(db, 'projects', pId, 'risks'));
              rSnap.forEach((d: any) => {
                const risk = d.data() as Risk;
                if (getRiskPotential(risk.severity, risk.probability) === 'High') {
                  fetchedRisks.push({ ...risk, projectName: pName, projectId: pId, id: d.id });
                }
              });
            } catch (_) {}

            // Issues
            try {
              const iSnap = await getDocs(collection(db, 'projects', pId, 'issues'));
              iSnap.forEach((d: any) => {
                const data = d.data();
                const issue = {
                  ...data,
                  reportedDate: data.reportedDate?.toDate ? data.reportedDate.toDate().toISOString() : data.reportedDate,
                } as Issue;
                if (['Critical', 'High'].includes(issue.priority)) {
                  fetchedIssues.push({ ...issue, projectName: pName, projectId: pId, id: d.id });
                }
              });
            } catch (_) {}

            // Releases
            try {
              const relSnap = await getDocs(collection(db, 'projects', pId, 'releases'));
              relSnap.forEach((d: any) => {
                const data = d.data() as Release;
                fetchedReleases.push({
                  ...data,
                  id: d.id,
                  projectName: pName,
                  projectId: pId,
                  permitToDeploy: project.pmoApproval?.permitToDeploy?.approved ?? false,
                });
              });
            } catch (_) {}

            // Stories / Defects (Bugs)
            try {
              const sSnap = await getDocs(collection(db, 'projects', pId, 'stories'));
              sSnap.forEach((d: any) => {
                const story = d.data() as Story;
                if (story.isDeleted !== true && (isBugWorkItem(story.itemType) || Boolean(story.severity))) {
                  fetchedDefects.push({
                    ...story,
                    id: d.id,
                    projectName: pName,
                    projectId: pId,
                  });
                }
              });
            } catch (_) {}

            // Test Cases
            try {
              const tcSnap = await getDocs(collection(db, 'projects', pId, 'testCases'));
              tcSnap.forEach((d: any) => {
                const tc = d.data() as TestCase;
                fetchedTestCases.push({
                  ...tc,
                  id: d.id,
                  projectName: pName,
                  projectId: pId,
                });
              });
            } catch (_) {}
          })
        );

        setAllRisks(fetchedRisks);
        setAllIssues(fetchedIssues.sort((a, b) => (a.priority === 'Critical' ? -1 : 1)));
        setAllReleases(fetchedReleases);
        setAllDefects(fetchedDefects);
        setAllTestCases(fetchedTestCases);
      } catch (error) {
        console.error('Error fetching Portfolio dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filtered dataset based on selected portfolio and year
  const availableYears = useMemo(() => getAvailableProjectYears(allActiveProjects), [allActiveProjects]);

  const filteredProjects = useMemo(() => {
    return allActiveProjects.filter((p) => {
      const matchesPortfolio = selectedPortfolioId === 'all' || p.portfolioId === selectedPortfolioId;
      const matchesYear = isProjectInYear(p, selectedYear);
      return matchesPortfolio && matchesYear;
    });
  }, [allActiveProjects, selectedPortfolioId, selectedYear]);

  const validProjectIds = useMemo(() => new Set(filteredProjects.map((p) => p.id)), [filteredProjects]);

  const filteredRisks = useMemo(() => allRisks.filter((r) => validProjectIds.has(r.projectId)), [allRisks, validProjectIds]);
  const filteredIssues = useMemo(() => allIssues.filter((i) => validProjectIds.has(i.projectId)), [allIssues, validProjectIds]);
  const filteredReleases = useMemo(() => allReleases.filter((rel) => validProjectIds.has(rel.projectId)), [allReleases, validProjectIds]);
  const filteredDefects = useMemo(() => allDefects.filter((d) => validProjectIds.has(d.projectId)), [allDefects, validProjectIds]);
  const filteredTestCases = useMemo(() => allTestCases.filter((tc) => validProjectIds.has(tc.projectId)), [allTestCases, validProjectIds]);

  const redHealthProjects = useMemo(() => filteredProjects.filter((p) => p.overallStatus === 'Red'), [filteredProjects]);

  // CTO Metrics Calculations
  const metrics = useMemo(() => {
    const totalProjects = filteredProjects.length;

    // 1. RAG Health Distribution
    const greenCount = filteredProjects.filter((p) => p.overallStatus === 'Green').length;
    const amberCount = filteredProjects.filter((p) => p.overallStatus === 'Amber').length;
    const redCount = filteredProjects.filter((p) => p.overallStatus === 'Red').length;
    const healthPercent = totalProjects > 0 ? Math.round((greenCount / totalProjects) * 100) : 100;

    // 2. Pillar RAG breakdown
    const scopeGreen = filteredProjects.filter((p) => (p.scopeStatus || p.overallStatus) === 'Green').length;
    const scopeAmber = filteredProjects.filter((p) => (p.scopeStatus || p.overallStatus) === 'Amber').length;
    const scopeRed = filteredProjects.filter((p) => (p.scopeStatus || p.overallStatus) === 'Red').length;

    const timeGreen = filteredProjects.filter((p) => (p.timeStatus || p.overallStatus) === 'Green').length;
    const timeAmber = filteredProjects.filter((p) => (p.timeStatus || p.overallStatus) === 'Amber').length;
    const timeRed = filteredProjects.filter((p) => (p.timeStatus || p.overallStatus) === 'Red').length;

    const costGreen = filteredProjects.filter((p) => (p.costStatus || p.overallStatus) === 'Green').length;
    const costAmber = filteredProjects.filter((p) => (p.costStatus || p.overallStatus) === 'Amber').length;
    const costRed = filteredProjects.filter((p) => (p.costStatus || p.overallStatus) === 'Red').length;

    // 3. Upcoming Releases (next 60 days)
    const now = new Date();
    const upcomingReleases = filteredReleases
      .filter((r) => {
        const target = r.endDate || r.milestoneDate || r.startDate;
        if (!target) return false;
        try {
          const date = typeof target === 'string' ? parseISO(target) : new Date(target);
          const days = differenceInDays(date, now);
          return days >= -14 && days <= 60 && !r.isCompleted;
        } catch {
          return false;
        }
      })
      .sort((a, b) => {
        const dA = new Date(a.endDate || a.milestoneDate || a.startDate || 0).getTime();
        const dB = new Date(b.endDate || b.milestoneDate || b.startDate || 0).getTime();
        return dA - dB;
      });

    const onTimeReleases = upcomingReleases.filter((r) => {
      const date = new Date(r.endDate || r.milestoneDate || r.startDate || 0);
      return !isPast(date);
    }).length;
    const releaseOnTimeRate = upcomingReleases.length > 0 ? Math.round((onTimeReleases / upcomingReleases.length) * 100) : 100;

    // 4. Quality & Defect Metrics (strictly active/open defects)
    const getNormalizedSeverity = (d: EnrichedDefect): 'Critical' | 'High' | 'Medium' | 'Low' => {
      if (d.severity === 'Critical' || d.severity === 'High' || d.severity === 'Medium' || d.severity === 'Low') {
        return d.severity;
      }
      return 'Medium';
    };

    const openDefects = filteredDefects.filter((d) => d.status !== 'Done' && d.status !== 'Closed');
    const criticalBugs = openDefects.filter((d) => getNormalizedSeverity(d) === 'Critical');
    const highBugs = openDefects.filter((d) => getNormalizedSeverity(d) === 'High');
    const mediumBugs = openDefects.filter((d) => getNormalizedSeverity(d) === 'Medium');
    const lowBugs = openDefects.filter((d) => getNormalizedSeverity(d) === 'Low');

    // Per-project open defect distribution by severity
    const projectDefectMap: Record<
      string,
      {
        projectName: string;
        projectId: string;
        total: number;
        critical: number;
        high: number;
        medium: number;
        low: number;
      }
    > = {};

    openDefects.forEach((d) => {
      if (!projectDefectMap[d.projectId]) {
        projectDefectMap[d.projectId] = {
          projectName: d.projectName,
          projectId: d.projectId,
          total: 0,
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        };
      }
      const entry = projectDefectMap[d.projectId];
      entry.total++;
      const sev = getNormalizedSeverity(d);
      if (sev === 'Critical') entry.critical++;
      else if (sev === 'High') entry.high++;
      else if (sev === 'Medium') entry.medium++;
      else entry.low++;
    });

    const projectDefectList = Object.values(projectDefectMap);
    const maxProjectDefects = projectDefectList.reduce((max, p) => Math.max(max, p.total), 0);
    const zeroDefectProjectsCount = Math.max(0, totalProjects - projectDefectList.length);

    // 5. Commercial & Financial Exposure
    const totalContractValue = filteredProjects.reduce((acc, p) => acc + (p.projectValue || 0), 0);
    const fixedBidProjects = filteredProjects.filter((p) => p.pricingModel === 'Fixed Bid');
    const tnmProjects = filteredProjects.filter((p) => p.pricingModel === 'T&M');
    const fixedBidAtRisk = fixedBidProjects.filter((p) => p.costStatus === 'Red' || p.costStatus === 'Amber');

    return {
      totalProjects,
      greenCount,
      amberCount,
      redCount,
      healthPercent,
      scope: { green: scopeGreen, amber: scopeAmber, red: scopeRed },
      time: { green: timeGreen, amber: timeAmber, red: timeRed },
      cost: { green: costGreen, amber: costAmber, red: costRed },
      upcomingReleases,
      releaseOnTimeRate,
      criticalBugsCount: criticalBugs.length,
      highBugsCount: highBugs.length,
      mediumBugsCount: mediumBugs.length,
      lowBugsCount: lowBugs.length,
      totalOpenDefects: openDefects.length,
      projectDefectList,
      maxProjectDefects,
      zeroDefectProjectsCount,
      totalContractValue,
      fixedBidCount: fixedBidProjects.length,
      tnmCount: tnmProjects.length,
      fixedBidAtRisk,
      totalTestCases: filteredTestCases.length,
    };
  }, [filteredProjects, filteredReleases, filteredDefects, filteredTestCases]);

  const sortedProjectDefects = useMemo(() => {
    return [...metrics.projectDefectList].sort((a, b) => {
      if (defectSortBy === 'critical') {
        return (
          b.critical - a.critical ||
          b.high - a.high ||
          b.total - a.total ||
          a.projectName.localeCompare(b.projectName, undefined, { numeric: true, sensitivity: 'base' })
        );
      }
      return (
        b.total - a.total ||
        b.critical - a.critical ||
        b.high - a.high ||
        a.projectName.localeCompare(b.projectName, undefined, { numeric: true, sensitivity: 'base' })
      );
    });
  }, [metrics.projectDefectList, defectSortBy]);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header and Portfolio Selector */}
      <PageHeader
        title="Portfolio Dashboard"
        description="Executive technology delivery and operational health command center."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedPortfolioId} onValueChange={setSelectedPortfolioId}>
            <SelectTrigger className="w-[200px] bg-background">
              <SelectValue placeholder="Select Portfolio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Portfolios ({allActiveProjects.length} Projects)</SelectItem>
              {[...portfolios]
                .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
                .map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

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
        </div>
      </PageHeader>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            <p className="text-sm text-muted-foreground font-medium">Aggregating executive delivery metrics...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Top-Line Executive KPI Cards (Always Visible) */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Portfolio Health */}
            <Card className="border-border/60 bg-gradient-to-br from-card to-card/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Portfolio Health Index
                </CardTitle>
                <Activity className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight">{metrics.healthPercent}%</span>
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Green Status</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Progress value={metrics.healthPercent} className="h-1.5 flex-1 bg-secondary" />
                </div>
                <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {metrics.greenCount} Green
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    {metrics.amberCount} Amber
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    {metrics.redCount} Red
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Release On-Time Rate */}
            <Card className="border-border/60 bg-gradient-to-br from-card to-card/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Milestone Delivery
                </CardTitle>
                <Calendar className="h-4 w-4 text-sky-500" />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight">{metrics.upcomingReleases.length}</span>
                  <span className="text-xs text-muted-foreground">Releases in 60d</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">On-Time Projection:</span>
                  <Badge variant="outline" className="border-sky-500/30 text-sky-600 dark:text-sky-400 font-semibold">
                    {metrics.releaseOnTimeRate}% On Track
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground truncate">
                  Next:{' '}
                  {metrics.upcomingReleases[0]?.name ? (
                    <span className="font-medium text-foreground">{metrics.upcomingReleases[0].name}</span>
                  ) : (
                    'No pending milestones'
                  )}
                </p>
              </CardContent>
            </Card>

            {/* Card 3: Critical Defect Density */}
            <Card className="border-border/60 bg-gradient-to-br from-card to-card/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Quality & Defects
                </CardTitle>
                <Bug className="h-4 w-4 text-rose-500" />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight">{metrics.totalOpenDefects}</span>
                  <span className="text-xs text-muted-foreground">Open Defects</span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs font-medium',
                      metrics.criticalBugsCount > 0
                        ? 'border-red-500/40 bg-red-500/10 text-red-500'
                        : 'border-emerald-500/30 text-emerald-500'
                    )}
                  >
                    {metrics.criticalBugsCount} Critical
                  </Badge>
                  <Badge variant="outline" className="text-xs font-medium border-amber-500/30 text-amber-500">
                    {metrics.highBugsCount} High
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {metrics.totalTestCases > 0 ? `${metrics.totalTestCases} QA Test Cases Linked` : 'Test repository active'}
                </p>
              </CardContent>
            </Card>

            {/* Card 4: Commercial & Contract Value */}
            <Card className="border-border/60 bg-gradient-to-br from-card to-card/60 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Contractual Exposure
                </CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-tight">{formatCurrency(metrics.totalContractValue)}</span>
                  <span className="text-xs text-muted-foreground">Portfolio Value</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{metrics.fixedBidCount} Fixed Bid</span>
                  <span>{metrics.tnmCount} T&M</span>
                </div>
                <div className="mt-2 text-xs">
                  {metrics.fixedBidAtRisk.length > 0 ? (
                    <span className="text-amber-500 font-medium">
                      ⚠️ {metrics.fixedBidAtRisk.length} Fixed Bid in Cost Risk
                    </span>
                  ) : (
                    <span className="text-emerald-500 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 inline" /> Fixed Bid Margins Stable
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabbed Executive Lenses (Option 1) */}
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-6">
            <div className="border-b border-border/60 pb-2">
              <TabsList className="bg-muted/40 p-1">
                <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-background">
                  <BarChart3 className="h-4 w-4 text-emerald-500" />
                  <span>Executive Overview</span>
                </TabsTrigger>
                <TabsTrigger value="quality" className="flex items-center gap-2 data-[state=active]:bg-background">
                  <Bug className="h-4 w-4 text-rose-500" />
                  <span>Quality & Tech Debt</span>
                </TabsTrigger>
                <TabsTrigger value="raid" className="flex items-center gap-2 data-[state=active]:bg-background">
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  <span>Governance & RAID</span>
                  {(filteredRisks.length > 0 || filteredIssues.length > 0 || redHealthProjects.length > 0) && (
                    <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] bg-red-500/10 text-red-500">
                      {filteredRisks.length + filteredIssues.length + redHealthProjects.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: EXECUTIVE OVERVIEW */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* 3-Pillar RAG Breakdown */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base font-semibold">Delivery Pillar Health</CardTitle>
                        <CardDescription>Multi-dimensional RAG analysis across Scope, Schedule, and Cost</CardDescription>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {metrics.totalProjects} Active Projects
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Scope Health */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5 text-xs font-medium">
                        <span className="flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-sky-500" /> Scope Delivery
                        </span>
                        <span className="text-muted-foreground">
                          {metrics.scope.green} Green • {metrics.scope.amber} Amber • {metrics.scope.red} Red
                        </span>
                      </div>
                      <div className="h-2 w-full flex rounded-full overflow-hidden bg-secondary">
                        <div
                          style={{ width: `${metrics.totalProjects ? (metrics.scope.green / metrics.totalProjects) * 100 : 100}%` }}
                          className="bg-emerald-500"
                        />
                        <div
                          style={{ width: `${metrics.totalProjects ? (metrics.scope.amber / metrics.totalProjects) * 100 : 0}%` }}
                          className="bg-amber-500"
                        />
                        <div
                          style={{ width: `${metrics.totalProjects ? (metrics.scope.red / metrics.totalProjects) * 100 : 0}%` }}
                          className="bg-red-500"
                        />
                      </div>
                    </div>

                    {/* Schedule / Time Health */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5 text-xs font-medium">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-amber-500" /> Schedule & Timelines
                        </span>
                        <span className="text-muted-foreground">
                          {metrics.time.green} Green • {metrics.time.amber} Amber • {metrics.time.red} Red
                        </span>
                      </div>
                      <div className="h-2 w-full flex rounded-full overflow-hidden bg-secondary">
                        <div
                          style={{ width: `${metrics.totalProjects ? (metrics.time.green / metrics.totalProjects) * 100 : 100}%` }}
                          className="bg-emerald-500"
                        />
                        <div
                          style={{ width: `${metrics.totalProjects ? (metrics.time.amber / metrics.totalProjects) * 100 : 0}%` }}
                          className="bg-amber-500"
                        />
                        <div
                          style={{ width: `${metrics.totalProjects ? (metrics.time.red / metrics.totalProjects) * 100 : 0}%` }}
                          className="bg-red-500"
                        />
                      </div>
                    </div>

                    {/* Cost / Budget Health */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5 text-xs font-medium">
                        <span className="flex items-center gap-1.5">
                          <DollarSign className="h-3.5 w-3.5 text-emerald-500" /> Cost & Budget Burn
                        </span>
                        <span className="text-muted-foreground">
                          {metrics.cost.green} Green • {metrics.cost.amber} Amber • {metrics.cost.red} Red
                        </span>
                      </div>
                      <div className="h-2 w-full flex rounded-full overflow-hidden bg-secondary">
                        <div
                          style={{ width: `${metrics.totalProjects ? (metrics.cost.green / metrics.totalProjects) * 100 : 100}%` }}
                          className="bg-emerald-500"
                        />
                        <div
                          style={{ width: `${metrics.totalProjects ? (metrics.cost.amber / metrics.totalProjects) * 100 : 0}%` }}
                          className="bg-amber-500"
                        />
                        <div
                          style={{ width: `${metrics.totalProjects ? (metrics.cost.red / metrics.totalProjects) * 100 : 0}%` }}
                          className="bg-red-500"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Contract Risk & Delivery Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Commercial Model & Margin Risk</CardTitle>
                    <CardDescription>Fixed Bid vs Time & Materials risk exposure</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20">
                        <span className="text-xs text-muted-foreground font-medium">Fixed Bid Engagements</span>
                        <p className="text-xl font-bold mt-1">{metrics.fixedBidCount}</p>
                        <span className="text-xs text-muted-foreground">
                          {metrics.fixedBidAtRisk.length > 0 ? (
                            <span className="text-amber-500 font-medium">
                              ⚠️ {metrics.fixedBidAtRisk.length} projects over budget
                            </span>
                          ) : (
                            <span className="text-emerald-500">100% on budget target</span>
                          )}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20">
                        <span className="text-xs text-muted-foreground font-medium">T&M Flexible Engagements</span>
                        <p className="text-xl font-bold mt-1">{metrics.tnmCount}</p>
                        <span className="text-xs text-emerald-500 font-medium">Billed on utilization</span>
                      </div>
                    </div>

                    {metrics.fixedBidAtRisk.length > 0 && (
                      <div className="mt-2 space-y-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          High Exposure Fixed-Bid Projects
                        </span>
                        {metrics.fixedBidAtRisk.map((p) => (
                          <Link
                            key={p.id}
                            href={`/projects/${p.id}/project-details/pm-dashboard`}
                            className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 border border-border/40 text-xs"
                          >
                            <span className="font-medium text-foreground truncate max-w-[220px]">{p.name}</span>
                            <Badge variant="outline" className="border-amber-500/40 text-amber-500">
                              Cost {p.costStatus}
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Upcoming Production Release Radar */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">Upcoming Production Release Radar</CardTitle>
                      <CardDescription>Scheduled milestones in the next 60 days and PMO governance clearance</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs text-sky-500 border-sky-500/30">
                      {metrics.upcomingReleases.length} Milestones
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {metrics.upcomingReleases.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border/60 text-muted-foreground text-left">
                            <th className="pb-2 font-medium">Project</th>
                            <th className="pb-2 font-medium">Release / Milestone</th>
                            <th className="pb-2 font-medium">Target Date</th>
                            <th className="pb-2 font-medium">Timeline</th>
                            <th className="pb-2 font-medium text-right">Permit To Deploy</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {metrics.upcomingReleases.map((rel) => {
                            const target = rel.endDate || rel.milestoneDate || rel.startDate || '';
                            const dDate = target ? parseISO(target) : new Date();
                            const daysLeft = differenceInDays(dDate, new Date());
                            const isOverdue = daysLeft < 0;

                            return (
                              <tr key={rel.id} className="hover:bg-muted/30 transition-colors">
                                <td className="py-2.5 font-medium pr-3">
                                  <Link
                                    href={`/projects/${rel.projectId}/releases/project-releases`}
                                    className="hover:underline text-emerald-600 dark:text-emerald-400 flex items-center gap-1"
                                  >
                                    <span className="truncate max-w-[200px]">{rel.projectName}</span>
                                    <ExternalLink className="h-3 w-3 opacity-60" />
                                  </Link>
                                </td>
                                <td className="py-2.5 font-medium pr-3">{rel.name}</td>
                                <td className="py-2.5 text-muted-foreground pr-3">
                                  {target ? format(dDate, 'MMM d, yyyy') : 'TBD'}
                                </td>
                                <td className="py-2.5 pr-3">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'text-[11px] font-medium',
                                      isOverdue
                                        ? 'border-red-500/40 text-red-500 bg-red-500/10'
                                        : daysLeft <= 14
                                        ? 'border-amber-500/40 text-amber-500 bg-amber-500/10'
                                        : 'border-emerald-500/30 text-emerald-500'
                                    )}
                                  >
                                    {isOverdue ? `${Math.abs(daysLeft)}d overdue` : `In ${daysLeft}d`}
                                  </Badge>
                                </td>
                                <td className="py-2.5 text-right">
                                  {rel.permitToDeploy ? (
                                    <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 text-[10px]">
                                      <ShieldCheck className="h-3 w-3 mr-1 inline" /> Cleared
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-[10px]">
                                      <Clock className="h-3 w-3 mr-1 inline" /> Pending PMO
                                    </Badge>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-xs">
                      No active releases scheduled in the next 60 days.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: QUALITY & TECH DEBT */}
            <TabsContent value="quality" className="space-y-6">
              <Card data-testid="project-defect-distribution-card">
                <CardHeader className="pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <CardTitle className="text-base font-semibold">Open Defects by Project</CardTitle>
                      <CardDescription>
                        Active defect distribution by severity across portfolio projects
                      </CardDescription>
                    </div>

                    {sortedProjectDefects.length > 1 && (
                      <div
                        className="inline-flex items-center rounded-lg border border-border/60 bg-muted/40 p-0.5 text-xs self-start"
                        role="group"
                        aria-label="Sort project defects"
                      >
                        <button
                          type="button"
                          onClick={() => setDefectSortBy('total')}
                          className={cn(
                            'px-2.5 py-1 rounded-md font-medium transition-colors',
                            defectSortBy === 'total'
                              ? 'bg-background text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          By Total
                        </button>
                        <button
                          type="button"
                          onClick={() => setDefectSortBy('critical')}
                          className={cn(
                            'px-2.5 py-1 rounded-md font-medium transition-colors',
                            defectSortBy === 'critical'
                              ? 'bg-background text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          By Critical
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Portfolio-wide Severity Legend & Totals */}
                  <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-[3px] bg-red-500 shrink-0" />
                        <span className="text-muted-foreground">Critical</span>
                        <span className="font-semibold text-foreground tabular-nums">{metrics.criticalBugsCount}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-[3px] bg-orange-500 shrink-0" />
                        <span className="text-muted-foreground">High</span>
                        <span className="font-semibold text-foreground tabular-nums">{metrics.highBugsCount}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-[3px] bg-amber-400 shrink-0" />
                        <span className="text-muted-foreground">Medium</span>
                        <span className="font-semibold text-foreground tabular-nums">{metrics.mediumBugsCount}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-[3px] bg-slate-400 shrink-0" />
                        <span className="text-muted-foreground">Low</span>
                        <span className="font-semibold text-foreground tabular-nums">{metrics.lowBugsCount}</span>
                      </span>
                    </div>

                    <span className="text-muted-foreground">
                      Total Open:{' '}
                      <strong className="font-semibold text-foreground tabular-nums">
                        {metrics.totalOpenDefects}
                      </strong>{' '}
                      {metrics.totalOpenDefects === 1 ? 'bug' : 'bugs'}
                    </span>
                  </div>
                </CardHeader>

                <CardContent>
                  {sortedProjectDefects.length > 0 ? (
                    <TooltipProvider delayDuration={150}>
                      <div className="space-y-3">
                        {sortedProjectDefects.map((proj, index) => {
                          const barWidthPercent =
                            metrics.maxProjectDefects > 0
                              ? Math.max(6, (proj.total / metrics.maxProjectDefects) * 100)
                              : 0;
                          const criticalPct = proj.total > 0 ? (proj.critical / proj.total) * 100 : 0;
                          const highPct = proj.total > 0 ? (proj.high / proj.total) * 100 : 0;
                          const mediumPct = proj.total > 0 ? (proj.medium / proj.total) * 100 : 0;
                          const lowPct = proj.total > 0 ? (proj.low / proj.total) * 100 : 0;

                          return (
                            <div
                              key={proj.projectId}
                              data-testid="project-defect-row"
                              className="flex flex-col md:flex-row md:items-center gap-2.5 md:gap-5 p-3 rounded-lg border border-border/50 bg-card/40 hover:bg-muted/30 transition-colors"
                            >
                              {/* Left: Project Name & Non-Zero Severity Micro-Breakdown */}
                              <div className="md:w-[34%] lg:w-[32%] shrink-0 min-w-0">
                                <Link
                                  href={`/projects/${proj.projectId}/development/kanban`}
                                  className="text-xs sm:text-sm font-semibold text-foreground hover:text-primary hover:underline truncate block"
                                  title={proj.projectName}
                                >
                                  {index + 1}. {proj.projectName}
                                </Link>
                                <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] tabular-nums">
                                  {proj.critical > 0 && (
                                    <span className="text-red-500 font-medium">{proj.critical} Critical</span>
                                  )}
                                  {proj.high > 0 && (
                                    <span className="text-orange-500 font-medium">{proj.high} High</span>
                                  )}
                                  {proj.medium > 0 && (
                                    <span className="text-amber-500/90 dark:text-amber-400/90">{proj.medium} Med</span>
                                  )}
                                  {proj.low > 0 && (
                                    <span className="text-muted-foreground">{proj.low} Low</span>
                                  )}
                                </div>
                              </div>

                              {/* Middle: Proportional Thick Horizontal Stacked Severity Bar */}
                              <div className="flex-1 min-w-0">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className="w-full h-4 rounded-md bg-secondary/50 overflow-hidden flex items-center cursor-default"
                                      aria-label={`${proj.projectName}: ${proj.total} open bugs (${proj.critical} Critical, ${proj.high} High, ${proj.medium} Medium, ${proj.low} Low)`}
                                    >
                                      <div
                                        data-testid="project-defect-bar"
                                        style={{ width: `${barWidthPercent}%` }}
                                        className="h-full flex rounded-md overflow-hidden divide-x divide-background/30"
                                      >
                                        {proj.critical > 0 && (
                                          <div
                                            style={{ width: `${criticalPct}%` }}
                                            className="h-full bg-red-500 hover:bg-red-400 transition-colors"
                                          />
                                        )}
                                        {proj.high > 0 && (
                                          <div
                                            style={{ width: `${highPct}%` }}
                                            className="h-full bg-orange-500 hover:bg-orange-400 transition-colors"
                                          />
                                        )}
                                        {proj.medium > 0 && (
                                          <div
                                            style={{ width: `${mediumPct}%` }}
                                            className="h-full bg-amber-400 hover:bg-amber-300 transition-colors"
                                          />
                                        )}
                                        {proj.low > 0 && (
                                          <div
                                            style={{ width: `${lowPct}%` }}
                                            className="h-full bg-slate-400 hover:bg-slate-300 transition-colors"
                                          />
                                        )}
                                      </div>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs space-y-1.5 p-2.5">
                                    <div className="font-semibold text-foreground border-b border-border/60 pb-1">
                                      {proj.projectName} ({proj.total} {proj.total === 1 ? 'bug' : 'bugs'})
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 tabular-nums">
                                      <span className="inline-flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-[3px] bg-red-500" />
                                        Critical: <strong>{proj.critical}</strong> ({Math.round(criticalPct)}%)
                                      </span>
                                      <span className="inline-flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-[3px] bg-orange-500" />
                                        High: <strong>{proj.high}</strong> ({Math.round(highPct)}%)
                                      </span>
                                      <span className="inline-flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-[3px] bg-amber-400" />
                                        Medium: <strong>{proj.medium}</strong> ({Math.round(mediumPct)}%)
                                      </span>
                                      <span className="inline-flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-[3px] bg-slate-400" />
                                        Low: <strong>{proj.low}</strong> ({Math.round(lowPct)}%)
                                      </span>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </div>

                              {/* Right: Total Open Bugs */}
                              <div
                                data-testid="project-defect-total"
                                className="md:w-20 shrink-0 flex items-baseline md:justify-end gap-1 whitespace-nowrap"
                              >
                                <span className="text-sm sm:text-base font-bold tracking-tight text-foreground tabular-nums">
                                  {proj.total}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {proj.total === 1 ? 'bug' : 'bugs'}
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        {metrics.zeroDefectProjectsCount > 0 && (
                          <div className="pt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            <span>
                              {metrics.zeroDefectProjectsCount} active{' '}
                              {metrics.zeroDefectProjectsCount === 1 ? 'project has' : 'projects have'} zero open bugs.
                            </span>
                          </div>
                        )}
                      </div>
                    </TooltipProvider>
                  ) : (
                    <div className="text-center py-10 text-muted-foreground text-xs">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                      No projects currently have open defect backlogs.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: GOVERNANCE & RAID (Retained & Enhanced) */}
            <TabsContent value="raid" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* High Potential Risks */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold">High Potential Risks</CardTitle>
                      <Badge variant="outline" className="text-xs border-red-500/30 text-red-500">
                        {filteredRisks.length} High Risks
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-full max-h-[48vh] pr-4">
                      {filteredRisks.length > 0 ? (
                        filteredRisks.map((risk, index) => (
                          <RiskItem key={index} item={risk} onClick={() => setViewingRisk(risk)} />
                        ))
                      ) : (
                        <p className="text-muted-foreground text-center py-10 text-xs">
                          No high potential risks found in active projects.
                        </p>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Critical & High Priority Issues */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold">Critical & High Priority Issues</CardTitle>
                      <Badge variant="outline" className="text-xs border-orange-500/30 text-orange-500">
                        {filteredIssues.length} Active
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-full max-h-[48vh] pr-4">
                      {filteredIssues.length > 0 ? (
                        filteredIssues.map((issue, index) => (
                          <IssueItem key={index} item={issue} onClick={() => setViewingIssue(issue)} />
                        ))
                      ) : (
                        <p className="text-muted-foreground text-center py-10 text-xs">
                          No critical or high priority issues found in active projects.
                        </p>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Red Health Projects */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">Red Health Projects (Action Required)</CardTitle>
                    <Badge variant="outline" className="text-xs border-red-500/30 text-red-500">
                      {redHealthProjects.length} Projects
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-full max-h-[48vh] pr-4">
                    {redHealthProjects.length > 0 ? (
                      redHealthProjects.map((project) => <ProjectItem key={project.id} project={project} />)
                    ) : (
                      <div className="text-center py-8 text-muted-foreground text-xs">
                        <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-2 opacity-80" />
                        No projects currently have red health status. All initiatives are operating on Green or Amber.
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Retained Dialog Modals */}
      <RiskDetailDialog
        risk={viewingRisk}
        isOpen={!!viewingRisk}
        onOpenChange={(open) => !open && setViewingRisk(null)}
      />
      <IssueDetailDialog
        issue={viewingIssue}
        isOpen={!!viewingIssue}
        onOpenChange={(open) => !open && setViewingIssue(null)}
      />
    </div>
  );
}

// Subcomponents
function RiskItem({ item, onClick }: { item: EnrichedRisk; onClick: () => void }) {
  return (
    <div className="p-3 border-b border-border/40 last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors" onClick={onClick}>
      <div className="flex justify-between items-start">
        <p className="text-sm font-medium flex-1 pr-2">{item.description}</p>
        <div className="flex items-center gap-2 shrink-0">
          <div className={cn('h-2.5 w-2.5 rounded-full', getRiskPotentialClass(item.severity, item.probability))} />
          <span className="text-xs font-semibold">{getRiskPotential(item.severity, item.probability)}</span>
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <Badge variant="outline" className="text-[11px] font-normal">{item.projectName}</Badge>
        <span className="text-[10px] text-muted-foreground">Click for details →</span>
      </div>
    </div>
  );
}

function IssueItem({ item, onClick }: { item: EnrichedIssue; onClick: () => void }) {
  return (
    <div className="p-3 border-b border-border/40 last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors" onClick={onClick}>
      <div className="flex justify-between items-start">
        <p className="text-sm font-medium flex-1 pr-2">{item.description}</p>
        <div className="flex items-center gap-2 shrink-0">
          <div className={cn('h-2.5 w-2.5 rounded-full', issuePriorityStyles[item.priority])} />
          <span className="text-xs font-semibold">{item.priority}</span>
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <Badge variant="outline" className="text-[11px] font-normal">{item.projectName}</Badge>
        <span className="text-[10px] text-muted-foreground">Click for details →</span>
      </div>
    </div>
  );
}

function ProjectItem({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.id}/project-details/project-status`}
      className="block p-3 border-b border-border/40 last:border-b-0 hover:bg-muted/50 transition-colors"
    >
      <div className="flex justify-between items-start">
        <p className="text-sm font-semibold flex-1 pr-2 text-foreground">{project.name}</p>
        <div className="flex items-center gap-1.5 shrink-0">
          <Circle
            className={cn('h-3.5 w-3.5', project.overallStatus ? ragStatusStyles[project.overallStatus] : 'text-gray-300')}
            fill="currentColor"
          />
          <span className="text-xs font-semibold">{project.overallStatus}</span>
        </div>
      </div>
      {(project.description || project.summary) && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">{project.description || project.summary}</p>
      )}
      {project.statusComments && (
        <p className="text-xs font-medium text-destructive mt-1 truncate">Status: {project.statusComments}</p>
      )}
    </Link>
  );
}

function RiskDetailDialog({
  risk,
  isOpen,
  onOpenChange,
}: {
  risk: EnrichedRisk | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!risk) return null;
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Risk Details ({risk.riskId})</DialogTitle>
          <DialogDescription>Viewing risk from project: {risk.projectName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 text-sm">
          <div>
            <h4 className="font-semibold">Description</h4>
            <p className="text-muted-foreground mt-0.5">{risk.description}</p>
          </div>
          <div>
            <h4 className="font-semibold">Mitigation Plan</h4>
            <p className="text-muted-foreground mt-0.5">{risk.mitigationPlan || 'None specified'}</p>
          </div>
          <div>
            <h4 className="font-semibold">Contingency Plan</h4>
            <p className="text-muted-foreground mt-0.5">{risk.contingencyPlan || 'None specified'}</p>
          </div>
        </div>
        <DialogFooter>
          <Link href={`/projects/${risk.projectId}/risks`}>
            <Button>Go to Project Risks</Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IssueDetailDialog({
  issue,
  isOpen,
  onOpenChange,
}: {
  issue: EnrichedIssue | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!issue) return null;
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Issue Details ({issue.issueId})</DialogTitle>
          <DialogDescription>Viewing issue from project: {issue.projectName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 text-sm">
          <div>
            <h4 className="font-semibold">Description</h4>
            <p className="text-muted-foreground mt-0.5">{issue.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold">Status</h4>
              <Badge className={cn('mt-1', issueStatusStyles[issue.status])}>{issue.status}</Badge>
            </div>
            <div>
              <h4 className="font-semibold">Priority</h4>
              <div className="flex items-center gap-2 mt-1">
                <div className={cn('h-3 w-3 rounded-full', issuePriorityStyles[issue.priority])} />
                <span className="text-sm font-semibold">{issue.priority}</span>
              </div>
            </div>
          </div>
          {issue.reportedDate && (
            <div>
              <h4 className="font-semibold">Reported Date</h4>
              <p className="text-muted-foreground mt-0.5">
                {format(new Date(issue.reportedDate), 'PPP')}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Link href={`/projects/${issue.projectId}/issues`}>
            <Button>Go to Project Issues</Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
