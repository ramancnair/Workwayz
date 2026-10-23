import { describe, it, expect } from 'vitest';
import { getProjectYearRange, isProjectInYear, getAvailableProjectYears } from '../project-year-filter';
import type { Project } from '@/types';

describe('project-year-filter utility', () => {
  const currentYear = new Date().getFullYear();

  it('extracts startYear and endYear from ISO date strings', () => {
    const proj: Project = {
      id: 'p-1',
      name: 'Alpha Project',
      portfolioId: 'port-1',
      startDate: '2025-03-01T00:00:00.000Z',
      endDate: '2026-11-30T00:00:00.000Z',
    };

    const range = getProjectYearRange(proj);
    expect(range.startYear).toBe(2025);
    expect(range.endYear).toBe(2026);
  });

  it('falls back to project batch name or code if dates are omitted', () => {
    const proj1: Project = {
      id: 'P2600001',
      name: 'Microservices Architecture Migration (Batch 26-1)',
      portfolioId: 'port-1',
    };
    expect(getProjectYearRange(proj1)).toEqual({ startYear: 2026, endYear: 2026 });

    const proj2: Project = {
      id: 'P2500009',
      name: 'Legacy Cloud Bridge',
      portfolioId: 'port-1',
    };
    expect(getProjectYearRange(proj2)).toEqual({ startYear: 2025, endYear: 2025 });
  });

  it('isProjectInYear matches multi-year span correctly', () => {
    const proj: Project = {
      id: 'p-multi',
      name: 'Multi Year Project',
      portfolioId: 'port-1',
      startDate: '2024-06-01T00:00:00.000Z',
      endDate: '2026-05-01T00:00:00.000Z',
    };

    expect(isProjectInYear(proj, 'all')).toBe(true);
    expect(isProjectInYear(proj, '2024')).toBe(true);
    expect(isProjectInYear(proj, '2025')).toBe(true);
    expect(isProjectInYear(proj, '2026')).toBe(true);
    expect(isProjectInYear(proj, '2023')).toBe(false);
    expect(isProjectInYear(proj, '2027')).toBe(false);
  });

  it('isProjectInYear defaults undated projects to current year or all', () => {
    const proj: Project = {
      id: 'unknown-id',
      name: 'Undated Project',
      portfolioId: 'port-1',
    };

    expect(isProjectInYear(proj, 'all')).toBe(true);
    expect(isProjectInYear(proj, currentYear.toString())).toBe(true);
    expect(isProjectInYear(proj, '1999')).toBe(false);
  });

  it('getAvailableProjectYears aggregates distinct years sorted descending including current year', () => {
    const projects: Project[] = [
      {
        id: 'p1',
        name: 'Project 1',
        portfolioId: 'port-1',
        startDate: '2024-01-01',
        endDate: '2025-06-01',
      },
      {
        id: 'p2',
        name: 'Project 2',
        portfolioId: 'port-1',
        startDate: '2026-01-01',
        endDate: '2027-12-31',
      },
    ];

    const years = getAvailableProjectYears(projects);
    expect(years).toContain(2024);
    expect(years).toContain(2025);
    expect(years).toContain(2026);
    expect(years).toContain(2027);
    expect(years).toContain(currentYear);

    // Verify descending order
    for (let i = 0; i < years.length - 1; i++) {
      expect(years[i]).toBeGreaterThan(years[i + 1]);
    }
  });
});

