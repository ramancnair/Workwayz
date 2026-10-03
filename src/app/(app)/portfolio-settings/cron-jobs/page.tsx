'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, AlertTriangle, ShieldCheck, Activity, CheckCircle2, Play, Layers } from 'lucide-react';
import { CronJobsList } from '@/components/cron-jobs/CronJobsList';
import { loadCronJobs } from '@/lib/cron-jobs-service';
import type { FpCronJob } from '@/types/cron-jobs';

export default function AdminCronJobsPage() {
  const [jobs, setJobs] = useState<FpCronJob[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('projectflow_user') || localStorage.getItem('currentUser');
      if (stored) {
        const u = JSON.parse(stored);
        setIsAdmin(u.accessLevel === 'Administrator' || u.role === 'Administrator' || u.accessLevel === 'Super Admin' || u.role === 'Super Admin');
      }
    } catch {}
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const list = await loadCronJobs();
      setJobs(list);
    } catch (err) {
      console.error('Failed to load stats for admin cron jobs:', err);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const activeCount = jobs.filter((j) => j.status === 'active').length;
  const portfolioCount = jobs.filter((j) => j.scope === 'portfolio').length;
  const projectCount = jobs.filter((j) => j.scope === 'project').length;
  const totalRuns = jobs.reduce((acc, j) => acc + (j.runCount || 0), 0);

  return (
    <div className="flex-1 overflow-y-auto bg-background text-foreground min-h-screen">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        <PageHeader
          title="Cron Jobs Management"
          description="Centralized administration for all automated report queries. Admins can inspect execution telemetry, trigger runs on-demand, and permanently delete unwanted scheduled jobs."
        />

        {/* Admin KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-card/60 backdrop-blur-sm border-border shadow-xs">
            <CardContent className="p-4 space-y-1">
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" /> Total Jobs
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground">{jobs.length}</div>
              <div className="text-[11px] text-muted-foreground">Registered in database</div>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur-sm border-emerald-500/30 shadow-xs">
            <CardContent className="p-4 space-y-1">
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Active Schedulers
              </div>
              <div className="text-2xl font-bold tracking-tight text-emerald-400">{activeCount}</div>
              <div className="text-[11px] text-muted-foreground">Running on schedule</div>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur-sm border-border shadow-xs">
            <CardContent className="p-4 space-y-1">
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" /> Scope Split
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {portfolioCount} <span className="text-sm font-normal text-muted-foreground">Port /</span> {projectCount}{' '}
                <span className="text-sm font-normal text-muted-foreground">Proj</span>
              </div>
              <div className="text-[11px] text-muted-foreground">Portfolio vs Project level</div>
            </CardContent>
          </Card>

          <Card className="bg-card/60 backdrop-blur-sm border-border shadow-xs">
            <CardContent className="p-4 space-y-1">
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-primary" /> Total Executions
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground">{totalRuns}</div>
              <div className="text-[11px] text-muted-foreground">Dispatched report runs</div>
            </CardContent>
          </Card>
        </div>

        {/* Main List */}
        <Card className="border-border bg-card/40 backdrop-blur-md shadow-sm">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Organization-Wide Cron Jobs
                </CardTitle>
                <CardDescription className="text-xs">
                  Review all scheduled queries created by team members across the organization. You can delete any unwanted or redundant jobs.
                </CardDescription>
              </div>
              {isAdmin && (
                <Badge className="bg-primary/20 text-primary border-primary/30 text-xs px-2.5 py-0.5">
                  Admin Authority Active
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <CronJobsList showAdminControls={true} onJobChange={fetchStats} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
