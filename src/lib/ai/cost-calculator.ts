export interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface StepCostResult {
  promptCostUsd: number;
  completionCostUsd: number;
  totalCostUsd: number;
}

// Rates per 1M tokens in USD
const MODEL_RATES: Record<string, { promptRate: number; completionRate: number }> = {
  'gemini-3.8-flash': { promptRate: 0.075, completionRate: 0.30 },
  'gemini-flash-latest': { promptRate: 0.075, completionRate: 0.30 },
  'gemini-3.5-flash': { promptRate: 0.075, completionRate: 0.30 },
  'gemini-2.5-flash': { promptRate: 0.075, completionRate: 0.30 },
  'gemini-1.5-flash': { promptRate: 0.075, completionRate: 0.30 },
  'gemini-1.5-flash-8b': { promptRate: 0.0375, completionRate: 0.15 },
  'gemini-2.0-flash-lite': { promptRate: 0.0375, completionRate: 0.15 },
  'gpt-4o-mini': { promptRate: 0.15, completionRate: 0.60 },
  'gpt-4o': { promptRate: 2.50, completionRate: 10.00 },
};

/**
 * Calculates USD cost for a single execution step based on token usage and model rate card.
 */
export function calculateStepCost(
  usage: TokenUsage,
  modelName: string = 'gemini-3.8-flash'
): StepCostResult {
  const normalizedModel = Object.keys(MODEL_RATES).find((m) => modelName.includes(m)) || 'gemini-3.8-flash';
  const rates = MODEL_RATES[normalizedModel] || MODEL_RATES['gemini-3.8-flash'];

  const promptTokens = usage.promptTokens || 0;
  const completionTokens = usage.completionTokens || 0;

  const promptCostUsd = (promptTokens / 1_000_000) * rates.promptRate;
  const completionCostUsd = (completionTokens / 1_000_000) * rates.completionRate;
  const totalCostUsd = promptCostUsd + completionCostUsd;

  return {
    promptCostUsd: Number(promptCostUsd.toFixed(6)),
    completionCostUsd: Number(completionCostUsd.toFixed(6)),
    totalCostUsd: Number(totalCostUsd.toFixed(6)),
  };
}

/**
 * Aggregates total execution cost across multiple steps in a query lifecycle.
 */
export function calculateQueryCost(stepCosts: StepCostResult[]): StepCostResult {
  return stepCosts.reduce(
    (acc, cur) => ({
      promptCostUsd: Number((acc.promptCostUsd + cur.promptCostUsd).toFixed(6)),
      completionCostUsd: Number((acc.completionCostUsd + cur.completionCostUsd).toFixed(6)),
      totalCostUsd: Number((acc.totalCostUsd + cur.totalCostUsd).toFixed(6)),
    }),
    { promptCostUsd: 0, completionCostUsd: 0, totalCostUsd: 0 }
  );
}
