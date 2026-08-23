import { AccessLevel } from '@/types';

export const defaultAccessSettings: Record<Exclude<AccessLevel, 'Administrator'>, string[]> = {
  'Senior Management': [
    'My Projects', 'Project Home', 'Portfolio Dashboard', 'Estimations', 'Defects', 'User List', 'Utilization', 'Holiday Calendar', 'Leave Settings', 'Leave Tracker', 'Billing', 'Billing Rate', 'Trash',
    'Development Dashboard', 'Product Backlog', 'Grooming', 'Kanban Board', 'Sub-Tasks', 'Defect Tracker', 'Test Dashboard', 'Test Backlog', 'Test Cycle', 'Test Plan', 'Defects', 'Project Status', 'PM Dashboard', 'Specifications', 'Specifications (Initial Estimation)', 'Project Status (Initial Estimation)', 'Project Releases', 'Project Resources', 'Worklog', 'Resource Workload', 'Project Gantt', 'RAID Dashboard', 'Risks', 'Assumptions', 'Issues', 'Dependencies', 'Project Holiday Calendar', 'Leave Calendar', 'PMO Documents', 'PMO FB Billing', 'PMO FB Payment Milestones', 'PMO TnM Billing', 'PMO TnM Payment Milestones', 'Business Continuity'
  ],
  'Project Manager': [
    'My Projects', 'Project Home', 'Estimations', 'Defects', 'User List', 'Utilization', 'Holiday Calendar', 'Leave Settings', 'Leave Tracker', 'Billing', 'Billing Rate',
    'Development Dashboard', 'Product Backlog', 'Grooming', 'Kanban Board', 'Sub-Tasks', 'Defect Tracker', 'Test Dashboard', 'Test Backlog', 'Test Cycle', 'Test Plan', 'Defects', 'Project Status', 'PM Dashboard', 'Specifications', 'Specifications (Initial Estimation)', 'Project Status (Initial Estimation)', 'Project Releases', 'Project Resources', 'Worklog', 'Resource Workload', 'Project Gantt', 'RAID Dashboard', 'Risks', 'Assumptions', 'Issues', 'Dependencies', 'Project Holiday Calendar', 'Leave Calendar', 'PMO Documents', 'PMO FB Billing', 'PMO FB Payment Milestones', 'PMO TnM Billing', 'PMO TnM Payment Milestones', 'Business Continuity', 'Board Settings', 'Sprint Settings', 'Effort Settings', 'Project Trash'
  ],
  'Lead': [
    'My Projects', 'Project Home', 'User List', 'Holiday Calendar', 'Leave Tracker',
    'Development Dashboard', 'Product Backlog', 'Grooming', 'Kanban Board', 'Sub-Tasks', 'Defect Tracker', 'Test Dashboard', 'Test Backlog', 'Test Cycle', 'Test Plan', 'Defects', 'Project Status', 'Specifications', 'Project Releases', 'Project Resources', 'Worklog', 'Resource Workload', 'Project Gantt', 'RAID Dashboard', 'Risks', 'Assumptions', 'Issues', 'Dependencies', 'Project Holiday Calendar', 'Leave Calendar', 'PMO Documents', 'Business Continuity', 'Board Settings', 'Sprint Settings'
  ],
  'Team Member': [
    'My Projects', 'Project Home', 'Leave Tracker',
    'Development Dashboard', 'Kanban Board', 'Sub-Tasks', 'Defect Tracker', 'Test Dashboard', 'Test Backlog', 'Defects', 'Project Status', 'Specifications', 'Project Resources', 'Worklog', 'RAID Dashboard', 'Project Holiday Calendar', 'PMO Documents'
  ],
  'PMO': [
    'My Projects', 'Project Home', 'User List', 'Utilization', 'Holiday Calendar', 'Leave Tracker', 'Billing', 'Billing Rate',
    'Project Status', 'PM Dashboard', 'Project Releases', 'Project Resources', 'Worklog', 'Resource Workload', 'Project Gantt', 'PMO Documents', 'PMO FB Billing', 'PMO FB Payment Milestones', 'PMO TnM Billing', 'PMO TnM Payment Milestones', 'Business Continuity'
  ]
};

export function getPageNameForRoute(pathname: string): string | null {
  if (!pathname || pathname === '/' || pathname === '/login' || pathname === '/signup' || pathname === '/setup-wizard' || pathname.startsWith('/my-account')) {
    return null; // Public or personal profile path (no specific role restriction)
  }

  // Admin Level Pages
  if (pathname.startsWith('/portfolio-settings/access-settings')) return 'Access Settings';
  if (pathname.startsWith('/portfolio-settings/database')) return 'Database';
  if (pathname.startsWith('/portfolio-settings/authentication')) return 'Authentication';
  if (pathname.startsWith('/portfolio-settings/ai-config')) return 'AI Config';
  if (pathname.startsWith('/portfolio-settings/archive')) return 'Archive';
  if (pathname.startsWith('/portfolio-settings')) return 'Access Settings';

  // Portfolio Level Pages
  if (pathname.startsWith('/my-projects')) return 'My Projects';
  if (pathname.startsWith('/project-home')) return 'Project Home';
  if (pathname.startsWith('/portfolio-dashboard')) return 'Portfolio Dashboard';
  if (pathname.startsWith('/quality/estimations')) return 'Estimations';
  if (pathname.startsWith('/quality/defects')) return 'Defects';
  if (pathname.startsWith('/quality')) return 'Estimations';
  if (pathname.startsWith('/users')) return 'User List';
  if (pathname.startsWith('/utilization')) return 'Utilization';
  if (pathname.startsWith('/holidays/holiday-calendar')) return 'Holiday Calendar';
  if (pathname.startsWith('/holidays/leave-settings')) return 'Leave Settings';
  if (pathname.startsWith('/holidays/leave-tracker')) return 'Leave Tracker';
  if (pathname.startsWith('/billing-rate')) return 'Billing Rate';
  if (pathname.startsWith('/billing')) return 'Billing';
  if (pathname.startsWith('/portfolio-trash') || pathname === '/trash') return 'Trash';

  // Project Level Pages (/projects/[projectId]/...)
  if (pathname.includes('/development/dashboard')) return 'Development Dashboard';
  if (pathname.includes('/development/backlog')) return 'Product Backlog';
  if (pathname.includes('/development/grooming')) return 'Grooming';
  if (pathname.includes('/development/kanban')) return 'Kanban Board';
  if (pathname.includes('/development/development-tasks')) return 'Sub-Tasks';
  if (pathname.includes('/development/defect-tracker')) return 'Defect Tracker';
  if (pathname.includes('/testing/dashboard')) return 'Test Dashboard';
  if (pathname.includes('/testing/test-backlog')) return 'Test Backlog';
  if (pathname.includes('/testing/test-plan') || pathname.includes('/testing/test-cycle')) return 'Test Cycle';
  if (pathname.includes('/testing/defects')) return 'Defects';
  if (pathname.includes('/testing/defect-tracker')) return 'Defect Tracker';
  if (pathname.includes('/project-details/project-status')) return 'Project Status';
  if (pathname.includes('/project-details/pm-dashboard')) return 'PM Dashboard';
  if (pathname.includes('/project-details/specifications')) return 'Specifications';
  if (pathname.includes('/initial-estimation/specifications')) return 'Specifications (Initial Estimation)';
  if (pathname.includes('/initial-estimation/project-status')) return 'Project Status (Initial Estimation)';
  if (pathname.includes('/releases/project-releases')) return 'Project Releases';
  if (pathname.includes('/resources/project-resources')) return 'Project Resources';
  if (pathname.includes('/resources/worklog')) return 'Worklog';
  if (pathname.includes('/resources/resource-workload')) return 'Resource Workload';
  if (pathname.includes('/resources/project-gantt')) return 'Project Gantt';
  if (pathname.includes('/raid-dashboard')) return 'RAID Dashboard';
  if (pathname.includes('/risks')) return 'Risks';
  if (pathname.includes('/assumptions')) return 'Assumptions';
  if (pathname.includes('/issues')) return 'Issues';
  if (pathname.includes('/dependencies')) return 'Dependencies';
  if (pathname.includes('/holidays/leave-calendar')) return 'Leave Calendar';
  if (pathname.endsWith('/holidays')) return 'Project Holiday Calendar';
  if (pathname.includes('/pmo/documents')) return 'PMO Documents';
  if (pathname.includes('/pmo/fb-billing')) return 'PMO FB Billing';
  if (pathname.includes('/pmo/fb-payment-milestones')) return 'PMO FB Payment Milestones';
  if (pathname.includes('/pmo/tnm-billing')) return 'PMO TnM Billing';
  if (pathname.includes('/pmo/tnm-payment-milestones')) return 'PMO TnM Payment Milestones';
  if (pathname.includes('/pmo/business-continuity')) return 'Business Continuity';
  if (pathname.includes('/project-settings/board') || pathname.includes('/settings/board')) return 'Board Settings';
  if (pathname.includes('/project-settings/sprint') || pathname.includes('/settings/sprint')) return 'Sprint Settings';
  if (pathname.includes('/project-settings/effort') || pathname.includes('/settings/effort')) return 'Effort Settings';
  if (pathname.includes('/project-settings') || pathname.includes('/settings')) return 'Board Settings';
  if (pathname.includes('/project-trash')) return 'Project Trash';

  return null;
}

export function hasPagePermission(
  role: string | null | undefined,
  pageName: string | null,
  customPageAccess?: Record<string, boolean> | null
): boolean {
  if (!pageName) return true; // No permission restriction required
  const userRole = (role || 'Team Member') as AccessLevel;
  if (userRole === 'Administrator') return true;

  const targetPages = pageName === 'Test Cycle' || pageName === 'Test Plan' 
    ? ['Test Cycle', 'Test Plan'] 
    : [pageName];

  if (customPageAccess) {
    for (const p of targetPages) {
      if (typeof customPageAccess[p] === 'boolean') {
        return customPageAccess[p];
      }
    }
  }

  const allowedDefaults = defaultAccessSettings[userRole as Exclude<AccessLevel, 'Administrator'>];
  if (allowedDefaults) {
    return targetPages.some(p => allowedDefaults.includes(p));
  }

  return false;
}
