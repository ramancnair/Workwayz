'use server';

import { aiTaskTestSuggestions, type AiTaskTestSuggestionsInput } from '@/ai/flows/task-test-suggestions';

export async function getAiTaskSuggestions(
  input: AiTaskTestSuggestionsInput
): Promise<{ suggestions: string } | { error: string }> {
  try {
    const result = await aiTaskTestSuggestions(input);
    return { suggestions: result.suggestions };
  } catch (e: any) {
    console.error(e);
    return { error: e.message || 'An unexpected error occurred.' };
  }
}
