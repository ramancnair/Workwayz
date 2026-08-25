import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getActiveAiDetails } from '@/ai/flows/flowpilot-agent';

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

    const geminiModels = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'];

    return NextResponse.json({
      active: activeDetails,
      lmStudioModels,
      isLmStudioRunning,
      geminiModels,
    });
  } catch (error: any) {
    console.error('Error fetching FlowPilot models:', error);
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

    const connsPath = path.join(process.cwd(), 'connections.json');
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

    const updated = await getActiveAiDetails();
    return NextResponse.json({ success: true, active: updated });
  } catch (error: any) {
    console.error('Error updating FlowPilot active model:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

