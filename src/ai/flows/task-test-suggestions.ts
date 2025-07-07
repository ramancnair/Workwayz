'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting improvements to tasks and test cases using AI.
 *
 * - aiTaskTestSuggestions - A function that triggers the AI suggestions flow.
 * - AiTaskTestSuggestionsInput - The input type for the aiTaskTestSuggestions function.
 * - AiTaskTestSuggestionsOutput - The return type for the aiTaskTestSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiTaskTestSuggestionsInputSchema = z.object({
  taskOrTestCaseDescription: z
    .string()
    .describe('The description of the task or test case to improve.'),
  projectContext: z
    .string()
    .optional()
    .describe('Additional context about the project to consider.'),
});
export type AiTaskTestSuggestionsInput = z.infer<typeof AiTaskTestSuggestionsInputSchema>;

const AiTaskTestSuggestionsOutputSchema = z.object({
  suggestions: z
    .string()
    .describe('AI-powered suggestions for improving the task or test case.'),
});
export type AiTaskTestSuggestionsOutput = z.infer<typeof AiTaskTestSuggestionsOutputSchema>;

export async function aiTaskTestSuggestions(
  input: AiTaskTestSuggestionsInput
): Promise<AiTaskTestSuggestionsOutput> {
  return aiTaskTestSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiTaskTestSuggestionsPrompt',
  input: {schema: AiTaskTestSuggestionsInputSchema},
  output: {schema: AiTaskTestSuggestionsOutputSchema},
  prompt: `You are an AI assistant that helps project managers improve tasks and test cases.

You will receive a description of a task or test case and provide suggestions on how to improve it.
Consider the project context when providing suggestions.

Description: {{{taskOrTestCaseDescription}}}
Project Context: {{{projectContext}}}

Suggestions:`,
});

const aiTaskTestSuggestionsFlow = ai.defineFlow(
  {
    name: 'aiTaskTestSuggestionsFlow',
    inputSchema: AiTaskTestSuggestionsInputSchema,
    outputSchema: AiTaskTestSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
