import { NextResponse } from 'next/server';
import { runWayFinderAnalyticsQuery as runFpAnalyticsQuery } from '@/ai/flows/wayfinder-analytics-flow';
import type { WayFinderQueryRequest as FpQueryRequest } from '@/types/wayfinder-dashboard';

export async function POST(request: Request) {
  try {
    const body: FpQueryRequest = await request.json();
    const result = await runFpAnalyticsQuery({
      query: body.query,
      scope: 'portfolio',
      portfolioId: body.portfolioId,
    });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('FP Dashboard API error:', error);
    return NextResponse.json(
      {
        success: false,
        errorMessage: error.message || 'An unexpected error occurred while querying the database.',
      },
      { status: 500 }
    );
  }
}
