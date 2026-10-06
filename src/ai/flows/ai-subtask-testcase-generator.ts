'use server';

/**
 * @fileOverview A Genkit flow for generating sub-tasks and test cases for a Story or Feature Change.
 *
 * Rules:
 * 1. For each impacted system provided, generate at least one targeted sub-task.
 * 2. Generate at least one test case to verify the story / feature change.
 */

import { ai } from '@/ai/genkit';
import { runPromptWithCascade } from '@/lib/ai/model-cascade';
import { z } from 'genkit';

const SubTaskItemSchema = z.object({
  title: z
    .string()
    .describe('A concise task title (max 60 chars) explaining work in this impacted system.'),
  description: z
    .string()
    .describe('Specific technical implementation steps or details (max 300 chars).'),
  impactedSystemId: z
    .string()
    .describe('The exact ID of the impacted system this subtask belongs to.'),
  estimatedHours: z
    .coerce
    .number()
    .describe('Estimated effort hours for this task (between 1 and 16 hours).'),
});

const TestCaseItemSchema = z.object({
  title: z
    .string()
    .describe('A concise, descriptive title for the test case.'),
  description: z
    .string()
    .describe('Step-by-step procedure to execute the test.'),
  expectedResult: z
    .string()
    .describe('Expected outcome after executing the test.'),
  type: z
    .enum(['Functional', 'Non-functional'])
    .describe('Classification of the test case.'),
});

const AiSubtaskTestCaseGeneratorInputSchema = z.object({
  storyTitle: z
    .string()
    .describe('The title of the user story or feature change.'),
  storyDescription: z
    .string()
    .describe('The detailed description of the user story or feature change.'),
  acceptanceCriteria: z
    .string()
    .optional()
    .describe('Acceptance criteria or expected behavior for the story.'),
  itemType: z
    .string()
    .optional()
    .describe('Story or Feature Change.'),
  impactedSystems: z
    .array(
      z.object({
        id: z.string().describe('Impacted system ID.'),
        name: z.string().describe('Impacted system name.'),
      })
    )
    .min(1)
    .describe('List of impacted systems selected for this item.'),
});
export type AiSubtaskTestCaseGeneratorInput = z.infer<typeof AiSubtaskTestCaseGeneratorInputSchema>;

const AiSubtaskTestCaseGeneratorOutputSchema = z.object({
  subTasks: z
    .array(SubTaskItemSchema)
    .describe('Subtasks generated for developers, with at least one per impacted system.'),
  testCases: z
    .array(TestCaseItemSchema)
    .describe('Test cases generated for QA to test the story.'),
});
export type AiSubtaskTestCaseGeneratorOutput = z.infer<typeof AiSubtaskTestCaseGeneratorOutputSchema>;

/**
 * Heuristic generator for offline/fallback mode when LLM quota or connection fails.
 */
function generateHeuristicSubtasksAndTestCases(
  input: AiSubtaskTestCaseGeneratorInput
): AiSubtaskTestCaseGeneratorOutput {
  const isFeatureChange = input.itemType?.toLowerCase().includes('feature') || false;
  const prefix = isFeatureChange ? 'Update' : 'Implement';

  const subTasks = input.impactedSystems.map((sys, idx) => {
    const hours = [3, 4, 6, 2, 5][idx % 5];
    return {
      title: `${prefix} ${input.storyTitle} in ${sys.name}`.slice(0, 60),
      description: `Complete required development and integration work in ${sys.name} for ${input.storyTitle}. Follow technical standards and unit test coverage.`.slice(0, 300),
      impactedSystemId: sys.id,
      estimatedHours: hours,
    };
  });

  const testCases = [
    {
      title: `Verify happy path for ${input.storyTitle}`.slice(0, 80),
      description: `1. Log in to the system.\n2. Navigate to the feature area.\n3. Perform expected actions described in: ${input.storyDescription.slice(0, 150)}.\n4. Verify data sync across ${input.impactedSystems.map(s => s.name).join(', ')}.`,
      expectedResult: `Actions complete successfully with correct system state changes and no console or API errors.`,
      type: 'Functional' as const,
    },
    {
      title: `Verify error validation for ${input.storyTitle}`.slice(0, 80),
      description: `1. Trigger the workflow with invalid or boundary inputs.\n2. Check system validation response and user error messages.`,
      expectedResult: `Appropriate error messages are presented and system prevents corrupt state across impacted systems.`,
      type: 'Functional' as const,
    },
  ];

  return { subTasks, testCases };
}

export async function aiSubtaskTestCaseGenerator(
  input: AiSubtaskTestCaseGeneratorInput
): Promise<AiSubtaskTestCaseGeneratorOutput> {
  return aiSubtaskTestCaseGeneratorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiSubtaskTestCaseGeneratorPrompt',
  input: { schema: AiSubtaskTestCaseGeneratorInputSchema },
  output: { schema: AiSubtaskTestCaseGeneratorOutputSchema },
  prompt: `You are an expert technical lead and QA engineering lead.
Based on the following {{itemType}} details and the list of impacted systems, generate:
1. Developer Subtasks:
   - MANDATORY REQUIREMENT: For EVERY impacted system in the list below, you MUST generate at least ONE subtask specifically targeting that system.
   - Set 'impactedSystemId' to the EXACT system ID from the list.
   - Provide a clear, actionable title (max 60 characters) and description (max 300 characters).
   - Set realistic estimated effort in hours (between 1 and 16).

2. QA Test Cases:
   - MANDATORY REQUIREMENT: Generate at least ONE comprehensive test case (ideally 2-3 covering positive scenarios and edge cases) to thoroughly test the {{itemType}}.
   - Each test case must have a concise title, step-by-step description, expected outcome, and type ('Functional' or 'Non-functional').

Item Details:
- Type: {{{itemType}}}
- Title: {{{storyTitle}}}
- Description: {{{storyDescription}}}
{{#if acceptanceCriteria}}
- Acceptance Criteria: {{{acceptanceCriteria}}}
{{/if}}

Impacted Systems:
{{#each impactedSystems}}
- {{name}} (ID: {{id}})
{{/each}}

Return the output in the required JSON schema format. Ensure every provided impacted system ID has at least one subtask.`,
});

const aiSubtaskTestCaseGeneratorFlow = ai.defineFlow(
  {
    name: 'aiSubtaskTestCaseGeneratorFlow',
    inputSchema: AiSubtaskTestCaseGeneratorInputSchema,
    outputSchema: AiSubtaskTestCaseGeneratorOutputSchema,
  },
  async (input) => {
    let rawOutput: AiSubtaskTestCaseGeneratorOutput | null = null;

    try {
      rawOutput = await runPromptWithCascade(
        (inp, opts) => prompt(inp, opts),
        input,
        { flowName: 'SubtaskTestCaseGenerator' }
      );
    } catch (e: any) {
      console.warn('[SubtaskTestCaseGenerator] AI cascade failed or model unavailable, using heuristic generator:', e?.message || e);
      rawOutput = generateHeuristicSubtasksAndTestCases(input);
    }

    if (!rawOutput) {
      rawOutput = generateHeuristicSubtasksAndTestCases(input);
    }

    // Strict guarantee: at least one subtask for every impacted system
    const subTasks = [...(rawOutput.subTasks || [])];
    for (const sys of input.impactedSystems) {
      const exists = subTasks.some((t) => t.impactedSystemId === sys.id);
      if (!exists) {
        subTasks.push({
          title: `Implement ${input.storyTitle} in ${sys.name}`.slice(0, 60),
          description: `Implement and configure changes in ${sys.name} for story requirement.`.slice(0, 300),
          impactedSystemId: sys.id,
          estimatedHours: 4,
        });
      }
    }

    // Strict guarantee: at least one test case
    const testCases = [...(rawOutput.testCases || [])];
    if (testCases.length === 0) {
      testCases.push({
        title: `Verify ${input.storyTitle}`.slice(0, 80),
        description: `1. Open application.\n2. Execute actions from story description: ${input.storyDescription.slice(0, 100)}.\n3. Validate result.`,
        expectedResult: `Feature works according to specification without defects.`,
        type: 'Functional',
      });
    }

    return {
      subTasks,
      testCases,
    };
  }
);
