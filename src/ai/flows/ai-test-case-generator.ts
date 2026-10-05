'use server';

/**
 * @fileOverview A Genkit flow for generating test cases from user stories.
 * 
 * - aiTestCaseGenerator - A function that triggers the AI test case generation flow.
 * - AiTestCaseGeneratorInput - The input type for the aiTestCaseGenerator function.
 * - AiTestCaseGeneratorOutput - The return type for the aiTestCaseGenerator function.
 */

import { ai } from '@/ai/genkit';
import { runPromptWithCascade } from '@/lib/ai/model-cascade';
import { z } from 'genkit';

const StoryInputSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
});

const TestCaseSchema = z.object({
  title: z.string().describe('A concise and descriptive title for the test case.'),
  description: z.string().describe('The detailed, step-by-step procedure to execute the test.'),
  expectedResult: z.string().describe('The expected outcome after executing the test steps.'),
  storyId: z.string().describe('The ID of the user story this test case is for.'),
  type: z.enum(['Functional', 'Non-functional']).describe('The type of the test case.'),
});

const AiTestCaseGeneratorInputSchema = z.object({
  stories: z.array(StoryInputSchema),
});
export type AiTestCaseGeneratorInput = z.infer<typeof AiTestCaseGeneratorInputSchema>;

const AiTestCaseGeneratorOutputSchema = z.object({
  testCases: z.array(TestCaseSchema),
});
export type AiTestCaseGeneratorOutput = z.infer<typeof AiTestCaseGeneratorOutputSchema>;

export async function aiTestCaseGenerator(input: AiTestCaseGeneratorInput): Promise<AiTestCaseGeneratorOutput> {
  return aiTestCaseGeneratorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiTestCaseGeneratorPrompt',
  input: { schema: AiTestCaseGeneratorInputSchema },
  output: { schema: AiTestCaseGeneratorOutputSchema },
  prompt: `You are an expert QA engineer. Based on the provided user stories, generate a comprehensive list of test cases. For each story, create multiple test cases covering positive scenarios, negative scenarios, and edge cases.

User Stories:
{{#each stories}}
---
Story ID: {{id}}
Title: {{title}}
Description: {{description}}
Acceptance Criteria: {{acceptanceCriteria}}
---
{{/each}}

For each generated test case, provide a clear title, step-by-step description, and the expected result. Ensure the 'storyId' correctly links back to the original user story. Classify each test case as either 'Functional' or 'Non-functional'.
`,
});

const aiTestCaseGeneratorFlow = ai.defineFlow(
  {
    name: 'aiTestCaseGeneratorFlow',
    inputSchema: AiTestCaseGeneratorInputSchema,
    outputSchema: AiTestCaseGeneratorOutputSchema,
  },
  async (input) => {
    return await runPromptWithCascade(
      (inp, opts) => prompt(inp, opts),
      input,
      { flowName: 'TestCaseGenerator' }
    );
  }
);
