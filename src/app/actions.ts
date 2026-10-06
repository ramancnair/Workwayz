'use server';

import { aiTaskTestSuggestions, type AiTaskTestSuggestionsInput } from '@/ai/flows/task-test-suggestions';
import { aiStoryGenerator, type AiStoryGeneratorInput, type AiStoryGeneratorOutput } from '@/ai/flows/ai-story-generator';
import { aiTestCaseGenerator, type AiTestCaseGeneratorInput, type AiTestCaseGeneratorOutput } from '@/ai/flows/ai-test-case-generator';
import { aiRiskGenerator, type AiRiskGeneratorInput, type AiRiskGeneratorOutput } from '@/ai/flows/ai-risk-generator';
import { aiAssumptionGenerator, type AiAssumptionGeneratorInput, type AiAssumptionGeneratorOutput } from '@/ai/flows/ai-assumption-generator';
import { aiDependencyGenerator, type AiDependencyGeneratorInput, type AiDependencyGeneratorOutput } from '@/ai/flows/ai-dependency-generator';
import { aiSuggestTechStack, type TechStackSuggestionInput, type TechStackSuggestionOutput } from '@/ai/flows/ai-suggest-tech-stack';
import { aiSuggestHorizontals, type HorizontalSuggestionInput, type HorizontalSuggestionOutput } from '@/ai/flows/ai-suggest-horizontals';
import { aiSubtaskTestCaseGenerator, type AiSubtaskTestCaseGeneratorInput, type AiSubtaskTestCaseGeneratorOutput } from '@/ai/flows/ai-subtask-testcase-generator';

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

export async function getAiAssumptionSuggestions(
  input: AiAssumptionGeneratorInput
): Promise<{ assumptions: AiAssumptionGeneratorOutput['assumptions'] } | { error: string }> {
  try {
    const result = await aiAssumptionGenerator(input);
    return { assumptions: result.assumptions };
  } catch (e: any) {
    console.error('AI Assumption Generator Flow Error:', e);
    return { error: e.message || 'An unexpected error occurred while generating assumptions.' };
  }
}

export async function getAiDependencySuggestions(
  input: AiDependencyGeneratorInput
): Promise<{ dependencies: AiDependencyGeneratorOutput['dependencies'] } | { error: string }> {
  try {
    const result = await aiDependencyGenerator(input);
    return { dependencies: result.dependencies };
  } catch (e: any) {
    console.error('AI Dependency Generator Flow Error:', e);
    return { error: e.message || 'An unexpected error occurred while generating dependencies.' };
  }
}

export async function getAiTechStackSuggestions(
  input: TechStackSuggestionInput
): Promise<{ stacks: TechStackSuggestionOutput['stacks'] } | { error: string }> {
  try {
    const result = await aiSuggestTechStack(input);
    return { stacks: result.stacks };
  } catch (e: any) {
    console.error('AI Tech Stack Suggestion Flow Error:', e);
    return { error: e.message || 'An unexpected error occurred while generating tech stack suggestions.' };
  }
}

export async function getAiHorizontalSuggestions(
  input: HorizontalSuggestionInput
): Promise<{ strategies: HorizontalSuggestionOutput['strategies'] } | { error: string }> {
  try {
    const result = await aiSuggestHorizontals(input);
    return { strategies: result.strategies };
  } catch (e: any) {
    console.error('AI Horizontal Suggestion Flow Error:', e);
    return { error: e.message || 'An unexpected error occurred while generating horizontal suggestions.' };
  }
}

export async function generateSubtasksAndTestCasesAction(
  input: AiSubtaskTestCaseGeneratorInput
): Promise<{ subTasks: AiSubtaskTestCaseGeneratorOutput['subTasks']; testCases: AiSubtaskTestCaseGeneratorOutput['testCases'] } | { error: string }> {
  try {
    const result = await aiSubtaskTestCaseGenerator(input);
    return { subTasks: result.subTasks, testCases: result.testCases };
  } catch (e: any) {
    console.error('AI Subtask & Test Case Generator Flow Error:', e);
    return { error: e.message || 'An unexpected error occurred while generating subtasks and test cases.' };
  }
}

