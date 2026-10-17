import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getActiveAiDetails } from '@/ai/flows/wayfinder-agent';
import { getProfilesPath, getEnvLocalPath } from '@/lib/config-paths';

// Cache for live models with 5-minute TTL
let geminiModelCache: { timestamp: number; models: string[] } | null = null;

async function getLiveGeminiModels(apiKey?: string): Promise<string[]> {
  if (!apiKey) {
    return ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.5-flash', 'gemini-2.5-pro'];
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
            const name = (m.name || '').toLowerCase();
            const isExcluded =
              name.includes('tts') ||
              name.includes('robotics') ||
              name.includes('clip') ||
              name.includes('embedding') ||
              name.includes('banana') ||
              name.includes('2.5-flash') || // deprecated
              name.includes('preview-customtools');
            return hasGenerate && !isExcluded;
          })
          .map((m: any) => m.name.replace('models/', ''));

        // Sort models: latest/popular first
        const sorted = filtered.sort((a: string, b: string) => {
          if (a.includes('3.8-flash') && !b.includes('3.8-flash')) return -1;
          if (!a.includes('3.8-flash') && b.includes('3.8-flash')) return 1;
          if (a.includes('flash-latest') && !b.includes('flash-latest')) return -1;
          if (!a.includes('flash-latest') && b.includes('flash-latest')) return 1;
          if (a.includes('3.7') && !b.includes('3.7')) return -1;
          if (!a.includes('3.7') && b.includes('3.7')) return 1;
          if (a.includes('3.5') && !b.includes('3.5')) return -1;
          if (!a.includes('3.5') && b.includes('3.5')) return 1;
          return a.localeCompare(b);
        });

        geminiModelCache = { timestamp: now, models: sorted };
        return sorted;
      }
    }
  } catch (err) {
    console.warn('Could not fetch live models from Google API, using cached/fallback:', err);
  }

  return geminiModelCache?.models || ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.5-flash', 'gemini-2.5-pro'];
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
