import { NextResponse } from 'next/server';
import { runFlowPilotAgent, getActiveAiDetails, type FlowPilotAgentInput } from '@/ai/flows/flowpilot-agent';

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
    const body: FlowPilotAgentInput = await request.json();

    if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { reply: 'Invalid request: "messages" array is required and must not be empty.' },
        { status: 400 }
      );
    }

    const result = await runFlowPilotAgent(body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('FlowPilot Chat API error:', error);
    const aiDetails = await getActiveAiDetails().catch(() => undefined);
    return NextResponse.json(
      {
        reply: `⚠️ FlowPilot encountered an issue: ${error.message || 'Unknown error. Please check your AI API key or connection settings.'}`,
        error: error.message,
        aiDetails,
      },
      { status: 200 }
    );
  }
}

