'use server';

/**
 * @fileOverview A Genkit flow for generating user stories and sub-tasks from a project summary.
 * 
 * - aiStoryGenerator - A function that triggers the AI story generation flow.
 * - AiStoryGeneratorInput - The input type for the aiStoryGenerator function.
 * - AiStoryGeneratorOutput - The return type for the aiStoryGenerator function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SubTaskSchema = z.object({
  title: z.string().describe('A concise title for the sub-task.'),
  estimatedHours: z.coerce.number().describe('The estimated effort in hours for this sub-task.'),
  impactedSystemId: z.string().describe('The ID of the single impacted system this sub-task is for.'),
});

const StorySchema = z.object({
  title: z.string().describe('A descriptive title for the user story.'),
  description: z.string().describe('A detailed description of the story from a user perspective.'),
  acceptanceCriteria: z.string().describe('A list of criteria that must be met for the story to be considered done.'),
  impactedSystemIds: z.array(z.string()).describe('An array of IDs of the systems impacted by this story.'),
  priority: z.enum(['Critical', 'High', 'Medium', 'Low', 'Backburner']).describe('The priority of the story.'),
  estimatedHours: z.coerce.number().describe('The total estimated effort in hours for the parent story (excluding sub-tasks).'),
  subTasks: z.array(SubTaskSchema).describe('An array of sub-tasks required to complete the story.'),
});

export const AiStoryGeneratorInputSchema = z.object({
  projectSummary: z.string().describe('The overall summary of the project.'),
  impactedSystems: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })).describe('A list of available systems that can be impacted.'),
});
export type AiStoryGeneratorInput = z.infer<typeof AiStoryGeneratorInputSchema>;

export const AiStoryGeneratorOutputSchema = z.object({
  stories: z.array(StorySchema),
});
export type AiStoryGeneratorOutput = z.infer<typeof AiStoryGeneratorOutputSchema>;

export async function aiStoryGenerator(input: AiStoryGeneratorInput): Promise<AiStoryGeneratorOutput> {
  return aiStoryGeneratorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiStoryGeneratorPrompt',
  input: { schema: AiStoryGeneratorInputSchema },
  output: { schema: AiStoryGeneratorOutputSchema },
  prompt: `You are an expert Agile project manager. Based on the provided project summary and list of impacted systems, generate a list of user stories with detailed descriptions, acceptance criteria, and sub-tasks.

Project Summary:
{{{projectSummary}}}

Available Impacted Systems (use these IDs):
{{#each impactedSystems}}- {{name}} (ID: {{id}}){{/each}}

For each user story, create relevant sub-tasks, one for each system you decide is impacted by that story. Assign a relevant title and an estimated effort in hours for each sub-task. The parent story should also have an effort estimate, which can be for planning, coordination, or any work not covered by sub-tasks.

Return the generated stories in the specified JSON format. Ensure that the 'impactedSystemId' for each sub-task corresponds to one of the provided system IDs. The 'impactedSystemIds' for the parent story should be an array of the IDs of all systems affected.`,
});

const aiStoryGeneratorFlow = ai.defineFlow(
  {
    name: 'aiStoryGeneratorFlow',
    inputSchema: AiStoryGeneratorInputSchema,
    outputSchema: AiStoryGeneratorOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
