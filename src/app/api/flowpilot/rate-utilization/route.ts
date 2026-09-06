import { NextResponse } from 'next/server';
import { getRateUtilization } from '@/lib/ai/rate-tracker';

export async function GET() {
  try {
    const rate = getRateUtilization();
    return NextResponse.json(rate);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
