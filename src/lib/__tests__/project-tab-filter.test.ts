import { describe, it, expect } from 'vitest';
import { matchesProjectTab, getPortfolioTabStats } from '../project-tab-filter';
import type { Project } from '@/types';

describe('project-tab-filter utility', () => {
  const baseProject: Project = {
    id: 'P2600001',
    name: 'Sample Project',
    portfolioId: 'PF001',
  };

  describe('Active Projects tab', () => {
    it('matches only projects with status "Active" and not archived', () => {
      const activeProj: Project = { ...baseProject, status: 'Active', isArchived: false };
      expect(matchesProjectTab(activeProj, 'active')).toBe(true);

      const archivedActiveProj: Project = { ...baseProject, status: 'Active', isArchived: true };
      expect(matchesProjectTab(archivedActiveProj, 'active')).toBe(false);

      const initialProj: Project = { ...baseProject, status: 'Initial Estimation' };
      expect(matchesProjectTab(initialProj, 'active')).toBe(false);

      const onHoldProj: Project = { ...baseProject, status: 'On Hold' };
      expect(matchesProjectTab(onHoldProj, 'active')).toBe(false);

      const completedProj: Project = { ...baseProject, status: 'Completed' };
      expect(matchesProjectTab(completedProj, 'active')).toBe(false);

      const cancelledProj: Project = { ...baseProject, status: 'Cancelled' };
      expect(matchesProjectTab(cancelledProj, 'active')).toBe(false);
    });
  });

  describe('Initial Estimates tab', () => {
    it('matches projects in Initial Estimation or Not Started state', () => {
      const initialProj: Project = { ...baseProject, status: 'Initial Estimation' };
      expect(matchesProjectTab(initialProj, 'initial-estimates')).toBe(true);

      const notStartedProj: Project = { ...baseProject, status: 'Not Started' };
      expect(matchesProjectTab(notStartedProj, 'initial-estimates')).toBe(true);

      // Matches initial estimation projects even if marked inactive
      const archivedInitialProj: Project = { ...baseProject, status: 'Initial Estimation', isArchived: true };
      expect(matchesProjectTab(archivedInitialProj, 'initial-estimates')).toBe(true);

      const activeProj: Project = { ...baseProject, status: 'Active' };
      expect(matchesProjectTab(activeProj, 'initial-estimates')).toBe(false);

      const onHoldProj: Project = { ...baseProject, status: 'On Hold' };
      expect(matchesProjectTab(onHoldProj, 'initial-estimates')).toBe(false);
    });

    it('falls back to initial-estimates if status is missing or unspecified', () => {
      const unassignedStatusProj: Project = { ...baseProject, status: undefined };
      expect(matchesProjectTab(unassignedStatusProj, 'initial-estimates')).toBe(true);
    });
  });

  describe('Inactive Projects tab (archive)', () => {
    it('contains only On Hold, Completed, and Cancelled projects', () => {
      const onHoldProj: Project = { ...baseProject, status: 'On Hold' };
      expect(matchesProjectTab(onHoldProj, 'archive')).toBe(true);

      const completedProj: Project = { ...baseProject, status: 'Completed' };
      expect(matchesProjectTab(completedProj, 'archive')).toBe(true);

      const cancelledProj: Project = { ...baseProject, status: 'Cancelled' };
      expect(matchesProjectTab(cancelledProj, 'archive')).toBe(true);

      const activeProj: Project = { ...baseProject, status: 'Active' };
      expect(matchesProjectTab(activeProj, 'archive')).toBe(false);

      const initialProj: Project = { ...baseProject, status: 'Initial Estimation' };
      expect(matchesProjectTab(initialProj, 'archive')).toBe(false);
    });
  });

  describe('getPortfolioTabStats', () => {
    it('partitions portfolio projects across active, initial estimates, and inactive counts', () => {
      const projects: Project[] = [
        { ...baseProject, id: 'p1', status: 'Active' },
        { ...baseProject, id: 'p2', status: 'Active' },
        { ...baseProject, id: 'p3', status: 'Initial Estimation' },
        { ...baseProject, id: 'p4', status: 'Not Started' },
        { ...baseProject, id: 'p5', status: 'On Hold' },
        { ...baseProject, id: 'p6', status: 'Completed' },
        { ...baseProject, id: 'p7', status: 'Cancelled', isDeleted: true }, // deleted project excluded
      ];

      const stats = getPortfolioTabStats(projects);
      expect(stats.total).toBe(6);
      expect(stats.active).toBe(2);
      expect(stats.initialEstimates).toBe(2);
      expect(stats.inactive).toBe(2);
    });
  });
});

