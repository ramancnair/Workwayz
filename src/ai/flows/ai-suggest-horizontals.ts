'use server';

/**
 * @fileOverview A Genkit flow for suggesting horizontal strategies based on a project summary.
 */

import { ai, activeModel } from '@/ai/genkit';
import { z } from 'genkit';

const HorizontalSuggestionInputSchema = z.object({
  projectSummary: z.string().describe('The overall summary of the project to base suggestions on.'),
  totalDevEffort: z.number().optional().describe('Total development effort in man-days if already known or estimated.'),
});

export type HorizontalSuggestionInput = z.infer<typeof HorizontalSuggestionInputSchema>;

const HorizontalSuggestionOutputSchema = z.object({
  strategies: z.array(
    z.object({
      id: z.string().describe('A unique ID for this strategy option.'),
      name: z.string().describe('A descriptive name for this horizontal strategy (e.g., "Agile Lightweight", "Enterprise Heavyweight", "Data-Heavy Approach").'),
      description: z.string().describe('A brief explanation of why this strategy fits the project summary.'),
      horizontals: z.array(
        z.object({
          name: z.string().describe('The name of the horizontal effort (e.g., "Quality Analysis", "Dev Ops", "Solution Architecture").'),
          weightage: z.number().describe('The suggested percentage weightage for this horizontal relative to development effort (0-100).'),
          approximateEffort: z.number().describe('Approximate effort in man-days (e.g., 5, 10, 15).'),
          dailyBillingRate: z.number().describe('Standard market daily billing rate in USD (e.g., 450, 600, 750).'),
        })
      ).describe('The specific horizontal efforts that make up this strategy.'),
    })
  ).max(3).describe('An array of exactly 3 different horizontal strategy options.'),
});

export type HorizontalSuggestionOutput = z.infer<typeof HorizontalSuggestionOutputSchema>;

export async function aiSuggestHorizontals(input: HorizontalSuggestionInput): Promise<HorizontalSuggestionOutput> {
  return aiSuggestHorizontalsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiSuggestHorizontalsPrompt',
  model: activeModel,
  input: { schema: HorizontalSuggestionInputSchema },
  output: { format: 'json', schema: HorizontalSuggestionOutputSchema },
  prompt: `You are an expert Solutions Architect and Project Manager.
Based on the provided Project Summary below, suggest exactly 3 different, highly suitable horizontal effort "Strategies" (e.g., Lean/Agile, Standard Enterprise, Security/Data-Heavy) that could be used to structure the project. 
For each strategy, provide a clear name, a brief description of why it's a good fit, and map out the required horizontals (like Quality Analysis, Project Management, Solution Architecture, UI/UX, Dev Ops, Security).

For each horizontal:
- Suggest an appropriate percentage 'weightage' relative to the development effort (Base standard values are usually PM: 10%, QA: 15%, Business Analysis: 10%, Solution Architecture: 10%, but tailor the percentages to the project needs).
- Provide the approximate effort in man-days.{{#if totalDevEffort}} (Based on the Total Development Effort of {{totalDevEffort}} man-days, calculate the man-days according to the weightage: totalDevEffort * weightage / 100).{{else}} (If total development effort is not specified, provide a realistic ballpark man-day estimate based on the project scope and weightage).{{/if}}
- Provide a standard market daily billing rate in USD (e.g., $450 to $850/day based on the role like QA Engineer: $500/day, Solution Architect: $850/day, DevOps: $700/day, Project Manager: $650/day).

Project Summary:
{{{projectSummary}}}
{{#if totalDevEffort}}
Total Development Effort: {{totalDevEffort}} man-days
{{/if}}

Output your suggestions strictly in the specified JSON format.`,
});

const aiSuggestHorizontalsFlow = ai.defineFlow(
  {
    name: 'aiSuggestHorizontalsFlow',
    inputSchema: HorizontalSuggestionInputSchema,
    outputSchema: HorizontalSuggestionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

