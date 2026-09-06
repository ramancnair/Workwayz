import { NextResponse } from 'next/server';
import { executeFpQuery } from '@/lib/fp-query-engine';
import type { FpQueryRequest } from '@/types/fp-dashboard';

export async function POST(request: Request) {
  try {
    const body: FpQueryRequest = await request.json();
    const result = await executeFpQuery(body.query, body.portfolioId);
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
