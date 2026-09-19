export type CronInterval = 'daily' | 'weekly' | 'custom';

export interface CronJobRecipient {
  id: string;              // empId or projectId
  type: 'user' | 'distro'; // 'user' for employee, 'distro' for project distribution list
  name: string;            // User's name or Project Distro name
  email?: string;
  avatar?: string;
  projectName?: string;
}

export interface FpCronJob {
  id: string;
  name: string;                  // User-defined title for the scheduled report
  query: string;                 // The analytics query string to execute
  scope: 'portfolio' | 'project';
  portfolioId?: string;          // If portfolio scope, specific portfolio ID or 'all'
  projectId?: string;            // If project scope, the target project ID
  projectName?: string;          // Human readable project name
  modelId: string;               // AI model to use (e.g. 'gemini-3.5-flash')
  timeOfDay: string;             // e.g. "09:00" (24h format)
  interval: CronInterval;        // 'daily' | 'weekly' | 'custom'
  dayOfWeek?: number;            // 0 (Sun) - 6 (Sat) if weekly
  customCron?: string;           // E.g. "Every Weekday (Mon-Fri)" or standard cron expression
  
  // Expiry & Lifecycle
  createdAt: string;             // ISO timestamp
  createdBy: {
    userId: string;
    name: string;
    email: string;
  };
  expiresAt: string;             // ISO timestamp. Portfolio jobs end Dec 31 of current calendar year.
  renewedAt?: string;            // ISO timestamp when renewed for next year
  renewedForYear?: number;       // The calendar year for which it was renewed

  // Recipients
  recipients: CronJobRecipient[];

  // Execution state
  status: 'active' | 'paused' | 'expired' | 'completed';
  lastRunAt?: string;            // ISO timestamp
  lastRunStatus?: 'success' | 'failed';
  lastRunSummary?: string;       // Snippet of report output generated
  lastMessageId?: string;        // ID of the internal message sent
  nextRunAt: string;             // ISO timestamp of next scheduled execution
  runCount: number;              // Total number of times executed
}

export interface CreateCronJobInput {
  name: string;
  query: string;
  scope: 'portfolio' | 'project';
  portfolioId?: string;
  projectId?: string;
  projectName?: string;
  modelId?: string;
  timeOfDay: string;
  interval: CronInterval;
  dayOfWeek?: number;
  customCron?: string;
  expiresAt?: string;
  recipients: CronJobRecipient[];
  createdBy: {
    userId: string;
    name: string;
    email: string;
  };
}
