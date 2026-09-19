'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Sparkles, BarChart3, TrendingUp, CheckCircle2, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmbeddedReportChart } from './EmbeddedReportChart';
import type { FpChartSpec, FpKpiCard } from '@/types/fp-dashboard';
import { cn } from '@/lib/utils';

interface MessageReportRendererProps {
  body: string;
}

export function MessageReportRenderer({ body }: MessageReportRendererProps) {
  const parsed = useMemo(() => {
    let cleanText = body || '';
    let extractedChart: FpChartSpec | null = null;
    let extractedKpis: FpKpiCard[] | null = null;

    // 1. Check for embedded chart JSON block <!--fp-chart-start-->...<!--fp-chart-end-->
    const chartMatch = cleanText.match(/<!--fp-chart-start-->([\s\S]*?)<!--fp-chart-end-->/);
    if (chartMatch && chartMatch[1]) {
      try {
        extractedChart = JSON.parse(chartMatch[1].trim());
        cleanText = cleanText.replace(chartMatch[0], '').trim();
      } catch (e) {
        console.warn('Failed to parse embedded chart spec:', e);
      }
    }

    // 2. Check for embedded KPIs JSON block <!--fp-kpis-start-->...<!--fp-kpis-end-->
    const kpisMatch = cleanText.match(/<!--fp-kpis-start-->([\s\S]*?)<!--fp-kpis-end-->/);
    if (kpisMatch && kpisMatch[1]) {
      try {
        extractedKpis = JSON.parse(kpisMatch[1].trim());
        cleanText = cleanText.replace(kpisMatch[0], '').trim();
      } catch (e) {
        console.warn('Failed to parse embedded KPIs spec:', e);
      }
    }

    // 3. Fallback parser for existing messages containing defect or category breakdown
    if (!extractedChart) {
      // Check for defect breakdown pattern:
      // #### 📊 Defects by Severity & Resolution Status
      // * **Critical:** 7 (Closed: 1)
      const defectPattern = /####\s+📊\s+(?:Defects by Severity|Data Breakdown)[\s\S]*?(?=(?:---|####|$))/i;
      const match = cleanText.match(defectPattern);
      if (match) {
        const lines = match[0].split('\n');
        const chartData: any[] = [];
        for (const line of lines) {
          const m = line.match(/\*\s+\*\*([^*]+):\*\*\s+(\d+)(?:\s+\(Closed:\s*(\d+)\))?/i);
          if (m) {
            const name = m[1].trim();
            const total = parseInt(m[2], 10) || 0;
            const closed = m[3] !== undefined ? parseInt(m[3], 10) || 0 : 0;
            const open = Math.max(0, total - closed);
            chartData.push({
              name,
              Total: total,
              Open: open,
              Closed: closed,
            });
          }
        }

        if (chartData.length > 0) {
          extractedChart = {
            type: 'bar',
            title: 'Defects by Severity & Resolution Status',
            description: 'Open vs Resolved defects by severity classification',
            categoryKey: 'name',
            dataKey: 'Open',
            secondaryKey: 'Closed',
            data: chartData,
            colors: ['#ef4444', '#10b981'],
          };
        }
      }
    }

    // 4. Fallback parser for Key Metrics text list if extractedKpis is null
    if (!extractedKpis) {
      const kpisPattern = /####\s+📈\s+Key Metrics\n([\s\S]*?)(?=(?:####|---|<!--|$))/i;
      const kMatch = cleanText.match(kpisPattern);
      if (kMatch && kMatch[1]) {
        const kpiLines = kMatch[1].split('\n').filter((l) => l.trim().startsWith('*'));
        if (kpiLines.length > 0) {
          const derived: FpKpiCard[] = [];
          kpiLines.slice(0, 4).forEach((line, idx) => {
            const m = line.match(/\*\s+\*\*([^*]+):\*\*\s+([^(]+)(?:\(([^)]+)\))?/);
            if (m) {
              const label = m[1].trim();
              const value = m[2].trim();
              const subtext = m[3]?.trim();
              const isPositive = /0 open|0 blocker|resolved|good|optimal/i.test(`${value} ${subtext}`);
              const isNegative = /critical|blocker|urgent|requiring review|danger/i.test(`${label} ${subtext}`);
              const isWarning = /attention|pending|amber/i.test(`${subtext}`);

              derived.push({
                id: `derived-kpi-${idx}`,
                label,
                value,
                subtext,
                status: isPositive ? 'positive' : isNegative ? 'negative' : isWarning ? 'warning' : 'neutral',
              });
            }
          });
          if (derived.length > 0) {
            extractedKpis = derived;
          }
        }
      }
    }

    const isFlowPilotReport =
      cleanText.includes('Scheduled Automated Report') ||
      cleanText.includes('Executive Takeaways') ||
      cleanText.includes('Original Query');

    return {
      cleanText,
      extractedChart,
      extractedKpis,
      isFlowPilotReport,
    };
  }, [body]);

  if (!parsed.isFlowPilotReport) {
    // Normal plain-text or standard message
    return (
      <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap font-sans break-words selection:bg-primary/20">
        {body}
      </div>
    );
  }

  // Parse structured report sections
  const { cleanText, extractedChart, extractedKpis } = parsed;

  // Extract executive takeaways
  const takeawaysMatch = cleanText.match(/####\s+📌\s+Executive Takeaways\n([\s\S]*?)(?=(?:####|---|<!--|$))/i);
  const takeawaysBullets = takeawaysMatch
    ? takeawaysMatch[1]
        .split('\n')
        .map((l) => l.trim().replace(/^[•\*\-]\s*/, ''))
        .filter((l) => l.length > 0)
    : [];

  // Extract header metadata (Report Title, Trigger origin, Scope, Original query)
  const titleMatch = cleanText.match(/###\s+📊\s+Scheduled Automated Report:\s*(.+)/i);
  const reportTitle = titleMatch ? titleMatch[1].trim() : 'Scheduled Automated Report';

  const triggerMatch = cleanText.match(/\*Triggered via\s+\*\*([^*]+)\*\*\s+on\s+([^,]+,\s+\d{4})\s+at\s+([^*]+)\*/i);
  const triggerOrigin = triggerMatch ? triggerMatch[1] : '';
  const triggerTime = triggerMatch ? `${triggerMatch[2]} at ${triggerMatch[3]}` : '';

  const queryMatch = cleanText.match(/\*\*Original Query:\*\*\s+\*?"([^"]+)"\*?/i);
  const originalQuery = queryMatch ? queryMatch[1] : '';

  const scopeMatch = cleanText.match(/\*\*Scope:\*\*\s+([^\n]+)/i);
  const scopeText = scopeMatch ? scopeMatch[1].trim() : '';

  // Extract dashboard link
  const linkMatch = cleanText.match(/\[FlowPilot Dashboard\]\(([^)]+)\)/i);
  const dashboardLink = linkMatch ? linkMatch[1] : null;

  // Extract records analyzed
  const recordsMatch = cleanText.match(/\*Records analyzed:\s*([^|*]+)/i);
  const recordsAnalyzed = recordsMatch ? recordsMatch[1].trim() : null;

  return (
    <div className="space-y-6">
      {/* 1. Report Header Banner */}
      <div className="rounded-xl border border-primary/25 bg-gradient-to-r from-primary/10 via-background to-primary/5 p-4 md:p-5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/20 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold tracking-wider uppercase text-primary">
              FlowPilot Automated Query Report
            </span>
          </div>

          {triggerOrigin && (
            <Badge variant="secondary" className="text-[11px] font-medium px-2 py-0.5 bg-primary/15 text-primary border-0">
              Triggered via {triggerOrigin}
            </Badge>
          )}
        </div>

        <div>
          <h3 className="text-lg md:text-xl font-bold text-foreground tracking-tight">
            {reportTitle}
          </h3>
          {triggerTime && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Executed on {triggerTime}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
          {originalQuery && (
            <div className="p-2.5 rounded-lg bg-background/80 border border-border/60">
              <span className="text-muted-foreground font-medium block text-[11px] uppercase tracking-wider mb-0.5">
                Query Executed
              </span>
              <span className="font-semibold text-foreground italic">
                &ldquo;{originalQuery}&rdquo;
              </span>
            </div>
          )}

          {scopeText && (
            <div className="p-2.5 rounded-lg bg-background/80 border border-border/60">
              <span className="text-muted-foreground font-medium block text-[11px] uppercase tracking-wider mb-0.5">
                Target Scope
              </span>
              <span className="font-semibold text-foreground">
                {scopeText}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Executive Takeaways Card */}
      {takeawaysBullets.length > 0 && (
        <Card className="bg-card/70 border-border/80 shadow-sm">
          <CardHeader className="p-4 pb-2 border-b border-border/50">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <span className="text-primary">📌</span>
              <span>Executive Takeaways</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            <ul className="space-y-2">
              {takeawaysBullets.map((bullet, idx) => (
                <li key={idx} className="text-sm flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground/90 leading-relaxed">{bullet}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 3. High-level KPI Cards */}
      {extractedKpis && extractedKpis.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Key Metrics & Highlights
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {extractedKpis.map((kpi, idx) => {
              const borderCol =
                kpi.status === 'positive'
                  ? 'border-emerald-500/35 bg-emerald-500/5'
                  : kpi.status === 'warning'
                  ? 'border-amber-500/35 bg-amber-500/5'
                  : kpi.status === 'negative'
                  ? 'border-rose-500/35 bg-rose-500/5'
                  : 'border-border/70 bg-card';

              const textCol =
                kpi.status === 'positive'
                  ? 'text-emerald-500 dark:text-emerald-400'
                  : kpi.status === 'warning'
                  ? 'text-amber-500 dark:text-amber-400'
                  : kpi.status === 'negative'
                  ? 'text-rose-500 dark:text-rose-400'
                  : 'text-foreground';

              return (
                <Card key={kpi.id || idx} className={cn('border shadow-sm', borderCol)}>
                  <CardHeader className="p-3 pb-1">
                    <CardDescription className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                      {kpi.label}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className={cn('text-2xl font-extrabold tracking-tight', textCol)}>
                      {kpi.value}
                    </div>
                    {kpi.subtext && (
                      <p className="text-[11px] text-muted-foreground mt-1 truncate">
                        {kpi.subtext}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. ACTUAL INTERACTIVE GRAPH / CHART */}
      {extractedChart && extractedChart.type !== 'none' && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Report Chart Visualization
            </h4>
          </div>
          <EmbeddedReportChart chart={extractedChart} />
        </div>
      )}

      {/* 5. Footer & Dashboard Navigation */}
      <div className="pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
        <div>
          {recordsAnalyzed && (
            <span>Records analyzed: <strong className="text-foreground">{recordsAnalyzed}</strong></span>
          )}
        </div>

        {dashboardLink && (
          <Link
            href={dashboardLink}
            className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline hover:text-primary/80 transition-colors"
          >
            <span>Open live charts in FlowPilot Dashboard</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}
