import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  computeNextRun,
  getCalendarYearEnd,
  createCronJob,
  loadCronJobs,
  deleteCronJob,
  renewCronJob,
  saveCronJobsList,
  sanitizeForFirestore,
  executeCronJob,
  CRON_JOBS_STORAGE_KEY,
} from '../cron-jobs-service';
import type { FpCronJob } from '@/types/cron-jobs';

describe('cron-jobs-service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('getCalendarYearEnd', () => {
    it('should return December 31 23:59:59.999 for the given year', () => {
      const yearEnd2026 = getCalendarYearEnd(2026);
      const date = new Date(yearEnd2026);
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(11); // December (0-indexed)
      expect(date.getDate()).toBe(31);
    });
  });

  describe('computeNextRun', () => {
    it('should compute same-day next run if time has not passed yet', () => {
      // 08:00 AM on 2026-06-15
      const fromDate = new Date(2026, 5, 15, 8, 0, 0);
      const nextRun = computeNextRun('09:30', 'daily', undefined, fromDate);
      const resDate = new Date(nextRun);

      expect(resDate.getFullYear()).toBe(2026);
      expect(resDate.getMonth()).toBe(5);
      expect(resDate.getDate()).toBe(15);
      expect(resDate.getHours()).toBe(9);
      expect(resDate.getMinutes()).toBe(30);
    });

    it('should compute next-day run if time has already passed today', () => {
      // 10:00 AM on 2026-06-15
      const fromDate = new Date(2026, 5, 15, 10, 0, 0);
      const nextRun = computeNextRun('09:00', 'daily', undefined, fromDate);
      const resDate = new Date(nextRun);

      expect(resDate.getDate()).toBe(16);
      expect(resDate.getHours()).toBe(9);
      expect(resDate.getMinutes()).toBe(0);
    });

    it('should schedule weekly job on the requested day of week', () => {
      // Monday 2026-06-15 at 12:00 PM. Target is Friday (day 5)
      const fromDate = new Date(2026, 5, 15, 12, 0, 0);
      const nextRun = computeNextRun('10:00', 'weekly', 5, fromDate);
      const resDate = new Date(nextRun);

      expect(resDate.getDay()).toBe(5); // Friday
      expect(resDate.getDate()).toBe(19);
      expect(resDate.getHours()).toBe(10);
    });
  });

  describe('createCronJob & loadCronJobs', () => {
    it('should create a portfolio cron job defaulting to calendar year end', async () => {
      const job = await createCronJob({
        name: 'Weekly Portfolio Health',
        query: 'Show project health across all portfolios',
        scope: 'portfolio',
        portfolioId: 'all',
        timeOfDay: '09:00',
        interval: 'weekly',
        dayOfWeek: 1,
        recipients: [
          { id: 'emp-1', type: 'user', name: 'Alice Admin', email: 'alice@example.com' },
        ],
        createdBy: {
          userId: 'emp-1',
          name: 'Alice Admin',
          email: 'alice@example.com',
        },
      });

      expect(job.id).toBeDefined();
      expect(job.status).toBe('active');
      expect(job.scope).toBe('portfolio');
      expect(job.runCount).toBe(0);

      const expiresYear = new Date(job.expiresAt).getFullYear();
      expect(expiresYear).toBe(new Date().getFullYear());

      const loaded = await loadCronJobs();
      expect(loaded.length).toBe(1);
      expect(loaded[0].name).toBe('Weekly Portfolio Health');
    });

    it('should create a project-level cron job scoped to project', async () => {
      const job = await createCronJob({
        name: 'PM Sprint Defect Summary',
        query: 'List open defects in current sprint',
        scope: 'project',
        projectId: 'P2600001',
        projectName: 'AI Customer Hub',
        timeOfDay: '17:00',
        interval: 'daily',
        recipients: [
          { id: 'P2600001', type: 'distro', name: 'P2600001' },
        ],
        createdBy: {
          userId: 'pm-1',
          name: 'Bob PM',
          email: 'bob@example.com',
        },
      });

      expect(job.scope).toBe('project');
      expect(job.projectId).toBe('P2600001');

      const projectJobs = await loadCronJobs({ scope: 'project', projectId: 'P2600001' });
      expect(projectJobs.length).toBe(1);
      expect(projectJobs[0].id).toBe(job.id);
    });
  });

  describe('renewCronJob', () => {
    it('should permit creator to renew a portfolio cron job for next calendar year', async () => {
      const currentYear = new Date().getFullYear();
      const job = await createCronJob({
        name: 'Executive RAG Health',
        query: 'Show portfolio RAG status',
        scope: 'portfolio',
        timeOfDay: '08:00',
        interval: 'daily',
        recipients: [{ id: 'user-1', type: 'user', name: 'User 1' }],
        createdBy: { userId: 'user-1', name: 'User 1', email: 'u1@example.com' },
      });

      const renewed = await renewCronJob(job.id, { userId: 'user-1', isAdmin: false });
      expect(renewed.renewedForYear).toBe(currentYear + 1);
      expect(new Date(renewed.expiresAt).getFullYear()).toBe(currentYear + 1);
      expect(renewed.status).toBe('active');
    });

    it('should reject renewal from a non-creator, non-admin user', async () => {
      const job = await createCronJob({
        name: 'Executive RAG Health',
        query: 'Show portfolio RAG status',
        scope: 'portfolio',
        timeOfDay: '08:00',
        interval: 'daily',
        recipients: [{ id: 'user-1', type: 'user', name: 'User 1' }],
        createdBy: { userId: 'user-1', name: 'User 1', email: 'u1@example.com' },
      });

      await expect(
        renewCronJob(job.id, { userId: 'stranger-2', isAdmin: false })
      ).rejects.toThrow(/Unauthorized/);
    });
  });

  describe('deleteCronJob', () => {
    it('should allow the creator to delete their own job', async () => {
      const job = await createCronJob({
        name: 'Temporary PM Report',
        query: 'Show risks',
        scope: 'portfolio',
        timeOfDay: '09:00',
        interval: 'daily',
        recipients: [{ id: 'user-1', type: 'user', name: 'User 1' }],
        createdBy: { userId: 'user-1', name: 'User 1', email: 'u1@example.com' },
      });

      const res = await deleteCronJob(job.id, { userId: 'user-1', isAdmin: false });
      expect(res.success).toBe(true);

      const remaining = await loadCronJobs();
      expect(remaining.find((j) => j.id === job.id)).toBeUndefined();
    });

    it('should allow an Administrator to delete any unwanted job', async () => {
      const job = await createCronJob({
        name: 'Unwanted Test Job',
        query: 'Show workload',
        scope: 'project',
        projectId: 'P999',
        timeOfDay: '10:00',
        interval: 'daily',
        recipients: [{ id: 'user-9', type: 'user', name: 'User 9' }],
        createdBy: { userId: 'user-9', name: 'User 9', email: 'u9@example.com' },
      });

      // Admin deletes
      const res = await deleteCronJob(job.id, { userId: 'admin-user', isAdmin: true });
      expect(res.success).toBe(true);

      const remaining = await loadCronJobs();
      expect(remaining.find((j) => j.id === job.id)).toBeUndefined();
    });

    it('should block non-creators from deleting a job', async () => {
      const job = await createCronJob({
        name: 'Protected Executive Job',
        query: 'Show valuation',
        scope: 'portfolio',
        timeOfDay: '09:00',
        interval: 'daily',
        recipients: [{ id: 'ceo-1', type: 'user', name: 'CEO' }],
        createdBy: { userId: 'ceo-1', name: 'CEO', email: 'ceo@example.com' },
      });

      await expect(
        deleteCronJob(job.id, { userId: 'intern-2', isAdmin: false })
      ).rejects.toThrow(/Unauthorized/);
    });
  });

  describe('sanitizeForFirestore & undefined safety', () => {
    it('should eliminate undefined properties from objects and arrays', () => {
      const dirty = {
        name: 'Clean Job',
        projectId: undefined,
        deep: {
          a: 1,
          b: undefined,
          arr: [1, undefined, { c: 2, d: undefined }],
        },
      };

      const cleaned = sanitizeForFirestore(dirty);
      expect('projectId' in cleaned).toBe(false);
      expect('b' in cleaned.deep).toBe(false);
      expect('d' in (cleaned.deep.arr[1] as any)).toBe(false);
    });

    it('should create a cron job completely devoid of undefined keys', async () => {
      const job = await createCronJob({
        name: 'Undefined Test Job',
        query: 'Show all',
        scope: 'portfolio',
        timeOfDay: '09:00',
        interval: 'daily',
        recipients: [{ id: 'u1', type: 'user', name: 'User 1' }],
        createdBy: { userId: 'u1', name: 'User 1', email: 'u1@example.com' },
      });

      // Check all own properties of job
      for (const [key, value] of Object.entries(job)) {
        expect(value).not.toBeUndefined();
      }
      expect('projectId' in job).toBe(false);
      expect('projectName' in job).toBe(false);
      expect('dayOfWeek' in job).toBe(false);
      expect('customCron' in job).toBe(false);
    });
  });

  describe('executeCronJob', () => {
    it('should execute a project-scoped query and update run telemetries', async () => {
      const job = await createCronJob({
        name: 'Sprint Defects Report',
        query: 'Give me a graph of bugs opened vs closed today',
        scope: 'project',
        projectId: 'P2600002',
        projectName: 'Microservices Architecture Migration',
        timeOfDay: '09:00',
        interval: 'daily',
        recipients: [{ id: 'user-1', type: 'user', name: 'User 1' }],
        createdBy: { userId: 'user-1', name: 'User 1', email: 'u1@example.com' },
      });

      const res = await executeCronJob(job.id, 'manual');
      expect(res.success).toBe(true);
      expect(res.summary).toBeDefined();

      const jobs = await loadCronJobs();
      const executed = jobs.find((j) => j.id === job.id);
      expect(executed?.runCount).toBe(1);
      expect(executed?.lastRunStatus).toBe('success');
      expect(executed?.lastRunAt).toBeDefined();
    });
  });
});
