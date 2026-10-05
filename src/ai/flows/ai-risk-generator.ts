
'use server';

/**
 * @fileOverview A Genkit flow for generating project risks from a project summary.
 * 
 * - aiRiskGenerator - A function that triggers the AI risk generation flow.
 * - AiRiskGeneratorInput - The input type for the aiRiskGenerator function.
 * - AiRiskGeneratorOutput - The return type for the aiRiskGenerator function.
 */

import { ai } from '@/ai/genkit';
import { runPromptWithCascade } from '@/lib/ai/model-cascade';
import { z } from 'genkit';

const AiRiskGeneratorInputSchema = z.object({
  projectSummary: z.string().describe('The overall summary of the project.'),
});
export type AiRiskGeneratorInput = z.infer<typeof AiRiskGeneratorInputSchema>;

const RiskSchema = z.object({
  description: z.string().describe('A clear and concise description of the potential risk.'),
  severity: z.coerce.number().min(1).max(3).describe('The severity of the risk if it occurs (1-Low, 2-Medium, 3-High).'),
  probability: z.coerce.number().min(1).max(3).describe('The likelihood of the risk occurring (1-Low, 2-Medium, 3-High).'),
  mitigationPlan: z.string().describe('Proactive steps to reduce the likelihood or impact of the risk.'),
  residualRisk: z.string().describe('The risk that remains after the mitigation plan is implemented.'),
  contingencyPlan: z.string().describe('The reactive plan to be executed if the risk materializes.'),
});

const AiRiskGeneratorOutputSchema = z.object({
  risks: z.array(RiskSchema),
});
export type AiRiskGeneratorOutput = z.infer<typeof AiRiskGeneratorOutputSchema>;

export async function aiRiskGenerator(input: AiRiskGeneratorInput): Promise<AiRiskGeneratorOutput> {
  return aiRiskGeneratorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiRiskGeneratorPrompt',
  input: { schema: AiRiskGeneratorInputSchema },
  output: { schema: AiRiskGeneratorOutputSchema },
  prompt: `You are an expert project risk manager. Based on the provided project summary, generate a list of common risks that projects of this nature typically encounter.

Project Summary:
{{{projectSummary}}}

For each risk, provide a detailed description, severity (1-3), probability (1-3), a mitigation plan, the residual risk after mitigation, and a contingency plan.
`,
});

const aiRiskGeneratorFlow = ai.defineFlow(
  {
    name: 'aiRiskGeneratorFlow',
    inputSchema: AiRiskGeneratorInputSchema,
    outputSchema: AiRiskGeneratorOutputSchema,
  },
  async (input) => {
    return await runPromptWithCascade(
      (inp, opts) => prompt(inp, opts),
      input,
      { flowName: 'RiskGenerator' }
    );
  }
);
