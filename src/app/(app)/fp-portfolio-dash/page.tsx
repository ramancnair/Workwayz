'use client';

import { useState, useEffect, useMemo, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Clock,
} from 'lucide-react';
import { db, collection, getDocs } from '@/lib/db-provider';
import type { Portfolio } from '@/types';
import type { FpQueryResponse, FpKpiCard } from '@/types/fp-dashboard';
import { executeFpQuery } from '@/lib/fp-query-engine';
import { cn } from '@/lib/utils';
import { FpModelSelector } from '@/components/fp-dashboard/FpModelSelector';
import { FpFallbackAlert } from '@/components/fp-dashboard/FpFallbackAlert';
import { ScheduleCronModal } from '@/components/cron-jobs/ScheduleCronModal';
import { CronJobsList } from '@/components/cron-jobs/CronJobsList';
import { loadCronJobs } from '@/lib/cron-jobs-service';

const PM_PALETTE = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];

const PRESET_PROMPTS = [
  {
    label: '🧑‍💼 Projects by PM',
    query: 'Show projects grouped by Project Manager',
    description: 'Distribution and count of active projects assigned to each Project Manager',
  },
  {
    label: '📊 PM Workload Graph',
    query: 'graph grouping project by PMs',
    description: 'Visual workload comparison and distribution across Project Managers',
  },
  {
    label: '🚦 Project RAG Health',
    query: 'Show project RAG health breakdown across all portfolios',
    description: 'Executive overview of Green, Amber, and Red project health distributions',
  },
  {
    label: '💰 Pricing Model Breakdown',
    query: 'Compare Fixed Bid vs T&M projects distribution',
    description: 'Contract distribution and portfolio value split between Fixed Bid and T&M',
  },
  {
    label: '⚠️ Critical Risks & Blockers',
    query: 'List open Critical and High priority risks and blockers',
    description: 'High potential risks and unresolved critical issues across projects',
  },
  {
    label: '💵 Billing & Financial Valuation',
    query: 'Show portfolio revenue and project valuation breakdown',
    description: 'Total pipeline value, monthly billing run-rate, and top billable projects',
  },
  {
    label: '👥 Resource Allocation & Bench',
    query: 'Show team roles, headcount, and resource availability',
    description: 'Headcount by engineering role, utilization, and bench availability',
  },
  {
    label: '📋 All Active Projects',
    query: 'Overview of all active projects in the portfolio',
    description: 'Complete directory of active projects with managers, pricing, and health',
  },
];

export default function FpDashboardPage() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<FpQueryResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'chart' | 'table'>('split');
  const [pmChartMode, setPmChartMode] = useState<'total' | 'health_stacked' | 'donut'>('total');
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
  const [tableFilter, setTableFilter] = useState<string>('');
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [, startTransition] = useTransition();

  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.5-flash');
  const [dataLoaded, setDataLoaded] = useState<boolean>(false);
  const [dbData, setDbData] = useState<{ portfolios: any[]; projects: any[]; employees: any[] }>({
    portfolios: [],
    projects: [],
    employees: [],
  });

  const [dashboardTab, setDashboardTab] = useState<'analytics' | 'cron-jobs'>('analytics');
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [cronJobsCount, setCronJobsCount] = useState<number>(0);

  const loadCronJobsCount = useCallback(async () => {
    try {
      const list = await loadCronJobs({ scope: 'portfolio' });
      setCronJobsCount(list.length);
    } catch {}
  }, []);

  useEffect(() => {
    loadCronJobsCount();
  }, [loadCronJobsCount]);

  // Load portfolios, projects, and employees on mount for authenticated client
  useEffect(() => {
    async function loadData() {
      if (!db) return;
      try {
        const [portSnap, projSnap, empSnap] = await Promise.all([
          getDocs(collection(db, 'portfolios')),
          getDocs(collection(db, 'projects')),
          getDocs(collection(db, 'employees')),
        ]);
        const portList: Portfolio[] = [];
        portSnap.docs.forEach((d: any) => {
          const data = d.data();
          if (!data.isDeleted) portList.push({ id: d.id, ...data });
        });
        setPortfolios(portList);

        const projList: any[] = [];
        projSnap.docs.forEach((d: any) => {
          const data = d.data();
          if (!data.isDeleted && !data.isArchived) projList.push({ id: d.id, ...data });
        });

        const empList: any[] = [];
        empSnap.docs.forEach((d: any) => {
          const data = d.data();
          if (!data.isDeleted) empList.push({ id: d.id, ...data });
        });

        const snapshot = {
          portfolios: portList,
          projects: projList,
          employees: empList,
        };
        setDbData(snapshot);
      } catch (e) {
        console.error('Failed to fetch initial portfolio data:', e);
      } finally {
        setDataLoaded(true);
      }
    }
    loadData();
  }, []);

  const handleRunQuery = useCallback(async (
    queryToRun: string,
    portfolioId = selectedPortfolioId,
    modelToUse = selectedModel
  ) => {
    const q = queryToRun.trim();
    if (!q) return;

    setIsLoading(true);
    setErrorMsg(null);
    setSearchQuery(q);

    try {
      const res = await fetch('/api/fp-analytics/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          scope: 'portfolio',
          portfolioId,
          portfolioDataSnapshot: dbData.projects.length > 0 ? dbData : undefined,
          modelId: modelToUse,
        }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // Non-JSON response
      }

      if (!res.ok || !data) {
        throw new Error(data?.errorMessage || `Analytics API returned status ${res.status}`);
      }
      if (!data.success && data.errorMessage) {
        throw new Error(data.errorMessage);
      }

      setResponse(data);
      if (data.table?.defaultSortKey) {
        setSortKey(data.table.defaultSortKey);
        setSortDir(data.table.defaultSortDir || 'asc');
      }
    } catch (err: any) {
      console.warn('AI Analytics API error, falling back to local heuristic engine:', err);
      try {
        const fallbackData = await executeFpQuery(q, portfolioId, dbData.projects.length > 0 ? dbData : undefined);
        fallbackData.isFallback = true;
        fallbackData.failedModel = modelToUse;

        const rawMsg = String(err?.message || '');
        const msg = rawMsg.toLowerCase();

        if (
          msg.includes('503') ||
          msg.includes('unavailable') ||
          msg.includes('no capacity') ||
          msg.includes('capacity') ||
          msg.includes('overloaded') ||
          msg.includes('high demand')
        ) {
          fallbackData.errorCategory = 'high_demand';
          fallbackData.fallbackTitle = msg.includes('capacity')
            ? 'AI Service No Capacity (HTTP 503)'
            : 'AI Service High Demand (HTTP 503)';
          fallbackData.fallbackReason =
            rawMsg.length > 0 && (rawMsg.includes('capacity') || rawMsg.includes('demand') || rawMsg.includes('503'))
              ? `${rawMsg}. Google AI servers are temporarily experiencing high load. Switch to another model above.`
              : `Model "${modelToUse}" is experiencing high server demand or capacity constraints. Switch to another model or retry.`;
        } else if (msg.includes('429') || msg.includes('quota') || msg.includes('resource_exhausted')) {
          fallbackData.errorCategory = 'quota_exceeded';
          fallbackData.fallbackTitle = 'AI Quota Exceeded (HTTP 429)';
          fallbackData.fallbackReason = `Daily request quota for "${modelToUse}" has been reached on your Google AI key (Resource Exhausted 429). Switch to another model using the selector above.`;
        } else {
          fallbackData.errorCategory = 'other';
          fallbackData.fallbackTitle = 'AI Service Notice';
          fallbackData.fallbackReason = rawMsg || `AI service unavailable for model "${modelToUse}". Operating on local heuristic engine.`;
        }

        fallbackData.audit = {
          ...fallbackData.audit,
          provider: `Offline / Local Heuristic Engine (${fallbackData.fallbackTitle})`,
          confidence: 'Heuristic pattern match (Connect to AI for deep semantic reasoning)',
        };
        setResponse(fallbackData);
        if (fallbackData.table?.defaultSortKey) {
          setSortKey(fallbackData.table.defaultSortKey);
          setSortDir(fallbackData.table.defaultSortDir || 'asc');
        }
      } catch (clientErr: any) {
        console.error('FP Dashboard fallback query error:', clientErr);
        setErrorMsg(clientErr.message || 'Failed to retrieve data from database.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedPortfolioId, dbData, selectedModel]);

  // Do not run any query by default on mount - wait for user search or preset click

  const handleCopySummary = () => {
    if (!response || !response.executiveSummary) return;
    const text = [
      `PORTFOLIO PROMPTBOARD: ${response.title}`,
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
    a.download = `FP_Dashboard_${response.intent}_${new Date().toISOString().slice(0, 10)}.csv`;
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
    if (key === 'health') {
      const color =
        val === 'Green'
          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
          : val === 'Amber'
            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
            : val === 'Red'
              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              : 'bg-muted text-muted-foreground';
      return (
        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border', color)}>
          <span className={cn('h-1.5 w-1.5 rounded-full', val === 'Green' ? 'bg-emerald-400' : val === 'Amber' ? 'bg-amber-400' : 'bg-rose-400')} />
          {val}
        </span>
      );
    }

    if (key === 'pricingModel') {
      const color = val === 'Fixed Bid' ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' : 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      return <Badge variant="outline" className={cn('font-medium text-xs', color)}>{val}</Badge>;
    }

    if (key === 'type' || key === 'impact') {
      const isHigh = String(val).toLowerCase().includes('high') || String(val).toLowerCase().includes('critical') || String(val).toLowerCase().includes('issue');
      return (
        <Badge variant="outline" className={cn('font-semibold text-xs', isHigh ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' : 'bg-amber-500/15 text-amber-300 border-amber-500/30')}>
          {val}
        </Badge>
      );
    }

    if (key === 'projectManager') {
      if (!val || val === 'Unassigned') {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Unassigned
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/25 shadow-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          {val}
        </span>
      );
    }

    return <Badge variant="outline">{String(val)}</Badge>;
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
                  Portfolio PromptBoard
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium border border-primary/30">
                    Executive Intelligence
                  </span>
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Real-time, zero-hallucination portfolio analytics derived directly from your live database.
                </p>
              </div>
            </div>
          </div>

          {/* Controls: Model Selector & Portfolio Scope Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">AI Model:</span>
              <FpModelSelector
                selectedModel={selectedModel}
                onModelChange={(newModel) => {
                  setSelectedModel(newModel);
                  if (response && searchQuery.trim()) {
                    handleRunQuery(searchQuery, selectedPortfolioId, newModel);
                  }
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Portfolio Scope:</span>
              <Select
                value={selectedPortfolioId}
                onValueChange={(val) => {
                  setSelectedPortfolioId(val);
                  if (response && searchQuery.trim()) {
                    handleRunQuery(searchQuery, val);
                  }
                }}
              >
                <SelectTrigger className="w-[180px] h-8 bg-card border-border text-xs font-medium">
                  <SelectValue placeholder="Select Scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🌐 All Portfolios</SelectItem>
                  {portfolios.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      📁 {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Primary Dashboard Tabs: Analytics vs Scheduled Cron Jobs */}
        <div className="flex items-center gap-2 border-b border-border pb-1">
          <button
            type="button"
            onClick={() => setDashboardTab('analytics')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer',
              dashboardTab === 'analytics'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Sparkles className="h-4 w-4" />
            Analytics & Reports
          </button>
          <button
            type="button"
            onClick={() => setDashboardTab('cron-jobs')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 transition-all cursor-pointer',
              dashboardTab === 'cron-jobs'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Clock className="h-4 w-4" />
            Scheduled Cron Jobs
            {cronJobsCount > 0 && (
              <Badge variant="secondary" className="text-[11px] px-1.5 py-0 h-4 rounded-full font-mono bg-primary/15 text-primary">
                {cronJobsCount}
              </Badge>
            )}
          </button>
        </div>

        {dashboardTab === 'cron-jobs' ? (
          <CronJobsList
            scope="portfolio"
            portfolioId={selectedPortfolioId}
            onJobChange={loadCronJobsCount}
          />
        ) : (
          <>
            {/* Hero AI Search Bar */}
        <div className="relative">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRunQuery(searchQuery);
            }}
            className="flex flex-col sm:flex-row gap-2 relative"
          >
            <div className="relative flex-1">
              <div className="absolute left-4 top-[17px] text-primary pointer-events-none">
                <Search className="h-5 w-5" />
              </div>
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ask Portfolio PromptBoard (e.g. 'Show project health status', 'Compare Fixed Bid vs T&M', 'What are our top risks?')..."
                className="h-14 pl-12 pr-12 rounded-xl text-base bg-card/70 border-border/80 shadow-md focus-visible:ring-2 focus-visible:ring-primary/50 transition-all placeholder:text-muted-foreground/70"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-[17px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            {response && (
              <Button
                type="button"
                onClick={() => {
                  setResponse(null);
                  setSearchQuery('');
                }}
                variant="outline"
                className="h-14 px-5 rounded-xl gap-2 shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10 shadow-sm cursor-pointer"
              >
                <XCircle className="h-5 w-5" />
                Clear Output
              </Button>
            )}
            <Button
              type="submit"
              disabled={isLoading || !searchQuery.trim()}
              className="h-14 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md flex items-center gap-2 shrink-0 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Querying...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Ask AI
                </>
              )}
            </Button>
          </form>

          {/* Quick Preset Chips */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-primary" /> Suggestions:
            </span>
            {PRESET_PROMPTS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleRunQuery(preset.query)}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer font-medium',
                  searchQuery === preset.query
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-card/50 text-foreground/80 border-border/70 hover:bg-card hover:border-primary/50'
                )}
                title={preset.description}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold">Query Error</div>
              <div className="mt-0.5 text-destructive/90">{errorMsg}</div>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && (
          <Card className="border border-border/60 bg-card/40 backdrop-blur-sm p-8 text-center space-y-4">
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/10 text-primary animate-pulse">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Querying Live Database...</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Extracting real records, computing mathematical aggregations, and rendering executive visualizations.
              </p>
            </div>
          </Card>
        )}

        {/* Results View */}
        {!isLoading && response && (
          <div className="space-y-6">
            {/* Rich Actionable Fallback Alert */}
            <FpFallbackAlert
              response={response}
              selectedModel={selectedModel}
              onModelChange={(newModel) => setSelectedModel(newModel)}
              onRetry={(newModel) =>
                handleRunQuery(searchQuery || response.query, selectedPortfolioId, newModel || selectedModel)
              }
              isLoading={isLoading}
            />

            {/* Live Database Audit Stamp */}
            <div className={cn(
              "flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-lg border text-xs",
              response.isFallback
                ? "border-amber-500/20 bg-amber-500/5 text-amber-300"
                : "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
            )}>
              <div className="flex items-center gap-2 font-medium">
                <ShieldCheck className={cn("h-4 w-4", response.isFallback ? "text-amber-400" : "text-emerald-400")} />
                <span>
                  <strong>Live Database Verified:</strong> {response.audit.recordsAnalyzed} records analyzed from{' '}
                  <code className={cn("text-[11px] px-1 py-0.5 rounded border", response.isFallback ? "bg-amber-500/10 border-amber-500/20" : "bg-emerald-500/10 border-emerald-500/20")}>
                    {response.audit.sourceCollection}
                  </code>{' '}
                  under <strong>{response.audit.portfolioScope}</strong>.
                </span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground text-[11px]">
                <span className={cn("font-semibold", response.isFallback ? "text-amber-400" : "text-emerald-400")}>
                  {response.audit.provider || (response.isFallback ? 'Local Heuristic Engine' : 'WayFinder AI Analytics')}
                </span>
                <span>•</span>
                <span>{new Date(response.audit.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>
            </div>

            {/* Executive Summary Takeaways */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-md shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" />
                    Executive Takeaways: {response.title}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Synthesized findings strictly based on database metrics
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopySummary}
                    className="h-8 px-3 text-xs gap-1.5 border-border"
                  >
                    {copiedSummary ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy Summary
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-1.5 text-sm text-foreground/90">
                  {response.executiveSummary.map((bullet, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-primary font-bold mt-0.5">•</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* KPI Cards Grid */}
            {response.kpis && response.kpis.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {response.kpis.map((kpi: FpKpiCard) => {
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
                      <CardContent className="p-4 space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">{kpi.label}</div>
                        <div className={cn('text-2xl font-bold tracking-tight', textCol)}>
                          {kpi.value}
                        </div>
                        {kpi.subtext && <div className="text-[11px] text-muted-foreground">{kpi.subtext}</div>}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* View Switcher & Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                <TabsList className="bg-card border border-border">
                  <TabsTrigger value="split" className="text-xs">
                    Split View (Graph & Table)
                  </TabsTrigger>
                  <TabsTrigger value="chart" className="text-xs">
                    Graph View
                  </TabsTrigger>
                  <TabsTrigger value="table" className="text-xs">
                    Table View
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowScheduleModal(true)}
                  className="h-8 px-3 text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10 shadow-sm"
                >
                  <Clock className="h-3.5 w-3.5" />
                  Convert to Cron Job
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCsv}
                  disabled={!response.table || response.table.rows.length === 0}
                  className="h-8 px-3 text-xs gap-1.5 border-border shadow-sm"
                >
                  <Download className="h-3.5 w-3.5 text-primary" />
                  Export to CSV
                </Button>
              </div>
            </div>

            {/* Split View or Graph Only: Chart Section */}
            {(viewMode === 'split' || viewMode === 'chart') && response.chart && response.chart.type !== 'none' && (
              <Card className="border-border/60 bg-card/60 backdrop-blur-md shadow-sm">
                <CardHeader className="pb-2 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      {response.intent === 'projects_by_pm' ? (
                        <Users className="h-4 w-4 text-primary" />
                      ) : (
                        <BarChart3 className="h-4 w-4 text-primary" />
                      )}
                      {response.chart.title}
                    </CardTitle>
                    {response.chart.description && (
                      <CardDescription className="text-xs">{response.chart.description}</CardDescription>
                    )}
                  </div>

                  {/* Multi-view switcher for Projects by PM */}
                  {response.intent === 'projects_by_pm' && (
                    <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border shrink-0">
                      <Button
                        type="button"
                        variant={pmChartMode === 'total' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setPmChartMode('total')}
                        className={cn(
                          'h-7 px-2.5 text-xs font-medium',
                          pmChartMode === 'total' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <BarChart3 className="h-3.5 w-3.5 mr-1" />
                        Total Workload
                      </Button>
                      <Button
                        type="button"
                        variant={pmChartMode === 'health_stacked' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setPmChartMode('health_stacked')}
                        className={cn(
                          'h-7 px-2.5 text-xs font-medium',
                          pmChartMode === 'health_stacked' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <Layers className="h-3.5 w-3.5 mr-1" />
                        Health Breakdown
                      </Button>
                      <Button
                        type="button"
                        variant={pmChartMode === 'donut' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setPmChartMode('donut')}
                        className={cn(
                          'h-7 px-2.5 text-xs font-medium',
                          pmChartMode === 'donut' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <PieIcon className="h-3.5 w-3.5 mr-1" />
                        Workload Share
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="w-full h-[330px] flex items-center justify-center">
                    {/* Donut / Pie View */}
                    {response.chart.type === 'pie' || (response.intent === 'projects_by_pm' && pmChartMode === 'donut') ? (
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
                            itemStyle={{
                              color: 'hsl(var(--popover-foreground))',
                            }}
                            labelStyle={{
                              color: 'hsl(var(--popover-foreground))',
                              fontWeight: 600,
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                          <Pie
                            data={response.chart.data}
                            dataKey={response.chart.dataKey}
                            nameKey={response.intent === 'projects_by_pm' ? 'fullName' : response.chart.categoryKey}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={110}
                            paddingAngle={3}
                            label={({ name, percent }: any) =>
                              `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                            }
                          >
                            {response.chart.data.map((entry: any, index: number) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  entry.fullName === 'Unassigned'
                                    ? '#64748b'
                                    : entry.fill ||
                                    PM_PALETTE[index % PM_PALETTE.length]
                                }
                              />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    ) : response.intent === 'projects_by_pm' && pmChartMode === 'health_stacked' ? (
                      /* Stacked Health View per PM */
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={response.chart.data}
                          margin={{ top: 15, right: 30, left: 10, bottom: 45 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis
                            dataKey={response.chart.categoryKey}
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                            interval={0}
                            angle={-20}
                            textAnchor="end"
                            height={50}
                          />
                          <YAxis
                            allowDecimals={false}
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <Tooltip
                            cursor={{ fill: 'hsl(var(--muted) / 0.25)' }}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--popover))',
                              borderColor: 'hsl(var(--border))',
                              borderRadius: '8px',
                              color: 'hsl(var(--popover-foreground))',
                              fontSize: '12px',
                            }}
                            itemStyle={{
                              color: 'hsl(var(--popover-foreground))',
                            }}
                            labelStyle={{
                              color: 'hsl(var(--popover-foreground))',
                              fontWeight: 600,
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                          <Bar dataKey="green" name="Green (Healthy)" stackId="pmHealth" fill="#22c55e" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="amber" name="Amber (Needs Attention)" stackId="pmHealth" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="red" name="Red (Critical)" stackId="pmHealth" fill="#ef4444" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      /* Total Workload / Regular Bar Chart */
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={response.chart.data}
                          margin={{ top: 15, right: 30, left: 10, bottom: 45 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                          <XAxis
                            dataKey={response.chart.categoryKey}
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                            interval={0}
                            angle={-20}
                            textAnchor="end"
                            height={50}
                          />
                          <YAxis
                            allowDecimals={false}
                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <Tooltip
                            cursor={{ fill: 'hsl(var(--muted) / 0.25)' }}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--popover))',
                              borderColor: 'hsl(var(--border))',
                              borderRadius: '8px',
                              color: 'hsl(var(--popover-foreground))',
                              fontSize: '12px',
                            }}
                            itemStyle={{
                              color: 'hsl(var(--popover-foreground))',
                            }}
                            labelStyle={{
                              color: 'hsl(var(--popover-foreground))',
                              fontWeight: 600,
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: '12px' }} />
                          <Bar
                            dataKey={response.chart.dataKey}
                            name={
                              response.intent === 'projects_by_pm'
                                ? 'Projects Assigned'
                                : response.chart.dataKey === 'count'
                                  ? 'Projects'
                                  : response.chart.dataKey === 'value'
                                    ? 'Total Value ($)'
                                    : response.chart.dataKey
                            }
                            radius={[6, 6, 0, 0]}
                          >
                            {response.chart.data.map((entry: any, index: number) => (
                              <Cell
                                key={`cell-bar-${index}`}
                                fill={
                                  entry.fullName === 'Unassigned'
                                    ? '#64748b'
                                    : entry.fill ||
                                    PM_PALETTE[index % PM_PALETTE.length]
                                }
                              />
                            ))}
                          </Bar>
                          {response.chart.secondaryKey && (
                            <Bar
                              dataKey={response.chart.secondaryKey}
                              name={response.chart.secondaryKey}
                              fill={response.chart.colors?.[1] || '#ef4444'}
                              radius={[4, 4, 0, 0]}
                            />
                          )}
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Split View or Table Only: Sortable Data Table */}
            {(viewMode === 'split' || viewMode === 'table') && response.table && (
              <Card className="border-border/60 bg-card/60 backdrop-blur-md shadow-sm">
                <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-semibold">Data Table</CardTitle>
                    <CardDescription className="text-xs">
                      Showing {displayRows.length} of {response.table.rows.length} records matching current view
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="Filter table rows..."
                      value={tableFilter}
                      onChange={(e) => setTableFilter(e.target.value)}
                      className="h-8 text-xs w-48 bg-card border-border"
                    />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="rounded-lg border border-border/80 overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          {response.table.columns.map((col) => (
                            <TableHead
                              key={col.key}
                              onClick={() => handleSort(col.key)}
                              className="text-xs font-semibold cursor-pointer hover:text-foreground select-none whitespace-nowrap"
                            >
                              <div className="flex items-center gap-1.5">
                                {col.label}
                                <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={response.table.columns.length} className="text-center py-8 text-muted-foreground text-sm">
                              No records match your filter.
                            </TableCell>
                          </TableRow>
                        ) : (
                          displayRows.map((row, idx) => (
                            <TableRow key={idx} className="hover:bg-muted/30 transition-colors">
                              {response.table.columns.map((col) => {
                                const val = row[col.key];

                                if (col.type === 'link' || col.key === 'id') {
                                  return (
                                    <TableCell key={col.key} className="text-xs font-medium text-primary">
                                      {row.link ? (
                                        <Link
                                          href={row.link}
                                          className="inline-flex items-center gap-1 hover:underline font-mono text-primary"
                                        >
                                          {String(val || '')}
                                          <ExternalLink className="h-3 w-3 opacity-60" />
                                        </Link>
                                      ) : (
                                        <span className="font-mono">{String(val || '')}</span>
                                      )}
                                    </TableCell>
                                  );
                                }

                                if (col.type === 'badge' || col.key === 'projectManager' || col.key === 'health' || col.key === 'pricingModel' || col.key === 'impact' || col.key === 'type' || col.key === 'role') {
                                  return (
                                    <TableCell key={col.key} className="text-xs">
                                      {renderBadge(col.key, val)}
                                    </TableCell>
                                  );
                                }

                                if (col.type === 'currency') {
                                  const num = Number(val) || 0;
                                  return (
                                    <TableCell key={col.key} className="text-xs font-semibold">
                                      ${num.toLocaleString()}
                                    </TableCell>
                                  );
                                }

                                return (
                                  <TableCell key={col.key} className="text-xs text-foreground/90 max-w-[280px] truncate" title={String(val || '')}>
                                    {val !== undefined && val !== null ? String(val) : 'ΓÇö'}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Follow-up Question Suggestions */}
            {response.followUpSuggestions && response.followUpSuggestions.length > 0 && (
              <div className="p-4 rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm space-y-2">
                <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Recommended Follow-up Inquiries for Leadership:
                </div>
                <div className="flex flex-wrap gap-2">
                  {response.followUpSuggestions.map((sug, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleRunQuery(sug)}
                      className="text-xs px-3 py-1 rounded-md bg-muted/60 hover:bg-primary/15 hover:text-primary border border-border text-foreground transition-colors cursor-pointer text-left"
                    >
                      {sug} ΓåÆ
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
          </>
        )}

        {/* Convert to Cron Job Modal */}
        {response && (
          <ScheduleCronModal
            open={showScheduleModal}
            onOpenChange={setShowScheduleModal}
            initialQuery={response.query || searchQuery}
            initialTitle={response.title}
            scope="portfolio"
            portfolioId={selectedPortfolioId}
            modelId={selectedModel}
            onJobCreated={() => {
              loadCronJobsCount();
              setDashboardTab('cron-jobs');
            }}
          />
        )}
      </div>
    </div>
  );
}
