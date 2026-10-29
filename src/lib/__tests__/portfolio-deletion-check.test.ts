import { describe, it, expect } from 'vitest';

export interface ProjectStub {
  id: string;
  portfolioId: string;
  isDeleted?: boolean;
  isArchived?: boolean;
}

export function computePortfolioProjectStats(portfolioId: string, projects: ProjectStub[]) {
  const portfolioProjects = projects.filter(p => p.portfolioId === portfolioId && !p.isDeleted);
  const active = portfolioProjects.filter(p => !p.isArchived).length;
  const inactive = portfolioProjects.filter(p => !!p.isArchived).length;
  return {
    total: portfolioProjects.length,
    active,
    inactive,
  };
}

export function formatPortfolioDeletionErrorMessage(portfolioName: string, stats: { total: number; active: number; inactive: number }) {
  if (stats.total === 0) return null;

  let detail = `${stats.total} project(s)`;
  if (stats.active === 0 && stats.inactive > 0) {
    detail = `${stats.inactive} inactive project${stats.inactive === 1 ? '' : 's'} (under Inactive Projects tab)`;
  } else if (stats.active > 0 && stats.inactive > 0) {
    detail = `${stats.total} projects (${stats.active} active, ${stats.inactive} inactive)`;
  } else if (stats.active > 0) {
    detail = `${stats.active} active project${stats.active === 1 ? '' : 's'}`;
  }

  return `Only empty portfolios can be deleted. "${portfolioName}" currently contains ${detail}.`;
}

describe('Portfolio Deletion Check & Message Specificity (TC-PORT-013)', () => {
  it('correctly reports 0 projects when portfolio has no projects or only soft-deleted projects', () => {
    const projects: ProjectStub[] = [
      { id: 'P1', portfolioId: 'port-1', isDeleted: true },
      { id: 'P2', portfolioId: 'other-port', isDeleted: false },
    ];
    const stats = computePortfolioProjectStats('port-1', projects);
    expect(stats.total).toBe(0);
    expect(stats.active).toBe(0);
    expect(stats.inactive).toBe(0);
    expect(formatPortfolioDeletionErrorMessage('Studio 1', stats)).toBeNull();
  });

  it('specifically identifies inactive projects when portfolio has 1 inactive project and 0 active projects', () => {
    const projects: ProjectStub[] = [
      { id: 'P1', portfolioId: 'studio-1', isDeleted: false, isArchived: true },
    ];
    const stats = computePortfolioProjectStats('studio-1', projects);
    expect(stats.total).toBe(1);
    expect(stats.active).toBe(0);
    expect(stats.inactive).toBe(1);

    const message = formatPortfolioDeletionErrorMessage('Digital Transformation & Cloud Modernization (Studio 1)', stats);
    expect(message).toBe(
      'Only empty portfolios can be deleted. "Digital Transformation & Cloud Modernization (Studio 1)" currently contains 1 inactive project (under Inactive Projects tab).'
    );
  });

  it('specifically identifies multiple inactive projects when all are inactive', () => {
    const projects: ProjectStub[] = [
      { id: 'P1', portfolioId: 'studio-1', isDeleted: false, isArchived: true },
      { id: 'P2', portfolioId: 'studio-1', isDeleted: false, isArchived: true },
    ];
    const stats = computePortfolioProjectStats('studio-1', projects);
    expect(stats.total).toBe(2);
    expect(stats.active).toBe(0);
    expect(stats.inactive).toBe(2);

    const message = formatPortfolioDeletionErrorMessage('Studio 1', stats);
    expect(message).toBe(
      'Only empty portfolios can be deleted. "Studio 1" currently contains 2 inactive projects (under Inactive Projects tab).'
    );
  });

  it('specifically identifies active projects when only active projects belong to portfolio', () => {
    const projects: ProjectStub[] = [
      { id: 'P1', portfolioId: 'studio-1', isDeleted: false, isArchived: false },
    ];
    const stats = computePortfolioProjectStats('studio-1', projects);
    expect(stats.total).toBe(1);
    expect(stats.active).toBe(1);
    expect(stats.inactive).toBe(0);

    const message = formatPortfolioDeletionErrorMessage('Studio 1', stats);
    expect(message).toBe(
      'Only empty portfolios can be deleted. "Studio 1" currently contains 1 active project.'
    );
  });

  it('specifically breaks down mixed active and inactive projects', () => {
    const projects: ProjectStub[] = [
      { id: 'P1', portfolioId: 'studio-1', isDeleted: false, isArchived: false },
      { id: 'P2', portfolioId: 'studio-1', isDeleted: false, isArchived: true },
    ];
    const stats = computePortfolioProjectStats('studio-1', projects);
    expect(stats.total).toBe(2);
    expect(stats.active).toBe(1);
    expect(stats.inactive).toBe(1);

    const message = formatPortfolioDeletionErrorMessage('Studio 1', stats);
    expect(message).toBe(
      'Only empty portfolios can be deleted. "Studio 1" currently contains 2 projects (1 active, 1 inactive).'
    );
  });
});
