import { describe, it, expect } from 'vitest';
import { aiSubtaskTestCaseGenerator } from '../ai-subtask-testcase-generator';
import { generateSubtasksAndTestCasesAction } from '@/app/actions';

describe('AI Subtask & Test Case Generator Flow', () => {
  it('generates at least one subtask per impacted system and at least one test case for a Story', async () => {
    const input = {
      storyTitle: 'User Profile Avatar Upload',
      storyDescription: 'Allow registered users to upload, preview, and update their profile avatar images from their settings page.',
      acceptanceCriteria: '1. User can choose a PNG or JPG file up to 5MB. 2. Image is resized and stored securely. 3. New avatar immediately reflects on navbar and profile.',
      itemType: 'Story',
      impactedSystems: [
        { id: 'sys-frontend', name: 'Web Frontend' },
        { id: 'sys-api', name: 'REST API' },
        { id: 'sys-storage', name: 'Cloud Storage' },
      ],
    };

    const result = await aiSubtaskTestCaseGenerator(input);

    expect(result).toBeDefined();
    expect(result.subTasks).toBeDefined();
    expect(result.testCases).toBeDefined();

    // 1. Must create at least one task for each impacted system
    expect(result.subTasks.length).toBeGreaterThanOrEqual(input.impactedSystems.length);
    for (const sys of input.impactedSystems) {
      const hasTaskForSys = result.subTasks.some((t) => t.impactedSystemId === sys.id);
      expect(hasTaskForSys).toBe(true);
    }

    // Every subtask must have title, description, valid hours, and non-empty impactedSystemId
    for (const task of result.subTasks) {
      expect(task.title.length).toBeGreaterThan(0);
      expect(task.description.length).toBeGreaterThan(0);
      expect(task.estimatedHours).toBeGreaterThan(0);
      expect(input.impactedSystems.some((s) => s.id === task.impactedSystemId)).toBe(true);
    }

    // 2. Must create at least one test case to test the story
    expect(result.testCases.length).toBeGreaterThanOrEqual(1);
    for (const tc of result.testCases) {
      expect(tc.title.length).toBeGreaterThan(0);
      expect(tc.description.length).toBeGreaterThan(0);
      expect(tc.expectedResult.length).toBeGreaterThan(0);
      expect(['Functional', 'Non-functional']).toContain(tc.type);
    }
  }, 30000);

  it('generates at least one subtask per impacted system and test cases for a Feature Change', async () => {
    const input = {
      storyTitle: 'Migrate Payment Processing to Stripe Elements',
      storyDescription: 'Change checkout flow from redirect-based checkout to inline Stripe Elements with Apple Pay and Google Pay support.',
      itemType: 'Feature Change',
      impactedSystems: [
        { id: 'sys-checkout-ui', name: 'Checkout Frontend' },
        { id: 'sys-billing-svc', name: 'Billing Service' },
      ],
    };

    const result = await aiSubtaskTestCaseGenerator(input);

    expect(result.subTasks.length).toBeGreaterThanOrEqual(2);
    expect(result.subTasks.some((t) => t.impactedSystemId === 'sys-checkout-ui')).toBe(true);
    expect(result.subTasks.some((t) => t.impactedSystemId === 'sys-billing-svc')).toBe(true);

    expect(result.testCases.length).toBeGreaterThanOrEqual(1);
  }, 30000);

  it('works seamlessly through server action wrapper generateSubtasksAndTestCasesAction', async () => {
    const input = {
      storyTitle: 'Two Factor Authentication (2FA)',
      storyDescription: 'Enforce TOTP-based 2FA for all administrator accounts on login.',
      itemType: 'Story',
      impactedSystems: [
        { id: 'sys-auth', name: 'Auth Service' },
        { id: 'sys-mobile', name: 'Mobile App' },
      ],
    };

    const res = await generateSubtasksAndTestCasesAction(input);

    expect('error' in res).toBe(false);
    if (!('error' in res)) {
      expect(res.subTasks.length).toBeGreaterThanOrEqual(2);
      expect(res.testCases.length).toBeGreaterThanOrEqual(1);
      expect(res.subTasks.some((t) => t.impactedSystemId === 'sys-auth')).toBe(true);
      expect(res.subTasks.some((t) => t.impactedSystemId === 'sys-mobile')).toBe(true);
    }
  }, 30000);
});
