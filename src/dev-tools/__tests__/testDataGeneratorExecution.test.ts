import { describe, it, expect, beforeEach, vi } from 'vitest';
import { matchesProjectTab } from '@/lib/project-tab-filter';
import type { User } from '@/types';

// Mock DB Provider
const mockSetDoc = vi.fn().mockResolvedValue(undefined);
const mockGetDocs = vi.fn().mockResolvedValue({ docs: [] });

vi.mock('@/lib/db-provider', () => ({
  db: { __isMockDb: true },
  doc: vi.fn((_db, path, id) => ({ path: `${path}/${id}`, id })),
  collection: vi.fn((_db, path) => ({ path })),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  getDoc: vi.fn(),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    update: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock Project Autogen
const mockGenerateFullProjectData = vi.fn().mockResolvedValue(undefined);
const mockGenerateInitialEstimateData = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/project-autogen', () => ({
  generateFullProjectData: (...args: any[]) => mockGenerateFullProjectData(...args),
  generateInitialEstimateData: (...args: any[]) => mockGenerateInitialEstimateData(...args),
}));

import { generateProjects } from '../testDataEngine';

describe('generateProjects - Initial Estimation and Active Projects Generation', () => {
  const dummyUsers: User[] = [
    { id: 'E101', name: 'John Doe', email: 'john@example.com', accessLevel: 'Project Manager' },
    { id: 'E102', name: 'Jane Smith', email: 'jane@example.com', accessLevel: 'Lead' },
    { id: 'E103', name: 'Bob Wilson', email: 'bob@example.com', accessLevel: 'Team Member' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates specified active projects AND 2 initial estimation projects when initialEstimateCount is provided', async () => {
    const projects = await generateProjects({
      count: 2,
      initialEstimateCount: 2,
      portfolioIds: ['PF001'],
      pricingModel: 'Mixed',
      globalUsers: dummyUsers,
    });

    // 2 active + 2 initial estimation = 4 total projects
    expect(projects).toHaveLength(4);

    const activeProjects = projects.filter(p => p.status === 'Active');
    const initialEstimates = projects.filter(p => p.status === 'Initial Estimation');

    expect(activeProjects).toHaveLength(2);
    expect(initialEstimates).toHaveLength(2);

    // Verify subcollection generation calls
    expect(mockGenerateFullProjectData).toHaveBeenCalledTimes(2);
    expect(mockGenerateInitialEstimateData).toHaveBeenCalledTimes(2);

    // Verify Tab Filter alignment
    activeProjects.forEach(p => {
      expect(matchesProjectTab(p, 'active')).toBe(true);
      expect(matchesProjectTab(p, 'initial-estimates')).toBe(false);
      expect(matchesProjectTab(p, 'archive')).toBe(false);
    });

    initialEstimates.forEach(p => {
      expect(matchesProjectTab(p, 'initial-estimates')).toBe(true);
      expect(matchesProjectTab(p, 'active')).toBe(false);
      expect(matchesProjectTab(p, 'archive')).toBe(false);
      expect(p.summary).toContain('initial estimation and architectural specifications draft');
    });
  });

  it('defaults to generating 2 initial estimates when initialEstimateCount is omitted', async () => {
    const projects = await generateProjects({
      count: 3,
      portfolioIds: ['PF001', 'PF002'],
      pricingModel: 'Fixed Bid',
      globalUsers: dummyUsers,
    });

    // 3 active + 2 default initial estimates = 5 total projects
    expect(projects).toHaveLength(5);

    const initialEstimates = projects.filter(p => p.status === 'Initial Estimation');
    expect(initialEstimates).toHaveLength(2);
    expect(mockGenerateInitialEstimateData).toHaveBeenCalledTimes(2);
  });

  it('respects explicit initialEstimateCount = 0 when initial estimates are disabled', async () => {
    const projects = await generateProjects({
      count: 3,
      initialEstimateCount: 0,
      portfolioIds: ['PF001'],
      pricingModel: 'T&M',
      globalUsers: dummyUsers,
    });

    expect(projects).toHaveLength(3);
    const initialEstimates = projects.filter(p => p.status === 'Initial Estimation');
    expect(initialEstimates).toHaveLength(0);
    expect(mockGenerateInitialEstimateData).not.toHaveBeenCalled();
  });

  it('correctly associates initial estimate projects with assigned PMs and portfolios', async () => {
    const projects = await generateProjects({
      count: 1,
      initialEstimateCount: 2,
      portfolioIds: ['PF001', 'PF002'],
      pricingModel: 'Mixed',
      globalUsers: dummyUsers,
    });

    const initialEstimates = projects.filter(p => p.status === 'Initial Estimation');
    expect(initialEstimates).toHaveLength(2);

    initialEstimates.forEach(p => {
      expect(p.id).toMatch(/^P\d{7}$/);
      expect(p.portfolioId).toBeDefined();
      expect(['PF001', 'PF002']).toContain(p.portfolioId);
      expect(['E101', 'E102']).toContain(p.projectManagerId);
      expect(p.isDeleted).toBe(false);
      expect(p.overallStatus).toBe('Green');
    });
  });
});

