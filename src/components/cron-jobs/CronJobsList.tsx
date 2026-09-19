'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Clock,
  Play,
  RotateCw,
  Trash2,
  Pause,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Users,
  Sparkles,
  ExternalLink,
  Loader2,
  Search,
} from 'lucide-react';
import type { FpCronJob } from '@/types/cron-jobs';
import {
  loadCronJobs,
  deleteCronJob,
  renewCronJob,
  executeCronJob,
  updateCronJob,
} from '@/lib/cron-jobs-service';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CronJobsListProps {
  scope?: 'portfolio' | 'project';
  projectId?: string;
  portfolioId?: string;
  showAdminControls?: boolean;
  onJobChange?: () => void;
}

export function CronJobsList({
  scope,
  projectId,
  portfolioId,
  showAdminControls = false,
  onJobChange,
}: CronJobsListProps) {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<FpCronJob[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [renewingJobId, setRenewingJobId] = useState<string | null>(null);
  const [filterText, setFilterText] = useState<string>('');

  const [currentUser, setCurrentUser] = useState<{
    userId: string;
    email: string;
    isAdmin: boolean;
  }>({
    userId: '',
    email: '',
    isAdmin: false,
  });

  // Load user from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        const u = JSON.parse(stored);
        setCurrentUser({
          userId: u.empId || u.id || '',
          email: u.email || '',
          isAdmin: u.accessLevel === 'Administrator' || u.role === 'Administrator',
        });
      }
    } catch {}
  }, []);

  const refreshJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await loadCronJobs({ scope, projectId, portfolioId });
      setJobs(list);
    } catch (e) {
      console.error('Failed to load cron jobs:', e);
    } finally {
      setIsLoading(false);
    }
  }, [scope, projectId, portfolioId]);

  useEffect(() => {
    refreshJobs();
  }, [refreshJobs]);

  const handleRunNow = async (job: FpCronJob) => {
    setRunningJobId(job.id);
    try {
      const res = await executeCronJob(job.id, 'manual');
      if (res.success) {
        toast({
          title: 'Scheduled Report Run Succeeded',
          description: `Report "${job.name}" generated fresh findings and sent messages to ${job.recipients?.length || 0} recipient(s).`,
        });
        await refreshJobs();
        onJobChange?.();
      } else {
        toast({
          title: 'Execution Failed',
          description: res.error || 'Failed to execute query.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error Running Cron Job',
        description: err?.message || 'Failed to run job.',
        variant: 'destructive',
      });
    } finally {
      setRunningJobId(null);
    }
  };

  const handleRenew = async (job: FpCronJob) => {
    setRenewingJobId(job.id);
    try {
      const updated = await renewCronJob(job.id, {
        userId: currentUser.userId || currentUser.email,
        isAdmin: currentUser.isAdmin,
      });
      const newYear = updated.renewedForYear || new Date(updated.expiresAt).getFullYear();
      toast({
        title: 'Cron Job Renewed',
        description: `"${job.name}" has been successfully extended until December 31, ${newYear}.`,
      });
      await refreshJobs();
      onJobChange?.();
    } catch (err: any) {
      toast({
        title: 'Renewal Failed',
        description: err?.message || 'Failed to renew job.',
        variant: 'destructive',
      });
    } finally {
      setRenewingJobId(null);
    }
  };

  const handleTogglePause = async (job: FpCronJob) => {
    const newStatus = job.status === 'active' ? 'paused' : 'active';
    try {
      await updateCronJob(job.id, { status: newStatus });
      toast({
        title: newStatus === 'active' ? 'Cron Job Resumed' : 'Cron Job Paused',
        description: `"${job.name}" is now ${newStatus}.`,
      });
      await refreshJobs();
      onJobChange?.();
    } catch (err: any) {
      toast({
        title: 'Update Failed',
        description: err?.message || 'Failed to update job status.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (job: FpCronJob) => {
    if (!window.confirm(`Are you sure you want to delete the scheduled cron job "${job.name}"?`)) {
      return;
    }

    setDeletingJobId(job.id);
    try {
      await deleteCronJob(job.id, {
        userId: currentUser.userId || currentUser.email,
        isAdmin: currentUser.isAdmin || showAdminControls,
      });
      toast({
        title: 'Cron Job Deleted',
        description: `"${job.name}" has been removed.`,
      });
      await refreshJobs();
      onJobChange?.();
    } catch (err: any) {
      toast({
        title: 'Delete Failed',
        description: err?.message || 'Could not delete cron job.',
        variant: 'destructive',
      });
    } finally {
      setDeletingJobId(null);
    }
  };

  const filteredJobs = jobs.filter((j) => {
    if (!filterText.trim()) return true;
    const q = filterText.toLowerCase();
    return (
      j.name.toLowerCase().includes(q) ||
      j.query.toLowerCase().includes(q) ||
      j.createdBy.name.toLowerCase().includes(q) ||
      (j.projectName && j.projectName.toLowerCase().includes(q))
    );
  });

  if (isLoading) {
    return (
      <div className="p-12 text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-sm text-muted-foreground">Loading scheduled cron jobs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Filter and Count Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            {jobs.length} Scheduled Cron Job{jobs.length !== 1 ? 's' : ''}
          </span>
          {scope && (
            <Badge variant="outline" className="text-xs capitalize">
              {scope} Scope
            </Badge>
          )}
        </div>
        <div className="w-full sm:w-64">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter jobs..."
              className="w-full h-8 pl-8 pr-3 text-xs rounded-md bg-card border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredJobs.length === 0 ? (
        <Card className="border-dashed border-border bg-card/40 p-8 text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">No Cron Jobs Found</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {filterText
                ? 'No scheduled jobs match your filter.'
                : 'Run any query above and click "Convert to Cron Job" to schedule automated reports and email/inbox dispatches.'}
            </p>
          </div>
        </Card>
      ) : (
        /* Jobs List */
        <div className="grid grid-cols-1 gap-4">
          {filteredJobs.map((job) => {
            const isCreator =
              currentUser.isAdmin ||
              job.createdBy.userId === currentUser.userId ||
              job.createdBy.email.toLowerCase() === currentUser.email.toLowerCase();

            const isExpired = job.status === 'expired';
            const isProjectClosed = job.status === 'completed';
            const isPaused = job.status === 'paused';
            const isActive = job.status === 'active';

            const nextDate = job.nextRunAt ? new Date(job.nextRunAt) : null;
            const lastDate = job.lastRunAt ? new Date(job.lastRunAt) : null;
            const expiryDate = job.expiresAt ? new Date(job.expiresAt) : null;

            return (
              <Card
                key={job.id}
                className={cn(
                  'border transition-all shadow-sm',
                  isActive
                    ? 'border-border/80 bg-card/60'
                    : isExpired || isProjectClosed
                      ? 'border-muted bg-muted/20 opacity-85'
                      : 'border-amber-500/30 bg-amber-500/5'
                )}
              >
                <CardContent className="p-4 sm:p-5 space-y-4">
                  {/* Row 1: Header, Status, Badges */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-base text-foreground flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          {job.name}
                        </h4>

                        {/* Status Badge */}
                        {isActive && (
                          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs">
                            Active
                          </Badge>
                        )}
                        {isPaused && (
                          <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-xs">
                            Paused
                          </Badge>
                        )}
                        {isExpired && (
                          <Badge className="bg-rose-500/15 text-rose-400 border-rose-500/30 text-xs">
                            Expired (Year End)
                          </Badge>
                        )}
                        {isProjectClosed && (
                          <Badge className="bg-muted text-muted-foreground border-border text-xs">
                            Project Closed
                          </Badge>
                        )}

                        {/* Scope Badge */}
                        <Badge variant="outline" className="text-xs">
                          {job.scope === 'portfolio' ? 'Portfolio Scope' : `Project: ${job.projectName || job.projectId}`}
                        </Badge>
                      </div>

                      {/* Query snippet */}
                      <p className="text-xs font-mono text-muted-foreground bg-muted/30 px-2 py-1 rounded border border-border/50 inline-block max-w-xl truncate">
                        &quot;{job.query}&quot;
                      </p>
                    </div>

                    {/* Schedule Recurrence Pill */}
                    <div className="shrink-0 text-left sm:text-right text-xs">
                      <div className="font-semibold text-primary flex items-center sm:justify-end gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {job.interval === 'daily'
                          ? `Daily at ${job.timeOfDay}`
                          : job.interval === 'weekly'
                            ? `Weekly at ${job.timeOfDay}`
                            : `${job.customCron || 'Custom'} at ${job.timeOfDay}`}
                      </div>
                      {nextDate && isActive && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Next Run: {nextDate.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Metadata Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-muted/20 border border-border/60 text-xs">
                    {/* Recipients */}
                    <div className="space-y-1">
                      <span className="font-medium text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3 text-primary" /> Recipients ({job.recipients?.length || 0}):
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {job.recipients?.slice(0, 3).map((r) => (
                          <span
                            key={r.id}
                            className="px-1.5 py-0.5 rounded text-[11px] bg-card border border-border truncate max-w-[140px]"
                            title={r.name}
                          >
                            {r.type === 'distro' ? `📢 ${r.name}` : r.name}
                          </span>
                        ))}
                        {job.recipients && job.recipients.length > 3 && (
                          <span className="px-1.5 py-0.5 rounded text-[11px] bg-muted border border-border text-muted-foreground">
                            +{job.recipients.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Lifecycle & Expiry */}
                    <div className="space-y-1">
                      <span className="font-medium text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-primary" /> Lifecycle:
                      </span>
                      <div className="text-foreground/90">
                        {job.scope === 'portfolio' ? (
                          <span>
                            Runs till <strong>Dec 31, {expiryDate?.getFullYear() || 'Year End'}</strong>
                            {job.renewedForYear && (
                              <span className="ml-1 text-[10px] text-emerald-400 font-semibold">
                                (Renewed for {job.renewedForYear})
                              </span>
                            )}
                          </span>
                        ) : (
                          <span>
                            Ends when project <strong>{job.projectName || job.projectId}</strong> closes
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Creator & Last Run */}
                    <div className="space-y-1">
                      <span className="font-medium text-muted-foreground">History & Creator:</span>
                      <div className="text-foreground/90 flex flex-col gap-0.5">
                        <span>Created by: <strong>{job.createdBy?.name || 'User'}</strong></span>
                        <span className="text-muted-foreground text-[11px]">
                          {lastDate
                            ? `Last ran: ${lastDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} (${job.runCount || 0} runs)`
                            : 'Not run yet'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2">
                      {/* Run Now button */}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={runningJobId === job.id || isExpired || isProjectClosed}
                        onClick={() => handleRunNow(job)}
                        className="h-8 px-3 text-xs gap-1.5 font-medium"
                      >
                        {runningJobId === job.id ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Executing...
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5 text-emerald-400" />
                            Run Now
                          </>
                        )}
                      </Button>

                      {/* Pause / Resume button */}
                      {!isExpired && !isProjectClosed && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTogglePause(job)}
                          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                        >
                          {isActive ? (
                            <>
                              <Pause className="h-3.5 w-3.5 mr-1" /> Pause
                            </>
                          ) : (
                            <>
                              <Play className="h-3.5 w-3.5 mr-1" /> Resume
                            </>
                          )}
                        </Button>
                      )}

                      {/* Renew for next year button: for portfolio jobs and creator / admin */}
                      {job.scope === 'portfolio' && isCreator && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={renewingJobId === job.id}
                          onClick={() => handleRenew(job)}
                          className="h-8 px-3 text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                        >
                          {renewingJobId === job.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCw className="h-3.5 w-3.5" />
                          )}
                          Renew for Next Year
                        </Button>
                      )}
                    </div>

                    {/* Delete action (Creator or Admin) */}
                    {(isCreator || showAdminControls) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={deletingJobId === job.id}
                        onClick={() => handleDelete(job)}
                        className="h-8 px-2.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1"
                      >
                        {deletingJobId === job.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Delete Job
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
