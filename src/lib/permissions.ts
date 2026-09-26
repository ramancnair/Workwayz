import { AccessLevel } from '@/types';

export const defaultAccessSettings: Record<Exclude<AccessLevel, 'Administrator'>, string[]> = {
  'Senior Management': [
    'Project Home', 'Portfolio Dashboard', 'FP Portfolio Dash', 'FP Dashboard', 'Estimations', 'Defects', 'User List', 'Utilization', 'Holiday Calendar', 'Leave Settings', 'Leave Tracker', 'Billing', 'Billing Rate',
    'Development Dashboard', 'Product Backlog', 'Grooming', 'Kanban Board', 'Sub-Tasks', 'Defect Tracker', 'Test Dashboard', 'Test Backlog', 'Test Cycle', 'Test Plan', 'Test Execution', 'Defects', 'Project Status', 'PM Dashboard', 'FP PM Dash', 'Specifications', 'Specifications (Initial Estimation)', 'Project Status (Initial Estimation)', 'Project Releases', 'Project Resources', 'Worklog', 'Resource Workload', 'Project Gantt', 'RAID Dashboard', 'Risks', 'Assumptions', 'Issues', 'Dependencies', 'Project Holiday Calendar', 'Leave Calendar', 'PMO Documents', 'PMO FB Billing', 'PMO FB Payment Milestones', 'PMO TnM Billing', 'PMO TnM Payment Milestones', 'Business Continuity'
  ],
  'Project Manager': [
    'Project Home', 'FP Portfolio Dash', 'FP Dashboard', 'Estimations', 'Defects', 'User List', 'Utilization', 'Holiday Calendar', 'Leave Settings', 'Leave Tracker', 'Billing', 'Billing Rate',
    'Development Dashboard', 'Product Backlog', 'Grooming', 'Kanban Board', 'Sub-Tasks', 'Defect Tracker', 'Test Dashboard', 'Test Backlog', 'Test Cycle', 'Test Plan', 'Test Execution', 'Defects', 'Project Status', 'PM Dashboard', 'FP PM Dash', 'Specifications', 'Specifications (Initial Estimation)', 'Project Status (Initial Estimation)', 'Project Releases', 'Project Resources', 'Worklog', 'Resource Workload', 'Project Gantt', 'RAID Dashboard', 'Risks', 'Assumptions', 'Issues', 'Dependencies', 'Project Holiday Calendar', 'Leave Calendar', 'PMO Documents', 'PMO FB Billing', 'PMO FB Payment Milestones', 'PMO TnM Billing', 'PMO TnM Payment Milestones', 'Business Continuity', 'Board Settings', 'Sprint Settings', 'Effort Settings', 'Project Trash'
  ],
  'Lead': [
    'Project Home', 'User List', 'Holiday Calendar', 'Leave Tracker',
    'Development Dashboard', 'Product Backlog', 'Grooming', 'Kanban Board', 'Sub-Tasks', 'Defect Tracker', 'Test Dashboard', 'Test Backlog', 'Test Cycle', 'Test Plan', 'Test Execution', 'Defects', 'Project Status', 'Specifications', 'Project Releases', 'Project Resources', 'Worklog', 'Resource Workload', 'Project Gantt', 'RAID Dashboard', 'Risks', 'Assumptions', 'Issues', 'Dependencies', 'Project Holiday Calendar', 'Leave Calendar', 'PMO Documents', 'Business Continuity', 'Board Settings', 'Sprint Settings'
  ],
  'Team Member': [
    'Project Home', 'Leave Tracker',
    'Development Dashboard', 'Kanban Board', 'Sub-Tasks', 'Defect Tracker', 'Test Dashboard', 'Test Backlog', 'Test Execution', 'Defects', 'Project Status', 'Specifications', 'Project Resources', 'Worklog', 'RAID Dashboard', 'Project Holiday Calendar', 'PMO Documents'
  ],
  'PMO': [
    'Project Home', 'User List', 'Utilization', 'Holiday Calendar', 'Leave Tracker', 'Billing', 'Billing Rate',
    'Project Status', 'PM Dashboard', 'FP PM Dash', 'Project Releases', 'Project Resources', 'Worklog', 'Resource Workload', 'Project Gantt', 'PMO Documents', 'PMO FB Billing', 'PMO FB Payment Milestones', 'PMO TnM Billing', 'PMO TnM Payment Milestones', 'Business Continuity'
  ]
};

export function getPageNameForRoute(pathname: string): string | null {
  if (!pathname || pathname === '/' || pathname === '/login' || pathname === '/signup' || pathname === '/setup-wizard' || pathname.startsWith('/my-account') || pathname.startsWith('/messages') || pathname.startsWith('/my-projects')) {
    return null; // Public or universal profile/landing/messaging path (no specific role restriction)
  }

  // Admin Level Pages
  if (pathname.startsWith('/portfolio-settings/access-settings')) return 'Access Settings';
  if (pathname.startsWith('/portfolio-settings/database')) return 'Database';
  if (pathname.startsWith('/portfolio-settings/authentication')) return 'Authentication';
  if (pathname.startsWith('/portfolio-settings/ai-config')) return 'AI Config';
  if (pathname.startsWith('/portfolio-settings/archive')) return 'Archive';
  if (pathname.startsWith('/portfolio-settings/test-data-studio')) return 'Test Data Studio';
  if (pathname.startsWith('/portfolio-settings/system-update')) return 'System Update';
  if (pathname.startsWith('/portfolio-settings')) return 'Access Settings';

  // Portfolio Level Pages
  if (pathname.startsWith('/project-home')) return 'Project Home';
  if (pathname.startsWith('/portfolio-dashboard')) return 'Portfolio Dashboard';
  if (pathname.startsWith('/fp-portfolio-dash') || pathname.startsWith('/fp-dashboard') || pathname.startsWith('/fp-porfolio-dash')) return 'FP Portfolio Dash';

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
  if (pathname.includes('/testing/test-cases') || pathname.includes('/testing/test-backlog')) return 'Test Cases';
  if (pathname.includes('/testing/test-plan') || pathname.includes('/testing/test-cycle')) return 'Test Cycle';
  if (pathname.includes('/testing/test-execution')) return 'Test Execution';
  if (pathname.includes('/testing/defects')) return 'Defects';
  if (pathname.includes('/testing/defect-tracker')) return 'Defect Tracker';
  if (pathname.includes('/project-details/project-status')) return 'Project Status';
  if (pathname.includes('/project-details/pm-dashboard')) return 'PM Dashboard';
  if (pathname.includes('/project-details/fp-pm-dash')) return 'FP PM Dash';
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
  if (!pageName || pageName === 'My Projects') return true; // Universal landing page
  const userRole = (role || 'Team Member') as AccessLevel;
  if (userRole === 'Administrator') return true;

  const targetPages = pageName === 'Test Cycle' || pageName === 'Test Plan' 
    ? ['Test Cycle', 'Test Plan'] 
    : (pageName === 'Portfolio Trash' || pageName === 'Trash')
    ? ['Portfolio Trash', 'Trash']
    : (pageName === 'Test Cases' || pageName === 'Test Backlog' || pageName === 'Test Backlogs')
    ? ['Test Cases', 'Test Backlog', 'Test Backlogs']
    : (pageName === 'FP Portfolio Dash' || pageName === 'FP Dashboard')
    ? ['FP Portfolio Dash', 'FP Dashboard']
    : (pageName === 'FP PM Dash' || pageName === 'PM Dashboard')
    ? ['FP PM Dash', 'PM Dashboard']
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

export const allProjectPageNames = [
  'Specifications (Initial Estimation)',
  'Project Status (Initial Estimation)',
  'Project Status',
  'PM Dashboard',
  'FP PM Dash',
  'Specifications',
  'Project Resources',
  'Worklog',
  'Resource Workload',
  'Project Gantt',
  'Project Releases',
  'Development Dashboard',
  'Product Backlog',
  'Grooming',
  'Kanban Board',
  'Sub-Tasks',
  'Defect Tracker',
  'Test Dashboard',
  'Test Cases',
  'Test Backlog',
  'Test Cycle',
  'Test Plan',
  'Test Execution',
  'Defects',
  'RAID Dashboard',
  'Risks',
  'Assumptions',
  'Issues',
  'Dependencies',
  'Project Holiday Calendar',
  'Leave Calendar',
  'PMO Documents',
  'PMO FB Billing',
  'PMO FB Payment Milestones',
  'PMO TnM Billing',
  'PMO TnM Payment Milestones',
  'Business Continuity',
  'Board Settings',
  'Sprint Settings',
  'Effort Settings',
  'Project Trash',
];

export function hasAnyProjectPermission(
  role: string | null | undefined,
  customPageAccess?: Record<string, boolean> | null
): boolean {
  if (!role || role === 'Administrator') return true;
  return allProjectPageNames.some(pageName => hasPagePermission(role, pageName, customPageAccess));
}

export function getProjectLandingPage(
  projectId: string,
  projectStatus: string | undefined,
  role: string | null | undefined,
  customPageAccess?: Record<string, boolean> | null
): string | null {
  if (!projectId) return null;
  if (!role || role === 'Administrator') {
    return (projectStatus === 'Initial Estimation' || projectStatus === 'Not Started')
      ? `/projects/${projectId}/initial-estimation/specifications`
      : `/projects/${projectId}/development/dashboard`;
  }

  const basePath = `/projects/${projectId}`;

  const candidates = (projectStatus === 'Initial Estimation' || projectStatus === 'Not Started')
    ? [
        { name: 'Specifications (Initial Estimation)', path: `${basePath}/initial-estimation/specifications` },
        { name: 'Project Status (Initial Estimation)', path: `${basePath}/initial-estimation/project-status` },
        { name: 'Development Dashboard', path: `${basePath}/development/dashboard` },
        { name: 'Specifications', path: `${basePath}/project-details/specifications` },
        { name: 'Project Status', path: `${basePath}/project-details/project-status` },
        { name: 'Kanban Board', path: `${basePath}/development/kanban` },
        { name: 'Product Backlog', path: `${basePath}/development/backlog` },
        { name: 'Sub-Tasks', path: `${basePath}/development/development-tasks` },
        { name: 'Defect Tracker', path: `${basePath}/development/defect-tracker` },
        { name: 'Test Dashboard', path: `${basePath}/testing/dashboard` },
        { name: 'Test Cases', path: `${basePath}/testing/test-cases` },
        { name: 'Test Backlog', path: `${basePath}/testing/test-cases` },
        { name: 'Test Cycle', path: `${basePath}/testing/test-cycle` },
        { name: 'Test Execution', path: `${basePath}/testing/test-execution` },
        { name: 'Defects', path: `${basePath}/testing/defects` },
        { name: 'PM Dashboard', path: `${basePath}/project-details/pm-dashboard` },
        { name: 'FP PM Dash', path: `${basePath}/project-details/fp-pm-dash` },
        { name: 'Project Resources', path: `${basePath}/resources/project-resources` },
        { name: 'Worklog', path: `${basePath}/resources/worklog` },
        { name: 'Resource Workload', path: `${basePath}/resources/resource-workload` },
        { name: 'Project Gantt', path: `${basePath}/resources/project-gantt` },
        { name: 'Project Releases', path: `${basePath}/releases/project-releases` },
        { name: 'RAID Dashboard', path: `${basePath}/raid-dashboard` },
        { name: 'Risks', path: `${basePath}/risks` },
        { name: 'Assumptions', path: `${basePath}/assumptions` },
        { name: 'Issues', path: `${basePath}/issues` },
        { name: 'Dependencies', path: `${basePath}/dependencies` },
        { name: 'Project Holiday Calendar', path: `${basePath}/holidays` },
        { name: 'Leave Calendar', path: `${basePath}/holidays/leave-calendar` },
        { name: 'PMO Documents', path: `${basePath}/pmo/documents` },
        { name: 'PMO FB Billing', path: `${basePath}/pmo/fb-billing` },
        { name: 'PMO FB Payment Milestones', path: `${basePath}/pmo/fb-payment-milestones` },
        { name: 'PMO TnM Billing', path: `${basePath}/pmo/tnm-billing` },
        { name: 'PMO TnM Payment Milestones', path: `${basePath}/pmo/tnm-payment-milestones` },
        { name: 'Business Continuity', path: `${basePath}/pmo/business-continuity` },
        { name: 'Board Settings', path: `${basePath}/project-settings/board` },
        { name: 'Sprint Settings', path: `${basePath}/project-settings/sprint` },
        { name: 'Effort Settings', path: `${basePath}/project-settings/effort` },
        { name: 'Project Trash', path: `${basePath}/project-trash` },
      ]
    : [
        { name: 'Development Dashboard', path: `${basePath}/development/dashboard` },
        { name: 'Project Status', path: `${basePath}/project-details/project-status` },
        { name: 'Kanban Board', path: `${basePath}/development/kanban` },
        { name: 'Product Backlog', path: `${basePath}/development/backlog` },
        { name: 'Sub-Tasks', path: `${basePath}/development/development-tasks` },
        { name: 'Defect Tracker', path: `${basePath}/development/defect-tracker` },
        { name: 'Specifications', path: `${basePath}/project-details/specifications` },
        { name: 'PM Dashboard', path: `${basePath}/project-details/pm-dashboard` },
        { name: 'FP PM Dash', path: `${basePath}/project-details/fp-pm-dash` },
        { name: 'Test Dashboard', path: `${basePath}/testing/dashboard` },
        { name: 'Test Cases', path: `${basePath}/testing/test-cases` },
        { name: 'Test Backlog', path: `${basePath}/testing/test-cases` },
        { name: 'Test Cycle', path: `${basePath}/testing/test-cycle` },
        { name: 'Test Execution', path: `${basePath}/testing/test-execution` },
        { name: 'Defects', path: `${basePath}/testing/defects` },
        { name: 'Project Resources', path: `${basePath}/resources/project-resources` },
        { name: 'Worklog', path: `${basePath}/resources/worklog` },
        { name: 'Resource Workload', path: `${basePath}/resources/resource-workload` },
        { name: 'Project Gantt', path: `${basePath}/resources/project-gantt` },
        { name: 'Project Releases', path: `${basePath}/releases/project-releases` },
        { name: 'RAID Dashboard', path: `${basePath}/raid-dashboard` },
        { name: 'Risks', path: `${basePath}/risks` },
        { name: 'Assumptions', path: `${basePath}/assumptions` },
        { name: 'Issues', path: `${basePath}/issues` },
        { name: 'Dependencies', path: `${basePath}/dependencies` },
        { name: 'Specifications (Initial Estimation)', path: `${basePath}/initial-estimation/specifications` },
        { name: 'Project Status (Initial Estimation)', path: `${basePath}/initial-estimation/project-status` },
        { name: 'Project Holiday Calendar', path: `${basePath}/holidays` },
        { name: 'Leave Calendar', path: `${basePath}/holidays/leave-calendar` },
        { name: 'PMO Documents', path: `${basePath}/pmo/documents` },
        { name: 'PMO FB Billing', path: `${basePath}/pmo/fb-billing` },
        { name: 'PMO FB Payment Milestones', path: `${basePath}/pmo/fb-payment-milestones` },
        { name: 'PMO TnM Billing', path: `${basePath}/pmo/tnm-billing` },
        { name: 'PMO TnM Payment Milestones', path: `${basePath}/pmo/tnm-payment-milestones` },
        { name: 'Business Continuity', path: `${basePath}/pmo/business-continuity` },
        { name: 'Board Settings', path: `${basePath}/project-settings/board` },
        { name: 'Sprint Settings', path: `${basePath}/project-settings/sprint` },
        { name: 'Effort Settings', path: `${basePath}/project-settings/effort` },
        { name: 'Project Trash', path: `${basePath}/project-trash` },
      ];

  for (const c of candidates) {
    if (hasPagePermission(role, c.name, customPageAccess)) {
      return c.path;
    }
  }

  return null;
}

export function getPermittedFallbackRoute(
  pathname: string,
  role: string | null | undefined,
  customPageAccess?: Record<string, boolean> | null
): string | null {
  if (!pathname || role === 'Administrator') return null;

  // Project workspace check
  const projectMatch = pathname.match(/^\/projects\/([^\/]+)/);
  if (projectMatch) {
    const projectId = projectMatch[1];
    const basePath = `/projects/${projectId}`;

    // 1. Sibling candidate groups within the active project module
    const projectModuleGroups: Array<{ prefix: string; candidates: Array<{ name: string; path: string }> }> = [
      {
        prefix: `${basePath}/pmo`,
        candidates: [
          { name: 'PMO Documents', path: `${basePath}/pmo/documents` },
          { name: 'PMO FB Billing', path: `${basePath}/pmo/fb-billing` },
          { name: 'PMO FB Payment Milestones', path: `${basePath}/pmo/fb-payment-milestones` },
          { name: 'PMO TnM Billing', path: `${basePath}/pmo/tnm-billing` },
          { name: 'PMO TnM Payment Milestones', path: `${basePath}/pmo/tnm-payment-milestones` },
          { name: 'Business Continuity', path: `${basePath}/pmo/business-continuity` },
        ],
      },
      {
        prefix: `${basePath}/development`,
        candidates: [
          { name: 'Development Dashboard', path: `${basePath}/development/dashboard` },
          { name: 'Product Backlog', path: `${basePath}/development/backlog` },
          { name: 'Grooming', path: `${basePath}/development/grooming` },
          { name: 'Kanban Board', path: `${basePath}/development/kanban` },
          { name: 'Sub-Tasks', path: `${basePath}/development/development-tasks` },
          { name: 'Defect Tracker', path: `${basePath}/development/defect-tracker` },
        ],
      },
      {
        prefix: `${basePath}/testing`,
        candidates: [
          { name: 'Test Dashboard', path: `${basePath}/testing/dashboard` },
          { name: 'Test Cases', path: `${basePath}/testing/test-cases` },
          { name: 'Test Backlogs', path: `${basePath}/testing/test-cases` },
          { name: 'Test Backlog', path: `${basePath}/testing/test-cases` },
          { name: 'Test Cycles', path: `${basePath}/testing/test-cycle` },
          { name: 'Test Cycle', path: `${basePath}/testing/test-cycle` },
          { name: 'Test Executions', path: `${basePath}/testing/test-execution` },
          { name: 'Test Execution', path: `${basePath}/testing/test-execution` },
          { name: 'Defects', path: `${basePath}/testing/defects` },
          { name: 'Defect Tracker', path: `${basePath}/testing/defect-tracker` },
        ],
      },
      {
        prefix: `${basePath}/project-details`,
        candidates: [
          { name: 'Project Status', path: `${basePath}/project-details/project-status` },
          { name: 'PM Dashboard', path: `${basePath}/project-details/pm-dashboard` },
          { name: 'FP PM Dash', path: `${basePath}/project-details/fp-pm-dash` },
          { name: 'Specifications', path: `${basePath}/project-details/specifications` },
        ],
      },
      {
        prefix: `${basePath}/initial-estimation`,
        candidates: [
          { name: 'Specifications (Initial Estimation)', path: `${basePath}/initial-estimation/specifications` },
          { name: 'Project Status (Initial Estimation)', path: `${basePath}/initial-estimation/project-status` },
        ],
      },
      {
        prefix: `${basePath}/resources`,
        candidates: [
          { name: 'Project Resources', path: `${basePath}/resources/project-resources` },
          { name: 'Worklog', path: `${basePath}/resources/worklog` },
          { name: 'Resource Workload', path: `${basePath}/resources/resource-workload` },
          { name: 'Project Gantt', path: `${basePath}/resources/project-gantt` },
        ],
      },
      {
        prefix: `${basePath}/releases`,
        candidates: [
          { name: 'Project Releases', path: `${basePath}/releases/project-releases` },
        ],
      },
      {
        prefix: `${basePath}/holidays`,
        candidates: [
          { name: 'Project Holiday Calendar', path: `${basePath}/holidays` },
          { name: 'Leave Calendar', path: `${basePath}/holidays/leave-calendar` },
        ],
      },
      {
        prefix: `${basePath}/project-settings`,
        candidates: [
          { name: 'Board Settings', path: `${basePath}/project-settings/board` },
          { name: 'Sprint Settings', path: `${basePath}/project-settings/sprint` },
          { name: 'Effort Settings', path: `${basePath}/project-settings/effort` },
        ],
      },
    ];

    // Governance prefixes
    const isGov = ['/raid-dashboard', '/risks', '/assumptions', '/issues', '/dependencies'].some(p => pathname.startsWith(basePath + p));
    if (isGov) {
      const govCandidates = [
        { name: 'RAID Dashboard', path: `${basePath}/raid-dashboard` },
        { name: 'Risks', path: `${basePath}/risks` },
        { name: 'Assumptions', path: `${basePath}/assumptions` },
        { name: 'Issues', path: `${basePath}/issues` },
        { name: 'Dependencies', path: `${basePath}/dependencies` },
      ];
      for (const c of govCandidates) {
        if (hasPagePermission(role, c.name, customPageAccess)) {
          return c.path;
        }
      }
    }

    // Match module group
    const matchingModule = projectModuleGroups.find(g => pathname.startsWith(g.prefix));
    if (matchingModule) {
      for (const candidate of matchingModule.candidates) {
        if (hasPagePermission(role, candidate.name, customPageAccess)) {
          return candidate.path;
        }
      }
    }

    // If no sibling in the same module is permitted, search across all project modules for a permitted landing page
    const allProjectCandidates = [
      { name: 'Development Dashboard', path: `${basePath}/development/dashboard` },
      { name: 'Project Status', path: `${basePath}/project-details/project-status` },
      { name: 'Kanban Board', path: `${basePath}/development/kanban` },
      { name: 'Specifications', path: `${basePath}/project-details/specifications` },
      { name: 'Project Resources', path: `${basePath}/resources/project-resources` },
      { name: 'RAID Dashboard', path: `${basePath}/raid-dashboard` },
      { name: 'Test Dashboard', path: `${basePath}/testing/dashboard` },
      { name: 'Project Holiday Calendar', path: `${basePath}/holidays` },
      { name: 'Business Continuity', path: `${basePath}/pmo/business-continuity` },
      { name: 'PMO Documents', path: `${basePath}/pmo/documents` },
      { name: 'Project Releases', path: `${basePath}/releases/project-releases` },
    ];

    for (const c of allProjectCandidates) {
      if (hasPagePermission(role, c.name, customPageAccess)) {
        return c.path;
      }
    }

    return '/my-projects';
  }

  // 2. Portfolio-level checks
  const portfolioGroups: Array<{ prefix: string; candidates: Array<{ name: string; path: string }> }> = [
    {
      prefix: '/quality',
      candidates: [
        { name: 'Estimations', path: '/quality/estimations' },
        { name: 'Defects', path: '/quality/defects' },
      ],
    },
    {
      prefix: '/billing',
      candidates: [
        { name: 'Billing', path: '/billing' },
        { name: 'Billing Rate', path: '/billing-rate' },
      ],
    },
    {
      prefix: '/users',
      candidates: [
        { name: 'User List', path: '/users' },
        { name: 'Utilization', path: '/utilization' },
      ],
    },
    {
      prefix: '/utilization',
      candidates: [
        { name: 'User List', path: '/users' },
        { name: 'Utilization', path: '/utilization' },
      ],
    },
    {
      prefix: '/holidays',
      candidates: [
        { name: 'Holiday Calendar', path: '/holidays/holiday-calendar' },
        { name: 'Leave Settings', path: '/holidays/leave-settings' },
        { name: 'Leave Tracker', path: '/holidays/leave-tracker' },
      ],
    },
    {
      prefix: '/portfolio-settings',
      candidates: [
        { name: 'Access Settings', path: '/portfolio-settings/access-settings' },
        { name: 'Database', path: '/portfolio-settings/database' },
        { name: 'Authentication', path: '/portfolio-settings/authentication' },
        { name: 'AI Config', path: '/portfolio-settings/ai-config' },
        { name: 'Archive', path: '/portfolio-settings/archive' },
        { name: 'Test Data Studio', path: '/portfolio-settings/test-data-studio' },
      ],
    },
    {
      prefix: '/project-home',
      candidates: [
        { name: 'Project Home', path: '/project-home' },
        { name: 'Portfolio Dashboard', path: '/portfolio-dashboard' },
        { name: 'FP Portfolio Dash', path: '/fp-portfolio-dash' },
      ],
    },
    {
      prefix: '/portfolio-dashboard',
      candidates: [
        { name: 'Portfolio Dashboard', path: '/portfolio-dashboard' },
        { name: 'FP Portfolio Dash', path: '/fp-portfolio-dash' },
        { name: 'Project Home', path: '/project-home' },
      ],
    },
    {
      prefix: '/fp-portfolio-dash',
      candidates: [
        { name: 'FP Portfolio Dash', path: '/fp-portfolio-dash' },
        { name: 'Portfolio Dashboard', path: '/portfolio-dashboard' },
        { name: 'Project Home', path: '/project-home' },
      ],
    },
    {
      prefix: '/fp-dashboard',
      candidates: [
        { name: 'FP Portfolio Dash', path: '/fp-portfolio-dash' },
        { name: 'Portfolio Dashboard', path: '/portfolio-dashboard' },
        { name: 'Project Home', path: '/project-home' },
      ],
    },

  ];

  const matchingPort = portfolioGroups.find(g => pathname.startsWith(g.prefix));
  if (matchingPort) {
    for (const c of matchingPort.candidates) {
      if (hasPagePermission(role, c.name, customPageAccess)) {
        return c.path;
      }
    }
  }

  return '/my-projects';
}
