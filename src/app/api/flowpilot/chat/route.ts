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

    // Security check: Only authenticated users may interact with the AI agent
    if (!body.currentUser || (!body.currentUser.email && !body.currentUser.empId)) {
      return NextResponse.json(
        { reply: 'Unauthorized: You must be logged in to interact with FlowPilot.' },
        { status: 401 }
      );
    }

    const result = await runFlowPilotAgent(body);
    const response = NextResponse.json(result);

    if (result.rateUtilization) {
      const r = result.rateUtilization;
      response.headers.set('x-rate-rpm', String(r.currentRpm));
      response.headers.set('x-rate-rpm-limit', String(r.limitRpm));
      response.headers.set('x-rate-percent-rpm', String(r.percentRpm));
      response.headers.set('x-rate-tpm', String(r.currentTpm));
      response.headers.set('x-rate-tpm-limit', String(r.limitTpm));
      response.headers.set('x-rate-percent-tpm', String(r.percentTpm));
      response.headers.set('x-rate-last-prompt-tokens', String(r.lastPromptTokens));
      response.headers.set('x-rate-last-completion-tokens', String(r.lastCompletionTokens));
      response.headers.set('x-rate-last-total-tokens', String(r.lastTotalTokens));
      response.headers.set('x-rate-last-cost-usd', String(r.lastCostUsd));
      response.headers.set('x-rate-status', r.status);
      if (r.lastModelCalls !== undefined) response.headers.set('x-rate-last-model-calls', String(r.lastModelCalls));
      if (r.lastToolCalls !== undefined) response.headers.set('x-rate-last-tool-calls', String(r.lastToolCalls));
    }

    if (result.tokenUsage?.retrievalMode) {
      response.headers.set('x-rate-retrieval-mode', result.tokenUsage.retrievalMode);
    }
    if (result.tokenUsage?.retrievedTools) {
      response.headers.set('x-rate-tools-retrieved-count', String(result.tokenUsage.retrievedTools.length));
    }

    return response;
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

