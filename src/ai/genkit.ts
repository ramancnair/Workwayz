import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { openAI } from '@genkit-ai/compat-oai/openai';
import { openAICompatible } from '@genkit-ai/compat-oai';
import { anthropic, claude35Sonnet, claude37Sonnet, claude3Opus, claude3Haiku, claude45Sonnet } from 'genkitx-anthropic';
import { ollama } from 'genkitx-ollama';
import fs from 'fs';
import path from 'path';

export function getActiveAiConfig() {
  let provider = process.env.NEXT_PUBLIC_AI_PROVIDER || 'lmstudio';
  let apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
  let localBaseUrl = process.env.LOCAL_AI_BASE_URL || 'http://localhost:1234/v1';
  let configuredModel = process.env.AI_DEFAULT_MODEL || '';

  if (typeof window === 'undefined') {
    try {
      const dataP = path.join(process.cwd(), 'data', 'connections.json');
      const rootP = path.join(process.cwd(), 'connections.json');
      const connsPath = fs.existsSync(dataP) ? dataP : rootP;
      if (fs.existsSync(connsPath)) {
        const conns = JSON.parse(fs.readFileSync(connsPath, 'utf8'));
        const activeAi = conns.ai?.find((p: any) => p.isActive) || conns.ai?.[0];
        if (activeAi) {
          provider = activeAi.provider || provider;
          if (activeAi.apiKey) apiKey = activeAi.apiKey;
          if (activeAi.baseUrl) localBaseUrl = activeAi.baseUrl;
          if (activeAi.model) configuredModel = activeAi.model;
        }
      }
    } catch (e) {
      // Non-fatal
    }
  }

  // Provider-aware model sanitization and validation
  if (provider === 'google') {
    if (!configuredModel || configuredModel === 'local-model' || !configuredModel.startsWith('gemini-')) {
      configuredModel = 'gemini-2.5-flash';
    }
  } else if (provider === 'openai') {
    if (!configuredModel || configuredModel === 'local-model' || configuredModel.startsWith('gemini-')) {
      configuredModel = 'gpt-4o';
    }
  } else if (provider === 'anthropic') {
    if (!configuredModel || !configuredModel.startsWith('claude-')) {
      configuredModel = 'claude-3-5-sonnet';
    }
  } else if (provider === 'lmstudio') {
    if (!configuredModel || configuredModel.startsWith('gemini-')) {
      configuredModel = 'meta/muse-glimmer';
    }
  } else if (provider === 'ollama') {
    if (!configuredModel || configuredModel.startsWith('gemini-') || configuredModel === 'local-model') {
      configuredModel = 'llama3';
    }
  }

  return { provider, apiKey, localBaseUrl, model: configuredModel };
}

const currentConfig = getActiveAiConfig();

const plugins: any[] = [
  // Always register LM Studio plugin
  openAICompatible({
    name: 'lmstudio',
    apiKey: 'lm-studio',
    baseURL: currentConfig.localBaseUrl || 'http://localhost:1234/v1',
  }),
];

// Register Google AI plugin if key is present or default
if (process.env.GEMINI_API_KEY || currentConfig.apiKey) {
  plugins.push(googleAI({ apiKey: process.env.GEMINI_API_KEY || currentConfig.apiKey }));
} else {
  try {
    plugins.push(googleAI());
  } catch (e) {}
}

if (process.env.OPENAI_API_KEY) {
  plugins.push(openAI({ apiKey: process.env.OPENAI_API_KEY }));
}

let initialMappedModel = `${currentConfig.provider === 'google' ? 'googleai' : currentConfig.provider}/${currentConfig.model}`;
if (initialMappedModel.startsWith('lmstudio/lmstudio/')) {
  initialMappedModel = initialMappedModel.replace('lmstudio/lmstudio/', 'lmstudio/');
}

export const activeModel = initialMappedModel;

export const ai = genkit({
  plugins: plugins,
  model: initialMappedModel,
});
