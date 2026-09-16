'use client';

import { useState, useEffect, useMemo, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { useProject } from '@/context/ProjectContext';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  Sparkles,
  Search,
  ShieldCheck,
  Download,
  Copy,
  Check,
  ArrowUpDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ExternalLink,
  Layers,
  DollarSign,
  Users,
  X,
  Loader2,
  Info,
  BarChart3,
  PieChart as PieIcon,
  Briefcase,
  CheckSquare,
  ShieldAlert,
  Clock,
} from 'lucide-react';
import type { FpQueryResponse, FpKpiCard } from '@/types/fp-dashboard';
import { executeFpPmQuery, type FpPmProjectData } from '@/lib/fp-pm-query-engine';
import { cn } from '@/lib/utils';

const PALETTE = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];

const PRESET_PROMPTS = [
  {
    label: '🚀 Sprint Delivery & Velocity',
    query: 'Show current sprint progress, velocity, and delivery status',
    description: 'Active sprint health, delivered points, completed vs pending stories',
  },
  {
    label: '🎯 Stories & Tasks by Status',
    query: 'Show stories and tasks grouped by status and priority',
    description: 'Backlog workflow distribution from To Do to Done',
  },
  {
    label: '🐞 Defect & Quality Breakdown',
    query: 'List open bugs and defect severity breakdown',
    description: 'Quality health, critical blockers, and defect resolution status',
  },
  {
    label: '⚠️ Critical Risks & RAID Items',
    query: 'List critical risks, blockers, and open issues',
    description: 'High potential risks, project blockers, assumptions and dependencies',
  },
  {
    label: '👥 Team Workload & Logged Hours',
    query: 'Show team workload and planned vs logged hours',
    description: 'Workload distribution, logged hours, and task allocation per member',
  },
  {
    label: '🏛️ Project & Portfolio Info',
    query: 'What is the portfolio name of this project',
    description: 'Portfolio alignment, project manager, timeline, and delivery metadata',
  },
  {
    label: '📦 Epics & Milestone Progress',
    query: 'Show epics completion percentage and scheduled releases',
    description: 'Major initiatives delivery progress and release roadmap',
  },
  {
    label: '💰 Budget & Milestone Payments',
    query: 'Project valuation, billing rate, and milestone payments',
    description: 'Scheduled milestone invoicing, paid amounts, and financial burn',
  },
  {
    label: '📋 Backlog & All Work Items',
    query: 'Overview of all active stories and subtasks in this project',
    description: 'Comprehensive searchable catalog of all project deliverables',
  },
];

export default function FpPmDashboardPage() {
  const {
    project,
    stories,
    sprints,
    epics,
    employees,
    allUsers,
    risks,
    issues,
    assumptions,
    dependencies,
    testCases,
    worklogs,
    paymentMilestones,
    releasesAndMilestones,
    impactedSystems,
  } = useProject();

  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<FpQueryResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'chart' | 'table'>('split');
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
  const [tableFilter, setTableFilter] = useState<string>('');
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [, startTransition] = useTransition();

  // Load portfolios on mount to resolve project portfolio names
  useEffect(() => {
    async function loadPortfolios() {
      if (!db) return;
      try {
        const snap = await getDocs(collection(db, 'portfolios'));
        const list: any[] = [];
        snap.docs.forEach((d: any) => {
          const data = d.data();
          if (!data.isDeleted) {
            list.push({ id: d.id, ...data });
          }
        });
        setPortfolios(list);
      } catch (e) {
        console.error('Failed to fetch portfolios:', e);
      }
    }
    loadPortfolios();
  }, []);

  const projectPortfolioId = project?.portfolioId;
  const projectPortfolioName = (project as any)?.portfolioName;
  const portfolioName = useMemo(() => {
    if (!projectPortfolioId) return 'General Portfolio';
    const found = portfolios.find((p) => p.id === projectPortfolioId || p.name === projectPortfolioId);
    return found?.name || projectPortfolioName || projectPortfolioId;
  }, [portfolios, projectPortfolioId, projectPortfolioName]);

  // Package project data for query engine
  const projectData: FpPmProjectData = useMemo(() => ({
    project: project || {},
    portfolioName,
    allUsers: allUsers || [],
    stories: stories || [],
    sprints: sprints || [],
    epics: epics || [],
    employees: employees || [],
    risks: risks || [],
    issues: issues || [],
    assumptions: assumptions || [],
    dependencies: dependencies || [],
    testCases: testCases || [],
    worklogs: worklogs || [],
    paymentMilestones: paymentMilestones || [],
    releases: releasesAndMilestones || [],
    impactedSystems: impactedSystems || [],
  }), [
    project,
    portfolioName,
    allUsers,
    stories,
    sprints,
    epics,
    employees,
    risks,
    issues,
    assumptions,
    dependencies,
    testCases,
    worklogs,
    paymentMilestones,
    releasesAndMilestones,
    impactedSystems,
  ]);

  const handleRunQuery = useCallback((queryToRun: string) => {
    const q = queryToRun.trim();
    if (!q) return;

    setIsLoading(true);
    setErrorMsg(null);
    setSearchQuery(q);

    try {
      const data = executeFpPmQuery(q, projectData);
      setResponse(data);
      if (data.table?.defaultSortKey) {
        setSortKey(data.table.defaultSortKey);
        setSortDir(data.table.defaultSortDir || 'asc');
      }
    } catch (err: any) {
      console.error('FP PM Dash query error:', err);
      setErrorMsg(err.message || 'Failed to retrieve data from project database.');
    } finally {
      setIsLoading(false);
    }
  }, [projectData]);

  // Run or refresh query on mount and when project data finishes loading
  useEffect(() => {
    if (project?.id) {
      handleRunQuery(searchQuery || PRESET_PROMPTS[0].query);
    }
  }, [
    project?.id,
    handleRunQuery,
    searchQuery,
  ]);

  const handleCopySummary = () => {
    if (!response || !response.executiveSummary) return;
    const text = [
      `FP PM DASH: ${response.title}`,
      `Query: "${response.query}"`,
      `Verified Source: ${response.audit?.recordsAnalyzed} records analyzed (${response.audit?.portfolioScope})`,
      '',
      ...response.executiveSummary.map((s) => `• ${s}`),
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleExportCsv = () => {
    if (!response || !response.table || response.table.rows.length === 0) return;
    const cols = response.table.columns;
    const rows = response.table.rows;

    const headers = cols.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(',');
    const csvRows = rows.map((r) =>
      cols
        .map((c) => {
          const val = r[c.key] !== undefined && r[c.key] !== null ? String(r[c.key]) : '';
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(',')
    );

    const csvContent = [headers, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FP_PM_Dash_${project?.id || 'Project'}_${response.intent}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filtered and sorted table rows
  const displayRows = useMemo(() => {
    if (!response || !response.table) return [];
    let list = [...response.table.rows];

    if (tableFilter.trim()) {
      const tf = tableFilter.toLowerCase();
      list = list.filter((row) =>
        Object.values(row).some((val) => val && String(val).toLowerCase().includes(tf))
      );
    }

    if (sortKey) {
      list.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDir === 'asc' ? valA - valB : valB - valA;
        }
        const strA = String(valA || '').toLowerCase();
        const strB = String(valB || '').toLowerCase();
        return sortDir === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
    }

    return list;
  }, [response, tableFilter, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const renderBadge = (key: string, val: any) => {
    const sVal = String(val);
    const lower = sVal.toLowerCase();

    if (key === 'status' || key === 'health') {
      if (lower === 'done' || lower === 'completed' || lower === 'closed' || lower === 'green') {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {sVal}
          </span>
        );
      }
      if (lower === 'in progress' || lower === 'in dev' || lower === 'active') {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            {sVal}
          </span>
        );
      }
      if (lower === 'blocked' || lower === 'red') {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            {sVal}
          </span>
        );
      }
      if (lower === 'in review' || lower === 'testing' || lower === 'amber') {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            {sVal}
          </span>
        );
      }
      return <Badge variant="outline">{sVal}</Badge>;
    }

    if (key === 'severity' || key === 'priority') {
      const isCritical = lower === 'critical';
      const isHigh = lower === 'high';
      return (
        <Badge
          variant="outline"
          className={cn(
            'text-xs font-semibold',
            isCritical
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              : isHigh
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {sVal}
        </Badge>
      );
    }

    if (key === 'itemType' || key === 'type') {
      return (
        <Badge variant="secondary" className="font-mono text-xs">
          {sVal}
        </Badge>
      );
    }

    return <Badge variant="outline">{sVal}</Badge>;
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background text-foreground min-h-screen">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
                  FP PM Dash
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium border border-primary/30">
                    Project Intelligence
                  </span>
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Real-time, zero-hallucination project delivery analytics derived directly from your live database.
                </p>
              </div>
            </div>
          </div>

          {/* Project Scope Card */}
          <div className="flex items-center gap-3 bg-card border border-border px-3.5 py-2 rounded-lg shadow-sm">
            <Briefcase className="w-4 h-4 text-primary shrink-0" />
            <div className="text-xs space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground truncate max-w-[180px]">
                  {project?.name || 'Project'}
                </span>
                <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                  {project?.id}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="truncate max-w-[140px] text-primary/90 font-medium">📁 {portfolioName}</span>
                <span>•</span>
                <span>{project?.pricingModel || 'Fixed Bid'}</span>
                <span>•</span>
                <span className={cn('font-semibold', project?.overallStatus === 'Green' ? 'text-emerald-400' : project?.overallStatus === 'Amber' ? 'text-amber-400' : 'text-rose-400')}>
                  {project?.overallStatus || 'Green'} Health
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Query Bar */}
        <Card className="bg-card/50 backdrop-blur-sm border-primary/20 shadow-md">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRunQuery(searchQuery);
                  }}
                  placeholder="Ask FP PM Dash (e.g. 'Show sprint velocity', 'List open critical bugs', 'Team workload and capacity breakdown')..."
                  className="pl-9 bg-background/80 border-border/80 focus-visible:ring-primary h-10 text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button
                onClick={() => handleRunQuery(searchQuery)}
                disabled={isLoading || !searchQuery.trim()}
                className="h-10 px-5 gap-2 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Querying...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Ask AI
                  </>
                )}
              </Button>
            </div>

            {/* Preset Query Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-primary" /> Suggestions:
              </span>
              {PRESET_PROMPTS.map((prompt) => (
                <button
                  key={prompt.query}
                  onClick={() => handleRunQuery(prompt.query)}
                  className="text-xs px-2.5 py-1 rounded-full bg-accent/60 hover:bg-primary/15 hover:text-primary hover:border-primary/40 border border-border/60 text-foreground transition-all cursor-pointer truncate max-w-[280px]"
                  title={prompt.description}
                >
                  {prompt.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Main Response Area */}
        {response && (
          <div className="space-y-6">
            {/* Audit & Compliance Stamp */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-card border border-border text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong className="text-emerald-400 font-semibold">Live Database Verified:</strong>{' '}
                  {response.audit?.recordsAnalyzed} records analyzed under {response.audit?.portfolioScope}.
                </span>
                <span className="hidden md:inline text-border">|</span>
                <span className="hidden md:inline font-mono text-[11px] text-primary font-medium">
                  Zero Hallucination Guaranteed
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopySummary}
                  className="h-7 text-xs gap-1.5 cursor-pointer"
                >
                  {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSummary ? 'Copied' : 'Copy Summary'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCsv}
                  className="h-7 text-xs gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Dynamic KPI Cards */}
            {response.kpis && response.kpis.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {response.kpis.map((kpi) => {
                  const borderCol =
                    kpi.status === 'positive'
                      ? 'border-emerald-500/30'
                      : kpi.status === 'warning'
                      ? 'border-amber-500/30'
                      : kpi.status === 'negative'
                      ? 'border-rose-500/30'
                      : 'border-border/60';

                  const textCol =
                    kpi.status === 'positive'
                      ? 'text-emerald-400'
                      : kpi.status === 'warning'
                      ? 'text-amber-400'
                      : kpi.status === 'negative'
                      ? 'text-rose-400'
                      : 'text-foreground';

                  return (
                    <Card key={kpi.id} className={cn('bg-card/60 backdrop-blur-sm border shadow-sm', borderCol)}>
                      <CardHeader className="p-4 pb-1">
                        <CardDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {kpi.label}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-1">
                        <div className={cn('text-2xl font-bold tracking-tight', textCol)}>
                          {kpi.value}
                        </div>
                        {kpi.subtext && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 truncate">
                            <Info className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                            {kpi.subtext}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Executive Synthesis Summary */}
            {response.executiveSummary && response.executiveSummary.length > 0 && (
              <Card className="bg-card border-border/80 shadow-sm">
                <CardHeader className="p-4 pb-2 border-b border-border/60">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Executive Takeaways: {response.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-1.5">
                  <p className="text-xs text-muted-foreground mb-2">
                    Synthesized findings strictly based on database records from {response.audit?.portfolioScope}:
                  </p>
                  <ul className="space-y-1.5">
                    {response.executiveSummary.map((bullet, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <span className="text-primary font-bold mt-0.5">•</span>
                        <span className="text-foreground/90">{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* View Mode Tabs (Split, Chart, Table) */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-primary" />
                  Data Analysis & Records
                </h2>
                <Badge variant="outline" className="text-xs font-mono">
                  {displayRows.length} item(s)
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                  <TabsList className="h-8">
                    <TabsTrigger value="split" className="text-xs px-2.5">
                      Split View
                    </TabsTrigger>
                    <TabsTrigger value="chart" className="text-xs px-2.5">
                      Chart View
                    </TabsTrigger>
                    <TabsTrigger value="table" className="text-xs px-2.5">
                      Table View
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            {/* Visual & Tabular Content Grid */}
            <div className={cn(
              'grid gap-6',
              viewMode === 'split' ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'
            )}>
              {/* Chart Panel */}
              {(viewMode === 'split' || viewMode === 'chart') && response.chart && response.chart.type !== 'none' && (
                <Card className={cn(
                  'bg-card border-border shadow-sm flex flex-col',
                  viewMode === 'split' ? 'lg:col-span-5' : 'w-full'
                )}>
                  <CardHeader className="p-4 pb-2 border-b border-border/60">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      {response.chart.title}
                    </CardTitle>
                    {response.chart.description && (
                      <CardDescription className="text-xs">
                        {response.chart.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="p-4 flex-1 flex flex-col justify-center min-h-[300px]">
                    {response.chart.type === 'pie' ? (
                      <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--popover))',
                                borderColor: 'hsl(var(--border))',
                                borderRadius: '8px',
                                color: 'hsl(var(--popover-foreground))',
                                fontSize: '12px',
                              }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                            <Pie
                              data={response.chart.data}
                              dataKey={response.chart.dataKey}
                              nameKey={response.chart.categoryKey}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              innerRadius={45}
                              paddingAngle={3}
                            >
                              {response.chart.data.map((_, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={
                                    (response.chart.colors && response.chart.colors[index % response.chart.colors.length]) ||
                                    PALETTE[index % PALETTE.length]
                                  }
                                />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={response.chart.data}
                            margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                            <XAxis
                              dataKey={response.chart.categoryKey}
                              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                              angle={-20}
                              textAnchor="end"
                              interval={0}
                            />
                            <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--popover))',
                                borderColor: 'hsl(var(--border))',
                                borderRadius: '8px',
                                color: 'hsl(var(--popover-foreground))',
                                fontSize: '12px',
                              }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                            <Bar
                              dataKey={response.chart.dataKey}
                              fill={response.chart.colors?.[0] || '#6366f1'}
                              radius={[4, 4, 0, 0]}
                            />
                            {response.chart.secondaryKey && (
                              <Bar
                                dataKey={response.chart.secondaryKey}
                                fill={response.chart.colors?.[1] || '#f59e0b'}
                                radius={[4, 4, 0, 0]}
                              />
                            )}
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Data Table Panel */}
              {(viewMode === 'split' || viewMode === 'table') && response.table && (
                <Card className={cn(
                  'bg-card border-border shadow-sm flex flex-col',
                  viewMode === 'split'
                    ? response.chart?.type !== 'none'
                      ? 'lg:col-span-7'
                      : 'col-span-12'
                    : 'w-full'
                )}>
                  <CardHeader className="p-4 pb-3 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                        <CheckSquare className="w-4 h-4 text-primary" />
                        Detailed Records
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Showing {displayRows.length} matching record(s)
                      </CardDescription>
                    </div>

                    <div className="w-full sm:w-56 relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                      <Input
                        value={tableFilter}
                        onChange={(e) => setTableFilter(e.target.value)}
                        placeholder="Filter rows..."
                        className="h-8 pl-8 text-xs bg-background"
                      />
                      {tableFilter && (
                        <button
                          onClick={() => setTableFilter('')}
                          className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto flex-1 max-h-[460px]">
                    <Table>
                      <TableHeader className="bg-muted/40 sticky top-0 z-10 backdrop-blur-sm">
                        <TableRow>
                          {response.table.columns.map((col) => (
                            <TableHead
                              key={col.key}
                              onClick={() => handleSort(col.key)}
                              className="text-xs font-semibold cursor-pointer hover:bg-muted/60 whitespace-nowrap"
                            >
                              <div className="flex items-center gap-1.5">
                                <span>{col.label}</span>
                                <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayRows.length > 0 ? (
                          displayRows.map((row, idx) => (
                            <TableRow key={row.id || idx} className="hover:bg-muted/30">
                              {response.table.columns.map((col) => {
                                const val = row[col.key];

                                if (col.type === 'link') {
                                  return (
                                    <TableCell key={col.key} className="text-xs font-medium">
                                      {row.link ? (
                                        <Link
                                          href={row.link}
                                          className="text-primary hover:underline flex items-center gap-1 font-semibold"
                                        >
                                          <span className="truncate max-w-[240px]">{String(val || '')}</span>
                                          <ExternalLink className="w-3 h-3 opacity-60 shrink-0" />
                                        </Link>
                                      ) : (
                                        String(val || '')
                                      )}
                                    </TableCell>
                                  );
                                }

                                if (col.type === 'badge') {
                                  return (
                                    <TableCell key={col.key} className="text-xs">
                                      {renderBadge(col.key, val)}
                                    </TableCell>
                                  );
                                }

                                if (col.type === 'currency') {
                                  return (
                                    <TableCell key={col.key} className="text-xs font-mono font-semibold">
                                      ${Number(val || 0).toLocaleString()}
                                    </TableCell>
                                  );
                                }

                                if (col.type === 'number') {
                                  return (
                                    <TableCell key={col.key} className="text-xs font-mono">
                                      {Number(val || 0).toLocaleString()}
                                    </TableCell>
                                  );
                                }

                                return (
                                  <TableCell key={col.key} className="text-xs text-foreground/90 max-w-[280px] truncate">
                                    {String(val || '-')}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={response.table.columns.length}
                              className="text-center py-8 text-xs text-muted-foreground"
                            >
                              No matching records found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Recommended Follow-up Inquiries */}
            {response.followUpSuggestions && response.followUpSuggestions.length > 0 && (
              <div className="pt-2 pb-6 space-y-2">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" />
                  Recommended Follow-up Inquiries for Project Leadership:
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {response.followUpSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleRunQuery(suggestion)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-card hover:bg-primary/15 hover:text-primary hover:border-primary/40 border border-border text-foreground transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span>{suggestion}</span>
                      <span className="text-primary font-bold">→</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
