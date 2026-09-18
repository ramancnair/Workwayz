import { describe, it, expect } from 'vitest';
import { PRESET_CONFIGS } from '../testDataEngine';

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

