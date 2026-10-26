import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getActiveAiDetails } from '@/ai/flows/wayfinder-agent';
import { getProfilesPath, getEnvLocalPath } from '@/lib/config-paths';

// Fallback customer-usable production Gemini models
const CUSTOMER_ALLOWED_FALLBACK = [
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-pro-latest',
  'gemini-3-flash-preview',
  'gemini-3.1-pro-preview',
  'gemini-3.1-flash-lite',
];

// Patterns for models that customers cannot use for text/analytics generation
const NON_CUSTOMER_PATTERNS = [
  'lyria',          // Music / audio generation
  'antigravity',    // Internal IDE coding agent
  'deep-research',  // Autonomous multi-step research agent
  'computer-use',   // OS automation
  'transcribe',     // Speech-to-text
  'tts',            // Text-to-speech audio
  'audio',          // Audio processing
  'image',          // Image generation / editing
  'banana',         // Image generation code names
  'robotics',       // Robotics models
  'argon',          // Internal Google research branch
  'customtools',    // Internal developer tooling test checkpoints
  'clip',           // Vision embeddings
  'embedding',      // Vector embeddings
  '2.5-flash',      // Deprecated
  '2.5-pro',        // Deprecated (returns 404)
  'omni',           // Prototype omni models
  'gemma',          // Open weights models
  'aqa',            // Internal Question Answering
];

const MODEL_PRIORITY: Record<string, number> = {
  'gemini-3.8-flash': 1,
  'gemini-flash-latest': 2,
  'gemini-3.7-flash': 3,
  'gemini-3.6-flash': 4,
  'gemini-3.5-flash': 5,
  'gemini-flash-lite-latest': 6,
  'gemini-3.5-flash-lite': 7,
  'gemini-pro-latest': 8,
  'gemini-3-flash-preview': 9,
  'gemini-3.1-pro-preview': 10,
  'gemini-3.1-flash-lite': 11,
};

// Cache for live models with 5-minute TTL
let geminiModelCache: { timestamp: number; models: string[] } | null = null;

async function getLiveGeminiModels(apiKey?: string): Promise<string[]> {
  if (!apiKey) {
    return CUSTOMER_ALLOWED_FALLBACK;
  }

  const now = Date.now();
  if (geminiModelCache && now - geminiModelCache.timestamp < 5 * 60 * 1000) {
    return geminiModelCache.models;
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.models && Array.isArray(data.models)) {
        const filtered = data.models
          .filter((m: any) => {
            const hasGenerate = m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent');
            if (!hasGenerate) return false;

            const id = (m.name || '').replace('models/', '');
            if (!id.startsWith('gemini-')) return false;

            const lower = id.toLowerCase();
            if (NON_CUSTOMER_PATTERNS.some((p) => lower.includes(p))) return false;

            // Exclude dated internal checkpoint snapshots (e.g. preview-10-2025, preview-04-2026)
            if (/-\d{2}-\d{4}$/.test(lower)) return false;

            return true;
          })
          .map((m: any) => m.name.replace('models/', ''));

        // Sort models by priority and popularity
        const sorted = filtered.sort((a: string, b: string) => {
          const rankA = MODEL_PRIORITY[a] ?? 99;
          const rankB = MODEL_PRIORITY[b] ?? 99;
          if (rankA !== rankB) return rankA - rankB;
          return a.localeCompare(b);
        });

        const finalModels = sorted.length > 0 ? sorted : CUSTOMER_ALLOWED_FALLBACK;
        geminiModelCache = { timestamp: now, models: finalModels };
        return finalModels;
      }
    }
  } catch (err) {
    console.warn('Could not fetch live models from Google API, using cached/fallback:', err);
  }

  return geminiModelCache?.models || CUSTOMER_ALLOWED_FALLBACK;
}

export async function GET() {
  try {
    const activeDetails = await getActiveAiDetails();

    let lmStudioModels: string[] = [];
    let isLmStudioRunning = false;

    // Fetch live available models from LM Studio
    try {
      const res = await fetch('http://localhost:1234/v1/models', {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.data && Array.isArray(data.data)) {
          lmStudioModels = data.data
            .map((m: any) => m.id || m.name)
            .filter((id: string) => Boolean(id) && !id.includes('embedding'));
          isLmStudioRunning = true;
        }
      }
    } catch (e) {
      isLmStudioRunning = false;
    }

    // Resolve Gemini API key
    let geminiApiKey = process.env.GEMINI_API_KEY;
    try {
      const connsPath = getProfilesPath();
      if (fs.existsSync(connsPath)) {
        const conns = JSON.parse(fs.readFileSync(connsPath, 'utf8'));
        const googleConfig = conns.ai?.find((p: any) => p.provider === 'google');
        if (googleConfig?.apiKey) geminiApiKey = googleConfig.apiKey;
      }
    } catch (e) {}

    const geminiModels = await getLiveGeminiModels(geminiApiKey);

    return NextResponse.json({
      active: activeDetails,
      lmStudioModels,
      isLmStudioRunning,
      geminiModels,
    });
  } catch (error: any) {
    console.error('Error fetching WayFinder models:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { provider, model } = body;

    if (!provider || !model) {
      return NextResponse.json({ error: 'Provider and model are required' }, { status: 400 });
    }

    const connsPath = getProfilesPath();
    if (fs.existsSync(connsPath)) {
      const conns = JSON.parse(fs.readFileSync(connsPath, 'utf8'));
      if (!conns.ai) conns.ai = [];

      let found = false;
      conns.ai.forEach((p: any) => {
        if (p.provider === provider) {
          p.isActive = true;
          p.model = model;
          found = true;
        } else {
          p.isActive = false;
        }
      });

      if (!found) {
        conns.ai.push({
          provider,
          model,
          baseUrl: provider === 'lmstudio' ? 'http://localhost:1234/v1' : undefined,
          isActive: true,
          profileName: provider === 'lmstudio' ? 'LM Studio' : provider.toUpperCase(),
        });
      }

      fs.writeFileSync(connsPath, JSON.stringify(conns, null, 2), 'utf8');
    }

    // Also update .env.local if present
    try {
      const envPath = getEnvLocalPath();
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf8');
        envContent = envContent.replace(/NEXT_PUBLIC_AI_PROVIDER=.*/g, `NEXT_PUBLIC_AI_PROVIDER="${provider}"`);
        envContent = envContent.replace(/AI_DEFAULT_MODEL=.*/g, `AI_DEFAULT_MODEL="${model}"`);
        fs.writeFileSync(envPath, envContent, 'utf8');
      }
    } catch (e) {}

    const updated = await getActiveAiDetails();
    return NextResponse.json({ success: true, active: updated });
  } catch (error: any) {
    console.error('Error updating WayFinder active model:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
