
'use server';

import { aiTaskTestSuggestions, type AiTaskTestSuggestionsInput } from '@/ai/flows/task-test-suggestions';
import { aiEstimator, type AiEstimatorInput, type AiEstimatorOutput } from '@/ai/flows/ai-estimator';
import { aiStoryGenerator, type AiStoryGeneratorInput, type AiStoryGeneratorOutput } from '@/ai/flows/ai-story-generator';
import { aiTestCaseGenerator, type AiTestCaseGeneratorInput, type AiTestCaseGeneratorOutput } from '@/ai/flows/ai-test-case-generator';
import { aiRiskGenerator, type AiRiskGeneratorInput, type AiRiskGeneratorOutput } from '@/ai/flows/ai-risk-generator';
import fs from 'fs/promises';
import path from 'path';

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

export async function getAiEstimates(
  input: AiEstimatorInput
): Promise<{ estimates: AiEstimatorOutput } | { error: string }> {
  try {
    const result = await aiEstimator(input);
    return { estimates: result };
  } catch (e: any) {
    console.error('AI Estimator Flow Error:', e);
    return { error: e.message || 'An unexpected error occurred while getting AI estimates.' };
  }
}

export async function getAiStorySuggestions(
  input: AiStoryGeneratorInput
): Promise<{ stories: AiStoryGeneratorOutput['stories'] } | { error: string }> {
  try {
    const result = await aiStoryGenerator(input);
    return { stories: result.stories };
  } catch (e: any) {
    console.error('AI Story Generator Flow Error:', e);
    return { error: e.message || 'An unexpected error occurred while generating stories.' };
  }
}

export async function getAiTestCaseSuggestions(
  input: AiTestCaseGeneratorInput
): Promise<{ testCases: AiTestCaseGeneratorOutput['testCases'] } | { error: string }> {
  try {
    const result = await aiTestCaseGenerator(input);
    return { testCases: result.testCases };
  } catch (e: any) {
    console.error('AI Test Case Generator Flow Error:', e);
    return { error: e.message || 'An unexpected error occurred while generating test cases.' };
  }
}

export async function getAiRiskSuggestions(
  input: AiRiskGeneratorInput
): Promise<{ risks: AiRiskGeneratorOutput['risks'] } | { error: string }> {
  try {
    const result = await aiRiskGenerator(input);
    return { risks: result.risks };
  } catch (e: any) {
    console.error('AI Risk Generator Flow Error:', e);
    return { error: e.message || 'An unexpected error occurred while generating risks.' };
  }
}

const themesPath = path.join(process.cwd(), 'src', 'lib', 'themes.json');

export async function getThemes(): Promise<any> {
    try {
        const themesJson = await fs.readFile(themesPath, 'utf-8');
        return JSON.parse(themesJson);
    } catch (error) {
        console.error('Error reading themes.json:', error);
        // In case of error (e.g., file not found), return a default structure
        return {
            "Default": {
                "primary": { "h": 221, "s": 83, "l": 53 },
                "background": { "h": 0, "s": 0, "l": 100 },
                "foreground": { "h": 240, "s": 5.9, "l": 10 },
                "accent": { "h": 240, "s": 4.8, "l": 95.9 },
                "card": { "h": 0, "s": 0, "l": 100 },
                "border": { "h": 240, "s": 5.9, "l": 90 },
                "popover": { "h": 240, "s": 5.9, "l": 97 },
                "topbar": { "h": 0, "s": 0, "l": 100 },
                "sidebar": { "h": 0, "s": 0, "l": 100 },
                "radius": 0.5,
                "fontFamily": "Inter, sans-serif",
                "fontSize": 16,
                "shadow": "sm"
            }
        };
    }
}

export async function saveThemes(themes: any): Promise<{ success: boolean; error?: string }> {
    try {
        await fs.writeFile(themesPath, JSON.stringify(themes, null, 2), 'utf-8');
        return { success: true };
    } catch (error) {
        console.error('Error writing themes.json:', error);
        return { success: false, error: 'Failed to save themes.' };
    }
}
