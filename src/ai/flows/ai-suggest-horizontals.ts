'use server';

/**
 * @fileOverview A Genkit flow for suggesting horizontal strategies based on a project summary.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const HorizontalSuggestionInputSchema = z.object({
  projectSummary: z.string().describe('The overall summary of the project to base suggestions on.'),
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
          name: z.string().describe('The name of the horizontal effort (e.g., "Quality Analysis", "Dev Ops").'),
          weightage: z.number().describe('The suggested percentage weightage for this horizontal (0-100).'),
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
  input: { schema: HorizontalSuggestionInputSchema },
  output: { schema: HorizontalSuggestionOutputSchema },
  prompt: `You are an expert Solutions Architect and Project Manager.
Based on the provided Project Summary below, suggest exactly 3 different, highly suitable horizontal effort "Strategies" (e.g., Lean/Agile, Standard Enterprise, Security/Data-Heavy) that could be used to structure the project. 
For each strategy, provide a clear name, a brief description of why it's a good fit, and map out the required horizontals (like Quality Analysis, Project Management, Solution Architecture, UI/UX, Dev Ops, Security) along with an appropriate percentage 'weightage' relative to the development effort.
Base standard values are usually PM: 10%, QA: 15%, Business Analysis: 10%, Solution Architecture: 10%, but you should tailor the recommended categories and percentages to fit the specific needs of the project summary.

Project Summary:
{{{projectSummary}}}

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
