import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PRESET_CONFIGS,
  getActiveStudioItems,
  getStudioLog,
  recordStudioLog,
  clearStudioLog,
  removeStudioBatch,
  wipeStudioBatch,
  STUDIO_LOG_STORAGE_KEY,
  StudioLog,
  getInstanceId,
  getStudioLogStorageKey,
} from '../testDataEngine';

describe('TestDataStudio Engine & Presets', () => {
  it('should provide valid Minimal Starter preset configuration', () => {
    const minimal = PRESET_CONFIGS.minimal;
    expect(minimal).toBeDefined();
    expect(minimal.portfolioCount).toBe(1);
    expect(minimal.projectCount).toBe(2);
    expect(minimal.userCount).toBe(8);
    expect(minimal.pricingModel).toBe('T&M');
  });

  it('should provide valid Standard Demo preset configuration', () => {
    const standard = PRESET_CONFIGS.standard;
    expect(standard).toBeDefined();
    expect(standard.portfolioCount).toBe(2);
    expect(standard.projectCount).toBe(5);
    expect(standard.userCount).toBe(16);
    expect(standard.pricingModel).toBe('Mixed');
  });

  it('should provide valid Enterprise Stress Test preset configuration', () => {
    const stress = PRESET_CONFIGS.stress;
    expect(stress).toBeDefined();
    expect(stress.portfolioCount).toBe(4);
    expect(stress.projectCount).toBe(12);
    expect(stress.userCount).toBe(32);
    expect(stress.pricingModel).toBe('Mixed');
  });

  it('should properly distribute roles in all presets', () => {
    for (const key of ['minimal', 'standard', 'stress'] as const) {
      const preset = PRESET_CONFIGS[key];
      const totalRoleCount = Object.values(preset.roleDistribution || {}).reduce((a, b) => a + (b || 0), 0);
      expect(totalRoleCount).toBeLessThanOrEqual(preset.userCount);
      expect(preset.roleDistribution?.Administrator).toBeGreaterThanOrEqual(1);
    }
  });

  it('should export createStudioPortfolios and ensurePortfolios', async () => {
    const { createStudioPortfolios, ensurePortfolios } = await import('../testDataEngine');
    expect(createStudioPortfolios).toBeDefined();
    expect(ensurePortfolios).toBe(createStudioPortfolios);
  });
});

describe('Studio Creation Log & Asset Tracking', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return empty lists when getActiveStudioItems is passed null, undefined, or empty log', () => {
    expect(getActiveStudioItems(null)).toEqual({
      projectIds: [],
      portfolioIds: [],
      userIds: [],
      projects: [],
      portfolios: [],
      users: [],
    });

    expect(getActiveStudioItems(undefined)).toEqual({
      projectIds: [],
      portfolioIds: [],
      userIds: [],
      projects: [],
      portfolios: [],
      users: [],
    });

    const emptyLog: StudioLog = {
      version: 1,
      lastUpdated: new Date().toISOString(),
      batches: [],
    };
    expect(getActiveStudioItems(emptyLog)).toEqual({
      projectIds: [],
      portfolioIds: [],
      userIds: [],
      projects: [],
      portfolios: [],
      users: [],
    });
  });

  it('should consolidate and deduplicate active items across multiple generation batches', () => {
    const mockLog: StudioLog = {
      version: 1,
      lastUpdated: '2026-09-18T12:00:00.000Z',
      batches: [
        {
          batchId: 'batch-1',
          timestamp: '2026-09-18T11:00:00.000Z',
          preset: 'minimal',
          portfolios: [{ id: 'PF001', name: 'Digital Trans (Studio 1)' }],
          projects: [
            { id: 'P2600001', name: 'Microservices (Batch 26-1)', portfolioId: 'PF001' },
            { id: 'P2600002', name: 'AI Hub (Batch 26-2)', portfolioId: 'PF001' },
          ],
          users: [
            { id: 'E001', email: 'alex.vance.1@workwayz.test', accessLevel: 'Administrator', role: 'Developer' },
            { id: 'E002', email: 'jordan.chen.2@workwayz.test', accessLevel: 'Project Manager', role: 'PM' },
          ],
        },
        {
          batchId: 'batch-2',
          timestamp: '2026-09-18T12:00:00.000Z',
          preset: 'standard',
          portfolios: [{ id: 'PF002', name: 'Fintech (Studio 2)' }],
          projects: [
            // Include duplicate P2600002 to test deduplication
            { id: 'P2600002', name: 'AI Hub (Batch 26-2)', portfolioId: 'PF001' },
            { id: 'P2600003', name: 'Settlement Rail (Batch 26-3)', portfolioId: 'PF002' },
          ],
          users: [
            { id: 'E003', email: 'morgan.mercer.3@workwayz.test', accessLevel: 'Lead', role: 'Architect' },
          ],
        },
      ],
    };

    const active = getActiveStudioItems(mockLog);

    expect(active.portfolioIds).toEqual(['PF001', 'PF002']);
    expect(active.projectIds).toEqual(['P2600001', 'P2600002', 'P2600003']);
    expect(active.userIds).toEqual(['E001', 'E002', 'E003']);

    // Check that studio admin is captured in the active users list for deletion
    const adminUser = active.users.find(u => u.accessLevel === 'Administrator');
    expect(adminUser).toBeDefined();
    expect(adminUser?.id).toBe('E001');
    expect(adminUser?.email).toBe('alex.vance.1@workwayz.test');
  });

  it('should record studio assets into persistent log and retrieve from storage cache', async () => {
    const saved = await recordStudioLog({
      preset: 'minimal',
      projects: [
        { id: 'P2600010', name: 'Studio Project 1', portfolioId: 'PF010' } as any,
      ],
      portfolios: [
        { id: 'PF010', name: 'Studio Portfolio 1' } as any,
      ],
      users: [
        { id: 'E010', email: 'admin.studio.10@workwayz.test', accessLevel: 'Administrator' } as any,
      ],
    });

    expect(saved.batches).toHaveLength(1);
    expect(saved.batches[0].projects[0].id).toBe('P2600010');
    expect(saved.batches[0].portfolios[0].id).toBe('PF010');
    expect(saved.batches[0].users[0].id).toBe('E010');
    expect(saved.batches[0].users[0].accessLevel).toBe('Administrator');

    // Check localStorage cache
    const cached = localStorage.getItem(STUDIO_LOG_STORAGE_KEY);
    expect(cached).toBeDefined();
    const parsed = JSON.parse(cached!);
    expect(parsed.batches[0].projects[0].id).toBe('P2600010');

    // Retrieve via getStudioLog
    const retrieved = await getStudioLog();
    expect(retrieved).toBeDefined();
    expect(retrieved?.batches[0].projects[0].id).toBe('P2600010');

    // Clear studio log
    await clearStudioLog();
    expect(localStorage.getItem(STUDIO_LOG_STORAGE_KEY)).toBeNull();
  });

  it('should isolate deletion so only logged projects and users are targeted', () => {
    const mockLog: StudioLog = {
      version: 1,
      lastUpdated: new Date().toISOString(),
      batches: [
        {
          batchId: 'batch-test',
          timestamp: new Date().toISOString(),
          projects: [{ id: 'P2600099', name: 'Studio Test Project', portfolioId: 'PF099' }],
          portfolios: [{ id: 'PF099', name: 'Studio Test Portfolio' }],
          users: [
            { id: 'E099', email: 'studio.admin.99@workwayz.test', accessLevel: 'Administrator' },
          ],
        },
      ],
    };

    const active = getActiveStudioItems(mockLog);

    // Existing pre-existing project in existing portfolio
    const existingProject = { id: 'P2600001', name: 'Genuine Company Project', portfolioId: 'PF_CORE' };
    // Pre-existing employee
    const genuineEmployee = { id: 'E005', email: 'genuine.dev@company.com', accessLevel: 'Team Member' };
    const genuineAdmin = { id: 'E001', email: 'root.admin@company.com', accessLevel: 'Administrator' };

    // Validation: Only logged items match
    expect(active.projectIds.includes(existingProject.id)).toBe(false);
    expect(active.portfolioIds.includes(existingProject.portfolioId)).toBe(false);
    expect(active.userIds.includes(genuineEmployee.id)).toBe(false);
    expect(active.userIds.includes(genuineAdmin.id)).toBe(false);

    // Studio items match
    expect(active.projectIds.includes('P2600099')).toBe(true);
    expect(active.portfolioIds.includes('PF099')).toBe(true);
    expect(active.userIds.includes('E099')).toBe(true);

    // Crucial requirement: Studio admin is in deletion list
    const targetUser = active.users.find(u => u.id === 'E099');
    expect(targetUser).toBeDefined();
    expect(targetUser?.accessLevel).toBe('Administrator');
  });

  it('should create a distinct log batch for each generation run when run multiple times', async () => {
    // Run 1
    const logAfterRun1 = await recordStudioLog({
      preset: 'minimal',
      projects: [{ id: 'P2600101', name: 'Project Run 1', portfolioId: 'PF101' } as any],
      portfolios: [{ id: 'PF101', name: 'Portfolio Run 1' } as any],
      users: [{ id: 'E101', email: 'user.run1@workwayz.test', accessLevel: 'Administrator' } as any],
    });

    expect(logAfterRun1.batches).toHaveLength(1);
    const batchId1 = logAfterRun1.batches[0].batchId;
    expect(batchId1).toBeDefined();

    // Run 2 without wiping Run 1
    const logAfterRun2 = await recordStudioLog({
      preset: 'standard',
      projects: [{ id: 'P2600201', name: 'Project Run 2', portfolioId: 'PF201' } as any],
      portfolios: [{ id: 'PF201', name: 'Portfolio Run 2' } as any],
      users: [{ id: 'E201', email: 'user.run2@workwayz.test', accessLevel: 'Project Manager' } as any],
    });

    expect(logAfterRun2.batches).toHaveLength(2);
    const batchId2 = logAfterRun2.batches[1].batchId;
    expect(batchId2).not.toEqual(batchId1);

    // Active items reflect both runs
    const activeBoth = getActiveStudioItems(logAfterRun2);
    expect(activeBoth.projectIds).toEqual(['P2600101', 'P2600201']);
    expect(activeBoth.portfolioIds).toEqual(['PF101', 'PF201']);
    expect(activeBoth.userIds).toEqual(['E101', 'E201']);

    // Remove only Run 1
    const logAfterRemovingRun1 = await removeStudioBatch(batchId1);
    expect(logAfterRemovingRun1?.batches).toHaveLength(1);
    expect(logAfterRemovingRun1?.batches[0].batchId).toBe(batchId2);

    // Active items now only reflect Run 2
    const activeRun2Only = getActiveStudioItems(logAfterRemovingRun1);
    expect(activeRun2Only.projectIds).toEqual(['P2600201']);
    expect(activeRun2Only.portfolioIds).toEqual(['PF201']);
    expect(activeRun2Only.userIds).toEqual(['E201']);

    // Remove Run 2: log should now be completely cleared
    const logAfterRemovingRun2 = await removeStudioBatch(batchId2);
    expect(logAfterRemovingRun2).toBeNull();
    expect(localStorage.getItem(STUDIO_LOG_STORAGE_KEY)).toBeNull();
  });

  it('should isolate test runs by instanceId and ignore runs from other instances', async () => {
    const currentInst = getInstanceId();
    expect(currentInst).toBeDefined();
    expect(getStudioLogStorageKey(currentInst)).toBe(`pf_test_data_studio_log_${currentInst}`);

    // Create a foreign run from another instance
    const foreignBatch = {
      batchId: 'foreign_batch_123',
      instanceId: 'other_instance_999',
      timestamp: new Date().toISOString(),
      preset: 'standard',
      projects: [{ id: 'P2609999', name: 'Foreign Project', portfolioId: 'PF999' }],
      portfolios: [{ id: 'PF999', name: 'Foreign Portfolio' }],
      users: [{ id: 'E999', email: 'foreign@company.com' }],
    };

    const foreignLog: StudioLog = {
      version: 1,
      lastUpdated: new Date().toISOString(),
      batches: [foreignBatch],
    };

    // Storing foreign log in storage
    localStorage.setItem(getStudioLogStorageKey(currentInst), JSON.stringify(foreignLog));

    // getStudioLog should filter out runs from other instances
    const retrieved = await getStudioLog();
    expect(retrieved).toBeNull();
  });
});

describe('DevTools Component Module Exports', () => {
  it('should import and parse TestDataModal, StudioLogViewerModal, and DevTriggerButton without syntax or module errors', async () => {
    const { default: TestDataModal } = await import('../TestDataModal');
    const { StudioLogViewerModal } = await import('../StudioLogViewerModal');
    const { default: DevTriggerButton } = await import('../DevTriggerButton');

    expect(TestDataModal).toBeDefined();
    expect(StudioLogViewerModal).toBeDefined();
    expect(DevTriggerButton).toBeDefined();
  }, 20000);
});


