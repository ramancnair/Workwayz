import { NextResponse } from 'next/server';
import { runFpAnalyticsQuery, type FpAnalyticsInput } from '@/ai/flows/fp-analytics-flow';

export async function POST(request: Request) {
  try {
    const body: FpAnalyticsInput = await request.json();

    if (!body.query || typeof body.query !== 'string') {
      return NextResponse.json(
        { success: false, errorMessage: 'Query parameter is required and must be a non-empty string.' },
        { status: 400 }
      );
    }

    const result = await runFpAnalyticsQuery(body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API] /api/fp-analytics/query error:', error);
    return NextResponse.json(
      {
        success: false,
        errorMessage: error.message || 'An error occurred while executing the analytics query.',
      },
      { status: 500 }
    );
  }
}
