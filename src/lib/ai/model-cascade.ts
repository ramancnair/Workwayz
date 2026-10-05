import { getActiveAiConfig } from '@/ai/genkit';

export interface CascadeOptions {
  flowName?: string;
  customModels?: string[];
}

/**
 * Checks whether an AI generation error is retriable (503 Service Unavailable,
 * 429 Quota Exceeded, 404 Deprecated Model, or high demand load spikes).
 */
export function isRetriableAiError(err: any): boolean {
  if (!err) return false;
  const rawMsg = err?.message || String(err || '');
  const msg = rawMsg.toLowerCase();
  const code = err?.code || err?.status || err?.detail?.error?.code;

  return (
    code === 503 ||
    code === 429 ||
    code === 404 ||
    msg.includes('503') ||
    msg.includes('429') ||
    msg.includes('404') ||
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('resource_exhausted') ||
    msg.includes('resource exhausted') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('no longer available') ||
    msg.includes('not found') ||
    msg.includes('capacity')
  );
}

/**
 * Returns an ordered, deduplicated list of live production models to cascade across.
 */
export function getModelCascadeList(options?: CascadeOptions): string[] {
  const config = getActiveAiConfig();
  const provider = config.provider || 'google';

  if (options?.customModels && options.customModels.length > 0) {
    return options.customModels;
  }

  if (provider === 'google') {
    const configured = config.model || 'gemini-3.8-flash';
    const primary = configured.startsWith('googleai/') ? configured : `googleai/${configured}`;

    const candidates = [
      primary,
      'googleai/gemini-3.8-flash',
      'googleai/gemini-3.6-flash',
      'googleai/gemini-flash-lite-latest',
      'googleai/gemini-3.5-flash-lite',
      'googleai/gemini-flash-latest',
    ];

    // Filter out deprecated models and deduplicate maintaining order
    return Array.from(new Set(candidates.filter(m => !m.includes('2.5-flash') && !m.includes('2.5-pro'))));
  }

  // Other providers (openai, anthropic, lmstudio, etc.)
  const prefix = provider === 'lmstudio' ? 'lmstudio/' : `${provider}/`;
  const primaryModel = config.model
    ? (config.model.includes('/') ? config.model : `${prefix}${config.model}`)
    : `${prefix}default`;

  return [primaryModel];
}

/**
 * Executes a Genkit prompt across a prioritized cascade of live production models.
 * If a model returns 503, 429, or 404, it immediately hops to the next responsive model
 * without generating synthetic or heuristic estimation numbers.
 */
export async function runPromptWithCascade<TInput, TOutput>(
  promptFn: (input: TInput, options?: { model?: string }) => Promise<{ output?: TOutput }>,
  input: TInput,
  options?: CascadeOptions
): Promise<TOutput> {
  const models = getModelCascadeList(options);
  const flowName = options?.flowName || 'AI Prompt';
  let lastError: any = null;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      const res = await promptFn(input, { model });
      if (res && res.output !== undefined && res.output !== null) {
        return res.output;
      }
    } catch (err: any) {
      lastError = err;
      const isRetriable = isRetriableAiError(err);
      const isLast = i === models.length - 1;

      if (isRetriable && !isLast) {
        console.warn(`[${flowName}] Model "${model}" hit capacity spike (${err.message || '503/429'}). Cascading to "${models[i + 1]}"...`);
        // Brief 150ms backoff before next model hop
        await new Promise((r) => setTimeout(r, 150));
        continue;
      }

      if (!isRetriable) {
        // Non-retriable error (e.g. invalid arguments or bad credentials), fail early
        throw err;
      }
    }
  }

  // If all models in the cascade failed with retriable errors
  const isGoogle = getActiveAiConfig().provider === 'google';
  if (isGoogle) {
    throw new Error(
      `Google AI endpoints are currently experiencing temporary high demand across all models. Please wait a moment and click Refresh.`
    );
  }

  throw lastError || new Error(`Failed to generate output after attempting all models in the cascade.`);
}
