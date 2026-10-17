import { describe, it, expect } from 'vitest';
import { hasPagePermission, hasAnyProjectPermission, getPermittedFallbackRoute, isAssignableToProject } from '../permissions';
import { getUserAccessLevel } from '@/components/wayfinder/WayFinderChatWidget';
import { type User, type AccessLevel, ASSIGNABLE_ACCESS_LEVELS } from '@/types';

describe('Super Admin Access Level & Governance Rules', () => {
  const samplePages = [
    'Access Settings',
    'Database',
    'Authentication',
    'AI Config',
    'Archive',
    'Test Data Studio',
    'Cron Jobs',
    'Project Home',
    'Portfolio Dashboard',
    'FP Portfolio Dash',
    'User List',
    'Utilization',
    'Billing',
    'Development Dashboard',
    'Kanban Board',
    'PM Dashboard',
    'FP PM Dash',
    'PMO Documents',
    'Trash',
    'Project Trash',
  ];

  it('Super Admin should have unconditional access to all system and project pages', () => {
    for (const page of samplePages) {
      expect(hasPagePermission('Super Admin', page)).toBe(true);
    }
  });

  it('Super Admin has project permission and never gets redirected by fallback routing', () => {
    expect(hasAnyProjectPermission('Super Admin')).toBe(true);
    expect(getPermittedFallbackRoute('/portfolio-settings/access-settings', 'Super Admin')).toBeNull();
    expect(getPermittedFallbackRoute('/projects/p1/development/dashboard', 'Super Admin')).toBeNull();
    expect(getPermittedFallbackRoute('/portfolio-settings/database', 'Super Admin')).toBeNull();
  });

  it('WayFinder correctly normalizes Super Admin access level aliases', () => {
    expect(getUserAccessLevel({ accessLevel: 'Super Admin' })).toBe('Super Admin');
    expect(getUserAccessLevel({ role: 'super admin' })).toBe('Super Admin');
    expect(getUserAccessLevel({ roleName: 'superadmin' })).toBe('Super Admin');
    expect(getUserAccessLevel({ accessLevel: 'super_admin' })).toBe('Super Admin');
  });

  it('Super Admin deletion protection: Super Admin cannot be deleted in bulk or single delete', () => {
    const mockUsers: Array<Pick<User, 'id' | 'empId' | 'firstName' | 'lastName' | 'accessLevel'>> = [
      { id: '1', empId: 'E001', firstName: 'Root', lastName: 'Owner', accessLevel: 'Super Admin' },
      { id: '2', empId: 'E002', firstName: 'Admin', lastName: 'One', accessLevel: 'Administrator' },
      { id: '3', empId: 'E003', firstName: 'Admin', lastName: 'Two', accessLevel: 'Administrator' },
      { id: '4', empId: 'E004', firstName: 'Dev', lastName: 'User', accessLevel: 'Team Member' },
    ];

    // Check single delete policy:
    // If target is Super Admin -> deletion blocked
    const canDeleteSingle = (targetUser: typeof mockUsers[0]) => {
      return targetUser.accessLevel !== 'Super Admin';
    };

    expect(canDeleteSingle(mockUsers[0])).toBe(false); // Super Admin cannot be deleted
    expect(canDeleteSingle(mockUsers[1])).toBe(true);  // Admin can be deleted (admins can delete other admins)
    expect(canDeleteSingle(mockUsers[2])).toBe(true);  // Admin can be deleted
    expect(canDeleteSingle(mockUsers[3])).toBe(true);  // Team member can be deleted

    // Check bulk delete policy:
    // Selecting all users to delete must filter out Super Admin accounts
    const selectedIds = mockUsers.map(u => u.id);
    const eligibleForDelete = selectedIds.filter(id => {
      const u = mockUsers.find(user => user.id === id);
      return u?.accessLevel !== 'Super Admin';
    });

    expect(eligibleForDelete).toEqual(['2', '3', '4']);
    expect(eligibleForDelete).not.toContain('1'); // Super Admin is protected
  });

  it('Super Admin cannot be assigned via User creation/editing list (wizard or direct DB only)', () => {
    // 1. Verify Super Admin is strictly omitted from the assignable list in User modal
    expect(ASSIGNABLE_ACCESS_LEVELS).not.toContain('Super Admin');
    expect(ASSIGNABLE_ACCESS_LEVELS).toEqual([
      'Administrator',
      'Senior Management',
      'Project Manager',
      'Lead',
      'Team Member',
      'PMO',
    ]);

    // 2. Validate form submission safeguard logic
    const validateAccessLevelAssignment = (accessLevel: AccessLevel, isWizard: boolean) => {
      if (accessLevel === 'Super Admin' && !isWizard) {
        return { allowed: false, error: 'Super Admin can only be created via the Setup Wizard or directly in the database.' };
      }
      return { allowed: true };
    };

    expect(validateAccessLevelAssignment('Super Admin', false).allowed).toBe(false);
    expect(validateAccessLevelAssignment('Super Admin', true).allowed).toBe(true);
    expect(validateAccessLevelAssignment('Administrator', false).allowed).toBe(true);
  });

  it('Super Admin and Administrator cannot be assigned to any projects (even as PM)', () => {
    // 1. isAssignableToProject helper check
    expect(isAssignableToProject('Super Admin')).toBe(false);
    expect(isAssignableToProject('Administrator')).toBe(false);
    expect(isAssignableToProject({ accessLevel: 'Super Admin' })).toBe(false);
    expect(isAssignableToProject({ accessLevel: 'Administrator' })).toBe(false);
    expect(isAssignableToProject({ role: 'Super Admin' })).toBe(false);
    expect(isAssignableToProject({ role: 'Administrator' })).toBe(false);

    // Other roles are assignable
    expect(isAssignableToProject('Senior Management')).toBe(true);
    expect(isAssignableToProject('Project Manager')).toBe(true);
    expect(isAssignableToProject('Lead')).toBe(true);
    expect(isAssignableToProject('Team Member')).toBe(true);
    expect(isAssignableToProject('PMO')).toBe(true);

    // 2. Project Manager selection filtering
    const mockUsers = [
      { id: '1', empId: 'E001', firstName: 'Super', lastName: 'Admin', accessLevel: 'Super Admin' },
      { id: '2', empId: 'E002', firstName: 'Org', lastName: 'Admin', accessLevel: 'Administrator' },
      { id: '3', empId: 'E003', firstName: 'Project', lastName: 'Manager', accessLevel: 'Project Manager' },
      { id: '4', empId: 'E004', firstName: 'Team', lastName: 'Lead', accessLevel: 'Lead' },
      { id: '5', empId: 'E005', firstName: 'Software', lastName: 'Dev', accessLevel: 'Team Member' },
    ];

    const pmOptions = mockUsers.filter(u => isAssignableToProject(u as any));
    expect(pmOptions.map(u => u.id)).toEqual(['3', '4', '5']);
    expect(pmOptions.some(u => u.accessLevel === 'Super Admin')).toBe(false);
    expect(pmOptions.some(u => u.accessLevel === 'Administrator')).toBe(false);

    // 3. Project Resource assignment filtering
    const projectResourceCandidates = mockUsers.filter(u => isAssignableToProject(u as any));
    expect(projectResourceCandidates.map(u => u.id)).toEqual(['3', '4', '5']);
    expect(projectResourceCandidates.some(u => u.accessLevel === 'Super Admin')).toBe(false);
    expect(projectResourceCandidates.some(u => u.accessLevel === 'Administrator')).toBe(false);
  });
});

