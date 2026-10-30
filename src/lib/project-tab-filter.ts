import type { Project } from '@/types';

export type ProjectDashboardTab = 'active' | 'initial-estimates' | 'archive';

/**
 * Determines whether a given project belongs to a specific dashboard tab.
 *
 * Rules:
 * - 'active': Contains ONLY active projects (status: 'Active' and !isArchived).
 * - 'initial-estimates': Contains all projects in Initial Estimate state (status: 'Initial Estimation' or 'Not Started').
 * - 'archive' (Inactive Projects): Contains ONLY 'On Hold', 'Completed', and 'Cancelled' projects (or marked inactive).
 */
export function matchesProjectTab(project: Project, tab: ProjectDashboardTab): boolean {
  const status = project.status;

  if (tab === 'active') {
    return status === 'Active' && !project.isArchived;
  }

  if (tab === 'initial-estimates') {
    // Initial Estimates tab lists all projects in Initial Estimate state (including active or inactive)
    return (
      status === 'Initial Estimation' ||
      status === 'Not Started' ||
      (!status || !['Active', 'On Hold', 'Completed', 'Cancelled'].includes(status))
    );
  }

  if (tab === 'archive') {
    // Inactive projects contains ONLY On Hold, Completed, and Cancelled projects
    return (
      status === 'On Hold' ||
      status === 'Completed' ||
      status === 'Cancelled' ||
      (!!project.isArchived && status !== 'Active' && status !== 'Initial Estimation' && status !== 'Not Started')
    );
  }

  return false;
}

/**
 * Returns summary counts for projects in a portfolio partitioned across dashboard tabs.
 */
export function getPortfolioTabStats(projects: Project[]) {
  const nonDeleted = projects.filter(p => !p.isDeleted);
  return {
    total: nonDeleted.length,
    active: nonDeleted.filter(p => matchesProjectTab(p, 'active')).length,
    initialEstimates: nonDeleted.filter(p => matchesProjectTab(p, 'initial-estimates')).length,
    inactive: nonDeleted.filter(p => matchesProjectTab(p, 'archive')).length,
  };
}

