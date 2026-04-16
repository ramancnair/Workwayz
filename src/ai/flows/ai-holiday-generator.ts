'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AiHolidayGeneratorInputSchema = z.object({
  year: z.number().describe('The year for which to generate holidays.'),
  country: z.string().describe('The country for which to fetch holidays.'),
});
export type AiHolidayGeneratorInput = z.infer<typeof AiHolidayGeneratorInputSchema>;

const HolidaySchema = z.object({
  date: z.string().describe('The ISO date string of the holiday.'),
  description: z.string().describe('The name of the holiday.'),
  type: z.enum(['National', 'Regional', 'Optional']).describe('The type of holiday.'),
});

const AiHolidayGeneratorOutputSchema = z.object({
  holidays: z.array(HolidaySchema),
});
export type AiHolidayGeneratorOutput = z.infer<typeof AiHolidayGeneratorOutputSchema>;

export async function aiHolidayGenerator(input: AiHolidayGeneratorInput): Promise<AiHolidayGeneratorOutput> {
  return aiHolidayGeneratorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiHolidayGeneratorPrompt',
  input: { schema: AiHolidayGeneratorInputSchema },
  output: { schema: AiHolidayGeneratorOutputSchema },
  prompt: `You are a holiday and date expert. Please provide a realistic list of major public holidays for {{{country}}} in the year {{{year}}}.
Include a mix of National, Regional, and Optional holidays.
CRITICAL RULE: For Regional Holidays, only include state-specific holidays. DO NOT include district-specific or city-specific holidays.
Provide the date accurately formatted as an ISO string (e.g. YYYY-MM-DDT00:00:00.000Z).
`,
});

const aiHolidayGeneratorFlow = ai.defineFlow(
  {
    name: 'aiHolidayGeneratorFlow',
    inputSchema: AiHolidayGeneratorInputSchema,
    outputSchema: AiHolidayGeneratorOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
