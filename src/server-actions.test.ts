/**
 * Tests for src/app/actions.ts (server actions)
 * 
 * Coverage:
 * - getAiTaskSuggestions (wraps aiTaskTestSuggestions)
 * - getAiEstimates (wraps aiEstimator)
 * - getAiStorySuggestions (wraps aiStoryGenerator)
 * - getAiTestCaseSuggestions (wraps aiTestCaseGenerator)
 * - getAiRiskSuggestions (wraps aiRiskGenerator)
 * - getAiAssumptionSuggestions (wraps aiAssumptionGenerator)
 * - getAiDependencySuggestions (wraps aiDependencyGenerator)
 * - getAiTechStackSuggestions (wraps aiSuggestTechStack)
 * - getAiHorizontalSuggestions (wraps aiSuggestHorizontals)
 * - Error handling (returns { error: string })
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all AI flows
vi.mock('@/ai/flows/task-test-suggestions', () => ({
  aiTaskTestSuggestions: vi.fn(),
}));

vi.mock('@/ai/flows/ai-estimator', () => ({
  aiEstimator: vi.fn(),
}));

vi.mock('@/ai/flows/ai-story-generator', () => ({
  aiStoryGenerator: vi.fn(),
}));

vi.mock('@/ai/flows/ai-test-case-generator', () => ({
  aiTestCaseGenerator: vi.fn(),
}));

vi.mock('@/ai/flows/ai-risk-generator', () => ({
  aiRiskGenerator: vi.fn(),
}));

vi.mock('@/ai/flows/ai-assumption-generator', () => ({
  aiAssumptionGenerator: vi.fn(),
}));

vi.mock('@/ai/flows/ai-dependency-generator', () => ({
  aiDependencyGenerator: vi.fn(),
}));

vi.mock('@/ai/flows/ai-suggest-tech-stack', () => ({
  aiSuggestTechStack: vi.fn(),
}));

vi.mock('@/ai/flows/ai-suggest-horizontals', () => ({
  aiSuggestHorizontals: vi.fn(),
}));

describe('Server actions', () => {
  describe('getAiTaskSuggestions', () => {
    it('should return suggestions on success', async () => {
      const { aiTaskTestSuggestions } = await import('@/ai/flows/task-test-suggestions');
      vi.mocked(aiTaskTestSuggestions).mockResolvedValue({
        suggestions: 'Consider adding more detail.',
      });

      const { getAiTaskSuggestions } = await import('@/app/actions');
      const result = await getAiTaskSuggestions({
        taskOrTestCaseDescription: 'Test task',
      });

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.suggestions).toBe('Consider adding more detail.');
      }
    });

    it('should return error on failure', async () => {
      const { aiTaskTestSuggestions } = await import('@/ai/flows/task-test-suggestions');
      vi.mocked(aiTaskTestSuggestions).mockRejectedValue(new Error('AI service unavailable'));

      const { getAiTaskSuggestions } = await import('@/app/actions');
      const result = await getAiTaskSuggestions({
        taskOrTestCaseDescription: 'Test task',
      });

      expect(result).toHaveProperty('error');
      if ('error' in result) {
        expect(result.error).toBe('AI service unavailable');
      }
    });

    it('should return generic error for non-string error', async () => {
      const { aiTaskTestSuggestions } = await import('@/ai/flows/task-test-suggestions');
      vi.mocked(aiTaskTestSuggestions).mockRejectedValue({ message: null });

      const { getAiTaskSuggestions } = await import('@/app/actions');
      const result = await getAiTaskSuggestions({
        taskOrTestCaseDescription: 'Test task',
      });

      expect(result).toHaveProperty('error');
    });
  });

  describe('getAiEstimates', () => {
    it('should return estimates on success', async () => {
      const { aiEstimator } = await import('@/ai/flows/ai-estimator');
      vi.mocked(aiEstimator).mockResolvedValue({
        systemEstimates: [{ id: 'sys1', name: 'Front End', estimate: 20 }],
        horizontalEstimates: [{ id: 'h1', name: 'QA', weightage: 15 }],
      });

      const { getAiEstimates } = await import('@/app/actions');
      const result = await getAiEstimates({
        projectSummary: 'Web app',
        impactedSystems: [{ id: 'sys1', name: 'Front End', description: 'UI' }],
        horizontals: [{ id: 'h1', name: 'QA' }],
      });

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.estimates.systemEstimates).toHaveLength(1);
        expect(result.estimates.horizontalEstimates).toHaveLength(1);
      }
    });

    it('should return error on failure', async () => {
      const { aiEstimator } = await import('@/ai/flows/ai-estimator');
      vi.mocked(aiEstimator).mockRejectedValue(new Error('AI error'));

      const { getAiEstimates } = await import('@/app/actions');
      const result = await getAiEstimates({
        projectSummary: 'Web app',
        impactedSystems: [],
        horizontals: [],
      });

      expect(result).toHaveProperty('error');
    });
  });

  describe('getAiStorySuggestions', () => {
    it('should return stories on success', async () => {
      const { aiStoryGenerator } = await import('@/ai/flows/ai-story-generator');
      vi.mocked(aiStoryGenerator).mockResolvedValue({
        stories: [
          {
            title: 'User Login',
            description: 'Allow users to login',
            acceptanceCriteria: 'Valid credentials work',
            impactedSystemIds: ['sys1'],
            priority: 'High',
            estimatedHours: 16,
            subTasks: [],
          },
        ],
      });

      const { getAiStorySuggestions } = await import('@/app/actions');
      const result = await getAiStorySuggestions({
        projectSummary: 'Web app',
        impactedSystems: [{ id: 'sys1', name: 'Front End' }],
      });

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.stories).toHaveLength(1);
        expect(result.stories[0].title).toBe('User Login');
      }
    });

    it('should return error on failure', async () => {
      const { aiStoryGenerator } = await import('@/ai/flows/ai-story-generator');
      vi.mocked(aiStoryGenerator).mockRejectedValue(new Error('AI error'));

      const { getAiStorySuggestions } = await import('@/app/actions');
      const result = await getAiStorySuggestions({
        projectSummary: 'Web app',
        impactedSystems: [],
      });

      expect(result).toHaveProperty('error');
    });
  });

  describe('getAiTestCaseSuggestions', () => {
    it('should return test cases on success', async () => {
      const { aiTestCaseGenerator } = await import('@/ai/flows/ai-test-case-generator');
      vi.mocked(aiTestCaseGenerator).mockResolvedValue({
        testCases: [
          {
            title: 'Login test',
            description: 'Test login',
            expectedResult: 'Success',
            storyId: 'story1',
            type: 'Functional',
          },
        ],
      });

      const { getAiTestCaseSuggestions } = await import('@/app/actions');
      const result = await getAiTestCaseSuggestions({
        stories: [{ id: 'story1', title: 'Login', description: 'Login' }],
      });

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.testCases).toHaveLength(1);
      }
    });

    it('should return error on failure', async () => {
      const { aiTestCaseGenerator } = await import('@/ai/flows/ai-test-case-generator');
      vi.mocked(aiTestCaseGenerator).mockRejectedValue(new Error('AI error'));

      const { getAiTestCaseSuggestions } = await import('@/app/actions');
      const result = await getAiTestCaseSuggestions({
        stories: [],
      });

      expect(result).toHaveProperty('error');
    });
  });

  describe('getAiRiskSuggestions', () => {
    it('should return risks on success', async () => {
      const { aiRiskGenerator } = await import('@/ai/flows/ai-risk-generator');
      vi.mocked(aiRiskGenerator).mockResolvedValue({
        risks: [
          {
            description: 'Scope creep',
            severity: 2,
            probability: 3,
            mitigationPlan: 'Change control',
            residualRisk: 'Medium',
            contingencyPlan: 'Extend timeline',
          },
        ],
      });

      const { getAiRiskSuggestions } = await import('@/app/actions');
      const result = await getAiRiskSuggestions({
        projectSummary: 'Web app',
      });

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.risks).toHaveLength(1);
      }
    });

    it('should return error on failure', async () => {
      const { aiRiskGenerator } = await import('@/ai/flows/ai-risk-generator');
      vi.mocked(aiRiskGenerator).mockRejectedValue(new Error('AI error'));

      const { getAiRiskSuggestions } = await import('@/app/actions');
      const result = await getAiRiskSuggestions({
        projectSummary: 'Web app',
      });

      expect(result).toHaveProperty('error');
    });
  });

  describe('getAiAssumptionSuggestions', () => {
    it('should return assumptions on success', async () => {
      const { aiAssumptionGenerator } = await import('@/ai/flows/ai-assumption-generator');
      vi.mocked(aiAssumptionGenerator).mockResolvedValue({
        assumptions: [
          { description: 'Users have email', category: 'Technical' },
        ],
      });

      const { getAiAssumptionSuggestions } = await import('@/app/actions');
      const result = await getAiAssumptionSuggestions({
        projectSummary: 'Web app',
        stories: [{ title: 'Login' }],
      });

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.assumptions).toHaveLength(1);
      }
    });

    it('should return error on failure', async () => {
      const { aiAssumptionGenerator } = await import('@/ai/flows/ai-assumption-generator');
      vi.mocked(aiAssumptionGenerator).mockRejectedValue(new Error('AI error'));

      const { getAiAssumptionSuggestions } = await import('@/app/actions');
      const result = await getAiAssumptionSuggestions({
        projectSummary: 'Web app',
        stories: [],
      });

      expect(result).toHaveProperty('error');
    });
  });

  describe('getAiDependencySuggestions', () => {
    it('should return dependencies on success', async () => {
      const { aiDependencyGenerator } = await import('@/ai/flows/ai-dependency-generator');
      vi.mocked(aiDependencyGenerator).mockResolvedValue({
        dependencies: [
          { description: 'API dependency', dependencyOn: 'External API', type: 'External' },
        ],
      });

      const { getAiDependencySuggestions } = await import('@/app/actions');
      const result = await getAiDependencySuggestions({
        projectSummary: 'Web app',
        stories: [{ title: 'Login' }],
      });

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.dependencies).toHaveLength(1);
      }
    });

    it('should return error on failure', async () => {
      const { aiDependencyGenerator } = await import('@/ai/flows/ai-dependency-generator');
      vi.mocked(aiDependencyGenerator).mockRejectedValue(new Error('AI error'));

      const { getAiDependencySuggestions } = await import('@/app/actions');
      const result = await getAiDependencySuggestions({
        projectSummary: 'Web app',
        stories: [],
      });

      expect(result).toHaveProperty('error');
    });
  });

  describe('getAiTechStackSuggestions', () => {
    it('should return tech stacks on success', async () => {
      const { aiSuggestTechStack } = await import('@/ai/flows/ai-suggest-tech-stack');
      vi.mocked(aiSuggestTechStack).mockResolvedValue({
        stacks: [
          { id: 's1', name: 'MERN', description: 'Full-stack JS', systems: [] },
        ],
      });

      const { getAiTechStackSuggestions } = await import('@/app/actions');
      const result = await getAiTechStackSuggestions({
        projectSummary: 'Web app',
      });

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.stacks).toHaveLength(1);
      }
    });

    it('should return error on failure', async () => {
      const { aiSuggestTechStack } = await import('@/ai/flows/ai-suggest-tech-stack');
      vi.mocked(aiSuggestTechStack).mockRejectedValue(new Error('AI error'));

      const { getAiTechStackSuggestions } = await import('@/app/actions');
      const result = await getAiTechStackSuggestions({
        projectSummary: 'Web app',
      });

      expect(result).toHaveProperty('error');
    });
  });

  describe('getAiHorizontalSuggestions', () => {
    it('should return strategies on success', async () => {
      const { aiSuggestHorizontals } = await import('@/ai/flows/ai-suggest-horizontals');
      vi.mocked(aiSuggestHorizontals).mockResolvedValue({
        strategies: [
          { id: 'h1', name: 'Agile', description: 'Lean approach', horizontals: [] },
        ],
      });

      const { getAiHorizontalSuggestions } = await import('@/app/actions');
      const result = await getAiHorizontalSuggestions({
        projectSummary: 'Web app',
      });

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.strategies).toHaveLength(1);
      }
    });

    it('should return error on failure', async () => {
      const { aiSuggestHorizontals } = await import('@/ai/flows/ai-suggest-horizontals');
      vi.mocked(aiSuggestHorizontals).mockRejectedValue(new Error('AI error'));

      const { getAiHorizontalSuggestions } = await import('@/app/actions');
      const result = await getAiHorizontalSuggestions({
        projectSummary: 'Web app',
      });

      expect(result).toHaveProperty('error');
    });
  });

  describe('Server action return types', () => {
    it('should always return either { suggestions/estimates/stories/testCases/risks/assumptions/dependencies/stacks/strategies } or { error }', async () => {
      const { getAiTaskSuggestions } = await import('@/app/actions');
      const result = await getAiTaskSuggestions({
        taskOrTestCaseDescription: 'Test',
      });

      // Should have exactly one of the success keys or error
      const hasSuccessKey = 'suggestions' in result;
      const hasError = 'error' in result;
      expect(hasSuccessKey || hasError).toBe(true);
      expect(hasSuccessKey && hasError).toBe(false);
    });
  });
});
