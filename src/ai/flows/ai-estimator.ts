'use server';

/**
 * @fileOverview A Genkit flow for providing high-level estimates for project tasks.
 *
 * - aiEstimator - A function that triggers the AI estimation flow.
 * - AiEstimatorInput - The input type for the aiEstimator function.
 * - AiEstimatorOutput - The return type for the aiEstimator function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AiEstimatorInputSchema = z.object({
  projectSummary: z.string().describe('The overall summary of the project.'),
  impactedSystems: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
  })).describe('A list of systems impacted by the project.'),
  horizontals: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })).describe('A list of horizontal concerns for the project.'),
});
export type AiEstimatorInput = z.infer<typeof AiEstimatorInputSchema>;

const AiEstimatorOutputSchema = z.object({
  systemEstimates: z
    .array(
      z.object({
        id: z.string().describe('The ID of the impacted system.'),
        estimate: z.number().describe('The estimated effort in man-days for this system.'),
      })
    )
    .describe('The list of man-day estimates for each impacted system.'),
  horizontalEstimates: z
    .array(
      z.object({
        id: z.string().describe('The ID of the horizontal.'),
        weightage: z.number().describe('The estimated weightage as a percentage for this horizontal.'),
      })
    )
    .describe('The list of weightage percentages for each horizontal.'),
});
export type AiEstimatorOutput = z.infer<typeof AiEstimatorOutputSchema>;


export async function aiEstimator(input: AiEstimatorInput): Promise<AiEstimatorOutput> {
  return aiEstimatorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiEstimatorPrompt',
  input: { schema: AiEstimatorInputSchema },
  output: { schema: AiEstimatorOutputSchema },
  prompt: `You are an expert project estimator. Based on the provided project summary, impacted systems, and horizontals, provide a high-level estimate in man-days for each impacted system and a weightage percentage for each horizontal.

Project Summary:
{{{projectSummary}}}

Impacted Systems:
{{#each impactedSystems}}- {{name}}: {{description}} (ID: {{id}}){{/each}}

Horizontals:
{{#each horizontals}}- {{name}} (ID: {{id}}){{/each}}

Return the estimates in the specified JSON format. The sum of all horizontal weightages should ideally be around 50-70%, but can vary based on the project's nature. Base your estimations on typical software development projects. Provide only the JSON output.`,
});


const aiEstimatorFlow = ai.defineFlow(
  {
    name: 'aiEstimatorFlow',
    inputSchema: AiEstimatorInputSchema,
    outputSchema: AiEstimatorOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
