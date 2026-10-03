import { describe, it, expect } from 'vitest';
import {
  getPageNameForRoute,
  hasPagePermission,
  defaultAccessSettings,
} from '../permissions';

describe('ProjectFlow Permissions Matrix', () => {
  describe('Route to Page Name Resolution (getPageNameForRoute)', () => {
    it('should return null for public or universal paths', () => {
      expect(getPageNameForRoute('/')).toBeNull();
      expect(getPageNameForRoute('/login')).toBeNull();
      expect(getPageNameForRoute('/signup')).toBeNull();
      expect(getPageNameForRoute('/my-projects')).toBeNull();
      expect(getPageNameForRoute('/my-account')).toBeNull();
    });

    it('should resolve portfolio-level routes correctly', () => {
      expect(getPageNameForRoute('/project-home')).toBe('Project Home');
      expect(getPageNameForRoute('/portfolio-dashboard')).toBe('Portfolio Dashboard');
      expect(getPageNameForRoute('/fp-portfolio-dash')).toBe('FP Portfolio Dash');
      expect(getPageNameForRoute('/fp-dashboard')).toBe('FP Portfolio Dash');
      expect(getPageNameForRoute('/quality/estimations')).toBe('Estimations');
      expect(getPageNameForRoute('/quality/defects')).toBe('Defects');
      expect(getPageNameForRoute('/users')).toBe('User List');
      expect(getPageNameForRoute('/utilization')).toBe('Utilization');
      expect(getPageNameForRoute('/holidays/holiday-calendar')).toBe('Holiday Calendar');
      expect(getPageNameForRoute('/billing')).toBe('Billing');
      expect(getPageNameForRoute('/portfolio-trash')).toBe('Trash');
    });

    it('should resolve project-level routes correctly', () => {
      const pid = 'proj-123';
      expect(getPageNameForRoute(`/projects/${pid}/development/dashboard`)).toBe('Development Dashboard');
      expect(getPageNameForRoute(`/projects/${pid}/development/backlog`)).toBe('Product Backlog');
      expect(getPageNameForRoute(`/projects/${pid}/development/kanban`)).toBe('Kanban Board');
      expect(getPageNameForRoute(`/projects/${pid}/testing/dashboard`)).toBe('Test Dashboard');
      expect(getPageNameForRoute(`/projects/${pid}/testing/test-cases`)).toBe('Test Cases');
      expect(getPageNameForRoute(`/projects/${pid}/project-details/pm-dashboard`)).toBe('PM Dashboard');
      expect(getPageNameForRoute(`/projects/${pid}/project-details/fp-pm-dash`)).toBe('FP PM Dash');
      expect(getPageNameForRoute(`/projects/${pid}/raid-dashboard`)).toBe('RAID Dashboard');
      expect(getPageNameForRoute(`/projects/${pid}/risks`)).toBe('Risks');
      expect(getPageNameForRoute(`/projects/${pid}/resources/project-resources`)).toBe('Project Resources');
      expect(getPageNameForRoute(`/projects/${pid}/releases/project-releases`)).toBe('Project Releases');
    });
  });

  describe('Role-Based Access Control (hasPagePermission)', () => {
    it('Administrator should have universal access across all pages', () => {
      const allPages = [
        'Access Settings', 'Database', 'Authentication', 'AI Config',
        'Project Home', 'Portfolio Dashboard', 'Billing', 'Billing Rate',
        'Kanban Board', 'Product Backlog', 'Test Execution', 'Risks', 'Project Trash'
      ];
      for (const page of allPages) {
        expect(hasPagePermission('Administrator', page)).toBe(true);
      }
    });

    it('Super Admin should have universal access across all pages', () => {
      const allPages = [
        'Access Settings', 'Database', 'Authentication', 'AI Config',
        'Project Home', 'Portfolio Dashboard', 'Billing', 'Billing Rate',
        'Kanban Board', 'Product Backlog', 'Test Execution', 'Risks', 'Project Trash'
      ];
      for (const page of allPages) {
        expect(hasPagePermission('Super Admin', page)).toBe(true);
      }
    });

    it('My Projects should be universally accessible to any role', () => {
      expect(hasPagePermission('Team Member', 'My Projects')).toBe(true);
      expect(hasPagePermission('Project Manager', 'My Projects')).toBe(true);
      expect(hasPagePermission(null, 'My Projects')).toBe(true);
    });

    it('Team Member should only have access to designated execution views', () => {
      // Allowed
      expect(hasPagePermission('Team Member', 'Kanban Board')).toBe(true);
      expect(hasPagePermission('Team Member', 'Development Dashboard')).toBe(true);
      expect(hasPagePermission('Team Member', 'Sub-Tasks')).toBe(true);
      expect(hasPagePermission('Team Member', 'Defects')).toBe(true);

      // Denied
      expect(hasPagePermission('Team Member', 'Portfolio Dashboard')).toBe(false);
      expect(hasPagePermission('Team Member', 'Access Settings')).toBe(false);
      expect(hasPagePermission('Team Member', 'Billing')).toBe(false);
      expect(hasPagePermission('Team Member', 'Board Settings')).toBe(false);
    });

    it('Project Manager should have broad project management and settings access', () => {
      expect(hasPagePermission('Project Manager', 'Project Home')).toBe(true);
      expect(hasPagePermission('Project Manager', 'Product Backlog')).toBe(true);
      expect(hasPagePermission('Project Manager', 'Grooming')).toBe(true);
      expect(hasPagePermission('Project Manager', 'Kanban Board')).toBe(true);
      expect(hasPagePermission('Project Manager', 'PM Dashboard')).toBe(true);
      expect(hasPagePermission('Project Manager', 'Board Settings')).toBe(true);
      expect(hasPagePermission('Project Manager', 'Project Trash')).toBe(true);
      // Denied system-level
      expect(hasPagePermission('Project Manager', 'Access Settings')).toBe(false);
    });

    it('PMO should have financial and governance access', () => {
      expect(hasPagePermission('PMO', 'Billing')).toBe(true);
      expect(hasPagePermission('PMO', 'Billing Rate')).toBe(true);
      expect(hasPagePermission('PMO', 'Utilization')).toBe(true);
      expect(hasPagePermission('PMO', 'PM Dashboard')).toBe(true);
      expect(hasPagePermission('PMO', 'PMO Documents')).toBe(true);
      // Denied development operations
      expect(hasPagePermission('PMO', 'Grooming')).toBe(false);
    });

    it('FP PM Dash should match PM Dashboard visibility across all roles', () => {
      // Allowed roles
      expect(hasPagePermission('Administrator', 'FP PM Dash')).toBe(true);
      expect(hasPagePermission('Senior Management', 'FP PM Dash')).toBe(true);
      expect(hasPagePermission('Project Manager', 'FP PM Dash')).toBe(true);
      expect(hasPagePermission('PMO', 'FP PM Dash')).toBe(true);

      // Denied roles
      expect(hasPagePermission('Lead', 'FP PM Dash')).toBe(false);
      expect(hasPagePermission('Team Member', 'FP PM Dash')).toBe(false);

      // Custom override on PM Dashboard should cascade to FP PM Dash
      const customOverrides = { 'PM Dashboard': true };
      expect(hasPagePermission('Team Member', 'FP PM Dash', customOverrides)).toBe(true);
    });

    it('Custom page access overrides should be respected', () => {
      const customOverrides = {
        'Billing': true,
        'Kanban Board': false,
      };
      // Team Member normally has NO Billing access, but override enables it
      expect(hasPagePermission('Team Member', 'Billing', customOverrides)).toBe(true);
      // Team Member normally HAS Kanban Board access, but override disables it
      expect(hasPagePermission('Team Member', 'Kanban Board', customOverrides)).toBe(false);
    });
  });
});
