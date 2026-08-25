import { NextResponse } from 'next/server';
import { runHermesAgent, getActiveAiDetails, type HermesAgentInput } from '@/ai/flows/hermes-agent';

export async function GET() {
  try {
    const aiDetails = await getActiveAiDetails();
    return NextResponse.json({ aiDetails });
  } catch (error: any) {
    return NextResponse.json({
      aiDetails: {
        provider: 'unknown',
        model: 'unknown',
        displayName: 'AI Model',
      },
    });
  }
}

export async function POST(request: Request) {
  try {
    const body: HermesAgentInput = await request.json();

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { reply: 'Invalid request: "messages" array is required and must not be empty.' },
        { status: 400 }
      );
    }

    const result = await runHermesAgent(body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Hermes Chat API error:', error);
    const aiDetails = await getActiveAiDetails().catch(() => undefined);
    return NextResponse.json(
      {
        reply: `⚠️ Hermes Agent encountered an issue: ${error.message || 'Unknown error. Please check your AI API key or connection settings.'}`,
        error: error.message,
        aiDetails,
      },
      { status: 200 }
    );
  }
}
