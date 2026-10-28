import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  RATE_CARDS_STORAGE_KEY,
  getLocalCachedRateCards,
  setLocalCachedRateCards,
  sanitizeRateCardItem,
  loadRateCards,
  saveRateCard,
  deleteRateCard,
  STANDARD_TECH_ROLES,
  STANDARD_HORIZONTAL_ROLES,
} from '../rate-cards-service';
import type { RateCardItem } from '@/types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('rate-cards-service', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('exposes standard tech and horizontal role options', () => {
    expect(STANDARD_TECH_ROLES.length).toBeGreaterThan(5);
    expect(STANDARD_HORIZONTAL_ROLES.length).toBeGreaterThan(3);
    expect(STANDARD_TECH_ROLES).toContain('Software Engineer / Developer');
    expect(STANDARD_HORIZONTAL_ROLES).toContain('Project Management');
  });

  it('should initialize empty when no rate cards exist in local storage or database', async () => {
    const items = await loadRateCards();
    expect(items).toEqual([]);
    expect(getLocalCachedRateCards()).toEqual([]);
  });

  it('sanitizes rate card items properly', () => {
    const sanitized = sanitizeRateCardItem({
      roleName: '  Full Stack Developer  ',
      category: 'Tech',
      lowRate: '500',
      mediumRate: 850,
      highRate: '1200.50',
    });

    expect(sanitized.roleName).toBe('Full Stack Developer');
    expect(sanitized.category).toBe('Tech');
    expect(sanitized.lowRate).toBe(500);
    expect(sanitized.mediumRate).toBe(850);
    expect(sanitized.highRate).toBe(1200.5);
    expect(sanitized.currency).toBe('USD');
  });

  it('defaults invalid category to Tech and invalid rates to 0', () => {
    const sanitized = sanitizeRateCardItem({
      roleName: 'QA Analyst',
      category: 'UnknownCategory',
      lowRate: 'invalid',
    });

    expect(sanitized.category).toBe('Tech');
    expect(sanitized.lowRate).toBe(0);
    expect(sanitized.mediumRate).toBe(0);
    expect(sanitized.highRate).toBe(0);
  });

  it('can create a new Tech role rate card entry', async () => {
    const created = await saveRateCard({
      roleName: 'Solution Architect',
      category: 'Tech',
      lowRate: 1000,
      mediumRate: 1500,
      highRate: 2200,
    });

    expect(created.id).toBeDefined();
    expect(created.roleName).toBe('Solution Architect');
    expect(created.category).toBe('Tech');
    expect(created.lowRate).toBe(1000);
    expect(created.mediumRate).toBe(1500);
    expect(created.highRate).toBe(2200);

    const all = await loadRateCards();
    expect(all.length).toBe(1);
    expect(all[0].id).toBe(created.id);
  });

  it('can create a new Horizontal role rate card entry', async () => {
    const created = await saveRateCard({
      roleName: 'Business Analysis',
      category: 'Horizontal',
      lowRate: 600,
      mediumRate: 900,
      highRate: 1300,
    });

    expect(created.roleName).toBe('Business Analysis');
    expect(created.category).toBe('Horizontal');

    const all = await loadRateCards();
    expect(all.length).toBe(1);
    expect(all[0].category).toBe('Horizontal');
  });

  it('can update an existing rate card entry', async () => {
    const initial = await saveRateCard({
      roleName: 'UI/UX Design',
      category: 'Horizontal',
      lowRate: 500,
      mediumRate: 800,
      highRate: 1100,
    });

    const updated = await saveRateCard({
      id: initial.id,
      roleName: 'Senior UI/UX Lead',
      category: 'Horizontal',
      lowRate: 700,
      mediumRate: 1000,
      highRate: 1400,
    });

    expect(updated.id).toBe(initial.id);
    expect(updated.roleName).toBe('Senior UI/UX Lead');
    expect(updated.highRate).toBe(1400);

    const all = await loadRateCards();
    expect(all.length).toBe(1);
    expect(all[0].roleName).toBe('Senior UI/UX Lead');
  });

  it('can delete a rate card entry by ID', async () => {
    const item1 = await saveRateCard({
      roleName: 'DevOps Engineer',
      category: 'Tech',
      lowRate: 800,
      mediumRate: 1200,
      highRate: 1600,
    });

    const item2 = await saveRateCard({
      roleName: 'Project Management',
      category: 'Horizontal',
      lowRate: 750,
      mediumRate: 1100,
      highRate: 1500,
    });

    let all = await loadRateCards();
    expect(all.length).toBe(2);

    await deleteRateCard(item1.id);

    all = await loadRateCards();
    expect(all.length).toBe(1);
    expect(all[0].id).toBe(item2.id);
    expect(all[0].roleName).toBe('Project Management');
  });
});
