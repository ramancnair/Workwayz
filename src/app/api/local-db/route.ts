import { NextResponse } from 'next/server';
import { executeLocalTableOperation } from '@/lib/local-db-engine';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const result = executeLocalTableOperation(payload);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      {
        data: null,
        error: { message: err?.message || 'Failed to execute local DB operation' },
      },
      { status: 500 }
    );
  }
}

