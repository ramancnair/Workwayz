import { db, doc, getDoc, setDoc, collection, getDocs, getActiveDb } from '@/lib/db-provider';
import type { FpCronJob, CreateCronJobInput, CronInterval } from '@/types/cron-jobs';
import { executeFpQuery } from '@/lib/fp-query-engine';
import { executeFpPmQuery, type FpPmProjectData } from '@/lib/fp-pm-query-engine';
import type { FpQueryResponse } from '@/types/fp-dashboard';
import { sendInternalMessage } from '@/lib/messaging-service';

export const CRON_JOBS_STORAGE_KEY = 'pf_cron_jobs';

/**
 * Returns ISO timestamp for December 31 23:59:59.999 of the specified year.
 */
export function getCalendarYearEnd(year = new Date().getFullYear()): string {
  const d = new Date(year, 11, 31, 23, 59, 59, 999);
  return d.toISOString();
}

/**
 * Computes the next run ISO timestamp based on interval, timeOfDay, and dayOfWeek.
 */
export function computeNextRun(
  timeOfDay: string,
  interval: CronInterval,
  dayOfWeek?: number,
  fromDate = new Date()
): string {
  const [hoursStr, minsStr] = (timeOfDay || '09:00').split(':');
  const hours = parseInt(hoursStr, 10) || 9;
  const minutes = parseInt(minsStr, 10) || 0;

  const target = new Date(fromDate);
  target.setHours(hours, minutes, 0, 0);

  if (interval === 'daily') {
    // If target time today has already passed, schedule for tomorrow
    if (target.getTime() <= fromDate.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    return target.toISOString();
  }

  if (interval === 'weekly') {
    const targetDay = dayOfWeek !== undefined ? dayOfWeek : 1; // Default to Monday (1)
    const currentDay = target.getDay();
    let daysToAdd = (targetDay - currentDay + 7) % 7;

    // If today is the target day but the time has already passed, advance by 7 days
    if (daysToAdd === 0 && target.getTime() <= fromDate.getTime()) {
      daysToAdd = 7;
    }
    target.setDate(target.getDate() + daysToAdd);
    return target.toISOString();
  }

  // Custom / Weekdays fallback
  // If Saturday (6), advance to Monday; if Sunday (0), advance to Monday
  if (target.getTime() <= fromDate.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  if (target.getDay() === 6) {
    target.setDate(target.getDate() + 2); // Saturday -> Monday
  } else if (target.getDay() === 0) {
    target.setDate(target.getDate() + 1); // Sunday -> Monday
  }
  return target.toISOString();
}

/**
 * Helper to fetch local cached jobs from localStorage.
 */
function getLocalCachedJobs(): FpCronJob[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CRON_JOBS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Helper to save jobs to localStorage cache.
 */
function setLocalCachedJobs(jobs: FpCronJob[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CRON_JOBS_STORAGE_KEY, JSON.stringify(jobs));
  } catch {}
}

/**
 * Recursively removes any keys with `undefined` values and ensures arrays and objects
 * are strictly Firestore-safe.
 */
export function sanitizeForFirestore<T>(val: T): T {
  if (val === undefined) {
    return null as unknown as T;
  }
  if (val === null || typeof val !== 'object') {
    return val;
  }
  if (val instanceof Date) {
    return val.toISOString() as unknown as T;
  }
  if (Array.isArray(val)) {
    return val
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(val as Record<string, any>)) {
    if (v !== undefined) {
      result[k] = sanitizeForFirestore(v);
    }
  }
  return result as T;
}

/**
 * Load all cron jobs, evaluating project closure and portfolio year-end expiration.
 */
export async function loadCronJobs(options?: {
  projectId?: string;
  portfolioId?: string;
  scope?: 'portfolio' | 'project';
}): Promise<FpCronJob[]> {
  let jobs: FpCronJob[] = getLocalCachedJobs();

  const targetDoc = doc(db, 'settings', 'cron_jobs');
  if (targetDoc) {
    try {
      const snap = await getDoc(targetDoc);
      if (snap && (typeof snap.exists === 'function' ? snap.exists() : snap.data)) {
        const raw = typeof snap.data === 'function' ? snap.data() : snap.data;
        if (raw && Array.isArray(raw.jobs)) {
          jobs = raw.jobs;
          setLocalCachedJobs(jobs);
        } else if (raw && raw.data && Array.isArray(raw.data.jobs)) {
          jobs = raw.data.jobs;
          setLocalCachedJobs(jobs);
        }
      }
    } catch (err) {
      console.warn('[cron-jobs-service] Failed to fetch cron jobs from database, using cached:', err);
    }
  }

  // Ensure jobs loaded are clean of undefined fields
  jobs = sanitizeForFirestore(jobs);

  const now = new Date();
  let modified = false;

  // Lifecycle check:
  // 1. Portfolio jobs: check year-end expiration
  // 2. Project jobs: check if project closed
  const evaluatedJobs: FpCronJob[] = await Promise.all(
    jobs.map(async (job) => {
      // Check calendar year expiry for portfolio jobs
      if (job.scope === 'portfolio' && job.status === 'active') {
        const expires = new Date(job.expiresAt);
        if (expires.getTime() <= now.getTime()) {
          modified = true;
          return { ...job, status: 'expired' as const };
        }
      }

      // Check project closure for project jobs
      if (job.scope === 'project' && job.projectId && job.status === 'active') {
        const projRef = doc(db, 'projects', job.projectId);
        if (projRef) {
          try {
            const projDoc = await getDoc(projRef);
            if (projDoc && (typeof projDoc.exists === 'function' ? projDoc.exists() : projDoc.data)) {
              const pData = typeof projDoc.data === 'function' ? projDoc.data() : projDoc.data;
              if (pData?.status === 'Closed' || pData?.isArchived || pData?.isDeleted) {
                modified = true;
                return { ...job, status: 'completed' as const };
              }
            }
          } catch {}
        }
      }

      return job;
    })
  );

  if (modified) {
    saveCronJobsList(evaluatedJobs).catch(() => {});
  }

  // Filter based on requested options
  let filtered = evaluatedJobs;
  if (options?.scope) {
    filtered = filtered.filter((j) => j.scope === options.scope);
  }
  if (options?.projectId) {
    filtered = filtered.filter((j) => j.projectId === options.projectId);
  }
  if (options?.portfolioId && options.portfolioId !== 'all') {
    filtered = filtered.filter((j) => j.portfolioId === options.portfolioId || j.portfolioId === 'all');
  }

  return filtered;
}

/**
 * Persists the entire cron jobs array to the database and localStorage.
 */
export async function saveCronJobsList(jobs: FpCronJob[]): Promise<void> {
  const sanitizedJobs = sanitizeForFirestore(jobs);
  setLocalCachedJobs(sanitizedJobs);
  const targetDoc = doc(db, 'settings', 'cron_jobs');
  if (targetDoc) {
    try {
      const rawPayload = {
        id: 'cron_jobs',
        jobs: sanitizedJobs,
        data: { jobs: sanitizedJobs },
        updatedAt: new Date().toISOString(),
      };
      // Convert to clean JSON to strictly eliminate all undefined properties
      const cleanPayload = JSON.parse(JSON.stringify(sanitizeForFirestore(rawPayload)));
      await setDoc(targetDoc, cleanPayload);
    } catch (err) {
      console.error('[cron-jobs-service] Failed to persist cron jobs to database:', err);
      throw err;
    }
  }
}

/**
 * Create and register a new cron job.
 */
export async function createCronJob(input: CreateCronJobInput): Promise<FpCronJob> {
  const currentYear = new Date().getFullYear();
  const defaultExpiry =
    input.scope === 'portfolio'
      ? getCalendarYearEnd(currentYear)
      : input.expiresAt || new Date(currentYear + 5, 11, 31).toISOString(); // Active until project closed

  const nextRunAt = computeNextRun(input.timeOfDay, input.interval, input.dayOfWeek);

  const rawJob: Record<string, any> = {
    id: `cron_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: input.name.trim() || `${input.scope === 'portfolio' ? 'Portfolio' : 'Project'} Scheduled Report`,
    query: input.query.trim(),
    scope: input.scope,
    portfolioId: input.portfolioId || 'all',
    modelId: input.modelId || 'gemini-3.5-flash',
    timeOfDay: input.timeOfDay || '09:00',
    interval: input.interval || 'daily',
    createdAt: new Date().toISOString(),
    createdBy: {
      userId: input.createdBy.userId,
      name: input.createdBy.name,
      email: input.createdBy.email,
    },
    expiresAt: defaultExpiry,
    recipients: (input.recipients || []).map((r) => {
      const rec: Record<string, any> = {
        id: r.id,
        type: r.type,
        name: r.name,
      };
      if (r.email) rec.email = r.email;
      if (r.avatar) rec.avatar = r.avatar;
      if (r.projectName) rec.projectName = r.projectName;
      return rec;
    }),
    status: 'active',
    nextRunAt,
    runCount: 0,
  };

  if (input.projectId) rawJob.projectId = input.projectId;
  if (input.projectName) rawJob.projectName = input.projectName;
  if (input.dayOfWeek !== undefined) rawJob.dayOfWeek = input.dayOfWeek;
  if (input.customCron) rawJob.customCron = input.customCron;

  const newJob: FpCronJob = JSON.parse(JSON.stringify(sanitizeForFirestore(rawJob)));

  const existing = await loadCronJobs();
  const updated = [newJob, ...existing];
  await saveCronJobsList(updated);

  return newJob;
}

/**
 * Updates an existing cron job by ID.
 */
export async function updateCronJob(id: string, updates: Partial<FpCronJob>): Promise<FpCronJob> {
  const existing = await loadCronJobs();
  const idx = existing.findIndex((j) => j.id === id);
  if (idx === -1) {
    throw new Error(`Cron job with ID "${id}" was not found.`);
  }

  const cleanedUpdates = JSON.parse(JSON.stringify(sanitizeForFirestore(updates)));
  const updatedJob: FpCronJob = JSON.parse(JSON.stringify(sanitizeForFirestore({ ...existing[idx], ...cleanedUpdates })));
  existing[idx] = updatedJob;
  await saveCronJobsList(existing);
  return updatedJob;
}

/**
 * Deletes a cron job with permission check (creator or admin).
 */
export async function deleteCronJob(
  id: string,
  requestedBy: { userId: string; isAdmin: boolean }
): Promise<{ success: boolean; message?: string }> {
  const existing = await loadCronJobs();
  const job = existing.find((j) => j.id === id);
  if (!job) {
    return { success: true, message: 'Job already deleted.' };
  }

  const isCreator =
    job.createdBy.userId === requestedBy.userId ||
    job.createdBy.email.toLowerCase() === requestedBy.userId.toLowerCase();

  if (!isCreator && !requestedBy.isAdmin) {
    throw new Error('Unauthorized: Only the creator of this cron job or an Administrator can delete it.');
  }

  const filtered = existing.filter((j) => j.id !== id);
  await saveCronJobsList(filtered);
  return { success: true };
}

/**
 * Renews a portfolio cron job for the next calendar year.
 */
export async function renewCronJob(
  id: string,
  requestedBy: { userId: string; isAdmin: boolean }
): Promise<FpCronJob> {
  const existing = await loadCronJobs();
  const job = existing.find((j) => j.id === id);
  if (!job) {
    throw new Error(`Cron job with ID "${id}" was not found.`);
  }

  const isCreator =
    job.createdBy.userId === requestedBy.userId ||
    job.createdBy.email.toLowerCase() === requestedBy.userId.toLowerCase();

  if (!isCreator && !requestedBy.isAdmin) {
    throw new Error('Unauthorized: Only the creator of this cron job or an Administrator can renew it.');
  }

  const currentExpiryYear = new Date(job.expiresAt).getFullYear();
  const nextYear = currentExpiryYear + 1;
  const newExpiry = getCalendarYearEnd(nextYear);

  return await updateCronJob(id, {
    expiresAt: newExpiry,
    renewedAt: new Date().toISOString(),
    renewedForYear: nextYear,
    status: 'active',
  });
}

/**
 * Loads project-level deliverables, backlog stories, defects, sprints, and RAID items
 * for deterministic PM query execution.
 */
export async function loadProjectDataForCron(projectId: string): Promise<FpPmProjectData | null> {
  if (!getActiveDb() || !projectId) return null;
  try {
    const projDoc = await getDoc(doc(db, 'projects', projectId));
    if (!projDoc) return null;
    const exists = typeof projDoc.exists === 'function' ? projDoc.exists() : !!projDoc.data;
    if (!exists) return null;

    const pData = typeof projDoc.data === 'function' ? projDoc.data() : projDoc.data;
    const project = { id: projDoc.id || projectId, ...(pData || {}) };

    let portfolioName = project.portfolioName || 'General Portfolio';
    if (project.portfolioId) {
      try {
        const portDoc = await getDoc(doc(db, 'portfolios', project.portfolioId));
        if (portDoc) {
          const portData = typeof portDoc.data === 'function' ? portDoc.data() : portDoc.data;
          if (portData?.name) {
            portfolioName = portData.name;
          }
        }
      } catch {}
    }

    const [
      storiesSnap,
      sprintsSnap,
      epicsSnap,
      employeesSnap,
      risksSnap,
      issuesSnap,
      assumptionsSnap,
      dependenciesSnap,
      testCasesSnap,
      worklogsSnap,
      paymentsSnap,
      releasesSnap,
    ] = await Promise.all([
      getDocs(collection(db, 'projects', projectId, 'stories')).catch(() => ({ docs: [] })),
      getDocs(collection(db, 'projects', projectId, 'sprints')).catch(() => ({ docs: [] })),
      getDocs(collection(db, 'projects', projectId, 'epics')).catch(() => ({ docs: [] })),
      getDocs(collection(db, 'projects', projectId, 'employees')).catch(() => ({ docs: [] })),
      getDocs(collection(db, 'projects', projectId, 'risks')).catch(() => ({ docs: [] })),
      getDocs(collection(db, 'projects', projectId, 'issues')).catch(() => ({ docs: [] })),
      getDocs(collection(db, 'projects', projectId, 'assumptions')).catch(() => ({ docs: [] })),
      getDocs(collection(db, 'projects', projectId, 'dependencies')).catch(() => ({ docs: [] })),
      getDocs(collection(db, 'projects', projectId, 'testCases')).catch(() => ({ docs: [] })),
      getDocs(collection(db, 'projects', projectId, 'worklogs')).catch(() => ({ docs: [] })),
      getDocs(collection(db, 'projects', projectId, 'paymentMilestones')).catch(() => ({ docs: [] })),
      getDocs(collection(db, 'projects', projectId, 'releases')).catch(() => ({ docs: [] })),
    ]);

    const toArr = (snap: any) =>
      Array.isArray(snap?.docs)
        ? snap.docs.map((d: any) => ({ id: d.id, ...(typeof d.data === 'function' ? d.data() : d.data) }))
        : [];

    return {
      project,
      portfolioName,
      stories: toArr(storiesSnap),
      sprints: toArr(sprintsSnap),
      epics: toArr(epicsSnap),
      employees: toArr(employeesSnap),
      risks: toArr(risksSnap),
      issues: toArr(issuesSnap),
      assumptions: toArr(assumptionsSnap),
      dependencies: toArr(dependenciesSnap),
      testCases: toArr(testCasesSnap),
      worklogs: toArr(worklogsSnap),
      paymentMilestones: toArr(paymentsSnap),
      releases: toArr(releasesSnap),
    };
  } catch (err) {
    console.error('[cron-jobs-service] Failed to load project data for PM query execution:', err);
    return null;
  }
}

/**
 * Executes a cron job:
 * 1. Runs the query against live database (via AI analytics API or scope-specific engine)
 * 2. Composes formatted executive message
 * 3. Sends internal message to mentioned resources/distros
 * 4. Updates run history & calculates nextRunAt
 */
export async function executeCronJob(
  jobId: string,
  triggerOrigin: 'manual' | 'scheduled' = 'scheduled'
): Promise<{ success: boolean; messageId?: string; summary?: string; error?: string }> {
  const jobs = await loadCronJobs();
  const job = jobs.find((j) => j.id === jobId);
  if (!job) {
    return { success: false, error: `Cron job "${jobId}" not found.` };
  }

  if (job.status === 'expired') {
    return { success: false, error: 'Job is expired (passed calendar year end). Renew it first.' };
  }
  if (job.status === 'completed') {
    return { success: false, error: 'Job is completed (linked project was closed).' };
  }

  try {
    // 1. Run the query based on job scope
    let reportData: FpQueryResponse | null = null;

    // First attempt: call AI analytics API route if in browser environment and not in unit tests
    if (
      typeof window !== 'undefined' &&
      window.location?.origin &&
      window.location.origin.startsWith('http') &&
      process.env.NODE_ENV !== 'test'
    ) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);
        const apiRes = await fetch(`${window.location.origin}/api/fp-analytics/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: job.query,
            scope: job.scope,
            projectId: job.projectId,
            portfolioId: job.portfolioId || 'all',
            modelId: job.modelId || 'gemini-3.5-flash',
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (apiRes.ok) {
          const json = await apiRes.json();
          if (json && json.success) {
            reportData = json;
          }
        }
      } catch (apiErr) {
        console.warn('[cron-jobs-service] AI Analytics API failed, using local query engine:', apiErr);
      }
    }

    // Second attempt / Fallback: deterministic local query engines
    if (!reportData) {
      if (job.scope === 'project' && job.projectId) {
        const projectData = await loadProjectDataForCron(job.projectId);
        if (projectData) {
          reportData = executeFpPmQuery(job.query, projectData);
        } else {
          reportData = executeFpPmQuery(job.query, {
            project: { id: job.projectId, name: job.projectName || job.projectId },
            portfolioName: 'General Portfolio',
            stories: [],
            sprints: [],
            epics: [],
            employees: [],
            risks: [],
            issues: [],
            assumptions: [],
            dependencies: [],
            testCases: [],
            worklogs: [],
            paymentMilestones: [],
            releases: [],
          });
        }
      } else {
        // Portfolio scope
        reportData = await executeFpQuery(job.query, job.portfolioId || 'all');
      }
    }

    // 2. Format internal message body
    const formattedDate = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const executiveBullets =
      reportData.executiveSummary && reportData.executiveSummary.length > 0
        ? reportData.executiveSummary.map((b) => `• ${b}`).join('\n')
        : '• Query executed successfully against live database records.';

    const kpiSummary =
      reportData.kpis && reportData.kpis.length > 0
        ? reportData.kpis.map((k) => `* **${k.label}:** ${k.value}${k.subtext ? ` (${k.subtext})` : ''}`).join('\n')
        : '';

    const chartSummary =
      reportData.chart && Array.isArray(reportData.chart.data) && reportData.chart.data.length > 0
        ? `#### 📊 ${reportData.chart.title || 'Data Breakdown'}\n` +
          reportData.chart.data
            .slice(0, 6)
            .map((d: any) => {
              const cat = d[reportData.chart.categoryKey] || d.name || d.category || 'Category';
              const val = d[reportData.chart.dataKey] !== undefined ? d[reportData.chart.dataKey] : (d.count ?? d.total ?? d.value ?? 0);
              const sec = reportData.chart.secondaryKey && d[reportData.chart.secondaryKey] !== undefined
                ? ` (${reportData.chart.secondaryKey}: ${d[reportData.chart.secondaryKey]})`
                : '';
              return `* **${cat}:** ${val}${sec}`;
            })
            .join('\n')
        : '';

    const dashboardLink =
      job.scope === 'project' && job.projectId
        ? `/projects/${job.projectId}/project-details/fp-pm-dash`
        : `/fp-portfolio-dash`;

    const embeddedChartSpec =
      reportData.chart && reportData.chart.type !== 'none' && Array.isArray(reportData.chart.data) && reportData.chart.data.length > 0
        ? `<!--fp-chart-start-->\n${JSON.stringify(reportData.chart)}\n<!--fp-chart-end-->`
        : '';

    const embeddedKpisSpec =
      reportData.kpis && reportData.kpis.length > 0
        ? `<!--fp-kpis-start-->\n${JSON.stringify(reportData.kpis)}\n<!--fp-kpis-end-->`
        : '';

    const bodyContent = [
      `### 📊 Scheduled Automated Report: ${job.name}`,
      `*Triggered via **${triggerOrigin === 'manual' ? 'Manual Run' : 'Automated Cron'}** on ${formattedDate} at ${formattedTime}*`,
      '',
      `**Original Query:** *"${job.query}"*`,
      `**Scope:** ${job.scope === 'project' ? `Project (${job.projectName || job.projectId})` : `Portfolio (${job.portfolioId || 'All'})`}`,
      '',
      '#### 📌 Executive Takeaways',
      executiveBullets,
      '',
      kpiSummary ? '#### 📈 Key Metrics' : '',
      kpiSummary,
      '',
      chartSummary,
      '',
      embeddedChartSpec,
      embeddedKpisSpec,
      '---',
      `*Records analyzed: ${reportData.audit?.recordsAnalyzed ?? 'Live DB'} | View full live charts on the [FlowPilot Dashboard](${dashboardLink}).*`,
    ]
      .filter((s) => s !== undefined && s !== '')
      .join('\n');

    // 3. Dispatch internal message if recipients configured
    let sentMessageId: string | undefined;
    if (job.recipients && job.recipients.length > 0 && getActiveDb()) {
      const msgRes = await sendInternalMessage(db, {
        sender: {
          id: job.createdBy.userId || 'system',
          name: `FlowPilot Scheduled [${job.name}]`,
          email: job.createdBy.email || 'flowpilot@projectflow.local',
        },
        recipients: job.recipients,
        subject: `[Scheduled Report] ${job.name} - ${formattedDate}`,
        body: bodyContent,
      });
      sentMessageId = msgRes.id;
    }

    // 4. Update job telemetries
    const nextRun = computeNextRun(job.timeOfDay, job.interval, job.dayOfWeek);
    await updateCronJob(jobId, {
      lastRunAt: new Date().toISOString(),
      lastRunStatus: 'success',
      lastRunSummary: reportData.title || job.name,
      lastMessageId: sentMessageId,
      runCount: (job.runCount || 0) + 1,
      nextRunAt: nextRun,
    });

    return {
      success: true,
      messageId: sentMessageId,
      summary: reportData.title || job.name,
    };
  } catch (err: any) {
    console.error(`[cron-jobs-service] Execution failed for job ${jobId}:`, err);
    await updateCronJob(jobId, {
      lastRunAt: new Date().toISOString(),
      lastRunStatus: 'failed',
    }).catch(() => {});

    return {
      success: false,
      error: err?.message || 'Failed to execute scheduled report query.',
    };
  }
}
