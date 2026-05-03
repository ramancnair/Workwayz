import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { openAI } from '@genkit-ai/compat-oai/openai';

const provider = process.env.NEXT_PUBLIC_AI_PROVIDER || 'google';
const defaultModel = process.env.AI_DEFAULT_MODEL || 'gemini-3-flash-preview';

const plugins: any[] = [];
let mappedModel = defaultModel;

if (provider === 'google') {
  if (process.env.GEMINI_API_KEY) {
    plugins.push(googleAI({ apiKey: process.env.GEMINI_API_KEY }));
  } else {
    plugins.push(googleAI()); 
  }
  if (!mappedModel.startsWith('googleai/')) {
    mappedModel = `googleai/${defaultModel}`;
  }
} else if (provider === 'openai') {
  if (process.env.OPENAI_API_KEY) {
    plugins.push(openAI({ apiKey: process.env.OPENAI_API_KEY }));
  }
  if (!mappedModel.startsWith('openai/')) {
    mappedModel = `openai/${defaultModel}`;
  }
}

export const ai = genkit({
  plugins: plugins,
  model: mappedModel,
});
