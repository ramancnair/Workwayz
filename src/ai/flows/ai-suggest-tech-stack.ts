'use server';

/**
 * @fileOverview A Genkit flow for suggesting technology stacks based on a project summary.
 */

import { ai, activeModel } from '@/ai/genkit';
import { z } from 'genkit';

const TechStackSuggestionInputSchema = z.object({
  projectSummary: z.string().describe('The overall summary of the project to base suggestions on.'),
});

export type TechStackSuggestionInput = z.infer<typeof TechStackSuggestionInputSchema>;

const TechStackSuggestionOutputSchema = z.object({
  stacks: z.array(
    z.object({
      id: z.string().describe('A unique ID for this stack option.'),
      name: z.string().describe('A descriptive name for this tech stack (e.g., "MERN Stack", "AWS Serverless").'),
      description: z.string().describe('A brief explanation of why this stack fits the project summary.'),
      systems: z.array(
        z.object({
          name: z.string().describe('The name of the system or component (e.g., "Web Frontend", "User Database").'),
          description: z.string().describe('The specific technology used and its role (e.g., "React frontend hosted on Vercel").'),
          category: z.enum(['Technology', 'Function']).describe('The category of this system.'),
        })
      ).describe('The systems/components that make up this stack.'),
    })
  ).max(3).describe('An array of exactly 3 different technology stack options.'),
});

export type TechStackSuggestionOutput = z.infer<typeof TechStackSuggestionOutputSchema>;

export async function aiSuggestTechStack(input: TechStackSuggestionInput): Promise<TechStackSuggestionOutput> {
  return aiSuggestTechStackFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiSuggestTechStackPrompt',
  model: activeModel,
  input: { schema: TechStackSuggestionInputSchema },
  output: { format: 'json', schema: TechStackSuggestionOutputSchema },
  prompt: `You are an expert Solutions Architect.
Based on the provided Project Summary below, suggest exactly 3 different, highly suitable technology stacks that could be used to build the system. 
For each stack, provide a clear name, a brief description of why it's a good fit, and then decompose it into the individual impacted systems (e.g., Frontend, Backend API, Database, Auth system) specifying the technology for each.

Project Summary:
{{{projectSummary}}}

Output your suggestions strictly in the specified JSON format.`,
});

const aiSuggestTechStackFlow = ai.defineFlow(
  {
    name: 'aiSuggestTechStackFlow',
    inputSchema: TechStackSuggestionInputSchema,
    outputSchema: TechStackSuggestionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
