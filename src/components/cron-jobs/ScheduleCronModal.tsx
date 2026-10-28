'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, Users, Sparkles, X, Check, AlertCircle, Info, Loader2 } from 'lucide-react';
import { db } from '@/lib/db-provider';
import { fetchUsersAndDistros } from '@/lib/messaging-service';
import { createCronJob, getCalendarYearEnd } from '@/lib/cron-jobs-service';
import type { CronJobRecipient, CronInterval, FpCronJob } from '@/types/cron-jobs';
import type { MessagingUser, ProjectDistro } from '@/types/messaging';
import { useToast } from '@/hooks/use-toast';

interface ScheduleCronModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuery: string;
  initialTitle?: string;
  scope: 'portfolio' | 'project';
  portfolioId?: string;
  projectId?: string;
  projectName?: string;
  modelId?: string;
  onJobCreated?: (job: FpCronJob) => void;
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Every Monday' },
  { value: 2, label: 'Every Tuesday' },
  { value: 3, label: 'Every Wednesday' },
  { value: 4, label: 'Every Thursday' },
  { value: 5, label: 'Every Friday' },
  { value: 6, label: 'Every Saturday' },
  { value: 0, label: 'Every Sunday' },
];

export function ScheduleCronModal({
  open,
  onOpenChange,
  initialQuery,
  initialTitle,
  scope,
  portfolioId,
  projectId,
  projectName,
  modelId,
  onJobCreated,
}: ScheduleCronModalProps) {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();

  const [jobName, setJobName] = useState<string>('');
  const [timeOfDay, setTimeOfDay] = useState<string>('09:00');
  const [interval, setInterval] = useState<CronInterval>('daily');
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [customCron, setCustomCron] = useState<string>('Weekdays (Mon - Fri)');
  const [recipients, setRecipients] = useState<CronJobRecipient[]>([]);

  const [availableUsers, setAvailableUsers] = useState<MessagingUser[]>([]);
  const [availableDistros, setAvailableDistros] = useState<ProjectDistro[]>([]);
  const [recipientSearch, setRecipientSearch] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Initialize defaults on open
  useEffect(() => {
    if (open) {
      setJobName(initialTitle || `Scheduled: ${initialQuery.slice(0, 40)}`);
      setTimeOfDay('09:00');
      setInterval('daily');
      setDayOfWeek(1);
      setCustomCron('Weekdays (Mon - Fri)');
      setRecipientSearch('');

      // Auto-add current user as recipient if available
      try {
        const stored = localStorage.getItem('currentUser');
        if (stored) {
          const u = JSON.parse(stored);
          if (u?.empId || u?.email) {
            setRecipients([
              {
                id: u.empId || u.id || u.email,
                type: 'user',
                name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
                email: u.email,
              },
            ]);
          }
        }
      } catch {}

      // Load all available employees and project distros
      if (db) {
        fetchUsersAndDistros(db)
          .then(({ users, distros }) => {
            setAvailableUsers(users);
            setAvailableDistros(distros);
          })
          .catch((e) => console.error('Failed to load recipients for cron modal:', e));
      }
    }
  }, [open, initialQuery, initialTitle]);

  // Filter available users & distros
  const filteredUsers = useMemo(() => {
    const q = recipientSearch.toLowerCase().trim();
    return availableUsers.filter((u) => {
      const already = recipients.some((r) => r.id === u.empId || r.id === u.id);
      if (already) return false;
      if (!q) return true;
      return (
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.empId?.toLowerCase().includes(q)
      );
    });
  }, [availableUsers, recipients, recipientSearch]);

  const filteredDistros = useMemo(() => {
    const q = recipientSearch.toLowerCase().trim();
    return availableDistros.filter((d) => {
      const already = recipients.some((r) => r.id === d.id);
      if (already) return false;
      if (!q) return true;
      return d.name?.toLowerCase().includes(q) || d.projectName?.toLowerCase().includes(q);
    });
  }, [availableDistros, recipients, recipientSearch]);

  const handleAddUser = (user: MessagingUser) => {
    setRecipients((prev) => [
      ...prev,
      {
        id: user.empId || user.id,
        type: 'user',
        name: user.name,
        ...(user.email ? { email: user.email } : {}),
        ...(user.avatar ? { avatar: user.avatar } : {}),
      },
    ]);
  };

  const handleAddDistro = (distro: ProjectDistro) => {
    setRecipients((prev) => [
      ...prev,
      {
        id: distro.id,
        type: 'distro',
        name: distro.name,
        ...(distro.projectName ? { projectName: distro.projectName } : {}),
      },
    ]);
  };

  const handleRemoveRecipient = (id: string) => {
    setRecipients((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobName.trim()) {
      toast({ title: 'Job name required', description: 'Please enter a name for this cron job.', variant: 'destructive' });
      return;
    }
    if (recipients.length === 0) {
      toast({ title: 'Recipients required', description: 'Please mention at least one resource or project distro to receive report results.', variant: 'destructive' });
      return;
    }

    let creatorInfo = {
      userId: 'admin',
      name: 'Administrator',
      email: 'admin@workwayz.local',
    };
    try {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        const u = JSON.parse(stored);
        creatorInfo = {
          userId: u.empId || u.id || 'admin',
          name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'User',
          email: u.email || 'user@workwayz.local',
        };
      }
    } catch {}

    setIsSubmitting(true);
    try {
      const payload: any = {
        name: jobName.trim(),
        query: initialQuery.trim(),
        scope,
        portfolioId: portfolioId || 'all',
        modelId: modelId || 'gemini-3.5-flash',
        timeOfDay: timeOfDay || '09:00',
        interval,
        recipients,
        createdBy: creatorInfo,
      };

      if (scope === 'project' && projectId) {
        payload.projectId = projectId;
        if (projectName) payload.projectName = projectName;
      }
      if (interval === 'weekly' && dayOfWeek !== undefined) {
        payload.dayOfWeek = dayOfWeek;
      }
      if (interval === 'custom' && customCron) {
        payload.customCron = customCron;
      }

      const newJob = await createCronJob(payload);

      toast({
        title: 'Cron Job Created Successfully',
        description: `"${newJob.name}" will run ${interval} at ${timeOfDay} and notify ${recipients.length} recipient(s).`,
      });

      onJobCreated?.(newJob);
      onOpenChange(false);
    } catch (err: any) {
      console.error('Failed to create cron job:', err);
      toast({
        title: 'Error Creating Cron Job',
        description: err?.message || 'Failed to save scheduled job.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 flex flex-col overflow-hidden" bypassScrollWrapper={true}>
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-2 text-primary font-medium text-xs">
            <Clock className="h-4 w-4" />
            <span>Automated WayFinder Query Scheduler</span>
          </div>
          <DialogTitle className="text-xl font-bold">Convert Query to Cron Job</DialogTitle>
          <DialogDescription className="text-xs">
            Schedule this report to execute automatically and dispatch results as messages to mentioned team members or project distros.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 min-h-0">
          {/* Query preview banner */}
          <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs space-y-1">
            <div className="font-semibold text-primary flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Active Report Query
            </div>
            <div className="font-mono text-foreground/90 italic bg-background/60 p-2 rounded border border-border/60">
              &quot;{initialQuery}&quot;
            </div>
          </div>

          {/* Job Name */}
          <div className="space-y-1.5">
            <Label htmlFor="cron-job-name" className="text-xs font-semibold">
              Cron Job Name *
            </Label>
            <Input
              id="cron-job-name"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              placeholder="e.g. Daily PM Workload & Health Briefing"
              className="h-9 text-sm"
              required
            />
          </div>

          {/* Schedule Controls: Time of Day & Interval */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cron-time" className="text-xs font-semibold flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Prescribed Execution Time
              </Label>
              <Input
                id="cron-time"
                type="time"
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(e.target.value)}
                className="h-9 text-sm"
                required
              />
              <p className="text-[11px] text-muted-foreground">Local time when query runs</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cron-interval" className="text-xs font-semibold flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Regular Interval
              </Label>
              <Select value={interval} onValueChange={(val: any) => setInterval(val)}>
                <SelectTrigger id="cron-interval" className="h-9 text-xs">
                  <SelectValue placeholder="Select Interval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily (Every Day)</SelectItem>
                  <SelectItem value="weekly">Weekly (Once per week)</SelectItem>
                  <SelectItem value="custom">Custom (Weekdays only)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Recurrence frequency</p>
            </div>
          </div>

          {/* If Weekly: Day of Week */}
          {interval === 'weekly' && (
            <div className="space-y-1.5 p-3 rounded-lg bg-muted/40 border border-border">
              <Label className="text-xs font-semibold">Select Day of Week</Label>
              <Select value={String(dayOfWeek)} onValueChange={(val) => setDayOfWeek(Number(val))}>
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((d) => (
                    <SelectItem key={d.value} value={String(d.value)}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* If Custom: Weekday Option */}
          {interval === 'custom' && (
            <div className="space-y-1.5 p-3 rounded-lg bg-muted/40 border border-border">
              <Label className="text-xs font-semibold">Custom Recurrence Pattern</Label>
              <Input
                value={customCron}
                onChange={(e) => setCustomCron(e.target.value)}
                className="h-9 text-xs bg-background"
                placeholder="e.g. Weekdays (Monday through Friday)"
              />
            </div>
          )}

          {/* Lifecycle & Expiration Notice Banner */}
          {scope === 'portfolio' ? (
            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs flex items-start gap-2.5">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <div className="font-semibold text-amber-200">Portfolio Level Lifecycle: Calendar Year End</div>
                <div className="mt-0.5 text-amber-300/90 leading-relaxed">
                  This job will run until <strong>December 31, {currentYear}</strong>. You (the creator) or an Administrator will have the option to renew it for the next year in the dashboard.
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-300 text-xs flex items-start gap-2.5">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-400" />
              <div>
                <div className="font-semibold text-blue-200">Project Level Lifecycle: Project Closed</div>
                <div className="mt-0.5 text-blue-300/90 leading-relaxed">
                  Linked to project <strong>{projectName || projectId}</strong>. This cron job will run on schedule and automatically terminate when the project is closed.
                </div>
              </div>
            </div>
          )}

          {/* Recipients: Mentioned Resources & Distros */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" /> Recipients (Mentioned Resources & Distros) *
              </span>
              <span className="text-[11px] text-muted-foreground font-normal">
                {recipients.length} selected
              </span>
            </Label>

            {/* Selected chips */}
            {recipients.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-border bg-muted/20 min-h-[42px] items-center">
                {recipients.map((rec) => (
                  <Badge
                    key={rec.id}
                    variant={rec.type === 'distro' ? 'default' : 'secondary'}
                    className="text-xs gap-1.5 py-1 pl-2.5 pr-1.5 font-medium"
                  >
                    <span>
                      {rec.type === 'distro' ? `📢 Distro: ${rec.name}` : `👤 ${rec.name}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRecipient(rec.id)}
                      className="hover:bg-background/20 rounded-full p-0.5 transition-colors cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="p-2.5 rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground">
                No recipients selected yet. Search and pick resources or distros below.
              </div>
            )}

            {/* Search Input for Available Recipients */}
            <div className="relative">
              <Input
                type="text"
                value={recipientSearch}
                onChange={(e) => setRecipientSearch(e.target.value)}
                placeholder="Search team members or project distros to mention..."
                className="h-9 text-xs"
              />
            </div>

            {/* Dropdown list of available additions */}
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border/80 divide-y divide-border/50 text-xs bg-card/60">
              {/* Distros first */}
              {filteredDistros.length > 0 && (
                <div className="p-1.5 bg-muted/40 font-semibold text-[11px] text-muted-foreground">
                  Project Distros
                </div>
              )}
              {filteredDistros.map((distro) => (
                <div
                  key={distro.id}
                  onClick={() => handleAddDistro(distro)}
                  className="p-2 hover:bg-primary/10 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary font-mono text-[10px]">
                      DISTRO
                    </span>
                    <span className="font-semibold">{distro.name}</span>
                    <span className="text-muted-foreground">({distro.projectName})</span>
                  </div>
                  <span className="text-primary text-[11px] font-medium">+ Add</span>
                </div>
              ))}

              {/* Users */}
              {filteredUsers.length > 0 && (
                <div className="p-1.5 bg-muted/40 font-semibold text-[11px] text-muted-foreground">
                  Individual Team Members
                </div>
              )}
              {filteredUsers.map((user) => (
                <div
                  key={user.id || user.empId}
                  onClick={() => handleAddUser(user)}
                  className="p-2 hover:bg-primary/10 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div>
                    <span className="font-medium">{user.name}</span>
                    <span className="text-muted-foreground ml-1.5 text-[11px]">
                      {user.email || user.role}
                    </span>
                  </div>
                  <span className="text-primary text-[11px] font-medium">+ Add</span>
                </div>
              ))}

              {filteredDistros.length === 0 && filteredUsers.length === 0 && (
                <div className="p-3 text-center text-muted-foreground text-xs">
                  {recipientSearch ? 'No matching resources found.' : 'All available resources are already added.'}
                </div>
              )}
            </div>
          </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-background shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !jobName.trim() || recipients.length === 0}
              className="text-xs h-9 gap-1.5 font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Cron Job...
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4" />
                  Create Cron Job
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
