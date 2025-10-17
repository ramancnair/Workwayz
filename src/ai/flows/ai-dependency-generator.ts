
'use server';

/**
 * @fileOverview A Genkit flow for identifying project dependencies from project context.
 *
 * - aiDependencyGenerator - A function that triggers the AI dependency generation flow.
 * - AiDependencyGeneratorInput - The input type for the function.
 * - AiDependencyGeneratorOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const StoryInputSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
});

const AiDependencyGeneratorInputSchema = z.object({
  projectSummary: z.string().describe('The overall summary of the project.'),
  stories: z.array(StoryInputSchema).describe('A list of user stories for the project.'),
});
export type AiDependencyGeneratorInput = z.infer<typeof AiDependencyGeneratorInputSchema>;

const DependencySchema = z.object({
  description: z.string().describe('A clear and concise description of the dependency.'),
  dependencyOn: z.string().describe('The team, service, or entity this project is dependent on.'),
  type: z.enum(['Internal', 'External']).describe('The type of the dependency.'),
});

const AiDependencyGeneratorOutputSchema = z.object({
  dependencies: z.array(DependencySchema),
});
export type AiDependencyGeneratorOutput = z.infer<typeof AiDependencyGeneratorOutputSchema>;

export async function aiDependencyGenerator(input: AiDependencyGeneratorInput): Promise<AiDependencyGeneratorOutput> {
  return aiDependencyGeneratorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiDependencyGeneratorPrompt',
  input: { schema: AiDependencyGeneratorInputSchema },
  output: { schema: AiDependencyGeneratorOutputSchema },
  prompt: `You are an expert project manager skilled at identifying dependencies.
Based on the provided project summary and user stories, identify potential dependencies for this project.

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

For each dependency you identify, provide a clear description, who or what the project depends on, and categorize it as 'Internal' (within the organization) or 'External' (outside the organization).
`,
});

const aiDependencyGeneratorFlow = ai.defineFlow(
  {
    name: 'aiDependencyGeneratorFlow',
    inputSchema: AiDependencyGeneratorInputSchema,
    outputSchema: AiDependencyGeneratorOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
