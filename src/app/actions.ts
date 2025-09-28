'use server';

import { aiTaskTestSuggestions, type AiTaskTestSuggestionsInput } from '@/ai/flows/task-test-suggestions';
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
