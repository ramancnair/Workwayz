/**
 * Tests for src/ai/flows/*.ts (input/output schemas)
 * 
 * Coverage:
 * - Zod schema validation for all AI flows
 * - Input/output type correctness
 * - Schema constraints (min/max, enums, etc.)
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('AI Flow Schemas', () => {
  describe('ai-estimator schemas', () => {
    it('should validate valid AiEstimatorInput', async () => {
      const { AiEstimatorInputSchema } = await import('@/ai/flows/ai-estimator');
      const validInput = {
        projectSummary: 'A web application for task management',
        impactedSystems: [
          { id: 'sys1', name: 'Front End', description: 'React UI' },
          { id: 'sys2', name: 'Backend', description: 'Node.js API' },
        ],
        horizontals: [
          { id: 'h1', name: 'Quality Analysis' },
          { id: 'h2', name: 'Project Management' },
        ],
      };
      const result = AiEstimatorInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid AiEstimatorInput (missing projectSummary)', async () => {
      const { AiEstimatorInputSchema } = await import('@/ai/flows/ai-estimator');
      const invalidInput = {
        impactedSystems: [],
        horizontals: [],
      };
      const result = AiEstimatorInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate valid AiEstimatorOutput', async () => {
      const { AiEstimatorOutputSchema } = await import('@/ai/flows/ai-estimator');
      const validOutput = {
        systemEstimates: [
          { id: 'sys1', name: 'Front End', estimate: 20 },
          { id: 'sys2', name: 'Backend', estimate: 30 },
        ],
        horizontalEstimates: [
          { id: 'h1', name: 'Quality Analysis', weightage: 15 },
          { id: 'h2', name: 'Project Management', weightage: 10 },
        ],
      };
      const result = AiEstimatorOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid AiEstimatorOutput (negative estimate)', async () => {
      const { AiEstimatorOutputSchema } = await import('@/ai/flows/ai-estimator');
      const invalidOutput = {
        systemEstimates: [
          { id: 'sys1', name: 'Front End', estimate: -5 },
        ],
        horizontalEstimates: [],
      };
      const result = AiEstimatorOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });

    it('should reject invalid AiEstimatorOutput (negative weightage)', async () => {
      const { AiEstimatorOutputSchema } = await import('@/ai/flows/ai-estimator');
      const invalidOutput = {
        systemEstimates: [],
        horizontalEstimates: [
          { id: 'h1', name: 'Quality Analysis', weightage: -10 },
        ],
      };
      const result = AiEstimatorOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });
  });

  describe('ai-story-generator schemas', () => {
    it('should validate valid AiStoryGeneratorInput', async () => {
      const { AiStoryGeneratorInputSchema } = await import('@/ai/flows/ai-story-generator');
      const validInput = {
        projectSummary: 'Task management app',
        impactedSystems: [
          { id: 'sys1', name: 'Front End' },
          { id: 'sys2', name: 'Backend' },
        ],
      };
      const result = AiStoryGeneratorInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid AiStoryGeneratorInput (missing projectSummary)', async () => {
      const { AiStoryGeneratorInputSchema } = await import('@/ai/flows/ai-story-generator');
      const invalidInput = {
        impactedSystems: [],
      };
      const result = AiStoryGeneratorInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate valid AiStoryGeneratorOutput', async () => {
      const { AiStoryGeneratorOutputSchema } = await import('@/ai/flows/ai-story-generator');
      const validOutput = {
        stories: [
          {
            title: 'User Login',
            description: 'Allow users to log in',
            acceptanceCriteria: 'Valid credentials work, invalid shows error',
            impactedSystemIds: ['sys1', 'sys2'],
            priority: 'High',
            estimatedHours: 16,
            subTasks: [
              { title: 'Login UI', estimatedHours: 4, impactedSystemId: 'sys1' },
              { title: 'Auth API', estimatedHours: 8, impactedSystemId: 'sys2' },
            ],
          },
        ],
      };
      const result = AiStoryGeneratorOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid AiStoryGeneratorOutput (missing title)', async () => {
      const { AiStoryGeneratorOutputSchema } = await import('@/ai/flows/ai-story-generator');
      const invalidOutput = {
        stories: [
          {
            description: 'A story without title',
            acceptanceCriteria: 'Criteria',
            impactedSystemIds: [],
            priority: 'Medium',
            estimatedHours: 8,
            subTasks: [],
          },
        ],
      };
      const result = AiStoryGeneratorOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });

    it('should reject invalid priority', async () => {
      const { AiStoryGeneratorOutputSchema } = await import('@/ai/flows/ai-story-generator');
      const invalidOutput: any = {
        stories: [
          {
            title: 'Test',
            description: 'Test',
            acceptanceCriteria: 'Test',
            impactedSystemIds: [],
            priority: 'InvalidPriority',
            estimatedHours: 8,
            subTasks: [],
          },
        ],
      };
      const result = AiStoryGeneratorOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });

    it('should validate valid subTask schema', async () => {
      const { AiStoryGeneratorOutputSchema } = await import('@/ai/flows/ai-story-generator');
      const validOutput = {
        stories: [
          {
            title: 'Test',
            description: 'Test',
            acceptanceCriteria: 'Test',
            impactedSystemIds: ['sys1'],
            priority: 'Medium',
            estimatedHours: 8,
            subTasks: [
              { title: 'Sub task', estimatedHours: 4, impactedSystemId: 'sys1' },
            ],
          },
        ],
      };
      const result = AiStoryGeneratorOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });
  });

  describe('ai-test-case-generator schemas', () => {
    it('should validate valid AiTestCaseGeneratorInput', async () => {
      const { AiTestCaseGeneratorInputSchema } = await import('@/ai/flows/ai-test-case-generator');
      const validInput = {
        stories: [
          { id: 'story1', title: 'User Login', description: 'Login functionality', acceptanceCriteria: 'Valid credentials work' },
        ],
      };
      const result = AiTestCaseGeneratorInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid AiTestCaseGeneratorInput (missing stories)', async () => {
      const { AiTestCaseGeneratorInputSchema } = await import('@/ai/flows/ai-test-case-generator');
      const invalidInput = {};
      const result = AiTestCaseGeneratorInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate valid AiTestCaseGeneratorOutput', async () => {
      const { AiTestCaseGeneratorOutputSchema } = await import('@/ai/flows/ai-test-case-generator');
      const validOutput = {
        testCases: [
          {
            title: 'Login with valid credentials',
            description: 'Enter valid username and password',
            expectedResult: 'User is redirected to dashboard',
            storyId: 'story1',
            type: 'Functional',
          },
          {
            title: 'Login with invalid credentials',
            description: 'Enter invalid username and password',
            expectedResult: 'Error message displayed',
            storyId: 'story1',
            type: 'Functional',
          },
        ],
      };
      const result = AiTestCaseGeneratorOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid TestCase type', async () => {
      const { AiTestCaseGeneratorOutputSchema } = await import('@/ai/flows/ai-test-case-generator');
      const invalidOutput: any = {
        testCases: [
          {
            title: 'Test',
            description: 'Test',
            expectedResult: 'Test',
            storyId: 'story1',
            type: 'InvalidType',
          },
        ],
      };
      const result = AiTestCaseGeneratorOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });
  });

  describe('ai-risk-generator schemas', () => {
    it('should validate valid AiRiskGeneratorInput', async () => {
      const { AiRiskGeneratorInputSchema } = await import('@/ai/flows/ai-risk-generator');
      const validInput = {
        projectSummary: 'A project summary',
      };
      const result = AiRiskGeneratorInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate valid AiRiskGeneratorOutput', async () => {
      const { AiRiskGeneratorOutputSchema } = await import('@/ai/flows/ai-risk-generator');
      const validOutput = {
        risks: [
          {
            description: 'Scope creep',
            severity: 2,
            probability: 3,
            mitigationPlan: 'Change control process',
            residualRisk: 'Medium',
            contingencyPlan: 'Extend timeline',
          },
        ],
      };
      const result = AiRiskGeneratorOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid severity (out of range)', async () => {
      const { AiRiskGeneratorOutputSchema } = await import('@/ai/flows/ai-risk-generator');
      const invalidOutput: any = {
        risks: [
          {
            description: 'Test',
            severity: 5,
            probability: 1,
            mitigationPlan: 'Test',
            residualRisk: 'Test',
            contingencyPlan: 'Test',
          },
        ],
      };
      const result = AiRiskGeneratorOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });

    it('should reject invalid probability (out of range)', async () => {
      const { AiRiskGeneratorOutputSchema } = await import('@/ai/flows/ai-risk-generator');
      const invalidOutput: any = {
        risks: [
          {
            description: 'Test',
            severity: 1,
            probability: 0,
            mitigationPlan: 'Test',
            residualRisk: 'Test',
            contingencyPlan: 'Test',
          },
        ],
      };
      const result = AiRiskGeneratorOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });

    it('should coerce string severity to number', async () => {
      const { AiRiskGeneratorOutputSchema } = await import('@/ai/flows/ai-risk-generator');
      const output: any = {
        risks: [
          {
            description: 'Test',
            severity: '2',
            probability: '1',
            mitigationPlan: 'Test',
            residualRisk: 'Test',
            contingencyPlan: 'Test',
          },
        ],
      };
      const result = AiRiskGeneratorOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.risks[0].severity).toBe(2);
        expect(result.data.risks[0].probability).toBe(1);
      }
    });
  });

  describe('ai-assumption-generator schemas', () => {
    it('should validate valid AiAssumptionGeneratorInput', async () => {
      const { AiAssumptionGeneratorInputSchema } = await import('@/ai/flows/ai-assumption-generator');
      const validInput = {
        projectSummary: 'A project',
        stories: [
          { title: 'Story 1', description: 'Description', acceptanceCriteria: 'Criteria' },
        ],
      };
      const result = AiAssumptionGeneratorInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate valid AiAssumptionGeneratorOutput', async () => {
      const { AiAssumptionGeneratorOutputSchema } = await import('@/ai/flows/ai-assumption-generator');
      const validOutput = {
        assumptions: [
          {
            description: 'Users have email access',
            category: 'Technical',
          },
          {
            description: 'Team available for 6 months',
            category: 'Resource',
          },
        ],
      };
      const result = AiAssumptionGeneratorOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid assumption category', async () => {
      const { AiAssumptionGeneratorOutputSchema } = await import('@/ai/flows/ai-assumption-generator');
      const invalidOutput: any = {
        assumptions: [
          {
            description: 'Test',
            category: 'InvalidCategory',
          },
        ],
      };
      const result = AiAssumptionGeneratorOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });

    it('should accept all valid AssumptionCategory values', async () => {
      const { AiAssumptionGeneratorOutputSchema } = await import('@/ai/flows/ai-assumption-generator');
      const categories = ['Technical', 'Resource', 'Business', 'External'];
      
      for (const cat of categories) {
        const output = {
          assumptions: [{ description: 'Test', category: cat }],
        };
        const result = AiAssumptionGeneratorOutputSchema.safeParse(output);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('ai-dependency-generator schemas', () => {
    it('should validate valid AiDependencyGeneratorInput', async () => {
      const { AiDependencyGeneratorInputSchema } = await import('@/ai/flows/ai-dependency-generator');
      const validInput = {
        projectSummary: 'A project',
        stories: [{ title: 'Story 1' }],
      };
      const result = AiDependencyGeneratorInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate valid AiDependencyGeneratorOutput', async () => {
      const { AiDependencyGeneratorOutputSchema } = await import('@/ai/flows/ai-dependency-generator');
      const validOutput = {
        dependencies: [
          {
            description: 'API availability',
            dependencyOn: 'External API provider',
            type: 'External',
          },
          {
            description: 'Design team approval',
            dependencyOn: 'Internal design team',
            type: 'Internal',
          },
        ],
      };
      const result = AiDependencyGeneratorOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid dependency type', async () => {
      const { AiDependencyGeneratorOutputSchema } = await import('@/ai/flows/ai-dependency-generator');
      const invalidOutput: any = {
        dependencies: [
          {
            description: 'Test',
            dependencyOn: 'Test',
            type: 'InvalidType',
          },
        ],
      };
      const result = AiDependencyGeneratorOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });
  });

  describe('ai-suggest-tech-stack schemas', () => {
    it('should validate valid TechStackSuggestionInput', async () => {
      const { TechStackSuggestionInputSchema } = await import('@/ai/flows/ai-suggest-tech-stack');
      const validInput = {
        projectSummary: 'A web application',
      };
      const result = TechStackSuggestionInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate valid TechStackSuggestionOutput', async () => {
      const { TechStackSuggestionOutputSchema } = await import('@/ai/flows/ai-suggest-tech-stack');
      const validOutput = {
        stacks: [
          {
            id: 'stack1',
            name: 'MERN Stack',
            description: 'Full-stack JavaScript',
            systems: [
              { name: 'Frontend', description: 'React', category: 'Technology' },
              { name: 'Backend', description: 'Node.js', category: 'Technology' },
            ],
          },
        ],
      };
      const result = TechStackSuggestionOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });

    it('should reject output with more than 3 stacks', async () => {
      const { TechStackSuggestionOutputSchema } = await import('@/ai/flows/ai-suggest-tech-stack');
      const invalidOutput: any = {
        stacks: [
          { id: 's1', name: 's1', description: 'd', systems: [] },
          { id: 's2', name: 's2', description: 'd', systems: [] },
          { id: 's3', name: 's3', description: 'd', systems: [] },
          { id: 's4', name: 's4', description: 'd', systems: [] },
        ],
      };
      const result = TechStackSuggestionOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });

    it('should validate system category enum', async () => {
      const { TechStackSuggestionOutputSchema } = await import('@/ai/flows/ai-suggest-tech-stack');
      const output: any = {
        stacks: [
          {
            id: 's1',
            name: 's1',
            description: 'd',
            systems: [
              { name: 'Test', description: 'Test', category: 'Invalid' },
            ],
          },
        ],
      };
      const result = TechStackSuggestionOutputSchema.safeParse(output);
      expect(result.success).toBe(false);
    });
  });

  describe('ai-suggest-horizontals schemas', () => {
    it('should validate valid HorizontalSuggestionInput', async () => {
      const { HorizontalSuggestionInputSchema } = await import('@/ai/flows/ai-suggest-horizontals');
      const validInput = {
        projectSummary: 'A project',
      };
      const result = HorizontalSuggestionInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate valid HorizontalSuggestionOutput', async () => {
      const { HorizontalSuggestionOutputSchema } = await import('@/ai/flows/ai-suggest-horizontals');
      const validOutput = {
        strategies: [
          {
            id: 'strat1',
            name: 'Agile Approach',
            description: 'Lean methodology',
            horizontals: [
              { name: 'Quality Analysis', weightage: 15 },
              { name: 'Project Management', weightage: 10 },
            ],
          },
        ],
      };
      const result = HorizontalSuggestionOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });
  });

  describe('ai-holiday-generator schemas', () => {
    it('should validate valid AiHolidayGeneratorInput', async () => {
      const { AiHolidayGeneratorInputSchema } = await import('@/ai/flows/ai-holiday-generator');
      const validInput = {
        year: 2024,
        country: 'India',
      };
      const result = AiHolidayGeneratorInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid year (negative)', async () => {
      const { AiHolidayGeneratorInputSchema } = await import('@/ai/flows/ai-holiday-generator');
      const invalidInput = {
        year: -1,
        country: 'India',
      };
      const result = AiHolidayGeneratorInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should validate valid AiHolidayGeneratorOutput', async () => {
      const { AiHolidayGeneratorOutputSchema } = await import('@/ai/flows/ai-holiday-generator');
      const validOutput = {
        holidays: [
          {
            date: '2024-01-26T00:00:00.000Z',
            description: 'Republic Day',
            type: 'National',
          },
          {
            date: '2024-08-15T00:00:00.000Z',
            description: 'Independence Day',
            type: 'National',
          },
        ],
      };
      const result = AiHolidayGeneratorOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });

    it('should reject invalid holiday type', async () => {
      const { AiHolidayGeneratorOutputSchema } = await import('@/ai/flows/ai-holiday-generator');
      const invalidOutput: any = {
        holidays: [
          {
            date: '2024-01-26T00:00:00.000Z',
            description: 'Test',
            type: 'InvalidType',
          },
        ],
      };
      const result = AiHolidayGeneratorOutputSchema.safeParse(invalidOutput);
      expect(result.success).toBe(false);
    });
  });

  describe('task-test-suggestions schemas', () => {
    it('should validate valid AiTaskTestSuggestionsInput', async () => {
      const { AiTaskTestSuggestionsInputSchema } = await import('@/ai/flows/task-test-suggestions');
      const validInput = {
        taskOrTestCaseDescription: 'A test case description',
        projectContext: 'Additional context',
      };
      const result = AiTaskTestSuggestionsInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should accept input without projectContext', async () => {
      const { AiTaskTestSuggestionsInputSchema } = await import('@/ai/flows/task-test-suggestions');
      const validInput = {
        taskOrTestCaseDescription: 'A test case description',
      };
      const result = AiTaskTestSuggestionsInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate valid AiTaskTestSuggestionsOutput', async () => {
      const { AiTaskTestSuggestionsOutputSchema } = await import('@/ai/flows/task-test-suggestions');
      const validOutput = {
        suggestions: 'Consider adding error handling and edge cases.',
      };
      const result = AiTaskTestSuggestionsOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });
  });
});
