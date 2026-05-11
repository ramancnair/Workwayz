import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { openAI, openAICompatible } from '@genkit-ai/compat-oai';
import { anthropic, claude35Sonnet, claude37Sonnet, claude3Opus, claude3Haiku, claude45Sonnet } from 'genkitx-anthropic';
import { ollama } from 'genkitx-ollama';

const provider = process.env.NEXT_PUBLIC_AI_PROVIDER || 'google';

let fallbackModel = 'gemini-3-flash-preview';
if (provider === 'openai') fallbackModel = 'gpt-4o';
if (provider === 'anthropic') fallbackModel = 'claude-sonnet-4-6';
if (provider === 'lmstudio') fallbackModel = 'local-model';
if (provider === 'ollama') fallbackModel = 'llama3';

let defaultModel = process.env.AI_DEFAULT_MODEL || fallbackModel;

const plugins: any[] = [];
let mappedModel: any = defaultModel;

if (provider === 'google') {
  if (process.env.GEMINI_API_KEY) {
    plugins.push(googleAI({ apiKey: process.env.GEMINI_API_KEY }));
  } else {
    plugins.push(googleAI()); 
  }
  if (typeof mappedModel === 'string' && !mappedModel.startsWith('googleai/')) {
    mappedModel = `googleai/${defaultModel}`;
  }
} else if (provider === 'openai') {
  if (process.env.OPENAI_API_KEY) {
    plugins.push(openAI({ apiKey: process.env.OPENAI_API_KEY }));
  }
  if (typeof mappedModel === 'string' && !mappedModel.startsWith('openai/')) {
    mappedModel = `openai/${defaultModel}`;
  }
} else if (provider === 'lmstudio') {
  const baseUrl = process.env.LOCAL_AI_BASE_URL || 'http://localhost:1234/v1';
  plugins.push(openAICompatible({ name: 'lmstudio', apiKey: 'lm-studio', baseURL: baseUrl }));
  if (typeof mappedModel === 'string' && !mappedModel.startsWith('lmstudio/')) {
    mappedModel = `lmstudio/${defaultModel}`;
  }
} else if (provider === 'ollama') {
  const baseUrl = process.env.LOCAL_AI_BASE_URL || 'http://localhost:11434';
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
  if (process.env.ANTHROPIC_API_KEY) {
    plugins.push(anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }));
  }
  
  // Dynamically map the user's string to the correct ModelReference
  let version = defaultModel;
  
  if (version.includes('sonnet-4-6') || version.includes('4-5-sonnet')) {
    // There is no explicit claude46Sonnet export yet in this version of the plugin, 
    // but the 4.5 schema perfectly maps the parameters.
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
