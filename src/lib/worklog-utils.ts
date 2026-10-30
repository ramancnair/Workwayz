import type { Story } from '@/types';

export interface ProjectSummary {
  id: string;
  name: string;
  status: string;
}

export interface ResourceMember {
  id?: string;
  empId?: string;
  userId?: string;
  email?: string;
  clientEmail?: string;
}

export interface ProjectCandidate {
  id: string;
  name?: string;
  projectName?: string;
  status?: string;
  isArchived?: boolean;
  projectManagerId?: string;
}

/**
 * Checks whether an employee is actively allocated to a project (as PM or as a team resource).
 */
export function isEmployeeAllocatedToProject(
  project: ProjectCandidate,
  targetEmpId: string,
  targetEmail: string,
  resources: ResourceMember[] = []
): boolean {
  const normalizedEmpId = targetEmpId.trim().toLowerCase();
  const normalizedEmail = targetEmail.trim().toLowerCase();

  if (!normalizedEmpId && !normalizedEmail) return false;

  // 1. Check if user is Project Manager
  const pmId = (project.projectManagerId || '').trim().toLowerCase();
  if (pmId && (pmId === normalizedEmpId || (normalizedEmail && pmId === normalizedEmail))) {
    return true;
  }

  // 2. Check if user is in project resources sub-collection
  return resources.some((member) => {
    const mId = (member.id || '').trim().toLowerCase();
    const mEmpId = (member.empId || '').trim().toLowerCase();
    const mUserId = (member.userId || '').trim().toLowerCase();
    const mEmail = (member.email || member.clientEmail || '').trim().toLowerCase();

    const matchesId =
      (mId && mId === normalizedEmpId) ||
      (mEmpId && mEmpId === normalizedEmpId) ||
      (mUserId && mUserId === normalizedEmpId);

    const matchesEmail = normalizedEmail && mEmail && mEmail === normalizedEmail;

    return Boolean(matchesId || matchesEmail);
  });
}

/**
 * Filters active projects to only those where the target employee is allocated.
 */
export function filterAllocatedProjects(
  projects: ProjectCandidate[],
  targetEmpId: string,
  targetEmail: string,
  resourcesByProjectId: Record<string, ResourceMember[]> = {}
): ProjectSummary[] {
  const activeProjects = projects.filter(
    (p) => !p.isArchived && (p.status === 'Active' || !p.status) && p.id !== 'other'
  );

  const matched: ProjectSummary[] = [];

  activeProjects.forEach((p) => {
    const resources = resourcesByProjectId[p.id] || [];
    if (isEmployeeAllocatedToProject(p, targetEmpId, targetEmail, resources)) {
      matched.push({
        id: p.id,
        name: p.name || p.projectName || p.id,
        status: p.status || 'Active',
      });
    }
  });

  return matched.sort((a, b) => a.name.localeCompare(b.name));
}

export interface WorkItemOption {
  value: string;
  label: string;
  group: string;
}

/**
 * Returns the work item options for a given project ID, including the general options
 * and specific work options for 'other'.
 */
export function getWorkItemOptionsForProject(
  projId: string,
  stories: Story[] = []
): WorkItemOption[] {
  if (projId === 'other') {
    return [
      { value: 'other', label: 'Other', group: 'General' },
      { value: 'meeting', label: 'Meeting', group: 'General' },
      { value: 'training', label: 'Training / Skill Development', group: 'General' },
      { value: 'admin', label: 'Administrative Tasks', group: 'General' },
      { value: 'bench', label: 'Bench / Unallocated', group: 'General' },
      { value: 'holiday', label: 'Holiday', group: 'General' },
      { value: 'weekend', label: 'Weekend', group: 'General' },
    ];
  }

  const storyOptions = stories.map((s) => ({
    value: s.id,
    label: `[${s.storyId}] ${s.title}`,
    group: s.itemType || 'WorkItem',
  }));

  const generalOptions = [
    { value: 'meeting', label: 'Meeting', group: 'General' },
    { value: 'other', label: 'Other', group: 'General' },
    { value: 'holiday', label: 'Holiday', group: 'General' },
    { value: 'weekend', label: 'Weekend', group: 'General' },
  ];

  return [...generalOptions, ...storyOptions];
}
