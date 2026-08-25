import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { openAI } from '@genkit-ai/compat-oai/openai';
import { openAICompatible } from '@genkit-ai/compat-oai';
import { anthropic, claude35Sonnet, claude37Sonnet, claude3Opus, claude3Haiku, claude45Sonnet } from 'genkitx-anthropic';
import { ollama } from 'genkitx-ollama';

let provider = process.env.NEXT_PUBLIC_AI_PROVIDER || 'google';
let apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
let localBaseUrl = process.env.LOCAL_AI_BASE_URL;
let configuredModel = process.env.AI_DEFAULT_MODEL;

// Fallback to connections.json on server
if (typeof window === 'undefined') {
  try {
    const fs = require('fs');
    const path = require('path');
    const connsPath = path.join(process.cwd(), 'connections.json');
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

// Safety: If model is 'local-model' or local endpoint is configured, ensure provider is lmstudio
if (configuredModel === 'local-model' || provider === 'lmstudio') {
  provider = 'lmstudio';
  if (!configuredModel) configuredModel = 'local-model';
}

let fallbackModel = 'gemini-2.5-flash';
if (provider === 'openai') fallbackModel = 'gpt-4o';
if (provider === 'anthropic') fallbackModel = 'claude-sonnet-4-6';
if (provider === 'lmstudio') fallbackModel = 'local-model';
if (provider === 'ollama') fallbackModel = 'llama3';

let defaultModel = configuredModel || fallbackModel;

const plugins: any[] = [];
let mappedModel: any = defaultModel;

if (provider === 'google') {
  const geminiKey = process.env.GEMINI_API_KEY || apiKey;
  if (geminiKey) {
    plugins.push(googleAI({ apiKey: geminiKey }));
  } else {
    plugins.push(googleAI()); 
  }
  if (typeof mappedModel === 'string' && !mappedModel.startsWith('googleai/')) {
    mappedModel = `googleai/${defaultModel}`;
  }
} else if (provider === 'openai') {
  const oaiKey = process.env.OPENAI_API_KEY || apiKey;
  if (oaiKey) {
    plugins.push(openAI({ apiKey: oaiKey }));
  }
  if (typeof mappedModel === 'string' && !mappedModel.startsWith('openai/')) {
    mappedModel = `openai/${defaultModel}`;
  }
} else if (provider === 'lmstudio') {
  const baseUrl = localBaseUrl || process.env.LOCAL_AI_BASE_URL || 'http://localhost:1234/v1';
  plugins.push(openAICompatible({ name: 'lmstudio', apiKey: 'lm-studio', baseURL: baseUrl }));
  if (typeof mappedModel === 'string' && !mappedModel.startsWith('lmstudio/')) {
    mappedModel = `lmstudio/${defaultModel}`;
  }
} else if (provider === 'ollama') {
  const baseUrl = localBaseUrl || process.env.LOCAL_AI_BASE_URL || 'http://localhost:11434';
  let autoModel = defaultModel;
  
  try {
    const psRes = await fetch(`${baseUrl}/api/ps`);
    if (psRes.ok) {
      const psData = await psRes.json();
      if (psData.models && psData.models.length > 0) {
        autoModel = psData.models[0].name;
      } else {
        const tagsRes = await fetch(`${baseUrl}/api/tags`);
        const tagsData = await tagsRes.json();
        if (tagsData.models && tagsData.models.length > 0) {
          autoModel = tagsData.models[0].name;
        }
      }
    }
  } catch (e) {
    console.error('Failed to auto-detect Ollama model:', e);
  }

  plugins.push(ollama({
    models: [{ name: autoModel }],
    serverAddress: baseUrl,
  }));
  mappedModel = `ollama/${autoModel}`;
} else if (provider === 'anthropic') {
  if (process.env.ANTHROPIC_API_KEY || apiKey) {
    plugins.push(anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || apiKey }));
  }
  
  let version = defaultModel;
  if (version.includes('sonnet-4-6') || version.includes('4-5-sonnet')) {
    mappedModel = claude45Sonnet.withVersion(version);
  } else if (version.includes('3-7-sonnet')) {
    mappedModel = claude37Sonnet.withVersion(version);
  } else if (version.includes('opus')) {
    mappedModel = claude3Opus.withVersion(version);
  } else if (version.includes('haiku')) {
    mappedModel = claude3Haiku.withVersion(version);
  } else {
    mappedModel = claude35Sonnet.withVersion(version);
  }
}

export const activeModel = mappedModel;

export const ai = genkit({
  plugins: plugins,
  model: mappedModel,
});
