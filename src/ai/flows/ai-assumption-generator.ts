
'use server';

/**
 * @fileOverview A Genkit flow for identifying assumptions from project context.
 *
 * - aiAssumptionGenerator - A function that triggers the AI assumption generation flow.
 * - AiAssumptionGeneratorInput - The input type for the function.
 * - AiAssumptionGeneratorOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { AssumptionCategory } from '@/types';

const StoryInputSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
});

const AiAssumptionGeneratorInputSchema = z.object({
  projectSummary: z.string().describe('The overall summary of the project.'),
  stories: z.array(StoryInputSchema).describe('A list of user stories for the project.'),
});
export type AiAssumptionGeneratorInput = z.infer<typeof AiAssumptionGeneratorInputSchema>;

const AssumptionSchema = z.object({
  description: z.string().describe('A clear and concise description of the unstated assumption.'),
  category: z.enum(['Technical', 'Resource', 'Business', 'External']).describe('The category of the assumption.'),
});

const AiAssumptionGeneratorOutputSchema = z.object({
  assumptions: z.array(AssumptionSchema),
});
export type AiAssumptionGeneratorOutput = z.infer<typeof AiAssumptionGeneratorOutputSchema>;

export async function aiAssumptionGenerator(input: AiAssumptionGeneratorInput): Promise<AiAssumptionGeneratorOutput> {
  return aiAssumptionGeneratorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiAssumptionGeneratorPrompt',
  input: { schema: AiAssumptionGeneratorInputSchema },
  output: { schema: AiAssumptionGeneratorOutputSchema },
  prompt: `You are an expert project manager with a keen eye for identifying unstated assumptions.
Based on the provided project summary and user stories, identify potential assumptions being made.

Project Summary:
{{{projectSummary}}}

User Stories:
{{#each stories}}
---
Title: {{title}}
Description: {{description}}
Acceptance Criteria: {{acceptanceCriteria}}
---
{{/each}}

For each assumption you identify, provide a clear description and categorize it as 'Technical', 'Resource', 'Business', or 'External'.
`,
});

const aiAssumptionGeneratorFlow = ai.defineFlow(
  {
    name: 'aiAssumptionGeneratorFlow',
    inputSchema: AiAssumptionGeneratorInputSchema,
    outputSchema: AiAssumptionGeneratorOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
